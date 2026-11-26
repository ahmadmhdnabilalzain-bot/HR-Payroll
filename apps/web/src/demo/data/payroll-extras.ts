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
  type ElementReport,
  type PayrollJournal,
} from "@payroll/demo-data";
import { sumExplain } from "../../components/explain/sum";
import { money, type Explanation } from "../../components/explain/types";
import { withIbans } from "./adapter";
import { deptOf } from "./run-detail";
import type { ExtrasSource } from "./payroll-extras-types";

/**
 * WP16's half of the demo data: the package's payroll extras over the
 * same company as the shared store. The journal and the what-if follow
 * the IBANs entered (held pay joins the file), like the pay run.
 */
/** Each side of the journal: its lines, added up. */
function journalExplain(j: PayrollJournal, scope: string)
  : { debits: Explanation; credits: Explanation } {
  const side = (k: "debit" | "credit", title: string, summary: string)
    : Explanation => sumExplain({ id: `journal:${k}s`, title,
    subject: `${j.period}, a view for the finance team`, summary,
    resultLabel: title, parts: j.lines.filter((l) => l.side === k)
      .map((l) => ({ text: `${l.account}, ${l.department}`,
        value: money(l.amount) })), notComputed: ["Not an accounting " +
        "entry: nothing is posted. Employer costs are not in it."],
    scope });
  return { debits: side("debit", "Debits", "The salary cost of each pay " +
    "element by department, added up. Together they are gross pay."),
  credits: side("credit", "Credits", "Net pay to the salary file, net " +
    "pay held out of it and each deduction, added up. Together they " +
    "are gross pay too, so the two sides balance.") };
}

/** October earnings, element by element: gross pay. */
function elementsExplain(r: ElementReport, scope: string): Explanation {
  return sumExplain({ id: "elements:earnings", title: "Earnings in " +
    "October", subject: r.period, summary: "Every earning line of every " +
    "October payslip, put under its pay element and added up. The sum " +
    "is gross pay.", resultLabel: "Earnings",
  parts: r.rows.filter((x) => x.type === "earning" && x.october !== 0n)
    .map((x) => ({ text: `${x.label} (${x.display.people})`,
      value: money(x.october) })), scope });
}

export function buildExtrasSource(): ExtrasSource {
  const base = buildDemoCompany();
  const datasets = analysisDatasets(base);
  const elements = elementReport(base);
  const journals = new Map<string, PayrollJournal>();
  const keyOf = (ibans: Readonly<Record<string, string>>): string =>
    JSON.stringify(Object.entries(ibans).sort());
  return {
    elements,
    elementsExplain: elementsExplain(elements, base.rulesScope),
    journalExplain: (j) => journalExplain(j, base.rulesScope),
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
