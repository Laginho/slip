import { parseTasks, persist, type Task } from "./store";

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
  // Equal stamps. Preferring "mine" would be deterministic on each device and still
  // wrong: both devices would keep their own copy and never agree. Choosing by content
  // means both sides compute the same winner and converge.
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
  for (const task of local) byId.set(task.id, task);
  for (const task of parseTasks(remote)) {
    const mine = byId.get(task.id);
    byId.set(task.id, mine === undefined ? task : winner(mine, task));
  }
  return [...byId.values()];
}

/**
 * One round trip: read the table, merge, persist, then push the merged list back.
 * Returns the merged list, or the local one untouched if anything at all went wrong.
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

  // Land the merge locally before the upload: the UI reads from storage, and the push
  // is the half that is allowed to fail.
  persist(merged);

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
