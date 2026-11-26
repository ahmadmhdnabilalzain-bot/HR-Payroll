import { use } from "react";
import type { SetupMoreSource } from "./source";

let pending: Promise<SetupMoreSource> | null = null;

/** The data loads as its own chunk, once. */
export function loadSetupMore(): Promise<SetupMoreSource> {
  if (pending === null) {
    const p = import("./source").then((m) => m.buildSetupMoreSource());
    void p.then((value) => Object.assign(p, { status: "fulfilled", value }));
    pending = p;
  }
  return pending;
}

/** Suspends the first time; SetupMore wraps it in Suspense. */
export function useSetupMore(): SetupMoreSource {
  return use(loadSetupMore());
}
