import {
  buildDemoCompany,
  exitFlows,
  PRIOR_EVIDENCE,
  PRIOR_USE_NOTE,
  priorEmploymentRows,
  type ExitFlow,
  type PriorEmploymentRow,
} from "@payroll/demo-data";

/** The Pay sweep's data (a lazy chunk): the package's selectors. */
export interface PayMoreSource {
  exits: ExitFlow[];
  prior: PriorEmploymentRow[];
  priorNote: string;
  evidence: readonly { value: string; label: string }[];
}

export function buildPayMoreSource(): PayMoreSource {
  const c = buildDemoCompany();
  return { exits: exitFlows(c), prior: priorEmploymentRows(c),
    priorNote: PRIOR_USE_NOTE, evidence: PRIOR_EVIDENCE };
}
