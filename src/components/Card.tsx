import type { Task } from "../store";
import { CARD, INK_ON_DARK, INK_ON_LIGHT, OVERDUE_RED } from "../palette";
import { daysOverdue, formatDeadline, urgencyOf } from "../urgency";

/**
 * One Task, drawn. Colour is the whole information design here: the hue says which part
 * of life the Task belongs to, the intensity says how soon it is due.
 *
 * `now` arrives as a prop rather than being read here, so that the whole list shares one
 * clock and the parent can refresh it on window focus -- a Card left open overnight has
 * to be correct in the morning without a reload.
 *
 * Renders an <li>: the parent is a <ul>.
 */

type Props = {
  task: Task;
  now: Date;
};

export function Card({ task, now }: Props) {
  const urgency = urgencyOf(task.deadline, now);
  const late = daysOverdue(task.deadline, now);
  const ink = urgency === "dark" ? INK_ON_DARK : INK_ON_LIGHT;

  return (
    <li
      style={{
        listStyle: "none",
        background: CARD[task.kind][urgency],
        color: ink,
        borderRadius: 10,
        padding: "11px 13px",
        display: "flex",
        alignItems: "baseline",
        gap: 10,
      }}
    >
      <span style={{ flex: 1, minWidth: 0, fontSize: 16, lineHeight: 1.3 }}>
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
      </span>

      {task.deadline !== null && (
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
    </li>
  );
}
