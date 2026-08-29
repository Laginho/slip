# 06: Publish to GitHub Pages with sync live

**What to build:** Configure the build for the GitHub Pages subpath, deploy the app to
the existing repository's Pages site so it serves at
`https://laginho.github.io/slip/`, and supply the Supabase credentials to the
production build from untracked env files — they must never appear in a diff, a commit
or agent context. After deploying, verify the URL serves an installable PWA: valid
manifest, service worker registering, HTTPS. Then demonstrate sync: the same list seen
from two browser contexts writing through ADR 0001's merge rule.

Context: `.scratch/polish-and-publish/spec.md` (Implementation Decisions → Publishing);
ADR 0001 governs sync; nothing in it changes.

**Blocked by:** 04 (visual review applied), 05 (browser pass green).

**Status:** in-progress

- [ ] Site live at https://laginho.github.io/slip/ with correct base path (no broken asset routes)
- [ ] Manifest and service worker validate at the published URL; install prompt available in Chrome/Edge
- [ ] Sync works against production: two contexts converge on one list, including a delete staying deleted
- [ ] Credentials only in untracked env files; `git status`/diff clean of secrets
