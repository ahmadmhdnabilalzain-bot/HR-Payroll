import { lazy, Suspense } from "react";
import type { ViewProps } from "../../views";

/**
 * The Setup rule screens (WP8). They read the engine's rule packs, so
 * they load as their own chunk and the entry chunk stays free of rule
 * code (tests/unit/bundle.test.ts).
 */
const Screens = lazy(() => import("./Screens"));

export function SetupRules(p: ViewProps) {
  return (
    <Suspense fallback={null}>
      <Screens rest={p.rest} />
    </Suspense>
  );
}
