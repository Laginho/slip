# Toast & Button-Swipe UX — Spec

Two independent UX fixes, grilled and confirmed with the user on 2026-08-31.
Read `/CONTEXT.md` for vocabulary. Both features are presentation/gesture-layer only:
**no store, sync, or session semantics change.**

Product constraints in force: touch and desktop are first-class together from day 1 —
every behaviour below must hold under both pointer profiles, and the test matrices
must cover both (`stubMatchMedia` profiles in `src/testing.tsx`).

---

## Feature 1 — Compact notification layer, top-right

### Problem

The undo toast fills the 596px notification column centred at the top of the window
(`App.tsx:116-137`, `UndoToast.tsx:56` `width: "100%"`). For its 5-second life it
covers — and blocks clicks on — the first row of Cards.

### Target behaviour

- The **whole notification layer** (undo toast *and* save-error banner — one layer,
  they keep stacking with `gap: 8`) moves to the **top-right corner of the viewport**.
- Each notification shrinks to its content (`width: fit-content` equivalent via
  flex alignment), with a sensible cap (`maxWidth: min(360px, calc(100vw - 24px))`)
  so long labels wrap instead of growing back into the content.
- Alignment: children align to the right edge of the layer (`alignItems: "flex-end"`),
  layer keeps `position: fixed; top: 0; left: 0; right: 0` and its safe-area-aware
  padding (`max(12px, env(safe-area-inset-top)) 12px 0`). On a narrow phone the toast
  hugs the right edge with the 12px margin — still compact.
- The inner 596px column wrapper (`App.tsx:129-137`) disappears or stops constraining;
  its only remaining job (stacking + gap) moves to the layer itself.

### Frozen semantics (MUST NOT change — already tested and documented in
`.scratch/polish-and-publish/issues/01-toast-overlay.md`)

- Action is applied and persisted **before** the toast renders; undo = restore of the
  parent-held snapshot.
- 5000ms window bound to mount; parent remounts per action via `key={pending.token}`.
- A second action replaces the pending toast, applying the first.
- Layer is `pointer-events: none`; each visible child re-enables its own clicks.
- Appearing/expiring never lays out the list (`main.innerHTML` stays byte-identical —
  existing assertion in `App.test.tsx` "the notification layer" must keep passing).
- `role="status" aria-live="polite"` on the toast; `role="alert"` on the error banner.
- No new behaviour: no close button, no hover-pause, no progress bar.

### Files

- `src/App.tsx` (layer + column wrapper styles only)
- `src/components/UndoToast.tsx` (drop `width: "100%"`; keep everything else)
- `src/App.test.tsx` (extend "the notification layer" describe block)

---

## Feature 2 — Swipe starts over the action buttons

### Problem

The Card's gestures live on the `<li>` (`Card.tsx:344-353`). The three action buttons
(✓ Concluir / ✎ Editar / × Apagar) swallow `pointerdown` via `stopPropagation`
(`Card.tsx:294-297`), so when they are revealed (hover on a fine pointer, or
focus-within) a horizontal swipe that happens to start on a button dies. The user
expects the swipe to work from anywhere on the Card.

### Target behaviour — the one rule

A `pointerdown` that starts **on a visible action button** arms **only the swipe**.
All other Card gestures are disarmed for that pointer:

| Interaction starting on a button            | Result                                          |
| ------------------------------------------- | ----------------------------------------------- |
| release without crossing slop (10px)        | button's own click — nothing else               |
| hold ≥ 500ms, release without crossing slop | button's own click — long-press edit does NOT fire |
| move past slop, dx ≥ +72 at release         | swipe-complete (exit right); button click cancelled |
| move past slop, dx ≤ −72 at release         | swipe-delete (exit left); button click cancelled — even if the press started on ✓ (movement wins over origin pixel) |
| move past slop, |dx| < 72 at release        | spring back; button click cancelled             |
| two quick button clicks                     | two button clicks — the Card's double-tap-complete must NOT also fire |
| release on a button after a sub-slop press  | no `pendingTap` scheduled — the single-tap-edit (fine pointer, 250ms) must NOT fire afterwards |

Gestures starting on the Card body are untouched: tap-edit (fine pointer),
double-tap-complete, long-press-edit, both swipes, spring-back — all exactly as today.
Keyboard activation (Tab to button, Enter/Space) is untouched. Hidden buttons
(`pointerEvents: "none"` when not revealed) are untouched — presses fall through to
the `<li>` as today.

### Implementation shape (for the handoff plan; MAKE decides details)

- Replace `swallowPointerDown` (stopPropagation) with origin tagging: the `<li>`'s
  `onPointerDown` records `fromButton` when `event.target` is one of the action
  buttons (e.g. `closest("button")` scoped to the actions).
- When `fromButton`: do **not** `setPointerCapture` at press (capture retargets the
  `pointerup` to the `<li>` and would kill the button's native click) and do **not**
  arm the long-press timer. Capture the pointer only at the moment the gesture
  crosses slop — from then on the browser suppresses the button click natively;
  a `dragged` flag consulted by the buttons' `onClick` is the belt-and-suspenders.
- When `fromButton`, `onPointerUp` skips the tap/double-tap block entirely
  (no `pendingTap`, no `onComplete` second-tap path).
- Buttons keep `event.stopPropagation()` in their `onClick` handlers.

### Not test-first candidates

The pointer-capture timing itself (jsdom has no real `setPointerCapture`/click
synthesis — the code already try/catches capture). Behavioural outcomes above ARE
test-first: tests dispatch the pointer/click sequences explicitly via `src/testing.tsx`
helpers, as `Card.test.tsx` already does.

### Files

- `src/components/Card.tsx`
- `src/Card.test.tsx`

---

## Out of scope (registered, not in this batch)

- **Enlarge action-button hit targets to ~44px** (currently ~18-22px glyphs) without
  changing the visual. Registered as backlog: `.scratch/toast-and-button-swipe/issues/`
  gets no ticket for it; it belongs to a future batch.
- Any toast behaviour change (dismiss, pause, progress).
- Touch-target or layout changes to the Card.

## Gates

`npm test` (vitest), `npx tsc -b`. No lint step exists. Whole suite must stay green —
especially `App.test.tsx` (notification layer), `Card.test.tsx` (keyboard actions,
edit lifecycle, failed-write spring-back).
