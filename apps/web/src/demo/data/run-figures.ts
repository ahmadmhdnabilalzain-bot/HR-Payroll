import {
  costByDepartment,
  demoLabel,
  isDemoLabelKey,
  PENSION_NOT_COMPUTED,
  type DemoCompany,
} from "@payroll/demo-data";
import { fils } from "@payroll/engine";
import {
  people,
  sumExplain,
  type Part,
} from "../../components/explain/sum";
import {
  count,
  money,
  text,
  type Explanation,
} from "../../components/explain/types";

/**
 * The pay run's headline figures as sums (a lazy chunk, beside
 * run-explain.ts): gross, deductions and people by department, the pay
 * held out of the salary file, each department's cost and the
 * nationality split. Each total is the parts the package gives, added
 * here; the tests hold every one to the figure on screen, to the fils.
 */

const RUN = "October payroll";

const label = (key: string): string =>
  isDemoLabelKey(key) ? demoLabel(key, "en") : key;

const REGION = new Intl.DisplayNames(["en"], { type: "region" });

/** Explanations by id: "run:gross", "dept-cost:dep-ops", ... */
export function figureExplains(c: DemoCompany): Record<string, Explanation> {
  const out: Record<string, Explanation> = {};
  const put = (e: Explanation): void => {
    out[e.id] = e;
  };
  const scope = c.rulesScope;
  const slips = c.payRun.payslips;
  const emp = new Map(c.employees.map((e) => [e.id, e]));
  const deptOf = (id: string): string => emp.get(id)?.departmentId ?? "";
  const depts = c.departments.map((d) => ({ id: d.id,
    name: label(d.labelKey), slips: slips.filter((s) =>
      deptOf(s.employeeId) === d.id) }));
  const byDept = (f: (s: (typeof slips)[number]) => bigint): Part[] =>
    depts.filter((d) => d.slips.length > 0).map((d) => ({
      text: `${d.name} (${people(d.slips.length)})`,
      value: money(fils(d.slips.reduce((n, s) => n + f(s), 0n))) }));
  put(sumExplain({ id: "run:gross", title: "Gross pay, whole run",
    subject: "Whole pay run",
    summary: "Every payslip's gross pay, added up by department. Each " +
      "payslip is worked out by the engine line by line.",
    resultLabel: "Gross pay", parts: byDept((s) => s.payslip.gross),
    inputs: [{ label: "Payslips", value: count(slips.length,
      String(slips.length)), from: RUN }],
    notComputed: [PENSION_NOT_COMPUTED.en], scope }));
  put(sumExplain({ id: "run:deductions", title: "Deductions, whole run",
    subject: "Whole pay run",
    summary: "Everything taken from pay this month (unpaid leave, loan " +
      "instalments and other deductions), added up by department.",
    resultLabel: "Deductions",
    parts: byDept((s) => s.payslip.totalDeductions),
    notComputed: [PENSION_NOT_COMPUTED.en], scope }));
  put(sumExplain({ id: "run:people", title: "People paid this month",
    subject: "Whole pay run",
    summary: "One payslip per person on the October run, counted by " +
      "department. The leaver's part month counts.",
    resultLabel: "People", countText: people,
    parts: depts.filter((d) => d.slips.length > 0).map((d) => ({
      text: d.name, value: count(d.slips.length, people(d.slips.length)) })),
    scope }));
  const held = slips.filter((s) => !s.sif.included);
  put(sumExplain({ id: "run:held", title: "Held out of the salary file",
    subject: "Whole pay run",
    summary: "Net pay of the people with no valid bank account yet. It " +
      "is held, never part-paid, and folds into the file once the " +
      "account is entered.",
    resultLabel: "Held out",
    parts: held.map((s) => ({ text: emp.get(s.employeeId)?.fullName ?? "",
      value: money(s.payslip.net) })),
    totalText: "Held out of the salary file", scope }));
  const inFile = slips.filter((s) => s.sif.included);
  put(sumExplain({ id: "run:file", title: "In the salary file",
    subject: "Whole pay run",
    summary: "Net pay of everyone with a valid bank account, person by " +
      "person. Held pay is not in the file.", resultLabel: "Salary file",
    parts: inFile.map((s) => ({ text: emp.get(s.employeeId)?.fullName ??
      "", value: money(s.payslip.net) })),
    totalText: `Salary file, ${people(inFile.length)}`, scope }));
  const cost = costByDepartment(c);
  for (const d of depts) {
    const row = cost.find((x) => x.departmentId === d.id);
    if (row === undefined) continue;
    put(sumExplain({ id: `dept-cost:${d.id}`, title: "Department cost",
      subject: d.name,
      summary: `October gross pay of everyone in ${d.name}, payslip by ` +
        "payslip. Employer costs are not in it.",
      resultLabel: "Gross cost",
      parts: d.slips.map((s) => ({ text: emp.get(s.employeeId)?.fullName
        ?? "", value: money(s.payslip.gross) })),
      totalText: `${d.name}, ${people(d.slips.length)}`,
      notComputed: ["Employer pension, insurance and other employer " +
        "costs are not in this figure."], scope }));
  }
  put(sumExplain({ id: "dept-cost:total", title: "Cost by department",
    subject: "Whole company",
    summary: "Each department's October gross pay, added up. It is the " +
      "run's gross pay.", resultLabel: "Gross cost",
    parts: depts.filter((d) => d.slips.length > 0).map((d) => ({
      text: d.name, value: money(cost.find((x) => x.departmentId === d.id)
        ?.gross ?? fils(0n)) })), scope }));
  const n = c.nationalities;
  const active = c.employees.filter((e) => e.joiningDate <= n.asOf &&
    (e.leavingDate === null || e.leavingDate >= n.asOf));
  for (const r of n.byNationality) {
    const name = REGION.of(r.nationality) ?? r.nationality;
    put(sumExplain({ id: `nationality:${name}`, title: "Headcount by " +
      "nationality", subject: name,
      summary: `Everyone employed on the demo date whose nationality ` +
        `is ${name}, counted once each.`,
      resultLabel: "People", countText: people,
      parts: active.filter((e) => e.nationality === r.nationality)
        .map((e) => ({ text: e.fullName, value: count(1, "1") })),
      totalText: name, inputs: [{ label: "Label", value: text(n.label),
        from: "Nationality records" }], scope }));
  }
  put(sumExplain({ id: "nationality:total", title: "Headcount by " +
    "nationality", subject: "Whole company",
    summary: "Each nationality's headcount on the demo date, added up.",
    resultLabel: "People", countText: people,
    parts: n.byNationality.map((r) => ({ text: REGION.of(r.nationality) ??
      r.nationality, value: count(r.count, people(r.count)) })),
    totalText: "Everyone employed", scope }));
  return out;
}
