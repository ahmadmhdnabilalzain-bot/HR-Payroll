import { use } from "react";
import type { CostSource } from "./source";

let pending: Promise<CostSource> | null = null;

/** The cost data loads as its own chunk, once (the engine runs). */
export function loadCostSource(): Promise<CostSource> {
  if (pending === null) {
    const p = import("./source").then((m) => m.buildCostSource());
    void p.then((value) => Object.assign(p, { status: "fulfilled", value }));
    pending = p;
  }
  return pending;
}

/** Suspends the first time; the Reports router wraps it in Suspense. */
export function useCostSource(): CostSource {
  return use(loadCostSource());
}
