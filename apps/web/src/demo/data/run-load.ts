import type { RunSource } from "./run-types";

let pending: Promise<RunSource> | null = null;

/**
 * The pay run in detail loads as its own chunk (the engine and the
 * explanations), once, the first time a screen needs it. When it has
 * loaded, the promise is marked fulfilled the way React's `use` reads
 * it, so later renders never suspend (main.tsx preloads it).
 */
export function loadRunSource(): Promise<RunSource> {
  if (pending === null) {
    const p = import("./run-detail").then((m) => m.buildRunSource());
    void p.then((value) => Object.assign(p, { status: "fulfilled", value }));
    pending = p;
  }
  return pending;
}
