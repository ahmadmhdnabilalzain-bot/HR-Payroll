import { fils } from "@payroll/engine";
import { bonusStatus, type BonusRun } from "../demo/bonus-state";
import { useDemo } from "../demo/state";
import { useLocale } from "../i18n/LocaleProvider";
import { dayMonth } from "./derive";
import { Explainable } from "../components/explain";
import { hrefOf } from "../demo/route";
import { Money } from "../ui/Money";
import { FilterList, RecordTabs } from "../ui/templates";
import { usePay } from "./load";
import { NotFound, Status } from "./parts";
import s from "./pay.module.css";
import type { PastRunView } from "./types";

const LIST = hrefOf("pay-run", "runs");

/** A month's run, or a signed-off off-cycle bonus run. */
type HistoryRow = { kind: "run"; r: PastRunView } |
  { kind: "bonus"; run: BonusRun };

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
  const { data, state } = useDemo();
  const { lang } = useLocale();
  const payday = dayMonth(data.payCalendar().payday, lang);
  const runs: HistoryRow[] = [...pay.runs].reverse().map((r) =>
    ({ kind: "run", r }));
  // Signed-off bonus runs sit under the month they are paid in.
  const bonus: HistoryRow[] = state.bonusRuns
    .filter((x) => bonusStatus(x) === "signed")
    .map((run) => ({ kind: "bonus", run }));
  const rows: HistoryRow[] = [...runs.slice(0, 1), ...bonus,
    ...runs.slice(1)];
  return (
    <FilterList title="Pay runs"
      lede={"Each month as paid, worked out the same way. Open a " +
        "month to see who changed and why, and every payslip."}
      rows={rows} rowKey={(x) => x.kind === "run" ? x.r.id : x.run.id}
      rowHref={(x) => x.kind === "bonus"
        ? hrefOf("pay-run", "bonus", x.run.id) : x.r.paid
          ? hrefOf("pay-run", "runs", x.r.key) : hrefOf("pay-run", "review")}
      columns={[
        { key: "m", label: "Month", render: (x) => x.kind === "bonus"
          ? `${x.run.label}, off-cycle` : x.r.label },
        { key: "n", label: "People", end: true, render: (x) =>
          <span className="tabular">{x.kind === "bonus"
            ? x.run.totals.count : x.r.headcount}</span> },
        { key: "g", label: "Gross", end: true, render: (x) =>
          <Money value={x.kind === "bonus" ? x.run.totals.gross
            : x.r.gross} size="sm" /> },
        { key: "net", label: "Net", end: true, render: (x) =>
          <Money value={x.kind === "bonus" ? x.run.totals.net : x.r.net}
            size="sm" /> },
        { key: "c", label: "Against the month before", end: true,
          render: (x) => x.kind === "bonus"
            ? <span className={s.muted}>Off-cycle</span>
            : x.r.change === null
              ? <span className={s.muted}>First month shown</span>
              : <Change value={x.r.change} /> },
        { key: "st", label: "Status", render: (x) => x.kind === "bonus"
          ? <Status tone="done">{`Signed off, pays ${payday}`}</Status>
          : x.r.paid
            ? <Status tone="done">{`Paid ${x.r.paidOn}`}</Status>
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
        { label: "Gross pay", value: (
          <Explainable explanation={r.grossExplanation}>
            <Money value={r.gross} size="lg" />
          </Explainable>) },
        { label: "Against the month before", value: r.change === null
          ? "First month shown" : (
            <Explainable explanation={r.changeExplanation ?? undefined}>
              <Change value={r.change} size="lg" />
            </Explainable>) },
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
