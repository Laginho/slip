# 05: "ver concluídas" hidden above the list, revealed by pulling down

**What to build:** At rest the list shows only Open Cards. Pulling the list down (scrolling
to its very top) reveals the "ver concluídas" link, like WhatsApp's archived chats. This
works even with two Cards, because the scrolling region is always scrollable by at least
the link row's height whenever the link exists. Tapping opens the Archive (nothing opens
automatically on reveal); closing it hides the link again. Reaching the top can never
trigger Chrome's pull-to-refresh. When no Task has ever been Done there is no link and no
reserved space.

**Blocked by:** 04 (Archive at the top).

**Status:** complete

- [x] When an Archive link exists, the scrolling region's content declares a minimum height of the region's height plus the link row, so the region always scrolls
- [x] On mount the region's `scrollTop` equals the link row's height (link just out of view)
- [x] When the Archive closes, `scrollTop` returns to the link row's height
- [x] Scrolling to `scrollTop` 0 shows the link; the Archive stays closed until the link is activated
- [x] The scrolling region declares `overscroll-behavior: contain`
- [x] With zero Done Tasks: no link, no extra minimum height, `scrollTop` untouched
- [x] Both pointer profiles; the desktop layout is unaffected beyond the same harmless mechanics

## Test Case Matrix

Seam: App rendered through the shared scaffolding. jsdom has no layout, so the link
row's height must come from a declared, testable source (a fixed row height constant
applied as inline style) rather than from measurement; assert on declared styles and on
`scrollTop` values the component sets. Allowed mocks: `matchMedia` stubs, `localStorage`
seed, fixed clock, `Element.prototype.scrollTo`/`scrollTop` spies where jsdom needs them.

| # | Setup | Action | Expected |
|---|---|---|---|
| 1 | 2 Open, 1 Done | render | region style `overscrollBehavior === "contain"`; content wrapper declares `minHeight` of the form `calc(100% + <rowHeight>px)` (or equivalent) |
| 2 | same | render | region `scrollTop` was set to the row height on mount (spy or read-back) |
| 3 | same | set `scrollTop` to 0, dispatch `scroll` | link visible (it was always in the DOM); Archive still closed: no Done rows |
| 4 | same, scrolled to 0 | click "ver concluídas" | Archive open, `scrollTop === 0` |
| 5 | same, open | click "ocultar concluídas" | Archive closed; `scrollTop` set back to the row height |
| 6 | 2 Open, 0 Done | render | no link; content wrapper has no extra `minHeight`; `scrollTop` never set |
| 7 | 0 Open, 1 Done | render | link present and hidden by the same mechanics (region still scrollable) |
| 8 | desktop stub, 2 Open, 1 Done | render | same declarations as case 1 (mechanics are profile-independent) |
| 9 | 1 Open, 1 Done | complete the Open Task, undo | `scrollTop` unchanged by the toast lifecycle |

Error cases: `scrollTo` missing on the element (older jsdom) must not throw — fall back
to assigning `scrollTop`.
