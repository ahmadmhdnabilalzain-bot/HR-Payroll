import {
  AS_OF,
  buildDemoCompany,
  employerCostView,
  gratuityProvision,
  plural,
  shortDateText,
  type DemoCompany,
  type EmployerCost,
  type GratuityProvision,
} from "@payroll/demo-data";
import {
  calculateSettlement,
  fils,
  GRATUITY_PACKS,
  type Fils,
  type TraceLine,
} from "@payroll/engine";
import {
  money,
  text,
  type ExplainStep,
  type Explanation,
} from "../../components/explain/types";
import { people, sumExplain, SUM_RULE } from "../../components/explain/sum";
import { rulesOf } from "../../demo/data/run-explain";

/**
 * The cost reports' data (a lazy chunk): gratuity provision per person
 * through the engine, and October employer cost. Everything is read
 * from the package's selectors; the working behind each gratuity
 * figure is the engine's own trace.
 */

export interface CostSource {
  gratuity: GratuityProvision;
  /** One explanation per counted person, by employee id. */
  explain: Readonly<Record<string, Explanation>>;
  totalExplain: Explanation;
  /** Each department's liability, by department id. */
  deptExplain: Readonly<Record<string, Explanation>>;
  /** Gross plus computed employer cost, partial: the page's figure. */
  costExplain: Explanation;
  cost: EmployerCost;
  asOfText: string;
}

const line = (t: TraceLine[], id: string): TraceLine | undefined =>
  t.find((l) => l.id === id);

const num = (v: string | undefined): bigint => BigInt(v ?? "0");

function daysText(v: string | undefined): string {
  const [a = "0", b = "1"] = (v ?? "0").split("/");
  const n = Number(a) / Number(b);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function mulDiv(a: bigint, b: bigint, c: bigint): Fils {
  return fils((a * b * 2n + c) / (c * 2n));
}

function personExplain(c: DemoCompany, id: string, amount: Fils)
  : Explanation {
  const e = c.employees.find((x) => x.id === id)!;
  const asOf = shortDateText(AS_OF);
  const r = calculateSettlement({ gratuity: { joiningDate: e.joiningDate,
    lastWorkingDate: AS_OF, unpaidLeaveDays: 0,
    lastBasicMonthly: e.basicMonthly, workerClass: e.workerClass },
  unusedLeaveDays: 0 }, GRATUITY_PACKS);
  const t = r.trace;
  const years = line(t, "service.years");
  const t1 = line(t, "gratuity.tier1");
  const t2 = line(t, "gratuity.tier2");
  const cap = line(t, "gratuity.cap");
  const total = line(t, "gratuity.total");
  const m = /^(\d+) years? and (\d+) days?/.exec(years?.result ?? "");
  const service = `${plural(Number(m?.[1] ?? 0), "year", "years")} and ` +
    plural(Number(m?.[2] ?? 0), "day", "days");
  const basic = num(total?.inputs["lastBasicMonthly"]);
  const first = e.fullName.split(" ")[0] ?? e.fullName;
  const steps: ExplainStep[] = [
    { text: `Service from ${shortDateText(e.joiningDate)} to ${asOf}, ` +
      "with no unpaid leave taken off.", value: text(service) },
    { text: "A day's basic wage is the monthly basic divided by 30.",
      value: money(mulDiv(basic, 1n, 30n)) },
    { text: `First 5 years at 21 days a year: ${daysText(t1?.result)} ` +
      "days of basic wage." },
    { text: "Years after the fifth at 30 days a year: " +
      `${daysText(t2?.result)} days of basic wage.` },
    { text: `Together ${daysText(total?.inputs["daysOwed"])} days, ` +
      "worked out exactly and rounded once, to two decimals." },
    { text: "The limit is two years' basic wage. " +
      (cap?.inputs["capApplied"] === "true" ? "It is reached, so the " +
        "gratuity stops there." : "It is not reached."),
    value: money(fils(num(cap?.result))) },
    { text: "Provision for this person", value: money(amount) },
  ];
  return { id: `gratuity-provision:${id}`,
    title: "Gratuity provision", subject: e.fullName,
    summary: `If ${first} left on ${asOf}, the gratuity would be this ` +
      "much. As we read the law: 21 days of basic wage for each of the " +
      "first five years and 30 days for each year after, on the last " +
      "basic wage.",
    result: { label: "Provision", value: money(amount) },
    inputs: [{ label: "Joined", value: text(shortDateText(e.joiningDate)),
      from: "Employee record" },
    { label: "Counted to", value: text(asOf), from: "The report date" },
    { label: "Basic salary, monthly", value: money(e.basicMonthly),
      from: "October pay run" },
    { label: "Unpaid leave days", value: text("0"),
      from: "Counted as 0" }],
    rules: rulesOf([years, t1, t2, cap, total]), steps,
    notComputed: ["Leave pay, notice pay and other dues are not in the " +
      "provision.", "This is an estimate of what would be owed if the " +
      "person left on that day, not an amount to pay now."],
    scope: c.rulesScope };
}

const ELIGIBLE_RULE = { text: "UAE nationals are left out (their " +
  "end-of-service benefit is outside this gratuity), and people under " +
  "one year of service are not yet eligible, as we read it.",
status: "unsourced" as const, statusLabel: null, citation: null };

function totalExplain(c: DemoCompany, g: GratuityProvision): Explanation {
  const paid = g.rows.filter((r) => r.amount !== null);
  return sumExplain({ id: "gratuity-provision:total",
    title: "Company gratuity provision", subject: "Whole company",
    summary: "The sum of each counted person's gratuity if they left on " +
      `${shortDateText(g.asOf)}, by department. It is an estimate, not a ` +
      "booked amount.", resultLabel: "Accrued liability estimate",
    parts: g.byDepartment.map((d) => ({ d, n: paid.filter((r) =>
      r.departmentId === d.departmentId).length })).filter((x) => x.n > 0)
      .map((x) => ({ text: `${x.d.departmentText} (${people(x.n)})`,
        value: money(x.d.amount) })),
    totalText: `${plural(g.counts.paid, "person", "people")} counted`,
    inputs: paid.map((r) => ({ label: r.name, value: money(r.amount!),
      from: "Gratuity provision, per person" })),
    rules: [ELIGIBLE_RULE, SUM_RULE],
    notComputed: [g.display.counts + ".",
      ...g.settlement.map((s) => `${s.name}'s gratuity is in the final ` +
        "settlement and is not in this total.")],
    scope: c.rulesScope });
}

function deptExplains(c: DemoCompany, g: GratuityProvision)
  : Record<string, Explanation> {
  const out: Record<string, Explanation> = {};
  for (const d of g.byDepartment) {
    const mine = g.rows.filter((r) => r.departmentId === d.departmentId);
    const paid = mine.filter((r) => r.amount !== null);
    if (paid.length === 0) continue;
    out[d.departmentId] = sumExplain({ id: `gratuity-liability:` +
      d.departmentId, title: "Gratuity liability",
    subject: d.departmentText,
    summary: "Each counted person's gratuity if they left on " +
      `${shortDateText(g.asOf)}, added up. It is an estimate, not a ` +
      "booked amount.", resultLabel: "Provision",
    parts: paid.map((r) => ({ text: r.name, value: money(r.amount!) })),
    totalText: d.departmentText, rules: [ELIGIBLE_RULE, SUM_RULE],
    notComputed: mine.length === paid.length ? [] : [`${plural(
      mine.length - paid.length, "person is", "people are")} not ` +
      "counted: under a year of service, or a UAE national."],
    scope: c.rulesScope });
  }
  return out;
}

function costExplain(c: DemoCompany, k: EmployerCost): Explanation {
  return sumExplain({ id: "employer-cost:total",
    title: "Employer cost, partial", subject: k.period,
    summary: "October gross pay plus the employer costs the engine works " +
      "out, by department. It is partial: what is not worked out is " +
      "listed below.", resultLabel: "Gross plus employer cost",
    parts: k.byDepartment.filter((d) => d.headcount > 0).map((d) => ({
      text: `${d.departmentText} (${people(d.headcount)})`,
      value: money(fils(d.gross + d.employerComputed)) })),
    totalText: "All departments",
    after: [{ text: "Gross pay", value: money(k.gross), op: "add" },
      { text: "Employer cost worked out", value: money(k.employerComputed),
        op: "add" },
      { text: "Gross plus employer cost, partial",
        value: money(k.partialTotal), op: "total" }],
    notComputed: [`${plural(k.notComputedCount, "UAE national has",
      "UAE nationals have")} no employer pension figure.`,
    "ILOE, insurance and other employer costs are not computed."],
    scope: c.rulesScope });
}

export function buildCostSource(): CostSource {
  const c = buildDemoCompany();
  const gratuity = gratuityProvision(c);
  const explain: Record<string, Explanation> = {};
  for (const r of gratuity.rows) {
    if (r.amount !== null) explain[r.employeeId] =
      personExplain(c, r.employeeId, r.amount);
  }
  const cost = employerCostView(c);
  return { gratuity, explain, totalExplain: totalExplain(c, gratuity),
    deptExplain: deptExplains(c, gratuity), costExplain: costExplain(c, cost),
    cost, asOfText: shortDateText(AS_OF) };
}
