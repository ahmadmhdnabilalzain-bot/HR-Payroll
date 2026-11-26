import type { Fils } from "@payroll/engine";
import { settlementTotal } from "../demo/figures";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { Money } from "../ui/Money";
import { FilterList } from "../ui/templates";
import { usePay } from "./load";
import s from "./pay.module.css";
import type { DeductionLine } from "./types";

/** R22: every deduction taken in the pay runs, June to October. */
export function Deductions() {
  const pay = usePay();
  const latest = pay.deductions[0]?.month ?? "";
  return (
    <FilterList title="Deductions ledger"
      lede={"Every amount taken from pay in the runs paid since June, " +
        `and in the ${pay.thisRun} run being prepared. Today these are ` +
        "loan repayments; fines are not recovered from pay in the demo."}
      rows={pay.deductions} rowKey={(d) => d.id}
      searchText={(d) => `${d.name} ${d.label} ${d.month}`}
      rowHref={(d: DeductionLine) => d.ref === null
        ? hrefOf("people", d.employeeId) : hrefOf("pay-run", "loans", d.ref)}
      segments={[
        { id: "all", label: "All", match: () => true },
        { id: "now", label: latest, match: (d) => d.month === latest },
      ]}
      columns={[
        { key: "who", label: "Person", render: (d) => d.name },
        { key: "what", label: "Deduction", render: (d) => d.label },
        { key: "m", label: "Month", render: (d) => d.month },
        { key: "amt", label: "Amount", end: true, render: (d) =>
          <Money value={d.amount} size="sm" /> },
      ]}
      empty="No deductions match. Clear the search to see all." />
  );
}

type Item = { key: string; name: string; what: string; when: string;
  amount: Fils; outside: boolean; href: string };

/**
 * R13, as far as the records go: money paid outside the monthly run
 * (a final settlement, a salary advance) and what joins the next run
 * (corrections). The data has no bonus run.
 */
export function OffCycle() {
  const pay = usePay();
  const { state } = useDemo();
  const items: Item[] = [
    ...pay.settlements.map((x) => ({ key: `fs-${x.employeeId}`,
      name: x.name, what: "Final settlement", when: `Pay by ${x.due}`,
      amount: settlementTotal(x.total, state, x.employeeId), outside: true,
      href: hrefOf("pay-run", "settlements", x.employeeId) })),
    ...pay.loans.filter((l) => l.kind === "advance").map((l) => ({
      key: l.ref, name: l.name, what: `Salary advance ${l.ref}`,
      when: `Recovered from ${l.firstDeduction}`, amount: l.principal,
      outside: true, href: hrefOf("pay-run", "loans", l.ref) })),
    ...pay.corrections.map((c) => ({ key: c.id, name: c.name,
      what: `Correction to ${c.month}`, when: `${pay.nextRun} run`,
      amount: c.amount, outside: false,
      href: hrefOf("pay-run", "corrections", c.id) })),
  ];
  return (
    <FilterList title="Off-cycle payments"
      lede={"Money paid outside the monthly run, and what joins next " +
        "month's run. There is no bonus run in the demo data."}
      rows={items} rowKey={(x) => x.key} rowHref={(x) => x.href}
      searchText={(x) => `${x.name} ${x.what}`}
      segments={[
        { id: "all", label: "All", match: () => true },
        { id: "out", label: "Outside the run", match: (x) => x.outside },
        { id: "next", label: `In the ${pay.nextRun} run`, match: (x) =>
          !x.outside },
      ]}
      columns={[
        { key: "who", label: "Person", render: (x) => x.name },
        { key: "what", label: "What", render: (x) => x.what },
        { key: "when", label: "When", render: (x) =>
          <span className={s.muted}>{x.when}</span> },
        { key: "amt", label: "Amount", end: true, render: (x) =>
          <Money value={x.amount} size="sm" /> },
      ]}
      empty="Nothing is paid outside the run this month." />
  );
}
