import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dispatch, render, task, unmount } from "./testing";
import type { Task } from "./store";

vi.mock("./sync", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./sync")>();
  return {
    ...actual,
    sync: vi.fn(actual.sync),
  };
});

import { sync } from "./sync";
import { useSession } from "./useSession";

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
let latestResult: ReturnType<typeof useSession> | null = null;

function Probe() {
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
    // Stub sync to return a controllable promise. The hook syncs immediately on
    // mount, so rendering puts that promise in flight and assigns the resolver.
    let resolveSync!: (tasks: Task[]) => void;
    freshSyncMock().mockImplementation(
      () =>
        new Promise<Task[]>((r) => {
          resolveSync = r;
        }),
    );

    await render(<Probe />);

    // Capture while the mount sync is in the air.
    await act(async () => {
      latestResult!.capture("mid-flight task", "work", null);
    });

    const tasksAfterCapture = latestResult!.tasks;
    expect(tasksAfterCapture).toHaveLength(1);
    expect(tasksAfterCapture[0].text).toBe("mid-flight task");

    // Resolve sync with a stale result (empty — computed before the capture existed).
    await act(async () => {
      resolveSync([]);
    });

    // The mid-flight capture must survive: higher updatedAt wins in merge.
    expect(latestResult!.tasks).toHaveLength(1);
    expect(latestResult!.tasks[0].text).toBe("mid-flight task");

    // Persisted by settle (merge + persist inside try/catch).
    expect(localStorage.getItem("tasks/v1")).not.toBeNull();
  });
});

describe("Debounce", () => {
  it("two mutations 1000ms apart produce one sync, 1500ms after the second", async () => {
    vi.useFakeTimers();
    const syncFn = freshSyncMock();
    syncFn.mockImplementation(async (local: Task[]) => local);

    await render(<Probe />);
    // Discount the immediate mount sync; only the debounced one is under test.
    syncFn.mockClear();

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

    await render(<Probe />);
    // Discount the immediate mount sync; only the debounced one is under test.
    syncFn.mockClear();

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
    freshSyncMock().mockImplementation(async (local: Task[]) => local);

    await render(<Probe />);

    // Seed a task.
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

    // Restore storage so a real write *could* land — proving the no-op below never
    // reaches it.
    vi.mocked(Storage.prototype.setItem).mockRestore();

    const tasksBefore = latestResult!.tasks;
    const syncFn = freshSyncMock();
    syncFn.mockClear();

    // Edit with blank text — the store keeps what was there and hands back the same
    // reference, so this mutation is a no-op that never touches storage.
    await act(async () => {
      latestResult!.edit(tasksBefore[0], "");
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

    await render(<Probe />);

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

    await render(<Probe />);

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

    await render(<Probe />);

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

    await render(<Probe />);

    const tasksBefore = latestResult!.tasks;
    let result!: boolean;
    await act(async () => {
      result = latestResult!.capture("will fail", "work", null);
    });

    expect(result).toBe(false);
    expect(latestResult!.tasks).toBe(tasksBefore); // same reference
    expect(latestResult!.saveError).toBe(true);
    expect(latestResult!.pending).toBeNull();
  });

  it("throwing setItem makes complete return false, adopt nothing, raise saveError, create no pending", async () => {
    freshSyncMock().mockImplementation(async (local: Task[]) => local);

    await render(<Probe />);

    await act(async () => {
      latestResult!.capture("existing", "work", null);
    });

    throwOnSetItem();
    const tasksBefore = latestResult!.tasks;
    let result!: boolean;
    await act(async () => {
      result = latestResult!.complete(latestResult!.tasks[0]);
    });

    expect(result).toBe(false);
    expect(latestResult!.tasks).toBe(tasksBefore);
    expect(latestResult!.saveError).toBe(true);
    expect(latestResult!.pending).toBeNull();
  });
});

describe("Sync on reconnect and on return to the foreground", () => {
  const setVisibility = (value: "visible" | "hidden") =>
    Object.defineProperty(document, "visibilityState", { value, configurable: true });

  afterEach(() => {
    setVisibility("visible");
  });

  it("syncs on the online event with the current list", async () => {
    const syncFn = freshSyncMock();
    syncFn.mockImplementation(async (local: Task[]) => local);

    await render(<Probe />);
    syncFn.mockClear();

    await dispatch(new Event("online"), window);

    expect(syncFn).toHaveBeenCalledTimes(1);
    expect(syncFn).toHaveBeenCalledWith(latestResult!.tasks);
  });

  it("ticket 07: pushes offline changes when the network returns", async () => {
    vi.useFakeTimers();
    const syncFn = freshSyncMock();
    syncFn.mockImplementation(async (local: Task[]) => local);

    await render(<Probe />);
    syncFn.mockClear();

    // The write never reached the server (offline): the debounced sync runs and, being
    // unable to publish, returns the local list.
    await act(async () => {
      latestResult!.capture("comprar pão", "chore", null);
    });
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    syncFn.mockClear();

    // Connectivity returns while the app is open: the queued offline write goes up.
    await dispatch(new Event("online"), window);

    expect(syncFn).toHaveBeenCalledTimes(1);
    const arg = syncFn.mock.calls[0][0] as Task[];
    expect(arg).toHaveLength(1);
    expect(arg[0].text).toBe("comprar pão");

    // No further timer repeats the round trip.
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    expect(syncFn).toHaveBeenCalledTimes(1);
  });

  it("folds the pending debounce into the online sync", async () => {
    vi.useFakeTimers();
    const syncFn = freshSyncMock();
    syncFn.mockImplementation(async (local: Task[]) => local);

    await render(<Probe />);
    syncFn.mockClear();

    await act(async () => {
      latestResult!.capture("x", "work", null);
    });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // The debounce is still pending; the online event must absorb it and fire now.
    await dispatch(new Event("online"), window);

    expect(syncFn).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    expect(syncFn).toHaveBeenCalledTimes(1);
  });

  it("syncs when the app returns to the foreground (visible)", async () => {
    const syncFn = freshSyncMock();
    syncFn.mockImplementation(async (local: Task[]) => local);

    await render(<Probe />);
    syncFn.mockClear();

    setVisibility("visible");
    await dispatch(new Event("visibilitychange"), document);

    expect(syncFn).toHaveBeenCalledTimes(1);
  });

  it("does not sync when the app goes to the background (hidden)", async () => {
    const syncFn = freshSyncMock();
    syncFn.mockImplementation(async (local: Task[]) => local);

    await render(<Probe />);
    syncFn.mockClear();

    setVisibility("hidden");
    await dispatch(new Event("visibilitychange"), document);

    expect(syncFn).not.toHaveBeenCalled();
  });

  it("does not over-match unrelated events (offline, focus)", async () => {
    const syncFn = freshSyncMock();
    syncFn.mockImplementation(async (local: Task[]) => local);

    await render(<Probe />);
    syncFn.mockClear();

    await dispatch(new Event("offline"), window);
    await dispatch(new Event("focus"), window);

    expect(syncFn).not.toHaveBeenCalled();
  });

  it("settle path: a sync landing on online is adopted and persisted", async () => {
    const syncFn = freshSyncMock();
    syncFn.mockImplementation(async (local: Task[]) => local);

    await render(<Probe />);
    syncFn.mockClear();

    // The next round trip (triggered by online) brings the other device's write down.
    syncFn.mockResolvedValue([
      task({ id: "pc-1", text: "feito no PC", kind: "work" }),
    ]);

    await dispatch(new Event("online"), window);

    expect(latestResult!.tasks.map((t) => t.text)).toContain("feito no PC");
    expect(localStorage.getItem("tasks/v1")).toContain("feito no PC");
  });

  it("does not sync after unmount, and no settle error is raised", async () => {
    const syncFn = freshSyncMock();
    syncFn.mockImplementation(async (local: Task[]) => local);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await render(<Probe />);
    syncFn.mockClear();
    await unmount();

    await dispatch(new Event("online"), window);
    setVisibility("visible");
    await dispatch(new Event("visibilitychange"), document);

    expect(syncFn).not.toHaveBeenCalled();
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
