import type { Fils } from "@payroll/engine";
import { Money } from "../../ui/Money";
import { ReportPage } from "../../ui/templates";
import { useMoney } from "../fmt";
import { overUnder } from "./CostBudget";
import { usePlanningSource } from "./load";

/** X35: the plan against actual, and the estimate for the rest of 2026. */
export function ForecastScreen() {
  const src = usePlanningSource();
  const b = src.budget;
  const { m, signed } = useMoney();
  const changes = (i: number): string => {
    const step = b.bridge[i - 10];
    if (step === undefined) return "";
    return step.drivers.map((d) => `${d.label} ${signed(d.amount)}` +
      ` (${d.people.join(", ")})`).join("; ");
  };
  const rows = b.total.months.map((x, i) => {
    const meta = b.months[i]!;
    return [x.label, x.kind === "estimate" ? "Estimate"
      : meta.paid ? "Actual, paid" : "Actual, waiting for sign-off",
    m(x.budget), m(x.amount), overUnder(x.difference as Fils, signed),
    changes(i)];
  });
  const end = (b.total.yearEnd - b.total.budgetYear) as Fils;
  return (
    <ReportPage title="Payroll forecast" period="Plan against actual, 2026"
      figure={{ label: "Year end, estimate (" +
        overUnder(end, signed) + " against the plan)",
      value: <Money value={b.total.yearEnd} size="lg" tween={false} /> }}
      columns={[{ label: "Month" }, { label: "State" },
        { label: "Plan", end: true },
        { label: "Actual or estimate", end: true },
        { label: "Over or under", end: true },
        { label: "Known changes" }]}
      rows={rows} csvName="payroll-forecast-2026.csv"
      note={b.forecastNote + " " + b.basis} />
  );
}
