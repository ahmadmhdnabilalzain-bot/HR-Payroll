import { use } from "react";
import type { PayView } from "./types";

let pending: Promise<PayView> | null = null;
let loaded: PayView | null = null;

/**
 * The pay records load as their own chunk (the engine runs June to
 * October), once. Marked fulfilled the way React's `use` reads it, so
 * later renders never suspend.
 */
export function loadPay(): Promise<PayView> {
  if (pending === null) {
    const p = import("../demo/data/pay").then((m) => m.buildPayView());
    void p.then((value) => {
      loaded = value;
      Object.assign(p, { status: "fulfilled", value });
    });
    pending = p;
  }
  return pending;
}

/** The records if loaded, else null (the panel counts read this). */
export function payIfLoaded(): PayView | null {
  return loaded;
}

/** The pay records; suspends on first use while the chunk loads. */
export function usePay(): PayView {
  return use(loadPay());
}
