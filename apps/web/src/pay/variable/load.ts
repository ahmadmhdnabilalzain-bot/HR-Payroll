import { use } from "react";
import type { VariableSource } from "./source";

let pending: Promise<VariableSource> | null = null;

/** The bonus and commission data load as their own chunk, once. */
export function loadVariableSource(): Promise<VariableSource> {
  if (pending === null) {
    const p = import("./source").then((m) => m.buildVariableSource());
    void p.then((value) => Object.assign(p, { status: "fulfilled", value }));
    pending = p;
  }
  return pending;
}

/** Suspends the first time; wrap the screen in <Suspense>. */
export function useVariableSource(): VariableSource {
  return use(loadVariableSource());
}
