import type { RunSource } from "./run-types";

let pending: Promise<RunSource> | null = null;

/**
 * The pay run in detail loads as its own chunk (the engine and the
 * explanations), once, the first time a screen needs it.
 */
export function loadRunSource(): Promise<RunSource> {
  pending ??= import("./run-detail").then((m) => m.buildRunSource());
  return pending;
}
