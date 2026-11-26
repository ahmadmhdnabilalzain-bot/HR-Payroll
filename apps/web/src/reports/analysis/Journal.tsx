import { useDemo } from "../../demo/state";
import { useExtras } from "../../demo/data/payroll-extras-load";
import { Money } from "../../ui/Money";
import { ReportPage } from "../../ui/templates";
import { useCellMoney as useMoney } from "../../pay/gate/cell-money";

/**
 * X08: October's pay as debits and credits, a view for the finance
 * team. Built from the run as it stands (IBANs entered move held pay
 * into the salary file line). Not an accounting entry.
 */
export function Journal() {
  const x = useExtras();
  const { state } = useDemo();
  const { m } = useMoney();
  const j = x.journal(state.ibans);
  const why = x.journalExplain(j);
  const last = j.lines.length;
  const rows = [...j.lines.map((l) => [l.account, l.department,
    l.side === "debit" ? m(l.amount) : "", l.side === "credit"
      ? m(l.amount) : ""]),
  ["Total", "", m(j.debits), m(j.credits)]];
  return (
    <ReportPage title="Payroll journal"
      period={`${j.period}, a view for the finance team`}
      figure={{ label: j.balanced ? "Debits and credits balance, to the " +
        "fils" : "Debits and credits do not balance",
      value: <Money value={j.debits} size="lg" tween={false} />,
      explanation: why.debits }}
      explain={(r, c) => r !== last ? undefined : c === 2 ? why.debits
        : c === 3 ? why.credits : undefined}
      columns={[{ label: "Line" }, { label: "Department" },
        { label: "Debit", end: true }, { label: "Credit", end: true }]}
      rows={rows} csvName="payroll-journal-view-2026-10.csv"
      note={j.note} />
  );
}
