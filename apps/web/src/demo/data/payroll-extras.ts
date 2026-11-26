import {
  analyse,
  analysisDatasets,
  buildDemoCompany,
  compareParallel,
  contractCheck,
  CUSTOM_FIELD_LIMITS,
  customFields,
  elementReport,
  parallelSamples,
  payrollJournal,
  signOffReport,
  VARIANCE_LIMIT_TEXT,
  VARIANCE_SAMPLE_LIMIT_PCT,
  WHAT_IF_MAX_OVERTIME_MINUTES,
  whatIf,
  type PayrollJournal,
} from "@payroll/demo-data";
import { withIbans } from "./adapter";
import { deptOf } from "./run-detail";
import type { ExtrasSource } from "./payroll-extras-types";

/**
 * WP16's half of the demo data: the package's payroll extras over the
 * same company as the shared store. The journal and the what-if follow
 * the IBANs entered (held pay joins the file), like the pay run.
 */
export function buildExtrasSource(): ExtrasSource {
  const base = buildDemoCompany();
  const datasets = analysisDatasets(base);
  const journals = new Map<string, PayrollJournal>();
  const keyOf = (ibans: Readonly<Record<string, string>>): string =>
    JSON.stringify(Object.entries(ibans).sort());
  return {
    elements: elementReport(base),
    journal: (ibans) => {
      const k = keyOf(ibans);
      const hit = journals.get(k);
      if (hit !== undefined) return hit;
      const j = payrollJournal(withIbans(base, ibans));
      journals.set(k, j);
      return j;
    },
    datasets,
    analyse: (id, dim, measure) => analyse(datasets.find((d) =>
      d.id === id) ?? datasets[0]!, dim, measure),
    signOffs: signOffReport(base),
    whatIf: (w, ibans) => whatIf(withIbans(base, ibans), w),
    whatIfMaxMinutes: WHAT_IF_MAX_OVERTIME_MINUTES,
    people: base.payRun.payslips.map((s) => {
      const e = base.employees.find((x) => x.id === s.employeeId)!;
      return { id: e.id, name: e.fullName, department: deptOf(base, e),
        hasOvertime: s.input.overtime.length > 0,
        basic: s.input.employee.basicMonthly };
    }).sort((a, b) => a.name.localeCompare(b.name)),
    samples: parallelSamples(base),
    compare: (csv) => compareParallel(base, csv),
    contracts: contractCheck(base),
    fields: customFields(),
    fieldLimits: CUSTOM_FIELD_LIMITS,
    varianceLimitPct: VARIANCE_SAMPLE_LIMIT_PCT,
    varianceLimitText: VARIANCE_LIMIT_TEXT,
  };
}
