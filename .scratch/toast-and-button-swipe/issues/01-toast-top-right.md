# 01: Notification layer moves to the top-right corner, compact

**Status:** complete
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

- [x] T1–T4 written first and red against current `main`-equivalent code
- [x] Implementation makes them green without editing any pre-existing test
- [x] `npm test` whole suite green, `npx tsc -b` clean

## Comments

### PTMR cycle 01 — blocked

TEST introduced T1–T4 and correctly demonstrated the red presentation changes.
MAKE implemented the planned production diff, making `src/App.test.tsx` pass 20/20.
The full `npx tsc -b` gate remains blocked by TEST's T4: the alert query infers
`Element`, then accesses `.style` (`TS2339`). MAKE's second attempt confirmed that
no production-only correction can honestly fix a test type error. The master dev must
issue a correction handoff through PLAN; READ did not run.

### Master dev triage of cycle 01

Validated on the branch. Two defects, one of them not in the return report:

1. **TEST**: T4's `container.querySelector('[role="alert"]')!` lacks `<HTMLElement>`,
   so `.style` fails `tsc -b` (TS2339). Confirmed in `ad72dc3`. One-line fix.
2. **PLAN**: the cycle ran on `traycer/mighty-dolphin`, whose base (`8e8562b`) predates
   the useSession extraction (`47d9111`) and the spec commit (`5eebe2f`), and which
   carries the foreign red commit `0e8a5ad` (session-seam tests without their hook).
   Every "unrelated" failure MAKE reported is this stale base: on the declared base
   branch the suite is 136/136 and `tsc -b` is clean (verified). The return handoff
   misattributed this to "a separate missing-useSession ticket".
   *Attribution amended after triage:* the stale branch came from the launch context
   (the user relayed into an existing Traycer task, so branch selection was not
   PLAN's choice). PLAN's culpability is narrower: it drove a full cycle on a
   visibly dirty base and reported around it instead of stopping and handing back.

MAKE's production diff matches the plan and is approved in content, but was written
against the pre-useSession `App.tsx` and must be re-landed on the correct base.
Verdict recorded in `ledger.md` (cycle 01, correction). Correction handoff:
`handoffs/03-to-plan.md`.
