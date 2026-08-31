# Ledger — toast-and-button-swipe

| cycle | issue | verdict | culprit | reason |
| ----- | ----- | ------- | ------- | ------ |
| 01 | 01-toast-top-right | correction | TEST (mimo v2.5 free); PLAN (5.6 terra medium) | TEST: T4 queried `[role="alert"]` without `<HTMLElement>`, breaking `tsc -b` (T2 used the correct form, so the pattern was known). PLAN: proceeded through a full cycle on a visibly dirty base (9 pre-existing failures, missing-module type errors) and reported it as "a separate ticket" instead of stopping and handing back — though the stale branch itself (`traycer/mighty-dolphin`, base 8e8562b with foreign red commit 0e8a5ad) came from the launch context: the user relayed into an existing Traycer task instead of a fresh one, so branch selection was not PLAN's choice. MAKE was clean: correct production diff, two honest attempts, refused test-shaped fixes. |
