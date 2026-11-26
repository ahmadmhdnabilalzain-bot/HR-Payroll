import { lazy, Suspense } from "react";
import { Loading } from "../parts";

/**
 * `#/pay-run/more/sandbox`: the pay-structure sandbox (R41). It works
 * payslips out again, so it loads as its own chunk. PayArea's guard
 * (HR and the General manager) runs before this.
 */
const Screen = lazy(() => import("./Sandbox")
  .then((m) => ({ default: m.Sandbox })));

export function PaySandbox() {
  return (
    <Suspense fallback={<Loading />}>
      <Screen />
    </Suspense>
  );
}
