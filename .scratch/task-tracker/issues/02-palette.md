# 02 — Palette file

Status: complete
Blocked by: 01

One file holding every colour in the app as a named constant. The user tunes the values
by hand before deploy — this ticket produces a sane starting point, not final colours.

## Acceptance criteria

- One module (or one CSS custom-property block) exporting nine card colours: light /
  medium / dark for each of Work, College, Chore
- Base hues, from the user's Google Calendar: Work `#e3683e`, College `#e7ba51`,
  Chore `#4b99d2`
- Light step reads as pastel; dark step reads as clearly darker at a glance on a phone
- One additional constant for the Overdue label red
- Every colour used anywhere in the app resolves to this file. No hex literals in
  components.

## Notes

- Expect College (yellow) to fight this. Darkening yellow turns it olive; its dark step
  will probably need to be a saturated amber that stays recognisably the same hue.
  Note whatever you settle on in a comment.
- Do **not** build a colour picker, a theme system, a settings screen, or light/dark
  mode. Nine constants in a file the user edits.
- A `/impeccable` or `/prototype` pass on these values is expected later; make them easy
  to swap, that is the whole point of the file.

## Scope

Files: `src/palette.ts` only.
Budget: around 40 lines. Past 80 means you are building a theme system, which is cut.
Gate: not TDD. Passes on the eye — nine swatches, three clearly distinct steps per hue.
