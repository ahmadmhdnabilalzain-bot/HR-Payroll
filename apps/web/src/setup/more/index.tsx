import { Suspense } from "react";
import type { ViewProps } from "../../views";
import { Connect } from "./Connect";

/** `#/setup/more/<page>`: the WP19 Setup connection pages. */
export function SetupMore(p: ViewProps) {
  const page = p.rest[1] ?? "";
  return (
    <Suspense fallback={<p style={{ padding: "var(--space-7) var(--page-pad)",
      color: "var(--color-text-muted)" }}>Loading…</p>}>
      <Connect page={page} />
    </Suspense>
  );
}
