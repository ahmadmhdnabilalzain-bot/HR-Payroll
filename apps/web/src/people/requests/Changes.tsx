import { hrefOf } from "../../demo/route";
import b from "../../ui/button.module.css";
import { FilterList, KeyValues, RecordTabs } from "../../ui/templates";
import { History, type HistoryItem } from "../papers/History";
import { NotFound } from "../papers/Outside";
import { Stack, Status } from "../papers/Status";
import { changeIsOpen, changeRows, type ChangeRow } from "./model";
import s from "./requests.module.css";
import { useRequests, type Requests } from "./useRequests";
import { CHANGE_STATUS, VERB, waitText } from "./words";

const LIST = hrefOf("people", "requests", "changes");

/** P32: changes of personal details that staff asked for. */
export function Changes() {
  const p = useRequests();
  const rows = changeRows(p.data, p.state);
  return (
    <FilterList title="Profile change requests"
      lede={"Changes people asked to make to their own details. Open one " +
        "to update the record, ask for proof or decline."}
      rows={rows} rowKey={(r) => r.id}
      searchText={(r) => `${r.field} ${p.nameOf(r.employeeId)}`}
      rowHref={(r) => hrefOf("people", "requests", "changes", r.id)}
      segments={[
        { id: "todo", label: "To do", match: changeIsOpen },
        { id: "done", label: "Closed", match: (r) => !changeIsOpen(r) },
        { id: "all", label: "All", match: () => true },
      ]}
      columns={[
        { key: "t", label: "Change", render: (r) => (
          <Stack main={r.field} sub={p.nameOf(r.employeeId)} />) },
        { key: "n", label: "New value", render: (r) => r.proposed },
        { key: "r", label: "Raised", render: (r) => p.when(r.raisedOn) },
        { key: "w", label: "Waiting", render: (r) =>
          r.waiting === null ? "" : waitText(r.waiting) },
        { key: "s", label: "Status", render: (r) => {
          const [word, tone] = CHANGE_STATUS[r.status];
          return <Status word={word} tone={tone} />;
        } },
      ]}
      empty="Nothing waiting. Changes staff ask for arrive here." />
  );
}

function historyOf(p: Requests, r: ChangeRow): HistoryItem[] {
  const raised: HistoryItem = { text: `Asked for by ` +
    `${p.nameOf(r.employeeId)}`, when: p.when(r.raisedOn), tone: "info" };
  if (r.step === null) return [raised];
  const [word, tone] = CHANGE_STATUS[r.status];
  return [raised, { text: p.byLine(VERB[r.status] ?? word, r.step),
    tone }];
}

/** One change request, with the decision. */
export function ChangeRecord(props: { id: string }) {
  const p = useRequests();
  const r = changeRows(p.data, p.state).find((x) => x.id === props.id);
  if (r === undefined) {
    return <NotFound what="change request" back="Profile changes"
      href={LIST} />;
  }
  const [word] = CHANGE_STATUS[r.status];
  const set = (status: string, msg: string): void =>
    p.record(r.id, status, msg, r.step);
  const needsProof = r.proof !== "None needed" && r.status === "open";
  const actions = changeIsOpen(r) ? (
    <>
      <button type="button" className={`${b.btn} ${b.primary}`}
        onClick={() => set("done", `Record updated for ` +
          `${p.nameOf(r.employeeId)}.`)}>Update the record</button>
      {needsProof && (
        <button type="button" className={`${b.btn} ${b.secondary}`}
          onClick={() => set("proof", "Proof asked for.")}>
          Ask for proof</button>
      )}
      <button type="button" className={`${b.btn} ${b.quiet}`}
        onClick={() => set("declined", "Change declined.")}>
        Decline</button>
    </>
  ) : r.step !== null ? (
    <button type="button" className={`${b.btn} ${b.secondary}`}
      onClick={() => p.dispatch({ type: "req-undo", id: r.id })}>
      Reopen</button>
  ) : undefined;
  return (
    <RecordTabs title={r.field} lede={`${p.nameOf(r.employeeId)}, ` +
      p.roleOf(r.employeeId)} back={{ label: "Profile changes",
      href: LIST }}
    stats={[{ label: "Status", value: word },
      { label: "Raised", value: p.when(r.raisedOn) },
      { label: "Open for", value: r.waiting === null ? "Closed"
        : waitText(r.waiting) }]}
    actions={actions}
    tabs={[
      { id: "change", label: "Change", render: () => (
        <div className={s.block}>
          <KeyValues items={[
            { label: "Person", value: <a className={s.link}
              href={hrefOf("people", r.employeeId)}>
              {p.nameOf(r.employeeId)}</a> },
            { label: "On file now", value: r.current },
            { label: "New value", value: r.proposed },
            { label: "Proof to see", value: r.proof },
            { label: "Assigned to", value: p.nameOf(r.assignedTo) },
            ...(r.note === "" ? [] : [{ label: "Note",
              value: r.note }]),
          ]} />
        </div>) },
      { id: "history", label: "History",
        render: () => <History items={historyOf(p, r)} /> },
    ]} />
  );
}
