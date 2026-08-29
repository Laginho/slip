# 07: Prove standalone installs — Android, Windows, offline, autostart

**What to build:** Validate the Phase-1 gate hands-on against the published URL,
guiding the user step by step (wizard-style) since the device-side steps need their
hands: install as a standalone app on Android (Chrome: own icon, own window), install
on Windows via Edge/Chrome (Start-menu entry, no browser chrome), launch each installed
app with the network off and confirm full offline function, then set up Windows
autostart-on-login and start-minimised per the Phase 1 Platform section — verifying
hands-on what was promised but never confirmed; if the browser offers nothing better,
document the normal-shortcut-with-Run-Minimized fallback in the Startup folder. Append
the outcomes to this file under `## Comments`.

Context: `.scratch/polish-and-publish/spec.md` (Implementation Decisions → Validation
checklist); `.scratch/task-tracker/spec.md` (Platform section).

**Blocked by:** 06 (published URL with sync live).

**Status:** ready-for-agent

- [ ] Installed and launched standalone on Android; opens and works in airplane mode
- [ ] Installed and launched standalone on Windows; opens and works offline
- [ ] Autostart on login + start minimised configured on Windows and verified by an actual reboot/login, or the documented fallback applied
- [ ] Outcomes recorded under `## Comments` in this file
