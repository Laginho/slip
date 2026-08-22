# 04 — Capture: bottom input, Kind chips, optional deadline

Status: ready-for-agent
Blocked by: 02, 03

The most important interaction in the app. The bar is a WhatsApp message: type, Enter,
done. Anything that adds a step to that path is wrong.

## Acceptance criteria

- Input bar **pinned to the bottom** of the screen, always visible, chat-style
- Three Kind chips beside the input, coloured from the palette, one always selected
- Selected Kind is **sticky**: it stays after submitting, so consecutive Tasks of the
  same Kind cost zero extra taps. Persisted across restarts.
- Desktop: keys `1` / `2` / `3` select Work / College / Chore; the input is focused on
  launch and refocused after submit
- Enter submits and clears the input. Empty or whitespace-only input does nothing.
- Deadline is optional, set with a native `<input type="date">`. Never required, never
  blocks submit.
- Phone: the input stays visible above the on-screen keyboard

## Notes

- Do not move the input to the top. This was decided deliberately against the convention
  in every other task app — it inherits the chat muscle memory the app is replacing.
- Do not add a date-picker library. Native `<input type="date">` covers it.
- Do not add a "create task" modal, screen, or `+` button.
- Parsing the deadline out of the typed text ("amanhã", "sexta") is wanted but explicitly
  post-MVP. Do not attempt it here.

## Scope

Files: `src/components/CaptureBar.tsx`, plus wiring in `src/App.tsx`.
Budget: around 110 lines. Past 180, stop and ask.
Gate: not TDD — a test asserting an input exists proves nothing. Passes when: type, Enter,
and the Task appears with the sticky Kind, in under a second, with no other interaction.
