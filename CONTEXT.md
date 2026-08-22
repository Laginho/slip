# Task Tracker

A single-user personal task tracker. It replaces a solo WhatsApp group used as a task
log, whose failure was that chat cannot mark anything as finished.

## Language

**Task**:
One thing the user intends to do, expressed as a single line of text.
_Avoid_: Ticket, item, todo, note

**Card**:
The visual representation of a Task in the interface. A Task is the concept; a Card is
how it is drawn.
_Avoid_: Post-it, tile, row

**Open**:
The state of a Task that has not been finished.
_Avoid_: Active, pending, todo, backlog

**Done**:
The state of a Task the user has finished. Done Tasks leave the main list.
_Avoid_: Completed, closed, resolved, archived

**Capture**:
The act of getting a new Task into the app. Optimised above every other interaction.
_Avoid_: Create, add, entry

**Review**:
The act of reading the list of Open Tasks to decide what to do next.
_Avoid_: Triage, planning

**Kind**:
Which part of the user's life a Task belongs to: Work, College, or Chore. Chosen at
Capture, drives the Card's hue, and breaks ties between Tasks sharing a Deadline
(Work first, then College, then Chore).
_Avoid_: Category, type, tag, label, project

**Deadline**:
The date by which a Task must be finished. Optional — a Task without one is still a
valid Task. Never a plan or an intention, always an external due date.
_Avoid_: Due date, do date, scheduled date, when

**Urgency**:
How close a Task's Deadline is, expressed as the intensity of its Card's colour.
Always derived, never chosen by the user.
_Avoid_: Priority, importance, severity

**Archive**:
Every Task the user has ever marked Done. Kept forever; only the most recent week is
shown without asking.
_Avoid_: History, log, trash, completed list

**Overdue**:
The state of an Open Task whose Deadline has passed. Shown with how many days late it
is. Its Deadline is never silently rewritten.
_Avoid_: Late, expired, missed

**Deleted**:
A Task the user discarded without finishing it. Never shown anywhere again, but never
erased from storage either — the record is what keeps it deleted on every device.
_Avoid_: Removed, purged, trashed
