import { useState } from "react";
import { SURFACE, TEXT_PRIMARY } from "./palette";
import { create, load, type Task } from "./store";
import { CaptureBar } from "./components/CaptureBar";
import { TaskList } from "./components/TaskList";

/**
 * The single screen. One scrolling list, one input pinned to the bottom.
 * No router, no tabs, no nav bar: the Archive (issue 08) is a section, not a route.
 */
export function App() {
  // Store mutations run outside setState (see the store.ts header): create() takes
  // the current list, never an updater, or StrictMode mints two ids per create.
  const [tasks, setTasks] = useState<Task[]>(load);

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
        <TaskList tasks={tasks} />
      </main>

      <CaptureBar
        onCapture={(text, kind, deadline) => {
          setTasks(create(tasks, text, kind, deadline));
        }}
      />
    </div>
  );
}
