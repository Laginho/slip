import { defineConfig } from "vitest/config";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
// Explicit .ts extension: Vite's planned native config loader will not resolve the
// extensionless form, and both the build and the test run warn about it today.
import { SURFACE } from "./src/palette.ts";

/**
 * Resolves index.html's theme-color from the palette at build time.
 *
 * Without this the colour is a second literal living outside src/palette.ts, and tuning
 * the palette -- which is the entire point of that file -- silently leaves the installed
 * PWA's window chrome and splash on the old value.
 */
const themeColor: Plugin = {
  name: "task-tracker:theme-color",
  transformIndexHtml(html) {
    return html.replace("%THEME_COLOR%", SURFACE);
  },
};

export default defineConfig({
  plugins: [
    react(),
    themeColor,
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png"],
      manifest: {
        name: "Tasks",
        short_name: "Tasks",
        lang: "pt-BR",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: SURFACE,
        theme_color: SURFACE,
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        navigateFallback: "index.html",
      },
    }),
  ],
  test: {
    environment: "jsdom",
  },
});
