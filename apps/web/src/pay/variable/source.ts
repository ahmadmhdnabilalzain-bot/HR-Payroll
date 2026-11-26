import {
  bonusPlan,
  bonusTotals,
  buildDemoCompany,
  commissionPlan,
  commissionTotals,
  type BonusPlan,
  type BonusRow,
  type BonusTotals,
  type CommissionPlan,
  type CommissionStatement,
  type CommissionTotals,
} from "@payroll/demo-data";
import { sumExplain } from "../../components/explain/sum";
import {
  money,
  text,
  type ExplainRule,
  type Explanation,
} from "../../components/explain/types";

/**
 * The bonus run's and the commission statements' data (a lazy chunk):
 * the package's selectors, which run the engine, and the explain
 * drawers for every figure that is worked out. Nothing is typed here
 * but the words. Rules are put as "as we read it", only in the drawer.
 */
export interface VariableSource {
  bonus: BonusPlan;
  commission: CommissionPlan;
  commissionTotals: CommissionTotals;
  totalsOf(ids: readonly string[]): BonusTotals;
  bonusAmount(r: BonusRow): Explanation;
  bonusNet(r: BonusRow): Explanation;
  runGross(ids: readonly string[]): Explanation;
  runNet(ids: readonly string[]): Explanation;
  attainment(s: CommissionStatement): Explanation;
  commissionOf(s: CommissionStatement): Explanation;
  payableOf(s: CommissionStatement): Explanation;
}

const OWN: Pick<ExplainRule, "status" | "statusLabel" | "citation"> = {
  status: "convention", statusLabel: null,
  citation: "Our own sample scheme, as we apply it" };

const CAP_RULE: ExplainRule = { text: "As we read the rules, deductions " +
  "from pay together stop at half of the wage earned. Nothing is " +
  "requested against this payment, so nothing is taken.",
status: "secondary", statusLabel: "secondary-sourced, as we read it",
citation: "Decree-Law 33/2021, Article 25 (as we read it)" };

const ROUND_RULE: ExplainRule = { text: "Each amount is rounded once, to " +
  "the nearest fils.", status: "convention", statusLabel: null,
citation: "Our own working, as we apply it" };

export function buildVariableSource(): VariableSource {
  const c = buildDemoCompany();
  const bonus = bonusPlan(c);
  const commission = commissionPlan(c);
  const scope = c.rulesScope;
  const rowOf = (ids: readonly string[]): BonusRow[] =>
    bonus.rows.filter((r) => ids.includes(r.employeeId));
  const base = (r: BonusRow) => ({ subject: r.name, scope });

  const net = (r: BonusRow): Explanation => ({
    id: `bonus-net:${r.employeeId}`, title: "Net bonus", ...base(r),
    summary: "The bonus less any deduction the engine takes from it. " +
      "None is requested, so the net is the bonus.",
    result: { label: "Net bonus", value: money(r.net) },
    inputs: [{ label: "Bonus", value: money(r.bonus),
      from: "Bonus run" }],
    rules: [CAP_RULE],
    steps: [
      { text: "Bonus", value: money(r.bonus), op: "add" },
      { text: "Deductions taken", value: money(r.deductions), op: "less" },
      { text: "Most that could be taken, in all",
        limit: { used: r.deductions, cap: r.overallCap } },
      { text: "Net bonus", value: money(r.net), op: "total" }],
    notComputed: [bonus.notComputed], scope });

  const amount = (r: BonusRow): Explanation => ({
    id: `bonus:${r.employeeId}`, title: bonus.label, ...base(r),
    summary: `${r.display.rate} of monthly basic, for a mid-year rating ` +
      `of ${r.rating}.`,
    result: { label: "Bonus", value: money(r.bonus) },
    inputs: [
      { label: "Monthly basic", value: money(r.basic),
        from: "Employee record" },
      { label: "Mid-year 2026 rating", value: text(r.ratingText),
        from: "Mid-year appraisal" },
      { label: "Rate", value: text(r.display.rate),
        from: "Sample bonus scheme" }],
    rules: [{ text: bonus.basis, ...OWN }, ROUND_RULE],
    steps: [
      { text: "Monthly basic", value: money(r.basic) },
      { text: `Rate for a rating of ${r.rating}`,
        value: text(r.display.rate) },
      { text: "Bonus: basic times the rate, rounded once",
        value: money(r.bonus) }],
    notComputed: [bonus.notComputed], scope });

  const run = (ids: readonly string[], kind: "gross" | "net")
    : Explanation => sumExplain({ id: `bonus-run-${kind}:${ids.length}`,
    title: kind === "gross" ? "Bonus run, gross" : "Bonus run, net",
    subject: bonus.label,
    summary: kind === "gross" ? "Each person's bonus, added up."
      : "Each person's net bonus, added up.",
    resultLabel: kind === "gross" ? "Gross bonus" : "Net bonus",
    parts: rowOf(ids).map((r) => ({ text: r.name,
      value: money(kind === "gross" ? r.bonus : r.net) })),
    notComputed: [bonus.notComputed], scope });

  const pay = (s: CommissionStatement) => ({ subject: s.name, scope });
  return {
    bonus, commission, commissionTotals: commissionTotals(commission),
    totalsOf: (ids) => bonusTotals(bonus, ids),
    bonusAmount: amount, bonusNet: net,
    runGross: (ids) => run(ids, "gross"), runNet: (ids) => run(ids, "net"),
    attainment: (s) => ({ id: `attain:${s.employeeId}`,
      title: "Attainment", ...pay(s),
      summary: `${s.display.booked} booked against a target of ` +
        `${s.display.target} is ${s.display.attainment}.`,
      result: { label: "Attainment", value: text(s.display.attainment) },
      inputs: [
        { label: "Monthly target", value: money(s.target),
          from: "Sample sales plan" },
        { label: "Sales booked in October", value: money(s.booked),
          from: "Sample sales figures" }],
      rules: [{ text: commission.basis, ...OWN }],
      steps: [
        { text: "Sales booked", value: money(s.booked) },
        { text: "Divided by the monthly target", value: money(s.target) },
        { text: "Attainment", value: text(s.display.attainment) }],
      notComputed: ["The sales figures are sample figures, not read " +
        "from a sales system."], scope }),
    commissionOf: (s) => sumExplain({ id: `commission:${s.employeeId}`,
      title: "Commission before clawback", ...pay(s),
      summary: "Each band of the target pays its own rate on the sales " +
        "that fall in it. The bands are added up.",
      resultLabel: "Commission",
      parts: s.bands.map((b) => ({ text: `${b.label}, at ${b.rateText}`,
        value: money(b.commission) })),
      rules: [{ text: commission.basis, ...OWN }, ROUND_RULE],
      inputs: [{ label: "Sales booked", value: money(s.booked),
        from: "Sample sales figures" }],
      notComputed: ["The sales figures are sample figures."], scope }),
    payableOf: (s) => ({ id: `payable:${s.employeeId}`,
      title: "Commission to pay", ...pay(s),
      summary: "The commission less the clawback on a cancelled " +
        "sale, then through the engine's deduction rules.",
      result: { label: "To pay", value: money(s.net) },
      inputs: [
        { label: "Commission", value: money(s.commission),
          from: "This statement" },
        { label: "Sale cancelled after booking",
          value: money(s.reversedSales), from: "Sample sales figures" }],
      rules: [{ text: "A sale cancelled within 60 days gives back " +
        "commission at the first paying rate, taken from the next " +
        "statement.", ...OWN }, CAP_RULE, ROUND_RULE],
      steps: [
        { text: "Commission", value: money(s.commission), op: "add" },
        { text: "Clawback on the cancelled sale",
          value: money(s.clawback), op: "less" },
        ...(s.carried > 0n ? [{ text: "Clawback carried to the next " +
          "statement", value: money(s.carried), op: "add" as const }]
          : []),
        { text: "Deductions taken", value: money(s.deductions),
          op: "less" },
        { text: "To pay", value: money(s.net), op: "total" }],
      notComputed: [commission.notComputed], scope }),
  };
}


export type { CommissionStatement } from "@payroll/demo-data";
