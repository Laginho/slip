# 03 — Task store, local and authoritative

Status: ready-for-agent
Blocked by: 01
Delegation: keep this one — the write path is what every later ticket depends on

The Task model and local persistence. Local storage is authoritative for the UI; nothing
in the app ever waits on a network call. See the model table in `../spec.md`.

## Acceptance criteria

- `Task` type exactly as the spec table defines it — no extra fields
- Create, edit text, set deadline, mark done, mark deleted, undo — each one a single
  function that mutates one Task and stamps `updatedAt = Date.now()`
- Persisted to `localStorage` as one JSON blob, written synchronously on every mutation
- Loads from `localStorage` on startup, tolerates a missing or malformed blob without
  crashing (fresh install and corrupted storage are the same code path)
- Selectors: Open Tasks in display order, and the Archive list
- Display order: Tasks with a Deadline first, ascending; ties broken Work > College >
  Chore, hardcoded; then Tasks without a Deadline in creation order
- `deleted` Tasks are excluded from every selector, including the Archive
- One runnable check covering the sort order (including the Kind tiebreak) and that
  `deleted` never appears in any selector

## Notes

- `localStorage` over IndexedDB deliberately: the whole dataset is a few KB and
  synchronous writes make the undo window and the offline path trivial. If the dataset
  ever reaches thousands of Tasks, revisit — mark that with a `ponytail:` comment.
- No state management library. React state plus this module is enough for one screen.
- `updatedAt` is not decoration. Issue 09 is built entirely on it — never mutate a Task
  without stamping it.

## Scope

Files: `src/store.ts`, `src/store.test.ts`.
Budget: around 120 lines of implementation. Past 200, stop and ask.
Gate: **real TDD.** Tests first, covering sort order with the Kind tiebreak, deleted Tasks
absent from every selector, and a malformed localStorage blob loading as empty rather than crashing.
