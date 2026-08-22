# 07 — Swipe animation

Status: ready-for-agent
Blocked by: 06

The one animation the MVP needs. Not polish: a swipe with no motion gives the user no
evidence anything happened.

## Acceptance criteria

- The Card follows the finger while dragging, 1:1, both directions
- On release past the threshold, the Card continues off-screen in the same direction and
  the list closes the gap behind it
- On release below the threshold, the Card springs back to rest
- Under 250ms for the exit
- CSS transforms and transitions only — no animation library
- Respects `prefers-reduced-motion`: the Card still leaves, without travel

## Notes

- The **double-tap** animation is deliberately not specified here. It gets designed by
  comparing candidates with `/prototype`, not from a prose description. Leave double-tap
  completing the Task with no special animation until then.
- Post-MVP and explicitly out of scope: done counter, confetti, easing polish, any
  celebration effect.

## Scope

Files: `src/components/Card.tsx` and its styles only.
Budget: around 60 lines. Past 120 you have reached for an animation library, which is cut.
Gate: not TDD. Passes by hand on a real phone — nothing else tells you if it feels right.
