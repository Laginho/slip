# 05: Interactive browser pass through the whole app

**What to build:** Drive the built app in a real browser via Playwright, operating it
as a user would — not unit assertions: click, type and gesture through the full happy
path at both phone (375px) and desktop (1280px) sizes. Capture a Task with text, Kind
and a day-number Deadline; complete it by double-click; undo inside the 5-second
window; edit in place; delete via the hover-revealed ×; reload and confirm
persistence; install the service worker by reloading, then go offline and confirm the
app still opens and works. Small findings are fixed within this ticket; anything
larger is recorded as a comment on the responsible ticket instead.

Context: `.scratch/polish-and-publish/spec.md` (Implementation Decisions → Interactive
end-to-end pass; Testing Decisions).

**Blocked by:** 01 (toast overlay), 02 (day-only Deadline), 03 (post-it wall). Runs in
parallel with 04 — behaviour must hold regardless of which visual variant wins.

**Status:** complete

- [x] Full happy path passes interactively in Chromium at 375px and 1280px against the production build
- [x] Undo inside the window restores the Task; after expiry it stays Done/gone
- [x] Reload persists state; offline reload serves from the service worker and remains fully usable
- [x] Findings either fixed or appended as comments on the responsible ticket files

## Comments

**Spec misalignment — double-click to complete.** The ticket description and spec
("complete via double-click") assume a double-click handler on Card to mark a Task as
done. No such handler exists in the codebase: the only completion gesture is the ✓
(Concluir) button, revealed on hover/focus. The browser pass drives completion through
this button instead. If double-click completion is desired, it needs a new handler on
the Card component — out of scope for this ticket.
