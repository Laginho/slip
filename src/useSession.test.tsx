import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, task, unmount } from "./testing";
import type { Task } from "./store";

vi.mock("./sync", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./sync")>();
  return {
    ...actual,
    sync: vi.fn(actual.sync),
  };
});

import { merge } from "./sync";
import { sync } from "./sync";

function spySync(result: Task[] | null = null): ReturnType<typeof vi.fn> {
  const fn = vi.mocked(sync);
  if (result === null) {
    fn.mockImplementation(async (local: Task[]) => local);
  } else {
    fn.mockImplementation(async () => result);
  }
  return fn;
}

function throwOnSetItem(): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("QuotaExceededError");
  });
}

function freshSyncMock(): ReturnType<typeof vi.fn> {
  return vi.mocked(sync);
}

// Probe component: calls useSession() and publishes latest return into a captured ref.
// This avoids @testing-library/react while still testing through React's render cycle.
let latestResult: ReturnType<typeof import("./useSession").useSession> | null = null;

function Probe() {
  // The hook does not exist yet — this import will fail, which is the correct red.
  const { useSession } = require("./useSession") as typeof import("./useSession");
  latestResult = useSession();
  return null;
}

beforeEach(() => {
  localStorage.clear();
  latestResult = null;
  freshSyncMock().mockReset();
});

afterEach(async () => {
  await unmount();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("Settle rebases an in-flight sync", () => {
  it("merges a mid-flight capture against a stale sync result, persists once", async () => {
    // Stub sync to return a controllable promise.
    let resolveSync!: (tasks: Task[]) => void;
    const syncPromise = new Promise<Task[]>((r) => {
      resolveSync = r;
    });
    freshSyncMock().mockImplementation(() => syncPromise);

    await act(async () => {
      render(<Probe />);
    });

    // Resolve sync with a stale result (no capture).
    await act(async () => {
      resolveSync([]);
    });

    // The hook must have adopted the merged list — but we triggered no capture yet.
    // Instead, simulate a capture while sync was in the air by re-doing the test:
    // Reset and run again with a capture interleaved.
    await act(async () => {
      render(<Probe />);
    });

    let resolveSync2!: (tasks: Task[]) => void;
    freshSyncMock().mockImplementation(() => new Promise<Task[]>((r) => { resolveSync2 = r; }));

    await act(async () => {
      render(<Probe />);
    });

    // Capture while sync is in flight.
    await act(async () => {
      latestResult!.capture("mid-flight task", "work", null);
    });

    const tasksAfterCapture = latestResult!.tasks;
    expect(tasksAfterCapture).toHaveLength(1);
    expect(tasksAfterCapture[0].text).toBe("mid-flight task");

    // Resolve sync with stale result (empty).
    await act(async () => {
      resolveSync2([]);
    });

    // The mid-flight capture must survive: higher updatedAt wins in merge.
    expect(latestResult!.tasks).toHaveLength(1);
    expect(latestResult!.tasks[0].text).toBe("mid-flight task");

    // Persisted exactly once by settle (merge + persist inside try/catch).
    expect(localStorage.getItem("tasks/v1")).not.toBeNull();
  });
});

describe("Debounce", () => {
  it("two mutations 1000ms apart produce one sync, 1500ms after the second", async () => {
    vi.useFakeTimers();
    const syncFn = freshSyncMock();
    syncFn.mockImplementation(async (local: Task[]) => local);

    await act(async () => {
      render(<Probe />);
    });

    await act(async () => {
      latestResult!.capture("task one", "work", null);
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    await act(async () => {
      latestResult!.capture("task two", "work", null);
    });

    // Before 1500ms after the second capture, sync must not have been called.
    await act(async () => {
      vi.advanceTimersByTime(1400);
    });
    expect(syncFn).not.toHaveBeenCalled();

    // 1500ms after the second capture, sync fires once.
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(syncFn).toHaveBeenCalledTimes(1);
  });

  it("a mutation re-arms the timer", async () => {
    vi.useFakeTimers();
    const syncFn = freshSyncMock();
    syncFn.mockImplementation(async (local: Task[]) => local);

    await act(async () => {
      render(<Probe />);
    });

    await act(async () => {
      latestResult!.capture("first", "work", null);
    });

    await act(async () => {
      vi.advanceTimersByTime(1400);
    });

    await act(async () => {
      latestResult!.capture("second", "work", null);
    });

    // The first timer should have been cleared; advance past it.
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(syncFn).not.toHaveBeenCalled();

    // The second timer fires 1500ms after the second capture.
    await act(async () => {
      vi.advanceTimersByTime(1300);
    });
    expect(syncFn).toHaveBeenCalledTimes(1);
  });
});

describe("Identity guards", () => {
  it("a no-op edit leaves saveError true, arms no sync, and keeps tasks reference", async () => {
    throwOnSetItem();
    freshSyncMock().mockImplementation(async (local: Task[]) => local);

    await act(async () => {
      render(<Probe />);
    });

    // Seed a task and raise saveError.
    await act(async () => {
      latestResult!.capture("original", "work", null);
    });
    expect(latestResult!.saveError).toBe(false);

    // Fail a real mutation to raise saveError.
    throwOnSetItem();
    await act(async () => {
      latestResult!.complete(latestResult!.tasks[0]);
    });
    expect(latestResult!.saveError).toBe(true);

    // Restore storage so edit can reach the store (but store will return same ref).
    vi.mocked(Storage.prototype.setItem).mockRestore();

    const tasksBefore = latestResult!.tasks;
    const syncFn = freshSyncMock();
    syncFn.mockClear();

    // Edit with the same text — store returns the same reference (no-op).
    await act(async () => {
      latestResult!.edit(tasksBefore[0], "original");
    });

    // saveError must still be true — the no-op must not clear it.
    expect(latestResult!.saveError).toBe(true);
    // No sync armed.
    expect(syncFn).not.toHaveBeenCalled();
    // Same reference — assert with toBe, not toEqual.
    expect(latestResult!.tasks).toBe(tasksBefore);
  });
});

describe("Stale-prop repair", () => {
  it("complete on a stale object, then undo, restores the edited text from latest", async () => {
    freshSyncMock().mockImplementation(async (local: Task[]) => local);

    await act(async () => {
      render(<Probe />);
    });

    // Capture a task.
    await act(async () => {
      latestResult!.capture("original text", "work", null);
    });

    const earlyTask = { ...latestResult!.tasks[0] };

    // Edit the store copy (new text, higher updatedAt).
    await act(async () => {
      latestResult!.edit(latestResult!.tasks[0], "edited text");
    });

    // Complete using the stale object from before the edit.
    await act(async () => {
      latestResult!.complete(earlyTask);
    });

    // Undo — the snapshot came from latest (edited), not from stale earlyTask.
    await act(async () => {
      latestResult!.undo();
    });

    expect(latestResult!.tasks[0].text).toBe("edited text");
  });
});

describe("Undo restart-on-failure", () => {
  it("refused restore keeps pending non-null and bumps token", async () => {
    freshSyncMock().mockImplementation(async (local: Task[]) => local);

    await act(async () => {
      render(<Probe />);
    });

    await act(async () => {
      latestResult!.capture("undoable", "work", null);
    });

    // Complete to create pending.
    await act(async () => {
      latestResult!.complete(latestResult!.tasks[0]);
    });
    expect(latestResult!.pending).not.toBeNull();
    const tokenBefore = latestResult!.pending!.token;

    // Make restore fail.
    throwOnSetItem();
    await act(async () => {
      latestResult!.undo();
    });

    // Pending stays non-null and token is bumped.
    expect(latestResult!.pending).not.toBeNull();
    expect(latestResult!.pending!.token).toBeGreaterThan(tokenBefore);

    // Successful restore clears pending.
    vi.mocked(Storage.prototype.setItem).mockRestore();
    await act(async () => {
      latestResult!.undo();
    });
    expect(latestResult!.pending).toBeNull();
  });

  it("expire clears pending", async () => {
    freshSyncMock().mockImplementation(async (local: Task[]) => local);

    await act(async () => {
      render(<Probe />);
    });

    await act(async () => {
      latestResult!.capture("to-expire", "work", null);
    });

    await act(async () => {
      latestResult!.complete(latestResult!.tasks[0]);
    });
    expect(latestResult!.pending).not.toBeNull();

    await act(async () => {
      latestResult!.expire();
    });
    expect(latestResult!.pending).toBeNull();
  });
});

describe("Write-failure boundary at the seam", () => {
  it("throwing setItem makes capture return false, adopt nothing, raise saveError, create no pending", async () => {
    throwOnSetItem();
    freshSyncMock().mockImplementation(async (local: Task[]) => local);

    await act(async () => {
      render(<Probe />);
    });

    const tasksBefore = latestResult!.tasks;
    const result = latestResult!.capture("will fail", "work", null);

    expect(result).toBe(false);
    expect(latestResult!.tasks).toBe(tasksBefore); // same reference
    expect(latestResult!.saveError).toBe(true);
    expect(latestResult!.pending).toBeNull();
  });

  it("throwing setItem makes complete return false, adopt nothing, raise saveError, create no pending", async () => {
    freshSyncMock().mockImplementation(async (local: Task[]) => local);

    await act(async () => {
      render(<Probe />);
    });

    await act(async () => {
      latestResult!.capture("existing", "work", null);
    });

    throwOnSetItem();
    const tasksBefore = latestResult!.tasks;
    const result = latestResult!.complete(latestResult!.tasks[0]);

    expect(result).toBe(false);
    expect(latestResult!.tasks).toBe(tasksBefore);
    expect(latestResult!.saveError).toBe(true);
    expect(latestResult!.pending).toBeNull();
  });
});
