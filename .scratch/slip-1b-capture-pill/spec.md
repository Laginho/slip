# Leva 1b — Slip: the capture pill and the square Card

Status: ready-for-agent

Grilled and confirmed with the user on 2026-09-04 (`/grilling`, with an `/impeccable`
comparison page of three wall variants; the user chose V3). Read `/CONTEXT.md` for
vocabulary and ADR 0002 (Position): nothing here changes storage, sync, session
semantics or the order of Tasks. Leva 1a (`.scratch/slip-1a-chrome-archive/spec.md`) is
merged and is the base.

This is the second of four levas agreed on 2026-09-02:

- **1a (done)**: name, portrait lock, dark chrome, Archive at the top, 44px controls.
- **1b (this spec)**: the capture bar becomes a floating pill with a multi-line
  textarea, Enter rules by pointer type, a send button and a Kind dot with a pop-up;
  Task text keeps its line breaks; the desktop Card becomes a square post-it with
  proportional text and clamped overflow.
- **2**: stored Position, drag, trash, reflow (ADR 0002).
- **3**: interface reform (aesthetics deferred throughout).

Product constraints in force: touch and desktop are first-class together; every
behaviour below must hold under both pointer profiles and both colour schemes. Capture
outranks everything: nothing here adds a step to type-and-Enter on the desktop, and on
the phone the send button is the one tap the keyboard's own Enter cannot be.

---

## Problem Statement

Six irritations in daily use, all around Capture and how a Task reads afterwards:

1. A Task is defined as "one line, or a few lines separated by plain line breaks", but
   the bar is a single-line input: a Task with sub-items has to be typed as one run-on
   line, and a pasted multi-line text loses its breaks.
2. On the phone there is no visible way to send: Enter on the virtual keyboard is the
   only path, and it is the same key the user would expect to insert a line break in a
   chat composer.
3. The three Kind chips (W / C / Ch) take a third of the bar's width on the phone for a
   choice that is sticky and rarely changes; their letters are English initials in a
   Portuguese interface.
4. The bar is a full-width strip with a hairline; on the desktop wall it reads as a
   toolbar rather than the chat composer the product is modelled on.
5. Cards on the desktop wall have natural heights: one long Task stretches its row and
   the wall stops looking like a wall of post-its.
6. A Card's text ignores line breaks even when the store holds them, and the in-place
   editor is a single-line input that would silently flatten a multi-line Task on save.

## Solution

1. The capture bar becomes a **pill floating over the paper**, centred, no strip and no
   hairline, at most 720px wide, on both profiles from one render path. Inside, left to
   right: the **Kind dot**, a **multi-line textarea**, the **day field** and the **send
   button**.
2. The textarea grows with the text up to five lines, then scrolls inside the pill. The
   pill is fully round with one line and becomes a rounded rectangle as it grows.
3. **Enter follows the primary pointer.** Fine pointer (desktop): Enter sends,
   Shift+Enter inserts a break. Coarse pointer (phone): Enter inserts a break and only
   the send button sends. Measured by the `(pointer: fine)` media query, live.
4. The **send button** exists on both profiles, always in place, disabled while the text
   is blank: a filled circle with a paper-plane glyph.
5. The three chips become **one dot** showing the selected Kind's colour and its letter
   (T trabalho, F faculdade, C casa). Tapping or clicking it opens a **pop-up** with the
   three Kinds; choosing one closes it and refocuses the textarea. Alt+1/2/3 and the
   sticky, persisted selection are unchanged.
6. **Line breaks are kept**: the store keeps them (trimmed at both ends, three or more
   consecutive breaks collapsed to two), the Card renders them, and the in-place editor
   becomes a textarea with the same Enter rules as the pill.
7. On the desktop wall each Card is a **square post-it**: four per row on the user's
   1200px window, three on narrower desktop windows, never five; the square stops
   growing at 300px and the wall centres with side margins beyond that. **Text scales
   with the square** (16px on a 276px Card, as today), clamped to eight lines with an
   ellipsis. Controls move to the top-right corner; the Deadline sits bottom-left.
8. On the phone the Card keeps its bubble; it only gains line breaks and a six-line
   clamp.

## User Stories

### Pill

1. As Bruno, I want the capture bar to be a rounded pill floating over the paper, so
   that the app's front door looks like the chat composer it is modelled on.
2. As Bruno, I want the same pill on the phone and on the desktop, so that the two
   halves of the app feel like one product.
3. As Bruno on the desktop, I want the pill centred and no wider than 720px, so that a
   wide monitor does not stretch the composer across the whole screen.
4. As Bruno, I want the pill fully round while I type one line and gently rounded once
   it grows, so that it keeps its shape language at every height.
5. As Bruno, I want the pill's ground to follow the colour scheme like the rest of the
   chrome, so that dark mode has no light composer floating on it.
6. As Bruno, I want the pill to keep its safe-area padding on the phone, so that the
   gesture bar never covers the send button.
7. As Bruno, I want the list area to shrink as the pill grows, so that the bottom Cards
   stay visible while I type a long Task.

### Multi-line text

8. As Bruno, I want to type a Task over several lines, so that sub-items can be written
   the way I would write them in a chat.
9. As Bruno, I want the textarea to grow with what I type up to five lines, so that I
   can see the whole Task while composing it.
10. As Bruno, I want the textarea to scroll inside the pill past five lines, so that a
    very long Task never pushes the list off the screen.
11. As Bruno, I want a pasted multi-line text to keep its line breaks, so that pasting
    from a chat costs no re-typing.
12. As Bruno, I want leading and trailing blank lines dropped and runs of blank lines
    collapsed to one, so that a stray Enter never produces an ugly Card.
13. As Bruno, I want a whitespace-only text to send nothing, so that an accidental send
    never creates an empty Card.
14. As Bruno, I want the placeholder "uma tarefa..." and the label "nova tarefa" to stay,
    so that the composer keeps its voice.

### Enter rules

15. As Bruno on the desktop, I want Enter to send, so that capture stays type-and-Enter.
16. As Bruno on the desktop, I want Shift+Enter to insert a line break, so that a
    multi-line Task is one keystroke away from the single-line habit.
17. As Bruno on the phone, I want Enter on the virtual keyboard to insert a line break,
    so that the composer behaves like every chat app I use there.
18. As Bruno on the phone, I want the keyboard's Enter key to be labelled as a plain
    return, not "send", so that the key does what its label says.
19. As Bruno on the desktop, I want the keyboard's hint to remain "send", so that a
    desktop with a virtual keyboard still shows the right key.
20. As Bruno on a Windows laptop with a touchscreen, I want Enter to send, so that the
    mouse being my primary pointer decides, not the presence of a touchscreen.
21. As Bruno, I want the Enter rule to follow a live change of the primary pointer, so
    that docking a tablet to a keyboard-and-mouse does not need a reload.
22. As Bruno, I want Alt+1/2/3 to keep switching Kind from the textarea, so that the
    desktop shortcut survives the rewrite.
23. As Bruno, I want Ctrl+H to keep toggling the Archive while the textarea has focus,
    so that the Leva 1a shortcut is unaffected.

### Send button

24. As Bruno on the phone, I want a send button, so that there is a visible way to send
    once Enter inserts a break.
25. As Bruno on the desktop, I want the same send button, so that the pill is one design
    and the button also tells me the text is ready.
26. As Bruno, I want the send button to stay in place whether or not there is text, so
    that nothing in the pill jumps while I type.
27. As Bruno, I want the send button disabled and dimmed while the text is blank, so
    that it shows nothing will happen.
28. As Bruno, I want the send button to be a filled circle with a paper-plane glyph, so
    that it reads as "send" without a label.
29. As Bruno, I want the send button coloured from the chrome tokens (primary text on
    the circle, surface on the glyph), so that no new colour enters the palette.
30. As Bruno, I want the send button's hit target to be at least 44×44px, so that I can
    hit it on the phone without aiming.
31. As Bruno, I want the send button to be labelled "enviar" for assistive technology,
    so that it is not an unnamed button.
32. As Bruno, I want the send button to leave my text in place when storage refuses the
    write, so that a retry costs nothing (the existing error path).

### Kind dot and pop-up

33. As Bruno, I want the three chips replaced by one dot showing the selected Kind, so
    that the pill spends its width on the text.
34. As Bruno, I want the dot to carry the Kind's letter (T, F, C) over the Kind's light
    hue, so that I can tell the Kind even with one colour in view.
35. As Bruno, I want the letters to be Portuguese initials, so that the interface stops
    speaking English in one corner.
36. As Bruno, I want tapping or clicking the dot to open a pop-up with the three Kinds,
    so that changing Kind is two taps.
37. As Bruno, I want each option in the pop-up to show its coloured lettered circle and
    its word ("trabalho", "faculdade", "casa"), so that colour, letter and meaning are
    learned together.
38. As Bruno, I want choosing an option to close the pop-up and return focus to the
    textarea, so that I can continue typing without another tap.
39. As Bruno, I want Escape and a click or tap outside to close the pop-up without
    changing the Kind, so that opening it by mistake costs nothing.
40. As Bruno on the desktop, I want the pop-up never to open on hover, so that moving
    the mouse to the textarea does not flash a menu.
41. As Bruno, I want the pop-up anchored above the dot, so that it never covers the
    text I am typing.
42. As Bruno, I want the selected Kind to stay sticky across sends and restarts exactly
    as today, so that consecutive Tasks of one Kind cost zero taps.
43. As Bruno, I want Alt+1/2/3 to switch the Kind and update the dot immediately, so
    that the shortcut and the dot never disagree.
44. As Bruno, I want the dot's hit target to be at least 44×44px, so that the phone can
    hit it.
45. As Bruno using a keyboard, I want the dot, the pop-up options, the day field and the
    send button reachable by Tab and operable by Enter or Space, so that the pill has a
    keyboard path end to end.

### Day field

46. As Bruno, I want the two-digit day field to stay, with the same month inference, so
    that the Deadline path is unchanged.
47. As Bruno, I want the day field to sit between the textarea and the send button, so
    that the reading order is text, when, send.
48. As Bruno, I want the day field to show "dd" as a quiet placeholder while empty, so
    that a bare 40px gap in a borderless pill announces what it is.
49. As Bruno, I want an invalid day to yield no Deadline exactly as today, so that the
    rewrite changes nothing about inference.

### Card text and editor

50. As Bruno, I want a Card to show the Task's line breaks, so that what I typed is
    what I read.
51. As Bruno, I want a Task's stored text to keep its breaks through sync, so that the
    phone and the desktop show the same Card.
52. As Bruno, I want the in-place editor to be a multi-line field, so that editing a
    multi-line Task cannot flatten it.
53. As Bruno on the desktop, I want Enter in the editor to save and Shift+Enter to
    break, so that the editor and the pill share one rule.
54. As Bruno on the phone, I want Enter in the editor to insert a break and tapping
    outside to save, so that the editor follows the phone's rule too.
55. As Bruno, I want Escape in the editor to cancel and restore the text, so that the
    cancel path is unchanged.
56. As Bruno, I want the editor to apply the same trimming and blank-line collapsing as
    capture, so that an edit cannot produce a Card capture could not.
57. As Bruno, I want Ctrl+H ignored while the editor has focus, so that the Leva 1a
    guard still holds with the new field type.
58. As Bruno, I want the editor's text to be the full Task text even when the Card was
    clamped, so that nothing is hidden from me when I edit.

### Square Card on the wall

59. As Bruno on the desktop, I want every Card to be a square, so that the wall reads as
    post-its.
60. As Bruno, I want four Cards per row on my 1200px window, so that the wall keeps the
    density I have today.
61. As Bruno, I want three Cards per row when the window is narrower than about 1150px,
    so that a Card never shrinks below a readable size.
62. As Bruno, I want never more than four per row, so that a wide monitor does not turn
    the wall into a mosaic.
63. As Bruno, I want the square to stop growing at 300px and the wall to centre with
    side margins beyond that, so that a wide monitor keeps some breathing room.
64. As Bruno, I want the Card's text to scale with the square, so that a larger square
    does not show small text on empty paper.
65. As Bruno, I want the text on my 1200px window to stay at today's 16px, so that the
    scaling changes nothing where I work.
66. As Bruno, I want the text clamped to eight lines with an ellipsis, so that a long
    Task stays inside its square.
67. As Bruno, I want the Deadline shown bottom-left of the square, so that the date is
    where a post-it would carry it.
68. As Bruno, I want the ✓ ✎ × controls in the top-right corner of the square, so that
    they are out of the text's way.
69. As Bruno, I want the controls to keep their 44×44px targets, hover-or-focus reveal
    and resting pointer-events none, so that Leva 1a's accessibility path is unchanged.
70. As Bruno, I want the Deadline and the control glyphs to scale with the square too,
    so that the post-it is one proportional drawing.
71. As Bruno, I want the "N dias atrasado" label to stay glued to the text as today, so
    that Overdue keeps its documented look.
72. As Bruno, I want the dated and dateless sections to keep their 24px section margin
    (36px total with the main's existing 12px gap) and
    order, so that the reading order is unchanged.
73. As Bruno, I want the nine Card colours, the inks and the Overdue red untouched, so
    that hue and intensity keep their meaning.
74. As Bruno, I want the square to keep the 10px radius and no shadow, so that the
    design system's shape and depth rules hold.

### Phone Card

75. As Bruno on the phone, I want the Card to keep its bubble shape, size and layout,
    so that the phone list is untouched by the wall's change.
76. As Bruno on the phone, I want the Card to show line breaks and clamp at six lines,
    so that a long Task does not fill the screen.

### Cross-cutting

77. As Bruno, I want all of the above under both colour schemes, so that no light
    element floats on the dark chrome.
78. As Bruno, I want all of the above to respect `prefers-reduced-motion`, so that the
    pill's growth introduces no motion the system asked to suppress.
79. As Bruno, I want the whole existing suite to stay green, so that this leva provably
    changes nothing it did not mean to.

## Implementation Decisions

### Text normalisation lives in the store

- Both `create` and `editText` normalise the text the same way: trim both ends,
  collapse three or more consecutive line breaks into two. A blank result is still "not
  a Task" (no-op on create, keep-what-was-there on edit). The Task model, ingress
  validation and sync are untouched: text was always a free string.
- The capture bar and the Card editor pass the raw text through; neither normalises.

### One pill, one render path

- The capture bar drops the phone/desktop fork. One pill element on both profiles:
  `--capture-bg` ground, no border, no strip, width 100% capped at 720px, centred, 12px
  bottom margin plus the safe-area inset. Radius 999px while the textarea is one line
  tall, 26px otherwise (the pill knows its line count from the textarea's auto-grow).
- Children in order: Kind dot, textarea, day field, send button, aligned to the bottom
  edge so the dot and the button stay anchored as the textarea grows.
- The textarea auto-grows to its content up to five lines, then scrolls internally.
  Growth is a height change with no transition (nothing to suppress under reduced
  motion).
- The screen root's flex column already lets the list region shrink as the pill grows.

### Enter rules from the primary pointer

- One `(pointer: fine)` media query, read once and subscribed live, owned by the capture
  bar and by the Card (the same way the Card already reads `(hover: hover)` and the App
  reads the breakpoint). Fine: Enter sends (capture) or saves (editor), Shift+Enter
  inserts a break. Coarse: Enter inserts a break; the send button sends; the editor
  saves on blur.
- `enterKeyHint` is `"send"` under fine and `"enter"` under coarse.
- The bar keeps consuming only Enter (per the rule above) and Alt+digits; Ctrl+H
  bubbles to the window as in Leva 1a.
- The launch focus stays fine-pointer only; the refocus after a successful send stays
  unconditional.

### Send button

- A `type="submit"` button labelled "enviar", disabled when the trimmed text is empty.
  44×44 target holding a 36px circle: ground `--text-primary`, glyph `--surface`; when
  disabled the circle takes `--text-quiet` at reduced opacity. The glyph is an inline
  SVG paper plane (one path, `fill: currentColor`), no icon library.
- The form's submit handler remains the single send path (button click, Enter under
  fine, IME send actions), guarded by `preventDefault` exactly as today.

### Kind dot and pop-up

- The dot is a `type="button"` with `aria-haspopup` and `aria-expanded`, `title="Alt+N"`
  for the current Kind, 44×44 target holding a 28px circle in `CARD[kind].light` with
  the letter in `INK_ON_LIGHT`. Letters: work → T, college → F, chore → C.
- The pop-up is a plain positioned element rendered only while open, anchored above the
  dot, ground `--capture-bg`, hairline border (the one place the hairline remains in the
  pill, because the pop-up floats over the pill's own ground). Three `type="button"`
  options, each the lettered circle plus the word ("trabalho", "faculdade", "casa"),
  the selected one marked with `aria-pressed`. Choosing calls the existing sticky
  selection (which already persists under `capture/kind` and refocuses the textarea)
  and closes the pop-up. Escape, or a pointerdown outside the pill, closes without
  change. No hover-to-open. Alt+1/2/3 select without opening.
- The `capture/kind` storage key and its fallback to work are unchanged (Leva 1a ticket
  01 already asserts the key).

### Day field

- Unchanged behaviour (two digits, month inference, invalid → null). Gains
  `placeholder="dd"`, keeps `aria-label="prazo"`, keeps the quiet colour while empty.

### Card: line breaks and the editor

- The text span gets `white-space: pre-line` on both profiles.
- The in-place editor becomes a textarea filling the text area of the Card (100% width;
  on the wall, the full text region height, scrolling internally). Enter rules as
  above; blur commits; Escape cancels. The Ctrl+H guard in the screen root recognises
  the editor as the one textarea inside an `li`.

### Card: the square wall

- The wall grid uses `repeat(3, minmax(260px, 300px))` below a 1168px viewport and
  `repeat(4, minmax(260px, 300px))` above it, with `justify-content: center` and a
  centred list capped at 1248px (four 300px Cards and three 16px gaps). App owns both
  live media queries. The 1168px threshold allows 1136px plus the main's 32px gutters;
  four columns still fit with a conventional 15px scrollbar. At 1200px Cards are
  about 276–280px depending on scrollbar width. The 900px phone breakpoint is unchanged.
  Explicit counts replace the original auto-fill formula after PR #23 review:
  auto-fill counts the definite 300px maximum and incorrectly yields only three
  columns at 1200px. Cards remain capped at 300px and the wall never gains a fifth.
  Both lists keep zero top/bottom margins, except the dateless section's existing
  24px top margin when dated Tasks exist (in addition to the main's 12px gap).
- Each wall Card is a container (`container-type: inline-size`) with `aspect-ratio: 1`,
  `overflow: hidden`, 10px radius, padding as today, laid out as a column: text region
  on top, footer row at the bottom. Text `font-size: 6.67cqw` (16px on a 276px Card),
  line-height 1.3, `-webkit-line-clamp: 8` with the standard `-webkit-box` pair and an
  ellipsis. The resting text must not flex-grow past its clamped height: use
  `flex: 0 1 auto`; editing still grows to fill the square. Footer: Deadline `dd/mm`
  at `5.8cqw`, `tabular-nums`, 0.75 opacity, pushed bottom-left by `margin-top: auto`. Control
  glyphs at `7.5cqw` inside the same 44×44 minimum targets as Leva 1a, positioned
  absolutely in the top-right corner; while revealed, the text region reserves the
  controls' width on its first lines by padding-right so the glyphs never sit on text.
  The Overdue label stays inline with the text.
- Revealed controls keep Leva 1a's opacity 0.7 and pointer-events auto; at rest they
  have opacity 0 and pointer-events none. Ticket 04's original opacity-1 row was a
  matrix typo, not a requested change to Leva 1a's reveal behavior.
- The bubble (phone) Card changes only by `pre-line` and `-webkit-line-clamp: 6`.

### Docs

- DESIGN.md: Layout (wall grid, square Card, cap), Shapes (999px pill now the composer,
  26px when grown), Components → Capture bar (the pill, the dot, the send button) and
  Cards (square, top-right controls, clamp), Do's ("keep the capture bar pinned, white"
  becomes "pinned, floating, on the capture ground"). PRODUCT.md Positioning keeps
  "submitted with Enter from an always-focused bar" (true on the desktop) and gains
  the phone send button. CONTEXT.md is unchanged: Task already allows line breaks.

## Testing Decisions

A good test drives the rendered App or Card through real DOM events and asserts what
the user would observe: text, attributes, inline styles, focus, the resulting Task
list. Never assert on component internals or which module computed a value. Mocks
allowed: `matchMedia` via the existing stubs (extended with `(pointer: fine)` profiles
in both breakpoints and a change-listener variant for the live rule), a fixed clock,
`localStorage`, `Element.prototype.scrollTo`.

Seams, highest first (all existing):

1. **App rendered through the shared test scaffolding** (`App.test.tsx`). Covers the
   pill's structure and declared styles, the four Enter rule combinations (fine/coarse ×
   Enter/Shift+Enter), the live pointer change, `enterKeyHint`, the send button's
   enabled/disabled state and click path, the failing-write retry path, the dot's
   letter and colour per Kind, the pop-up's open/choose/Escape/outside-close and its
   focus return, Alt+1/2/3 through the dot, the day placeholder, the Ctrl+H guard with a
   textarea editor, and end-to-end: type three lines, send, the Card shows three lines.
2. **Card rendered through the same scaffolding** (`Card.test.tsx`). Covers the wall
   Card's square declarations (`aspect-ratio`, `container-type`, cqw font sizes, clamp
   8), controls' top-right placement and unchanged targets/reveal, footer Deadline, the
   bubble's clamp 6 and `pre-line`, and the editor: textarea, Enter/Shift+Enter under
   both pointers, blur commit, Escape cancel, full text in the editor.
3. **Store pure functions** (`store.test.ts`). Covers normalisation in `create` and
   `editText`: trims, collapses 3+ breaks to 2, keeps single and double breaks, blank
   stays a no-op, `\r\n` input handled.
4. **Repository file assertions** (`palette-law.test.ts` / `publish.test.ts`). The
   SVG glyph and every new style use tokens; no hex literal outside the palette module.

jsdom has no layout: assert declared inline styles and attributes, never measured
sizes. The textarea's auto-grow must therefore derive its row count from the value
(line count) rather than from `scrollHeight`, so that the pill's radius and the
five-line cap are testable and deterministic.

## Out of Scope

- Stored Position, drag, trash, reflow animations (Leva 2, ADR 0002).
- A tooltip or expansion showing a clamped Card's full text without editing (Leva 2/3).
- Aesthetics of the Archive link, the empty state, the dark palette beyond Leva 1a,
  control glyph redesign (Leva 3).
- Parsing Deadlines from typed text (still deferred since Phase 1).
- Editing a Deadline after capture (deliberately absent, ADR 0002 depends on it).
- The permanent 15px scrollbar on Windows and the toast covering the Archive link
  (Leva 1a observations, still deferred).
- Any change to the phone Card's shape, size or gestures beyond `pre-line` and clamp.

## Further Notes

- The comparison page the decision was made on lives in the session scratchpad
  (`leva-1b-alternativas-static.html`); its numbers: at 1200px all variants give a 276px
  Card at 16px; at 1600px V3 gives 300px at 17.6px with 130px side margins. The user
  chose V3 for the side margins, accepting the modest text growth.
- Container query units are supported by every Chromium since 105 and by the installed
  PWA's engines; no fallback is needed.
- Gates: `npm test` (vitest) and `npx tsc -b`. No lint step exists.
