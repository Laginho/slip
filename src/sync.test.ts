import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Task } from "./store";
import { STORAGE_KEY } from "./store";
import { merge, sync } from "./sync";

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
  vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

/**
 * The six cases from the spec's merge table. These are the objective check on this
 * ticket; case 4 is the bug the entire local-first design exists to prevent.
 */
describe("merge — the six spec cases", () => {
  it("1. union by id: a Task on only one side survives", () => {
    const a = task({ id: "a" });
    const b = task({ id: "b" });
    const merged = merge([a], [b]);
    expect(merged).toHaveLength(2);
    expect(merged.map((t) => t.id).sort()).toEqual(["a", "b"]);
  });

  it("2. local wins when local is newer", () => {
    const merged = merge(
      [task({ id: "a", done: false, updatedAt: 200 })],
      [task({ id: "a", done: true, updatedAt: 100 })],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].done).toBe(false);
  });

  it("3. remote wins when remote is newer", () => {
    const merged = merge(
      [task({ id: "a", done: false, updatedAt: 100 })],
      [task({ id: "a", done: true, updatedAt: 200 })],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].done).toBe(true);
  });

  it("4. a deleted Task must not resurrect", () => {
    // The case this whole design exists for. A naive union brings the Task back on
    // every sync, forever, because the other device still holds an undeleted copy.
    const merged = merge(
      [task({ id: "a", deleted: true, updatedAt: 200 })],
      [task({ id: "a", deleted: false, updatedAt: 100 })],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].deleted).toBe(true);
  });

  it("5. a remote tombstone for a Task never seen locally arrives deleted", () => {
    const merged = merge([], [task({ id: "a", deleted: true })]);
    expect(merged).toHaveLength(1);
    expect(merged[0].deleted).toBe(true);
  });

  it("6. equal timestamps pick a deterministic winner, with no duplicate", () => {
    const local = task({ id: "a", text: "x", updatedAt: 100 });
    const remote = task({ id: "a", text: "y", updatedAt: 100 });

    const one = merge([local], [remote]);
    const other = merge([remote], [local]);

    expect(one).toHaveLength(1);
    expect(other).toHaveLength(1);
    // Deterministic *and* convergent: both devices must reach the same answer, or they
    // would each keep their own copy and disagree forever.
    expect(one[0]).toEqual(other[0]);
  });
});

describe("merge — beyond the table", () => {
  it("never duplicates an id, however many times it appears", () => {
    const merged = merge(
      [task({ id: "a", updatedAt: 1 }), task({ id: "b", updatedAt: 1 })],
      [task({ id: "a", updatedAt: 2 }), task({ id: "b", updatedAt: 2 })],
    );
    expect(merged).toHaveLength(2);
  });

  it("keeps deleted Tasks in the merged list rather than dropping them", () => {
    // Dropping a tombstone would let the other device resurrect the Task next time.
    const merged = merge([task({ id: "a", deleted: true, updatedAt: 5 })], []);
    expect(merged).toHaveLength(1);
  });

  it("is unchanged by merging with an empty remote", () => {
    const local = [task({ id: "a" }), task({ id: "b" })];
    expect(merge(local, [])).toEqual(local);
  });

  it("discards remote rows that are not valid Tasks", () => {
    // The table has one baked-in key and no auth, so anything could be in it.
    const merged = merge([task({ id: "a" })], [
      { id: "bad", kind: "toString" },
      null,
      { id: "worse", text: "x", kind: "work", deadline: "2026-02-30", done: false, deleted: false, updatedAt: 1 },
    ] as unknown as Task[]);
    expect(merged.map((t) => t.id)).toEqual(["a"]);
  });
});

describe("sync", () => {
  it("does nothing and never touches the network when unconfigured", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const local = [task({ id: "a" })];
    expect(await sync(local)).toEqual(local);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns the local list unchanged when offline", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    const local = [task({ id: "a" })];
    // Silent and harmless: no throw, no error state, the app works exactly as before.
    expect(await sync(local)).toEqual(local);
  });

  it("returns the local list unchanged when the server errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("nope", { status: 500 }),
    );
    const local = [task({ id: "a" })];
    expect(await sync(local)).toEqual(local);
  });

  it("merges what comes back and persists the result", async () => {
    const remote = task({ id: "b", text: "do servidor" });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json([remote]));

    const local = [task({ id: "a" })];
    const merged = await sync(local);

    expect(merged.map((t) => t.id).sort()).toEqual(["a", "b"]);
    // Local storage is authoritative for the UI, so the merge has to land there too.
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toHaveLength(2);
    expect(fetchSpy).toHaveBeenCalledTimes(2); // one read, one write
  });

  it("sends the whole list, not a diff", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json([]));

    const local = [task({ id: "a" }), task({ id: "b" }), task({ id: "c", deleted: true })];
    await sync(local);

    const write = fetchSpy.mock.calls[1];
    const body = JSON.parse((write[1] as RequestInit).body as string);
    expect(body).toHaveLength(3);
    // Deleted Tasks sync like any other Task -- that is what keeps them deleted.
    expect(body.map((t: Task) => t.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("still returns the merge when the write half fails", async () => {
    const remote = task({ id: "b" });
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json([remote]))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const merged = await sync([task({ id: "a" })]);
    expect(merged.map((t) => t.id).sort()).toEqual(["a", "b"]);
  });
});
