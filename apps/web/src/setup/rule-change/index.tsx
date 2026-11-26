import { lazy, Suspense } from "react";
import type { ViewProps } from "../../views";

/**
 * `#/setup/rule-change`: the S09 preview (WP28). It re-runs payslips
 * through the engine, so it loads as its own chunk.
 */
const Screen = lazy(() => import("./RuleChange")
  .then((m) => ({ default: m.RuleChange })));

export function SetupRuleChange(_p: ViewProps) {
  return (
    <Suspense fallback={<p style={{ padding: "var(--space-7) var(--page-pad)",
      color: "var(--color-text-muted)" }}>Loading…</p>}>
      <Screen />
    </Suspense>
  );
}
