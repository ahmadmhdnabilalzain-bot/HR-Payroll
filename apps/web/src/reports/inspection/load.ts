import { use, useEffect, useState } from "react";
import type { AuditData } from "./data";

let pending: Promise<AuditData> | null = null;
let cached: AuditData | null = null;

/** The data loads as its own chunk, once. */
export function loadAuditData(): Promise<AuditData> {
  if (pending === null) {
    const p = import("./data").then((m) => (cached = m.buildAuditData()));
    void p.then((value) => Object.assign(p, { status: "fulfilled", value }));
    pending = p;
  }
  return pending;
}

/** Suspends the first time; the Reports router wraps it in Suspense. */
export function useAuditData(): AuditData {
  return use(loadAuditData());
}

/** For Setup screens that cannot suspend: `null` while it loads. */
export function useAuditDataSoft(): AuditData | null {
  const [d, setD] = useState<AuditData | null>(cached);
  useEffect(() => {
    if (cached !== null) return undefined;
    let live = true;
    void loadAuditData().then((x) => { if (live) setD(x); });
    return () => { live = false; };
  }, []);
  return d;
}
