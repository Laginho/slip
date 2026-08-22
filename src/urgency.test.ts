import { describe, expect, it } from "vitest";
import { daysOverdue, formatDeadline, urgencyOf } from "./urgency";

// A fixed local "now": Saturday 22 August 2026, mid-afternoon.
const NOW = new Date(2026, 7, 22, 14, 30);

/** A YYYY-MM-DD Deadline n local days from NOW. */
function inDays(n: number): string {
  const d = new Date(2026, 7, 22 + n);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

describe("urgencyOf", () => {
  it("is light with no Deadline", () => {
    expect(urgencyOf(null, NOW)).toBe("light");
  });

  // The boundary the ticket says this will actually break on.
  it("is light more than 7 days out, medium at exactly 7", () => {
    expect(urgencyOf(inDays(8), NOW)).toBe("light");
    expect(urgencyOf(inDays(7), NOW)).toBe("medium");
  });

  it("is medium from tomorrow through 7 days out", () => {
    expect(urgencyOf(inDays(1), NOW)).toBe("medium");
    expect(urgencyOf(inDays(4), NOW)).toBe("medium");
  });

  it("is dark today, and dark once Overdue", () => {
    expect(urgencyOf(inDays(0), NOW)).toBe("dark");
    expect(urgencyOf(inDays(-1), NOW)).toBe("dark");
    expect(urgencyOf(inDays(-40), NOW)).toBe("dark");
  });

  it("treats today as due today until local midnight, never as Overdue", () => {
    const today = inDays(0);
    for (const hour of [0, 1, 12, 23]) {
      const now = new Date(2026, 7, 22, hour, hour === 23 ? 59 : 0);
      expect(urgencyOf(today, now), `${hour}h`).toBe("dark");
      expect(daysOverdue(today, now), `${hour}h`).toBe(0);
    }
  });

  it("reads the Deadline in local time, not UTC", () => {
    // `new Date("2026-08-22")` is UTC midnight, which is the previous day in every
    // western timezone -- that bug would show today's Task as one day Overdue.
    expect(daysOverdue(inDays(0), new Date(2026, 7, 22, 0, 30))).toBe(0);
    expect(daysOverdue(inDays(0), new Date(2026, 7, 22, 23, 30))).toBe(0);
  });
});

describe("daysOverdue", () => {
  it("counts whole local days late", () => {
    expect(daysOverdue(inDays(-1), NOW)).toBe(1);
    expect(daysOverdue(inDays(-9), NOW)).toBe(9);
  });

  it("is 0 for today, the future, and no Deadline", () => {
    expect(daysOverdue(inDays(0), NOW)).toBe(0);
    expect(daysOverdue(inDays(3), NOW)).toBe(0);
    expect(daysOverdue(null, NOW)).toBe(0);
  });

  it("survives a month and a year boundary", () => {
    expect(daysOverdue("2026-07-31", new Date(2026, 7, 1, 9, 0))).toBe(1);
    expect(daysOverdue("2025-12-31", new Date(2026, 0, 2, 9, 0))).toBe(2);
  });
});

describe("formatDeadline", () => {
  it("is compact day/month", () => {
    expect(formatDeadline("2026-08-23")).toBe("23/08");
    expect(formatDeadline("2026-01-05")).toBe("05/01");
  });
});
