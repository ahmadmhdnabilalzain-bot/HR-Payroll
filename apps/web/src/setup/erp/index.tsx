import { Suspense } from "react";
import type { ViewProps } from "../../views";
import { Erp } from "./Erp";

/** `#/setup/erp/<page>`: the WP26 ERP, ledger and Teams pages. */
export function SetupErp(p: ViewProps) {
  return (
    <Suspense fallback={<p style={{ padding: "var(--space-7) var(--page-pad)",
      color: "var(--color-text-muted)" }}>Loading…</p>}>
      <Erp page={p.rest[1] ?? ""} />
    </Suspense>
  );
}
