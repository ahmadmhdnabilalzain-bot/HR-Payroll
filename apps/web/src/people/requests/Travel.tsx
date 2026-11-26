import { useState } from "react";
import { hrefOf } from "../../demo/route";
import b from "../../ui/button.module.css";
import {
  ApprovalForm,
  FilterList,
  KeyValues,
  RecordTabs,
} from "../../ui/templates";
import { History, type HistoryItem } from "../papers/History";
import { NotFound } from "../papers/Outside";
import { Stack, Status } from "../papers/Status";
import { countryName } from "../words";
import { travelIsOpen, travelRows, type TravelRow } from "./model";
import s from "./requests.module.css";
import { useRequests, type Requests } from "./useRequests";
import { TRAVEL_STATUS, VERB, waitText } from "./words";

const LIST = hrefOf("people", "requests", "travel");
const ENT = hrefOf("people", "requests", "travel", "entitlements");

/** P36: ticket requests and trips, with the entitlements one tap away. */
export function Travel() {
  const p = useRequests();
  const [open, setOpen] = useState(false);
  const rows = travelRows(p.data, p.state);
  const eligible = p.data.requests.entitlements().filter((x) => x.eligible);
  const trip = (r: TravelRow): string =>
    `${p.when(r.departOn)} to ${p.when(r.returnOn)}`;
  return (
    <>
      <FilterList title="Travel and air tickets"
        lede={"Ticket requests from staff, and the trips booked. Open one " +
          "to book it."}
        rows={rows} rowKey={(r) => r.id}
        searchText={(r) => `${p.nameOf(r.employeeId)} ${r.title}`}
        rowHref={(r) => hrefOf("people", "requests", "travel", r.id)}
        segments={[
          { id: "todo", label: "To book", match: travelIsOpen },
          { id: "booked", label: "Booked",
            match: (r) => r.status === "booked" },
          { id: "all", label: "All", match: () => true },
        ]}
        columns={[
          { key: "t", label: "Traveller", render: (r) => (
            <Stack main={p.nameOf(r.employeeId)} sub={r.title} />) },
          { key: "d", label: "Trip", render: trip },
          { key: "c", label: "Cabin", render: (r) => r.cabin },
          { key: "s", label: "Status", render: (r) => {
            const [word, tone] = TRAVEL_STATUS[r.status];
            return <Status word={word} tone={tone} />;
          } },
        ]}
        empty="Nothing to book. Ticket requests arrive here."
        actions={(
          <>
            <a className={`${b.btn} ${b.secondary}`} href={ENT}>
              Ticket entitlements</a>
            <button type="button" className={`${b.btn} ${b.primary}`}
              onClick={() => setOpen(true)}>Request a ticket</button>
          </>
        )} />
      <ApprovalForm key={p.state.nextReq} open={open}
        title="Request a ticket for someone" maker={p.nameOf(p.me)}
        checker={p.nameOf(p.data.requests.ownerId)}
        submitLabel="Send to the queue" onClose={() => setOpen(false)}
        fields={[
          { key: "who", label: "For", kind: "select", required: true,
            options: eligible.map((x) => ({ value: x.employeeId,
              label: x.name })), initial: eligible[0]?.employeeId ?? "" },
          { key: "depart", label: "Leaving on", kind: "date",
            required: true },
          { key: "return", label: "Back on", kind: "date",
            required: true },
          { key: "note", label: "Note", kind: "textarea" },
        ]}
        onSubmit={(v) => {
          const depart = v["depart"] ?? "";
          const back = v["return"] ?? "";
          if (back <= depart) return "The return date must be after " +
            "the leaving date.";
          p.dispatch({ type: "req-new", draft: { kind: "travel",
            employeeId: v["who"] ?? "", raisedOn: p.data.requests.asOf,
            values: { depart, return: back, note: v["note"] ?? "" },
            by: p.me, role: p.state.role } });
          p.toast.show("Ticket request sent to the queue.");
          return null;
        }} />
    </>
  );
}

/** Who gets a ticket and when the next one falls due. */
export function Entitlements() {
  const p = useRequests();
  const rows = p.data.requests.entitlements();
  return (
    <FilterList title="Ticket entitlements"
      lede={p.data.requests.ticketBasis}
      rows={rows} rowKey={(r) => r.employeeId}
      searchText={(r) => r.name}
      segments={[
        { id: "soon", label: "Due soon", match: (r) => r.status === "soon" },
        { id: "elig", label: "Entitled", match: (r) => r.eligible },
        { id: "all", label: "Everyone", match: () => true },
      ]}
      columns={[
        { key: "n", label: "Person", render: (r) => (
          <Stack main={r.name} sub={r.eligible
            ? countryName(r.homeCountry, p.lang) : "UAE national"} />) },
        { key: "c", label: "Cabin", render: (r) => r.display.cabin },
        { key: "d", label: "Next ticket from", render: (r) =>
          r.dueOn === null ? "Not included" : p.when(r.dueOn.iso) },
        { key: "s", label: "Status", render: (r) => (
          <Status word={r.display.status} tone={r.status === "soon"
            ? "warn" : "quiet"} />) },
      ]}
      empty="No one is entitled to a ticket."
      actions={<a className={`${b.btn} ${b.secondary}`} href={LIST}>
        Ticket requests</a>} />
  );
}

function historyOf(p: Requests, r: TravelRow): HistoryItem[] {
  const raised: HistoryItem = { text: `Asked for ${p.nameOf(r.employeeId)}`,
    when: p.when(r.raisedOn), tone: "info" };
  if (r.step === null) {
    return r.status === "open" ? [raised] : [raised, {
      text: r.status === "booked" ? "Booked" : "Travelled",
      tone: r.status === "booked" ? "info" : "ok" }];
  }
  const [word, tone] = TRAVEL_STATUS[r.status];
  return [raised, { text: p.byLine(VERB[r.status] ?? word, r.step),
    tone }];
}

export function TravelRecord(props: { id: string }) {
  const p = useRequests();
  const r = travelRows(p.data, p.state).find((x) => x.id === props.id);
  if (r === undefined) {
    return <NotFound what="ticket request" back="Travel" href={LIST} />;
  }
  const [word] = TRAVEL_STATUS[r.status];
  const set = (status: string, msg: string): void =>
    p.record(r.id, status, msg, r.step);
  const actions = r.status === "open" ? (
    <>
      <button type="button" className={`${b.btn} ${b.primary}`}
        onClick={() => set("booked", "Ticket marked booked.")}>
        Mark booked</button>
      <button type="button" className={`${b.btn} ${b.quiet}`}
        onClick={() => set("declined", "Ticket request declined.")}>
        Decline</button>
    </>
  ) : r.status === "booked" ? (
    <>
      <button type="button" className={`${b.btn} ${b.primary}`}
        onClick={() => set("done", "Trip marked as travelled.")}>
        Mark travelled</button>
      {r.step !== null && (
        <button type="button" className={`${b.btn} ${b.quiet}`}
          onClick={() => p.dispatch({ type: "req-undo", id: r.id })}>
          Back to to book</button>
      )}
    </>
  ) : r.step !== null ? (
    <button type="button" className={`${b.btn} ${b.secondary}`}
      onClick={() => p.dispatch({ type: "req-undo", id: r.id })}>
      Reopen</button>
  ) : undefined;
  return (
    <RecordTabs title={r.title} lede={`${p.nameOf(r.employeeId)}, ` +
      p.roleOf(r.employeeId)} back={{ label: "Travel and tickets",
      href: LIST }}
    stats={[{ label: "Status", value: word },
      { label: "Leaving", value: p.when(r.departOn) },
      { label: "Back", value: p.when(r.returnOn) }]}
    actions={actions}
    tabs={[
      { id: "trip", label: "Trip", render: () => (
        <div className={s.block}>
          <KeyValues items={[
            { label: "Traveller", value: <a className={s.link}
              href={hrefOf("people", r.employeeId)}>
              {p.nameOf(r.employeeId)}</a> },
            { label: "To", value: countryName(r.homeCountry, p.lang) },
            { label: "Cabin", value: r.cabin },
            { label: "Assigned to", value: p.nameOf(r.assignedTo) },
            ...(r.note === "" ? [] : [{ label: "Note",
              value: r.note }]),
          ]} />
          <a className={s.link} href={ENT}>See ticket entitlements</a>
        </div>) },
      { id: "history", label: "History",
        render: () => <History items={historyOf(p, r)} /> },
    ]} />
  );
}
