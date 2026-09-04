import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TaskList } from "./components/TaskList";
import { render, stubNoMatchMedia, task, unmount } from "./testing";

const NOW = new Date(2026, 7, 22);

const DATED_OPEN = [1, 2, 3, 4, 5].map((n) =>
  task({ id: `d${n}`, text: `tarefa datada ${n}`, deadline: "2026-08-30" }),
);
const DATELESS_OPEN = [1, 2].map((n) => task({ id: `s${n}`, text: `tarefa sem data ${n}` }));

/**
 * The wall grid (ticket 04). Rendering TaskList directly (not through App) so this
 * cycle owns the grid assertions in a fileApp.test.tsx never touches. jsdom has no
 * layout engine: everything here is the declared inline style.
 */

async function renderTaskList(wide: boolean): Promise<HTMLElement> {
  return render(
    <TaskList
      tasks={[...DATED_OPEN, ...DATELESS_OPEN]}
      now={NOW}
      wide={wide}
      onComplete={() => true}
      onDelete={() => true}
      onEdit={() => true}
    />,
  );
}

beforeEach(() => {
  stubNoMatchMedia();
});

afterEach(async () => {
  await unmount();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the wall grid (ticket 04)", () => {
  it("row 1 — wall (wide=true): every section is the centred auto-fill grid, capped at 1248px", async () => {
    const container = await renderTaskList(true);
    const lists = [...container.querySelectorAll('ul[role="list"]')] as HTMLElement[];

    expect(lists.length).toBe(2);

    for (const ul of lists) {
      expect(ul.style.gridTemplateColumns).toBe("repeat(auto-fill, minmax(260px, 300px))");
      expect(ul.style.justifyContent).toBe("center");
      expect(ul.style.maxWidth).toBe("1248px");
      expect(ul.style.marginLeft).toBe("auto");
      expect(ul.style.marginRight).toBe("auto");
      expect(ul.style.display).toBe("grid");
      expect(ul.style.gap).toBe("16px");
    }

    // The 24px section gap lives only on the dateless (second) section.
    expect(lists[0].style.marginTop).toBe("");
    expect(lists[1].style.marginTop).toBe("24px");
  });

  it("row 2 — phone (wide=false): every section is the byte-identical flex column", async () => {
    const container = await renderTaskList(false);
    const lists = [...container.querySelectorAll('ul[role="list"]')] as HTMLElement[];

    expect(lists.length).toBe(2);

    for (const ul of lists) {
      expect(ul.style.display).toBe("flex");
      expect(ul.style.flexDirection).toBe("column");
      expect(ul.style.gap).toBe("12px");
      expect(ul.style.gridTemplateColumns).toBe("");
      expect(ul.style.maxWidth).toBe("");
    }
  });
});
