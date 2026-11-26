import { use } from "react";
import type { PayMoreSource } from "./source";

let pending: Promise<PayMoreSource> | null = null;

/** The data loads as its own chunk, once. */
export function loadPayMore(): Promise<PayMoreSource> {
  if (pending === null) {
    const p = import("./source").then((m) => m.buildPayMoreSource());
    void p.then((value) => Object.assign(p, { status: "fulfilled", value }));
    pending = p;
  }
  return pending;
}

/** Suspends the first time; PayArea wraps it in Suspense. */
export function usePayMore(): PayMoreSource {
  return use(loadPayMore());
}
