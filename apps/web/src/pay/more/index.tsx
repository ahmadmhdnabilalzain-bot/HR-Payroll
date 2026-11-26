import type { ReactNode } from "react";
import { ExitList, ExitRecord } from "./Exit";
import { PriorEmployment } from "./Prior";

/** `#/pay-run/more/<screen>/<id>`: the WP19 Pay screens. */
export function PayMore(p: { rest: string[] }): ReactNode {
  const [, screen, id] = p.rest;
  if (screen === "exit") {
    return id === undefined ? <ExitList /> : <ExitRecord id={id} />;
  }
  return screen === "prior" ? <PriorEmployment /> : null;
}
