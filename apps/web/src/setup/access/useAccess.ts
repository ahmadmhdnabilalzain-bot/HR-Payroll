import { useEffect, useState } from "react";
import type { AccessData } from "./data";

let cached: AccessData | null = null;
let pending: Promise<AccessData> | null = null;

/**
 * The access data, loaded once as its own chunk (it imports the data
 * package). `null` while it loads.
 */
export function useAccess(): AccessData | null {
  const [data, setData] = useState<AccessData | null>(cached);
  useEffect(() => {
    if (cached !== null) return undefined;
    let live = true;
    pending ??= import("./data").then((m) => (cached = m.buildAccessData()));
    void pending.then((d) => { if (live) setData(d); });
    return () => { live = false; };
  }, []);
  return data;
}
