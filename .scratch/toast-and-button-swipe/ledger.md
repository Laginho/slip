# Ledger — toast-and-button-swipe

| cycle | issue | verdict | culprit | reason |
| ----- | ----- | ------- | ------- | ------ |
| 01 | 01-toast-top-right | correction | TEST (mimo v2.5 free); PLAN (5.6 terra medium) | TEST: T4 queried `[role="alert"]` without `<HTMLElement>`, breaking `tsc -b` (T2 used the correct form, so the pattern was known). PLAN: ran the cycle on stale `traycer/mighty-dolphin` (base 8e8562b, carrying foreign red commit 0e8a5ad from session-seam) instead of the declared base branch, then reported the resulting 9 failures + missing-module type errors as "a separate ticket" instead of flagging the wrong base. MAKE was clean: correct production diff, two honest attempts, refused test-shaped fixes. |
