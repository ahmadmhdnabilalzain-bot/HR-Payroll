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
    target: "es2022",
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      treeshake: {
        moduleSideEffects: (id: string) => !PURE_PACKAGES.test(id),
      },
    },
  },
});
