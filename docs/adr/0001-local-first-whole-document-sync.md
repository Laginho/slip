---
status: accepted
---

# Local-first storage with whole-document union sync

The app is single-user, used on one device at a time (phone away from home, desktop at
home), must work offline, and holds a few KB of data at most. So writes go to local
storage first and are always authoritative for the UI, and sync sends the *entire* task
list to a hosted Postgres (Supabase, one table, one baked-in key, no user accounts) and
merges what comes back: union by task id, and where both sides hold the same id, the
copy with the newer `updatedAt` wins.

## Consequences

- **No auth of any kind.** One user, one baked-in key. There is no account system to
  build, and adding a second user later means designing one from scratch.
- **Deletion is a flag, never a row removal.** Union sync would otherwise resurrect
  anything deleted on one device but still present on the other. Nothing is ever purged.
- **Every task carries `updatedAt`.** It is the entire conflict-resolution mechanism.
- **Concurrent edits to the same task lose one side silently.** Accepted: one person
  cannot be on two devices at once. If the app ever gains a second user, this breaks
  and the decision has to be revisited — not patched.
- **No CRDTs, no operation log, no per-field diffing.** These solve a problem this app
  does not have. Whole-document sync is only viable because the dataset is tiny; if it
  ever grows past a few thousand tasks, revisit.
