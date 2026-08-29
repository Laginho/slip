import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Task } from "./store";
import { Card } from "./components/Card";
import {
  activate,
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
 * The keyboard contract: Concluir, Editar and Apagar are real buttons with accessible
 * names, reachable and revealed by focus alone -- never gated on a pointer media
 * query. At rest they are invisible AND untouchable (pointer-events:none), so they
 * cannot take a tap meant for the Card or block its swipe strip. Gestures remain
 * shortcuts; these buttons are the interface.
 */

const NOW = new Date(2026, 7, 22);

async function renderCard(
  handlers?: {
    onComplete?: (task: Task) => boolean;
    onDelete?: (task: Task) => boolean;
    onEdit?: (task: Task, text: string) => boolean;
  },
  wide = false,
) {
  const card = task({ id: "a", text: "entregar relatório" });
  const container = await render(
    <ul>
      <Card
        task={card}
        now={NOW}
        wide={wide}
        onComplete={handlers?.onComplete ?? (() => true)}
        onDelete={handlers?.onDelete ?? (() => true)}
        onEdit={handlers?.onEdit ?? (() => true)}
      />
    </ul>,
  );
  return { card, container };
}

async function openEditor(container: HTMLElement): Promise<HTMLInputElement> {
  await activate(queryLabel(container, "Editar")!);
  return container.querySelector<HTMLInputElement>('input[aria-label="Task"]')!;
}

beforeEach(() => {
  stubNoMatchMedia();
});

afterEach(async () => {
  await unmount();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("keyboard-accessible actions", () => {
  it("exposes Concluir, Editar and Apagar as native named buttons", async () => {
    const { container } = await renderCard();

    for (const label of ["Concluir", "Editar", "Apagar"]) {
      const button = queryLabel(container, label);
      expect(button, label).not.toBeNull();
      expect(button!.tagName, label).toBe("BUTTON");
    }
  });

  it("renders the buttons even when every media query reports a touch device", async () => {
    // stubNoMatchMedia answers false to everything: no fine pointer, no hover.
    const { container } = await renderCard();

    expect(queryLabel(container, "Concluir")).not.toBeNull();
    expect(queryLabel(container, "Editar")).not.toBeNull();
    expect(queryLabel(container, "Apagar")).not.toBeNull();
  });

  it("keeps them in stable tab order and makes each one focusable", async () => {
    const { container } = await renderCard();

    const concluir = queryLabel(container, "Concluir")!;
    const editar = queryLabel(container, "Editar")!;
    const apagar = queryLabel(container, "Apagar")!;

    // DOM order is what Tab follows for native buttons.
    expect(
      concluir.compareDocumentPosition(editar) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      editar.compareDocumentPosition(apagar) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    for (const button of [concluir, editar, apagar]) {
      button.focus();
      expect(document.activeElement).toBe(button);
    }
  });

  it("rests invisible AND inert, then reveals and enables on focus", async () => {
    const { container } = await renderCard();

    const concluir = queryLabel(container, "Concluir") as HTMLButtonElement;
    // Rest: hidden, and not a hit target -- a tap there must reach the Card's own
    // gestures instead of silently deleting or completing the Task.
    expect(concluir.style.opacity).toBe("0");
    expect(concluir.style.pointerEvents).toBe("none");

    // React's onFocus bubbles up from the button; no matchMedia involved.
    await act(async () => concluir.focus());
    expect(concluir.style.opacity).toBe("0.7");
    expect(concluir.style.pointerEvents).toBe("auto");

    await act(async () => concluir.blur());
    expect(concluir.style.opacity).toBe("0");
    expect(concluir.style.pointerEvents).toBe("none");
  });

  it("ignores emulated mouse-over on a touch profile instead of arming the buttons", async () => {
    // stubNoMatchMedia answers false to every query: no hover capability. Touch
    // browsers fire compatibility mouseover/mouseenter after a plain tap and leave the
    // state stuck -- the reveal must not arm from it, or the second half of a
    // double-tap could land on Apagar.
    const { container } = await renderCard();
    const li = container.querySelector("li")!;
    const concluir = queryLabel(container, "Concluir") as HTMLButtonElement;

    await dispatch(new MouseEvent("mouseover", { bubbles: true }), li);

    expect(concluir.style.opacity).toBe("0");
    expect(concluir.style.pointerEvents).toBe("none");

    // The same gate leaves the keyboard path untouched.
    await act(async () => concluir.focus());
    expect(concluir.style.opacity).toBe("0.7");
    expect(concluir.style.pointerEvents).toBe("auto");
  });

  it("still reveals via genuine mouse hover where hover capability exists", async () => {
    vi.stubGlobal(
      "matchMedia",
      (query: string) => ({ matches: query === "(hover: hover)", media: query }),
    );
    const { container } = await renderCard();
    const li = container.querySelector("li")!;
    const concluir = queryLabel(container, "Concluir") as HTMLButtonElement;

    await dispatch(new MouseEvent("mouseover", { bubbles: true }), li);

    expect(concluir.style.opacity).toBe("0.7");
    expect(concluir.style.pointerEvents).toBe("auto");
  });

  it("activates Concluir and Apagar via focus-then-activation, and Editar focuses its input", async () => {
    const onComplete = vi.fn(() => true);
    const first = await renderCard({ onComplete });
    await activate(queryLabel(first.container, "Concluir")!);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(first.card);

    const onEdit = vi.fn(() => true);
    const second = await renderCard({ onEdit });
    const input = await openEditor(second.container);
    expect(input).not.toBeNull();
    expect(document.activeElement).toBe(input); // autoFocus lands in jsdom too

    const onDelete = vi.fn(() => true);
    const third = await renderCard({ onDelete });
    await activate(queryLabel(third.container, "Apagar")!);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});

describe("the edit lifecycle", () => {
  it("commits on Enter, closes the editor, and hands focus back to the Card", async () => {
    const onEdit = vi.fn(() => true);
    const { card, container } = await renderCard({ onEdit });
    const input = await openEditor(container);

    typeInto(input, "entregar relatório revisado");
    await dispatch(keyEvent("Enter"), input);
    await act(async () => {}); // let the focus-restoring effect run

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(card, "entregar relatório revisado");
    expect(container.querySelector('input[aria-label="Task"]')).toBeNull();
    // A standalone Card renders its props; the committed text landing in storage is
    // asserted against the real App in App.test.tsx. Here we pin the editor closing
    // and keyboard focus returning to the Card instead of dropping to <body>.
    expect(document.activeElement).toBe(queryLabel(container, "Editar"));
  });

  it("keeps the editor open with the draft when the write fails", async () => {
    const onEdit = vi.fn(() => false);
    const { card, container } = await renderCard({ onEdit });
    const input = await openEditor(container);

    typeInto(input, "texto que não salvou");
    await dispatch(keyEvent("Enter"), input);

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(card, "texto que não salvou");
    // The editor never closed and every keystroke survives for a retry.
    const stillOpen = container.querySelector<HTMLInputElement>('input[aria-label="Task"]')!;
    expect(stillOpen.value).toBe("texto que não salvou");
  });

  it("does not steal focus when a blur commit succeeds", async () => {
    const onEdit = vi.fn(() => true);
    const { container } = await renderCard({ onEdit });
    const input = await openEditor(container);

    typeInto(input, "texto novo");
    await act(async () => input.blur()); // focus falls to <body>, as the user moved it

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(container.querySelector('input[aria-label="Task"]')).toBeNull();
    expect(document.activeElement).toBe(document.body); // nothing yanked back
  });

  it("cancels on Escape without writing, reverting the draft and keeping focus", async () => {
    const onEdit = vi.fn(() => true);
    const { card, container } = await renderCard({ onEdit });
    const input = await openEditor(container);

    typeInto(input, "rascunho descartável");
    await dispatch(keyEvent("Escape"), input);

    expect(onEdit).not.toHaveBeenCalled();
    expect(container.querySelector('input[aria-label="Task"]')).toBeNull();
    expect(container.textContent).toContain(card.text);
    expect(document.activeElement).toBe(queryLabel(container, "Editar"));
  });
});

describe("a swipe flight whose write fails", () => {
  it("springs the Card back instead of stranding it off-screen", async () => {
    vi.useFakeTimers();
    try {
      // Storage refuses the write when the exit finally reports up.
      const onComplete = vi.fn(() => false);
      const { card, container } = await renderCard({ onComplete });
      const li = container.querySelector("li")!;

      // Swipe right past the threshold: pointerdown, drag, release at dx = 100px.
      const fire = (type: string, x: number) =>
        new MouseEvent(type, { bubbles: true, clientX: x, clientY: 0 });
      await dispatch(fire("pointerdown", 0), li);
      await dispatch(fire("pointermove", 100), li);
      await dispatch(fire("pointerup", 100), li);

      // Mid-flight the Card is off-screen and the action has not fired yet.
      expect(li.style.transform).toBe("translateX(110%)");
      expect(onComplete).not.toHaveBeenCalled();

      // The exit guard lands (jsdom sends no transitionend) and reports failure...
      await act(async () => {
        vi.advanceTimersByTime(200 + 150);
      });

      // ...so the Card must come back to rest, not hang off-screen forever.
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith(card);
      expect(li.style.transform).toBe("translateX(0)");
    } finally {
      vi.useRealTimers();
    }
  });
});

/**
 * Visual promotion 04: Phone B/A Conversa (bubble) vs Desktop A/A Parede (wall).
 * Production Card now takes the required `wide: boolean`: false renders the bubble
 * (left-aligned 86%, radius 6/16/16/16, "vence 30/08" em meta separada), true
 * renders the wall card (radius 10, sem cap 86%, "30/08" sem prefixo "vence").
 */
describe("visual — promoção B/A Conversa (mobile) vs A/A Parede (desktop)", () => {
  const FIXED_NOW = new Date(2026, 7, 27, 12, 0, 0); // 27/08/2026 local

  function cardTask(): Task {
    return task({ id: "vis-1", text: "preparar apresentação", deadline: "2026-08-30" });
  }

  async function renderVisual(wide: boolean): Promise<HTMLElement> {
    const t = cardTask();
    const container = await render(
      <ul>
        <Card
          task={t}
          now={FIXED_NOW}
          wide={wide}
          onComplete={() => true}
          onDelete={() => true}
          onEdit={() => true}
        />
      </ul>,
    );
    return container;
  }

  it("Card mobile (wide=false) é bubble à esquerda: maxWidth 86% radius 6px 16px 16px 16px e prazo vence 30/08 em meta separada", async () => {
    const container = await renderVisual(false);
    const li = container.querySelector("li") as HTMLElement;
    expect(li).not.toBeNull();
    // Bubble constraints —Conversational composition phone <900
    expect(li.style.maxWidth).toBe("86%");
    expect(li.style.borderRadius).toBe("6px 16px 16px 16px");
    // Deadline meta: exactly "vence 30/08" (not plain 30/08), em linha separada
    expect(li.textContent).toContain("vence 30/08");
    // Ensure the plain "30/08" alone is wrapped as vence — at least one node holds the prefix
    const hasVenceNode = [...li.querySelectorAll("span")].some((s) =>
      s.textContent?.includes("vence 30/08"),
    );
    expect(hasVenceNode, "prazo em meta separada com prefixo vence").toBe(true);
  });

  it("Card desktop (wide=true) é parede: radius 10 sem cap 86% e prazo 30/08 sem prefixo vence", async () => {
    const container = await renderVisual(true);
    const li = container.querySelector("li") as HTMLElement;
    expect(li).not.toBeNull();
    // Wall card fills cell — no 86% cap
    expect(li.style.maxWidth).not.toBe("86%");
    // Explicit check: maxWidth either empty or 100%/none, never bubble cap
    expect(["", "100%", "none"]).toContain(li.style.maxWidth);
    expect(li.style.borderRadius).toBe("10px");
    // Desktop keeps compact deadline "30/08" without "vence"
    expect(li.textContent).toContain("30/08");
    expect(li.textContent).not.toContain("vence 30/08");
  });
});
