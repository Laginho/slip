import { useEffect, useRef, useState } from "react";
import { SURFACE, TEXT_PRIMARY } from "./palette";
import { create, editText, load, remove, restore, setDone, type Task } from "./store";
import { sync } from "./sync";
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
   * Mutations read the list through this ref rather than the render closure.
   *
   * Store mutations must run outside setState -- they write to localStorage and mint
   * ids, and StrictMode double-invokes updaters -- but that leaves the render closure
   * as the only other source, and it goes stale. Two swipe flights landing in the same
   * tick would both compute from the same list and the first action would be lost.
   */
  const latest = useRef(tasks);
  const syncTimer = useRef<number | undefined>(undefined);

  /** A merge arriving from the server. Landed, but never echoed back. */
  const adopt = (next: Task[]) => {
    latest.current = next;
    setTasks(next);
  };

  /** A local change: land it, then tell the server about it shortly. */
  const mutate = (next: Task[]) => {
    adopt(next);
    window.clearTimeout(syncTimer.current);
    syncTimer.current = window.setTimeout(() => {
      void sync(latest.current).then(adopt);
    }, SYNC_DEBOUNCE_MS);
  };

  // Sync on open. Never awaited by anything the user is waiting for, and a failure is
  // silent: offline, the app behaves exactly as it does now and syncs on the next success.
  useEffect(() => {
    void sync(latest.current).then(adopt);
    return () => window.clearTimeout(syncTimer.current);
  }, []);

  // Every destructive action is applied immediately and offers a way back, rather than
  // being held for five seconds. That is what makes "a second action replaces the
  // pending toast, applying the first" free: the first was never deferred.
  const complete = (task: Task) => {
    mutate(setDone(latest.current, task.id, true));
    setPending({ snapshot: task, label: "tarefa concluída", token: ++token.current });
  };

  const discard = (task: Task) => {
    mutate(remove(latest.current, task.id));
    setPending({ snapshot: task, label: "tarefa apagada", token: ++token.current });
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
        <TaskList tasks={tasks} onComplete={complete} onDelete={discard} onEdit={edit} />
        <Archive tasks={tasks} />
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
