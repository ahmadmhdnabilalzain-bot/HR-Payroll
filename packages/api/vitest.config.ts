import { defineConfig } from "vitest/config";

/** pglite (WASM PostgreSQL) is slow to start under a parallel run. */
export default defineConfig({
  test: {
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
