# 04: The square post-it Card on the desktop wall

**What to build:** On the desktop wall every Card is a square post-it and the wall holds
four per row on the user's 1200px window, three on narrower desktop windows, never five.
The wall grid uses `repeat(3, minmax(260px, 300px))` below a 1168px viewport and
`repeat(4, minmax(260px, 300px))` from 1168px, centred, with the list
element capped at 1248px wide and centred; the 900px breakpoint and the phone column are
unchanged. Each wall Card is an inline-size container with `aspect-ratio: 1`, hidden
overflow, 10px radius, laid out as a column: the text region on top, a footer row at the
bottom. Text scales with the square (`6.67cqw`, 16px on a 276px Card), line-height 1.3,
`pre-line`, clamped to eight lines with an ellipsis; the Overdue label stays inline with the
text. The footer carries the Deadline `dd/mm` at `5.8cqw`, tabular numerals, 0.75 opacity.
The ✓ ✎ × controls move to the top-right corner, absolutely positioned, glyphs at `7.5cqw`,
keeping Leva 1a's 44×44 minimum targets, hover-or-focus reveal and resting
pointer-events none; while revealed, the text region reserves their width on its first lines.
The editor textarea from ticket 01 fills the text region and scrolls internally. The phone
bubble changes only by a six-line clamp (it already has `pre-line` from ticket 01). DESIGN.md
Layout and Cards sections and PRODUCT.md's wall sentence are amended.

Context: `.scratch/slip-1b-capture-pill/spec.md` (Implementation Decisions → Card: the
square wall; Docs). The decision was made on the V3 comparison page (Further Notes).

**Blocked by:** nothing — 01 (`pre-line` and the textarea editor) merged in PR #20. Independent of 02 and 03, both since merged.

**Status:** ready-for-agent

- [ ] Wall grid has three/four explicit `minmax(260px, 300px)` columns, `justifyContent: center`; list `maxWidth` 1248, centred; sections and their 24px margin unchanged
- [ ] Wall Card declares `containerType: inline-size`, `aspectRatio: "1 / 1"` (or `"1"`), `overflow: hidden`, radius 10, column layout with text region then footer
- [ ] Text `fontSize: 6.67cqw`, `lineHeight: 1.3`, `whiteSpace: pre-line`, `-webkit-line-clamp: 8` with `display: -webkit-box` and `WebkitBoxOrient: vertical`
- [ ] Footer Deadline `dd/mm` at `5.8cqw`, `tabular-nums`, opacity 0.75; absent when no Deadline; Overdue label inline with the text as today
- [ ] Controls top-right, `7.5cqw` glyphs, 44×44 minimum, reveal and pointer-events rules byte-identical to Leva 1a's tests
- [ ] Bubble Card: `-webkit-line-clamp: 6`, everything else unchanged (its Leva 1a rows stay green)
- [ ] Editor textarea fills the text region on the wall
- [ ] DESIGN.md and PRODUCT.md amended; no hex literal outside the palette module; whole suite green; `tsc -b` clean

## Test Case Matrix

Seams: Card rendered through the shared scaffolding (`Card.test.tsx` prior art: "visual —
promoção B/A Conversa (mobile) vs A/A Parede (desktop)", "44px hit targets", "keyboard-
accessible actions"); App rendered through the scaffolding for the grid (`App.test.tsx`
prior art: "App desktop (matchMedia true): TaskList grid wall"). Allowed mocks: `matchMedia`
stubs, fixed clock, `localStorage`. jsdom has no layout: assert declared inline styles;
cqw values are asserted as the declared strings. Colours: jsdom's cssstyle normalises an
inline `#rrggbb` to `rgb(r, g, b)`, so every colour read goes through `Card.test.tsx`'s
`rgb(hex)` helper — never compare `el.style.<colour>` to a palette constant directly (cycle 05
was lost to exactly that at row 3).

### Wall grid (App, desktop stub)

| # | Setup | Expected |
|---|---|---|
| 1 | 5 dated + 2 dateless Open, below/above 1168px desktop stubs and live changes | each section `UL` has `repeat(3, minmax(260px, 300px))` or `repeat(4, minmax(260px, 300px))`, `justifyContent === "center"`, `maxWidth === "1248px"`, horizontally centred margins; zero block margins except the dateless 24px top margin; zero padding |
| 2 | phone stub, same Tasks | list styles byte-identical to Leva 1a (column, no grid) |

### Wall Card (Card, desktop stub)

| # | Setup | Expected |
|---|---|---|
| 3 | any Task | `li` style: `containerType === "inline-size"`, `aspectRatio` `"1 / 1"` or `"1"`, `overflow === "hidden"`, `borderRadius === "10px"`, `background === rgb(CARD[kind][urgency])`, `color === rgb(<the right ink>)` |
| 4 | Task `"a\nb"` | text element: `fontSize === "6.67cqw"`, `lineHeight` 1.3, `whiteSpace === "pre-line"`, `WebkitLineClamp === "8"`, `display === "-webkit-box"`, `WebkitBoxOrient === "vertical"`, `overflow === "hidden"`; text content `"a\nb"` |
| 5 | Task with 12 lines | same declarations, full text retained, resting text `flexGrow === "0"` and `flexBasis === "auto"`; browser must show only eight lines with an ellipsis |
| 6 | Deadline set | footer immediately after the text with `formatDeadline` output, `fontSize === "5.8cqw"`, `fontVariantNumeric === "tabular-nums"`, `opacity` 0.75, `marginTop === "auto"`, `alignSelf === "flex-start"` |
| 7 | no Deadline | no footer text node |
| 8 | Overdue Task | `"N dias atrasado"` span inside the text element (inline), `color === rgb(OVERDUE_RED)`, `fontWeight` 700 |
| 9 | any | the three buttons are in a container with `position === "absolute"`, `top`/`right` declared; each button `minWidth`/`minHeight` 44, `fontSize === "7.5cqw"`, opacity 0 and `pointerEvents === "none"` at rest |
| 10 | hovered (`hover: hover` stub) | all three buttons opacity 0.7 (Leva 1a), `pointerEvents === "auto"`; text element declares a right padding reserving the controls' width |
| 11 | focus-within (Tab) | all three buttons reveal as row 10 without hover; blur restores opacity 0 and pointer-events none |
| 12 | Leva 1a "44px hit targets" and "keyboard-accessible actions" rows | all green unchanged |
| 13 | click Editar on a 12-line Task | textarea (ticket 01) with the full value; editor and text region `flexGrow === "1"`; no clamp while editing; `overflowY === "auto"` |

### Bubble Card (Card, phone stub)

| # | Setup | Expected |
|---|---|---|
| 14 | Task `"a\nb"` | text element `WebkitLineClamp === "6"`, `whiteSpace === "pre-line"`; `li` radius `"6px 16px 16px 16px"`, padding and `maxWidth` byte-identical to Leva 1a |
| 15 | Leva 1a bubble rows ("visual — promoção", swipe, 44px) | all green unchanged |

### Dark scheme

| # | Setup | Expected |
|---|---|---|
| 16 | dark desktop stub, nine Kind×Urgency Tasks | every `li` background and ink identical to the light run (Leva 1a "dark chrome" row 9 extended to the square) |

Error cases: `matchMedia` absent renders the phone bubble (existing fallback); a Task whose
text is a single very long word still declares the same clamp (word breaking is the
browser's; nothing to assert beyond the declarations).

Browser regression pass: verify three columns at 900/950px, four at 1200/1280px,
300px cap and no fifth column at 1600px, and live transitions across 1168px.
Inspect 12-line dated and dateless Cards for exactly eight visible lines and an
ellipsis; the footer stays bottom-left and the editor fills and scrolls. Verify
unchanged phone bubble geometry/clamp at 390px dark. The dated/dateless border-box
gap remains 36px (24px section margin plus the unchanged 12px main gap).

PR #23 correction: the user authorized fixing the review findings. Explicit column
counts replace the faulty auto-fill formula; the original opacity-1 matrix entry
is corrected to the existing Leva 1a value, 0.7. jsdom declarations remain unit
assertions; browser checks establish column counts and actual text clipping.
