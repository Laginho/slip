# 06: Ctrl+H toggles the Archive

**What to build:** On any keyboard, `Ctrl+H` opens the Archive (scrolling the list to
the top so it is in view) and `Ctrl+H` again closes it. It works while the capture bar
has focus, so the user never has to click away from it. It is ignored while a Card's
edit field has focus, so an edit in progress is never disturbed. The shortcut shares the
Archive state with the link, so link and shortcut never disagree.

**Blocked by:** 04 (Archive state on the screen root).

**Status:** complete

- [x] A window-level keydown listener owned by the screen root handles `Ctrl+H` (`ctrlKey && key === "h"`, case-insensitive), calls `preventDefault`, and toggles the Archive
- [x] Opening via the shortcut sets the region's `scrollTop` to 0; closing restores the hidden-link position (from ticket 05 when present; otherwise no-op)
- [x] Ignored when the event target is a Card's edit field
- [x] Not ignored when the capture bar's text input has focus
- [x] Ignored when there is no Archive to show (zero Done Tasks)
- [x] Registered regardless of pointer profile; removed on unmount
- [x] Plain `H`, `Alt+H`, `Meta+H` and `Ctrl+Shift+H` do nothing

## Test Case Matrix

Seam: App rendered through the shared scaffolding, dispatching real `KeyboardEvent`s on
`window` (and on focused elements, so they bubble). Allowed mocks: `matchMedia` stubs,
`localStorage` seed, fixed clock.

| # | Setup | Action | Expected |
|---|---|---|---|
| 1 | 2 Open, 1 Done, Archive closed | `keydown` Ctrl+H on window | Archive open ("ocultar concluídas" visible, Done row visible); `scrollTop === 0`; event `defaultPrevented` |
| 2 | same, open | Ctrl+H | Archive closed |
| 3 | same | Ctrl+Shift+H | nothing changes |
| 4 | same | Ctrl+h (lowercase key) | toggles (case-insensitive) |
| 5 | same | plain `h`, Alt+H, Meta+H | nothing changes, not default-prevented |
| 6 | same, capture bar input focused | Ctrl+H dispatched on the input | Archive toggles; input text untouched |
| 7 | same, a Card in edit mode with its edit field focused | Ctrl+H dispatched on the edit field | Archive unchanged; edit mode still active with the draft intact |
| 8 | 2 Open, 0 Done | Ctrl+H | nothing rendered, no error |
| 9 | desktop stub | Ctrl+H | toggles (same as case 1) |
| 10 | render then unmount | Ctrl+H on window | no state update warning, no throw (listener removed) |
| 11 | open via link, then Ctrl+H | — | closes (one shared state) |

Error cases: none new.
