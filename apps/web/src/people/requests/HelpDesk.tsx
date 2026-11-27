import { hrefOf } from "../../demo/route";
import b from "../../ui/button.module.css";
import { FilterList, KeyValues, RecordTabs } from "../../ui/templates";
import { NotFound } from "../papers/Outside";
import { Stack, Status } from "../papers/Status";
import { ticketNeedsHr, ticketRows } from "./model";
import s from "./requests.module.css";
import { Thread } from "./Thread";
import { useRequests } from "./useRequests";
import { TICKET_STATUS, waitText } from "./words";

const LIST = hrefOf("people", "requests", "helpdesk");

/** P37: tickets people sent to HR, with their status. */
export function HelpDesk() {
  const p = useRequests();
  const rows = ticketRows(p.data, p.state);
  return (
    <FilterList title="HR help desk"
      lede={"Questions people sent to HR. Open a request to read the " +
        "messages and reply."}
      rows={rows} rowKey={(r) => r.id}
      searchText={(r) => `${r.subject} ${p.nameOf(r.employeeId)} ` +
        r.category}
      rowHref={(r) => hrefOf("people", "requests", "helpdesk", r.id)}
      segments={[
        { id: "todo", label: "Needs a reply", match: ticketNeedsHr },
        { id: "wait", label: "Waiting for the person",
          match: (r) => r.status === "waiting" },
        { id: "solved", label: "Solved",
          match: (r) => r.status === "solved" },
        { id: "all", label: "All", match: () => true },
      ]}
      columns={[
        { key: "t", label: "Request", render: (r) => (
          <Stack main={r.subject} sub={`${r.id}, ${p.nameOf(r.employeeId)}`}
          />) },
        { key: "c", label: "Topic", render: (r) => r.category },
        { key: "p", label: "Priority", render: (r) => r.priority },
        { key: "w", label: "Waiting", render: (r) =>
          r.waiting === null ? "" : waitText(r.waiting) },
        { key: "s", label: "Status", render: (r) => {
          const [word, tone] = TICKET_STATUS[r.status];
          return <Status word={word} tone={tone} />;
        } },
      ]}
      empty="No requests. Questions from staff arrive here." />
  );
}

/** One ticket: the thread, a reply, and mark it solved. */
export function TicketRecord(props: { id: string }) {
  const p = useRequests();
  const t = ticketRows(p.data, p.state).find((x) => x.id === props.id);
  if (t === undefined) {
    return <NotFound what="request" back="HR help desk" href={LIST} />;
  }
  const [word] = TICKET_STATUS[t.status];
  const solve = (): void => p.record(t.id, "solved", "Request marked " +
    "solved.", t.step);
  return (
    <RecordTabs title={t.subject} lede={`${p.nameOf(t.employeeId)}, ` +
      p.roleOf(t.employeeId)} back={{ label: "HR help desk", href: LIST }}
    stats={[{ label: "Status", value: word },
      { label: "Opened", value: p.when(t.raisedOn) },
      { label: "Topic", value: t.category }]}
    actions={t.status === "solved" ? undefined : (
      <button type="button" className={`${b.btn} ${b.secondary}`}
        onClick={solve}>Mark solved</button>
    )}
    tabs={[
      { id: "messages", label: "Messages", render: () => (
        <Thread t={t} r={p} as="hr" />) },
      { id: "details", label: "Details", render: () => (
        <div className={s.block}>
          <KeyValues items={[
            { label: "Request", value: t.id },
            { label: "From", value: <a className={s.link}
              href={hrefOf("people", t.employeeId)}>
              {p.nameOf(t.employeeId)}</a> },
            { label: "Priority", value: t.priority },
            { label: "Assigned to", value: p.nameOf(t.assignedTo) },
            ...(t.step === null ? [] : [{ label: "Last change",
              value: p.byLine(t.step.status === "solved" ? "Solved"
                : "Reopened", t.step) }]),
          ]} />
        </div>) },
    ]} />
  );
}
