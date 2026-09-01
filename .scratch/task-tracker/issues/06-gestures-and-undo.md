# 06 — Gestures and the undo window

Status: complete
Blocked by: 05
Delegation: the undo window is the risky half — review it directly, do not take it on trust

Complete, delete and edit. Two of these destroy something the user typed, so undo is part
of the ticket, not a follow-up.

## Acceptance criteria

| Action   | Phone                      | Desktop                                |
| -------- | -------------------------- | -------------------------------------- |
| Complete | swipe right, or double-tap | double-click                           |
| Delete   | swipe left                 | hover, click the `×` at the right edge |
| Edit     | long-press                 | single click on the text               |

- Edit happens **in place** — the text becomes editable where it sits. No modal, no edit
  screen, no separate detail view.
- Delete sets `deleted: true`. It never removes the record. See issue 09 for why.
- Complete and delete both show a **5-second undo toast**; undo restores the Task to
  exactly its previous state
- Undo is per-action, not a stack. A second action replaces the pending toast, applying
  the first.
- Swipe requires a deliberate distance, not a flick — accidental deletion is the failure
  mode this whole ticket guards against
- The `×` on desktop is hover-revealed, so the resting list stays clean
- One runnable check: complete-then-undo and delete-then-undo both return the Task to its
  prior state, and the undone Task reappears in the right list

## Notes

- Two gestures map to complete on purpose. Swipe is discoverable; double-tap is the fast
  path for the most frequent action.
- Both destructive paths must be reachable only through the store functions from issue 03
  so `updatedAt` is always stamped. A gesture that mutates a Task directly will silently
  break sync.

## Scope

Files: `src/components/Card.tsx`, `src/components/UndoToast.tsx`, `src/store.ts` (undo only), `src/store.test.ts`.
Budget: around 150 lines. Past 240, stop and ask.
Gate: **real TDD on undo.** complete-then-undo and delete-then-undo each restore the exact
prior state; a second action applies the first pending one rather than stacking. Gesture
feel is not testable — check that by hand on the phone.
