# 02: A swipe may start on a revealed action button

**Status:** complete
**Blocked by:** None (independent of 01).
**Spec:** `.scratch/toast-and-button-swipe/spec.md` (Feature 2)

**What to build:** In `src/components/Card.tsx`, a `pointerdown` that starts on a
revealed action button (✓ Concluir / ✎ Editar / × Apagar) arms **only the swipe**:
release without crossing the 10px slop = the button's own click and nothing else
(even after holding ≥500ms); crossing the slop = the Card's normal swipe with the
button click cancelled, regardless of which button the press started on. The Card's
tap-edit / double-tap-complete / long-press-edit never fire from a button-origin
pointer. Gestures starting on the Card body, keyboard activation, and hidden-button
fall-through are byte-identical to today.

## Implementation shape (MAKE decides details, within these constraints)

- Replace `swallowPointerDown` (`stopPropagation` on `pointerdown`) with origin
  tagging in the `<li>`'s `onPointerDown`: detect `event.target` inside an action
  button and record `fromButton` on `origin`.
- `fromButton` presses: no `setPointerCapture` at press and no long-press timer;
  capture only when the gesture crosses slop (wrapped in the existing try/catch
  pattern — jsdom has neither). A `dragged` check in each button's `onClick`
  suppresses the click after a swipe (belt-and-suspenders to native suppression).
- `fromButton` releases skip the tap/double-tap block in `onPointerUp` entirely.
- Buttons keep `event.stopPropagation()` inside `onClick`.

## Matriz de Casos de Teste

File: `src/Card.test.tsx`. Reuse the file's `renderCard` helper, the
`fire = (type, x) => new MouseEvent(type, { bubbles: true, clientX: x, clientY: 0 })`
pattern, `dispatch`, `activate`, `queryLabel`, and fake timers. Buttons are revealed
via focus (`activate`/`element.focus()`), which works under the default
`stubNoMatchMedia()`. For M9 only, stub a fine-pointer profile: a local
`vi.stubGlobal("matchMedia", ...)` where `(hover: hover)` and `(pointer: fine)` match.
Allowed mocks: fake timers, matchMedia stubs, `vi.fn()` for the `onComplete`/
`onDelete`/`onEdit` props. Card internals, store and sync must not be mocked.

Events dispatch on the **button element** (they bubble to the `<li>`); `click` is
dispatched explicitly since jsdom does not synthesise it from pointer sequences.

| # | Input (exact sequence)                                                                                       | Expected output (exact)                                                                                                            |
|---|---------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|
| M1 | Focus ✓; `pointerdown@x=0` on ✓, `pointerup@x=0` on ✓, `click` on ✓; advance timers 300ms                      | `onComplete` called exactly once; no edit input rendered (no `pendingTap` single-tap edit)                                            |
| M2 | Focus ✓; `pointerdown@0` on ✓; advance timers 600ms; `pointerup@0`, `click`                                     | No edit input at 600ms (long-press disarmed); `onComplete` called exactly once                                                        |
| M3 | Focus ✓; `pointerdown@0` on ✓, `pointermove@100`, `pointerup@100`; then `transitionend(transform)` on the `<li>`; then `click` on ✓ | `li.style.transform === "translateX(110%)"` before transitionend; after it `onComplete` called exactly once; the trailing `click` adds nothing (still exactly once) |
| M4 | Focus ✓; `pointerdown@100` on ✓, `pointermove@10`, `pointerup@10`; `transitionend`; `click` on ✓                | `translateX(-110%)`; `onDelete` called exactly once; `onComplete` never called (movement wins over origin)                            |
| M5 | Focus ×; `pointerdown@0` on ×, `pointermove@5`, `pointerup@5`, `click` on ×; advance 300ms                      | `onDelete` exactly once (sub-slop = click); no edit input; card back at rest (no lingering drag transform)                            |
| M6 | Focus ✓; two full press+release+click cycles on ✓ within 200ms (fake timers)                                    | `onComplete` called exactly twice — the double-tap path must NOT add a third call                                                     |
| M7 | `pointerdown@0` on the `<li>` body (not a button); advance 500ms                                                | Edit input rendered (body long-press still edits) — body gestures untouched                                                          |
| M8 | Focus ✎; `pointerdown@0` on ✎, `pointermove@40`, `pointerup@40`; then `click` on ✎                              | Spring back (`transform: translateX(0)` with transition), `onEdit`/`beginEdit` NOT triggered by the click (dragged suppresses it), no action fires |
| M9 | Fine-pointer stub; `mouseenter` on `<li>` (reveals buttons); `pointerdown@0` on ✓, `pointerup@0`, `click`; separately `pointerdown@0`+`pointerup@0` on the body then advance 250ms | Button path: `onComplete` once, no edit. Body path: edit input rendered after 250ms (fine-pointer tap-edit intact)                    |
| M10 | `onComplete` prop returns `false`; M3's sequence                                                               | After `transitionend`, card springs back (`translateX(0)`), matching the existing failed-write behaviour                              |

Existing suites in the file (`keyboard-accessible actions`, `the edit lifecycle`,
`a swipe flight whose write fails`) must keep passing without edits.

## Not test-first

The `setPointerCapture` timing itself (press vs slop-crossing) — jsdom cannot observe
it. Everything in the matrix above is test-first.

## Done when

- [ ] M1–M10 written first; the ones expressing new behaviour are red against current code
- [ ] Implementation green without editing any pre-existing test
- [ ] `npm test` whole suite green, `npx tsc -b` clean
