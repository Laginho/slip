import { useEffect, useRef, useState } from "react";
import {
  create,
  editText,
  load,
  persist,
  remove,
  restore,
  setDone,
  type Kind,
  type Task,
} from "./store";
import { merge, sync } from "./sync";

/** Long enough to coalesce a burst of captures, short enough to feel immediate. */
const SYNC_DEBOUNCE_MS = 1500;

/**
 * The pending undo. `snapshot` is the Task as it was *before* the action, which is all
 * restore() needs. `token` exists only to key the toast, so that two identical actions
 * in a row restart the five seconds instead of sharing one window.
 */
type Pending = {
  snapshot: Task;
  label: string;
  token: number;
};

/**
 * The session: the task list, its persistence boundary, the undo window, and the sync
 * loop. Everything stateful that is not layout lives here; App.tsx keeps the viewport
 * concerns (`wide`, `now`) and the rendering.
 */
export function useSession() {
  const [tasks, setTasks] = useState<Task[]>(load);
  const [pending, setPending] = useState<Pending | null>(null);
  const token = useRef(0);

  /**
   * Mutations read the list through this ref rather than the render closure.
   *
   * Store mutations must run outside setState -- they write to localStorage and mint
   * ids, and StrictMode double-invokes updaters -- but that leaves the render closure
   * as the only other source, and it goes stale. Two swipe flights landing in the same
   * tick would both compute from the same list and the first action would be lost.
   */
  const latest = useRef(tasks);
  const syncTimer = useRef<number | undefined>(undefined);

  /** The list has changed and storage already knows. Show it. */
  const adopt = (next: Task[]) => {
    latest.current = next;
    setTasks(next);
  };

  /**
   * Set when a local write could not be persisted. Deliberately persistent: unlike the
   * undo toast it has no window to expire, because nothing clears it except a write
   * that actually lands -- the user must never be left believing an action was saved
   * when storage refused it.
   */
  const [saveError, setSaveError] = useState(false);

  /**
   * A sync result coming home, re-merged into the list as it stands *now*.
   *
   * The result was computed from a snapshot taken before the round trip, and the user can
   * capture, complete or delete a Task while it is in the air -- opening the app and
   * typing straight away is the ordinary case, not a rare one. Adopting the result
   * directly would replace the list with one computed before those changes existed, and
   * the next sync would persist that, erasing them for good. Re-merging is the fix, and
   * it is the same union rule as everywhere else: for any Task the two sides disagree
   * about, the higher updatedAt wins, and a local change made during the flight is by
   * definition stamped later than the snapshot it is being merged against.
   *
   * Persistence lives here rather than in sync(), so exactly one layer writes storage,
   * and it never writes from a stale snapshot. If the write is refused -- quota, or
   * Safari's private mode, where setItem throws -- nothing is adopted: storage is
   * authoritative, so the UI must not claim to hold something that was not stored.
   */
  const settle = (result: Task[]) => {
    try {
      adopt(persist(merge(latest.current, result)));
    } catch {
      // Nothing to say to the user and nothing to retry. The local list is intact and
      // the next successful sync sends it again.
    }
  };

  /**
   * A round trip, fired and forgotten. Never awaited by anything the user is waiting for,
   * and a failure is silent: offline, the app behaves exactly as it does now and syncs on
   * the next success. sync() resolves with the snapshot itself when it could not do
   * anything -- unconfigured, offline, a bad response -- and there is nothing to settle.
   */
  const roundTrip = () => {
    const snapshot = latest.current;
    void sync(snapshot).then((result) => {
      if (result !== snapshot) settle(result);
    });
  };

  /**
   * A local change: run the store operation inside the catch boundary, land the result,
   * then tell the server about it shortly. Returns whether persistence succeeded.
   *
   * The operation arrives unevaluated -- `(current) => setDone(current, ...)` -- so that
   * the localStorage write inside the store happens *here*, inside the try/catch.
   * Passing an already-computed array cannot catch a quota or security exception: the
   * expression would have thrown before this function was ever entered. Every local
   * mutation must go through this boundary -- storage is authoritative, so on failure
   * nothing is adopted and callers must skip their follow-up UI state (no undo toast,
   * no cleared Capture fields) and leave the previous list on screen.
   */
  const mutate = (operation: (current: Task[]) => Task[]): boolean => {
    let next: Task[];
    try {
      next = operation(latest.current);
    } catch {
      setSaveError(true);
      return false;
    }
    // Every store path that actually writes goes through persist(), which returns a new
    // list; a no-op (blank Capture/edit text, an invalid setDeadline) hands back the
    // same array untouched. Such a call never touched storage, so it must neither clear
    // saveError -- a false all-clear while the banner is up -- nor arm a sync for data
    // that did not change. It still reports success, so harmless follow-ups (a no-op
    // editor closing) may proceed.
    const wrote = next !== latest.current;
    adopt(next);
    if (wrote) {
      setSaveError(false);
      window.clearTimeout(syncTimer.current);
      syncTimer.current = window.setTimeout(roundTrip, SYNC_DEBOUNCE_MS);
    }
    return true;
  };

  useEffect(() => {
    roundTrip();
    return () => window.clearTimeout(syncTimer.current);
  }, []);

  // Every destructive action is applied immediately and offers a way back, rather than
  // being held for five seconds. That is what makes "a second action replaces the
  // pending toast, applying the first" free: the first was never deferred.
  /**
   * The Task as the store holds it now, not as the caller's prop had it.
   *
   * A Card can act on a prop from an earlier render: its exit guard fires on a timeout
   * that closed over the render where the swipe began, and a sync landing mid-flight can
   * replace that Task's text underneath it. The mutation itself only needs the id, but
   * the snapshot is what undo restores -- and restoring a stale one would put the old
   * text back over the newer edit, with a stamp that beats it.
   */
  const current = (task: Task): Task =>
    latest.current.find((held) => held.id === task.id) ?? task;

  /** A new Task from Capture. Reports whether the write landed, like every action. */
  const capture = (text: string, kind: Kind, deadline: string | null): boolean =>
    mutate((list) => create(list, text, kind, deadline));

  /**
   * Each action reports whether it landed. A false return is the Card's cue to come
   * back from a swipe flight and Capture's cue to keep what the user typed.
   */
  const complete = (task: Task): boolean => {
    const target = current(task);
    // The snapshot for undo must be the Task as it was before the action, so it is
    // taken from `current()` before mutating -- but the toast is only created once the
    // write has actually persisted. An unpersisted completion must not offer an undo
    // of something that never happened.
    if (!mutate((list) => setDone(list, target.id, true))) return false;
    setPending({ snapshot: target, label: "tarefa concluída", token: ++token.current });
    return true;
  };

  const discard = (task: Task): boolean => {
    const target = current(task);
    if (!mutate((list) => remove(list, target.id))) return false;
    setPending({ snapshot: target, label: "tarefa apagada", token: ++token.current });
    return true;
  };

  // Editing is not destructive -- the text is still on screen -- so it gets no toast.
  const edit = (task: Task, text: string): boolean =>
    mutate((list) => editText(list, task.id, text));

  const undo = () => {
    if (pending === null) return;
    // If restore cannot be persisted the undo stays pending -- and its window restarts:
    // bumping the token remounts the toast, restarting its five seconds. Returning
    // early alone is not enough -- the original timer keeps running on the old mount,
    // expires on schedule, and onExpire drops the snapshot anyway, leaving the Task
    // permanently gone with no way back.
    if (!mutate((list) => restore(list, pending.snapshot))) {
      setPending({ ...pending, token: ++token.current });
      return;
    }
    setPending(null);
  };

  /** The undo window ran out. The snapshot is dropped; the action stands. */
  const expire = () => setPending(null);

  return { tasks, pending, saveError, capture, complete, discard, edit, undo, expire };
}
