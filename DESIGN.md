---
name: Slip
description: A local-first personal task tracker that captures like a chat app
colors:
  surface: "#f5f4f2"
  capture-bg: "#ffffff"
  text-primary: "#1a1a1a"
  text-quiet: "#8a8783"
  hairline: "#e2e0dc"
  ink-on-light: "#1a1a1a"
  ink-on-dark: "#ffffff"
  overdue-red: "#ff7a68"
  toast-bg: "#2b2a28"
  toast-ink: "#f7f6f4"
  work-light: "#f9d4c8"
  work-medium: "#e3683e"
  work-dark: "#973e20"
  college-light: "#faebc2"
  college-medium: "#e7ba51"
  college-dark: "#9d6607"
  chore-light: "#cfe6f7"
  chore-medium: "#4b99d2"
  chore-dark: "#275a86"
typography:
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "16px"
    lineHeight: 1.3
rounded:
  card: "10px"
  toast: "10px"
  chip: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "24px"
components:
  task-card:
    backgroundColor: "{colors.work-light}"
    textColor: "{colors.ink-on-light}"
    rounded: "{rounded.card}"
    padding: "11px 13px"
  capture-bar:
    backgroundColor: "{colors.capture-bg}"
    textColor: "{colors.text-primary}"
---

# Design System: Slip

## Overview

**Creative North Star: "The Post-it Board by the Door"**

A warm, quiet, paper-like surface on which coloured post-its carry all the
expression. The chrome is nearly invisible — warm off-white, hairline dividers,
system type — so that hue and intensity do all of the information design. Density is
intimate (phone-first column) or abundant (desktop wall), never corporate. There is
no theme toggle; the chrome follows the system colour scheme; the nine Card swatches never vary; the world is this one.

**Key Characteristics:**
- Colour = meaning: every saturated value encodes a Task Kind or Urgency step.
- Everything else stays out of the way: quiet greys, hairlines, no shadows.
- Chat-app ergonomics: a floating pill on the capture ground is the product's front door.

## Colors

> **FROZEN — The Palette Is Law.** These values are the complete colour system,
> sourced from `src/palette.ts` (the only file allowed to contain a hex literal).
> Design variants must not change any of them. Typography, spacing, rhythm, and
> layout are open for steering; colour is not.

### Kind hues (each in three urgency steps: light / medium / dark)
- **Work coral** (`work-light #f9d4c8`, `medium #e3683e`, `dark #973e20`): paid-work
  tasks. Light pastel when far out, Calendar-orange within a week, rust-red today/overdue.
- **College amber** (`college-light #faebc2`, `medium #e7ba51`, `dark #9d6607`):
  study tasks. The dark step is a saturated amber pinned at 4.84:1 against white ink;
  darkening it further is the documented contrast lever.
- **Chore sky** (`chore-light #cfe6f7`, `medium #4b99d2`, `dark #275a86`):
  household/admin tasks.

### Neutral
- **Warm paper** (`surface #f5f4f2`): the only background the app has; also the PWA
  theme-color (injected into the manifest at build time).
- **Capture white** (`capture-bg #ffffff`): the pill's ground, lifting it off the paper.
- **Ink** (`text-primary / ink-on-light #1a1a1a`): text on light and medium steps.
- **Quiet grey** (`text-quiet #8a8783`): placeholders, links, empty states, archive rows.
- **Hairline** (`hairline #e2e0dc`): the single border colour in the product.
- **Toast charcoal** (`toast-bg #2b2a28`) with **toast ivory** (`toast-ink #f7f6f4`):
  undo toasts and save-error banners only.

### Signal
- **Overdue red** (`overdue-red #ff7a68`): the "N dias atrasado" label on dark cards.
  Its contrast shortfall is a documented, unresolved spec conflict — see the Named
  Rule below and `src/palette.ts`. Do not adjust it in visual passes.

### Named Rules
**The Palette Is Law.** No hex literal outside `src/palette.ts`; no new constants
during variant work; no theme system ever.
**The Overdue Exception.** The one known contrast failure stays visible until the
user rules on it; bold weight carries it meanwhile.

## Typography

**Body Font:** system-ui stack (`system-ui, -apple-system, 'Segoe UI', Roboto,
sans-serif`) — native feel, zero webfont cost.

### Hierarchy
- **Task text** (400, 16px, 1.3): the Card's content; also the minimum size that
  stops iOS zooming a focused input.
- **Meta/label** (700 bold for "desfazer" and overdue labels; 13–14px for chips,
  toasts, archive rows): quiet support, underlined when tappable.

## Layout

Phone (<900px): one centred column capped at 620px; the list is bottom-anchored
(`justify-content: flex-end`) so short lists sit next to the capture bar; the page
never scrolls — the list area does (`100dvh`, safe-area insets respected).

Desktop (≥900px): the shell drops its cap and each section becomes a post-it wall —
CSS grid `repeat(auto-fill, minmax(240px, 1fr))`, gap 12px, natural Card heights
(rows never stretch). Reading order stays deadline-ascending, left-to-right,
top-to-bottom. Archive remains an expandable section beneath; the capture bar spans
the full width, still pinned to the bottom.

Spacing rhythm: 8px inside lists, 12px page gutters and wall gaps, 24px between the
dated and dateless sections.

## Elevation & Depth

Flat by default. Depth is conveyed by ground, not shadow: white bar on paper,
hairline border where surfaces meet. No box-shadows anywhere. Notifications float
via fixed positioning alone, not elevation effects.

## Shapes

Rounded rectangles everywhere, one radius family: 10px on Cards and notifications;
the fully-round 999px pill is the composer while it holds one line (26px once it grows) and the Kind chips. Inputs are bare (no visible
field box) — focus lives in the composition, not a border.

## Components

### Cards (post-it)
- **Corner Style:** 10px radius.
- **Background:** Kind hue × Urgency step (nine combinations).
- **Shadow Strategy:** none.
- **Internal Padding:** 11px 13px; baseline-aligned row of text + controls.
- **Behaviour:** hover/focus reveals ✓ ✎ ×; double-click completes; swipe flies the
  Card out with a 200ms flight (reduced-motion collapses it).

### Capture bar
- A pill floating over the paper on both profiles, centred, ≤720px, `--capture-bg`,
  no border, 12px above the safe area.
- Contains the Kind chips, a textarea growing to five lines then scrolling ("uma
  tarefa..."), the two-digit day field ("dd"), and a 44px send button ("enviar":
  36px circle in `--text-primary`, paper-plane glyph in `--surface`, dimmed in
  `--text-quiet` while blank).
- Enter sends under a fine pointer and Shift+Enter breaks, under a coarse pointer
  Enter breaks and the button sends; Alt+1/2/3 switches Kind.

### Toast / banner
- Charcoal rounded strip (10px), ivory text, floating over the top edge, centred on
  the column, respecting the top safe-area inset. Never in the document flow.

### Archive rows
- Quiet struck-through grey text, 14px; a plain underlined link toggles it.

## Do's and Don'ts

### Do:
- **Do** keep every colour exactly as listed above; steer typography, spacing, and
  layout instead.
- **Do** keep the capture bar pinned, floating on the capture ground, and reachable at all times.
- **Do** preserve bottom-anchoring of the phone list and the wall's uneven bottoms.
- **Do** keep gestures and their keyboard equivalents working on any new layout.

### Don't:
- **Don't** introduce shadows, gradients, or new hues; the chrome follows the system colour scheme; the nine Card swatches never vary.
- **Don't** let any notification take part in the document flow.
- **Don't** add chrome (nav bars, tabs, settings) — sections only.
- **Don't** touch the Overdue red or the amber's pinned lightness.
