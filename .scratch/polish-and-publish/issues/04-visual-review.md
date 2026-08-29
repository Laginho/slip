# 04: Visual review — variants in both formats, user picks, winner applied

**What to build:** Install the Impeccable skill into the project and run its init,
recording product context (register: product UI) and documenting that the palette is
frozen — variant generation may steer typography, spacing, rhythm and layout, never a
colour value. Then produce ready-made visual variants of the app at phone width and at
desktop width (the post-it wall), present them to the user, let them pick what they
like and reject what they don't, and apply the winning choices as the final diff.

Context: `.scratch/polish-and-publish/spec.md` (Implementation Decisions → Review
tooling; Palette frozen).

**Blocked by:** 01 (toast overlay), 02 (day-only Deadline), 03 (post-it wall).

**Status:** complete

- [x] Impeccable installed; its recorded context states register = product UI and marks all nine palette constants as immutable
- [x] At least two distinct variants presented per format (phone, desktop), as screenshots or live previews the user can compare side by side
- [x] User's chosen variant applied; rejected variants discarded cleanly
- [x] No colour value changed; `npm test` and typecheck pass after applying

## Decision — 28/08/2026

The user chose a responsive combination rather than one variant everywhere:

- **Phone (`<900px`): B — A Conversa.** Tasks use the conversational bubble
  composition and the capture area uses the conversation-style composer.
- **Desktop (`>=900px`): A — A Parede.** Open Tasks use the direct full-width
  post-it wall and the flat full-width capture strip.

This changes presentation only. Task ordering, Kind/Urgency colour semantics,
gestures, keyboard paths, persistence, sync and the frozen palette remain unchanged.
The prototype is evidence for the decision, not production code; the selected pieces
must be reimplemented in the real components and the prototype removed from the main
working tree after verification.

## Prototype capture

The discarded A/B/C comparison is preserved as primary-source evidence on branch
`prototype/ticket-04-visual-variants`, commit `6f7c9eb`. The main working tree keeps
only the validated responsive combination and this decision record.
