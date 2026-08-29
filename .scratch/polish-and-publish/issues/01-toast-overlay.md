# 01: Undo toast floats on top without moving the list

**What to build:** Every complete/delete shows the 5-second undo toast as an overlay
pinned to the top edge of the window — horizontally centred on the app's column,
respecting the top safe-area inset — floating above the content. Appearing, expiring
and being replaced must not displace anything below: the list stays pixel-stable. The
persistent save-error banner gets the identical treatment. All existing toast semantics
are frozen and must keep passing: action applied and persisted before the toast exists;
5-second window bound to the mount; parent remounts per action so an identical second
action restarts the window; a second action replaces the pending toast and applies the
first; a failed undo restarts the window rather than dropping the snapshot.

Context: `.scratch/polish-and-publish/spec.md` (Implementation Decisions → Toast
overlay).

**Blocked by:** None (can start immediately).

**Status:** complete

- [x] Toast renders over the top edge of content; jsdom test asserts the list's box is unaffected while the toast is mounted and after it unmounts
- [x] Save-error banner floats identically and never displaces the list
- [x] Existing behaviours preserved under test: expiry at 5s with fake timers, replacement semantics, undo restore, failed-undo window restart
- [x] `npm test` and typecheck pass
