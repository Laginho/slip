/**
 * Deadline -> Urgency step, and how many days late a Task is.
 *
 * Urgency is always derived here and never stored: there is no urgency, priority or
 * importance field on a Task, and the user never picks one. Callers recompute on every
 * render, and on window focus, so a Card left open overnight is correct in the morning.
 *
 * Everything is in *local* calendar days. Deadlines are compared by parsing their parts
 * by hand, because `new Date("2026-08-22")` is UTC midnight -- which is the day before
 * in every western timezone, and would show a Task due today as one day Overdue.
 */

export type Urgency = "light" | "medium" | "dark";

const DAY_MS = 86_400_000;

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function deadlineAsLocalDay(deadline: string): number {
  const [year, month, day] = deadline.split("-").map(Number);
  return new Date(year, month - 1, day).getTime();
}

/**
 * Whole local days from today until the Deadline. Negative once Overdue.
 * Rounded, because a day is 23 or 25 hours across a DST change.
 */
function daysUntil(deadline: string, now: Date): number {
  return Math.round((deadlineAsLocalDay(deadline) - startOfLocalDay(now)) / DAY_MS);
}

export function urgencyOf(deadline: string | null, now: Date = new Date()): Urgency {
  if (deadline === null) return "light";
  const days = daysUntil(deadline, now);
  if (days <= 0) return "dark"; // due today, or Overdue
  if (days <= 7) return "medium";
  return "light";
}

/** Whole days late. 0 when the Deadline is today, in the future, or absent. */
export function daysOverdue(deadline: string | null, now: Date = new Date()): number {
  if (deadline === null) return 0;
  return Math.max(0, -daysUntil(deadline, now));
}

/** Compact day/month, as on a Card: `23/08`. */
export function formatDeadline(deadline: string): string {
  const [, month, day] = deadline.split("-");
  return `${day}/${month}`;
}
