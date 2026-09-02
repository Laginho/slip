---
status: accepted
---

# Manual Position, constrained by Deadline

Until now the order of Open Tasks was entirely derived: Deadline ascending, Kind breaking
ties, dateless Tasks after every dated one in creation order. Nothing about order was
stored. The desktop wall wants to be a wall of post-its the user can rearrange, so each
Task now carries a stored Position, and the user can drag a Card to a new one.

The derived part that carried meaning stays: dated Tasks always precede dateless ones and
are grouped by Deadline, nearest first. Dragging can only move a Task among its peers
(same Deadline, or the dateless group). The Kind tiebreak is retired: a new Task simply
takes the last place among its peers.

Alternatives considered: fully free order (Deadline becomes only an initial hint, and the
one-glance "what is due first" reading is lost); reorder only among dateless Tasks (dated
Tasks sharing a day still had an arbitrary, unmovable order); cosmetic, unpersisted drag
(worse than nothing).

## Consequences

- **Position is the eighth stored field** and rides through sync like any other. Ingress
  validation (`toTask`) must accept it, and a stored Task without it needs a defined
  fallback so older blobs still load.
- **Every device assigns a Position at Capture**, including the phone, which cannot
  drag. "Last among peers" needs only the local list, so no device ever writes a null.
- **Reordering touches two or more Tasks** (insert-and-shift), each getting a fresh
  `updatedAt`. Whole-document sync (ADR 0001) handles this; concurrent drags on two
  devices are impossible for one person and are not handled.
- **Deadline editing stays absent.** Because a Task never changes Deadline, it never
  changes peer group, which is what keeps this rule simple. Adding Deadline editing
  later must decide where the moved Task lands.
- **The phone shows manual order but cannot change it.** Its horizontal swipe gestures
  are already taken, and a two-column list is not where rearranging pays off.
