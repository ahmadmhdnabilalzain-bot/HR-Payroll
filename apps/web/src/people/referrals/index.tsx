import { lazy, Suspense } from "react";

/**
 * `#/people/moves/referrals`: the referral and agency ledger (P22).
 * Moves' guard (HR and the General manager) runs before this.
 */
const Screen = lazy(() => import("./Referrals")
  .then((m) => ({ default: m.Referrals })));

export function ReferralsPage() {
  return (
    <Suspense fallback={<p style={{ padding: "var(--space-7) var(--page-pad)",
      color: "var(--color-text-muted)" }}>Loading…</p>}>
      <Screen />
    </Suspense>
  );
}
