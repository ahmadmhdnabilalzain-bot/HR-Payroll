import { useState } from "react";
import { hrefOf } from "../../demo/route";
import b from "../../ui/button.module.css";
import {
  ApprovalForm,
  FilterList,
  KeyValues,
  RecordTabs,
} from "../../ui/templates";
import { NotFound } from "./Outside";
import { History, type HistoryItem } from "./History";
import { requestIsOpen, requestRows, type RequestRow } from "./model";
import s from "./papers.module.css";
import { Stack, Status } from "./Status";
import { usePapers, type Papers } from "./usePapers";
import { LINK_LABEL, REQUEST_KINDS, REQUEST_STATUS, waitText }
  from "./words";

const LIST = hrefOf("people", "papers", "requests");

/** P30 and P31: the HR queue of staff requests, and raising one. */
export function Requests() {
  const p = usePapers();
  const [open, setOpen] = useState(false);
  const rows = requestRows(p.data, p.state);
  const people = p.data.people.people().filter((x) => x.status !== "left");
  const hr = p.nameOf(p.me);
  return (
    <>
      <FilterList title="Staff requests"
        lede="What people have asked HR for, oldest first. Open one to
          act on it."
        rows={rows} rowKey={(r) => r.id}
        searchText={(r) => `${r.title} ${p.nameOf(r.employeeId)}`}
        rowHref={(r) => hrefOf("people", "papers", "requests", r.id)}
        segments={[
          { id: "todo", label: "To do", match: requestIsOpen },
          { id: "done", label: "Closed", match: (r) => !requestIsOpen(r) },
          { id: "all", label: "All", match: () => true },
        ]}
        columns={[
          { key: "t", label: "Request", render: (r) => (
            <Stack main={r.title} sub={p.nameOf(r.employeeId)} />) },
          { key: "r", label: "Raised",
            render: (r) => p.when(r.raisedOn) },
          { key: "w", label: "Waiting", render: (r) =>
            r.waiting === null ? "" : waitText(r.waiting) },
          { key: "s", label: "Status", render: (r) => {
            const [word, tone] = REQUEST_STATUS[r.status];
            return <Status word={word} tone={tone} />;
          } },
        ]}
        empty="Nothing waiting. New requests from staff arrive here."
        actions={(
          <button type="button" className={`${b.btn} ${b.primary}`}
            onClick={() => setOpen(true)}>Raise a request</button>
        )} />
      <ApprovalForm key={p.state.nextPaper} open={open}
        title="Raise a request for someone" maker={hr}
        checker={p.nameOf(p.data.papers.queueOwnerId)}
        submitLabel="Send to the queue" onClose={() => setOpen(false)}
        fields={[
          { key: "who", label: "For", kind: "select", required: true,
            options: people.map((x) => ({ value: x.id,
              label: x.name[p.lang] })), initial: people[0]?.id ?? "" },
          { key: "kind", label: "What", kind: "select", required: true,
            options: REQUEST_KINDS.map(([value, label]) =>
              ({ value, label })), initial: "other" },
          { key: "note", label: "Details", kind: "textarea",
            help: "One or two lines for whoever picks it up." },
        ]}
        onSubmit={(v) => {
          const kind = REQUEST_KINDS.find(([k]) => k === v["kind"]);
          const who = v["who"] ?? "";
          p.dispatch({ type: "request-new", draft: {
            kind: v["kind"] ?? "other", title: kind?.[1] ?? "Request",
            employeeId: who, note: v["note"] ?? "",
            raisedOn: p.data.papers.asOf, by: p.me } });
          p.toast.show(`Request sent for ${p.nameOf(who)}.`);
          return null;
        }} />
    </>
  );
}

function historyOf(p: Papers, r: RequestRow): HistoryItem[] {
  const raised: HistoryItem = r.isNew
    ? { text: `Raised for ${p.nameOf(r.employeeId)} by HR`,
      when: p.when(r.raisedOn), tone: "info" }
    : { text: `Raised by ${p.nameOf(r.employeeId)}`,
      when: p.when(r.raisedOn), tone: "info" };
  if (r.step === null) {
    return r.status === "done" ? [raised, { text: "Done", tone: "ok" }]
      : [raised];
  }
  const [word, tone] = REQUEST_STATUS[r.status];
  return [raised, { text: p.byLine(word, r.step), tone }];
}

/** The record of one request, with the decision. */
export function RequestRecord(props: { id: string }) {
  const p = usePapers();
  const r = requestRows(p.data, p.state).find((x) => x.id === props.id);
  if (r === undefined) {
    return <NotFound what="request" back="Staff requests" href={LIST} />;
  }
  const [word] = REQUEST_STATUS[r.status];
  const prev = r.step;
  const set = (status: string, msg: string): void =>
    p.record(r.id, status, msg, prev);
  const link = r.linksTo === "enter-iban"
    ? hrefOf("pay-run", "fix")
    : r.linksTo?.startsWith("lt-") === true
      ? hrefOf("people", "papers", "letters", r.linksTo) : null;
  const linkLabel = r.linksTo === "enter-iban"
    ? LINK_LABEL["enter-iban"] : "Open the letter";
  const actions = requestIsOpen(r) ? (
    <>
      {r.status === "open" ? (
        <button type="button" className={`${b.btn} ${b.primary}`}
          onClick={() => set("in-progress", "Request started.")}>
          Start</button>
      ) : (
        <button type="button" className={`${b.btn} ${b.primary}`}
          onClick={() => set("done", "Request marked done.")}>
          Mark done</button>
      )}
      <button type="button" className={`${b.btn} ${b.quiet}`}
        onClick={() => set("declined", "Request declined.")}>
        Decline</button>
    </>
  ) : r.step !== null ? (
    <button type="button" className={`${b.btn} ${b.secondary}`}
      onClick={() => p.dispatch({ type: "paper-undo", id: r.id })}>
      Reopen</button>
  ) : undefined;
  return (
    <RecordTabs title={r.title} lede={`${p.nameOf(r.employeeId)}, ` +
      p.roleOf(r.employeeId)} back={{ label: "Staff requests",
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
            { label: "Person", value: <a className={s.link}
              href={hrefOf("people", r.employeeId)}>
              {p.nameOf(r.employeeId)}</a> },
            { label: "Assigned to", value: p.nameOf(r.assignedToId) },
            ...(r.note === "" ? [] : [{ label: "Details",
              value: r.note }]),
          ]} />
          {link !== null && (
            <a className={s.link} href={link}>{linkLabel}</a>
          )}
        </div>) },
      { id: "history", label: "History",
        render: () => <History items={historyOf(p, r)} /> },
    ]} />
  );
}
