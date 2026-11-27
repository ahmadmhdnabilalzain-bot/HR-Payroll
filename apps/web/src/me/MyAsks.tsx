import { useState } from "react";
import { hrefOf } from "../demo/route";
import b from "../ui/button.module.css";
import { ApprovalForm, FilterList, KeyValues, RecordTabs }
  from "../ui/templates";
import { letterRows } from "../people/papers/model";
import { Status } from "../people/papers/Status";
import { LETTER_KINDS, LETTER_KIND, LETTER_STATUS } from
  "../people/papers/words";
import {
  accessRows,
  changeRows,
  ticketRows,
  travelRows,
} from "../people/requests/model";
import { NotFound } from "../people/papers/Outside";
import { Thread } from "../people/requests/Thread";
import { useRequests } from "../people/requests/useRequests";
import {
  ACCESS_STATUS,
  CHANGE_STATUS,
  TICKET_STATUS,
  TRAVEL_STATUS,
  type Tone,
} from "../people/requests/words";

const LIST = hrefOf("me", "hr-requests");

interface Item {
  id: string;
  kind: string;
  title: string;
  on: string;
  word: string;
  tone: Tone;
  href?: string;
}

/** The viewer's own requests of every kind, newest first. */
function useItems() {
  const p = useRequests();
  const me = p.me;
  const items: Item[] = [
    ...letterRows(p.data, p.state).filter((l) => l.employeeId === me)
      .map((l): Item => ({ id: l.id, kind: "Letter", on: l.requestedOn,
        title: LETTER_KIND[l.kind], word: LETTER_STATUS[l.status][0],
        tone: LETTER_STATUS[l.status][1] })),
    ...travelRows(p.data, p.state).filter((r) => r.employeeId === me)
      .map((r): Item => ({ id: r.id, kind: "Air ticket", on: r.raisedOn,
        title: r.title, word: TRAVEL_STATUS[r.status][0],
        tone: TRAVEL_STATUS[r.status][1] })),
    ...ticketRows(p.data, p.state).filter((t) => t.employeeId === me)
      .map((t): Item => ({ id: t.id, kind: "Question to HR", on:
        t.raisedOn, title: t.subject, word: TICKET_STATUS[t.status][0],
      tone: TICKET_STATUS[t.status][1], href: hrefOf("me", "hr-requests",
        t.id) })),
    ...changeRows(p.data, p.state).filter((r) => r.employeeId === me)
      .map((r): Item => ({ id: r.id, kind: "Change of details", on:
        r.raisedOn, title: r.field, word: CHANGE_STATUS[r.status][0],
      tone: CHANGE_STATUS[r.status][1], href: hrefOf("me",
        "change-details") })),
    ...accessRows(p.data, p.state).filter((r) => r.employeeId === me)
      .map((r): Item => ({ id: r.id, kind: "Access", on: r.raisedOn,
        title: r.roleLabel, word: ACCESS_STATUS[r.status][0],
        tone: ACCESS_STATUS[r.status][1], href: hrefOf("me",
          "access-request") })),
  ].sort((a, c) => c.on.localeCompare(a.on));
  return { p, items };
}

/** E07: my requests and letters, with the forms to ask for more. */
export function MyAsks() {
  const { p, items } = useItems();
  const [form, setForm] = useState<"letter" | "ticket" | "travel" | null>(
    null);
  const gm = p.data.people.personas().gmId;
  const me = p.me;
  const ent = p.data.requests.entitlements().find((x) =>
    x.employeeId === me);
  const close = (): void => setForm(null);
  const stamp = { by: me, role: p.state.role,
    raisedOn: p.data.requests.asOf };
  return (
    <>
      <FilterList title="My requests and letters"
        lede={"Letters, travel and questions you sent to HR, and what " +
          "happened to each."}
        rows={items} rowKey={(i) => i.id}
        searchText={(i) => `${i.title} ${i.kind}`}
        rowHref={(i) => i.href}
        columns={[
          { key: "t", label: "Request", render: (i) => i.title },
          { key: "k", label: "Kind", render: (i) => i.kind },
          { key: "o", label: "Sent", render: (i) => p.when(i.on) },
          { key: "s", label: "Status", render: (i) => (
            <Status word={i.word} tone={i.tone} />) },
        ]}
        empty="You have not asked HR for anything yet."
        actions={(
          <>
            {ent?.eligible === true && (
              <button type="button" className={`${b.btn} ${b.quiet}`}
                onClick={() => setForm("travel")}>Ask for an air ticket
              </button>
            )}
            <button type="button" className={`${b.btn} ${b.secondary}`}
              onClick={() => setForm("ticket")}>Ask HR a question</button>
            <button type="button" className={`${b.btn} ${b.primary}`}
              onClick={() => setForm("letter")}>Ask for a letter</button>
          </>
        )} />
      <ApprovalForm key={`l${String(p.state.nextPaper)}`}
        open={form === "letter"} title="Ask for a letter"
        maker={p.nameOf(me)} checker={p.nameOf(gm)}
        submitLabel="Send for signature" onClose={close}
        fields={[
          { key: "kind", label: "Which letter", kind: "select",
            required: true, options: LETTER_KINDS.map(([value, label]) =>
              ({ value, label })), initial: "salary-certificate" },
          { key: "purpose", label: "What is it for", kind: "text",
            required: true },
          { key: "to", label: "Addressed to", kind: "text",
            help: "Leave empty for 'To whom it may concern'." },
        ]}
        onSubmit={(v) => {
          const kind = LETTER_KINDS.find(([k]) => k === v["kind"]);
          if (kind === undefined) return "Choose a letter.";
          p.dispatch({ type: "letter-new", draft: { kind: kind[0],
            employeeId: me, purpose: v["purpose"] ?? "",
            addressee: (v["to"] ?? "") === "" ? "To whom it may concern"
              : v["to"] ?? "", requestedOn: p.data.papers.asOf,
            checkerId: gm, by: me } });
          p.toast.show("Letter request sent. The General manager signs it.");
          return null;
        }} />
      <ApprovalForm key={`t${String(p.state.nextReq)}`}
        open={form === "ticket"} title="Ask HR a question"
        maker={p.nameOf(me)} checker={p.nameOf(p.data.requests.ownerId)}
        submitLabel="Send to HR" onClose={close}
        fields={[
          { key: "category", label: "Topic", kind: "select",
            required: true, options: p.data.requests.ticketCategories
              .map((c) => ({ value: c, label: c })), initial: "Other" },
          { key: "subject", label: "In a few words", kind: "text",
            required: true },
          { key: "text", label: "Your question", kind: "textarea",
            required: true },
        ]}
        onSubmit={(v) => {
          p.dispatch({ type: "req-new", draft: { kind: "ticket",
            employeeId: me, ...stamp, values: {
              category: v["category"] ?? "Other",
              subject: v["subject"] ?? "", text: v["text"] ?? "" } } });
          p.toast.show("Question sent to HR.");
          return null;
        }} />
      <ApprovalForm key={`v${String(p.state.nextReq)}`}
        open={form === "travel"} title="Ask for an air ticket"
        maker={p.nameOf(me)} checker={p.nameOf(p.data.requests.ownerId)}
        submitLabel="Send to HR" onClose={close}
        fields={[
          { key: "depart", label: "Leaving on", kind: "date",
            required: true },
          { key: "return", label: "Back on", kind: "date", required: true },
          { key: "note", label: "Note", kind: "textarea" },
        ]}
        onSubmit={(v) => {
          const depart = v["depart"] ?? "";
          const back = v["return"] ?? "";
          if (back <= depart) return "The return date must be after the " +
            "leaving date.";
          p.dispatch({ type: "req-new", draft: { kind: "travel",
            employeeId: me, ...stamp, values: { depart, return: back,
              note: v["note"] ?? "" } } });
          p.toast.show("Ticket request sent to HR.");
          return null;
        }} />
    </>
  );
}

/** One of my tickets: the messages and a reply box. */
export function MyTicket(props: { id: string }) {
  const p = useRequests();
  const t = ticketRows(p.data, p.state).find((x) => x.id === props.id);
  if (t === undefined || t.employeeId !== p.me) {
    return <NotFound what="request" back="My requests" href={LIST} />;
  }
  const [word] = TICKET_STATUS[t.status];
  return (
    <RecordTabs title={t.subject} lede={`Request ${t.id}`}
      back={{ label: "My requests", href: LIST }}
      stats={[{ label: "Status", value: word },
        { label: "Opened", value: p.when(t.raisedOn) },
        { label: "Topic", value: t.category }]}
      tabs={[
        { id: "messages", label: "Messages", render: () => (
          <Thread t={t} r={p} as="employee" />) },
        { id: "details", label: "Details", render: () => (
          <KeyValues items={[
            { label: "Answered by", value: p.nameOf(t.assignedTo) },
            { label: "Priority", value: t.priority },
          ]} />) },
      ]} />
  );
}
