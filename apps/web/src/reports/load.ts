import { use } from "react";
import type { ReportsSource } from "./types";

let pending: Promise<ReportsSource> | null = null;

/**
 * The report data loads as its own chunk (it re-runs the engine for
 * the monthly history), once, the first time a report screen needs it.
 */
export function loadReportsSource(): Promise<ReportsSource> {
  if (pending === null) {
    const p = import("./source").then((m) => m.buildReportsSource());
    void p.then((value) => Object.assign(p, { status: "fulfilled", value }));
    pending = p;
  }
  return pending;
}

/** Suspends the first time; wrap the screen in <Suspense>. */
export function useReportsSource(): ReportsSource {
  return use(loadReportsSource());
}
