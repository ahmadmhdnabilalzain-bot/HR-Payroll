import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * The engine and wps packages are pure, but their modules freeze
 * constants at top level, which the bundler reads as side effects.
 * Declaring them side-effect free lets an unused rule pack (and the
 * whole gratuity code) stay out of chunks that do not import it.
 */
const PURE_PACKAGES = /[\\/]packages[\\/](engine|wps|contract)[\\/]/;

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  preview: { port: 4173 },
  build: {
    /* The owner's iPhone may run anything from iOS 15.4 up: syntax
     * and CSS are lowered for Safari 15 (es2022 shipped class static
     * blocks, which Safari reads only from 16.4), and for the
     * Chromium browsers a Windows laptop runs. */
    target: ["es2020", "safari15", "chrome100", "edge100", "firefox100"],
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      treeshake: {
        moduleSideEffects: (id: string) => !PURE_PACKAGES.test(id),
      },
    },
  },
});
