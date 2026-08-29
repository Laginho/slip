/**
 * Shared scaffolding for component tests. There is no component-testing library in
 * this repo, so these wrap react-dom's createRoot in act() and drive real DOM events
 * against the rendered markup.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ReactElement } from "react";
import { vi } from "vitest";
import type { Task } from "./store";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** A Task with every field explicit, mirroring the helper in store.test.ts. */
export function task(over: Partial<Task> & Pick<Task, "id">): Task {
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

/**
 * jsdom has no matchMedia. Every query reports "no match" -- the touch-device profile --
 * which is exactly the configuration the keyboard controls must not depend on.
 */
export function stubNoMatchMedia(): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }));
}

/** Mobile (<900px): min-width:900 is false; desktop (≥900px): true. Keeps hover:false. */
export function stubMobileMedia(): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }));
}

export function stubDesktopMedia(): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(min-width: 900px)",
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }));
}

/** Generic stub for the responsive breakpoint; allows future extensibility. */
export function stubMatchMediaWide(wide: boolean): void {
  if (wide) stubDesktopMedia();
  else stubMobileMedia();
}

let container: HTMLDivElement | null = null;
let root: Root | null = null;

/** Render an element into a fresh container appended to the body; returns it.
 *  Any previous render is unmounted first, so tests may render repeatedly. */
export async function render(element: ReactElement): Promise<HTMLDivElement> {
  if (root !== null) {
    const doomed = container!;
    await act(async () => root!.unmount());
    doomed.remove();
  }
  container = document.body.appendChild(document.createElement("div"));
  root = createRoot(container);
  await act(async () => root!.render(element));
  return container;
}

export async function unmount(): Promise<void> {
  if (root !== null && container !== null) {
    const doomed = container;
    await act(async () => root!.unmount());
    doomed.remove();
  }
  container = null;
  root = null;
}

export async function click(element: HTMLElement): Promise<void> {
  await act(async () => element.click());
}

/**
 * Focus first, then activate. This models the keyboard path, and it matters: a resting
 * Card's controls carry pointer-events:none, so activation is only legitimate once
 * focus has revealed them. HTMLElement.click() alone bypasses hit-testing entirely and
 * would prove nothing about whether a real user could reach the control.
 */
export async function activate(element: HTMLElement): Promise<void> {
  await act(async () => element.focus());
  await act(async () => element.click());
}

/** A bubbling keydown, for driving React onKeyDown handlers. */
export function keyEvent(key: string): KeyboardEvent {
  return new KeyboardEvent("keydown", { key, bubbles: true });
}

export async function dispatch(event: Event, target: EventTarget): Promise<void> {
  await act(async () => target.dispatchEvent(event));
}

/** Set an input's value the way a real keystroke would, so React onChange fires. */
export function typeInto(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

export function queryLabel(root: ParentNode, label: string): HTMLElement | null {
  return root.querySelector(`[aria-label="${label}"]`);
}
