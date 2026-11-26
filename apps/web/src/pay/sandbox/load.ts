import { use } from "react";
import type { SandboxSource } from "../../demo/data/sandbox";

let pending: Promise<SandboxSource> | null = null;

/** The sandbox's data loads as its own chunk, once. */
export function loadSandbox(): Promise<SandboxSource> {
  if (pending === null) {
    const p = import("../../demo/data/sandbox")
      .then((m) => m.buildSandboxSource());
    void p.then((value) => Object.assign(p, { status: "fulfilled", value }));
    pending = p;
  }
  return pending;
}

/** Suspends the first time; the index wraps it in Suspense. */
export function useSandbox(): SandboxSource {
  return use(loadSandbox());
}
