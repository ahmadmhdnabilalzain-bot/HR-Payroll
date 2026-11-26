import type { TimeData, TimeSource } from "./time-types";

let pending: Promise<TimeSource> | null = null;
let loaded: TimeData | null = null;

/**
 * The Time data loads as its own chunk (it runs the engine's day
 * sheets and payslips), once. When it has loaded, the promise is
 * marked fulfilled the way React's `use` reads it, so later renders
 * never suspend, and `peekTime` answers without waiting.
 */
export function loadTimeSource(): Promise<TimeSource> {
  if (pending === null) {
    const p = import("./time").then((m) => m.buildTimeSource());
    void p.then((value) => {
      loaded = value.data;
      Object.assign(p, { status: "fulfilled", value });
    });
    pending = p;
  }
  return pending;
}

/** The data if the chunk has arrived, else null (counts stay quiet). */
export function peekTime(): TimeData | null {
  return loaded;
}
