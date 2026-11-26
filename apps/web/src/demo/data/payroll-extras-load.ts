import { use } from "react";
import type { ExtrasSource } from "./payroll-extras-types";

let pending: Promise<ExtrasSource> | null = null;

/**
 * The payroll extras load as their own chunk (the engine reruns
 * months), once, the first time a WP16 screen needs them. Marked
 * fulfilled the way React's `use` reads it, so later renders never
 * suspend.
 */
export function loadExtras(): Promise<ExtrasSource> {
  if (pending === null) {
    const p = import("./payroll-extras").then((m) => m.buildExtrasSource());
    void p.then((value) => Object.assign(p, { status: "fulfilled", value }));
    pending = p;
  }
  return pending;
}

/** Suspends the first time; wrap the screen in <Suspense>. */
export function useExtras(): ExtrasSource {
  return use(loadExtras());
}
