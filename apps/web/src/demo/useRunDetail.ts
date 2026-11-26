import { use, useMemo } from "react";
import { loadRunSource } from "./data/run-load";
import type { RunDetail } from "./data/run-types";
import { useDemo } from "./state";

/**
 * The pay run in detail for the current demo state (the IBANs entered
 * so far). Suspends on first use while the chunk loads.
 */
export function useRunDetail(): RunDetail {
  const source = use(loadRunSource());
  const { state } = useDemo();
  return useMemo(() => source.at(state.ibans), [source, state.ibans]);
}
