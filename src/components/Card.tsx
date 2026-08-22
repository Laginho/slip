import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { TransitionEvent as ReactTransitionEvent } from "react";
import type { Task } from "../store";
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
 * Gestures:
 *   complete  swipe right, double-tap, double-click
 *   delete    swipe left, or the hover-revealed x on a fine pointer
 *   edit      long-press, or a single click on a fine pointer
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
  onComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
  onEdit: (task: Task, text: string) => void;
};

export function Card({ task, now, onComplete, onDelete, onEdit }: Props) {
  const urgency = urgencyOf(task.deadline, now);
  const late = daysOverdue(task.deadline, now);
  const ink = urgency === "dark" ? INK_ON_DARK : INK_ON_LIGHT;
  const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.text);
  const [hovered, setHovered] = useState(false);

  const origin = useRef<{ x: number; y: number; dragged: boolean } | null>(null);
  const longPress = useRef<number | undefined>(undefined);
  const pendingTap = useRef<number | undefined>(undefined);

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

  const beginEdit = () => {
    setDraft(task.text);
    setEditing(true);
  };

  const commitEdit = () => {
    setEditing(false);
    // A blank draft is a no-op in the store, so this leaves the text as it was.
    if (draft.trim() !== task.text) onEdit(task, draft);
  };

  const finishExit = () => {
    const way = exitWay.current;
    if (way === null) return; // already finished, or never started
    exitWay.current = null;
    window.clearTimeout(exitGuard.current);
    if (way === "right") onComplete(task);
    else onDelete(task);
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
    event.currentTarget.setPointerCapture(event.pointerId);
    origin.current = { x: event.clientX, y: event.clientY, dragged: false };
    setPhase({ kind: "drag", dx: 0 });
    longPress.current = window.setTimeout(() => {
      origin.current = null; // consumed: the pointerup must not also count as a tap
      beginEdit();
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLLIElement>) => {
    const start = origin.current;
    if (!start) return;
    if (
      Math.abs(event.clientX - start.x) > SLOP_PX ||
      Math.abs(event.clientY - start.y) > SLOP_PX
    ) {
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

  return (
    <li
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onTransitionEnd={onTransitionEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        listStyle: "none",
        background: CARD[task.kind][urgency],
        color: ink,
        borderRadius: 10,
        padding: "11px 13px",
        display: "flex",
        alignItems: "baseline",
        gap: 10,
        transform,
        transition,
        // Let the list scroll vertically while horizontal drags stay ours.
        touchAction: "pan-y",
        // Long-press must not start a text selection instead.
        userSelect: editing ? "auto" : "none",
      }}
    >
      <span style={{ flex: 1, minWidth: 0, fontSize: 16, lineHeight: 1.3 }}>
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitEdit}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitEdit();
              if (event.key === "Escape") {
                setDraft(task.text);
                setEditing(false);
              }
            }}
            aria-label="Task"
            style={{
              width: "100%",
              font: "inherit",
              color: "inherit",
              background: "transparent",
              border: "none",
              outline: "none",
              padding: 0,
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
            fontSize: 13,
            opacity: 0.75,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatDeadline(task.deadline)}
        </span>
      )}

      {/* Hover-revealed, so the resting list stays clean. Absent on touch, which has
          no hover -- there, deleting is the left swipe. */}
      {!editing && hasFinePointer && (
        <button
          type="button"
          aria-label="Apagar"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onDelete(task);
          }}
          style={{
            flex: "none",
            border: "none",
            background: "none",
            color: ink,
            opacity: hovered ? 0.7 : 0,
            padding: "0 2px",
            fontSize: 16,
            lineHeight: 1,
            cursor: hovered ? "pointer" : "default",
          }}
        >
          ×
        </button>
      )}
    </li>
  );
}
