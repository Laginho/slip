import { useRef, useState } from "react";
import { SURFACE, TEXT_PRIMARY } from "./palette";
import { create, editText, load, remove, restore, setDone, type Task } from "./store";
import { CaptureBar } from "./components/CaptureBar";
import { TaskList } from "./components/TaskList";
import { UndoToast } from "./components/UndoToast";

/**
 * The single screen. One scrolling list, one input pinned to the bottom.
 * No router, no tabs, no nav bar: the Archive (issue 08) is a section, not a route.
 */

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
  // Store mutations run outside setState (see the store.ts header): they take the
  // current list, never an updater, or StrictMode mints two ids per create.
  const [tasks, setTasks] = useState<Task[]>(load);
  const [pending, setPending] = useState<Pending | null>(null);
  const token = useRef(0);

  // Every destructive action is applied immediately and offers a way back, rather than
  // being held for five seconds. That is what makes "a second action replaces the
  // pending toast, applying the first" free: the first was never deferred.
  const complete = (task: Task) => {
    setTasks(setDone(tasks, task.id, true));
    setPending({ snapshot: task, label: "tarefa concluída", token: ++token.current });
  };

  const discard = (task: Task) => {
    setTasks(remove(tasks, task.id));
    setPending({ snapshot: task, label: "tarefa apagada", token: ++token.current });
  };

  // Editing is not destructive -- the text is still on screen -- so it gets no toast.
  const edit = (task: Task, text: string) => setTasks(editText(tasks, task.id, text));

  const undo = () => {
    if (pending === null) return;
    setTasks(restore(tasks, pending.snapshot));
    setPending(null);
  };

  const expire = () => setPending(null);

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
      </main>

      {pending !== null && (
        <UndoToast
          key={pending.token}
          label={pending.label}
          onUndo={undo}
          onExpire={expire}
        />
      )}

      <CaptureBar
        onCapture={(text, kind, deadline) => {
          setTasks(create(tasks, text, kind, deadline));
        }}
      />
    </div>
  );
}
