import { hrefOf } from "../../demo/route";
import b from "../../ui/button.module.css";
import { FilterList, KeyValues, RecordTabs } from "../../ui/templates";
import { History, type HistoryItem } from "../papers/History";
import { NotFound } from "../papers/Outside";
import { Stack, Status } from "../papers/Status";
import { accessIsOpen, accessRows, type AccessRow } from "./model";
import s from "./requests.module.css";
import { useRequests, type Requests } from "./useRequests";
import { ACCESS_STATUS, VERB, waitText } from "./words";

const LIST = hrefOf("people", "requests", "access");

/** E15, the queue side: who asked for which role. */
export function AccessQueue() {
  const p = useRequests();
  const rows = accessRows(p.data, p.state);
  return (
    <FilterList title="Access requests"
      lede={"People asking for a role they do not have. Giving a role is " +
        "your decision; the request shows who asked and why."}
      rows={rows} rowKey={(r) => r.id}
      searchText={(r) => `${r.roleLabel} ${p.nameOf(r.employeeId)}`}
      rowHref={(r) => hrefOf("people", "requests", "access", r.id)}
      segments={[
        { id: "todo", label: "To do", match: accessIsOpen },
        { id: "done", label: "Closed", match: (r) => !accessIsOpen(r) },
        { id: "all", label: "All", match: () => true },
      ]}
      columns={[
        { key: "t", label: "Person", render: (r) => (
          <Stack main={p.nameOf(r.employeeId)}
            sub={p.roleOf(r.employeeId)} />) },
        { key: "o", label: "Role asked for", render: (r) => r.roleLabel },
        { key: "r", label: "Raised", render: (r) => p.when(r.raisedOn) },
        { key: "w", label: "Waiting", render: (r) =>
          r.waiting === null ? "" : waitText(r.waiting) },
        { key: "s", label: "Status", render: (r) => {
          const [word, tone] = ACCESS_STATUS[r.status];
          return <Status word={word} tone={tone} />;
        } },
      ]}
      empty="Nothing waiting. Access requests arrive here." />
  );
}

function historyOf(p: Requests, r: AccessRow): HistoryItem[] {
  const raised: HistoryItem = { text: `Asked for by ` +
    `${p.nameOf(r.employeeId)}`, when: p.when(r.raisedOn), tone: "info" };
  if (r.step === null) {
    return r.status === "granted" ? [raised, { text: "Given",
      tone: "ok" }] : [raised];
  }
  const [word, tone] = ACCESS_STATUS[r.status];
  return [raised, { text: p.byLine(VERB[r.status] ?? word, r.step),
    tone }];
}

export function AccessRecord(props: { id: string }) {
  const p = useRequests();
  const r = accessRows(p.data, p.state).find((x) => x.id === props.id);
  if (r === undefined) {
    return <NotFound what="access request" back="Access requests"
      href={LIST} />;
  }
  const [word] = ACCESS_STATUS[r.status];
  const set = (status: string, msg: string): void =>
    p.record(r.id, status, msg, r.step);
  const actions = accessIsOpen(r) ? (
    <>
      <button type="button" className={`${b.btn} ${b.primary}`}
        onClick={() => set("granted", `${r.roleLabel} given to ` +
          `${p.nameOf(r.employeeId)}.`)}>Give the role</button>
      <button type="button" className={`${b.btn} ${b.quiet}`}
        onClick={() => set("declined", "Access request declined.")}>
        Decline</button>
    </>
  ) : r.step !== null ? (
    <button type="button" className={`${b.btn} ${b.secondary}`}
      onClick={() => p.dispatch({ type: "req-undo", id: r.id })}>
      Reopen</button>
  ) : undefined;
  return (
    <RecordTabs title={r.roleLabel} lede={`${p.nameOf(r.employeeId)}, ` +
      p.roleOf(r.employeeId)} back={{ label: "Access requests",
      href: LIST }}
    stats={[{ label: "Status", value: word },
      { label: "Raised", value: p.when(r.raisedOn) },
      { label: "Open for", value: r.waiting === null ? "Closed"
        : waitText(r.waiting) }]}
    actions={actions}
    tabs={[
      { id: "request", label: "Request", render: () => (
        <div className={s.block}>
          <KeyValues items={[
            { label: "Person", value: p.nameOf(r.employeeId) },
            { label: "Role asked for", value: r.roleLabel },
            { label: "Why", value: r.reason },
          ]} />
          <a className={s.link} href={hrefOf("setup", "access", "who")}>
            See what this role can do</a>
        </div>) },
      { id: "history", label: "History",
        render: () => <History items={historyOf(p, r)} /> },
    ]} />
  );
}
