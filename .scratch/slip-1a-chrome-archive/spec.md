# Leva 1a — Slip: name, portrait lock, dark chrome, Archive at the top, 44px controls

Status: ready-for-agent

Grilled and confirmed with the user on 2026-09-02 (`/grill-with-docs`). Read
`/CONTEXT.md` for vocabulary (note the new **Position** term and the retired Kind
tiebreak; neither is touched by this leva) and ADR 0001 (sync) — nothing here changes
storage, sync, or session semantics. ADR 0002 (Position) belongs to Leva 2.

This is the first of four levas agreed in the grilling:

- **1a (this spec)**: everything in the batch that does *not* touch the capture bar.
- **1b**: the capture bar rewrite (multi-line textarea, Enter rules by pointer type,
  dedicated send button, Kind dot + pop-up, centred pill).
- **2**: the wall (identical Cards, single grid, stored Position, drag, trash, reflow).
- **3**: interface reform (aesthetics deferred throughout the grilling).

Product constraints in force: touch and desktop are first-class together; every
behaviour below must hold under both pointer profiles and both colour schemes.

---

## Problem Statement

Five small irritations in daily use of the installed PWA:

1. The app calls itself **"Tasks"** everywhere the user can see (launcher, window
   title, splash), while the product is Slip.
2. On Android the app **rotates to landscape**, which it was never designed for and
   which looks broken.
3. There is **no dark appearance**; the warm paper is glaring at night, and every other
   app on the phone follows the system scheme.
4. The **"ver concluídas" link** sits permanently under the Open list. The user almost
   never opens the Archive, so the link is pure noise on every glance at the list.
5. The Card's ✓ ✎ × controls are **18–22px glyphs**; on the phone they are hard to hit
   (registered backlog item from the toast-and-button-swipe batch).

## Solution

1. The app is named **Slip** in the manifest, the window title, the package and the
   design docs. Nothing else about identity changes (icons, colours, URL).
2. The installed PWA is **locked to portrait** via the manifest. Desktop is unaffected
   (browsers ignore the field there).
3. **Dark chrome follows the system** `prefers-color-scheme`. There is no toggle and no
   settings screen. Only the *chrome* darkens — paper surface, capture ground, text,
   hairline, toast; the nine Card swatches, both inks and the Overdue red stay exactly
   as they are ("post-its on a dark wall"). The palette stays the single source of every
   colour; it simply gains a dark set for the chrome tokens.
4. The Archive **moves to the top** of the scrolling list and is normally **out of
   sight**: on the phone the user pulls the list down (scrolls to the very top) to reveal
   "ver concluídas", like WhatsApp's archived chats; on the desktop `Ctrl+H` toggles the
   Archive section open and closed. The link is never shown as part of the resting view.
   When there is nothing Open, the screen stays empty (no empty-state text).
5. Each Card control gets a **44×44 px minimum hit target** with the glyph drawn
   exactly as today.

## User Stories

1. As Bruno, I want the launcher icon on Android to read "Slip", so that the app is
   called by its name on my home screen.
2. As Bruno, I want the desktop window title to read "Slip", so that the taskbar and
   window switcher show the right name.
3. As Bruno, I want the installed app on Windows to be listed as "Slip", so that the
   Start menu entry matches the product.
4. As Bruno, I want the old installed PWA to pick up the new name on its next manifest
   check without reinstalling, so that the rename costs me nothing on Android.
5. As Bruno, I want the design and vocabulary docs to say Slip, so that no document
   still calls the product by a placeholder name.
6. As Bruno, I want the Android app to stay in portrait when I tilt the phone, so that
   the list never renders in a layout it was not designed for.
7. As Bruno, I want the desktop app to ignore the portrait lock, so that the wall keeps
   filling my landscape monitor.
8. As Bruno, I want the app to turn dark when my phone is in dark mode, so that it
   matches every other app and stops glaring at night.
9. As Bruno, I want the app to turn dark on Windows when the system theme is dark, so
   that the always-open desktop window fits the rest of the screen.
10. As Bruno, I want the app to switch schemes live when the system does, so that a
    scheduled sunset switch does not leave a stale light window open all evening.
11. As Bruno, I want the Cards to keep their exact colours in dark mode, so that hue
    still means Kind and intensity still means Urgency with no relearning.
12. As Bruno, I want the paper, the capture ground, the text, the hairlines and the
    toasts to darken together, so that no light-scheme element is left floating on the
    dark surface.
13. As Bruno, I want the PWA's window chrome colour to follow the scheme as well, so
    that the app frame does not sit light around a dark page.
14. As Bruno, I want no dark-mode toggle and no settings screen, so that the app keeps
    having nothing to configure.
15. As Bruno, I want the Overdue label to look exactly as it does today, so that the
    documented contrast exception is not silently changed under cover of dark mode.
16. As Bruno, I want the resting list to show only Open Cards, so that a glance at what
    matters today is not diluted by an Archive link I never click.
17. As Bruno on the phone, I want to pull the list down past its top to reveal "ver
    concluídas", so that the Archive is one gesture away when I do want it.
18. As Bruno on the phone, I want that pull to work even when only two Cards are open,
    so that the gesture does not depend on the list being long enough to scroll.
19. As Bruno on the phone, I want the pull to never trigger the browser's
    pull-to-refresh, so that reaching for the Archive cannot reload the app.
20. As Bruno on the phone, I want the revealed link to open the Archive only when I tap
    it, so that an accidental over-scroll does not dump a week of Done Tasks on screen.
21. As Bruno on the phone, I want the Archive, once open, to sit at the top of the list
    above the Open Cards, so that revealing and reading happen in the same place.
22. As Bruno on the phone, I want "ocultar concluídas" to close the Archive and hide the
    link again, so that the list returns to its resting state.
23. As Bruno on the desktop, I want `Ctrl+H` to open the Archive at the top of the list,
    so that I never need a visible link there.
24. As Bruno on the desktop, I want `Ctrl+H` again to close it, so that the shortcut is
    a toggle and not a one-way door.
25. As Bruno on the desktop, I want `Ctrl+H` to work while the capture bar has focus, so
    that I do not have to click away from the bar first.
26. As Bruno on the desktop, I want `Ctrl+H` to be ignored while I am editing a Card, so
    that an edit in progress is never disturbed.
27. As Bruno, I want opening the Archive to scroll the list so the Archive is actually in
    view, so that the shortcut never appears to do nothing.
28. As Bruno, I want the Archive's contents to stay as they are (last seven local
    calendar days, "ver mais antigas", struck-through quiet rows), so that only its
    location and entry point change.
29. As Bruno, I want no Archive link and no reserved space at all when nothing has ever
    been marked Done, so that a fresh install has no trace of it.
30. As Bruno, I want an empty Open list to show nothing at all, so that the screen is a
    blank wall until I capture something (the interface reform decides what goes there).
31. As Bruno, I want the Undo toast and save-error banner to keep floating over the top
    edge exactly as today, so that revealing the Archive never moves them or the list.
32. As Bruno on the phone, I want the ✓ ✎ × controls to have a 44×44 px hit target, so
    that I can hit them without aiming.
33. As Bruno, I want the controls' glyphs to look exactly as they do today, so that the
    Card's visual stays untouched until the interface reform.
34. As Bruno, I want the enlarged targets to keep the Card's height and row layout, so
    that nothing on the wall reflows because of an invisible padding change.
35. As Bruno using a keyboard, I want the controls to stay reachable by Tab and
    revealed on focus exactly as today, so that the accessibility path is unchanged.
36. As Bruno, I want a resting Card's controls to remain untouchable (pointer-events
    none) even with the bigger targets, so that a plain tap or a swipe near the trailing
    edge never lands on an invisible button.
37. As Bruno, I want all of the above to respect `prefers-reduced-motion`, so that
    nothing here introduces motion the system asked to suppress.
38. As Bruno, I want the whole existing suite to stay green, so that this leva provably
    changes nothing it did not mean to.

## Implementation Decisions

### Naming

- The manifest `name` and `short_name`, the HTML `<title>`, the package name, the
  DESIGN.md `name` field and the build plugin's internal name all become "Slip"
  (package name lowercase). The base path, scope, start URL, icons and storage keys do
  **not** change: the installed app must keep its identity and its data.
- CONTEXT.md is already renamed (done during the grilling).

### Portrait lock

- The manifest gains `orientation: "portrait"`. No CSS or JS handling of landscape.
  Desktop browsers ignore the field, which is the desired behaviour.

### Dark chrome

- The palette module remains the only file with hex literals. Its chrome tokens
  (surface, capture ground, primary text, quiet text, hairline, toast ground, toast ink)
  become a **light/dark pair**; the Card swatches, `INK_ON_LIGHT`, `INK_ON_DARK` and
  `OVERDUE_RED` stay single, frozen values. The nine-swatch freeze in PRODUCT.md and
  DESIGN.md is untouched; both docs must be amended to say "no theme *toggle*" instead
  of "no dark mode", and to record that chrome follows the system scheme.
- The screen root (App) owns the scheme the same way it owns `wide`: a
  `(prefers-color-scheme: dark)` media query read once and subscribed to live. It
  exposes the resolved chrome tokens as **CSS custom properties on the screen's root
  element**; every component that today imports a chrome constant reads the matching
  variable instead. Card colours keep being imported directly. This avoids threading a
  `dark` prop through every component and keeps the palette as the sole source.
- The build-time theme-colour injection gains a second `theme-color` meta tag scoped
  with `media="(prefers-color-scheme: dark)"`, resolved from the dark surface token, so
  the installed window frame follows the page. The manifest keeps the light values
  (it accepts one value).
- Dark token values are chosen by the implementer within these constraints: surface is
  a warm near-black (the paper's dark sibling), primary text and quiet text clear 4.5:1
  on it, hairline is visible but quiet, toast inverts (ivory ground, charcoal ink) so it
  still floats. Values are recorded in the palette with the same commentary discipline.

### Archive at the top, revealed by pull / `Ctrl+H`

- The Archive component moves from after the Open list to **before** it inside the one
  scrolling region. Its collapsed form is the single link row "ver concluídas"; its
  open form is the link row "ocultar concluídas" followed by the rows exactly as today.
- The scrolling region is kept **always scrollable by at least the link row's height**
  whenever an Archive link exists: its content declares a minimum height of the
  region's own height plus the link row, so a two-Card list can still be pulled. When
  no Task has ever been Done, the Archive renders nothing and no extra height is
  reserved (fresh install has no trace).
- On mount, and whenever the Archive closes, the region's scroll position is set to
  **just past the link row**, hiding it. Pulling the list down (scrolling to the top)
  reveals it. Tapping opens the Archive; the region then scrolls to its top so the
  section is in view. Nothing opens automatically on reveal.
- The scrolling region sets `overscroll-behavior: contain` so that reaching its top on
  Android cannot chain into Chrome's pull-to-refresh.
- The Archive's open/closed state is **lifted to the screen root** so that the keyboard
  shortcut and the link drive the same state. `Ctrl+H` is a window-level keydown
  handler owned by the screen root. It toggles the Archive and, when opening, scrolls
  the region to the top. It is ignored when the event target is a Card's edit field.
  It is *not* ignored when the capture bar has focus (the bar consumes only Enter and
  Alt+digits).
- The `(min-width: 900px)` breakpoint and the desktop/phone layouts are unchanged. The
  shortcut is registered on both profiles (a phone with a keyboard gets it for free);
  the pull mechanics also exist on both (harmless on desktop).
- Empty Open list: the list component renders nothing for its sections. Any existing
  empty-state copy is removed.
- The fixed notification layer is untouched.

### 44px controls

- The three Card controls keep their glyph, font size, opacity/pointer-events
  behaviour and order. Each gains `minWidth: 44px; minHeight: 44px` with the glyph
  centred, and compensating negative margins so the controls' row occupies the same
  visual space as before and the Card's height does not change. No layout change on
  either profile.

## Testing Decisions

A good test here drives the rendered App (or Card) through real DOM events and asserts
what the user would observe: text, attributes, inline styles, scroll position, and the
resulting Task list. Never assert on component internals, hook state, or which module
computed a value. Mocks allowed: `matchMedia` (via the existing stubs, extended with a
`(prefers-color-scheme: dark)` profile), a fixed clock, and `localStorage`.

Seams, highest first (all existing):

1. **App rendered through the shared test scaffolding** (`App.test.tsx` prior art:
   "visual promoção 04" and "the notification layer" blocks). Covers dark chrome
   (root custom properties flip with the media stub; Card inline backgrounds do not),
   Archive position (first child of the scroller), pull mechanics (scroller content
   min-height, initial `scrollTop` past the link, `overscroll-behavior`), `Ctrl+H`
   toggle and its edit-field guard, tap-to-open not auto-open, no trace when nothing
   is Done, empty Open list renders nothing, notification layer unchanged.
2. **Card rendered through the same scaffolding** (`Card.test.tsx` prior art: the
   "keyboard controls" block). Covers the 44px minimums and unchanged glyph/reveal
   behaviour under both pointer profiles.
3. **Repository file assertions** (`publish.test.ts` prior art): manifest `name`,
   `short_name`, `orientation`; `<title>`; package name; second theme-color meta with
   the dark media attribute; no hex literal outside the palette module (a grep-style
   assertion over `src/`).

No new seam is introduced. The palette pair is tested only through seam 1 (does the
root flip?) and seam 3 (are the literals confined?), not directly.

## Out of Scope

- Anything about the capture bar: multi-line, Enter rules, send button, Kind dot and
  pop-up, centred pill. All Leva 1b.
- Card size, clamp, tooltip, single grid, stored Position, drag, trash, reflow
  animations. All Leva 2 (ADR 0002).
- Aesthetics of the revealed link, the empty state, the dark palette beyond the
  contrast constraints above, control glyph redesign. Leva 3 (interface reform).
- A dark/light toggle, any settings screen, dark variants of the nine Card swatches.
- Changing the Overdue red or the documented contrast exception.
- Parsing Deadlines from typed text (still deferred since Phase 1).

## Further Notes

- Chromium updates an installed PWA's name from the manifest on Android (with an "app
  updated" prompt); on Windows the Start-menu shortcut may keep "Tasks" until the app is
  reinstalled. Not a code concern; worth knowing when validating.
- Browser zoom is persisted per origin and shared with the installed window, so the
  user's density preference survives without a setting (grilling Q7).
- Gates: `npm test` (vitest) and `npx tsc -b`. No lint step exists.
