# 01: Line breaks survive: store normalisation, Card rendering, textarea editor

**What to build:** A Task typed or pasted over several lines keeps its line breaks all the
way through. The store normalises text on create and on edit (trim both ends, collapse three
or more consecutive breaks into two, `\r\n` treated as a break); a blank result is still not
a Task. The Card renders the breaks on both profiles. The in-place editor becomes a textarea:
under a fine primary pointer Enter saves and Shift+Enter inserts a break; under a coarse
pointer Enter inserts a break and blur saves; Escape cancels in both. The Ctrl+H guard from
Leva 1a keeps ignoring the shortcut while the editor has focus, now that the editor is a
textarea. Prefactor first: the live `matchMedia` subscription the screen root already writes
twice (breakpoint, colour scheme) becomes one small hook, reused by the root, by the Card here
and by the pill in ticket 02.

Context: `.scratch/slip-1b-capture-pill/spec.md` (Implementation Decisions → Text
normalisation lives in the store; Enter rules from the primary pointer; Card: line breaks
and the editor).

**Blocked by:** None (can start immediately).

**Status:** complete

- [x] `create` and `editText` normalise identically; the Task model, ingress validation and sync are untouched
- [x] Card text renders with `white-space: pre-line` on both profiles
- [x] The editor is a textarea holding the full text; Enter rules follow `(pointer: fine)` live; blur commits; Escape cancels and restores
- [x] Ctrl+H is ignored when the event target is the editor textarea inside an `li`, still honoured from the capture bar
- [x] The media-query hook replaces the two hand-written subscriptions in the screen root with no behaviour change (existing dark-chrome and breakpoint suites stay green)
- [x] Both pointer profiles, both colour schemes; whole suite green; `tsc -b` clean

## Test Case Matrix

Seams: store pure functions (`store.test.ts` prior art: "mutations"); Card rendered through
the shared scaffolding (`Card.test.tsx` prior art: "the edit lifecycle"); App rendered
through the scaffolding for the Ctrl+H guard (`App.test.tsx` prior art: "row 6 — Ctrl+H on
capture input"). Allowed mocks: `matchMedia` stubs extended with `(pointer: fine)` in both
breakpoints, `localStorage`, fixed clock. jsdom has no layout: assert values, attributes
and declared styles.

### Store

| # | Function | Input text | Expected stored text |
|---|---|---|---|
| 1 | create | `"a\nb"` | `"a\nb"` |
| 2 | create | `"a\n\nb"` | `"a\n\nb"` (double kept) |
| 3 | create | `"a\n\n\n\nb"` | `"a\n\nb"` |
| 4 | create | `"\n\n a \n\n"` | `"a"` |
| 5 | create | `"a\r\nb\r\n\r\n\r\nc"` | `"a\nb\n\nc"` |
| 6 | create | `"\n \n"` | no Task created (list unchanged) |
| 7 | editText | `"x\n\n\n\ny"` on an existing Task | `"x\n\ny"`, `updatedAt` bumped |
| 8 | editText | `"  \n "` | text unchanged (keep-what-was-there, no write) |

### Card editor (wall and bubble, both rows unless stated)

| # | Setup | Action | Expected |
|---|---|---|---|
| 9 | Task `"a\nb"`, resting | render | text node contains `"a\nb"`; span style `whiteSpace === "pre-line"` (both profiles) |
| 10 | same | click Editar | editor is a `TEXTAREA` with value `"a\nb"`, focused |
| 11 | fine stub, editing, value `"a\nb\nc"` | keydown Enter | `onEdit(task, "a\nb\nc")` called once; editor closed; Enter `defaultPrevented` |
| 12 | fine stub, editing | keydown Shift+Enter | `onEdit` not called; editor still open; event not `defaultPrevented` (browser inserts the break) |
| 13 | coarse stub, editing | keydown Enter | `onEdit` not called; editor open; not `defaultPrevented` |
| 14 | coarse stub, editing, value changed | blur | `onEdit` called once with the draft; editor closed |
| 15 | either, editing, value changed | keydown Escape | `onEdit` not called; editor closed; Card shows the original text |
| 16 | either, editing, `onEdit` returns false | Enter (fine) or blur (coarse) | editor stays open with the draft intact |
| 17 | change-listener stub, fine → coarse while editing | dispatch `change`, then Enter | not `defaultPrevented`, `onEdit` not called (rule followed the pointer live) |
| 18 | Task with 8-line text, wall | click Editar | textarea value is the full text (nothing clamped in the editor) |

### Ctrl+H guard (App)

| # | Setup | Action | Expected |
|---|---|---|---|
| 19 | desktop stub, 1 Open, 1 Done, Card in edit | Ctrl+H on the editor textarea | Archive unchanged, not `defaultPrevented`, draft intact |
| 20 | same, capture bar focused | Ctrl+H on the capture field | Archive toggles, `defaultPrevented` (unchanged from Leva 1a) |

### Prefactor

| # | Setup | Expected |
|---|---|---|
| 21 | existing "dark chrome" rows 1–9 and "visual promoção 04" rows | all green unchanged after the hook replaces the two subscriptions |

Error cases: `matchMedia` absent (`stubNoMatchMedia`) must not throw; the hook returns
`false` and the editor behaves as coarse.

## Comments

- 2026-09-04 (master): cycle 01 — clean. TEST `fe82c13` (big pickle), MAKE `bf39a00` (muse
  spark 1.3 free), READ `e48e04d` (mimo v2.5 free), master nit `16d8046` (`Role: MASTER`:
  the hook's stub-shaped `addEventListener` guard dropped, two Card stubs moved to
  `stubMediaWithChangeListener`). Suite 245/245, `tsc -b` clean. Browser validation recorded
  in PR #20's description. Merged as PR #20 (`824743a`). Ledger: `../ledger.md`, cycle 01.
