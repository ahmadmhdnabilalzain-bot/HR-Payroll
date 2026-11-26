import { use } from "react";
import type { SetupErpSource } from "./source";

let pending: Promise<SetupErpSource> | null = null;

/** The data loads as its own chunk, once. */
export function loadSetupErp(): Promise<SetupErpSource> {
  if (pending === null) {
    const p = import("./source").then((m) => m.buildSetupErpSource());
    void p.then((value) => Object.assign(p, { status: "fulfilled", value }));
    pending = p;
  }
  return pending;
}

/** Suspends the first time; SetupErp wraps it in Suspense. */
export function useSetupErp(): SetupErpSource {
  return use(loadSetupErp());
}
