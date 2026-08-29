# 03: Desktop becomes a wall of post-it Cards

**What to build:** At viewports 900px and wider, the Open Tasks render as a responsive
grid spanning the app's full width — a post-it wall. More columns appear as the
viewport grows, with roughly 240px minimum Card width. Order follows the store selector
exactly, read left-to-right then top-to-bottom: Deadline ascending, ties Work > College
> Chore, then dateless Tasks in creation order. Each Card keeps its natural height —
no row stretching — so bottoms are deliberately uneven. The Archive remains a quiet
expandable section below the wall, the capture bar stays pinned bottom spanning the
width, and every Card gesture and keyboard path is unchanged. Below 900px the single
phone column is byte-for-byte what ships today. No colour values change.

Context: `.scratch/polish-and-publish/spec.md` (Implementation Decisions → Desktop
post-it wall). Gate is visual, not unit-tested: match the exemplar Card and violate no
"do not".

**Blocked by:** None (can start immediately).

**Status:** complete

- [x] At 900px and above the Open list fills the viewport width in a responsive grid; column count grows with width
- [x] Grid order equals store selector order read left-to-right, top-to-bottom (dated first, ties by Kind, then dateless)
- [x] Cards render at natural height; rows do not stretch
- [x] Archive link/expansion sits below the wall; capture bar spans the bottom; gestures (double-click, hover ×, click-to-edit, swipes where applicable) still work
- [x] At narrow width nothing changed versus current behaviour
- [x] `npm test`, typecheck pass; visual gate deferred to ticket 04 review
