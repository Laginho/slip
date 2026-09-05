import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { TransitionEvent as ReactTransitionEvent } from "react";
import type { Task } from "../store";
import { useMediaQuery } from "../useMediaQuery";
import { CARD, INK_ON_DARK, INK_ON_LIGHT, OVERDUE_RED } from "../palette";
import { daysOverdue, formatDeadline, urgencyOf } from "../urgency";

/**
 * One Task, drawn, and every gesture that acts on it.
 *
 * Colour is the whole information design: the hue says which part of life the Task
 * belongs to, the intensity says how soon it is due.
 *
 * `now` arrives as a prop rather than being read here, so that the whole list shares one
 * clock and the parent can refresh it on focus and at midnight -- a Card left open
 * overnight has to be correct in the morning without a reload.
 *
 * Renders an <li>: the parent is a <ul>.
 *
 * Gestures (shortcuts -- every action also has a plain button):
 *   complete  swipe right, double-tap, double-click
 *   delete    swipe left, or the × button
 *   edit      long-press, or a single click on a fine pointer
 *
 * Keyboard and assistive tech get three real buttons -- Concluir, Editar, Apagar --
 * rendered unconditionally: gating on a fine-pointer media query strands anyone using
 * a keyboard with a touch-oriented device, which is exactly the pairing tablets get.
 * They sit at opacity 0 with pointer-events:none until the Card is genuinely hovered
 * (only where `(hover: hover)` holds -- a touch tap's compatibility mouseenter must not
 * arm them mid-gesture) or holds focus within (tracked by React's bubbling onFocus/
 * onBlur, since inline styles cannot express :focus-within), so a resting Card keeps
 * its whole surface for gestures and an
 * invisible button can never take a tap; tabbing to one reveals and enables it, with
 * its native focus outline. The <li> itself stays non-focusable: one focus target
 * hiding Enter/Delete/F2 behind undiscoverable semantics communicates none of the three
 * actions well.
 *
 * A swipe past the threshold flies the Card off-screen in its own direction and only
 * then reports up, so the Task leaving the store is what closes the gap behind it;
 * below the threshold it springs back and calls nothing. Transforms and transitions
 * only. prefers-reduced-motion is honoured by index.html forcing durations to ~0: the
 * Card still leaves, without travel, and transitionend still fires -- with a timeout
 * guard behind it, because an interrupted transition never sends the event and would
 * otherwise leave the Card stranded off-screen with its action never taken.
 *
 * Two of those destroy something the user typed, so both go up to the parent, which
 * applies them through the store and holds the snapshot for the undo window. Nothing
 * here mutates a Task directly -- that would skip the updatedAt stamp and break sync.
 */

/** The standard legacy-flexbox line clamp; the only way to clamp with an ellipsis. */
const clamp = (lines: number) =>
  ({ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: String(lines), overflow: "hidden" }) as const;

/** Deliberate distance, not a flick: an accidental delete is the failure mode here. */
const SWIPE_PX = 72;
/** Past this, a press is an intent to edit rather than a tap. */
const LONG_PRESS_MS = 500;
/** How long a first tap waits to see whether it is really the first half of a double. */
const DOUBLE_TAP_MS = 250;
/** Finger jitter that should not count as a drag. */
const SLOP_PX = 10;
/** Flight time off-screen. Well inside the spec's 250ms even on a slow phone. */
const EXIT_MS = 200;
/** Grace period after EXIT_MS in case transitionend never arrives. */
const EXIT_GUARD_MS = 150;

/**
 * Visual phases of a swipe. `drag` tracks the pointer 1:1 with transitions disabled;
 * `spring` and `exit` are the only states that animate. Purely visual -- the store is
 * touched only when an exit finishes.
 */
type Phase =
  | { kind: "rest" }
  | { kind: "drag"; dx: number }
  | { kind: "spring" }
  | { kind: "exit"; way: "left" | "right" };

type Props = {
  task: Task;
  now: Date;
  /**
   * The screen's breakpoint, owned by App. `false` is the phone (<900px): the cartoon
   * bubble -- left-aligned, capped at 86%, radius 6px/16px/16px/16px, Deadline printed
   * as its own "vence dd/mm" meta line. `true` is the desktop wall (>=900px): a square
   * post-it: text scaled to the square and clamped at eight lines, Deadline bottom-left,
   * controls top-right. Only the look differs; gestures,
   * buttons, editing, swipe and keyboard are identical in both.
   */
  wide: boolean;
  /** Returns whether the action persisted; false means storage refused the write. */
  onComplete: (task: Task) => boolean;
  onDelete: (task: Task) => boolean;
  onEdit: (task: Task, text: string) => boolean;
};

export function Card({ task, now, wide, onComplete, onDelete, onEdit }: Props) {
  const bubble = !wide;
  const urgency = urgencyOf(task.deadline, now);
  const late = daysOverdue(task.deadline, now);
  const ink = urgency === "dark" ? INK_ON_DARK : INK_ON_LIGHT;

  // Mouse-hover reveal only exists where hover does. Touch browsers fire compatibility
  // mouseenter/mouseover on a plain tap and leave the state stuck until the next tap
  // elsewhere -- trusting them would re-arm the buttons mid-gesture and let the second
  // half of a double-tap land on Apagar. This gates ONLY the hover half of the reveal:
  // rendering, Tab focusability and focus-driven reveal stay unconditional, so a
  // keyboard attached to a tablet still reaches every action.
  // Absent matchMedia (unstubbed jsdom) there is no hover capability to read:
  // treat it as no-hover rather than throwing, the touch-device profile.
  const canHover =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(hover: hover)").matches;

  // Enter commits only where a fine pointer makes a single-line commit gesture
  // unambiguous; under a coarse pointer Enter always inserts a break. Live, so
  // a pointer flip mid-edit takes effect on the next keypress.
  const fine = useMediaQuery("(pointer: fine)");

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.text);
  const [hovered, setHovered] = useState(false);
  // focus-within: focus and blur bubble in React, so a child button tabbed to sets this.
  const [focusedWithin, setFocusedWithin] = useState(false);

  const origin = useRef<{ x: number; y: number; dragged: boolean; fromButton: boolean } | null>(null);
  const longPress = useRef<number | undefined>(undefined);
  const pendingTap = useRef<number | undefined>(undefined);
  const suppressClick = useRef(false);

  /** The in-place edit textarea, and the control keyboard commits hand focus back to. */
  const editInput = useRef<HTMLTextAreaElement>(null);
  const editarButton = useRef<HTMLButtonElement>(null);
  /** Set when a commit leaves the input holding focus; consumed by the effect below. */
  const wantsFocusBack = useRef(false);

  /** Which way an exit is flying, while it flies. Null again the moment it lands. */
  const exitWay = useRef<"left" | "right" | null>(null);
  const exitGuard = useRef<number | undefined>(undefined);

  const [phase, setPhase] = useState<Phase>({ kind: "rest" });

  useEffect(
    () => () => {
      window.clearTimeout(longPress.current);
      window.clearTimeout(pendingTap.current);
      window.clearTimeout(exitGuard.current);
    },
    [],
  );

  // Leaving edit mode unmounts the focused textarea, and browsers do not reliably deliver
  // focusout for a removed node -- without this reset the three controls can stick
  // revealed on that one Card with nothing actually focused inside it. When a commit
  // came from the keyboard (textarea still focused), hand focus to the Card's own controls
  // instead of dropping it on <body>; run after render so the button exists to focus.
  useEffect(() => {
    if (!editing && wantsFocusBack.current) {
      wantsFocusBack.current = false;
      editarButton.current?.focus();
    }
  }, [editing]);

  const beginEdit = () => {
    setDraft(task.text);
    setEditing(true);
  };

  /** Leave edit mode, clearing any focus-within the unmounting textarea leaves behind. */
  const finishEditing = () => {
    // A keyboard commit still holds focus in the textarea; remember that so the effect
    // above can return it. A blur commit must not steal focus back -- focus already
    // moved where the user sent it.
    wantsFocusBack.current = document.activeElement === editInput.current;
    setEditing(false);
    setFocusedWithin(false);
  };

  const commitEdit = () => {
    // Persist FIRST: a refused write keeps the editor open with the draft intact for a
    // retry, rather than discarding the typed text behind a generic banner. A blank
    // draft is a store no-op and simply closes.
    if (draft.trim() !== task.text && !onEdit(task, draft)) return;
    finishEditing();
  };

  const finishExit = () => {
    const way = exitWay.current;
    if (way === null) return; // already finished, or never started
    exitWay.current = null;
    window.clearTimeout(exitGuard.current);
    const saved = way === "right" ? onComplete(task) : onDelete(task);
    // A false return means persistence failed and the Task is still in the store: the
    // Card springs back rather than staying stranded off-screen with its action lost.
    if (!saved) setPhase({ kind: "spring" });
  };

  /** Fly off-screen now; the action fires when the flight lands, not at release. */
  const beginExit = (way: "left" | "right") => {
    exitWay.current = way;
    setPhase({ kind: "exit", way });
    window.clearTimeout(exitGuard.current);
    exitGuard.current = window.setTimeout(finishExit, EXIT_MS + EXIT_GUARD_MS);
  };

  const onTransitionEnd = (event: ReactTransitionEvent<HTMLLIElement>) => {
    if (event.propertyName !== "transform" || event.target !== event.currentTarget) return;
    finishExit();
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLLIElement>) => {
    if (editing || phase.kind === "exit") return;
    suppressClick.current = false;
    const fromButton = (event.target as Element).closest("button") !== null;
    if (!fromButton) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // A pointer that is already gone (or a synthetic one) must not break the gesture.
      }
    }
    origin.current = { x: event.clientX, y: event.clientY, dragged: false, fromButton };
    setPhase({ kind: "drag", dx: 0 });
    if (!fromButton) {
      longPress.current = window.setTimeout(() => {
        origin.current = null; // consumed: the pointerup must not also count as a tap
        beginEdit();
      }, LONG_PRESS_MS);
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLLIElement>) => {
    const start = origin.current;
    if (!start) return;
    if (
      Math.abs(event.clientX - start.x) > SLOP_PX ||
      Math.abs(event.clientY - start.y) > SLOP_PX
    ) {
      if (!start.dragged && start.fromButton) {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {}
        suppressClick.current = true;
      }
      start.dragged = true;
      window.clearTimeout(longPress.current); // moving means this is not a long-press
    }
    // Only past slop does the Card follow: jitter must not wiggle it.
    if (start.dragged) setPhase({ kind: "drag", dx: event.clientX - start.x });
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLLIElement>) => {
    window.clearTimeout(longPress.current);
    const start = origin.current;
    origin.current = null;
    if (!start) return;

    const dx = event.clientX - start.x;
    if (dx >= SWIPE_PX) return beginExit("right");
    if (dx <= -SWIPE_PX) return beginExit("left");
    // A drag that never reached the threshold springs back and does nothing.
    if (start.dragged) return setPhase({ kind: "spring" });
    if (start.fromButton) {
      setPhase({ kind: "rest" });
      return;
    }
    setPhase({ kind: "rest" });

    if (pendingTap.current !== undefined) {
      window.clearTimeout(pendingTap.current);
      pendingTap.current = undefined;
      return onComplete(task); // second tap of a double
    }
    pendingTap.current = window.setTimeout(() => {
      pendingTap.current = undefined;
      // Only a fine pointer edits on a single tap. On a touch screen a single tap has
      // to stay inert, or it would fire on the way into every double-tap.
      if (window.matchMedia("(pointer: fine)").matches) beginEdit();
    }, DOUBLE_TAP_MS);
  };

  const onPointerCancel = () => {
    window.clearTimeout(longPress.current);
    origin.current = null;
    setPhase({ kind: "rest" });
  };

  const transform =
    phase.kind === "drag"
      ? `translateX(${phase.dx}px)`
      : phase.kind === "spring"
        ? "translateX(0)"
        : phase.kind === "exit"
          ? `translateX(${phase.way === "right" ? "" : "-"}110%)`
          : undefined;
  // Transitions stay off while dragging, or the Card would lag behind the finger.
  const transition =
    phase.kind === "spring" || phase.kind === "exit"
      ? `transform ${EXIT_MS}ms ease-out`
      : "none";

  // The action buttons reveal on hover of the Card (only where hover is a real
  // capability -- see canHover) or whenever anything inside it holds focus.
  const revealActions = (hovered && canHover) || focusedWithin;

  const actionStyle = {
    flex: "none",
    border: "none",
    background: "none",
    color: ink,
    opacity: revealActions ? 0.7 : 0,
    // Invisible must also mean untouchable: opacity hides painting only, and a live tap
    // target behind it would swallow the swipe strip at the Card's trailing edge and
    // delete on a plain tap. pointer-events:none lets touches fall through to the <li>;
    // Tab focus is unaffected, and focusing a button flips this back to "auto", so its
    // own Enter/Space activation and any pointer use after reveal keep working.
    pointerEvents: revealActions ? "auto" : "none",
    padding: "0 2px",
    fontSize: bubble ? 18 : "7.5cqw",
    lineHeight: 1,
    minWidth: 44,
    minHeight: 44,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "-13px -12px",
    // The browser's default focus outline stays; hiding it would undo the reveal.
    cursor: revealActions ? "pointer" : "default",
  } as const;

  // The three native buttons, reused as-is: absolutely positioned in the top-right
  // corner of the square on the wall, wrapped in their own trailing row inside the
  // bubble's column.
  const actions = (
    <>
      <button
        type="button"
        aria-label="Concluir"
        onClick={(event) => {
          event.stopPropagation();
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          onComplete(task);
        }}
        style={actionStyle}
      >
        ✓
      </button>
      <button
        ref={editarButton}
        type="button"
        aria-label="Editar"
        onClick={(event) => {
          event.stopPropagation();
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          beginEdit();
        }}
        style={actionStyle}
      >
        ✎
      </button>
      <button
        type="button"
        aria-label="Apagar"
        onClick={(event) => {
          event.stopPropagation();
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          onDelete(task);
        }}
        style={actionStyle}
      >
        ×
      </button>
    </>
  );

  return (
    <li
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onTransitionEnd={onTransitionEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocusedWithin(true)}
      onBlur={() => setFocusedWithin(false)}
      style={{
        ...(bubble
          ? {}
          : {
              position: "relative",
              containerType: "inline-size",
              aspectRatio: "1 / 1",
              overflow: "hidden",
            }),
        listStyle: "none",
        background: CARD[task.kind][urgency],
        color: ink,
        maxWidth: bubble ? "86%" : undefined,
        borderRadius: bubble ? "6px 16px 16px 16px" : 10,
        padding: bubble ? "10px 14px" : "16px 18px",
        display: "flex",
        flexDirection: "column",
        alignItems: bubble ? "flex-start" : "stretch",
        gap: bubble ? 4 : 10,
        transform,
        transition,
        // Let the list scroll vertically while horizontal drags stay ours.
        touchAction: "pan-y",
        // Long-press must not start a text selection instead.
        userSelect: editing ? "auto" : "none",
      }}
    >
      <span
        style={
          bubble
            ? {
                flex: 1,
                minWidth: 0,
                fontSize: 18,
                lineHeight: 1.5,
                whiteSpace: "pre-line",
                ...(editing ? {} : clamp(6)),
              }
            : {
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                fontSize: "6.67cqw",
                lineHeight: 1.3,
                whiteSpace: "pre-line",
                paddingRight: revealActions && !editing ? 80 : 0,
                ...(editing ? { display: "flex" } : clamp(8)),
              }
        }
      >
        {editing ? (
          <textarea
            ref={editInput}
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitEdit}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && fine) {
                // Fine pointer: Enter commits. Everywhere else the browser
                // inserts the break -- Shift+Enter, or any Enter under coarse.
                event.preventDefault();
                commitEdit();
              }
              if (event.key === "Escape") {
                // Cancel: no write attempted, the draft reverts.
                setDraft(task.text);
                finishEditing();
              }
            }}
            aria-label="Task"
            rows={Math.max(1, draft.split("\n").length)}
            style={{
              width: "100%",
              ...(bubble ? {} : { flex: 1, minHeight: 0, overflowY: "auto" }),
              font: "inherit",
              color: "inherit",
              background: "transparent",
              border: "none",
              outline: "none",
              padding: 0,
              resize: "none",
            }}
          />
        ) : (
          <>
            {task.text}
            {late > 0 && (
              <>
                {" "}
                {/* Bold red label, never a red border: a border collides with dark tangerine. */}
                <span style={{ color: OVERDUE_RED, fontWeight: 700, whiteSpace: "nowrap" }}>
                  {late} {late === 1 ? "dia" : "dias"} atrasado
                </span>
              </>
            )}
          </>
        )}
      </span>

      {task.deadline !== null && !editing && (
        <span
          style={{
            flex: "none",
            ...(bubble ? {} : { alignSelf: "flex-start" }),
            fontSize: bubble ? 13 : "5.8cqw",
            opacity: 0.75,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {bubble ? `vence ${formatDeadline(task.deadline)}` : formatDeadline(task.deadline)}
        </span>
      )}

      {/* Native controls for all three actions, always rendered -- keyboard and
          touch-keyboard users cannot be gated behind a fine-pointer media query.
          Hover or focus-within reveals them; gestures remain the shortcuts. */}
      {!editing &&
        (bubble ? (
          <div style={{ display: "flex", gap: 4, alignSelf: "flex-end" }}>{actions}</div>
        ) : (
          <div style={{ position: "absolute", top: 16, right: 18, display: "flex", gap: 10 }}>
            {actions}
          </div>
        ))}
    </li>
  );
}
