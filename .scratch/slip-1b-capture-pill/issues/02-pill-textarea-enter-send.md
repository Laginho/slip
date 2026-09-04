# 02: The pill: floating composer, multi-line textarea, Enter by pointer, send button

**What to build:** The capture bar becomes one pill on both profiles, from one render path:
floating over the paper with no strip and no hairline, `--capture-bg` ground, 100% wide
capped at 720px and centred, 12px bottom margin plus the safe-area inset. Inside, in order:
the existing three Kind chips (unchanged in this ticket; ticket 03 replaces them), a
textarea that grows with its content up to five lines and then scrolls, the day field now
with placeholder "dd", and a send button. The pill is fully round (999px) while the textarea
is one line tall and 26px-rounded otherwise. Enter follows the primary pointer: fine → Enter
sends, Shift+Enter breaks; coarse → Enter breaks, only the button sends; `enterKeyHint` is
"send" or "enter" accordingly. The send button is a submit button labelled "enviar", a 36px
circle in `--text-primary` with an inline SVG paper plane in `--surface`, inside a 44×44
target, disabled and dimmed in `--text-quiet` while the trimmed text is blank. The
failing-write path keeps text, Kind and day in place. Launch focus stays fine-pointer only;
refocus after a successful send stays unconditional. DESIGN.md's Capture bar and Shapes
sections and the "pinned, white" Do are amended.

Context: `.scratch/slip-1b-capture-pill/spec.md` (Implementation Decisions → One pill, one
render path; Enter rules from the primary pointer; Send button; Day field; Docs).

**Blocked by:** 01 (store normalisation and the media-query hook).

**Status:** complete

- [x] One pill element on both profiles: no `wide` fork, no strip, no hairline; declared `maxWidth` 720, centred, `--capture-bg`
- [x] Textarea replaces the input; rows derive from the value's line count, capped at 5, `overflowY` auto past 5; radius 999 at one line, 26 otherwise
- [x] Enter rules and `enterKeyHint` follow `(pointer: fine)` live; Alt+1/2/3 still select Kind; Ctrl+H still bubbles
- [x] Send button: `type="submit"`, `aria-label="enviar"`, disabled when blank, declared 44×44 minimum, SVG glyph uses `currentColor`/tokens only
- [x] Day field keeps its behaviour and gains `placeholder="dd"`
- [x] Failing write keeps everything typed; successful send clears text and day, keeps Kind, refocuses
- [x] DESIGN.md amended; no hex literal outside the palette module; whole suite green; `tsc -b` clean

## Test Case Matrix

Seam: App rendered through the shared scaffolding (`App.test.tsx` prior art: "Capture under
a failing write", "visual promoção 04", "6 — CaptureBar uses var(--capture-bg)"). Allowed
mocks: `matchMedia` stubs with `(pointer: fine)` in both breakpoints and the change-listener
variant, `localStorage`, fixed clock. Assert declared inline styles and attributes; the
Leva 1a rows asserting `var(--hairline)` on the bar and the phone-only composer are
rewritten to the new contract (not deleted: they now assert its absence on the pill and its
presence nowhere in the bar).

### Structure (both breakpoints unless stated)

| # | Setup | Expected |
|---|---|---|
| 1 | phone stub | exactly one pill element; style `background` is `var(--capture-bg)`; `border` absent/none; `maxWidth === "720px"`; `margin` centres it; no ancestor of the pill declares `borderTop` or `var(--hairline)` |
| 2 | desktop stub | identical declarations to row 1 (one render path) |
| 3 | either | children in order: three chip buttons, `TEXTAREA[aria-label="nova tarefa"]` with placeholder `"uma tarefa..."`, `INPUT[aria-label="prazo"]` with `placeholder === "dd"`, `BUTTON[type="submit"][aria-label="enviar"]` |
| 4 | either, empty | pill `borderRadius === "999px"`; textarea `rows === 1` |
| 5 | either, value `"a\nb"` | `borderRadius === "26px"`; `rows === 2` |
| 6 | either, value with 7 lines | `rows === 5`; textarea `overflowY === "auto"` |
| 7 | either, value back to one line | `borderRadius === "999px"`, `rows === 1` |

### Enter rules

| # | Setup | Action | Expected |
|---|---|---|---|
| 8 | fine stub, value `"x"` | keydown Enter on textarea | `defaultPrevented`; Task `"x"` created; textarea empty; still focused |
| 9 | fine stub, value `"x"` | keydown Shift+Enter | not `defaultPrevented`; no Task created; value unchanged |
| 10 | coarse stub, value `"x"` | keydown Enter | not `defaultPrevented`; no Task created |
| 11 | coarse stub, value `"x\ny"` | click "enviar" | Task `"x\ny"` created; textarea empty |
| 12 | fine stub | read attribute | textarea `enterKeyHint === "send"` |
| 13 | coarse stub | read attribute | `enterKeyHint === "enter"` |
| 14 | change-listener stub, coarse → fine | dispatch `change`, then Enter | Task created, `defaultPrevented`; `enterKeyHint` now `"send"` |
| 15 | fine stub, textarea focused | Alt+2 | Kind college selected (chip state), textarea value untouched |
| 16 | fine stub, 1 Done, textarea focused | Ctrl+H | Archive toggles (unchanged Leva 1a row) |

### Send button

| # | Setup | Expected / Action |
|---|---|---|
| 17 | value `""` | button `disabled === true`; circle style uses `var(--text-quiet)` |
| 18 | value `"   \n "` | still disabled |
| 19 | value `"x"` | enabled; circle `background` is `var(--text-primary)`; SVG present with `fill` `currentColor` and `color` `var(--surface)` (or equivalent token pair) |
| 20 | either | button declares `minWidth`/`minHeight` 44; circle declares 36 |
| 21 | value `"x"`, day `"27"`, storage throws | click "enviar" → error banner shown; value `"x"`, day `"27"`, Kind unchanged |
| 22 | value `"x"`, day `"27"`, storage ok | click "enviar" → Task with inferred deadline; value `""`, day `""`, Kind unchanged, textarea focused |
| 23 | value `"a\n\n\n\nb"` | send → Card text `"a\n\nb"` (normalisation from ticket 01 through the real path) |

### Focus

| # | Setup | Expected |
|---|---|---|
| 24 | fine stub | textarea focused on mount |
| 25 | coarse stub | nothing focused on mount |

Error cases: `matchMedia` absent must not throw (behaves as coarse); form submit with a blank
value is a no-op even when the button's `disabled` is bypassed programmatically.
