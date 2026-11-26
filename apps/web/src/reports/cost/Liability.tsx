import { Money } from "../../ui/Money";
import { ReportPage } from "../../ui/templates";
import { plural, useMoney } from "../fmt";
import { useCostSource } from "./load";

/** X07: gratuity liability by department, with the company total. */
export function GratuityLiabilityScreen() {
  const src = useCostSource();
  const { m } = useMoney();
  const g = src.gratuity;
  const rows = g.byDepartment.map((d) => {
    const mine = g.rows.filter((r) => r.departmentId === d.departmentId);
    const counted = mine.filter((r) => r.amount !== null).length;
    const left = mine.length - counted;
    return [d.departmentText, plural(counted, "person", "people"),
      left === 0 ? "None" : `${left} not counted`,
      counted === 0 ? "None counted" : m(d.amount)];
  });
  rows.push(["Total", plural(g.counts.paid, "person", "people"),
    `${g.counts["not-eligible"] + g.counts["not-applicable"]} not counted`,
    m(g.total)]);
  const max = g.byDepartment.reduce((a, d) => d.amount > a ? d.amount : a,
    0n);
  const bars = [...g.byDepartment.map((d) => max === 0n ? 0
    : Number(d.amount * 1000n / max)), 0];
  const left = g.settlement.map((x) => `${x.name} has left; the ` +
    "gratuity is in the final settlement and not in this total.");
  return (
    <ReportPage title="Gratuity liability" period={`As of ${src.asOfText}`}
      figure={{ label: "Company's accrued liability estimate", value: (
        <Money value={g.total} size="lg" tween={false} />),
      explanation: src.totalExplain }}
      explain={(r, c) => c !== 3 ? undefined : r === g.byDepartment.length
        ? src.totalExplain
        : src.deptExplain[g.byDepartment[r]?.departmentId ?? ""]}
      columns={[{ label: "Department" }, { label: "People counted" },
        { label: "Not counted" }, { label: "Provision", end: true }]}
      rows={rows} bars={bars} csvName="gratuity-liability-2026-10-27.csv"
      note={[g.basis, ...left].join(" ")} />
  );
}
