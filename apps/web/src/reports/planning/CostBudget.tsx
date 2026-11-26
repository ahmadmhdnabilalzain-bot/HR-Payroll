import type { Fils } from "@payroll/engine";
import type { BudgetRow } from "./source";
import { Money } from "../../ui/Money";
import { ReportPage } from "../../ui/templates";
import { hrefOf } from "../../demo/route";
import { useMoney } from "../fmt";
import type { ViewProps } from "../../views";
import { usePlanningSource } from "./load";
import s from "./planning.module.css";

/** "AED 4.00 over", "AED 4.00 under" or "On budget". */
export function overUnder(d: Fils, m: (f: Fils) => string): string {
  return d === 0n ? "On budget" : d > 0n ? `${m(d)} over`
    : `${m(-d as Fils)} under`;
}

/** X13: 2026 payroll against budget, by department and by month. */
export function CostBudgetScreen(p: ViewProps) {
  const src = usePlanningSource();
  const b = src.budget;
  const { m } = useMoney();
  const pick = p.rest[1];
  const one: BudgetRow | undefined = b.rows.find((r) =>
    r.departmentId === pick);
  const nav = (
    <nav className={s.links} aria-label="Departments">
      <a href={hrefOf("reports", "cost-budget")}
        aria-current={one === undefined ? "page" : undefined}>
        All departments</a>
      {b.rows.map((r) => (
        <a key={r.departmentId} aria-current={one?.departmentId ===
          r.departmentId ? "page" : undefined}
        href={hrefOf("reports", "cost-budget", r.departmentId)}>
          {r.departmentText}</a>
      ))}
    </nav>
  );
  const note = b.basis + " " + b.forecastNote;
  if (one !== undefined) {
    const rows = one.months.map((x) => [x.label,
      x.kind === "actual" ? "Actual" : "Estimate", m(x.budget), m(x.amount),
      overUnder(x.difference as Fils, m)]);
    return (
        <ReportPage title={`Cost and budget: ${one.departmentText}`}
          meta={nav}
          period="January to December 2026, by month"
          figure={{ label: "Year end, estimate",
            value: <Money value={one.yearEnd} size="lg" tween={false} /> }}
          columns={[{ label: "Month" }, { label: "State" },
            { label: "Budget", end: true },
            { label: "Actual or estimate", end: true },
            { label: "Over or under", end: true }]}
          rows={rows} note={note}
          csvName={`cost-budget-${one.departmentId}-2026.csv`} />
    );
  }
  const rows = [...b.rows, b.total].map((r) => {
    const toDate = (r.actualToDate - r.budgetToDate) as Fils;
    const end = (r.yearEnd - r.budgetYear) as Fils;
    return [r.departmentText, m(r.budgetYear), m(r.budgetToDate),
      m(r.actualToDate), overUnder(toDate, m),
      m(r.yearEnd) + " (estimate)", overUnder(end, m)];
  });
  return (
      <ReportPage title="Cost and budget" period="2026, by department"
        meta={nav}
        figure={{ label: "Actual pay, January to October",
          value: <Money value={b.total.actualToDate} size="lg"
            tween={false} /> }}
        columns={[{ label: "Department" },
          { label: "Budget, year", end: true },
          { label: "Budget to October", end: true },
          { label: "Actual to October", end: true },
          { label: "Over or under", end: true },
          { label: "Year end", end: true },
          { label: "Year end against budget", end: true }]}
        rows={rows} note={note} csvName="cost-budget-2026.csv" />
  );
}
