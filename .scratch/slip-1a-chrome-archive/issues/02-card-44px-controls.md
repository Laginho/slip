# 02: 44×44 px hit targets on the Card's controls

**What to build:** On the phone, the Concluir / Editar / Apagar controls of a Card can be
hit without aiming: each has at least a 44×44 px target. Visually nothing changes: same
glyph, same font size, same opacity, same order, same Card height and row layout. A
resting Card's controls stay invisible *and* untouchable; focus and hover reveal them
exactly as today.

**Blocked by:** None (can start immediately).

**Status:** complete

- [x] Each of the three controls declares `minWidth` and `minHeight` of 44px with the glyph centred
- [x] Glyph text, font size (18px) and line height are unchanged
- [x] Compensating negative margins keep the controls' row in the same visual footprint; the Card's own padding is unchanged
- [x] Resting state still `opacity: 0` and `pointerEvents: "none"`; focus-within and hover (where `(hover: hover)`) still flip both back
- [x] Holds for both the phone bubble layout and the desktop wall layout
- [x] Existing Card suite green (keyboard actions, edit lifecycle, swipe spring-back)

## Test Case Matrix

Seam: Card rendered through the shared test scaffolding (prior art: the Card keyboard
controls block). Allowed mocks: `matchMedia` stubs (no-match profile and desktop
profile), fixed clock via a `now` prop.

| # | Profile | Action | Expected |
|---|---|---|---|
| 1 | no-match (touch) | render a Card | each of Concluir, Editar, Apagar has inline `minWidth === "44px"` and `minHeight === "44px"` |
| 2 | desktop | render a Card | same as 1 (targets are not gated on pointer) |
| 3 | either | render | each control's `fontSize` is `18px` and its text content is the same glyph as before |
| 4 | either | render, no focus | each control `opacity === "0"` and `pointerEvents === "none"` |
| 5 | either | focus Concluir | all three controls `pointerEvents === "auto"`, opacity non-zero |
| 6 | either | blur | back to `none` / `0` |
| 7 | either | focus Concluir then activate via keyboard | `onComplete` called once with the Task id (behaviour unchanged) |
| 8 | no-match | swipe left from the Card's trailing edge starting over a resting control | swipe proceeds (the control did not capture the pointer); `onDelete` called once |

Error cases: none new. Do not assert on pixel geometry (jsdom has no layout); assert on
the declared inline styles.

## Comments

- 2026-09-02 (master): cycle 02 (`traycer/slip-1a-card-44px`) returned as clean by PLAN/READ,
  rejected on hands-on validation. The 44px boxes were compensated only vertically and the row
  gaps were changed, so on the desktop wall the text column shrank from 209px to 80px and Cards
  grew taller; the phone bubble was unaffected. Ledger row 02 names MAKE and READ. Correction
  handoff `handoffs/09-to-plan.md` (base `traycer/slip-1a-card-44px`): horizontal negative
  margin `-12px`, gaps restored, matrix rows 9–11 assert margin and gaps. Status stays
  `ready-for-agent` until that cycle validates.

**2026-09-02 (master, cycle 05 validation):** correction cycle clean. `margin: "-13px -12px"`,
gaps back to `main`'s values. Browser measure against `main` at the same viewport, identical
seed: wall Card heights 194/86/248 on both, text column 113→108 and 158→154 (tolerance 12);
bubble Card heights 144/90/177 on both, actions row 68→64. Controls 44×44, 20×18 in flow,
later sibling wins the horizontal overlap as the spec accepts. 161 tests, `tsc -b` green
after rebase onto `main` (post PR #10). PR #11 from `feat/02-card-44px-controls`.
