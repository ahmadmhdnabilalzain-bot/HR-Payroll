import { useEffect, useState } from "react";
import type { StructureData } from "./data";

let cached: StructureData | null = null;
let pending: Promise<StructureData> | null = null;

/**
 * The structure data, loaded once as its own chunk (it imports the
 * data package). `null` while it loads.
 */
export function useStructure(): StructureData | null {
  const [data, setData] = useState<StructureData | null>(cached);
  useEffect(() => {
    if (cached !== null) return undefined;
    let live = true;
    pending ??= import("./data").then((m) =>
      (cached = m.buildStructureData()));
    void pending.then((d) => { if (live) setData(d); });
    return () => { live = false; };
  }, []);
  return data;
}
