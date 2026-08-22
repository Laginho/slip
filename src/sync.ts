import { parseTasks, type Task } from "./store";

/**
 * Whole-document union sync. See /docs/adr/0001-local-first-whole-document-sync.md.
 *
 * Send the entire task list, merge what comes back: union by id, and where both sides
 * hold the same id, the copy with the newer updatedAt wins. No per-field diffing, no
 * operation log, no CRDT -- those solve a problem this app does not have.
 *
 * Local storage stays authoritative for the UI. Nothing here is ever awaited by a write
 * path, and every failure returns the local list untouched: offline, the app works
 * exactly as before and syncs on the next success. No error banner, no retry queue, no
 * spinner over the list.
 *
 * ponytail: viable only because the dataset is a few KB. Every sync ships every Task, so
 * past a few thousand Tasks this becomes absurd -- at that point the upgrade is a
 * `updated_at > last_seen` fetch plus an upsert of only locally-changed rows, which
 * needs a per-device watermark this design deliberately does not keep.
 */

const TABLE = "tasks";

type Config = { url: string; key: string };

/** Read lazily, per call: an unconfigured app must still run, just without syncing. */
function config(): Config | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

function headers(cfg: Config): Record<string, string> {
  return {
    apikey: cfg.key,
    Authorization: `Bearer ${cfg.key}`,
    "Content-Type": "application/json",
  };
}

/**
 * A stable identity for a Task's visible content, used only to break an updatedAt tie.
 */
function fingerprint(task: Task): string {
  return JSON.stringify([
    task.id,
    task.text,
    task.kind,
    task.deadline,
    task.done,
    task.deleted,
  ]);
}

function winner(mine: Task, theirs: Task): Task {
  if (mine.updatedAt !== theirs.updatedAt) {
    return mine.updatedAt > theirs.updatedAt ? mine : theirs;
  }
  // Equal stamps: two devices acted on the same Task inside the same millisecond.
  // Preferring "mine" would be deterministic on each device and still wrong -- both
  // would keep their own copy and never agree. The tie has to be settled by the pair
  // itself, so that both sides compute the same winner.
  //
  // A tombstone takes it first. This is a real choice, not a detail: with only a content
  // comparison, a simultaneous delete-here / edit-there is decided by whichever text
  // happens to sort lower, and half the time that resurrects the deletion. Losing an
  // edit costs a retype. Losing a delete means a Task the user got rid of reappearing --
  // and reappearing on every sync until they delete it again. A genuinely later edit
  // still wins, because a millisecond later is a higher stamp and never reaches here.
  if (mine.deleted !== theirs.deleted) return mine.deleted ? mine : theirs;
  return fingerprint(mine) <= fingerprint(theirs) ? mine : theirs;
}

/**
 * Union by id, newer updatedAt wins. `remote` is untrusted -- the table has one
 * baked-in key and no auth -- so it is validated rather than believed.
 *
 * Deleted Tasks are carried through like any other Task. Dropping a tombstone here is
 * exactly what would let the other device resurrect the Task on the next sync.
 */
export function merge(local: Task[], remote: unknown): Task[] {
  const byId = new Map<string, Task>();
  // Both sides are reduced the same way, local included. A duplicated id -- from a
  // hand-edited blob -- resolved by position on one side and by winner() on the other
  // would make merge(a, b) and merge(b, a) disagree about which copy survives.
  const absorb = (task: Task) => {
    const mine = byId.get(task.id);
    byId.set(task.id, mine === undefined ? task : winner(mine, task));
  };
  for (const task of local) absorb(task);
  for (const task of parseTasks(remote)) absorb(task);
  return [...byId.values()];
}

/**
 * One round trip: read the table, merge, push the merged list back. Returns the merged
 * list, or the local one untouched if anything at all went wrong.
 *
 * Writes nothing to storage and touches no UI state. Both belong to the caller, for one
 * reason: `local` is a snapshot taken before the round trip, and the user can capture,
 * complete or delete a Task while it is in the air. Persisting from here would write a
 * list computed before those changes existed and erase them. The caller holds the
 * current list, so the caller re-merges this result into it and lands that -- see the
 * settle() comment in App.tsx.
 *
 * Never rejects. Every failure path returns `local`, and the caller has no catch.
 */
export async function sync(local: Task[]): Promise<Task[]> {
  const cfg = config();
  if (cfg === null) return local;

  let merged: Task[];
  try {
    const response = await fetch(`${cfg.url}/rest/v1/${TABLE}?select=*`, {
      headers: headers(cfg),
    });
    if (!response.ok) return local;
    merged = merge(local, await response.json());
  } catch {
    return local;
  }

  try {
    await fetch(`${cfg.url}/rest/v1/${TABLE}`, {
      method: "POST",
      headers: { ...headers(cfg), Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(merged),
    });
  } catch {
    // Silent and harmless. The next successful sync sends the same whole list again.
  }

  return merged;
}
