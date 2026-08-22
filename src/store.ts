/**
 * The Task model and local persistence. localStorage is authoritative for the UI:
 * nothing here ever waits on a network call, and every mutation is written
 * synchronously before it returns.
 *
 * Mutations take the current list and return the next one. Call them *outside*
 * setState -- never as a setState updater -- because they have a side effect
 * (the write) and StrictMode double-invokes updaters, which would generate two
 * different ids for one create.
 *
 * ponytail: whole list in one JSON blob, rewritten on every mutation. Correct while
 * the dataset is a few KB. Past a few thousand Tasks, move to IndexedDB with
 * per-Task records -- but then the undo window and the offline write path stop
 * being trivially synchronous, which is the whole reason for this choice.
 */

export const KINDS = ["work", "college", "chore"] as const;

export type Kind = (typeof KINDS)[number];

export type Task = {
  id: string;
  text: string;
  kind: Kind;
  deadline: string | null; // YYYY-MM-DD
  done: boolean;
  deleted: boolean;
  updatedAt: number;
};

export const STORAGE_KEY = "tasks/v1";

/** Hardcoded, deliberately not configurable. Breaks ties between shared Deadlines. */
const KIND_ORDER: Record<Kind, number> = { work: 0, college: 1, chore: 2 };

/**
 * Closed-set membership, not `kind in KIND_ORDER`: `in` walks the prototype chain, so
 * that would accept "toString", "constructor" and "__proto__" as Kinds. Such a record
 * yields NaN from the tiebreak and resolves no Card background.
 */
function isKind(value: unknown): value is Kind {
  return KINDS.some((kind) => kind === value);
}

const DEADLINE_SHAPE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * An upper bound on updatedAt, not just finiteness.
 *
 * Two reasons, both real. Near Number.MAX_VALUE, `previous + 1 === previous` -- float
 * spacing exceeds 1 -- so the monotonic stamp silently stops incrementing and the
 * merge-case-4 tie comes straight back. And a merely absurd value like 9e15 stays
 * incrementable but dates the Task to the year 287396, pinning it to the top of the
 * Archive forever. The year 2100 leaves room for any realistic clock skew between
 * devices while rejecting both.
 *
 * This bound is enforced on the way *in* and on the way *out*, and that pairing is the
 * point: every stamp this module mints is a stamp toTask() accepts, so the domain is
 * closed under mutation. Bounding only the ingress would leave a Task at the ceiling
 * that the next edit stamps one past it -- persisted, then silently dropped by load()
 * on the next launch, taking the Task with it.
 */
const MAX_STAMP = Date.UTC(2100, 0, 1);

/** The shape regex accepts 2026-02-30 and 2026-13-01. A round-trip does not. */
function isRealDate(deadline: string): boolean {
  const [year, month, day] = deadline.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  );
}

/**
 * Validates one stored entry and rebuilds it from the seven canonical fields.
 * Rebuilding matters: this parses untrusted input -- a hand-edited blob, or a sync
 * payload from a table anyone holding the anon key can write to. Copying the object
 * wholesale would let an eighth field ride along and be re-uploaded forever.
 */
function toTask(value: unknown): Task | null {
  if (typeof value !== "object" || value === null) return null;
  const t = value as Record<string, unknown>;
  if (typeof t.id !== "string" || t.id.trim() === "") return null;
  if (typeof t.text !== "string" || t.text.trim() === "") return null;
  if (!isKind(t.kind)) return null;
  if (
    t.deadline !== null &&
    !(
      typeof t.deadline === "string" &&
      DEADLINE_SHAPE.test(t.deadline) &&
      isRealDate(t.deadline)
    )
  )
    return null;
  if (typeof t.done !== "boolean" || typeof t.deleted !== "boolean") return null;
  // JSON `1e400` parses to Infinity, which would poison every comparison it touches.
  if (
    typeof t.updatedAt !== "number" ||
    !Number.isSafeInteger(t.updatedAt) ||
    t.updatedAt < 0 ||
    t.updatedAt > MAX_STAMP
  )
    return null;
  return {
    id: t.id,
    text: t.text,
    kind: t.kind,
    deadline: t.deadline,
    done: t.done,
    deleted: t.deleted,
    updatedAt: t.updatedAt,
  };
}

/**
 * Validate an unknown value into a Task list, dropping whatever does not qualify.
 * Shared with sync.ts: a row from the remote table deserves exactly as much trust as a
 * hand-edited localStorage blob, since that table has one baked-in key and no auth.
 */
export function parseTasks(value: unknown): Task[] {
  if (!Array.isArray(value)) return [];
  return value.map(toTask).filter((task): task is Task => task !== null);
}

/** A fresh install and corrupted storage are the same code path: an empty list. */
export function load(): Task[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return parseTasks(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** Write the whole list. Exported for sync.ts, which persists the merge result. */
export function persist(tasks: Task[]): Task[] {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  return tasks;
}


/**
 * The next updatedAt for a Task that already exists: strictly greater than the value it
 * replaces, so the new state always wins the merge against the state it came from.
 *
 * Date.now() alone is not enough. Two mutations inside one millisecond tie, and the merge
 * rule only promises the *higher* timestamp wins -- a tie is resolved arbitrarily, which
 * for an undo means the delete it is undoing can survive and the Task vanishes at the
 * next sync. It also guards the likelier case of the wall clock stepping backwards
 * (NTP correction, timezone change), which would otherwise make a newer edit lose.
 *
 * At MAX_STAMP itself the stamp stops advancing, because no bounded counter can keep
 * incrementing forever. Ties there fall to winner()'s content comparison in sync.ts:
 * degraded and convergent, rather than a Task that writes fine and cannot be read back.
 */
function nextStamp(previous: number): number {
  return Math.min(MAX_STAMP, Math.max(stampNow(), previous + 1));
}

/**
 * Now, bounded to the domain toTask() accepts. A system clock set past 2100 would
 * otherwise mint Tasks that are written successfully and then vanish on the next launch.
 */
function stampNow(): number {
  return Math.max(0, Math.min(MAX_STAMP, Date.now()));
}

/** The only way a Task changes. Guarantees updatedAt is stamped -- issue 09 rests on it. */
function apply(tasks: Task[], id: string, change: (task: Task) => Task): Task[] {
  return persist(
    tasks.map((task) =>
      task.id === id ? { ...change(task), updatedAt: nextStamp(task.updatedAt) } : task,
    ),
  );
}

export function create(
  tasks: Task[],
  text: string,
  kind: Kind,
  deadline: string | null = null,
): Task[] {
  const trimmed = text.trim();
  // Task text is required, so a blank one is not a Task. Capture guards this too, but
  // the invariant belongs to the authoritative write path, not to one caller.
  if (trimmed === "") return tasks;
  const task: Task = {
    id: crypto.randomUUID(),
    text: trimmed,
    kind,
    deadline,
    done: false,
    deleted: false,
    updatedAt: stampNow(),
  };
  // Appended, so the dateless section reads in creation order.
  return persist([...tasks, task]);
}

export function editText(tasks: Task[], id: string, text: string): Task[] {
  const trimmed = text.trim();
  // Clearing the text during an in-place edit is not a delete. Keep what was there.
  if (trimmed === "") return tasks;
  return apply(tasks, id, (task) => ({ ...task, text: trimmed }));
}

export function setDeadline(tasks: Task[], id: string, deadline: string | null): Task[] {
  return apply(tasks, id, (task) => ({ ...task, deadline }));
}

export function setDone(tasks: Task[], id: string, done: boolean): Task[] {
  return apply(tasks, id, (task) => ({ ...task, done }));
}

/** Soft delete. The record is never removed -- see ADR 0001, and merge case 4. */
export function remove(tasks: Task[], id: string): Task[] {
  return apply(tasks, id, (task) => ({ ...task, deleted: true }));
}

/**
 * The undo primitive: put a Task back the way it was. updatedAt is restamped rather
 * than replayed, so the restore wins the merge against the copy it is undoing.
 */
export function restore(tasks: Task[], previous: Task): Task[] {
  const current = tasks.find((task) => task.id === previous.id);
  // Beat the copy being undone, not just the snapshot: the stamp has to clear whichever
  // of the two is newer, and the one in the list is the delete this is reversing.
  const beat = Math.max(previous.updatedAt, current?.updatedAt ?? 0);
  const restored: Task = { ...previous, updatedAt: nextStamp(beat) };
  return persist(
    current === undefined
      ? [...tasks, restored]
      : tasks.map((task) => (task.id === previous.id ? restored : task)),
  );
}

/** Sorts without mutating, and keeps insertion order as the final tiebreak. */
function sorted(tasks: Task[], rank: (a: Task, b: Task) => number): Task[] {
  return tasks
    .map((task, index) => ({ task, index }))
    .sort((a, b) => rank(a.task, b.task) || a.index - b.index)
    .map((entry) => entry.task);
}

/** Open Tasks in display order: dated first ascending, then dateless in creation order. */
export function openTasks(tasks: Task[]): Task[] {
  return sorted(
    tasks.filter((task) => !task.done && !task.deleted),
    (a, b) => {
      // Dateless Tasks sit below every dated one, among themselves in creation order --
      // so they must NOT reach the Kind tiebreak, which applies only to a shared Deadline.
      if (a.deadline === null || b.deadline === null) {
        if (a.deadline === b.deadline) return 0;
        return a.deadline === null ? 1 : -1;
      }
      if (a.deadline !== b.deadline) return a.deadline < b.deadline ? -1 : 1;
      return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    },
  );
}

/** Every Done Task, newest first. Kept forever; issue 08 decides how much to show. */
export function archive(tasks: Task[]): Task[] {
  return sorted(
    tasks.filter((task) => task.done && !task.deleted),
    (a, b) => b.updatedAt - a.updatedAt,
  );
}
