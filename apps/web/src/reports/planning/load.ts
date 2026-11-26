import { use } from "react";
import type { PlanningSource } from "./source";

let pending: Promise<PlanningSource> | null = null;

/** The planning data loads as its own chunk, once (the engine runs). */
export function loadPlanningSource(): Promise<PlanningSource> {
  if (pending === null) {
    const p = import("./source").then((m) => m.buildPlanningSource());
    void p.then((value) => Object.assign(p, { status: "fulfilled", value }));
    pending = p;
  }
  return pending;
}

/** Suspends the first time; the Reports router wraps it in Suspense. */
export function usePlanningSource(): PlanningSource {
  return use(loadPlanningSource());
}
