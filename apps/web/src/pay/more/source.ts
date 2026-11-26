import {
  buildDemoCompany,
  exitFlows,
  type ExitFlow,
} from "@payroll/demo-data";

/** The exit flows (a lazy chunk): the package's selectors, gathered. */
export interface PayMoreSource {
  exits: ExitFlow[];
}

export function buildPayMoreSource(): PayMoreSource {
  return { exits: exitFlows(buildDemoCompany()) };
}
