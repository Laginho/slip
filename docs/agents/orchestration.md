# PTMR bindings for this repo

The generic loop and role contracts live in `.agents/skills/ptmr/SKILL.md`. This file
binds what that skill leaves repo-specific.

## Issues and specs

Local markdown tracker — see `docs/agents/issue-tracker.md` for the full conventions.
In short: one feature per `.scratch/<feature-slug>/` directory, spec at `spec.md`,
tickets at `issues/<NN>-<slug>.md`.

## Branches

- Base branch: `main`. The user merges PRs; agents never push to `main`.
- Cycle work happens on the Traycer-managed `traycer/*` branch (or the worktree branch
  the session was launched on).

## Gates

Run from the repo root:

- Test suite: `npm test` (vitest, whole suite; single file: `npx vitest run <path>`)
- Typecheck: `npx tsc -b` (strict, `noUnusedLocals` — unused imports fail the gate)
- Lint: none configured. `tsc -b` is the only static gate; do not invent a lint step.
- Build (when a cycle touches build config or the PWA shell): `npm run build`

## PTMR paths

- Handoffs: `.scratch/<feature-slug>/handoffs/NN-<direction>.md` — gitignored, never committed.
- Ledger: `.scratch/<feature-slug>/ledger.md` — committed, one line per cycle.
- Both are created lazily on the first cycle of a feature.

## Repo specifics roles need

- Tests use `src/testing.tsx` (act-wrapped `render`/`unmount`, media stubs, `typeInto`) —
  no component-testing library; reuse those helpers, don't add one.
- `sync` is mocked per-file with `vi.mock("./sync")`; localStorage key is `tasks/v1`
  (`STORAGE_KEY` in `src/store.ts`).
- Domain language: `docs/agents/domain.md`. Triage strings: `docs/agents/triage-labels.md`.
