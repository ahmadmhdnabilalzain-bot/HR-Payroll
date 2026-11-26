import { Money } from "../../ui/Money";
import { ReportPage } from "../../ui/templates";
import { plural } from "../fmt";
import { useTableMoney } from "./nb";
import { useMoreSource } from "./load";

/** X11: every loan and advance, and what is still owed. */
export function LoansReportScreen() {
  const { loans: r, loansExplain, loanExplain } = useMoreSource();
  const m = useTableMoney();
  const max = r.rows.reduce((a, x) => x.balance > a ? x.balance : a, 0n);
  return (
    <ReportPage title="Loans report" period="As of 27 Oct 2026"
      figure={{ label: "Still owed",
        value: <Money value={r.outstanding} size="lg" tween={false} />,
        explanation: loansExplain }}
      explain={(i, c) => c === 5 ? loanExplain[r.rows[i]?.ref ?? ""]
        : undefined}
      columns={[{ label: "Person" }, { label: "Type" },
        { label: "Status" }, { label: "Borrowed", end: true },
        { label: "Instalment", end: true }, { label: "Balance", end: true }]}
      rows={r.rows.map((x) => [x.name, `${x.kind} ${x.ref}`, x.statusText,
        m(x.principal), m(x.instalment), m(x.balance)])}
      bars={r.rows.map((x) => max === 0n ? 0
        : Number(x.balance * 1000n / max))}
      csvName="loans-2026-10-27.csv"
      note={`${plural(r.active, "active loan", "active loans")}, ` +
        `${plural(r.repaid, "repaid", "repaid")}. ${r.note}`} />
  );
}
