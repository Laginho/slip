# Task Tracker — Spec

Single-user personal task tracker. Replaces a solo WhatsApp group used as a task log.
Read `/CONTEXT.md` for vocabulary and `/docs/adr/0001-*.md` for the sync decision before
touching code. Terms below are used exactly as CONTEXT.md defines them.

## The bar to beat

A WhatsApp group with yourself. It wins on capture speed (type, Enter) and loses on
exactly one thing: nothing can be marked finished. Every feature must beat that bar
without slowing capture down. **Capture speed is the hard constraint, not a preference.**

## Domain model

A Task is:

| Field       | Type                             | Notes                                                 |
| ----------- | -------------------------------- | ----------------------------------------------------- |
| `id`        | string                           | Generated client-side (`crypto.randomUUID`)           |
| `text`      | string                           | One line. Typically 3-5 words. Required.              |
| `kind`      | `'work' \| 'college' \| 'chore'` | Required. Chosen at Capture.                          |
| `deadline`  | `string \| null`                 | `YYYY-MM-DD`. Optional.                               |
| `done`      | boolean                          | Done Tasks leave the main list.                       |
| `deleted`   | boolean                          | Soft delete. Never purged. Never rendered.            |
| `updatedAt` | number                           | `Date.now()` on every mutation. Sync depends on this. |

That is the whole model. There is no priority field, no description, no category, no
project, no recurrence, no subtasks, no tags, no user id.

## The single screen

One list, one input. No navigation, no tabs, no nav bar, no menus.

```
┌──────────────────────────────┐
│  Tasks with a Deadline       │  sorted by deadline ascending;
│  (soonest first)             │  ties broken Work > College > Chore
│                              │  (hardcoded, NOT configurable)
│  Tasks without a Deadline    │  below, in creation order
│                              │
│  ver concluídas  <───────────│  quiet text link, bottom of list
├──────────────────────────────┤
│ [W][C][Ch]  type a task...   │  pinned to the bottom, chat-style
└──────────────────────────────┘
```

- Input **pinned to the bottom**, chat-style. This is deliberate and inherits WhatsApp
  muscle memory. Do not move it to the top.
- Kind chips sit beside the input. The **last-used Kind stays selected**, so consecutive
  Tasks of the same Kind cost zero taps. Desktop: keys `1`/`2`/`3` select Kind.
- Deadline is set with a native `<input type="date">`. No date-picker library.
- Desktop: the input is focused on launch.

## Colour

Hue = Kind. Intensity = Urgency, **always computed from the Deadline, never chosen**.

| Kind    | Base hex (user's Google Calendar colours) |
| ------- | ----------------------------------------- |
| Work    | `#e3683e` (tangerine)                     |
| College | `#e7ba51` (yellow)                        |
| Chore   | `#4b99d2` (blue)                          |

Three intensity steps per hue: light (pastel) / medium / dark.

| Urgency step | When                                  |
| ------------ | ------------------------------------- |
| light        | no Deadline, or Deadline > 7 days out |
| medium       | Deadline within 7 days                |
| dark         | Deadline today, or Overdue            |

All nine values live in **one palette file as named constants**. The user tunes them by
hand before deploy — do not build a colour picker, a theme system, or a settings screen.
Known issue to expect: yellow resists darkening (goes olive). Its dark step will likely
need to be a saturated amber rather than a genuinely dark tone.

Overdue additionally shows **"N dias atrasado" in bold red text** on the card. There is
no red border — the label carries it, and a border would collide with dark tangerine.

## Gestures

| Action   | Phone                      | Desktop                                |
| -------- | -------------------------- | -------------------------------------- |
| Complete | swipe right, or double-tap | double-click                           |
| Delete   | swipe left                 | hover, click the `×` at the right edge |
| Edit     | long-press                 | single click on the text               |

- Edit is **in place**. No modal, no edit screen.
- **Every** complete and delete shows a 5-second undo toast. Non-negotiable: a swipe is
  easy to trigger by accident and there is no other recovery path.

## Animation

Day one, one animation only: **swipe follows the finger and the card continues off-screen
in that direction, the list closing the gap behind it.** This is not polish — the gesture
is incomprehensible without it. Under 250ms.

The double-tap animation is deliberately unspecified. It gets designed with `/prototype`
by comparing candidates, not written from a prose description. Everything else (done
counter, easing polish, confetti) is post-MVP.

## Sync

See `/docs/adr/0001-local-first-whole-document-sync.md`. Summary:

- Local storage is authoritative for the UI. Writes never wait on the network.
- Backend: Supabase, one table, one baked-in key, **no accounts, no auth**.
- Sync sends the whole task list and merges the response. The dataset is a few KB, so
  there is no per-field diffing, no operation log, no CRDT.
- Merge rule: union by `id`; where both sides hold the same `id`, keep the higher
  `updatedAt`.

### Merge test cases (implement these as tests, not as prose)

| # | Local                             | Remote                             | Expected result                              |
| - | --------------------------------- | ---------------------------------- | -------------------------------------------- |
| 1 | Task A only                       | Task B only                        | both A and B present                         |
| 2 | A `{done:false, updatedAt:200}`   | A `{done:true, updatedAt:100}`     | A stays `done:false` (local is newer)        |
| 3 | A `{done:false, updatedAt:100}`   | A `{done:true, updatedAt:200}`     | A becomes `done:true` (remote newer)         |
| 4 | A `{deleted:true, updatedAt:200}` | A `{deleted:false, updatedAt:100}` | A stays deleted — **must not resurrect**     |
| 5 | A absent entirely                 | A `{deleted:true}`                 | A present locally, deleted, not rendered     |
| 6 | A `{text:'x', updatedAt:100}`     | A `{text:'y', updatedAt:100}`      | deterministic winner, no crash, no duplicate |

Case 4 is the bug this whole design exists to prevent. It must have a test.

## Deliberately excluded

Not oversights — each was raised, argued, and cut. Do not add them back without asking:

- **Priority field** — Deadline carries it; a solo user marks everything high within two weeks
- **Categories as folders** — Kind is colour + tiebreak, not a filing system
- **Recurring tasks** — that is Google Calendar's job, not this app's
- **Description / notes field** — Tasks are 3-5 words; post-it beats ticket here
- **Notifications / push** — the habit of opening the app replaces them
- **Retention setting** — the Archive is kept forever, a few KB of text
- **Configurable tiebreak order** — hardcode it; the user is the config file
- **Hard delete** — breaks sync (test case 4)
- **Accounts / auth** — one user
- **Electron** — 120MB of private Chromium to draw twenty text cards

Deferred, wanted later: parsing the Deadline out of the typed text ("amanhã", "sexta"),
so the date needs no separate interaction. Post-MVP.

## Platform

**PWA.** One web codebase, installs on Android (own launcher icon, own window) and on
Windows via Edge/Chrome (Start menu entry, own window, no address bar, no tabs). Offline
via service worker.

Performance is not a factor in this choice: WebView2 *is* Chromium, so a PWA and a Tauri
build render identically. This app is twenty text cards — it is fast in any shell.

Desktop setup the user wants (configuration, not code): autostart on login, start
minimised. Edge/Chrome expose autostart per installed app; if "start minimised" is not
available there, the install creates a normal Windows shortcut — set it to
*Run: Minimized* and drop it in the Startup folder. **Verify this hands-on**; it was
promised as achievable, not confirmed.

Known cheap upgrade path if a real `.exe` is ever wanted: wrap the same code with
Tauri v2, which also produces an Android build. No rewrite. This is why it was not
decided up front.

## For the orchestrating session

The user plans to orchestrate with a strong model, execute with a weak model
(Gemini Flash class), and review with a third. Two things to know:

**Weak models match existing patterns well and invent architecture badly.** This repo is
greenfield, so whatever gets written first becomes the architecture by default. Build the
skeleton and the palette file before delegating anything, so there is a pattern to match.

**Split by whether "looks right" and "is right" agree:**

- *Safe to delegate*: scaffold, Card rendering, list sorting, input and chips, Archive
  view, palette file, swipe animation. Highly patternable, visibly wrong when wrong.
- *Do not delegate*: the sync merge (issue 09), the undo window, the offline write path.
  These are ~40 lines where plausible-looking code is silently wrong. The merge test
  cases above exist so the reviewer has something objective to check instead of taste.

Build order matters: **the app must be fully useful on the desktop with local storage
only, before any sync code exists.** Sync is issue 09 for that reason.

## File tree (fixed — this is what makes ticket scope enforceable)

Executors may only create or modify the files their ticket lists. Anything outside its
list is a rejected diff. No new directories, no `utils/`, no `types/`, no `constants.ts`.

```
index.html
vite.config.ts
.env.local            <- Supabase key, untracked
.env.example          <- placeholder, committed
src/
  main.tsx
  App.tsx
  palette.ts          <- every colour in the app
  urgency.ts          <- deadline -> light/medium/dark, and days overdue
  urgency.test.ts
  store.ts            <- Task type, mutations, selectors, localStorage
  store.test.ts
  sync.ts
  sync.test.ts
  components/
    Card.tsx
    TaskList.tsx
    CaptureBar.tsx
    Archive.tsx
    UndoToast.tsx
```

That is the whole app. Thirteen files. If a ticket seems to need a fourteenth, that is a
signal to stop and ask, not to create it.

## Gate per ticket type

The review gate is objective where it can be, and honest where it cannot:

- **Real TDD** — `03`, `05` (urgency only), `06`, `09`. Logic with assertable behaviour.
  Tests first, and the six merge cases above are already written to translate directly.
- **Not TDD** — `01`, `02`, `04`, `05` (rendering), `07`, `08`. You cannot unit-test
  whether a pastel reads as pastel or a swipe feels right. Forcing tests here produces
  assertions that a className exists, which pass while the UI is wrong. Gate these on:
  does it match the exemplar Card, and did it violate any "do not" in its ticket.

## Credentials

The Supabase key lives in `.env.local`, untracked. `.env.example` holds a placeholder.
It must never appear in a diff or in the context of a third-party executor or reviewer.
