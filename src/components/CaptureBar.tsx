import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { Kind } from "../store";
import { KINDS } from "../store";
import { CARD, CAPTURE_BG, HAIRLINE, INK_ON_LIGHT, TEXT_QUIET } from "../palette";

/**
 * Capture: the WhatsApp bar. Type, Enter, done -- anything that adds a step to that
 * path is wrong. Owns the sticky selected Kind (persisted under its own key: it is
 * not a Task, so it does not go through the store) and an optional native date input.
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
   * Returns whether the Task was persisted. A false return -- storage refused the
   * write -- must leave everything the user typed in place for a retry; the caller
   * (App) owns the error message.
   */
  onCapture: (text: string, kind: Kind, deadline: string | null) => boolean;
};

export function CaptureBar({ onCapture }: Props) {
  const [text, setText] = useState("");
  const [deadline, setDeadline] = useState("");
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
    // Clearing the fields *is* the success signal: when storage refused the write the
    // input keeps text, kind and deadline exactly as typed, so a retry costs nothing.
    if (!onCapture(text.trim(), kind, deadline === "" ? null : deadline)) return;
    setText("");
    setDeadline("");
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
        gap: 8,
        padding: "8px 12px",
        paddingBottom: "max(8px, env(safe-area-inset-bottom))",
        background: CAPTURE_BG,
        borderTop: `1px solid ${HAIRLINE}`,
      }}
    >
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
              border: `1px solid ${HAIRLINE}`,
              borderRadius: 999,
              padding: "5px 10px",
              fontSize: 13,
              background: selected ? CARD[k].light : "transparent",
              color: selected ? INK_ON_LIGHT : TEXT_QUIET,
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
        enterKeyHint="send"
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 16, // iOS zooms focused inputs below 16px, which breaks the bar layout.
          border: "none",
          outline: "none",
          background: "transparent",
          padding: "8px 0",
        }}
      />

      <input
        type="date"
        value={deadline}
        onChange={(event) => setDeadline(event.target.value)}
        aria-label="Deadline"
        style={{
          flex: "none",
          fontSize: 13,
          border: "none",
          outline: "none",
          background: "transparent",
          color: deadline === "" ? TEXT_QUIET : INK_ON_LIGHT,
          padding: "4px 0",
        }}
      />
    </form>
  );
}
