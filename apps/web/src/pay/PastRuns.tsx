import { fils } from "@payroll/engine";
import { Explainable } from "../components/explain";
import { hrefOf } from "../demo/route";
import { Money } from "../ui/Money";
import { FilterList, RecordTabs } from "../ui/templates";
import { usePay } from "./load";
import { NotFound, Status } from "./parts";
import s from "./pay.module.css";
import type { PastRunView } from "./types";

const LIST = hrefOf("pay-run", "runs");

/** "+AED 2,000.00" or "−AED 1,180.64", signed by <Money signed>. */
export function Change(p: { value: bigint; size?: "sm" | "lg" }) {
  if (p.value === 0n) return <span className={s.muted}>No change</span>;
  return (
    <span className={s.change} data-sign={p.value < 0n ? "down" : "up"}>
      <Money value={fils(p.value)} size={p.size ?? "sm"} signed />
    </span>
  );
}

/** The package's reason words, as a plain sentence. */
const REASON: Record<string, string> = {
  joined: "joined", ["left"]: "left", "basic revised": "new basic salary",
  "back pay": "back pay", overtime: "overtime",
  "unpaid leave": "unpaid leave", "sick day unpaid": "a sick day unpaid",
  "loan deduction": "loan instalments changed", other: "other change",
};
const reasonText = (xs: string[]): string => {
  const t = xs.map((x) => REASON[x] ?? x).join(", ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** R11: pay runs month by month, June to this month, with the trend. */
export function PastRuns() {
  const pay = usePay();
  const rows = [...pay.runs].reverse();
  return (
    <FilterList title="Pay runs"
      lede={"Each month as paid, worked out the same way. Open a " +
        "month to see who changed and why, and every payslip."}
      rows={rows} rowKey={(r) => r.id}
      rowHref={(r) => r.paid ? hrefOf("pay-run", "runs", r.key)
        : hrefOf("pay-run", "review")}
      columns={[
        { key: "m", label: "Month", render: (r) => r.label },
        { key: "n", label: "People", end: true, render: (r) =>
          <span className="tabular">{r.headcount}</span> },
        { key: "g", label: "Gross", end: true, render: (r) =>
          <Money value={r.gross} size="sm" /> },
        { key: "net", label: "Net", end: true, render: (r) =>
          <Money value={r.net} size="sm" /> },
        { key: "c", label: "Against the month before", end: true,
          render: (r) => r.change === null
            ? <span className={s.muted}>First month shown</span>
            : <Change value={r.change} /> },
        { key: "st", label: "Status", render: (r) => r.paid
          ? <Status tone="done">{`Paid ${r.paidOn}`}</Status>
          : <Status tone="check">This month</Status> },
      ]}
      empty="No pay runs yet. The first appears once a month is paid." />
  );
}

export function RunRecord(p: { id: string }) {
  const pay = usePay();
  const run = pay.runs.find((r) => r.key === p.id && r.paid);
  if (run === undefined) {
    return <NotFound what="pay run" back={{ label: "Pay runs",
      href: LIST }} />;
  }
  return <RunPage r={run} />;
}

function RunPage(p: { r: PastRunView }) {
  const r = p.r;
  return (
    <RecordTabs title={r.label} lede={`Paid ${r.paidOn}, ` +
      `${r.headcount} people`}
      back={{ label: "Pay runs", href: LIST }}
      stats={[
        { label: "Net pay", value: (
          <Explainable explanation={r.explanation}>
            <Money value={r.net} size="lg" />
          </Explainable>) },
        { label: "Gross pay", value: <Money value={r.gross} size="lg" /> },
        { label: "Against the month before", value: r.change === null
          ? "First month shown" : <Change value={r.change} size="lg" /> },
      ]}
      tabs={[
        { id: "changes", label: "Who changed", render: () =>
          r.changes.length === 0 ? (
            <p className={s.muted}>No comparison: this is the first month
              shown. Open July to see changes against June.</p>
          ) : (
            <ul className={s.list} aria-label="Who changed">
              {r.changes.map((c) => (
                <li key={c.employeeId} className={s.row}>
                  <span className={s.rowText}>{c.name}
                    <small>{reasonText(c.reasons)}</small></span>
                  <span className={s.rowEnd}><Change value={c.change} />
                  </span>
                </li>
              ))}
            </ul>
          ) },
        { id: "payslips", label: `Payslips (${r.slips.length})`,
          render: () => (
            <ul className={s.list} aria-label="Payslips">
              {r.slips.map((x) => (
                <li key={x.employeeId} className={s.row}>
                  <span className={s.rowText}>{x.name}
                    <small>Gross <Money value={x.gross} size="sm" /></small>
                  </span>
                  <span className={s.rowEnd}>
                    <Money value={x.net} size="sm" /></span>
                </li>
              ))}
            </ul>
          ) },
      ]} />
  );
}
