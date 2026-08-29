# 02: Capture sets the Deadline with a day number only

**What to build:** The native date input in the capture bar is replaced by one small
numeric field accepting digits only, maximum two characters: the day of the month. The
month is never asked for; it is inferred as the day's next future occurrence. Today is
the 24th: "27" means the 27th of this month, "22" means the 22nd of next month, "24"
means today. Days 29/30/31 roll forward past months that lack them. A value outside
1–31 yields no Deadline — the field ends up empty, never a silently different date. An
empty field means no Deadline, as today. Storage keeps the complete `YYYY-MM-DD`; Cards
keep showing `dd/mm`; the Task model, merge rule and Urgency computation are untouched.

Context: `.scratch/polish-and-publish/spec.md` (Implementation Decisions → Day-only
Deadline capture).

**Blocked by:** None (can start immediately).

**Status:** complete

- [x] Pure-function inference tests cover: day later this month, day already passed this month, day equal to today, 29/30/31 across short months, invalid days rejected — all in local time, alongside the existing urgency math tests
- [x] Capture bar test: typing digits passes the correctly inferred full date up; empty or invalid input passes null
- [x] Field accepts digits only, maximum two characters
- [x] Card display and storage format unchanged; existing suites stay green
