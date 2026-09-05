import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { App } from "./App";
import { STORAGE_KEY, type Task } from "./store";
import { render, stubMediaWithChangeListener, stubNoMatchMedia, task, unmount } from "./testing";

// Layout fixtures must stay local even when this checkout has backend credentials.
vi.mock("./sync", async (importOriginal) => ({
  ...await importOriginal<typeof import("./sync")>(),
  sync: vi.fn(async (tasks: Task[]) => tasks),
}));

const NOW = new Date(2026, 7, 22);

const DATED_OPEN = [1, 2, 3, 4, 5].map((n) =>
  task({ id: `d${n}`, text: `tarefa datada ${n}`, deadline: "2026-08-30" }),
);
const DATELESS_OPEN = [1, 2].map((n) => task({ id: `s${n}`, text: `tarefa sem data ${n}` }));

/**
 * The wall grid (ticket 04), through App's real layout/media-query seam.
 * jsdom asserts declarations; column sizes and clipping also need a browser pass.
 */

async function renderTaskList(): Promise<HTMLElement> {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...DATED_OPEN, ...DATELESS_OPEN]));
  return render(<App />);
}

beforeEach(() => {
  stubNoMatchMedia();
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(async () => {
  await unmount();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("the wall grid (ticket 04)", () => {
  it.each([3, 4] as const)("row 1 — desktop: every section has %i centred columns, capped at 1248px", async (columns) => {
    stubMediaWithChangeListener((q) => q === "(min-width: 900px)" ||
      (columns === 4 && q === "(min-width: 1168px)"));
    const container = await renderTaskList();
    const lists = [...container.querySelectorAll('ul[role="list"]')] as HTMLElement[];

    expect(lists.length).toBe(2);

    for (const ul of lists) {
      expect(ul.style.gridTemplateColumns).toBe(`repeat(${columns}, minmax(260px, 300px))`);
      expect(ul.style.justifyContent).toBe("center");
      expect(ul.style.maxWidth).toBe("1248px");
      expect(ul.style.marginLeft).toBe("auto");
      expect(ul.style.marginRight).toBe("auto");
      expect(ul.style.display).toBe("grid");
      expect(ul.style.gap).toBe("16px");
      expect(ul.style.marginBottom).toBe("0px");
      expect(ul.style.padding).toBe("0px");
    }

    // The 24px section gap lives only on the dateless (second) section.
    expect(lists[0].style.marginTop).toBe("0px");
    expect(lists[1].style.marginTop).toBe("24px");
  });

  it("row 2 — phone (wide=false): every section is the byte-identical flex column", async () => {
    const container = await renderTaskList();
    const lists = [...container.querySelectorAll('ul[role="list"]')] as HTMLElement[];

    expect(lists.length).toBe(2);

    for (const ul of lists) {
      expect(ul.style.display).toBe("flex");
      expect(ul.style.flexDirection).toBe("column");
      expect(ul.style.gap).toBe("12px");
      expect(ul.style.gridTemplateColumns).toBe("");
      expect(ul.style.maxWidth).toBe("");
      expect(ul.style.padding).toBe("0px");
      expect(ul.style.marginLeft).toBe("0px");
      expect(ul.style.marginRight).toBe("0px");
      expect(ul.style.marginBottom).toBe("0px");
    }
    expect(lists[0].style.marginTop).toBe("0px");
    expect(lists[1].style.marginTop).toBe("24px");
  });

  it("resizes live from three to four columns and back to the phone column", async () => {
    const media = stubMediaWithChangeListener((q) => q === "(min-width: 900px)");
    const container = await renderTaskList();
    const list = container.querySelector("ul[role=list]") as HTMLElement;
    expect(list.style.gridTemplateColumns).toBe("repeat(3, minmax(260px, 300px))");
    await act(async () => {
      for (const listener of media.listeners.get("(min-width: 1168px)") ?? []) {
        listener({ matches: true } as MediaQueryListEvent);
      }
    });
    expect(list.style.gridTemplateColumns).toBe("repeat(4, minmax(260px, 300px))");
    await act(async () => {
      for (const query of ["(min-width: 1168px)", "(min-width: 900px)"]) {
        for (const listener of media.listeners.get(query) ?? []) {
          listener({ matches: false } as MediaQueryListEvent);
        }
      }
    });
    expect(list.style.display).toBe("flex");
    expect(list.style.gridTemplateColumns).toBe("");
    expect(list.style.marginLeft).toBe("0px");
    expect(list.style.marginBottom).toBe("0px");
  });
});
