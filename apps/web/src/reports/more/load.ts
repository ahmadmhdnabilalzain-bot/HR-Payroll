import { use } from "react";
import type { MoreSource } from "./source";

let pending: Promise<MoreSource> | null = null;

/** The data loads as its own chunk, once. */
export function loadMoreSource(): Promise<MoreSource> {
  if (pending === null) {
    const p = import("./source").then((m) => m.buildMoreSource());
    void p.then((value) => Object.assign(p, { status: "fulfilled", value }));
    pending = p;
  }
  return pending;
}

/** Suspends the first time; the Reports router wraps it in Suspense. */
export function useMoreSource(): MoreSource {
  return use(loadMoreSource());
}
