import { use } from "react";
import type { ReferralSource } from "../../demo/data/referrals";

let pending: Promise<ReferralSource> | null = null;

/** The ledger's data loads as its own chunk, once. */
export function loadReferrals(): Promise<ReferralSource> {
  if (pending === null) {
    const p = import("../../demo/data/referrals")
      .then((m) => m.buildReferralSource());
    void p.then((value) => Object.assign(p, { status: "fulfilled", value }));
    pending = p;
  }
  return pending;
}

/** Suspends the first time; the index wraps it in Suspense. */
export function useReferrals(): ReferralSource {
  return use(loadReferrals());
}
