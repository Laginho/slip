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

**Status:** ready-for-agent

- [ ] Archive section is the first child of the scrolling region; the Open list follows
- [ ] Open/closed state is held by the screen root and passed down with a toggle callback; the link still toggles it
- [ ] Opening the Archive sets the scrolling region's `scrollTop` to 0
- [ ] Empty Open list renders no sections and no copy
- [ ] With zero Done Tasks the Archive renders nothing
- [ ] Archive window logic, "ver mais antigas" and row styling unchanged
- [ ] Notification layer unchanged
- [ ] Existing App and Archive-related tests green (update only those asserting the old position)

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
| 10 | 1 Open, 1 Done | complete the Open Task | undo toast appears in the fixed layer; region children count and order unaffected by the toast |

Error cases: none new.
