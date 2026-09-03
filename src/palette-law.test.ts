// @ts-nocheck
/**
 * DARK CHROME — matrix rows 8–11.
 * Structural assertions on the palette module: the CHROME object shape, the SURFACE
 * aliases, and the guard that no hex literals leak outside palette.ts.
 *
 * Row 10 (no hex outside palette.ts) is green on the base and must stay green —
 * it is the guard for the whole cycle. Rows 8, 9, 11 are red on the base because
 * CHROME and SURFACE_DARK do not exist yet.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

describe("dark palette law", () => {
  it("8 — CHROME is an exported const object with light and dark sub-objects, each having seven chrome keys", async () => {
    const palette = await import("./palette");
    const chrome = (palette as Record<string, unknown>).CHROME as
      | { light: Record<string, string>; dark: Record<string, string> }
      | undefined;

    expect(chrome, "CHROME must be exported from palette.ts").toBeDefined();

    const expectedKeys = [
      "surface",
      "captureBg",
      "textPrimary",
      "textQuiet",
      "hairline",
      "toastBg",
      "toastInk",
    ];

    for (const key of expectedKeys) {
      expect(chrome!.light[key], `CHROME.light.${key}`).toBeDefined();
      expect(chrome!.dark[key], `CHROME.dark.${key}`).toBeDefined();
    }
  });

  it("9 — SURFACE is CHROME.light.surface and SURFACE_DARK is CHROME.dark.surface", async () => {
    const palette = await import("./palette");
    const chrome = (palette as Record<string, unknown>).CHROME as
      | { light: Record<string, string>; dark: Record<string, string> }
      | undefined;
    const SURFACE = (palette as Record<string, unknown>).SURFACE as string | undefined;
    const SURFACE_DARK = (palette as Record<string, unknown>).SURFACE_DARK as
      | string
      | undefined;

    expect(chrome, "CHROME must exist").toBeDefined();
    expect(SURFACE, "SURFACE must exist").toBeDefined();
    expect(SURFACE_DARK, "SURFACE_DARK must be exported").toBeDefined();
    expect(SURFACE).toBe(chrome!.light.surface);
    expect(SURFACE_DARK).toBe(chrome!.dark.surface);
  });

  it("10 — no hex literals outside src/palette.ts (guard for the whole cycle)", () => {
    // This is GREEN on the base: all hex literals live in palette.ts today.
    // It must stay green through the entire dark-chrome cycle — any hex leaked
    // into a component breaks this test.
    const HEX_RE = /["']#[0-9a-fA-F]{3,8}["']/g;
    const srcDir = path.join(root, "src");
    const violations: string[] = [];

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
          // palette.ts is the only file allowed; test files are not production code
          if (entry.name === "palette.ts" || entry.name.includes(".test.")) continue;
          const rel = path.relative(root, full).replace(/\\/g, "/");
          const content = fs.readFileSync(full, "utf-8");
          let match: RegExpExecArray | null;
          while ((match = HEX_RE.exec(content)) !== null) {
            violations.push(`${rel}: ${match[0]}`);
          }
        }
      }
    };
    walk(srcDir);

    expect(
      violations,
      `hex literals must stay in src/palette.ts only; found:\n${violations.join("\n")}`,
    ).toHaveLength(0);
  });

  it("11 — CARD, INK_ON_LIGHT, INK_ON_DARK, OVERDUE_RED are untouched exports", async () => {
    const palette = await import("./palette");

    expect(palette.CARD).toBeDefined();
    expect(palette.INK_ON_LIGHT).toBeDefined();
    expect(palette.INK_ON_DARK).toBeDefined();
    expect(palette.OVERDUE_RED).toBeDefined();

    // Known values — if these change, the cycle broke the Card swatches
    expect(palette.INK_ON_LIGHT).toBe("#1a1a1a");
    expect(palette.INK_ON_DARK).toBe("#ffffff");
    expect(palette.OVERDUE_RED).toBe("#ff7a68");
    expect(palette.CARD.work.light).toBe("#f9d4c8");
    expect(palette.CARD.work.medium).toBe("#e3683e");
    expect(palette.CARD.work.dark).toBe("#973e20");
  });
});
