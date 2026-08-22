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

export type Kind = "work" | "college" | "chore";

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

function isTask(value: unknown): value is Task {
  if (typeof value !== "object" || value === null) return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.id === "string" &&
    typeof t.text === "string" &&
    typeof t.kind === "string" &&
    t.kind in KIND_ORDER &&
    (t.deadline === null || typeof t.deadline === "string") &&
    typeof t.done === "boolean" &&
    typeof t.deleted === "boolean" &&
    typeof t.updatedAt === "number"
  );
}

/** A fresh install and corrupted storage are the same code path: an empty list. */
export function load(): Task[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isTask) : [];
  } catch {
    return [];
  }
}

function save(tasks: Task[]): Task[] {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  return tasks;
}

/** The only way a Task changes. Guarantees updatedAt is stamped -- issue 09 rests on it. */
function apply(tasks: Task[], id: string, change: (task: Task) => Task): Task[] {
  return save(
    tasks.map((task) =>
      task.id === id ? { ...change(task), updatedAt: Date.now() } : task,
    ),
  );
}

export function create(
  tasks: Task[],
  text: string,
  kind: Kind,
  deadline: string | null = null,
): Task[] {
  const task: Task = {
    id: crypto.randomUUID(),
    text: text.trim(),
    kind,
    deadline,
    done: false,
    deleted: false,
    updatedAt: Date.now(),
  };
  // Appended, so the dateless section reads in creation order.
  return save([...tasks, task]);
}

export function editText(tasks: Task[], id: string, text: string): Task[] {
  return apply(tasks, id, (task) => ({ ...task, text: text.trim() }));
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
  const restored: Task = { ...previous, updatedAt: Date.now() };
  return save(
    tasks.some((task) => task.id === previous.id)
      ? tasks.map((task) => (task.id === previous.id ? restored : task))
      : [...tasks, restored],
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
      if (a.deadline !== b.deadline) {
        if (a.deadline === null) return 1;
        if (b.deadline === null) return -1;
        return a.deadline < b.deadline ? -1 : 1;
      }
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
