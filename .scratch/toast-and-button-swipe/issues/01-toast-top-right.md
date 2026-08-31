# 01: Notification layer moves to the top-right corner, compact

**Status:** ready-for-agent
**Blocked by:** None (independent of 02).
**Spec:** `.scratch/toast-and-button-swipe/spec.md` (Feature 1)

**What to build:** The fixed notification layer in `src/App.tsx` (undo toast + save-error
banner) stops filling a centred 596px column and becomes a compact right-aligned stack
in the top-right corner of the viewport. Presentation only — every toast semantic is
frozen (see spec "Frozen semantics"; original contract in
`.scratch/polish-and-publish/issues/01-toast-overlay.md`).

## Changes

- `src/App.tsx`: layer keeps `position: fixed; top: 0; left: 0; right: 0;
  pointerEvents: "none"` and the safe-area padding
  `"max(12px, env(safe-area-inset-top)) 12px 0"`, but aligns children with
  `alignItems: "flex-end"`. The inner `maxWidth: 596` column wrapper is removed; its
  stacking job (`display: flex; flexDirection: column; gap: 8`) moves onto the layer
  itself. Toast and error banner each get
  `maxWidth: "min(360px, calc(100vw - 24px))"`.
- `src/components/UndoToast.tsx`: drop `width: "100%"`. Everything else (padding,
  radius, colors, font, `pointerEvents: "auto"`, roles, WINDOW_MS, mount-bound timer)
  stays byte-identical.

## Matriz de Casos de Teste

File: `src/App.test.tsx`, extend `describe("the notification layer")`. Profile:
`stubNoMatchMedia()` (default in that file). Reuse the existing `nearestFixedAncestor`
helper and the existing setup that produces a pending toast (complete/delete a task).
Allowed mocks: `vi.mock("./sync")` per-file (as the file already does), fake timers
(`vi.useFakeTimers`). Nothing else may be mocked.

| # | Input (exact)                                                                 | Expected output (exact)                                                                                                    |
|---|--------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------|
| T1 | Delete a task so the toast mounts; walk to `nearestFixedAncestor(toast)`      | Layer style: `position: fixed`, `top: 0px`, `left: 0px`, `right: 0px`, `align-items: flex-end`, `pointer-events: none`      |
| T2 | Same mount; inspect the toast element (`[role="status"]`)                     | `style.width` is `""` (no `width: 100%`); `style.maxWidth === "min(360px, calc(100vw - 24px))"`; `pointer-events: auto`     |
| T3 | Same mount; walk every ancestor from toast up to the fixed layer              | No ancestor carries `max-width: 596px` (the 596 column wrapper is gone)                                                     |
| T4 | Force a save error (sync mock rejects/store refuses, as the file already does) while a toast is pending | Both `[role="status"]` and `[role="alert"]` are children of the same fixed layer; banner has the same `maxWidth` cap        |
| T5 | Existing frozen assertions (list pixel-stability via `main.innerHTML`, 5s expiry with fake timers, remount-per-action via token, undo restore) | All keep passing unchanged — do not rewrite them, only re-run                                                                |

Error cases: none new (no behavioural change). If T5 requires touching an existing
assertion, that is a spec violation — stop and report instead of adapting the test.

## Done when

- [ ] T1–T4 written first and red against current `main`-equivalent code
- [ ] Implementation makes them green without editing any pre-existing test
- [ ] `npm test` whole suite green, `npx tsc -b` clean
