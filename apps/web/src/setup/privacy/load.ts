import { use } from "react";
import type { PrivacySource } from "./source";

let pending: Promise<PrivacySource> | null = null;

/** The data loads as its own chunk, once. */
export function loadPrivacy(): Promise<PrivacySource> {
  if (pending === null) {
    const p = import("./source").then((m) => m.buildPrivacySource());
    void p.then((value) => Object.assign(p, { status: "fulfilled", value }));
    pending = p;
  }
  return pending;
}

/** Suspends the first time; SetupPrivacy wraps it in Suspense. */
export function usePrivacy(): PrivacySource {
  return use(loadPrivacy());
}
