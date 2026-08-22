# 05 — Cards and the list

Status: ready-for-agent
Blocked by: 02, 03

Render Open Tasks as Cards. Colour is the entire information design here — hue tells you
which part of life a Task belongs to, intensity tells you how soon it is due.

## Acceptance criteria

- Card shows the Task text. Nothing else, unless a rule below adds it.
- Card background = palette colour for `kind` at the Urgency step for `deadline`:
  - light — no Deadline, or Deadline more than 7 days out
  - medium — Deadline within 7 days
  - dark — Deadline today, or Overdue
- Urgency is **computed from the Deadline on every render**. There is no stored urgency,
  priority, or importance field, and the user never chooses it.
- Overdue Cards show `N dias atrasado` in bold red. No red border.
- Cards with a Deadline show it, compactly (`23/08`, not a full date string)
- List order comes from the store selector (issue 03) — do not re-sort in the view
- Dateless Tasks render in their own section below the dated ones
- Text is readable against all nine backgrounds — check the dark steps especially
- Empty state: one quiet line, no illustration, no onboarding

## Notes

- Urgency thresholds cross at local midnight. A Card due today must read as due today,
  not as overdue, and must not need a refresh to become correct — recompute on focus.
- Do not add a filter bar, a search box, a sort control, or a grouping toggle. The list
  is short by design; the colours are the filter.

## Scope

Files: `src/components/Card.tsx`, `src/components/TaskList.tsx`, `src/urgency.ts`, `src/urgency.test.ts`.
Budget: around 140 lines total. Past 220, stop and ask.
Gate: **split.** `urgency.ts` is real TDD — test the boundaries explicitly: 8 days out,
7 days out, tomorrow, today, yesterday, no deadline. Date-boundary logic is where this
ticket will actually break. The rendering half is not TDD; it passes on the eye.

Note: `Card.tsx` is the exemplar every later component copies. Have the strong model write
it, then delegate the rest by analogy.
