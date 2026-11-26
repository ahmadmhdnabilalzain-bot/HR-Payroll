import { Suspense } from "react";
import { Loading } from "../parts";
import { Advice } from "./Advice";
import { Checks } from "./Checks";
import { Holds } from "./Holds";
import { WhatIf } from "./WhatIf";

/**
 * WP16's pay screens under `#/pay-run/gate/<screen>`: the pre-pay
 * checks (the front page), what-if, the bank advice and salary holds.
 * PayArea's guard (HR and the General manager) runs before this.
 */
export function Gate(p: { rest: string[] }) {
  const sub = p.rest[1];
  return (
    <Suspense fallback={<Loading />}>
      {sub === "what-if" ? <WhatIf />
        : sub === "advice" ? <Advice />
          : sub === "holds" ? <Holds /> : <Checks />}
    </Suspense>
  );
}
