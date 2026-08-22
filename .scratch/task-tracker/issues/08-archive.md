# 08 — Archive

Status: ready-for-agent
Blocked by: 05

Done Tasks, kept forever, out of the way. The user occasionally needs to look back at
finished Work and College Tasks.

## Acceptance criteria

- A quiet text link at the very bottom of the list (`ver concluídas`) expands the Archive
  in place — not a route, not a tab, not a nav bar
- Shows Done Tasks from the last 7 days by default, newest first, with a link to show
  older ones
- Nothing is ever deleted or purged. No retention setting, no cleanup job.
- `deleted` Tasks never appear here
- Archived Cards are visually quieter than Open ones — this is a record, not a to-do list

## Notes

- The 7-day default is a display choice only. Storage keeps everything; a few KB of text
  does not need managing.
- Do not add a retention setting. It was explicitly cut: it would be a settings screen
  plus a deletion job, built to destroy data the user said they need.
- Restoring a Done Task back to Open is not required. If it turns out to be wanted, it is
  a one-line addition later.

## Scope

Files: `src/components/Archive.tsx`, plus wiring in `src/App.tsx`.
Budget: around 80 lines. Past 140, stop and ask.
Gate: not TDD. Passes when Done Tasks appear newest-first, deleted ones never appear, and
older ones are reachable without a route change.
