# 01: Rename to Slip and lock the installed app to portrait

**What to build:** The app calls itself Slip everywhere the user can see it (Android
launcher, Windows Start menu, window title) and the installed PWA stays in portrait on
the phone. Nothing about the app's identity or data changes: same base path, scope,
start URL, icons, service worker and storage keys, so the already-installed app updates
in place and keeps its Tasks.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Manifest `name` and `short_name` are "Slip"
- [ ] Manifest has `orientation: "portrait"`
- [ ] HTML `<title>` is "Slip"
- [ ] Package name is "slip"; the build plugin's internal name no longer says task-tracker
- [ ] DESIGN.md front-matter `name` and heading say Slip
- [ ] Base path, scope, start URL, icons, workbox config and storage keys are unchanged
- [ ] `npm test` and `npx tsc -b` green; the existing publish tests still pass

## Test Case Matrix

Seam: repository file assertions, in the style of the existing publish tests (read the
config, HTML and package files from disk; no rendering). No mocks.

| # | Input (file read) | Expected |
|---|---|---|
| 1 | vite config | matches `name: "Slip"` and `short_name: "Slip"` inside the manifest block; no `"Tasks"` literal remains |
| 2 | vite config | manifest block contains `orientation: "portrait"` |
| 3 | vite config | `base`, `start_url`, `scope`, `navigateFallback` still equal `/slip/` forms (unchanged) |
| 4 | index.html | `<title>Slip</title>`; theme-color placeholder still present |
| 5 | package.json | `name` is `slip` |
| 6 | DESIGN.md | front-matter `name: Slip`; no line still reads `Design System: Tasks` |
| 7 | store module | `STORAGE_KEY` still `tasks/v1` (identity guard: the rename must not touch data keys) |
| 8 | capture bar module | sticky Kind key still `capture/kind` |

Error cases: none (static assertions). If `dist/` exists locally, the existing
dist-based publish tests must still pass; do not require a build.
