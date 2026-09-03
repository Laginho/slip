# 03: Dark chrome that follows the system colour scheme

**What to build:** When the system is in dark mode, the app's chrome darkens: the paper
surface, the capture bar ground, primary and quiet text, hairlines and the toast. It
switches live when the system does. The Cards keep their exact nine swatches, both inks
and the Overdue red ("post-its on a dark wall"). There is no toggle and no settings
screen. The palette module stays the only place with a hex literal, and the installed
window frame follows the page colour in both schemes.

**Blocked by:** None (can start immediately).

**Status:** complete

- [ ] Chrome tokens (surface, capture ground, primary text, quiet text, hairline, toast ground, toast ink) exist as a light set and a dark set in the palette; Card swatches, inks and Overdue red remain single frozen values
- [ ] Dark values meet the spec constraints: warm near-black surface; primary and quiet text ≥ 4.5:1 on it; hairline visible; toast inverted (ivory ground, charcoal ink). Values documented in the palette with the same commentary discipline
- [ ] The screen root reads `(prefers-color-scheme: dark)` once, subscribes to changes, and sets one CSS custom property per chrome token on its root element
- [ ] Every component that used a chrome constant reads the corresponding `var(--…)` instead; Card colours still come straight from the palette
- [ ] index.html has a second `theme-color` meta with `media="(prefers-color-scheme: dark)"`, its value injected at build time from the dark surface token; manifest keeps the light values
- [ ] No hex literal outside the palette module (guarded by a test)
- [ ] PRODUCT.md and DESIGN.md amended: "no dark mode" becomes "no theme toggle; chrome follows the system scheme; Card swatches never vary". The nine-swatch freeze wording is untouched
- [ ] `npm test` and `npx tsc -b` green

## Test Case Matrix

Seams: (A) App rendered through the shared scaffolding; (B) repository file assertions.
Allowed mocks: `matchMedia` (add a stub profile where only `(prefers-color-scheme: dark)`
matches, and one where it matches together with `(min-width: 900px)`), `localStorage`
seeded with Tasks, fixed clock.

| # | Seam | Setup | Expected |
|---|---|---|---|
| 1 | A | light stub, one Open Task per Kind | root element custom properties equal the light chrome values from the palette; Card backgrounds equal the light-step swatches |
| 2 | A | dark stub, same Tasks | root custom properties equal the dark chrome values; Card backgrounds are byte-identical to case 1 |
| 3 | A | dark stub, one Overdue Task | Overdue label colour is still `OVERDUE_RED`; Card ink still `INK_ON_DARK` |
| 4 | A | dark stub | capture bar ground and hairline read `var(--…)` (inline style contains the variable reference, not a hex) |
| 5 | A | dark stub, trigger a delete | undo toast ground/ink read the toast variables; the fixed notification layer is otherwise unchanged (position fixed, pointer-events none) |
| 6 | A | dark stub + desktop stub | wall layout still applies (grid) and dark tokens applied — scheme and breakpoint are independent |
| 7 | A | stub whose `addEventListener` captures the change listener; fire `change` with `matches: true` | root custom properties flip to the dark set without remount |
| 8 | B | read index.html | two `theme-color` metas; the second has `media="(prefers-color-scheme: dark)"` and a placeholder the build plugin replaces |
| 9 | B | read vite config | the plugin replaces both placeholders from the palette (light surface, dark surface) |
| 10 | B | scan every file under `src/` except the palette module | no `#[0-9a-fA-F]{3,8}` colour literal |
| 11 | B | read PRODUCT.md and DESIGN.md | no line still asserts "no dark mode"; a line records that chrome follows the system scheme |

Error cases: `matchMedia` missing (the no-match stub) must render the light set, never
throw.
