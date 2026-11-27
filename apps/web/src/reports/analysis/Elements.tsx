import { Money } from "../../ui/Money";
import { ReportPage } from "../../ui/templates";
import { useExtras } from "../../demo/data/payroll-extras-load";
import { useCellMoney as useMoney } from "../../pay/gate/cell-money";

/** X06: October by pay element, against September. */
export function Elements() {
  const src = useExtras();
  const r = src.elements;
  const { m, signed } = useMoney();
  const rows = r.rows.map((x) => x.computed
    ? [x.label, x.type === "earning" ? "Earning" : "Deduction",
      m(x.october), m(x.september),
      x.change === 0n ? "No change" : signed(x.change), x.display.people]
    : [x.label, x.type === "earning" ? "Earning" : "Deduction",
      x.display.october, x.display.september, x.display.change,
      x.display.people]);
  const most = r.rows.reduce((n, x) => x.october > n ? x.october : n, 0n);
  return (
    <ReportPage title="Pay elements report" period={r.period}
      figure={{ label: "Gross pay, October",
        value: <Money value={r.earningsOctober} size="lg" tween={false} />,
        explanation: src.elementsExplain }}
      columns={[{ label: "Element" }, { label: "Type" },
        { label: "October", end: true }, { label: "September", end: true },
        { label: "Change", end: true }, { label: "People in October" }]}
      rows={rows}
      bars={r.rows.map((x) => most === 0n ? 0
        : Number(x.october * 1000n / most))}
      csvName="pay-elements-2026-10.csv" note={r.note} />
  );
}
