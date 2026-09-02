# 04: Archive moves to the top of the list; its open state lives on the screen

**What to build:** The Archive section renders *above* the Open Cards inside the one
scrolling region, instead of below them. The "ver concluídas" / "ocultar concluídas"
link keeps toggling it, and opening scrolls the region to its top so the section is in
view. Its open/closed state is owned by the screen root (so later tickets can drive it
from a keyboard shortcut and hide the link). An empty Open list renders nothing at all,
and when no Task has ever been Done the Archive renders nothing. The Archive's contents
(seven local calendar days, "ver mais antigas", quiet struck-through rows) are unchanged,
and the fixed notification layer is untouched.

**Blocked by:** None (can start immediately).

**Status:** complete

- [x] Archive section is the first child of the scrolling region; the Open list follows
- [x] Open/closed state is held by the screen root and passed down with a toggle callback; the link still toggles it
- [x] Opening the Archive sets the scrolling region's `scrollTop` to 0
- [x] Empty Open list renders no sections and no copy
- [x] With zero Done Tasks the Archive renders nothing
- [x] Archive window logic, "ver mais antigas" and row styling unchanged
- [x] Notification layer unchanged
- [x] Existing App and Archive-related tests green (update only those asserting the old position)

## Test Case Matrix

Seam: App rendered through the shared scaffolding. Allowed mocks: `matchMedia` stubs
(no-match and desktop), `localStorage` seeded with Tasks, fixed clock via
`vi.setSystemTime`.

| # | Setup | Action | Expected |
|---|---|---|---|
| 1 | 2 Open, 1 Done today | render | the scrolling region's first element child contains the "ver concluídas" button; the Open list comes after it |
| 2 | same | click "ver concluídas" | Done row visible; button now reads "ocultar concluídas"; still the first child, above the Open list |
| 3 | same, region `scrollTop` set to 120 before the click | click "ver concluídas" | region `scrollTop === 0` after opening |
| 4 | same, open | click "ocultar concluídas" | Done rows gone; button reads "ver concluídas" |
| 5 | 2 Open, 0 Done | render | no "ver concluídas" text anywhere; first child of the region is the Open list |
| 6 | 0 Open, 0 Done | render | the scrolling region has no text content; no empty-state copy |
| 7 | 0 Open, 1 Done | render | only the Archive link exists in the region |
| 8 | 1 Done 8 days ago, 1 Done today, open | render | one row visible plus "ver mais antigas"; clicking it shows both (unchanged behaviour) |
| 9 | desktop stub, 2 Open, 1 Done | render | Archive still first child; Open list still a grid (wall unaffected) |
| 10 | 1 Open, 1 Done | complete the Open Task | undo toast appears in the fixed layer, outside the scrolling region; the Open list is gone (row 6) so the region holds only the Archive, still first |

Error cases: none new.

## Comments

- 2026-09-02 (master): cycle 03 (`traycer/slip-1a-archive-top`) returned 158/2 red. TEST did not
  update the two legacy `"nada por aqui"` assertions and over-specified rows 1 and 5 (single
  `<main>` child); MAKE answered with an unplanned `<div>` around the TaskList, a layout change.
  State lifting, Archive-first order and scroll reset are correct and stay. Ledger row 03 names
  TEST and MAKE. Correction handoff `handoffs/11-to-plan.md`, return pre-assigned to
  `12-to-master.md`. Runs in parallel with ticket 02 (disjoint files). Status stays
  `ready-for-agent`.
- 2026-09-02 (master): cycle 06 (`traycer/dapper-rabbit`) returned 159/1: TEST and MAKE did exactly
  what handoff 11 planned; the remaining red is row 10, whose matrix text (master's) demanded an
  unchanged child count after completing the only Open Task, contradicting row 6. Matrix row 10
  rewritten above. Ledger row 06 names master. `feat/04-archive-at-top` fast-forwarded to `d7f492f`.
  Correction handoff `handoffs/16-to-plan-04.md` (TEST only, no MAKE expected), return pre-assigned
  to `17-to-master-04.md`.

**2026-09-02 (master, cycle 07 validation):** correction cycle clean. TEST rewrote row 10 exactly as
handoff 16 planned and it was green on the base; no MAKE commit; READ gate 160/160, `tsc -b`, plus
the planned scrollTo-guard refactor. Branch rebased onto `main` (post PR #10, stale ledger commits
dropped): 168 tests, `tsc -b` green. Browser on the rebased branch, seed 2 Open + 1 Done: `<main>`
children are `P` (Archive) then `UL` at 390px and 1200px (grid on the wall); Card heights 69/69
phone and 59/59 wall, identical to the base; with 14 Open and `scrollTop` 120, opening resets to 0
and the Done row is visible under the link; 0 Open/0 Done renders an empty region; 0 Open/1 Done
renders only the link; completing the last Open Task leaves one child with the toast `position:
fixed` outside `main`. Observation for a later ticket: the top-right undo toast covers the Archive
link while it is shown. PR #12 from `feat/04-archive-at-top`. Tickets 05 and 06 unblock at merge;
ticket 03 needs 04 in `main` and a rebase before handoff 13 launches.
