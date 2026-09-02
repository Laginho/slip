// @ts-nocheck
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(file: string): string {
  return fs.readFileSync(path.join(root, file), "utf-8");
}

describe("identity — rename to Slip + portrait lock", () => {
  // Row 1 — RED: manifest name/short_name currently "Tasks"
  it("vite config manifest has name and short_name 'Slip', no 'Tasks' literal", () => {
    const cfg = read("vite.config.ts");
    expect(cfg).toMatch(/name\s*:\s*["']Slip["']/);
    expect(cfg).toMatch(/short_name\s*:\s*["']Slip["']/);
    expect(cfg).not.toMatch(/["']Tasks["']/);
  });

  // Row 2 — RED: orientation field missing
  it("vite config manifest contains orientation 'portrait'", () => {
    const cfg = read("vite.config.ts");
    expect(cfg).toMatch(/orientation\s*:\s*["']portrait["']/);
  });

  // Row 3 — GREEN guard: base/start_url/scope/navigateFallback unchanged
  it("vite config base, start_url, scope, navigateFallback still /slip/ forms", () => {
    const cfg = read("vite.config.ts");
    expect(cfg).toMatch(/base\s*:\s*["']\/slip\/["']/);
    expect(cfg).toMatch(/start_url\s*:\s*["']\/slip\/["']/);
    expect(cfg).toMatch(/scope\s*:\s*["']\/slip\/["']/);
    expect(cfg).toMatch(/navigateFallback\s*:\s*["']\/slip\/index\.html["']/);
  });

  // Row 4 — RED: title currently "Tasks"
  it("index.html has <title>Slip</title> and theme-color placeholder", () => {
    const html = read("index.html");
    expect(html).toContain("<title>Slip</title>");
    expect(html).toContain("%THEME_COLOR%");
  });

  // Row 5 — RED: package name currently "task-tracker"
  it("package.json name is 'slip'", () => {
    const pkg = read("package.json");
    const parsed = JSON.parse(pkg);
    expect(parsed.name).toBe("slip");
  });

  // Row 6 — RED: DESIGN.md name currently "Tasks"
  it("DESIGN.md front-matter name is Slip and heading says Design System: Slip", () => {
    const md = read("DESIGN.md");
    expect(md).toMatch(/^name:\s*Slip$/m);
    expect(md).toContain("# Design System: Slip");
    expect(md).not.toContain("Design System: Tasks");
  });

  // Row 7 — GREEN guard: storage key unchanged
  it("STORAGE_KEY is still 'tasks/v1'", () => {
    const store = read("src/store.ts");
    expect(store).toContain('STORAGE_KEY = "tasks/v1"');
  });

  // Row 8 — GREEN guard: capture kind key unchanged
  it("sticky Kind key is still 'capture/kind'", () => {
    const cap = read("src/components/CaptureBar.tsx");
    expect(cap).toContain('"capture/kind"');
  });
});
