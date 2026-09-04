import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App, ARCHIVE_HIDDEN_OFFSET } from "./App";
import { STORAGE_KEY } from "./store";
import { ARCHIVE_ROW_HEIGHT } from "./components/Archive";
import {
  activate,
  click,
  dispatch,
  keyEvent,
  queryLabel,
  render,
  stubDarkDesktopMedia,
  stubDarkMedia,
  stubDesktopMedia,
  stubMediaWithChangeListener,
  stubNoMatchMedia,
  stubScrollTop,
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
    expect(container.querySelector('main ul[role="list"]')).toBeNull();
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
    // Enter only commits under a fine primary pointer; under coarse it inserts a break.
    stubMediaWithChangeListener((q) => q === "(pointer: fine)");
    const seeded = seedStorage([task({ id: "a", text: "texto original" })]);
    throwOnSetItem();
    const container = await render(<App />);

    await activate(queryLabel(container, "Editar")!);
    const input = container.querySelector<HTMLTextAreaElement>('textarea[aria-label="Task"]')!;
    typeInto(input, "texto editado");
    await dispatch(keyEvent("Enter"), input);

    // The editor stayed open and every keystroke survived -- nothing was discarded
    // behind the generic banner.
    const stillOpen = container.querySelector<HTMLTextAreaElement>('textarea[aria-label="Task"]')!;
    expect(stillOpen.value).toBe("texto editado");
    expect(container.textContent).toContain(SAVE_ERROR);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(seeded);

    // Storage recovers; the same Enter path now commits and closes.
    vi.mocked(Storage.prototype.setItem).mockRestore();
    await dispatch(keyEvent("Enter"), input);
    expect(container.querySelector('textarea[aria-label="Task"]')).toBeNull();
    expect(container.textContent).toContain("texto editado");
    const [stored] = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.text).toBe("texto editado");
    expect(stored.updatedAt).toBeGreaterThan(task({ id: "a" }).updatedAt);
  });

  it("a no-op edit closes the editor but must not clear the save error", async () => {
    // Enter only commits under a fine primary pointer; under coarse it inserts a break.
    stubMediaWithChangeListener((q) => q === "(pointer: fine)");
    const seeded = seedStorage([task({ id: "a", text: "texto original" })]);
    throwOnSetItem();
    const container = await render(<App />);
    await activate(queryLabel(container, "Concluir")!); // raise the banner with a real failure
    expect(container.textContent).toContain(SAVE_ERROR);

    // Clearing an editor's text is a store no-op: nothing is written anywhere.
    await activate(queryLabel(container, "Editar")!);
    const input = container.querySelector<HTMLTextAreaElement>('textarea[aria-label="Task"]')!;
    typeInto(input, "");
    await dispatch(keyEvent("Enter"), input);

    // The harmless no-op still reports success, so the editor closes...
    expect(container.querySelector('textarea[aria-label="Task"]')).toBeNull();
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
    expect(container.querySelector("main")!.textContent).toBe("");
    expect(container.querySelector('input[placeholder="uma tarefa..."]')).not.toBeNull();
  });
});

/**
 * The notification layer (undo toast + save-error banner) is fixed to the top of the
 * window and out of the document flow. jsdom has no layout engine, so "does not
 * displace" is asserted structurally: both notifications must live in a fixed-position
 * layer outside <main>, and the list's markup must be byte-identical while a
 * notification mounts, while it is up, and after it goes away.
 */
describe("the notification layer", () => {
  /** The toast root sits inside width wrappers; what matters is that some ancestor
   *  is fixed against the window -- that is what takes it out of the document flow. */
  function nearestFixedAncestor(el: Element): HTMLElement | null {
    let node: HTMLElement | null = el.parentElement;
    while (node !== null) {
      if (getComputedStyle(node).position === "fixed") return node;
      node = node.parentElement;
    }
    return null;
  }

  it("floats the undo toast over the top; only the action, never the toast, touches the list", async () => {
    vi.useFakeTimers();
    try {
      seedStorage([
        task({ id: "a", text: "entregar relatório" }),
        task({ id: "b", text: "comprar pão" }),
      ]);
      const container = await render(<App />);
      const main = container.querySelector("main")!;

      await activate(queryLabel(container, "Concluir")!);

      const toast = container.querySelector('[role="status"]')!;
      expect(toast).not.toBeNull();
      // Out of flow entirely, so mounting it cannot move the bottom-anchored list.
      expect(nearestFixedAncestor(toast)).not.toBeNull();
      expect(main.contains(toast)).toBe(false);
      const whileToastUp = main.innerHTML;

      await act(async () => vi.advanceTimersByTime(5000));
      expect(container.querySelector('[role="status"]')).toBeNull();
      // Across the toast's whole life -- mounted, expiring, gone -- main's markup
      // never moved: the only diff was the completed Card leaving, at action time.
      expect(main.innerHTML).toBe(whileToastUp);
    } finally {
      vi.useRealTimers();
    }
  });

  it("floats the save-error banner the same way, without displacing the list", async () => {
    throwOnSetItem();
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const before = main.innerHTML;

    const input = container.querySelector<HTMLInputElement>('input[placeholder="uma tarefa..."]')!;
    await act(async () => typeInto(input, "comprar leite"));
    await submitCapture(container);

    const banner = container.querySelector('[role="alert"]')!;
    expect(banner).not.toBeNull();
    expect(nearestFixedAncestor(banner)).not.toBeNull();
    expect(main.contains(banner)).toBe(false);
    // The failed write adopted nothing: the list is byte-identical with the banner up.
    expect(main.innerHTML).toBe(before);
  });

  it("stacks toast and banner in the one floating layer when an undo fails to persist", async () => {
    seedStorage([task({ id: "a", text: "entregar relatório" })]);
    const container = await render(<App />);

    await activate(queryLabel(container, "Concluir")!);
    expect(container.querySelector('[role="alert"]')).toBeNull(); // success cleared any error
    throwOnSetItem();
    await activate(undoButton(container)!); // refused: toast restarts, banner raises

    const status = container.querySelector('[role="status"]')!;
    const alert = container.querySelector('[role="alert"]')!;
    expect(status).not.toBeNull();
    expect(alert).not.toBeNull();
    // Both live in the same fixed layer above the content, never in the flow.
    expect(nearestFixedAncestor(status)).not.toBeNull();
    expect(nearestFixedAncestor(alert)).not.toBeNull();
    expect(main_of(status)).toBe(main_of(alert));
  });

  /** Both notifications must descend from the same layer element. */
  function main_of(el: Element): Element {
    return el.parentElement!.parentElement!;
  }

  it("T1 — layer aligns children to the right edge (flex-end), not centre", async () => {
    seedStorage([task({ id: "t1", text: "entregar relatório" })]);
    const container = await render(<App />);

    await activate(queryLabel(container, "Concluir")!);
    const toast = container.querySelector<HTMLElement>('[role="status"]')!;
    const layer = nearestFixedAncestor(toast)!;

    expect(layer).not.toBeNull();
    expect(layer.style.position).toBe("fixed");
    expect(layer.style.top).toBe("0px");
    expect(layer.style.left).toBe("0px");
    expect(layer.style.right).toBe("0px");
    expect(layer.style.alignItems).toBe("flex-end");
    expect(layer.style.pointerEvents).toBe("none");
  });

  it("T2 — toast has no width:100% and caps at 360px; pointer-events:auto", async () => {
    seedStorage([task({ id: "t2", text: "comprar pão" })]);
    const container = await render(<App />);

    await activate(queryLabel(container, "Concluir")!);
    const toast = container.querySelector<HTMLElement>('[role="status"]')!;

    expect(toast).not.toBeNull();
    expect(toast.style.width).toBe("");
    expect(toast.style.maxWidth).toBe("min(360px, calc(100vw - 24px))");
    expect(toast.style.pointerEvents).toBe("auto");
  });

  it("T3 — no ancestor between toast and fixed layer carries max-width:596px", async () => {
    seedStorage([task({ id: "t3", text: "ler um capítulo" })]);
    const container = await render(<App />);

    await activate(queryLabel(container, "Concluir")!);
    const toast = container.querySelector<HTMLElement>('[role="status"]')!;
    const layer = nearestFixedAncestor(toast)!;

    let node: Element | null = toast.parentElement;
    while (node !== null && node !== layer) {
      expect(
        (node as HTMLElement).style.maxWidth,
        `ancestor ${node.tagName} must not have maxWidth:596px`,
      ).not.toBe("596px");
      node = node.parentElement;
    }
  });

  it("T4 — toast and banner share the same fixed layer; banner has maxWidth cap", async () => {
    seedStorage([task({ id: "t4", text: "entregar relatório" })]);
    const container = await render(<App />);

    await activate(queryLabel(container, "Concluir")!);
    expect(container.querySelector('[role="status"]')).not.toBeNull();

    throwOnSetItem();
    await activate(undoButton(container)!);

    const status = container.querySelector<HTMLElement>('[role="status"]')!;
    const alert = container.querySelector<HTMLElement>('[role="alert"]')!;
    expect(status).not.toBeNull();
    expect(alert).not.toBeNull();

    expect(nearestFixedAncestor(status)).toBe(nearestFixedAncestor(alert));
    expect(alert.style.maxWidth).toBe("min(360px, calc(100vw - 24px))");
  });
});

/**
 * Visual promotion 04 RED: Phone B/A Conversa vs Desktop A/A Parede.
 * Phone (<900): list/col + Capture composer interno arredondado hairline dentro de faixa branca pinada;
 * Desktop (≥900): grid wall + Capture flat/full-width sem bubble radius com hairline superior.
 * Labels pt-BR: `nova tarefa` (input placeholder/aria) e `prazo` (deadline).
 * Mocks permitidos: apenas matchMedia e relógio fixo. Não duplica gestos/keyboard.
 */
describe("visual promoção 04 — responsive B/A Conversa vs A/A Parede", () => {
  const FIXED_TASK = task({ id: "vis-1", text: "preparar apresentação", deadline: "2026-08-30" });

  function hasHairline(style: CSSStyleDeclaration | string): boolean {
    const s = typeof style === "string" ? style : (style.borderTop || style.border || "");
    // After dark chrome, CaptureBar uses var(--hairline) inline. Before that,
    // the literal #e2e0dc appears. Accept both so the test stays green across
    // the cycle without compelling production to hardcode a fallback.
    return (
      s.includes("var(--hairline)") ||
      s.includes("#e2e0dc") ||
      s.includes("e2e0dc") ||
      s.includes("226, 224, 220") ||
      s.includes("226,224,220") ||
      s.includes("rgb(226")
    );
  }

  it("App mobile (matchMedia false): TaskList lista/coluna e CaptureBar compositor interno arredondado com hairline + labels pt-BR", async () => {
    stubNoMatchMedia();
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([FIXED_TASK]));
    const container = await render(<App />);

    // TaskList: lista coluna (flex) não grid wall
    const lists = [...container.querySelectorAll('ul[role="list"]')] as HTMLElement[];
    expect(lists.length, "TaskList renderiza lista").toBeGreaterThan(0);
    const firstListDisplay = lists[0] ? getComputedStyle(lists[0]).display : "";
    // Mobile <900 must be flex column; wall is grid
    expect(firstListDisplay).toBe("flex");
    // Also gap 12 for conversational list (wall is grid gap 16)
    if (lists[0]) expect(lists[0].style.gap).toBe("12px");

    // CaptureBar: faixa branca pinada + compositor interno arredondado com hairline
    const form = container.querySelector("form") as HTMLElement;
    expect(form).not.toBeNull();
    // Outer strip is white pinned — form background is the capture token
    expect(form.style.background, "faixa da captura").toBe("var(--capture-bg)");

    // Inner composer: rounded + hairline inside the strip (not the form borderTop)
    // Future mobile wraps chips+inputs in a rounded div; current flat has none -> RED
    const innerComposer = form.querySelector("div") as HTMLElement | null;
    // Must exist and be rounded
    expect(innerComposer, "compositor interno arredondado").not.toBeNull();
    if (innerComposer) {
      const radius = getComputedStyle(innerComposer).borderRadius || innerComposer.style.borderRadius;
      expect(radius, "radius conversacional").toMatch(/16px|999px/);
      const border = innerComposer.style.border || getComputedStyle(innerComposer).border;
      expect(hasHairline(innerComposer.style.border || border), "hairline no compositor").toBe(true);
    }

    // Labels pt-BR
    const novaTarefa =
      container.querySelector('input[placeholder="nova tarefa"]') ||
      container.querySelector('input[aria-label="nova tarefa"]') ||
      queryLabel(container, "nova tarefa");
    expect(novaTarefa, 'label pt-BR "nova tarefa"').not.toBeNull();
    const prazo =
      container.querySelector('input[aria-label="prazo"]') ||
      container.querySelector('input[placeholder="prazo"]');
    expect(prazo, 'label pt-BR "prazo"').not.toBeNull();
    // Deadline still 30/08 semantics but mobile Card shows "vence 30/08"
    expect(container.textContent).toContain("vence 30/08");
  });

  it("App desktop (matchMedia true): TaskList grid wall e CaptureBar flat full-width sem bubble radius com hairline superior", async () => {
    const { stubDesktopMedia } = await import("./testing");
    stubDesktopMedia();
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([FIXED_TASK]));
    const container = await render(<App />);

    // TaskList: grid wall (≥900)
    const lists = [...container.querySelectorAll('ul[role="list"]')] as HTMLElement[];
    expect(lists.length).toBeGreaterThan(0);
    const firstListDisplay = getComputedStyle(lists[0]).display;
    expect(firstListDisplay, "wall deve ser grid").toBe("grid");
    expect(lists[0].style.gridTemplateColumns).toMatch(/auto-fill.*minmax/);
    expect(lists[0].style.gap).toBe("16px");

    // CaptureBar flat: full-width, sem bubble radius interno, hairline superior na faixa
    const form = container.querySelector("form") as HTMLElement;
    expect(form).not.toBeNull();
    // No inner rounded composer — flat strip
    const innerRounded = [...form.querySelectorAll("div")].find((d) => {
      const r = (d as HTMLElement).style.borderRadius || getComputedStyle(d as HTMLElement).borderRadius;
      return r && r !== "0px" && r !== "";
    });
    expect(innerRounded, "desktop não deve ter bubble radius interno").toBeUndefined();
    // Hairline superior na faixa (form borderTop)
    const borderTop = form.style.borderTop || getComputedStyle(form).borderTop;
    expect(hasHairline(borderTop), "hairline superior desktop").toBe(true);

    // Ordem preservada — mesma Task aparece
    expect(container.textContent).toContain("preparar apresentação");
    expect(container.textContent).toContain("30/08");
    // Desktop NÃO usa prefixo vence
    expect(container.textContent).not.toContain("vence 30/08");
  });
});

/**
 * FIXUP 04 — overflow horizontal do compositor mobile (READ P1).
 * Evidência: form=375px, composer=437.34px, scrollWidth=453px em 375x812 (doc bloqueado).
 * Causa: item flex interno não pode encolher (COMPOSER flex:1 sem minWidth:0).
 * Em jsdom não há layout real, então o assert é estrutural: o compositor deve
 * permitir shrink (minWidth 0 / min-width 0). Desktop continua sem compositor interno.
 */
describe("fixup 04 — compositor mobile cabe no viewport sem overflow", () => {
  const OVERFLOW_TASK = task({ id: "fix-1", text: "preparar apresentação", deadline: "2026-08-30" });

  it("mobile (<900): compositor permite shrink (minWidth 0) para não exceder o form/viewport", async () => {
    stubNoMatchMedia();
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([OVERFLOW_TASK]));
    const container = await render(<App />);

    const form = container.querySelector("form") as HTMLElement;
    expect(form).not.toBeNull();

    // No mobile o CaptureBar envolve os fields em <div style={COMPOSER}>
    const composer = form.querySelector("div") as HTMLElement | null;
    expect(composer, "compositor interno deve existir no mobile").not.toBeNull();
    if (composer) {
      // Propriedade de layout que permite ao flex item encolher abaixo do conteúdo intrínseco
      // O fix mínimo é `minWidth: 0` no COMPOSER (src/components/CaptureBar.tsx:56)
      const inlineMinWidth = composer.style.minWidth;
      const computedMinWidth = getComputedStyle(composer).minWidth;
      const allowsShrink = inlineMinWidth === "0" || inlineMinWidth === "0px" || computedMinWidth === "0px";
      expect(allowsShrink, `minWidth deve ser 0 para permitir shrink (inline='${inlineMinWidth}' computed='${computedMinWidth}')`).toBe(true);
    }
  });

  it("desktop (>=900): continua sem compositor interno (faixa flat)", async () => {
    const { stubDesktopMedia } = await import("./testing");
    stubDesktopMedia();
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([OVERFLOW_TASK]));
    const container = await render(<App />);

    const form = container.querySelector("form") as HTMLElement;
    expect(form).not.toBeNull();
    // Desktop é flat full-width, sem bubble interno arredondado
    const hasInnerComposer = form.querySelector("div") !== null;
    const innerRounded = [...form.querySelectorAll("div")].some((d) => {
      const r = (d as HTMLElement).style.borderRadius || getComputedStyle(d as HTMLElement).borderRadius;
      return r && r !== "0px" && r !== "";
    });
    expect(hasInnerComposer && innerRounded, "desktop não deve ter compositor interno arredondado").toBe(false);
  });
});

/**
 * Archive at the top (ticket 04).
 * Rows 1, 3, 5 (first-child), 6 (no copy) are RED on the base.
 * Rows 2, 4, 7, 8, 9, 10 are behaviour guards that must stay green.
 */
describe("Archive at the top", () => {
  const TODAY = new Date(2026, 8, 2); // 2026-09-02

  it("row 1 — Archive is the first child of <main>; Open list follows", async () => {
    vi.setSystemTime(TODAY);
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "o2", text: "ligar dentista" }),
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const firstChild = main.children[0] as HTMLElement;

    expect(firstChild.textContent).toContain("ver concluídas");

    const openList = main.querySelector('ul[role="list"]');
    expect(openList).not.toBeNull();
    // Open list must come AFTER the archive link in DOM order
    expect(main.contains(firstChild)).toBe(true);
    expect(firstChild.compareDocumentPosition(openList!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("row 2 — clicking 'ver concluídas' shows Done rows; button reads 'ocultar concluídas'; still first child", async () => {
    vi.setSystemTime(TODAY);
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;

    const toggleBtn = [...main.querySelectorAll("button")].find(
      (b) => b.textContent === "ver concluídas",
    )!;
    expect(toggleBtn).not.toBeNull();
    await click(toggleBtn);

    expect(main.textContent).toContain("entregar relatório");
    expect(main.textContent).toContain("ocultar concluídas");
    // Still the first child
    const firstChild = main.children[0] as HTMLElement;
    expect(firstChild.textContent).toContain("ocultar concluídas");
  });

  it("row 3 — opening the Archive scrolls the region to top (scroll position moved to main.parentElement in ticket 05)", async () => {
    vi.setSystemTime(TODAY);
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const restore = stubScrollTop();
    try {
      const container = await render(<App />);
      const main = container.querySelector("main")!;
      const region = main.parentElement as HTMLElement;

      // Simulate the region being scrolled down
      region.scrollTop = 120;

      const toggleBtn = [...main.querySelectorAll("button")].find(
        (b) => b.textContent === "ver concluídas",
      )!;
      await click(toggleBtn);

      expect(region.scrollTop).toBe(0);
    } finally {
      restore();
    }
  });

  it("row 4 — clicking 'ocultar concluídas' hides Done rows; button reads 'ver concluídas'", async () => {
    vi.setSystemTime(TODAY);
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;

    // Open first
    const openBtn = [...main.querySelectorAll("button")].find(
      (b) => b.textContent === "ver concluídas",
    )!;
    await click(openBtn);
    expect(main.textContent).toContain("entregar relatório");

    // Close
    const closeBtn = [...main.querySelectorAll("button")].find(
      (b) => b.textContent === "ocultar concluídas",
    )!;
    await click(closeBtn);

    expect(main.textContent).not.toContain("entregar relatório");
    expect(main.textContent).toContain("ver concluídas");
  });

  it("row 5 — 2 Open, 0 Done: no 'ver concluídas' anywhere; first child is the Open list", async () => {
    vi.setSystemTime(TODAY);
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "o2", text: "ligar dentista" }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;

    expect(main.textContent).not.toContain("ver concluídas");
    expect(main.children[0].matches('ul[role="list"]')).toBe(true);
  });

  it("row 6 — 0 Open, 0 Done: scrolling region has no text content; no empty-state copy", async () => {
    vi.setSystemTime(TODAY);
    seedStorage([]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;

    expect(main.textContent?.trim()).toBe("");
  });

  it("row 7 — 0 Open, 1 Done: only the Archive link exists in the region", async () => {
    vi.setSystemTime(TODAY);
    seedStorage([
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;

    expect(main.textContent).toContain("ver concluídas");
    expect(main.textContent).not.toContain("nada por aqui");
    // No Open list rendered
    expect(main.querySelector('ul[role="list"]')).toBeNull();
  });

  it("row 8 — seven-day window: 1 Done 8 days ago + 1 Done today shows one row + 'ver mais antigas'", async () => {
    const eightDaysAgo = new Date(2026, 8, 2 - 8); // 2026-08-25
    vi.setSystemTime(TODAY);
    seedStorage([
      task({ id: "d1", text: "relatório antigo", done: true, updatedAt: eightDaysAgo.getTime() }),
      task({ id: "d2", text: "relatório recente", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;

    // Open the archive
    const openBtn = [...main.querySelectorAll("button")].find(
      (b) => b.textContent === "ver concluídas",
    )!;
    await click(openBtn);

    // Only today's task visible initially
    expect(main.textContent).toContain("relatório recente");
    expect(main.textContent).not.toContain("relatório antigo");
    expect(main.textContent).toContain("ver mais antigas");

    // Click "ver mais antigas"
    const allBtn = [...main.querySelectorAll("button")].find(
      (b) => b.textContent === "ver mais antigas",
    )!;
    await click(allBtn);

    expect(main.textContent).toContain("relatório antigo");
    expect(main.textContent).toContain("relatório recente");
  });

  it("row 9 — desktop: Archive still first child; Open list still a grid", async () => {
    const { stubDesktopMedia } = await import("./testing");
    stubDesktopMedia();
    vi.setSystemTime(TODAY);
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const firstChild = main.children[0] as HTMLElement;

    expect(firstChild.textContent).toContain("ver concluídas");

    const openList = main.querySelector('ul[role="list"]') as HTMLElement;
    expect(openList).not.toBeNull();
    expect(getComputedStyle(openList).display).toBe("grid");
  });

  it("row 10 — completing the last Open Task: undo toast lands in the fixed layer, not the region; Archive stays first", async () => {
    vi.setSystemTime(TODAY);
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;

    await activate(queryLabel(container, "Concluir")!);

    const toast = container.querySelector('[role="status"]');
    expect(toast).not.toBeNull();
    expect(main.contains(toast)).toBe(false); // the toast is in the fixed layer, outside the region
    expect(main.querySelector('ul[role="list"]')).toBeNull(); // the last Open Task left; the Open list renders nothing
    expect(main.children.length).toBe(1); // only the Archive remains
    // Archive link still first
    const firstChild = main.children[0] as HTMLElement;
    expect(firstChild.textContent).toContain("ver concluídas");
  });
});

/**
 * Pull to reveal the Archive (ticket 05).
 * The region is a separate scrolling ancestor outside <main>. The content declares
 * minHeight when an Archive link exists so the row can be pulled out of view.
 * All rows use stubScrollTop() so scrollTop is writable in jsdom.
 *
 * Rows 1, 2, 4 (scrollTop half), 5, 7, 8 (declarations), 9 (mount value) are RED on the base.
 * Rows 3, 6, 10 and 4's text half are GREEN already.
 */
describe("pull to reveal the Archive", () => {
  const TODAY = new Date(2026, 8, 2); // 2026-09-02

  let restoreScrollTop: () => void;

  beforeEach(() => {
    vi.setSystemTime(TODAY);
    restoreScrollTop = stubScrollTop();
  });

  afterEach(() => {
    restoreScrollTop();
  });

  it("row 1 — 2 Open, 1 Done: region overscrollBehavior, main minHeight+boxSizing, link row height", async () => {
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "o2", text: "ligar dentista" }),
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const region = main.parentElement as HTMLElement;

    // Region declarations
    expect(region.style.overscrollBehavior).toBe("contain");
    // Content declarations
    expect(main.style.minHeight).toBe(`calc(100% + ${ARCHIVE_HIDDEN_OFFSET}px)`);
    expect(main.style.boxSizing).toBe("border-box");
    // Link row <p> height
    const linkRow = main.querySelector("p") as HTMLElement;
    expect(linkRow).not.toBeNull();
    expect(linkRow.style.height).toBe(`${ARCHIVE_ROW_HEIGHT}px`);
  });

  it("row 2 — 2 Open, 1 Done: region.scrollTop === ARCHIVE_HIDDEN_OFFSET right after mount", async () => {
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "o2", text: "ligar dentista" }),
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const region = main.parentElement as HTMLElement;

    expect(region.scrollTop).toBe(ARCHIVE_HIDDEN_OFFSET);
  });

  it("row 3 — scrolled to 0: 'ver concluídas' present, no Done text, button still reads 'ver concluídas'", async () => {
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "o2", text: "ligar dentista" }),
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const region = main.parentElement as HTMLElement;

    // Scroll to 0 and dispatch scroll event
    region.scrollTop = 0;
    region.dispatchEvent(new Event("scroll"));

    // Nothing auto-opens
    expect(main.textContent).toContain("ver concluídas");
    expect(main.textContent).not.toContain("entregar relatório");
    const toggleBtn = [...main.querySelectorAll("button")].find(
      (b) => b.textContent === "ver concluídas",
    );
    expect(toggleBtn).not.toBeNull();
  });

  it("row 4 — scrolled to 0, click 'ver concluídas': opens, Done text present, region.scrollTop stays 0", async () => {
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "o2", text: "ligar dentista" }),
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const region = main.parentElement as HTMLElement;

    region.scrollTop = 0;

    const openBtn = [...main.querySelectorAll("button")].find(
      (b) => b.textContent === "ver concluídas",
    )!;
    await click(openBtn);

    expect(main.textContent).toContain("ocultar concluídas");
    expect(main.textContent).toContain("entregar relatório");
    expect(region.scrollTop).toBe(0);
  });

  it("row 5 — open, click 'ocultar concluídas': Done text gone, region.scrollTop returns to ARCHIVE_HIDDEN_OFFSET", async () => {
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "o2", text: "ligar dentista" }),
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const region = main.parentElement as HTMLElement;

    // Open first
    const openBtn = [...main.querySelectorAll("button")].find(
      (b) => b.textContent === "ver concluídas",
    )!;
    await click(openBtn);

    // Close
    const closeBtn = [...main.querySelectorAll("button")].find(
      (b) => b.textContent === "ocultar concluídas",
    )!;
    await click(closeBtn);

    expect(main.textContent).not.toContain("entregar relatório");
    expect(region.scrollTop).toBe(ARCHIVE_HIDDEN_OFFSET);
  });

  it("row 6 — 2 Open, 0 Done: no 'ver concluídas', main.style.minHeight === '', region.scrollTop === 0", async () => {
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "o2", text: "ligar dentista" }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const region = main.parentElement as HTMLElement;

    expect(main.textContent).not.toContain("ver concluídas");
    expect(main.style.minHeight).toBe("");
    expect(region.scrollTop).toBe(0);
  });

  it("row 7 — 0 Open, 1 Done: link present, main minHeight declared, region.scrollTop === ARCHIVE_HIDDEN_OFFSET", async () => {
    seedStorage([
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const region = main.parentElement as HTMLElement;

    expect(main.textContent).toContain("ver concluídas");
    expect(main.style.minHeight).toBe(`calc(100% + ${ARCHIVE_HIDDEN_OFFSET}px)`);
    expect(region.scrollTop).toBe(ARCHIVE_HIDDEN_OFFSET);
  });

  it("row 8 — desktop: same four declarations as row 1; Open <ul> still display:grid", async () => {
    const { stubDesktopMedia } = await import("./testing");
    stubDesktopMedia();
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "o2", text: "ligar dentista" }),
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const region = main.parentElement as HTMLElement;

    expect(region.style.overscrollBehavior).toBe("contain");
    expect(main.style.minHeight).toBe(`calc(100% + ${ARCHIVE_HIDDEN_OFFSET}px)`);
    expect(main.style.boxSizing).toBe("border-box");
    const linkRow = main.querySelector("p") as HTMLElement;
    expect(linkRow.style.height).toBe(`${ARCHIVE_ROW_HEIGHT}px`);
    // Open <ul> still grid
    const openList = main.querySelector('ul[role="list"]') as HTMLElement;
    expect(openList).not.toBeNull();
    expect(getComputedStyle(openList).display).toBe("grid");
  });

  it("row 9 — 1 Open, 1 Done: complete + undo, region.scrollTop === ARCHIVE_HIDDEN_OFFSET after each step", async () => {
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const region = main.parentElement as HTMLElement;

    // Complete the Open task
    await activate(queryLabel(container, "Concluir")!);
    expect(region.scrollTop).toBe(ARCHIVE_HIDDEN_OFFSET);

    // Undo the completion
    const undoBtn = [...main.querySelectorAll("button")].find(
      (b) => b.textContent === "desfazer",
    );
    // If the toast is visible, undo it
    if (undoBtn) {
      await click(undoBtn);
      expect(region.scrollTop).toBe(ARCHIVE_HIDDEN_OFFSET);
    }
  });

  it("row 10 — 2 Open, 1 Done: main.children[0] is Archive row, main.children.length === 2 (ticket-04 shape intact)", async () => {
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "o2", text: "ligar dentista" }),
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;

    // The Archive link row is the first child, TaskList is the second
    const firstChild = main.children[0] as HTMLElement;
    expect(firstChild.textContent).toContain("ver concluídas");
    expect(main.children.length).toBe(2);
  });
});

/**
 * DARK CHROME — matrix rows 1–7.
 * The root <div> must set CSS custom properties (--surface, --text-primary, etc.)
 * from the palette, and every component must consume them via var(--…) instead of
 * importing chrome constants directly. Row 1 asserts the variables exist on the
 * root; rows 2–6 assert components use the vars; row 7 asserts the dark state
 * flips live when the media query changes.
 *
 * All rows are red on the base: App.tsx has no dark state and no CSS variables,
 * components import constants directly. Rows 2–7 additionally need the palette
 * CHROME object which does not exist yet.
 */
describe("dark chrome", () => {
  const SAMPLE_TASK = task({ id: "dark-1", text: "estudar para prova" });

  it("1 — root div sets CSS custom properties from palette", async () => {
    stubNoMatchMedia();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([SAMPLE_TASK]));
    const container = await render(<App />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).not.toBeNull();

    // The root must declare these custom properties. On the base the root uses
    // `background: SURFACE` directly and sets no variables — this fails.
    const style = root.style;
    expect(style.getPropertyValue("--surface"), "--surface").not.toBe("");
    expect(style.getPropertyValue("--text-primary"), "--text-primary").not.toBe("");
    expect(style.getPropertyValue("--text-quiet"), "--text-quiet").not.toBe("");
    expect(style.getPropertyValue("--hairline"), "--hairline").not.toBe("");
    expect(style.getPropertyValue("--capture-bg"), "--capture-bg").not.toBe("");
    expect(style.getPropertyValue("--toast-bg"), "--toast-bg").not.toBe("");
    expect(style.getPropertyValue("--toast-ink"), "--toast-ink").not.toBe("");
  });

  it("2 — light mode: CSS variables match the palette light values", async () => {
    stubNoMatchMedia();
    const palette = await import("./palette");
    const CHROME = (palette as Record<string, unknown>).CHROME as Record<string, Record<string, string>>;
    localStorage.setItem(STORAGE_KEY, JSON.stringify([SAMPLE_TASK]));
    const container = await render(<App />);
    const root = container.firstElementChild as HTMLElement;
    const style = root.style;

    expect(style.getPropertyValue("--surface")).toBe(CHROME.light.surface);
    expect(style.getPropertyValue("--text-primary")).toBe(CHROME.light.textPrimary);
    expect(style.getPropertyValue("--text-quiet")).toBe(CHROME.light.textQuiet);
    expect(style.getPropertyValue("--hairline")).toBe(CHROME.light.hairline);
    expect(style.getPropertyValue("--capture-bg")).toBe(CHROME.light.captureBg);
    expect(style.getPropertyValue("--toast-bg")).toBe(CHROME.light.toastBg);
    expect(style.getPropertyValue("--toast-ink")).toBe(CHROME.light.toastInk);
  });

  it("3 — dark mode: CSS variables match the palette dark values", async () => {
    stubDarkMedia();
    const palette = await import("./palette");
    const CHROME = (palette as Record<string, unknown>).CHROME as Record<string, Record<string, string>>;
    localStorage.setItem(STORAGE_KEY, JSON.stringify([SAMPLE_TASK]));
    const container = await render(<App />);
    const root = container.firstElementChild as HTMLElement;
    const style = root.style;

    expect(style.getPropertyValue("--surface")).toBe(CHROME.dark.surface);
    expect(style.getPropertyValue("--text-primary")).toBe(CHROME.dark.textPrimary);
    expect(style.getPropertyValue("--text-quiet")).toBe(CHROME.dark.textQuiet);
    expect(style.getPropertyValue("--hairline")).toBe(CHROME.dark.hairline);
    expect(style.getPropertyValue("--capture-bg")).toBe(CHROME.dark.captureBg);
    expect(style.getPropertyValue("--toast-bg")).toBe(CHROME.dark.toastBg);
    expect(style.getPropertyValue("--toast-ink")).toBe(CHROME.dark.toastInk);
  });

  it("4 — root background/color use var(--surface) / var(--text-primary), not literals", async () => {
    stubNoMatchMedia();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([SAMPLE_TASK]));
    const container = await render(<App />);
    const root = container.firstElementChild as HTMLElement;

    // On the base, root uses `background: SURFACE` (the literal). It must be var(--surface).
    expect(root.style.background).toContain("var(--surface)");
    expect(root.style.color).toContain("var(--text-primary)");
  });

  it("5 — save-error banner uses var(--toast-bg) / var(--toast-ink)", async () => {
    stubNoMatchMedia();
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const container = await render(<App />);

    const input = container.querySelector<HTMLInputElement>('input[placeholder="uma tarefa..."]')!;
    typeInto(input, "comprar leite");
    await dispatch(
      new Event("submit", { bubbles: true, cancelable: true }),
      container.querySelector("form")!,
    );

    const banner = container.querySelector<HTMLElement>('[role="alert"]');
    expect(banner).not.toBeNull();
    // On the base the banner uses TOAST_BG/TOAST_INK literals; it must use var(--…)
    expect(banner!.style.background).toContain("var(--toast-bg)");
    expect(banner!.style.color).toContain("var(--toast-ink)");
  });

  it("6 — CaptureBar uses var(--capture-bg) / var(--hairline), not imported constants", async () => {
    stubNoMatchMedia();
    localStorage.clear();
    const container = await render(<App />);

    const form = container.querySelector("form") as HTMLElement;
    expect(form).not.toBeNull();
    // On the base, CaptureBar imports CAPTURE_BG and HAIRLINE directly; it must use var(--…)
    expect(form.style.background).toContain("var(--capture-bg)");
    expect(form.style.borderTop).toContain("var(--hairline)");
  });

  it("7 — UndoToast uses var(--toast-bg) / var(--toast-ink)", async () => {
    stubNoMatchMedia();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([SAMPLE_TASK]));
    const container = await render(<App />);

    await activate(queryLabel(container, "Concluir")!);
    const toast = container.querySelector<HTMLElement>('[role="status"]');
    expect(toast).not.toBeNull();
    // On the base, UndoToast imports TOAST_BG/TOAST_INK directly; it must use var(--…)
    expect(toast!.style.background).toContain("var(--toast-bg)");
    expect(toast!.style.color).toContain("var(--toast-ink)");
  });

  it("8 — dark state flips live when prefers-color-scheme changes", async () => {
    stubNoMatchMedia();
    const palette = await import("./palette");
    const CHROME = (palette as Record<string, unknown>).CHROME as Record<string, Record<string, string>>;
    localStorage.setItem(STORAGE_KEY, JSON.stringify([SAMPLE_TASK]));
    const container = await render(<App />);
    const root = container.firstElementChild as HTMLElement;

    // Starts in light mode
    expect(root.style.getPropertyValue("--surface")).toBe(CHROME.light.surface);

    // Re-render with a stub that starts NOT dark (predicate false) and records
    // the addEventListener("change", ...) call so we can fire it later.
    await unmount();
    const rec = stubMediaWithChangeListener(
      (q) => q === "(min-width: 900px)", // dark is NOT matched initially
    );
    const container2 = await render(<App />);
    const root2 = container2.firstElementChild as HTMLElement;

    // Still light after re-render
    expect(root2.style.getPropertyValue("--surface")).toBe(CHROME.light.surface);

    // Fire the change listener to simulate prefers-color-scheme flipping to dark
    const darkListeners = rec.listeners.get("(prefers-color-scheme: dark)") ?? [];
    expect(darkListeners.length, "change listener must be registered").toBeGreaterThan(0);
    act(() => {
      darkListeners[0]({ matches: true } as MediaQueryListEvent);
    });

    // Now dark
    expect(root2.style.getPropertyValue("--surface")).toBe(CHROME.dark.surface);
  });

  it("9 — overdue on dark: atrasado label is OVERDUE_RED, Card li is INK_ON_DARK, background is CARD[kind].dark", async () => {
    stubDarkMedia();
    const palette = await import("./palette");
    const CARD = (palette as Record<string, unknown>).CARD as Record<string, Record<string, string>>;
    const OVERDUE_RED = (palette as Record<string, unknown>).OVERDUE_RED as string;
    const INK_ON_DARK = (palette as Record<string, unknown>).INK_ON_DARK as string;

    /** jsdom normalises hex to rgb(); compare via normalised form. */
    function toRgb(hex: string): string {
      const h = hex.replace("#", "");
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      return `rgb(${r}, ${g}, ${b})`;
    }

    // Fixed now: 2026-09-02. Deadline 2 days before = 2026-08-31 → 2 days overdue.
    vi.setSystemTime(new Date(2026, 8, 2));
    const overdueTask = task({ id: "dark-overdue", text: "entregar relatório", deadline: "2026-08-31" });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([overdueTask]));
    const container = await render(<App />);
    const li = container.querySelector("li") as HTMLElement;
    expect(li).not.toBeNull();

    // Card background must be the dark step for its kind (work → CARD.work.dark)
    expect(li.style.background).toBe(toRgb(CARD.work.dark));
    // Card ink must be INK_ON_DARK (urgency is "dark" → light ink)
    expect(li.style.color).toBe(toRgb(INK_ON_DARK));

    // The "atrasado" label must use OVERDUE_RED
    // The overdue label is the innermost span with fontWeight:700 (the outer text
    // span has no colour, so selecting by textContent matches the parent).
    const atrasado = li.querySelector("span[style*='font-weight: 700']") as HTMLElement | null;
    expect(atrasado, "atrasado span").not.toBeNull();
    expect(atrasado!.textContent).toContain("atrasado");
    expect(atrasado!.style.color).toBe(toRgb(OVERDUE_RED));
  });

  it("10 — dark + desktop: grid display and root --surface is CHROME.dark.surface", async () => {
    stubDarkDesktopMedia();
    const palette = await import("./palette");
    const CHROME = (palette as Record<string, unknown>).CHROME as Record<string, Record<string, string>>;
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      task({ id: "dark-d1", text: "estudar para prova" }),
      task({ id: "dark-d2", text: "comprar leite" }),
    ]));
    const container = await render(<App />);
    const root = container.firstElementChild as HTMLElement;

    // Root must be dark
    expect(root.style.getPropertyValue("--surface")).toBe(CHROME.dark.surface);

    // Open list must be grid (same assertion ticket 04 row 9 uses)
    const lists = [...container.querySelectorAll('ul[role="list"]')] as HTMLElement[];
    expect(lists.length).toBeGreaterThan(0);
    expect(getComputedStyle(lists[0]).display).toBe("grid");
  });
});

/**
 * Ctrl+H toggles the Archive (ticket 06).
 * The shortcut only flips the archiveOpen state; scroll is handled by the
 * existing effect from ticket 05. Rows 1, 2, 4, 6, 9, 11 are RED on the
 * base (no keyboard handler in App.tsx). Rows 3, 5, 7, 8, 10 are GREEN
 * already (they assert nothing happens).
 */
describe("Ctrl+H toggles the Archive", () => {
  const TODAY = new Date(2026, 8, 2); // 2026-09-02

  let restoreScrollTop: () => void;

  beforeEach(() => {
    vi.setSystemTime(TODAY);
    stubDesktopMedia();
    restoreScrollTop = stubScrollTop();
  });

  afterEach(() => {
    restoreScrollTop();
  });

  /** Common seed: 2 Open + 1 Done, enough to exercise the archive. */
  function seedTwoOpenOneDone(): void {
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "o2", text: "ligar dentista" }),
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
  }

  it("row 1 — 2 Open, 1 Done, closed: Ctrl+H opens archive; Done text present; scrollTop 0; defaultPrevented", async () => {
    seedTwoOpenOneDone();
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const region = main.parentElement as HTMLElement;
    region.scrollTop = ARCHIVE_HIDDEN_OFFSET; // starts hidden

    const event = keyEvent("H", { ctrlKey: true });
    await dispatch(event, window);

    expect(main.textContent).toContain("ocultar concluídas");
    expect(main.textContent).toContain("entregar relatório");
    expect(region.scrollTop).toBe(0);
    expect(event.defaultPrevented).toBe(true);
  });

  it("row 2 — open: Ctrl+H closes archive; Done text gone; scrollTop ARCHIVE_HIDDEN_OFFSET", async () => {
    seedTwoOpenOneDone();
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const region = main.parentElement as HTMLElement;

    // Open first
    region.scrollTop = 0;
    const event = keyEvent("H", { ctrlKey: true });
    await dispatch(event, window);

    // Archive is open; close it
    const event2 = keyEvent("H", { ctrlKey: true });
    await dispatch(event2, window);

    expect(main.textContent).toContain("ver concluídas");
    expect(main.textContent).not.toContain("entregar relatório");
    expect(region.scrollTop).toBe(ARCHIVE_HIDDEN_OFFSET);
  });

  it("row 3 — Ctrl+Shift+H: still closed; defaultPrevented false", async () => {
    seedTwoOpenOneDone();
    const container = await render(<App />);
    const main = container.querySelector("main")!;

    const event = keyEvent("H", { ctrlKey: true, shiftKey: true });
    await dispatch(event, window);

    expect(main.textContent).toContain("ver concluídas");
    expect(main.textContent).not.toContain("entregar relatório");
    expect(event.defaultPrevented).toBe(false);
  });

  it("row 4 — lowercase h (Ctrl+h) opens archive", async () => {
    seedTwoOpenOneDone();
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const region = main.parentElement as HTMLElement;
    region.scrollTop = ARCHIVE_HIDDEN_OFFSET;

    const event = keyEvent("h", { ctrlKey: true });
    await dispatch(event, window);

    expect(main.textContent).toContain("ocultar concluídas");
    expect(region.scrollTop).toBe(0);
  });

  it("row 5 — plain h, Alt+H, Meta+H: nothing happens; none defaultPrevented", async () => {
    seedTwoOpenOneDone();
    const container = await render(<App />);
    const main = container.querySelector("main")!;

    for (const init of [{ key: "h" }, { altKey: true, key: "H" }, { metaKey: true, key: "H" }]) {
      const event = keyEvent(init.key, init);
      await dispatch(event, window);
      expect(event.defaultPrevented).toBe(false);
    }
    expect(main.textContent).toContain("ver concluídas");
    expect(main.textContent).not.toContain("entregar relatório");
  });

  it("row 6 — Ctrl+H on capture input: opens; input value preserved", async () => {
    seedTwoOpenOneDone();
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const region = main.parentElement as HTMLElement;
    region.scrollTop = ARCHIVE_HIDDEN_OFFSET;

    const input = container.querySelector<HTMLInputElement>("input")!;
    typeInto(input, "abc");
    input.focus();

    const event = keyEvent("H", { ctrlKey: true });
    await dispatch(event, input);

    expect(main.textContent).toContain("ocultar concluídas");
    expect(input.value).toBe("abc");
  });

  it("row 7 — Ctrl+H on Card editor: still closed; editor stays, draft intact; defaultPrevented false", async () => {
    seedTwoOpenOneDone();
    const container = await render(<App />);
    const main = container.querySelector("main")!;

    await activate(queryLabel(container, "Editar")!);
    const editor = container.querySelector<HTMLTextAreaElement>("textarea[aria-label='Task']")!;
    typeInto(editor, "rascunho");

    const event = keyEvent("H", { ctrlKey: true });
    await dispatch(event, editor);

    expect(main.textContent).toContain("ver concluídas");
    expect(main.textContent).not.toContain("entregar relatório");
    const after = container.querySelector<HTMLTextAreaElement>("textarea[aria-label='Task']");
    expect(after).not.toBeNull();
    expect(after!.value).toBe("rascunho");
    expect(event.defaultPrevented).toBe(false);
  });

  it("row 8 — 2 Open, 0 Done: Ctrl+H does nothing; defaultPrevented false; no throw", async () => {
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "o2", text: "ligar dentista" }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;

    const event = keyEvent("H", { ctrlKey: true });
    await dispatch(event, window);

    expect(main.textContent).not.toContain("concluídas");
    expect(event.defaultPrevented).toBe(false);
  });

  it("row 9 — desktop + Ctrl+H: opens archive (same as row 1 but with desktop media)", async () => {
    stubDesktopMedia();
    seedTwoOpenOneDone();
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const region = main.parentElement as HTMLElement;
    region.scrollTop = ARCHIVE_HIDDEN_OFFSET;

    const event = keyEvent("H", { ctrlKey: true });
    await dispatch(event, window);

    expect(main.textContent).toContain("ocultar concluídas");
    expect(region.scrollTop).toBe(0);
  });

  it("row 10 — render then unmount: Ctrl+H does not throw; no console.error", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    seedTwoOpenOneDone();
    await render(<App />);

    await unmount();

    // Dispatch after unmount must not throw or warn about state updates
    const event = keyEvent("H", { ctrlKey: true });
    expect(() => dispatch(event, window)).not.toThrow();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("row 11 — open via click then Ctrl+H closes: shared state; scrollTop ARCHIVE_HIDDEN_OFFSET", async () => {
    seedTwoOpenOneDone();
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const region = main.parentElement as HTMLElement;

    // Open by clicking the link
    const toggleBtn = [...main.querySelectorAll("button")].find(
      (b) => b.textContent === "ver concluídas",
    )!;
    await click(toggleBtn);
    expect(main.textContent).toContain("ocultar concluídas");

    // Close via Ctrl+H
    const event = keyEvent("H", { ctrlKey: true });
    await dispatch(event, window);

    expect(main.textContent).toContain("ver concluídas");
    expect(main.textContent).not.toContain("entregar relatório");
    expect(region.scrollTop).toBe(ARCHIVE_HIDDEN_OFFSET);
  });
});
