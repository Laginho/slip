import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Task } from "./store";
import {
  STORAGE_KEY,
  archive,
  create,
  editText,
  load,
  openTasks,
  remove,
  restore,
  setDeadline,
  setDone,
} from "./store";

/** A Task with every field explicit, so a test never depends on a default. */
function task(over: Partial<Task> & Pick<Task, "id">): Task {
  return {
    text: over.id,
    kind: "work",
    deadline: null,
    done: false,
    deleted: false,
    updatedAt: 1,
    ...over,
  };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("load", () => {
  it("returns empty when nothing is stored", () => {
    expect(load()).toEqual([]);
  });

  it("returns empty for a malformed blob rather than crashing", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(load()).toEqual([]);
  });

  it("returns empty when the blob is valid JSON but not an array", () => {
    localStorage.setItem(STORAGE_KEY, '{"tasks":[]}');
    expect(load()).toEqual([]);
  });

  it("drops entries that are not shaped like a Task", () => {
    const good = task({ id: "a" });
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([good, null, 7, { id: "b" }, { ...good, id: 5 }]),
    );
    expect(load()).toEqual([good]);
  });

  it("rejects a Kind that is only an inherited property name", () => {
    // `kind in KIND_ORDER` would accept every one of these, and the bad record would
    // then yield NaN from the tiebreak and resolve no Card background.
    for (const kind of ["toString", "constructor", "__proto__", "valueOf", "", "Work"]) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([{ ...task({ id: "a" }), kind }]));
      expect(load(), kind).toEqual([]);
    }
  });

  it("returns empty when storage refuses the read", () => {
    // getItem itself can throw (Safari private mode, security policy). A crash on
    // launch would be worse than an empty screen.
    const spy = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("denied");
      });
    try {
      expect(load()).toEqual([]);
    } finally {
      spy.mockRestore();
    }
  });

  it("rejects a Deadline that is not a real YYYY-MM-DD date", () => {
    // The shape regex alone accepts the last three. An impossible date would sort
    // before 1 March, render as 30/02, and roll over to 2 March in the urgency maths.
    for (const deadline of ["23/08/2026", "2026-8-3", "amanhã", "", "2026-02-30", "2026-13-01", "2026-00-10"]) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([task({ id: "a", deadline })]));
      expect(load(), deadline).toEqual([]);
    }
  });

  it("accepts a real leap day", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([task({ id: "a", deadline: "2028-02-29" })]));
    expect(load()).toHaveLength(1);
  });

  it("rejects an updatedAt that cannot be ordered or is absurd", () => {
    // JSON `1e400` parses to Infinity, which poisons every comparison it reaches.
    localStorage.setItem(
      STORAGE_KEY,
      '[{"id":"a","text":"x","kind":"work","deadline":null,"done":false,"deleted":false,"updatedAt":1e400}]',
    );
    expect(load()).toEqual([]);

    for (const updatedAt of [
      Number.MAX_VALUE, // previous + 1 === previous, so the monotonic stamp stops moving
      1e308,
      9e15, // still incrementable, but dates the Task to the year 287396
      -1,
      1.5,
    ]) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([task({ id: "a", updatedAt })]));
      expect(load(), String(updatedAt)).toEqual([]);
    }
  });

  it("rejects a blank or whitespace-only id, and blank text", () => {
    for (const id of ["", "   "]) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([task({ id })]));
      expect(load(), JSON.stringify(id)).toEqual([]);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([task({ id: "a", text: "   " })]));
    expect(load()).toEqual([]);
  });

  it("rebuilds each Task from the seven canonical fields, dropping extras", () => {
    // This parses untrusted input: a hand-edited blob, or a sync payload from a table
    // anyone with the anon key can write. An eighth field must not ride along.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ ...task({ id: "a" }), priority: "high", note: "smuggled" }]),
    );
    const [loaded] = load();
    expect(Object.keys(loaded).sort()).toEqual([
      "deadline",
      "deleted",
      "done",
      "id",
      "kind",
      "text",
      "updatedAt",
    ]);
  });
});

describe("mutations", () => {
  it("create stamps updatedAt, defaults the flags, and persists", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);

    const next = create([], "pagar boleto", "chore", "2026-08-30");

    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({
      text: "pagar boleto",
      kind: "chore",
      deadline: "2026-08-30",
      done: false,
      deleted: false,
      updatedAt: 1000,
    });
    expect(next[0].id).toBeTruthy();
    expect(load()).toEqual(next);
  });

  it("create defaults deadline to null", () => {
    expect(create([], "sem prazo", "work")[0].deadline).toBeNull();
  });

  it("every mutation restamps updatedAt and persists", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    const start = [task({ id: "a", updatedAt: 1 }), task({ id: "b", updatedAt: 1 })];

    // Each mutation writes, so they have to be run and asserted one at a time --
    // evaluating them all up front would leave only the last one's blob in storage.
    const cases: Array<[string, (tasks: Task[]) => Task[]]> = [
      ["editText", (tasks) => editText(tasks, "a", "novo texto")],
      ["setDeadline", (tasks) => setDeadline(tasks, "a", "2026-09-01")],
      ["setDone", (tasks) => setDone(tasks, "a", true)],
      ["remove", (tasks) => remove(tasks, "a")],
    ];

    for (const [name, run] of cases) {
      const next = run(start);
      const touched = next.find((t) => t.id === "a")!;
      const untouched = next.find((t) => t.id === "b")!;
      expect(touched.updatedAt, name).toBe(1000);
      expect(untouched.updatedAt, name).toBe(1);
      expect(load(), name).toEqual(next);
    }
  });

  it("applies the intended field change", () => {
    const start = [task({ id: "a" })];
    expect(editText(start, "a", "outro")[0].text).toBe("outro");
    expect(setDeadline(start, "a", "2026-09-01")[0].deadline).toBe("2026-09-01");
    expect(setDeadline(start, "a", null)[0].deadline).toBeNull();
    expect(setDone(start, "a", true)[0].done).toBe(true);
  });

  it("remove is a soft delete: the record survives, flagged", () => {
    const next = remove([task({ id: "a" })], "a");
    expect(next).toHaveLength(1);
    expect(next[0].deleted).toBe(true);
    expect(load()).toHaveLength(1);
  });

  it("leaves the list untouched when the id is unknown", () => {
    const start = [task({ id: "a" })];
    expect(setDone(start, "nope", true)).toEqual(start);
  });

  it("refuses to create a Task with no text", () => {
    expect(create([], "   ", "work")).toEqual([]);
    expect(create([], "", "work")).toEqual([]);
  });

  it("refuses to erase the text of an existing Task", () => {
    // Clearing the field during an in-place edit is not a delete.
    const start = [task({ id: "a", text: "original" })];
    expect(editText(start, "a", "   ")).toEqual(start);
  });

  it("keeps updatedAt climbing even when the wall clock steps backwards", () => {
    // NTP correction or a timezone change. Without this the later edit loses the
    // merge to the earlier one and the user's change silently reverts.
    vi.useFakeTimers();
    vi.setSystemTime(5000);
    const created = create([], "uma tarefa", "work");
    vi.setSystemTime(1000);
    const edited = setDone(created, created[0].id, true);
    expect(edited[0].updatedAt).toBeGreaterThan(created[0].updatedAt);
  });

  it("keeps boundary stamps loadable after mutation", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    const ceiling = Date.UTC(2100, 0, 1);

    const atCeiling = [task({ id: "ceiling", updatedAt: ceiling })];
    const once = setDone(atCeiling, "ceiling", true);
    expect(once[0].updatedAt).toBe(ceiling);
    expect(load()).toEqual(once);

    const nearCeiling = [task({ id: "near", updatedAt: ceiling - 1 })];
    const first = setDone(nearCeiling, "near", true);
    const second = editText(first, "near", "still loadable");
    expect(first[0].updatedAt).toBe(ceiling);
    expect(second[0].updatedAt).toBe(ceiling);
    expect(load()).toEqual(second);
  });

  it("bounds an implausible system clock to the persisted domain", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2200, 0, 1));

    const created = create([], "future-proof", "work");
    expect(created[0].updatedAt).toBe(Date.UTC(2100, 0, 1));
    expect(load()).toEqual(created);
  });
});

describe("restore (the undo primitive)", () => {
  it("puts every user-visible field back", () => {
    const before = task({ id: "a", text: "original", deadline: "2026-08-25", updatedAt: 5 });
    const after = remove(setDone([before], "a", true), "a");
    expect(after[0]).toMatchObject({ done: true, deleted: true });

    const undone = restore(after, before);
    expect(undone[0]).toMatchObject({
      id: "a",
      text: "original",
      deadline: "2026-08-25",
      done: false,
      deleted: false,
    });
  });

  it("restamps updatedAt instead of replaying the old one", () => {
    // Restoring must win the sync merge against the copy it is undoing, and the
    // remote may already hold that delete. An old updatedAt would lose and the
    // Task would silently vanish again on the next sync.
    vi.useFakeTimers();
    vi.setSystemTime(9000);
    const before = task({ id: "a", updatedAt: 5 });
    const deleted = remove([before], "a");
    const undone = restore(deleted, before);
    expect(undone[0].updatedAt).toBeGreaterThan(before.updatedAt);
    expect(undone[0].updatedAt).toBeGreaterThan(deleted[0].updatedAt);
  });

  it("beats the delete even when both land in the same millisecond", () => {
    // The merge rule only promises the *higher* updatedAt wins. A tie is resolved
    // arbitrarily, and if the tombstone wins the Task vanishes at the next sync --
    // which is merge case 4, the bug this whole design exists to prevent.
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    const before = task({ id: "a", updatedAt: 1000 });
    const deleted = remove([before], "a");
    const undone = restore(deleted, before);
    expect(deleted[0].deleted).toBe(true);
    expect(undone[0].deleted).toBe(false);
    expect(undone[0].updatedAt).toBeGreaterThan(deleted[0].updatedAt);
  });

  it("persists, and reinserts a Task that is no longer in the list", () => {
    const before = task({ id: "a" });
    const undone = restore([], before);
    expect(undone).toHaveLength(1);
    expect(load()).toEqual(undone);
  });
});

describe("the undo window (issue 06)", () => {
  /** Everything the user can see. updatedAt is expected to move; nothing else may. */
  function visible(task: Task) {
    const { id, text, kind, deadline, done, deleted } = task;
    return { id, text, kind, deadline, done, deleted };
  }

  it("complete then undo puts the Task back in the Open list", () => {
    const before = task({ id: "a", text: "entregar relatório", deadline: "2026-08-30" });

    const completed = setDone([before], "a", true);
    expect(openTasks(completed)).toEqual([]);
    expect(archive(completed).map((t) => t.id)).toEqual(["a"]);

    const undone = restore(completed, before);
    expect(visible(undone[0])).toEqual(visible(before));
    expect(openTasks(undone).map((t) => t.id)).toEqual(["a"]);
    expect(archive(undone)).toEqual([]);
  });

  it("delete then undo puts the Task back in the Open list", () => {
    const before = task({ id: "a", text: "pagar aluguel" });

    const removed = remove([before], "a");
    expect(openTasks(removed)).toEqual([]);
    expect(archive(removed)).toEqual([]);

    const undone = restore(removed, before);
    expect(visible(undone[0])).toEqual(visible(before));
    expect(openTasks(undone).map((t) => t.id)).toEqual(["a"]);
  });

  it("a second action leaves the first one applied", () => {
    // Undo is per-action, not a stack: a second action replaces the pending toast and
    // applies the first. That falls out of applying each action immediately -- the
    // toast only ever holds a snapshot to restore from, never a deferred commit.
    const start = [task({ id: "a" }), task({ id: "b" })];

    const afterFirst = setDone(start, "a", true);
    const afterSecond = remove(afterFirst, "b");

    expect(afterSecond.find((t) => t.id === "a")!.done).toBe(true);
    expect(afterSecond.find((t) => t.id === "b")!.deleted).toBe(true);
    expect(openTasks(afterSecond)).toEqual([]);
    // Undoing the second must not disturb the first.
    const undone = restore(afterSecond, start[1]);
    expect(undone.find((t) => t.id === "a")!.done).toBe(true);
    expect(openTasks(undone).map((t) => t.id)).toEqual(["b"]);
  });
});

describe("deadline domain closure", () => {
  // The same classes load() already rejects: malformed shapes, impossible calendar
  // dates, and a 29 February that only exists in leap years.
  const INVALID: string[] = [
    "23/08/2026",
    "2026-8-3",
    "amanhã",
    "",
    "2026-02-30", // the shape regex alone accepts this one
    "2026-13-01",
    "2026-00-10",
    "2027-02-29", // not a leap year
  ];

  it("create normalizes an invalid deadline to null instead of persisting an unloadable Task", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);

    for (const deadline of INVALID) {
      const next = create([], "entregar relatório", "work", deadline);
      expect(next, deadline).toHaveLength(1);
      // The Task survives; it just loses its deadline.
      expect(next[0].deadline, deadline).toBeNull();
      // And what was written is exactly what the next launch reads back.
      expect(load(), deadline).toEqual(next);
    }
  });

  it("create accepts a real leap day and round-trips it", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);

    const next = create([], "revisar prova", "college", "2028-02-29");
    expect(next[0].deadline).toBe("2028-02-29");
    expect(load()).toEqual(next);
  });

  it("setDeadline ignores an invalid deadline entirely: no write, no restamp", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);

    for (const deadline of INVALID) {
      localStorage.clear();
      const start = [task({ id: "a", deadline: "2026-09-01", updatedAt: 5 })];

      const next = setDeadline(start, "a", deadline);

      // The existing valid state is kept as-is -- not erased in favour of null.
      expect(next, deadline).toEqual(start);
      // A no-op does not touch storage either.
      expect(load(), deadline).toEqual([]);
    }
  });

  it("setDeadline accepts a real leap day and round-trips it", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);

    const next = setDeadline([task({ id: "a" })], "a", "2028-02-29");
    expect(next[0].deadline).toBe("2028-02-29");
    expect(load()).toEqual(next);
  });
});

describe("openTasks", () => {
  it("orders dated Tasks by deadline ascending", () => {
    const tasks = [
      task({ id: "later", deadline: "2026-09-10" }),
      task({ id: "soon", deadline: "2026-08-23" }),
      task({ id: "mid", deadline: "2026-08-30" }),
    ];
    expect(openTasks(tasks).map((t) => t.id)).toEqual(["soon", "mid", "later"]);
  });

  it("breaks a shared deadline Work > College > Chore, ignoring insertion order", () => {
    const tasks = [
      task({ id: "chore", kind: "chore", deadline: "2026-08-30" }),
      task({ id: "college", kind: "college", deadline: "2026-08-30" }),
      task({ id: "work", kind: "work", deadline: "2026-08-30" }),
    ];
    expect(openTasks(tasks).map((t) => t.id)).toEqual(["work", "college", "chore"]);
  });

  it("puts dateless Tasks after every dated one, in creation order", () => {
    const tasks = [
      task({ id: "no-1" }),
      task({ id: "dated", deadline: "2026-12-31" }),
      task({ id: "no-2" }),
      task({ id: "no-3" }),
    ];
    expect(openTasks(tasks).map((t) => t.id)).toEqual(["dated", "no-1", "no-2", "no-3"]);
  });

  it("does not apply the Kind tiebreak to dateless Tasks", () => {
    // The tiebreak exists to order Tasks that share a Deadline. Dateless Tasks are
    // ordered by creation alone, so a Chore captured first stays above a later Work.
    const tasks = [
      task({ id: "chore-first", kind: "chore" }),
      task({ id: "college-second", kind: "college" }),
      task({ id: "work-third", kind: "work" }),
    ];
    expect(openTasks(tasks).map((t) => t.id)).toEqual([
      "chore-first",
      "college-second",
      "work-third",
    ]);
  });

  it("excludes done and deleted Tasks", () => {
    const tasks = [
      task({ id: "open" }),
      task({ id: "done", done: true }),
      task({ id: "gone", deleted: true }),
      task({ id: "both", done: true, deleted: true }),
    ];
    expect(openTasks(tasks).map((t) => t.id)).toEqual(["open"]);
  });
});

describe("archive", () => {
  it("returns done Tasks newest first", () => {
    const tasks = [
      task({ id: "old", done: true, updatedAt: 100 }),
      task({ id: "new", done: true, updatedAt: 300 }),
      task({ id: "mid", done: true, updatedAt: 200 }),
    ];
    expect(archive(tasks).map((t) => t.id)).toEqual(["new", "mid", "old"]);
  });

  it("excludes open Tasks, and deleted ones even when done", () => {
    const tasks = [
      task({ id: "done", done: true }),
      task({ id: "open" }),
      task({ id: "deleted-done", done: true, deleted: true }),
      task({ id: "deleted-open", deleted: true }),
    ];
    expect(archive(tasks).map((t) => t.id)).toEqual(["done"]);
  });
});
