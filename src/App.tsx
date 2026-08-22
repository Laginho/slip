import { useEffect, useRef, useState } from "react";
import { SURFACE, TEXT_PRIMARY } from "./palette";
import {
  create,
  editText,
  load,
  persist,
  remove,
  restore,
  setDone,
  type Task,
} from "./store";
import { merge, sync } from "./sync";
import { Archive } from "./components/Archive";
import { CaptureBar } from "./components/CaptureBar";
import { TaskList } from "./components/TaskList";
import { UndoToast } from "./components/UndoToast";

/**
 * The single screen. One scrolling list, one input pinned to the bottom.
 * No router, no tabs, no nav bar: the Archive (issue 08) is a section, not a route.
 */

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

export function App() {
  const [tasks, setTasks] = useState<Task[]>(load);
  const [pending, setPending] = useState<Pending | null>(null);
  const token = useRef(0);

  /**
   * One clock for the whole screen, refreshed on focus, on visibilitychange, and at each
   * local midnight -- an always-open desktop window never fires focus. Both the Cards'
   * Urgency and the Archive's window read it, so they can never disagree about what day
   * it is, and neither can go stale overnight without a reload.
   */
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const refresh = () => setNow(new Date());

    // Re-armed from a fresh Date each time: a day is 23 or 25 hours across DST, so the
    // timer has to land on the next local midnight rather than on +24h.
    let midnight: number;
    const scheduleMidnight = () => {
      const at = new Date();
      const next = new Date(at.getFullYear(), at.getMonth(), at.getDate() + 1);
      midnight = window.setTimeout(() => {
        refresh();
        scheduleMidnight();
      }, next.getTime() - at.getTime());
    };
    scheduleMidnight();

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearTimeout(midnight);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

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

  /** A local change: land it, then tell the server about it shortly. */
  const mutate = (next: Task[]) => {
    adopt(next);
    window.clearTimeout(syncTimer.current);
    syncTimer.current = window.setTimeout(roundTrip, SYNC_DEBOUNCE_MS);
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

  const complete = (task: Task) => {
    const target = current(task);
    mutate(setDone(latest.current, target.id, true));
    setPending({ snapshot: target, label: "tarefa concluída", token: ++token.current });
  };

  const discard = (task: Task) => {
    const target = current(task);
    mutate(remove(latest.current, target.id));
    setPending({ snapshot: target, label: "tarefa apagada", token: ++token.current });
  };

  // Editing is not destructive -- the text is still on screen -- so it gets no toast.
  const edit = (task: Task, text: string) => mutate(editText(latest.current, task.id, text));

  const undo = () => {
    if (pending === null) return;
    mutate(restore(latest.current, pending.snapshot));
    setPending(null);
  };

  return (
    <div
      style={{
        // dvh, not vh: the phone keyboard must shrink the list, not push the bar off-screen.
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: SURFACE,
        color: TEXT_PRIMARY,
        maxWidth: 620,
        margin: "0 auto",
      }}
    >
      <main
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "12px 12px 4px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          gap: 8,
        }}
      >
        <TaskList
          tasks={tasks}
          now={now}
          onComplete={complete}
          onDelete={discard}
          onEdit={edit}
        />
        <Archive tasks={tasks} now={now} />
      </main>

      {pending !== null && (
        <UndoToast
          key={pending.token}
          label={pending.label}
          onUndo={undo}
          onExpire={() => setPending(null)}
        />
      )}

      <CaptureBar
        onCapture={(text, kind, deadline) => {
          mutate(create(latest.current, text, kind, deadline));
        }}
      />
    </div>
  );
}
