import { hrefOf } from "../../demo/route";
import b from "../../ui/button.module.css";
import { FilterList, KeyValues, RecordTabs } from "../../ui/templates";
import { History, type HistoryItem } from "./History";
import { warningRows, type WarningRow } from "./model";
import { NotFound } from "./Outside";
import s from "./papers.module.css";
import { Stack, Status } from "./Status";
import { usePapers, type Papers } from "./usePapers";
import { WARNING_STATUS } from "./words";

const LIST = hrefOf("people", "papers", "warnings");

/** P47: warnings and disciplinary records (records only). */
export function Warnings() {
  const p = usePapers();
  const rows = warningRows(p.data, p.state);
  return (
    <FilterList title="Warnings"
      lede="Disciplinary records. They record what happened; no
        deduction or penalty is worked out here."
      rows={rows} rowKey={(w) => w.id}
      searchText={(w) => `${w.level} ${p.nameOf(w.employeeId)}`}
      rowHref={(w) => hrefOf("people", "papers", "warnings", w.id)}
      segments={[
        { id: "draft", label: "Drafts", match: (w) => w.status === "draft" },
        { id: "all", label: "All", match: () => true },
      ]}
      columns={[
        { key: "l", label: "Warning", render: (w) => (
          <Stack main={w.level} sub={p.nameOf(w.employeeId)} />) },
        { key: "r", label: "Reason", render: (w) => w.reason },
        { key: "s", label: "Status", render: (w) => {
          const [word, tone] = WARNING_STATUS[w.status];
          return <Status word={word} tone={tone} />;
        } },
      ]}
      empty="No drafts. A warning starts from what attendance shows." />
  );
}

function historyOf(p: Papers, w: WarningRow): HistoryItem[] {
  const out: HistoryItem[] = [{ text: `Prepared by ${p.nameOf(w.issuedById)}`,
    tone: "info" }];
  if (w.step !== null) {
    const [word, tone] = WARNING_STATUS[w.status];
    out.push({ text: p.byLine(word, w.step), tone });
  } else if (w.status === "closed") {
    out.push({ text: "Given and closed", tone: "quiet" });
  }
  return out;
}

/** One warning: the reason, the evidence, then issue or discard. */
export function WarningRecord(props: { id: string }) {
  const p = usePapers();
  const w = warningRows(p.data, p.state).find((x) => x.id === props.id);
  if (w === undefined) {
    return <NotFound what="warning" back="Warnings" href={LIST} />;
  }
  const [word] = WARNING_STATUS[w.status];
  const act = (status: string, msg: string): void =>
    p.record(w.id, status, msg, w.step);
  const actions = w.status === "draft" ? (
    <>
      <button type="button" className={`${b.btn} ${b.primary}`}
        onClick={() => act("issued", "Warning issued.")}>
        Issue warning</button>
      <button type="button" className={`${b.btn} ${b.quiet}`}
        onClick={() => act("discarded", "Draft discarded.")}>
        Discard draft</button>
    </>
  ) : w.step !== null ? (
    <button type="button" className={`${b.btn} ${b.secondary}`}
      onClick={() => p.dispatch({ type: "paper-undo", id: w.id })}>
      Back to draft</button>
  ) : undefined;
  return (
    <RecordTabs title={w.level} back={{ label: "Warnings", href: LIST }}
      lede={`${p.nameOf(w.employeeId)}, ${p.roleOf(w.employeeId)}`}
      stats={[{ label: "Status", value: word },
        { label: "Prepared by", value: p.nameOf(w.issuedById) },
        { label: "Days recorded", value: String(w.evidence.length) }]}
      actions={actions}
      tabs={[
        { id: "reason", label: "Reason", render: () => (
          <div className={s.block}>
            <p>{w.reason}</p>
            <KeyValues items={[
              { label: "Person", value: <a className={s.link}
                href={hrefOf("people", w.employeeId)}>
                {p.nameOf(w.employeeId)}</a> },
              { label: "Dates", value: w.evidence.map((e) => p.when(e))
                .join(", ") },
              { label: "Deduction", value: w.deductionNote },
            ]} />
          </div>) },
        { id: "history", label: "History",
          render: () => <History items={historyOf(p, w)} /> },
      ]} />
  );
}
