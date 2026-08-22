# 09 — Sync

Status: ready-for-agent
Blocked by: 03, 04, 05, 06, 08
Delegation: **do not delegate to a weak executor model.** ~40 lines where plausible-looking
code is silently wrong. Write the tests first; they are the only objective check.

Last ticket on purpose. The app must already be fully useful on the desktop with local
storage alone before any network code exists. Read
`/docs/adr/0001-local-first-whole-document-sync.md` before starting.

## Acceptance criteria

- Supabase project, one table, one row per Task, one baked-in key. **No accounts, no
  auth, no login screen.**
- Sync sends the **whole** task list and merges the response. No per-field diffing, no
  operation log, no CRDT.
- Merge rule: union by `id`; where both sides hold the same `id`, keep the higher
  `updatedAt`. `deleted` Tasks sync like any other Task.
- Runs on app open, and after each mutation (debounced)
- Failure is silent and harmless: offline, the app works exactly as before and syncs on
  the next success. No error banner, no retry queue UI, no spinner blocking the list.
- Local writes never wait on the network. Ever.
- All six merge cases from `../spec.md` implemented as tests

## The case that matters

Case 4 — a Task deleted on the phone must **stay deleted** after syncing with a desktop
that still holds an undeleted copy. This is why deletion is a flag and nothing is ever
purged. A naive union resurrects deleted Tasks on every sync, forever. This test is the
reason the ticket exists.

## Notes

- Concurrent edits to the same Task lose one side silently. That is accepted and recorded
  in the ADR: one person cannot be on two devices at once. Do not add merge UI, conflict
  prompts, or version history.
- Whole-document sync is only correct because the dataset is tiny. Leave a `ponytail:`
  comment naming that ceiling and the upgrade path.

## Scope

Files: `src/sync.ts`, `src/sync.test.ts`, `.env.local` (untracked), `.env.example`.
Budget: around 80 lines of implementation. If sync passes 150 lines, something out of scope
crept in — probably a retry queue or a status indicator, both cut.
Gate: **real TDD, all six merge cases from the spec, case 4 mandatory.** This is the ticket
where the review gate earns its keep.

The Supabase key lives in `.env.local` and is never committed, never in a diff, and never in
the context of a third-party executor or reviewer.
