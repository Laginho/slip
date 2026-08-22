import { CAPTURE_BG, HAIRLINE, SURFACE, TEXT_PRIMARY, TEXT_QUIET } from "./palette";

/**
 * The single screen. One scrolling list, one input pinned to the bottom.
 * No router, no tabs, no nav bar: the Archive (issue 08) is a section, not a route.
 *
 * Issue 01 lays the shell out only. The bar below is a placeholder that issue 04
 * replaces with <CaptureBar />, and the list area is filled by issue 05.
 */
export function App() {
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
        <p style={{ color: TEXT_QUIET, textAlign: "center", margin: 0 }}>nada por aqui</p>
      </main>

      <div
        style={{
          flex: "none",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          paddingBottom: "max(8px, env(safe-area-inset-bottom))",
          background: CAPTURE_BG,
          borderTop: `1px solid ${HAIRLINE}`,
        }}
      >
        <span style={{ color: TEXT_QUIET }}>[W] [C] [Ch]</span>
        <input
          placeholder="uma tarefa..."
          style={{
            flex: 1,
            minWidth: 0,
            border: "none",
            outline: "none",
            background: "transparent",
            padding: "8px 0",
          }}
        />
      </div>
    </div>
  );
}
