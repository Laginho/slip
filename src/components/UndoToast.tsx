import { useEffect } from "react";
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
 * Renders in normal flow, directly above the capture bar. Deliberately not
 * position: fixed -- that would need a magic offset matching the bar's height plus the
 * safe-area inset, and would drift the moment either changed.
 */

type Props = {
  /** What was done, already in the past tense: "concluída" / "apagada". */
  label: string;
  onUndo: () => void;
  onExpire: () => void;
};

const WINDOW_MS = 5000;

export function UndoToast({ label, onUndo, onExpire }: Props) {
  useEffect(() => {
    const timer = setTimeout(onExpire, WINDOW_MS);
    return () => clearTimeout(timer);
  }, [onExpire]);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        margin: "0 12px 8px",
        padding: "10px 14px",
        borderRadius: 10,
        background: TOAST_BG,
        color: TOAST_INK,
        fontSize: 14,
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
