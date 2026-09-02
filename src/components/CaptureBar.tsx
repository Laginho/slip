import { useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";
import type { Kind } from "../store";
import { KINDS } from "../store";
import { CARD, INK_ON_LIGHT } from "../palette";
import { inferDeadline } from "../urgency";

/**
 * Capture: the WhatsApp bar. Type, Enter, done -- anything that adds a step to that
 * path is wrong. Owns the sticky selected Kind (persisted under its own key: it is
 * not a Task, so it does not go through the store) and an optional day-of-month field
 * whose full date is inferred at capture time.
 *
 * Shortcuts are Alt+1/2/3, not the bare digits the ticket first asked for: the input
 * must be focused on launch and stay focused, and a bare "1" would be swallowed as a
 * shortcut instead of typed. Enter submits; on phones the keyboard's send action goes
 * through onSubmit because some IMEs never fire a keydown.
 *
 * The store call happens in App via onCapture -- mutations run outside setState, so
 * StrictMode double-invocation can never mint two ids for one create.
 */

const KIND_STORAGE_KEY = "capture/kind";

const CHIP_LABEL: Record<Kind, string> = { work: "W", college: "C", chore: "Ch" };

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
   * The screen's breakpoint, owned by App. `false` is the phone (<900px): the bar's
   * contents sit inside a white rounded composer with a hairline, itself in the white
   * pinned strip. `true` is the desktop wall (>=900px): the flat full-width strip,
   * chips and inputs directly on it. Same shortcuts, keying and error handling.
   */
  wide: boolean;
  /**
   * Returns whether the Task was persisted. A false return -- storage refused the
   * write -- must leave everything the user typed in place for a retry; the caller
   * (App) owns the error message.
   */
  onCapture: (text: string, kind: Kind, deadline: string | null) => boolean;
};

// The conversation composer for the phone: a white rounded bubble with a hairline,
// sitting on the white pinned strip below it.
const COMPOSER: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "6px 12px",
  borderRadius: 16,
  border: "1px solid var(--hairline)",
  background: "var(--capture-bg)",
};

export function CaptureBar({ wide, onCapture }: Props) {
  const [text, setText] = useState("");
  const [dayStr, setDayStr] = useState("");
  const [kind, setKind] = useState<Kind>(storedKind);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Launch focus scoped to desktop: on the phone an autofocus pops the keyboard
    // over the list before the user has asked to capture anything.
    if (window.matchMedia("(pointer: fine)").matches) inputRef.current?.focus();
  }, []);

  const selectKind = (selected: Kind) => {
    setKind(selected);
    try {
      localStorage.setItem(KIND_STORAGE_KEY, selected);
    } catch {
      // The selection still applies for this session; only the stickiness is lost.
    }
    inputRef.current?.focus();
  };

  const capture = () => {
    if (text.trim() === "") return;
    const deadline =
      dayStr === "" ? null : inferDeadline(Number(dayStr), new Date());
    // Clearing the fields *is* the success signal: when storage refused the write the
    // input keeps text, kind and deadline exactly as typed, so a retry costs nothing.
    if (!onCapture(text.trim(), kind, deadline)) return;
    setText("");
    setDayStr("");
    inputRef.current?.focus();
  };

  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === "Enter") {
      // preventDefault stops the form's implicit submission firing capture twice.
      event.preventDefault();
      capture();
      return;
    }
    const digit = ["1", "2", "3"].indexOf(event.key);
    if (event.altKey && digit !== -1) selectKind(KINDS[digit]);
  };

  // The three capture fields, reused as-is on the flat desktop strip and, on the
  // phone, wrapped in the rounded composer.
  const fields = (
    <>
      {KINDS.map((k) => {
        const selected = k === kind;
        return (
          <button
            key={k}
            type="button"
            onClick={() => selectKind(k)}
            title={`Alt+${KINDS.indexOf(k) + 1}`}
            style={{
              flex: "none",
              fontFamily: "inherit",
              border: "1px solid var(--hairline)",
              borderRadius: 999,
              padding: "8px 14px",
              fontSize: 14,
              background: selected ? CARD[k].light : "transparent",
              color: selected ? INK_ON_LIGHT : "var(--text-quiet)",
            }}
          >
            {CHIP_LABEL[k]}
          </button>
        );
      })}

      <input
        ref={inputRef}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="uma tarefa..."
        aria-label="nova tarefa"
        enterKeyHint="send"
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 18,
          border: "none",
          outline: "none",
          background: "transparent",
          padding: "10px 0",
        }}
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
        style={{
          flex: "none",
          width: 40,
          fontSize: 14,
          border: "none",
          outline: "none",
          background: "transparent",
          color: dayStr === "" ? "var(--text-quiet)" : "var(--text-primary)",
          padding: "4px 0",
          textAlign: "center",
        }}
      />
    </>
  );

  return (
    <form
      onKeyDown={onKeyDown}
      onSubmit={(event) => {
        event.preventDefault();
        capture();
      }}
      style={{
        flex: "none",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "14px 16px",
        paddingBottom: "max(14px, env(safe-area-inset-bottom))",
        background: "var(--capture-bg)",
        borderTop: "1px solid var(--hairline)",
      }}
    >
      {wide ? fields : <div style={COMPOSER}>{fields}</div>}
    </form>
  );
}
