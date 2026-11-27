import { hrefOf } from "../../demo/route";
import b from "../../ui/button.module.css";
import { FilterList, KeyValues, RecordTabs } from "../../ui/templates";
import { useToast } from "../../ui/Toast";
import { Status, usePrivacyView, type PrivacyView } from "./common";
import type { RequestOutcome } from "./state";
import s from "./privacy.module.css";

const OUTCOME: Record<RequestOutcome, string> = { answered: "Answered",
  "legal-duty": "Kept for a legal duty", declined: "Declined" };
const base = (...r: string[]): string => hrefOf("setup", "privacy",
  "requests", ...r);

/** S26: requests from staff to see, correct or erase their data. */
export function Requests() {
  const v = usePrivacyView();
  const rows = v.src.requests(v.days);
  const done = (id: string): boolean => v.state.requestDecisions[id] !==
    undefined;
  return (
    <FilterList title="Data requests"
      lede={`Each request is due ${v.days} days after it is logged, as set ` +
        "on the Privacy and retention page (a sample, to confirm with " +
        "counsel). HR and the General manager record the answer."}
      rows={rows} rowKey={(r) => r.id}
      searchText={(r) => `${r.name} ${r.kindLabel} ${r.summary}`}
      rowHref={(r) => base(r.id)}
      segments={[{ id: "open", label: "Open", match: (r) => !done(r.id) },
        { id: "done", label: "Answered", match: (r) => done(r.id) }]}
      columns={[
        { key: "n", label: "Person", render: (r) => r.name },
        { key: "k", label: "Request", render: (r) => r.kindLabel },
        { key: "d", label: "Due", render: (r) => r.dueOn.display },
        { key: "s", label: "Status", end: true, render: (r) => {
          const d = v.state.requestDecisions[r.id];
          return d !== undefined ? <Status tone="ok">{OUTCOME[d.outcome]}
            </Status> : <Status tone={r.overdue ? "danger" : "warn"}>
            {r.dueText}</Status>;
        } },
      ]}
      empty="No requests here." />
  );
}

function Decide(p: { v: PrivacyView; id: string; who: string }) {
  const { v } = p;
  const toast = useToast();
  const d = v.state.requestDecisions[p.id];
  const record = (outcome: RequestOutcome): void => {
    v.dispatch({ type: "dsr-decide", id: p.id,
      decision: { outcome, ...v.stamp() } });
    toast.show(`${OUTCOME[outcome]}: ${p.who}. Nothing was sent or ` +
      "deleted.", () => v.dispatch({ type: "dsr-undo",
      id: p.id }));
  };
  if (d !== undefined) {
    return (
      <span className={s.stamp}>
        <Status tone="ok">{OUTCOME[d.outcome]} by {v.stampText(d)}</Status>
        {v.canEdit && (
          <button type="button" className={`${b.btn} ${b.quiet} ${s.tap}`}
            onClick={() => v.dispatch({ type: "dsr-undo", id: p.id })}>
            Undo</button>)}
      </span>
    );
  }
  if (!v.canEdit) return null;
  return (
    <>
      <button type="button" className={`${b.btn} ${b.secondary} ${s.tap}`}
        onClick={() => record("declined")}>Decline</button>
      <button type="button" className={`${b.btn} ${b.secondary} ${s.tap}`}
        onClick={() => record("legal-duty")}>Keep: legal duty</button>
      <button type="button" className={`${b.btn} ${b.primary} ${s.tap}`}
        onClick={() => record("answered")}>Mark as answered</button>
    </>
  );
}

export function RequestRecord(p: { id: string }) {
  const v = usePrivacyView();
  const r = v.src.requests(v.days).find((x) => x.id === p.id);
  if (r === undefined) {
    return <p className={s.loading}>That request is not in the log.</p>;
  }
  const d = v.state.requestDecisions[r.id];
  const kind = v.src.kinds[r.kind];
  return (
    <RecordTabs title={`${r.kindLabel} request: ${r.name}`}
      lede={kind.help} back={{ label: "Data requests", href: base() }}
      stats={[{ label: "Logged", value: r.receivedOn.display },
        { label: "Due", value: r.dueOn.display },
        { label: "Status", value: d !== undefined ? OUTCOME[d.outcome]
          : r.dueText }]}
      actions={<Decide v={v} id={r.id} who={r.name} />}
      tabs={[{ id: "request", label: "Request", render: () => (
        <KeyValues items={[{ label: "Person", value: r.name },
          { label: "Kind", value: `${r.kindLabel} (${r.article} of the ` +
            "UAE personal data law)" },
          { label: "What they ask", value: r.summary },
          { label: "Days to answer", value: `${v.days}, a company choice ` +
            "to confirm with counsel" }]} />) },
      { id: "log", label: "Decision log", render: () => (
        d === undefined ? <p>No decision yet.</p> : (
          <KeyValues items={[{ label: "Decision", value: OUTCOME[d.outcome] },
            { label: "By", value: v.stampText(d) }]} />)) }]} />
  );
}
