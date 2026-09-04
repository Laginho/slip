# 03: The Kind dot and its pop-up replace the three chips

**What to build:** The three Kind chips inside the pill become one dot: a button holding a
28px circle in the selected Kind's light hue with its letter in the dark ink (work → T,
college → F, chore → C), inside a 44×44 target, `title` "Alt+N" for the current Kind,
`aria-haspopup`/`aria-expanded`. Tapping or clicking it opens a pop-up anchored above the dot
(ground `--capture-bg`, hairline border, rendered only while open) with three option buttons,
each its lettered circle plus the word ("trabalho", "faculdade", "casa"), the selected one
`aria-pressed`. Choosing selects (through the existing sticky path: persisted under
`capture/kind`, textarea refocused) and closes. Escape, or a pointerdown outside the pill,
closes without change. Nothing opens on hover. Alt+1/2/3 select without opening and the dot
updates at once. Dot, options, day field and send button are Tab-reachable and operable by
Enter/Space. DESIGN.md's Capture bar section describes the dot.

Context: `.scratch/slip-1b-capture-pill/spec.md` (Implementation Decisions → Kind dot and
pop-up; Docs).

**Blocked by:** 02 (the pill; same component, sequenced to avoid conflicting edits).

**Status:** complete

- [x] Chips removed; one dot button with letter, colour, `title`, `aria-haspopup`, `aria-expanded`, declared 44×44 minimum and 28px circle
- [x] Pop-up opens on click/tap only, above the dot, with three lettered options and words; selected option `aria-pressed`
- [x] Choose → select + persist + close + refocus; Escape or outside pointerdown → close without change
- [x] Alt+1/2/3 select without opening; the dot reflects the new Kind
- [x] Keyboard path end to end through the pill
- [x] DESIGN.md amended; no hex literal outside the palette module; whole suite green; `tsc -b` clean

## Test Case Matrix

Seam: App rendered through the shared scaffolding (`App.test.tsx` prior art: Leva 1a ticket
01 row 8 asserting the `capture/kind` key; "survives a sticky-kind selection when its own
setItem throws too"). Allowed mocks: `matchMedia` stubs, `localStorage` (seeded and throwing
variants), fixed clock. Assert attributes, text, declared styles, focus and the resulting
Task's Kind.

| # | Setup | Action | Expected |
|---|---|---|---|
| 1 | fresh storage | render | no chip buttons; one `BUTTON[aria-haspopup]` with text `"T"`, `title === "Alt+1"`, `aria-expanded === "false"`; circle style `background === CARD.work.light`, `color === INK_ON_LIGHT`; declared 44×44 minimum, circle 28 |
| 2 | storage `capture/kind = "chore"` | render | dot text `"C"`, `title === "Alt+3"`, `background === CARD.chore.light` |
| 3 | either | render | no pop-up element in the DOM |
| 4 | either | click the dot | `aria-expanded === "true"`; pop-up present with three buttons in order: `"T trabalho"`, `"F faculdade"`, `"C casa"` (letter in a circle, word beside); the current Kind's option `aria-pressed === "true"` |
| 5 | pop-up open | click "faculdade" | pop-up gone; dot `"F"`, `title === "Alt+2"`; `localStorage.capture/kind === "college"`; textarea focused |
| 6 | pop-up open | keydown Escape | pop-up gone; Kind unchanged; textarea focused |
| 7 | pop-up open | pointerdown on the list region | pop-up gone; Kind unchanged |
| 8 | pop-up open | pointerdown inside the textarea | pop-up gone (outside the pop-up counts as outside); Kind unchanged |
| 9 | closed | mouseenter / hover on the dot | pop-up stays absent |
| 10 | closed, textarea focused | Alt+3 | pop-up stays absent; dot `"C"`, Kind chore persisted |
| 11 | pop-up open | Alt+1 | Kind work selected; pop-up closes |
| 12 | Kind college selected via pop-up, value `"x"` | send | Task with `kind === "college"`; dot still `"F"` (sticky) |
| 13 | storage `setItem` throws | choose "casa" | dot `"C"`, Task sent afterwards has `kind === "chore"`; no throw, no banner |
| 14 | either | Tab order | dot → textarea → day field → send button (document `tabIndex`/order); with the pop-up open, Tab reaches the three options |
| 15 | pop-up open, option focused | keydown Enter / Space on the option | selects and closes as row 5 |
| 16 | desktop stub | render | same declarations as rows 1 and 4 (profile-independent) |
| 17 | dark stub | render | pop-up ground `var(--capture-bg)`, border `var(--hairline)`; circles still `CARD[kind].light` with `INK_ON_LIGHT` |

Error cases: `matchMedia` absent must not throw; a stored Kind outside the three falls back
to work (dot `"T"`), unchanged behaviour.
