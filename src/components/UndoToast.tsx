import { useEffect, useRef } from "react";
import { TOAST_BG, TOAST_INK } from "../palette";

/**
 * The five-second undo window. Not optional polish: a swipe is easy to trigger by
 * accident and there is no other way back, so every complete and every delete shows one.
 *
 * Purely presentational. The action has *already* been applied and persisted by the time
 * this renders -- which is what makes "a second action replaces the pending toast,
 * applying the first" fall out for free rather than needing a queue. Undo is a
 * store.restore() of the snapshot the parent is holding, not a deferred commit.
 *
 * The parent must give this a unique `key` per action, so that a second action of the
 * same wording remounts it and restarts the five seconds instead of inheriting the
 * remainder of the previous window.
 *
 * Positioned entirely by the parent's fixed layer at the top of the window: this
 * component only fills that layer's column width. Being out of the document flow is
 * the point -- appearing and expiring must never lay out the list below.
 */

type Props = {
  /** What was done, already in the past tense: "concluída" / "apagada". */
  label: string;
  onUndo: () => void;
  onExpire: () => void;
};

const WINDOW_MS = 5000;

export function UndoToast({ label, onUndo, onExpire }: Props) {
  // The window is bound to this mount, and the parent remounts per action. Depending on
  // onExpire instead would let any unrelated parent render -- a keystroke in the
  // controlled capture input, say -- restart the five seconds, extending the window
  // indefinitely while the user types. The ref keeps the call current without making
  // the timer's lifetime depend on a caller remembering to memoise.
  const expire = useRef(onExpire);
  useEffect(() => {
    expire.current = onExpire;
  });

  useEffect(() => {
    const timer = setTimeout(() => expire.current(), WINDOW_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        width: "100%",
        padding: "10px 14px",
        borderRadius: 10,
        background: TOAST_BG,
        color: TOAST_INK,
        fontSize: 14,
        // The parent layer is pointer-events:none so an absent toast never blocks the
        // content beneath; the toast itself must still be clickable while it exists.
        pointerEvents: "auto",
      }}
    >
      <span>{label}</span>
      <button
        type="button"
        onClick={onUndo}
        style={{
          flex: "none",
          border: "none",
          background: "none",
          color: TOAST_INK,
          fontWeight: 700,
          textDecoration: "underline",
          padding: "4px 0",
        }}
      >
        desfazer
      </button>
    </div>
  );
}
