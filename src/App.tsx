import { useEffect, useState } from "react";
import { SURFACE, TEXT_PRIMARY, TOAST_BG, TOAST_INK } from "./palette";
import { useSession } from "./useSession";
import { Archive } from "./components/Archive";
import { CaptureBar } from "./components/CaptureBar";
import { TaskList } from "./components/TaskList";
import { UndoToast } from "./components/UndoToast";

/**
 * The single screen. One scrolling list, one input pinned to the bottom.
 * No router, no tabs, no nav bar: the Archive (issue 08) is a section, not a route.
 */

export function App() {
  const { tasks, pending, saveError, capture, complete, discard, edit, undo, expire } =
    useSession();

  /**
   * The one layout breakpoint. Inline styles cannot express a media query, so the
   * screen asks once and reacts to changes live -- a desktop window being resized,
   * a phone rotated. Like `now` below, it is owned here and handed down: TaskList
   * stays presentational, choosing between the phone column and the post-it wall.
   */
  const [wide, setWide] = useState(() => window.matchMedia("(min-width: 900px)").matches);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const onChange = (event: MediaQueryListEvent) => setWide(event.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

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

  return (
    <div
      style={{
        // dvh, not vh: the phone keyboard must shrink the list, not push the bar off-screen.
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: SURFACE,
        color: TEXT_PRIMARY,
        // The phone column cap. On a wide viewport the wall wants the monitor's
        // width -- the grid inside decides how many columns that buys.
        maxWidth: wide ? "none" : 620,
        margin: "0 auto",
      }}
    >
      <main
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "16px 16px 6px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          gap: 12,
        }}
      >
        <TaskList
          tasks={tasks}
          now={now}
          wide={wide}
          onComplete={complete}
          onDelete={discard}
          onEdit={edit}
        />
        <Archive tasks={tasks} now={now} />
      </main>

      <CaptureBar wide={wide} onCapture={capture} />

      {/*
        One fixed layer for every notification -- undo toast and save-error banner.
        Pinned to the top edge of the window, horizontally centred on the column,
        respecting the top safe-area inset. Out of the document flow entirely:
        appearing, expiring and being replaced never lay out anything below, so the
        list stays pixel-stable while the user acts on it. The layer
        itself is pointer-events:none (an absent toast must not block what it floats
        over); each visible child re-enables its own clicks.
      */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "max(12px, env(safe-area-inset-top)) 12px 0",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 596, // 620 shell minus the 12px side paddings, as before.
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {pending !== null && (
            <UndoToast
              key={pending.token}
              label={pending.label}
              onUndo={undo}
              onExpire={expire}
            />
          )}

          {saveError && (
            <div
              role="alert"
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                background: TOAST_BG,
                color: TOAST_INK,
                fontSize: 13,
                pointerEvents: "auto",
              }}
            >
              não foi possível salvar suas alterações
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
