import type { Fils } from "@payroll/engine";
import { Money } from "../../ui/Money";
import { ReportPage } from "../../ui/templates";
import { useMoney } from "../fmt";
import { useCostSource } from "./load";

/** X04: October gross and the employer cost the engine computes. */
export function EmployerCostScreen() {
  const src = useCostSource();
  const { m } = useMoney();
  const k = src.cost;
  const dept = new Map(k.byDepartment.map((d) =>
    [d.departmentId, d.departmentText]));
  const rows = k.rows.map((r) => {
    const name = dept.get(r.departmentId) ?? "";
    if (r.employer.status === "not-computed") {
      return [r.name, name, m(r.gross), "Not computed",
        "Gross only"];
    }
    const a = r.employer.amount;
    return [r.name, name, m(r.gross), a === 0n ? "Nothing computed" : m(a),
      m((r.gross + a) as Fils)];
  });
  rows.push(["Total, partial", "", m(k.gross),
    k.employerComputed === 0n ? "Nothing computed" : m(k.employerComputed),
    m(k.partialTotal)]);
  return (
    <ReportPage title="Employer cost" period={k.period}
      figure={{ label: "Gross plus employer cost",
        value: <Money value={k.partialTotal} size="lg" tween={false} />,
        explanation: src.costExplain }}
      explain={(r, c) => r === k.rows.length && c === 4 ? src.costExplain
        : undefined}
      columns={[{ label: "Person" }, { label: "Department" },
        { label: "Gross", end: true }, { label: "Employer cost", end: true },
        { label: "Total", end: true }]}
      rows={rows} csvName="employer-cost-2026-10.csv" note={k.caveat} />
  );
}
