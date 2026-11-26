import { useState } from "react";
import { hrefOf } from "../../demo/route";
import { useSwitchRole } from "../../demo/actions";
import { Money } from "../../ui/Money";
import b from "../../ui/button.module.css";
import {
  ApprovalForm,
  FilterList,
  KeyValues,
  Paper,
  RecordTabs,
} from "../../ui/templates";
import { History, type HistoryItem } from "./History";
import { letterIsOpen, letterRows, type LetterRow } from "./model";
import { NotFound } from "./Outside";
import s from "./papers.module.css";
import { Stack, Status } from "./Status";
import { usePapers, type Papers } from "./usePapers";
import { LETTER_KIND, LETTER_KINDS, LETTER_STATUS, VERB } from "./words";

const LIST = hrefOf("people", "papers", "letters");

/** P33: letters and salary certificates, and asking for one. */
export function Letters() {
  const p = usePapers();
  const [open, setOpen] = useState(false);
  const rows = letterRows(p.data, p.state);
  const people = p.data.people.people().filter((x) => x.status !== "left" &&
    x.status !== "joining");
  const gm = p.data.people.personas().gmId;
  return (
    <>
      <FilterList title="Letters"
        lede="Salary certificates, no-objection and experience letters.
          HR prepares them and the General manager signs."
        rows={rows} rowKey={(l) => l.id}
        searchText={(l) => `${LETTER_KIND[l.kind]} ${p.nameOf(l.employeeId)}
          ${l.purpose}`}
        rowHref={(l) => hrefOf("people", "papers", "letters", l.id)}
        segments={[
          { id: "todo", label: "To do", match: letterIsOpen },
          { id: "issued", label: "Issued", match: (l) =>
            l.status === "issued" },
          { id: "all", label: "All", match: () => true },
        ]}
        columns={[
          { key: "k", label: "Letter", render: (l) => (
            <Stack main={LETTER_KIND[l.kind]}
              sub={p.nameOf(l.employeeId)} />) },
          { key: "f", label: "For", render: (l) => l.purpose },
          { key: "r", label: "Requested",
            render: (l) => p.when(l.requestedOn) },
          { key: "s", label: "Status", render: (l) => {
            const [word, tone] = LETTER_STATUS[l.status];
            return <Status word={word} tone={tone} />;
          } },
        ]}
        empty="No letters yet. Ask for one with the button above."
        actions={(
          <button type="button" className={`${b.btn} ${b.primary}`}
            onClick={() => setOpen(true)}>Request a letter</button>
        )} />
      <ApprovalForm key={p.state.nextPaper} open={open}
        title="Request a letter" maker={p.nameOf(p.me)}
        checker={p.nameOf(gm)} submitLabel="Send for signature"
        onClose={() => setOpen(false)}
        fields={[
          { key: "who", label: "For", kind: "select", required: true,
            options: people.map((x) => ({ value: x.id,
              label: x.name[p.lang] })), initial: people[0]?.id ?? "" },
          { key: "kind", label: "Letter", kind: "select", required: true,
            options: LETTER_KINDS.map(([value, label]) =>
              ({ value, label })), initial: "salary-certificate" },
          { key: "purpose", label: "What it is for", kind: "text",
            required: true, help: "For example: tenancy contract." },
          { key: "to", label: "Addressed to", kind: "text",
            initial: "To whom it may concern" },
        ]}
        onSubmit={(v) => {
          const kind = LETTER_KINDS.find(([k]) => k === v["kind"]);
          p.dispatch({ type: "letter-new", draft: {
            kind: kind?.[0] ?? "salary-certificate",
            employeeId: v["who"] ?? "", purpose: v["purpose"] ?? "",
            addressee: v["to"] ?? "", requestedOn: p.data.papers.asOf,
            checkerId: gm, by: p.me } });
          p.toast.show("Letter sent for signature.");
          return null;
        }} />
    </>
  );
}

function historyOf(p: Papers, l: LetterRow): HistoryItem[] {
  const out: HistoryItem[] = [{ text: "Requested",
    when: p.when(l.requestedOn), tone: "info" }];
  if (l.step !== null) {
    const [word, tone] = LETTER_STATUS[l.status];
    out.push({ text: p.byLine(l.status === "issued" ? "Signed and issued"
      : VERB[l.status] ?? word, l.step), tone });
  } else if (l.status === "issued") {
    out.push({ text: "Issued", tone: "ok" });
  }
  return out;
}

/** The letter as it would be handed over, drawn as a page. */
function LetterPage(props: { p: Papers; l: LetterRow }) {
  const { p, l } = props;
  const e = p.data.people.person(l.employeeId);
  const joined = e === null ? "" : p.when(e.joinedOn);
  const company = p.data.companyName[p.lang];
  return (
    <Paper label="Letter" company={company} title={LETTER_KIND[l.kind]}
      reference={l.reference} date={p.when(l.requestedOn)}
      sign={l.status === "issued" && l.step !== null
        ? p.byLine("Signed", l.step)
        : l.status === "issued" ? "Signed and issued"
          : `To be signed by ${p.nameOf(l.signerId)}, ` +
            p.roleOf(l.signerId)}>
      <p>{l.addressee}</p>
      {l.kind === "salary-certificate" && l.monthlySalary !== null ? (
        <p>This confirms that {p.nameOf(l.employeeId)},{" "}
          {p.roleOf(l.employeeId)}, has worked for {company} since{" "}
          {joined}, on a monthly salary of{" "}
          <Money value={l.monthlySalary} tween={false} />, as per
          contract. Issued at the employee's request for:{" "}
          {l.purpose}.</p>
      ) : l.kind === "noc" ? (
        <p>{company} has no objection to {p.nameOf(l.employeeId)},{" "}
          {p.roleOf(l.employeeId)}. Purpose: {l.purpose}.</p>
      ) : (
        <p>This confirms that {p.nameOf(l.employeeId)} worked for{" "}
          {company} as {p.roleOf(l.employeeId)}, from {joined}.
          Purpose: {l.purpose}.</p>
      )}
    </Paper>
  );
}

/** One letter: the text, who signs, and the signing. */
export function LetterRecord(props: { id: string }) {
  const p = usePapers();
  const switchRole = useSwitchRole();
  const l = letterRows(p.data, p.state).find((x) => x.id === props.id);
  if (l === undefined) {
    return <NotFound what="letter" back="Letters" href={LIST} />;
  }
  const [word] = LETTER_STATUS[l.status];
  const mayIssue = p.state.role === "gm";
  const act = (status: string, msg: string): void =>
    p.record(l.id, status, msg, l.step);
  const actions = l.status === "draft" ? (
    <button type="button" className={`${b.btn} ${b.primary}`}
      onClick={() => act("pending", "Letter sent for signature.")}>
      Send for signature</button>
  ) : l.status === "pending" ? (mayIssue ? (
    <>
      <button type="button" className={`${b.btn} ${b.primary}`}
        onClick={() => act("issued", "Letter signed and issued.")}>
        Sign and issue</button>
      <button type="button" className={`${b.btn} ${b.quiet}`}
        onClick={() => act("withdrawn", "Letter withdrawn.")}>
        Withdraw</button>
    </>
  ) : (
    <>
      <button type="button" className={`${b.btn} ${b.secondary}`}
        onClick={() => switchRole("gm")}>View as General manager</button>
      <button type="button" className={`${b.btn} ${b.quiet}`}
        onClick={() => act("withdrawn", "Letter withdrawn.")}>
        Withdraw</button>
    </>
  )) : l.status === "issued" ? (
    <button type="button" className={`${b.btn} ${b.secondary}`}
      onClick={() => print()}>Print</button>
  ) : l.step !== null ? (
    <button type="button" className={`${b.btn} ${b.secondary}`}
      onClick={() => p.dispatch({ type: "paper-undo", id: l.id })}>
      Reopen</button>
  ) : undefined;
  return (
    <RecordTabs title={LETTER_KIND[l.kind]} back={{ label: "Letters",
      href: LIST }} lede={`${p.nameOf(l.employeeId)}, ` +
      p.roleOf(l.employeeId)}
    stats={[{ label: "Status", value: word },
      { label: "Requested", value: p.when(l.requestedOn) },
      l.monthlySalary !== null && l.kind === "salary-certificate"
        ? { label: "Monthly salary", value:
          <Money value={l.monthlySalary} size="md" /> }
        : { label: "Addressed to", value: l.addressee }]}
    actions={actions}
    tabs={[
      { id: "letter", label: "Letter",
        render: () => <LetterPage p={p} l={l} /> },
      { id: "details", label: "Details", render: () => (
        <KeyValues items={[
          { label: "Person", value: <a className={s.link}
            href={hrefOf("people", l.employeeId)}>
            {p.nameOf(l.employeeId)}</a> },
          { label: "For", value: l.purpose },
          { label: "Signed by", value: `${p.nameOf(l.signerId)}, ` +
            p.roleOf(l.signerId) },
          { label: "Reference", value: l.reference },
        ]} />) },
      { id: "history", label: "History",
        render: () => <History items={historyOf(p, l)} /> },
    ]} />
  );
}
