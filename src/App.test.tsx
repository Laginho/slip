import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { STORAGE_KEY } from "./store";
import {
  activate,
  click,
  dispatch,
  keyEvent,
  queryLabel,
  render,
  stubNoMatchMedia,
  task,
  typeInto,
  unmount,
} from "./testing";

/**
 * Integration tests for the write-failure boundary. Storage is authoritative: when a
 * local write cannot be persisted (quota exceeded, Safari private mode -- setItem
 * throws), nothing may be adopted by the UI, no follow-up effect may run, and no
 * no-op may pretend storage recovered.
 */

const SAVE_ERROR = "não foi possível salvar";

function seedStorage(tasks: object[]): string {
  const blob = JSON.stringify(tasks);
  localStorage.setItem(STORAGE_KEY, blob);
  return blob;
}

function throwOnSetItem(): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("QuotaExceededError");
  });
}

/** The undo toast labels its button with visible text, not an aria-label. */
function undoButton(container: ParentNode): HTMLButtonElement | null {
  return (
    ([...container.querySelectorAll("button")].find(
      (button) => button.textContent === "desfazer",
    ) as HTMLButtonElement | undefined) ?? null
  );
}

async function submitCapture(container: HTMLElement): Promise<void> {
  await dispatch(
    new Event("submit", { bubbles: true, cancelable: true }),
    container.querySelector("form")!,
  );
}

beforeEach(() => {
  stubNoMatchMedia();
  localStorage.clear();
});

afterEach(async () => {
  await unmount();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Capture under a failing write", () => {
  it("keeps the input, shows the persistent error, and persists nothing", async () => {
    throwOnSetItem();
    const container = await render(<App />);

    const input = container.querySelector<HTMLInputElement>('input[placeholder="uma tarefa..."]')!;
    typeInto(input, "comprar leite");
    await submitCapture(container);

    // Everything the user typed stays put for a retry.
    expect(input.value).toBe("comprar leite");
    // The list still holds nothing, storage still holds nothing.
    expect(container.textContent).toContain("nada por aqui");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    // And a small persistent save error is on screen.
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(container.textContent).toContain(SAVE_ERROR);

    // A retry that succeeds clears both.
    vi.mocked(Storage.prototype.setItem).mockRestore();
    await submitCapture(container);
    expect(container.textContent).toContain("comprar leite");
    expect(input.value).toBe("");
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toHaveLength(1);
  });

  it("survives a sticky-kind selection when its own setItem throws too", async () => {
    throwOnSetItem();
    const container = await render(<App />);

    const chip = [...container.querySelectorAll("button")].find((b) => b.textContent === "C")!;
    await click(chip); // must not escape the bar as an uncaught exception

    // Losing only the stickiness is not a Task-write failure: no save error.
    expect(container.querySelector('[role="alert"]')).toBeNull();

    // The selection applied for this session -- asserted behaviourally: once writes
    // recover, the very next Capture lands as college, not as the default work.
    vi.mocked(Storage.prototype.setItem).mockRestore();
    const input = container.querySelector<HTMLInputElement>('input[placeholder="uma tarefa..."]')!;
    typeInto(input, "prova de história");
    await submitCapture(container);

    const [stored] = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.kind).toBe("college");
    expect(input.value).toBe("");
  });
});

describe("Card actions under a failing write", () => {
  it("complete keeps the Task open, creates no undo toast, and leaves storage untouched", async () => {
    const seeded = seedStorage([task({ id: "a", text: "entregar relatório" })]);
    throwOnSetItem();
    const container = await render(<App />);

    await activate(queryLabel(container, "Concluir")!); // focus first, then activate

    expect(container.textContent).toContain("entregar relatório");
    expect(undoButton(container)).toBeNull(); // no undo of what never landed
    expect(container.textContent).toContain(SAVE_ERROR);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(seeded);
  });

  it("delete keeps the Card, creates no undo toast, and leaves storage untouched", async () => {
    const seeded = seedStorage([task({ id: "a", text: "entregar relatório" })]);
    throwOnSetItem();
    const container = await render(<App />);

    await activate(queryLabel(container, "Apagar")!);

    expect(container.textContent).toContain("entregar relatório");
    expect(undoButton(container)).toBeNull();
    expect(container.textContent).toContain(SAVE_ERROR);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(seeded);
  });

  it("edit keeps the editor open with the draft, and commits once storage recovers", async () => {
    const seeded = seedStorage([task({ id: "a", text: "texto original" })]);
    throwOnSetItem();
    const container = await render(<App />);

    await activate(queryLabel(container, "Editar")!);
    const input = container.querySelector<HTMLInputElement>('input[aria-label="Task"]')!;
    typeInto(input, "texto editado");
    await dispatch(keyEvent("Enter"), input);

    // The editor stayed open and every keystroke survived -- nothing was discarded
    // behind the generic banner.
    const stillOpen = container.querySelector<HTMLInputElement>('input[aria-label="Task"]')!;
    expect(stillOpen.value).toBe("texto editado");
    expect(container.textContent).toContain(SAVE_ERROR);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(seeded);

    // Storage recovers; the same Enter path now commits and closes.
    vi.mocked(Storage.prototype.setItem).mockRestore();
    await dispatch(keyEvent("Enter"), input);
    expect(container.querySelector('input[aria-label="Task"]')).toBeNull();
    expect(container.textContent).toContain("texto editado");
    const [stored] = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.text).toBe("texto editado");
    expect(stored.updatedAt).toBeGreaterThan(task({ id: "a" }).updatedAt);
  });

  it("a no-op edit closes the editor but must not clear the save error", async () => {
    const seeded = seedStorage([task({ id: "a", text: "texto original" })]);
    throwOnSetItem();
    const container = await render(<App />);
    await activate(queryLabel(container, "Concluir")!); // raise the banner with a real failure
    expect(container.textContent).toContain(SAVE_ERROR);

    // Clearing an editor's text is a store no-op: nothing is written anywhere.
    await activate(queryLabel(container, "Editar")!);
    const input = container.querySelector<HTMLInputElement>('input[aria-label="Task"]')!;
    typeInto(input, "");
    await dispatch(keyEvent("Enter"), input);

    // The harmless no-op still reports success, so the editor closes...
    expect(container.querySelector('input[aria-label="Task"]')).toBeNull();
    // ...but storage has not recovered, so the banner must NOT claim it did.
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(seeded);
  });
});

describe("undo under a failing write", () => {
  it("keeps the undo pending when restore cannot be persisted", async () => {
    seedStorage([task({ id: "a", text: "entregar relatório" })]);
    const container = await render(<App />);

    // The completion itself succeeds, so the toast appears and storage moves.
    await activate(queryLabel(container, "Concluir")!);
    const completed = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(completed[0].done).toBe(true);
    const undo = undoButton(container);
    expect(undo).not.toBeNull();

    // Now storage refuses everything; the undo must stay available.
    throwOnSetItem();
    await activate(undo!);

    expect(undoButton(container)).not.toBeNull(); // still pending
    expect(container.textContent).toContain(SAVE_ERROR);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(completed);
  });

  it("restarts the toast window on failure instead of expiring on the old schedule", async () => {
    vi.useFakeTimers();
    try {
      seedStorage([task({ id: "a", text: "entregar relatório" })]);
      const container = await render(<App />);

      // The delete lands at ~t=0 and starts the five-second window.
      await activate(queryLabel(container, "Apagar")!);
      expect(undoButton(container)).not.toBeNull();

      await act(async () => vi.advanceTimersByTime(3000)); // t=3s: user tries undo
      throwOnSetItem();
      await activate(undoButton(container)!); // refused; the window restarts

      // Past the ORIGINAL deadline (t=5s) the undo must still be offered -- this is
      // exactly where the pre-fix code let the toast expire and drop the snapshot.
      await act(async () => vi.advanceTimersByTime(2500)); // t=5.5s
      expect(undoButton(container)).not.toBeNull();

      // The restarted window expires five seconds after the failed attempt (t=8s).
      await act(async () => vi.advanceTimersByTime(3000)); // t=8.5s
      expect(undoButton(container)).toBeNull();
      expect(container.textContent).toContain(SAVE_ERROR);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("storage refusing reads", () => {
  it("renders an empty app instead of crashing when getItem throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const container = await render(<App />);
    expect(container.textContent).toContain("nada por aqui");
  });
});
