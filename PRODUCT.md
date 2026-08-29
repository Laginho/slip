# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Register

product UI

## Users

One person (Bruno). He lives out of a single task list shared between his Android
phone and his Windows desktop, replacing a habit of tracking tasks in WhatsApp
group chats. Every session is the same job: dump what needs doing the moment it
occurs, then glance at what matters today. *(Source: `.scratch/task-tracker/spec.md`
Problem Statement and Phase 2 grilling notes.)*

## Product Purpose

A local-first personal task tracker. Success is measured in seconds-to-captured:
typing in a chat-style bar, pressing Enter, done. The list on the phone and the list
on the desktop are one list, converged by background sync.

## Positioning

Capture faster than any to-do app he has tried: text + optional two-digit deadline +
one-key kind, submitted with Enter from an always-focused bar. No accounts, no
projects, no settings screen. A neighbouring task app could copy the features but not
the absence of everything else.

## Operating Context

- Installed as a standalone PWA on Android (Chrome) and Windows (Edge/Chrome);
  expected to open offline, start on login, and start minimised on Windows.
- Interface language is Brazilian Portuguese throughout ("concluir", "apagar",
  "N dias atrasado").
- Sync runs against an anonymous-key Supabase table (ADR 0001); offline it degrades
  silently to pure localStorage and catches up later.

## Capabilities and Constraints

- Tasks have: text, Kind (work / college / chore), optional Deadline (YYYY-MM-DD),
  done/deleted flags, updatedAt.
- Deadline entry is a **day-of-month number only**; the month is inferred as the next
  future occurrence. Cards display `dd/mm`. Editing a Deadline after capture is
  deliberately absent.
- Completing/deleting opens a 5-second undo window whose appearance must never move
  the list (notifications are a fixed overlay at the top).
- Urgency is derived, never chosen: hue encodes Kind, intensity encodes time-to-deadline.
- No dark mode, no theming, no accounts/auth, no multi-user anything (ADR 0001 stands).
- Desktop (≥900px) renders open tasks as a post-it wall; below that, a single column.
- The Overdue label's red-on-dark contrast is a known, documented, unresolved conflict
  (`src/palette.ts` comments); do not "fix" it silently.

## Brand Commitments

- **The palette is law.** Every colour lives in `src/palette.ts`; no hex literal may
  appear anywhere else. These constants are frozen: visual work may steer typography,
  spacing, rhythm, and layout — **never a colour value**.
- The nine Card swatches are individually immutable:
  `CARD.work.{light,medium,dark}`, `CARD.college.{light,medium,dark}` and
  `CARD.chore.{light,medium,dark}`. The remaining exported chrome/ink tokens in
  `src/palette.ts` are frozen by the same rule.
- Voice: short, lowercase, informal Portuguese; the bar placeholder is "uma tarefa...".

## Evidence on Hand

- Full product spec: `.scratch/task-tracker/spec.md`; phase 2 decisions:
  `.scratch/polish-and-publish/spec.md`; vocabulary: `CONTEXT.md`; sync design:
  `docs/adr/0001-*`.
- 103 passing tests encode behaviour (urgency math, merge cases, write-failure
  boundaries, notification layer).

## Product Principles

1. **Capture outranks everything.** Any step added to typing-and-Enter is wrong.
2. **Nothing moves under your eyes.** Acting on the list must never reshuffle it;
   notifications float, they do not push.
3. **Hue means kind, intensity means urgency** — one glance, no labels to read.
4. **Storage is authoritative.** If persistence failed, the UI must not pretend it
   succeeded.
5. **Subtraction is the feature.** When in doubt, leave the capability out.

## Accessibility & Inclusion

- `prefers-reduced-motion` collapses all animation durations.
- Body-text contrast target 4.5:1 (College dark was darkened specifically to clear it).
- Keyboard paths exist for every gesture: focus reveals card controls; Tab/Enter/Escape
  drive complete/edit/cancel.
