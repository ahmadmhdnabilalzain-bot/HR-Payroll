import { defineConfig } from "vitest/config";

/**
 * pglite (WASM PostgreSQL) is slow to start and memory-hungry under a
 * parallel run: long timeouts and at most three workers.
 */
export default defineConfig({
  test: {
    testTimeout: 60_000,
    hookTimeout: 60_000,
    maxWorkers: 3,
  },
});
