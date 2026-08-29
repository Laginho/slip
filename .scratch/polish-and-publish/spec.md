# Task Tracker Phase 2 — Polish and Publish

Status: ready-for-agent

Decisions in this spec came out of a grilling session with the user (August 2026). The
Phase 1 spec lives at `.scratch/task-tracker/spec.md` and remains the source of truth for
everything not changed here. Domain vocabulary: `CONTEXT.md`. Sync design: ADR 0001.

## Problem Statement

The app works, but daily use surfaced three frictions and a missing step:

1. Every undo toast appears **in the document flow** between the list and the capture
   bar. Because the list is bottom-anchored, each complete/delete shoves the whole list
   upward by the toast's height and yanks it back five seconds later. Reading the list
   while acting on it is impossible.
2. Capture asks for a **full date** (day, month, year) for the Deadline. Tasks never
   reach further than about a month out; typing a year is meaningless friction.
3. On the computer the app is a 620px phone column centred on a landscape monitor — a
   port of the phone layout, wasting two thirds of the screen.
4. Nothing is **published**: there is no HTTPS URL from which Android and Windows can
   install the PWA standalone, so phone and desktop cannot share one task list yet.

## Solution

1. The toast becomes an overlay pinned to the **top** of the window. It floats above the
   content and never displaces anything. The save-error banner gets the same treatment.
2. Deadline capture becomes a single small numeric field for the **day of the month**
   only. The month is inferred as the day's next future occurrence: today is the 24th,
   "27" means the 27th of this month, "22" means the 22nd of next month.
3. Desktop (≥900px wide) gets a **post-it wall**: Cards flow in a responsive grid across
   the full width, ordered by Deadline read left-to-right, top-to-bottom, each Card at
   its natural height like real post-its on a board. Below 900px nothing changes.
4. The app is published to GitHub Pages with sync configured, then installed and
   validated hands-on as a standalone app on Android and Windows, including offline use
   and Windows autostart.

Visual quality is reviewed before publishing by iterating on ready-made visual variants
the user chooses from (Impeccable skill), and behaviour is exercised end-to-end by the
agent driving the real app in a browser like a user would (Playwright).

## User Stories

1. As a user completing a Task, I want the undo toast to appear over the top of the
   screen without moving anything, so that my list stays exactly where my eyes are.
2. As a user whose toast expired, I want the list to have never moved, so that nothing
   jumps after the fact either.
3. As a user who fat-fingered a swipe, I want the same 5-second undo window as before,
   just without the layout jump, so that recovery is unchanged.
4. As a user hitting a storage failure, I want the error banner to float on top as well,
   so that no notification ever reshuffles my list.
5. As a capturing user, I want to type just a day number for the Deadline, so that
   setting a deadline costs two keystrokes instead of interacting with a full date picker.
6. As a capturing user, I want "27" on the 24th to mean the 27th of this month, so that
   near deadlines behave the way I think.
7. As a capturing user, I want "22" on the 24th to mean the 22nd of next month, so that
   I never accidentally create an already-overdue Task.
8. As a capturing user on the 30th, I want "31" to land on the 31st even though this
   month has no 31st, so that short months do not produce nonsense.
9. As a capturing user, I want an impossible day ("0", "40") to simply leave the
   Deadline empty rather than silently storing something else, so that the field never
   lies to me.
10. As a capturing user, I want an empty day field to mean "no Deadline", so that the
    optional nature of the field is preserved.
11. As a reviewing user, I want Cards to keep showing `dd/mm` and overdue labels as
    before, so that reading deadlines is unchanged.
12. As a desktop user, I want Open Tasks spread across a grid filling my monitor's
    width, so that the screen I paid for is actually used.
13. As a desktop user, I want the grid ordered by Deadline reading left-to-right and
    top-to-bottom, so that urgency scanning survives the new shape.
14. As a desktop user, I want each Card drawn at its natural height, so that the wall
    looks like post-its rather than a spreadsheet.
15. As a desktop user, I want the Archive to stay a quiet expandable section below the
    wall, so that consultation does not compete with open work for space.
16. As a desktop user, I want the capture bar pinned at the bottom spanning the width,
    so that capture keeps its chat-style home on every device.
17. As a desktop user, I want double-click, hover-reveal `×` and click-to-edit to keep
    working on wall Cards, so that all gestures carry over.
18. As a phone user, I want everything below 900px to look exactly as it does today,
    so that the desktop change costs me nothing on mobile.
19. As a user, I want the Kind colours and Urgency intensities untouched, so that the
    information design stays identical on the wall.
20. As a user, I want to choose between ready-made visual variants during review, so
    that the shipped look is picked by a human, not defaulted by a model.
21. As a user, I want the agent to have clicked through the whole app in a real browser
    before publishing, so that "works" means exercised, not inferred.
22. As a user, I want a public HTTPS URL to install from, so that both my devices can
    run the app as a real application.
23. As a phone user, I want to install the app from that URL with its own icon and own
    window, so that it replaces my WhatsApp-group habit properly.
24. As a Windows user, I want to install the app from Edge/Chrome with a Start-menu
    entry and no browser chrome, so that it feels native on the desktop too.
25. As a user in airplane mode or without internet, I want the installed app to open
    and work fully offline, so that capture never depends on connectivity.
26. As a user with the app on two devices, I want captures on one to appear on the
    other, so that the phone and the desktop hold one list (ADR 0001).
27. As a Windows user who lives in the app, I want it to start on login and minimised,
    so that it is always one glance away (to be verified hands-on, as promised in
    Phase 1 but never confirmed).

## Implementation Decisions

**Toast overlay.** The toast (and identically the persistent save-error banner) leaves
the document flow: fixed to the top edge of the window, horizontally centred on the
app's column, respecting the top safe-area inset. Entrance/exit must not trigger layout
of anything below. All existing semantics are frozen: applied-first persistence, 5-second
window bound to mount, remount-per-action keying, second action replaces pending toast
and applies the first, failed-undo restarts the window.

**Day-only Deadline capture.** One numeric input accepting digits only, maximum two
characters, replacing the native date input. Inference rule: the stored Deadline is the
next occurrence of day N — month N ≥ current day → current month; otherwise advance
month by month until a month containing day N is found (handles 29/30/31 across short
months). Day equal to today means today. Days outside 1–31 yield no Deadline (field ends
empty). Storage format stays the complete `YYYY-MM-DD`; the Task model, merge rule and
Urgency computation are untouched. Card display stays `dd/mm`.

**Desktop post-it wall.** At viewports ≥900px the Open list renders as a responsive CSS
grid across the full app width: auto-fitting columns of roughly ≥240px minimum Card
width, more columns as the viewport grows. Order within the grid follows the existing
store selector exactly — Deadline ascending, ties broken Work > College > Chore, then
dateless Tasks in creation order — read left-to-right, top-to-bottom. Cards keep natural
heights (no row stretching), producing the irregular post-it look. The Archive stays an
expandable section beneath the wall. The capture bar stays pinned bottom, full width.
All Card gestures and keyboard paths are unchanged. Below 900px the layout is byte-for-
byte today's single column.

**Palette frozen.** No colour value changes. The nine palette constants remain the law;
any review tooling must be configured to treat them as immutable.

**Review tooling.** Install the Impeccable skill into the project. Its init records the
product context (register: product UI) and documents the frozen palette so variant
generation steers typography/spacing/layout, never colour. Visual review = generate
variants, user picks, apply winner. This is a gate, not TDD: matching the chosen
exemplar is the pass condition, per the Phase 1 gate philosophy for rendering tickets.

**Interactive end-to-end pass.** Playwright drives the built app in a real browser with
the agent operating it as a user: capture (text + day + Kind), complete via double-click,
undo inside the window, edit, delete via hover `×`, reload persistence, offline reload.
It is executed interactively as a test stage by the agent — not wired into CI.

**Publishing.** Target: GitHub Pages on the existing repository, served at
`https://laginho.github.io/slip/`, which requires configuring the build base path for
that subpath. Supabase credentials are supplied to the production build so phone ↔
desktop sync is live from day one (ADR 0001 governs; nothing in it changes). The PWA
manifest and service worker already exist and carry over as-is.

**Validation checklist (hands-on, after publishing).** Install standalone from the URL
on Android (Chrome) and on Windows (Edge/Chrome); launch each installed app with network
off and confirm full offline function; set up Windows autostart-on-login and
start-minimised per the Phase 1 Platform section, verifying hands-on what was promised
but never confirmed.

## Testing Decisions

Good tests assert external behaviour only — what renders, what persists, what the store
returns — never internal component state. Prior art in the codebase: table-driven tests
for the urgency day math, the six merge cases for sync, and jsdom component tests using
the shared testing harness.

- **Day inference**: pure-function tests alongside the existing urgency math. Table of
  cases: day later this month, day already passed this month, day 29/30/31 against short
  months, day equal to today, invalid days rejected, all evaluated in local time.
- **Toast/banner overlay**: extend the existing App-level component tests — presence and
  role of the toast, expiry under fake timers, replacement semantics, and crucially that
  appearing/disappearing does not displace list content (assert the list's box is
  unaffected while the toast is up).
- **CaptureBar**: typing digits calls up with the correctly inferred full date; empty or
  invalid input passes null. Existing jsdom seam.
- **Wall grid**: deliberately untested by unit tests — visual correctness is gated by
  the user-approved variant plus the interactive pass, consistent with how rendering
  tickets were gated in Phase 1.
- **One new seam, at the top**: the Playwright browser stage against the built app. It
  is the highest possible seam — the whole running product — and exists precisely so no
  lower seams need to be added anywhere else.

## Out of Scope

- Editing or removing a Deadline after Capture (still text-only edits)
- Parsing Deadlines out of typed text ("amanhã") — Phase 1 deferred item, still deferred
- Any configuration for the month-inference rule (revisit only if the ~one-month horizon
  actually pinches)
- JavaScript masonry / packed-wall layouts; uneven bottoms are the accepted aesthetic
- Dark mode, theming, any palette change
- Accounts, auth, multi-user anything (ADR 0001 stands)
- Electron/Tauri wrappers — the cheap upgrade path noted in Phase 1, not taken now
- CI integration for the Playwright stage; custom domains; native push notifications

## Further Notes

- Execution order agreed with the user: fixes (toast, day-only Deadline) → desktop wall
  → visual review in both formats → publish → validate installs.
- Impeccable requires Node ≥22.12; the environment has v24, verified.
- The Windows autostart/"start minimised" setup is configuration, not code, and may end
  in a normal shortcut with Run: Minimized in the Startup folder if the browser offers
  nothing better — verify hands-on, per Phase 1's promise.
- Sync credentials live in untracked env files and must never appear in diffs or agent
  context, per the Phase 1 Credentials section.
