import { defineConfig } from "@playwright/test";

/**
 * Chromium only (the preinstalled browser; downloads are disabled).
 * The phone project is a 360 px Chromium viewport, not a WebKit preset.
 */
/** E2E_BASE_URL: test an already running preview (no build, no server). */
const BASE = process.env["E2E_BASE_URL"];

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: BASE ?? "http://localhost:4173",
    browserName: "chromium",
    trace: "off",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
    { name: "phone", use: { viewport: { width: 360, height: 740 } } },
  ],
  ...(BASE !== undefined ? {} : { webServer: {
    command: "pnpm exec vite build && pnpm exec vite preview --port 4173",
    url: "http://localhost:4173",
    reuseExistingServer: false,
    timeout: 120000,
  } }),
});
