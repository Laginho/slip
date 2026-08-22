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
    const undone = restore(remove([before], "a"), before);
    expect(undone[0].updatedAt).toBe(9000);
  });

  it("persists, and reinserts a Task that is no longer in the list", () => {
    const before = task({ id: "a" });
    const undone = restore([], before);
    expect(undone).toHaveLength(1);
    expect(load()).toEqual(undone);
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
