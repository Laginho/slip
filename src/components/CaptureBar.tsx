import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { Kind } from "../store";
import { KINDS } from "../store";
import { CARD, INK_ON_LIGHT } from "../palette";
import { inferDeadline } from "../urgency";
import { useMediaQuery } from "../useMediaQuery";

/**
 * Capture: the WhatsApp bar. Type, Enter, done -- anything that adds a step to that
 * path is wrong. Owns the sticky selected Kind (persisted under its own key: it is
 * not a Task, so it does not go through the store) and an optional day-of-month field
 * whose full date is inferred at capture time. The bar is a floating pill on both
 * profiles; Enter sends only under a fine pointer, the send button is the phone's
 * path; `enterKeyHint` follows the same rule.
 *
 * Shortcuts are Alt+1/2/3, not the bare digits the ticket first asked for: the input
 * must be focused on launch and stay focused, and a bare "1" would be swallowed as a
 * shortcut instead of typed. Enter submits; on phones the keyboard's send action goes
 * through onSubmit because some IMEs never fire a keydown.
 *
 * The store call happens in App via onCapture -- mutations run outside setState, so
 * StrictMode double-invocation can never mint two ids for one create.
 *
 * The Kind is one dot, not three chips: a 28px circle in the selected Kind's light hue
 * carrying its letter, which opens a pop-up above the pill listing the three Kinds with
 * their words. Click or tap only -- never hover; Escape or a pointerdown outside closes.
 */

const KIND_STORAGE_KEY = "capture/kind";

const LETTER: Record<Kind, string> = { work: "T", college: "F", chore: "C" };

const WORD: Record<Kind, string> = { work: "trabalho", college: "faculdade", chore: "casa" };

/** The lettered circle, shared by the dot and by every pop-up option. */
function circle(k: Kind) {
  return (
    <span
      style={{ width: 28, height: 28, borderRadius: 999, display: "inline-flex",
               alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600,
               background: CARD[k].light, color: INK_ON_LIGHT }}
    >
      {LETTER[k]}
    </span>
  );
}

function storedKind(): Kind {
  try {
    const raw = localStorage.getItem(KIND_STORAGE_KEY);
    return KINDS.some((kind) => kind === raw) ? (raw as Kind) : "work";
  } catch {
    // Storage can refuse reads too (Safari private mode, security policy). The sticky
    // kind is a preference, never worth crashing the bar over: fall back to work.
    return "work";
  }
}

type Props = {
  /**
   * Returns whether the Task was persisted. A false return -- storage refused the
   * write -- must leave everything the user typed in place for a retry; the caller
   * (App) owns the error message.
   */
  onCapture: (text: string, kind: Kind, deadline: string | null) => boolean;
};

export function CaptureBar({ onCapture }: Props) {
  const [text, setText] = useState("");
  const [dayStr, setDayStr] = useState("");
  const [kind, setKind] = useState<Kind>(storedKind);
  const [open, setOpen] = useState(false);

  const textRef = useRef<HTMLTextAreaElement>(null);
  const dotRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const fine = useMediaQuery("(pointer: fine)");

  useEffect(() => {
    if (fine) textRef.current?.focus();
  }, []);

  // Anything pressed outside the pop-up and its dot closes it -- including the textarea,
  // so a tap that goes back to typing costs one gesture, not two.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: Event) => {
      const target = event.target as Node | null;
      if (target === null) return;
      if (popupRef.current?.contains(target) || dotRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const blank = text.trim() === "";
  const lines = text.split("\n").length;

  const selectKind = (selected: Kind) => {
    setKind(selected);
    setOpen(false);
    try {
      localStorage.setItem(KIND_STORAGE_KEY, selected);
    } catch {
      // The selection still applies for this session; only the stickiness is lost.
    }
    textRef.current?.focus();
  };

  const capture = () => {
    if (blank) return;
    const deadline =
      dayStr === "" ? null : inferDeadline(Number(dayStr), new Date());
    // Clearing the fields *is* the success signal: when storage refused the write the
    // input keeps text, kind and deadline exactly as typed, so a retry costs nothing.
    if (!onCapture(text, kind, deadline)) return;
    setText("");
    setDayStr("");
    textRef.current?.focus();
  };

  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === "Escape" && open) {
      setOpen(false);
      textRef.current?.focus();
      return;
    }
    if (event.key === "Enter") {
      // Buttons keep their native Enter/Space activation: the dot and the pop-up options
      // must open or select, never send.
      if (event.target instanceof HTMLButtonElement) return;
      // In the textarea Enter sends only under a fine pointer and without Shift; otherwise
      // the browser inserts the break. From the day field Enter still sends, as before.
      if (event.target === textRef.current && (event.shiftKey || !fine)) return;
      event.preventDefault();
      capture();
      return;
    }
    const digit = ["1", "2", "3"].indexOf(event.key);
    if (event.altKey && digit !== -1) selectKind(KINDS[digit]);
  };

  return (
    <form
      onKeyDown={onKeyDown}
      onSubmit={(event) => {
        event.preventDefault();
        capture();
      }}
      style={{
        flex: "none",
        position: "relative",
        display: "flex",
        alignItems: "flex-end",
        gap: 6,
        width: "calc(100% - 32px)",
        maxWidth: 720,
        boxSizing: "border-box",
        marginTop: 0,
        marginLeft: "auto",
        marginRight: "auto",
        marginBottom: "calc(12px + env(safe-area-inset-bottom))",
        padding: "6px 6px 6px 14px",
        background: "var(--capture-bg)",
        borderRadius: lines <= 1 ? 999 : 26,
      }}
    >
      <button
        ref={dotRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        title={`Alt+${KINDS.indexOf(kind) + 1}`}
        onClick={() => setOpen((o) => !o)}
        style={{ flex: "none", minWidth: 44, minHeight: 44, padding: 0, border: "none",
                 background: "transparent", display: "inline-flex", alignItems: "center",
                 justifyContent: "center", cursor: "pointer", fontFamily: "inherit" }}
      >
        {circle(kind)}
      </button>

      {open && (
        <div
          ref={popupRef}
          role="group"
          aria-label="tipo"
          style={{ position: "absolute", bottom: "100%", left: 6, marginBottom: 6,
                   display: "flex", flexDirection: "column", gap: 2, padding: 6,
                   borderRadius: 10, background: "var(--capture-bg)",
                   border: "1px solid var(--hairline)" }}
        >
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={k === kind}
              onClick={() => selectKind(k)}
              style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44,
                       padding: "0 10px", border: "none", borderRadius: 8,
                       background: "transparent", color: "inherit", fontFamily: "inherit",
                       fontSize: 14, cursor: "pointer", textAlign: "left" }}
            >
              {circle(k)}
              {" " + WORD[k]}
            </button>
          ))}
        </div>
      )}

      <textarea
        ref={textRef}
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={Math.min(5, Math.max(1, lines))}
        placeholder="uma tarefa..."
        aria-label="nova tarefa"
        enterKeyHint={fine ? "send" : "enter"}
        style={{ flex: 1, minWidth: 0, fontFamily: "inherit", fontSize: 18, lineHeight: 1.3,
                 color: "inherit", border: "none", outline: "none", background: "transparent",
                 padding: "10px 0", margin: 0, resize: "none", overflowY: "auto" }}
      />

      <input
        type="text"
        inputMode="numeric"
        maxLength={2}
        value={dayStr}
        onChange={(event) => {
          const raw = event.target.value;
          if (/^\d{0,2}$/.test(raw)) setDayStr(raw);
        }}
        aria-label="prazo"
        placeholder="dd"
        style={{
          flex: "none",
          width: 40,
          fontSize: 14,
          border: "none",
          outline: "none",
          background: "transparent",
          color: dayStr === "" ? "var(--text-quiet)" : "var(--text-primary)",
          padding: "12px 0",
          textAlign: "center",
        }}
      />

      <button
        type="submit"
        aria-label="enviar"
        disabled={blank}
        style={{ flex: "none", minWidth: 44, minHeight: 44, padding: 0, border: "none",
                 background: "transparent", display: "inline-flex", alignItems: "center",
                 justifyContent: "center", cursor: blank ? "default" : "pointer" }}
      >
        <span
          aria-hidden="true"
          style={{ width: 36, height: 36, borderRadius: 999, display: "inline-flex",
                   alignItems: "center", justifyContent: "center",
                   background: blank ? "var(--text-quiet)" : "var(--text-primary)",
                   color: "var(--surface)", opacity: blank ? 0.45 : 1 }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M2.5 21 23 12 2.5 3v7l14 2-14 2z" />
          </svg>
        </span>
      </button>
    </form>
  );
}
