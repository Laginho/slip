# 01 — PWA scaffold and installable shell

Status: ready-for-agent
Blocked by: —
Delegation: build this before delegating anything else; it sets the pattern the rest copies

Set up the project and prove it installs on both targets. No task features yet.

**Stack (decided):** Vite + React +
TypeScript + `vite-plugin-pwa`. Reason: the plugin generates the manifest and service
worker instead of hand-writing them, and React is the most patternable choice for a weak
executor model on the later tickets. The considered alternative was static HTML with no
build step at all — genuinely viable for twenty cards, rejected because swipe gestures,
undo and in-place editing get fiddly in hand-rolled DOM.

## Acceptance criteria

- `npm run dev` serves the app; `npm run build` produces a deployable static bundle
- Manifest with app name, icons, `display: standalone`
- Service worker caches the shell so the app opens with no network
- Installs on Android Chrome: own launcher icon, own window, no browser UI
- Installs on Windows via Edge or Chrome: Start menu entry, own window, no address bar
- One empty screen with the bottom input bar laid out (non-functional is fine here)
- Layout works at phone width and desktop width — no horizontal scroll at either

## Notes

- No router. There is one screen. The Archive (issue 08) is a section, not a route.
- No state library. See issue 03.
- Do not add a UI component library. Nine colours and a card do not need one.

## Scope

Files: `index.html`, `vite.config.ts`, `package.json`, `.env.example`, `src/main.tsx`, `src/App.tsx`, icon assets.
Budget: config and shell only. If you are writing app logic here, it belongs in a later ticket.
Gate: not TDD. Passes when it installs as a standalone window on Android and Windows and opens offline.
