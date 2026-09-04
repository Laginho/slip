import { useEffect, useRef, useState } from "react";
import { CHROME } from "./palette";
import { useMediaQuery } from "./useMediaQuery";
import { useSession } from "./useSession";
import { archive } from "./store";
import { ARCHIVE_ROW_HEIGHT, Archive } from "./components/Archive";
import { CaptureBar } from "./components/CaptureBar";
import { TaskList } from "./components/TaskList";
import { UndoToast } from "./components/UndoToast";

/**
 * The single screen. One scrolling list, one input pinned to the bottom.
 * No router, no tabs, no nav bar: the Archive (issue 08) is a section, not a route.
 * The scrolling region and the content are two elements: the region scrolls while
 * the content declares the extra height that keeps the list pullable.
 * Ctrl+H toggles the Archive, except from a Card's in-place editor.
 */

export const ARCHIVE_HIDDEN_OFFSET = 16 + ARCHIVE_ROW_HEIGHT;

export function App() {
  const { tasks, pending, saveError, capture, complete, discard, edit, undo, expire } =
    useSession();

  const [archiveOpen, setArchiveOpen] = useState(false);
  const regionRef = useRef<HTMLDivElement>(null);

  const hasArchive = archive(tasks).length > 0;

  const toggleArchive = () => setArchiveOpen((o) => !o);

  const scrollRegionTo = (top: number) => {
    const el = regionRef.current;
    if (!el) return;
    if (typeof el.scrollTo === "function") el.scrollTo({ top });
    else el.scrollTop = top;
  };

  useEffect(() => {
    if (!hasArchive) return;
    scrollRegionTo(archiveOpen ? 0 : ARCHIVE_HIDDEN_OFFSET);
  }, [archiveOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) return;
      if (event.key.toLowerCase() !== "h") return;
      const target = event.target;
      // A Card's in-place editor: the only <textarea> that lives inside an <li>.
      if (target instanceof HTMLTextAreaElement && target.closest("li") !== null) return;
      if (!hasArchive) return; // nothing to show: leave the browser's Ctrl+H alone
      event.preventDefault();
      setArchiveOpen((o) => !o);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hasArchive]);

  /**
   * The one layout breakpoint. Inline styles cannot express a media query, so the
   * screen asks once and reacts to changes live -- a desktop window being resized,
   * a phone rotated. Like `now` below, it is owned here and handed down: TaskList
   * stays presentational, choosing between the phone column and the post-it wall.
   */
  const wide = useMediaQuery("(min-width: 900px)");

  const dark = useMediaQuery("(prefers-color-scheme: dark)");

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

  const chrome = CHROME[dark ? "dark" : "light"];

  return (
    <div
      style={
        {
          // dvh, not vh: the phone keyboard must shrink the list, not push the bar off-screen.
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          "--surface": chrome.surface,
          "--capture-bg": chrome.captureBg,
          "--text-primary": chrome.textPrimary,
          "--text-quiet": chrome.textQuiet,
          "--hairline": chrome.hairline,
          "--toast-bg": chrome.toastBg,
          "--toast-ink": chrome.toastInk,
          background: "var(--surface)",
          color: "var(--text-primary)",
          // The phone column cap. On a wide viewport the wall wants the monitor's
          // width -- the grid inside decides how many columns that buys.
          maxWidth: wide ? "none" : 620,
          margin: "0 auto",
        } as React.CSSProperties
      }
    >
      <div
        ref={regionRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          overscrollBehavior: "contain",
        }}
      >
        <main
          style={{
            padding: "16px 16px 6px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            boxSizing: "border-box",
            minHeight: hasArchive ? `calc(100% + ${ARCHIVE_HIDDEN_OFFSET}px)` : undefined,
          }}
        >
          <Archive tasks={tasks} now={now} open={archiveOpen} onToggle={toggleArchive} />
          <TaskList
            tasks={tasks}
            now={now}
            wide={wide}
            onComplete={complete}
            onDelete={discard}
            onEdit={edit}
          />
        </main>
      </div>

      <CaptureBar wide={wide} onCapture={capture} />

      {/*
        One fixed layer for every notification -- undo toast and save-error banner.
        Pinned to the top edge of the window, right-aligned in the top-right corner,
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
          alignItems: "flex-end",
          gap: 8,
          padding: "max(12px, env(safe-area-inset-top)) 12px 0",
          pointerEvents: "none",
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
              background: "var(--toast-bg)",
              color: "var(--toast-ink)",
              fontSize: 13,
              maxWidth: "min(360px, calc(100vw - 24px))",
              pointerEvents: "auto",
            }}
          >
            não foi possível salvar suas alterações
          </div>
        )}
      </div>
    </div>
  );
}
