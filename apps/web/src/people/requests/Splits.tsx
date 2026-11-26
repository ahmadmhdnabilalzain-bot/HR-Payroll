import { useState } from "react";
import type { Approval } from "../../demo/data/types";
import { hrefOf } from "../../demo/route";
import b from "../../ui/button.module.css";
import { Money } from "../../ui/Money";
import {
  ApprovalForm,
  FilterList,
  KeyValues,
  RecordTabs,
} from "../../ui/templates";
import { History, type HistoryItem } from "../papers/History";
import { NotFound } from "../papers/Outside";
import { Stack, Status } from "../papers/Status";
import s from "./requests.module.css";
import { useRequests, type Requests } from "./useRequests";
import { ROLE_WORD, type Tone } from "./words";

const LIST = hrefOf("people", "requests", "splits");

type Word = "waiting" | "signed" | "declined";
const WORDS: Record<Word, [string, Tone]> = {
  waiting: ["Waiting for sign-off", "warn"],
  signed: ["Signed off", "ok"], declined: ["Declined", "quiet"],
};

const wordOf = (p: Requests, a: Approval): Word => {
  const v = p.state.decided[a.id];
  return v === undefined ? "waiting" : v === "approve" ? "signed"
    : "declined";
};

/** Who could be the second checker: senior, and not already on it. */
function candidates(p: Requests, a: Approval) {
  return p.data.people.people().filter((x) => x.status !== "left" &&
    x.grade >= 6 && x.id !== a.makerId && x.id !== a.checkerId &&
    x.id !== a.employeeId).sort((m, n) => n.grade - m.grade ||
    m.name.en.localeCompare(n.name.en)).slice(0, 6);
}

/** H11: send a decided approval back to waiting, or add a second checker. */
export function Splits() {
  const p = useRequests();
  const rows = p.data.approvalsInbox();
  return (
    <FilterList title="Approval splits and resets"
      lede={"Send a signed-off item back to waiting, or name a second " +
        "checker for one that is still waiting. Each change names who, " +
        "their role and the date, and can be undone."}
      rows={rows} rowKey={(a) => a.id}
      searchText={(a) => a.title[p.lang]}
      rowHref={(a) => hrefOf("people", "requests", "splits", a.id)}
      segments={[
        { id: "all", label: "All", match: () => true },
        { id: "waiting", label: "Waiting",
          match: (a) => wordOf(p, a) === "waiting" },
        { id: "changed", label: "Reset or split", match: (a) =>
          p.state.apprResets[a.id] !== undefined ||
          p.state.apprSplits[a.id] !== undefined },
      ]}
      columns={[
        { key: "t", label: "Item", render: (a) => (
          <Stack main={a.title[p.lang]} sub={a.employeeId === null
            ? "Company" : p.nameOf(a.employeeId)} />) },
        { key: "a", label: "Amount", end: true, render: (a) =>
          a.amountFils === null ? "" : (
            <Money value={a.amountFils} size="sm" />) },
        { key: "c", label: "Checker", render: (a) => {
          const sp = p.state.apprSplits[a.id];
          return sp?.secondId == null ? p.nameOf(a.checkerId)
            : `${p.nameOf(a.checkerId)} and ${p.nameOf(sp.secondId)}`;
        } },
        { key: "s", label: "Status", render: (a) => {
          const [word, tone] = WORDS[wordOf(p, a)];
          return <Status word={word} tone={tone} />;
        } },
      ]}
      empty="No items to split or reset." />
  );
}

function historyOf(p: Requests, a: Approval): HistoryItem[] {
  const out: HistoryItem[] = [{ text: `Sent by ${p.nameOf(a.makerId)}`,
    when: p.when(a.requestedOn), tone: "info" }];
  const sp = p.state.apprSplits[a.id];
  if (sp?.secondId != null) {
    out.push({ text: `Second checker named: ${p.nameOf(sp.secondId)}. ` +
      `By ${p.nameOf(sp.by)}, ${ROLE_WORD[sp.role]}` +
      (sp.reason === "" ? "" : `. Why: ${sp.reason}`),
    when: p.when(sp.on), tone: "info" });
  }
  const rs = p.state.apprResets[a.id];
  if (rs !== undefined) {
    out.push({ text: `Sent back to waiting by ${p.nameOf(rs.by)}, ` +
      `${ROLE_WORD[rs.role]}` + (rs.reason === "" ? ""
        : `. Why: ${rs.reason}`), when: p.when(rs.on), tone: "warn" });
  }
  return out;
}

export function SplitRecord(props: { id: string }) {
  const p = useRequests();
  const [asking, setAsking] = useState<"split" | "reset" | null>(null);
  const a = p.data.approvalsInbox().find((x) => x.id === props.id);
  if (a === undefined) {
    return <NotFound what="item" back="Splits and resets" href={LIST} />;
  }
  const word = wordOf(p, a);
  const verdict = p.state.decided[a.id];
  const split = p.state.apprSplits[a.id];
  const stamp = (reason: string, secondId: string | null) => ({
    by: p.me, role: p.state.role, on: p.data.requests.asOf, reason,
    secondId });
  const people = candidates(p, a);
  return (
    <>
      <RecordTabs title={a.title[p.lang]} lede={a.employeeId === null
        ? "Company" : p.nameOf(a.employeeId)}
      back={{ label: "Splits and resets", href: LIST }}
      stats={[{ label: "Status", value: WORDS[word][0] },
        { label: "Sent", value: p.when(a.requestedOn) },
        { label: "Checker", value: split?.secondId == null
          ? p.nameOf(a.checkerId) : `${p.nameOf(a.checkerId)} and ` +
            p.nameOf(split.secondId) }]}
      actions={word !== "waiting" ? (
        <button type="button" className={`${b.btn} ${b.primary}`}
          onClick={() => setAsking("reset")}>Send back to waiting</button>
      ) : split === undefined ? (
        <button type="button" className={`${b.btn} ${b.primary}`}
          onClick={() => setAsking("split")}>Add a second checker</button>
      ) : (
        <button type="button" className={`${b.btn} ${b.secondary}`}
          onClick={() => {
            p.dispatch({ type: "appr-split-undo", id: a.id });
            p.toast.show("Second checker removed.");
          }}>Remove the second checker</button>
      )}
      tabs={[
        { id: "item", label: "Item", render: () => (
          <div className={s.block}>
            <KeyValues items={[
              { label: "Prepared by", value: p.nameOf(a.makerId) },
              { label: "Checker", value: p.nameOf(a.checkerId) },
              ...(a.amountFils === null ? [] : [{ label: "Amount",
                value: <Money value={a.amountFils} /> }]),
            ]} />
            <p className={s.small}>
              A reset clears the sign-off so the item waits again, here
              and on Home. A second checker is named on the record; the
              checker and the maker stay different people.</p>
          </div>) },
        { id: "history", label: "History",
          render: () => <History items={historyOf(p, a)} /> },
      ]} />
      <ApprovalForm key={`${asking ?? "none"}-${String(p.state.nextReq)}`}
        open={asking === "reset"}
        title="Send back to waiting" maker={p.nameOf(p.me)}
        checker={p.nameOf(a.checkerId)} submitLabel="Send back"
        onClose={() => setAsking(null)}
        fields={[{ key: "reason", label: "Why", kind: "textarea",
          required: true, help: "Shown on the record." }]}
        onSubmit={(v) => {
          const old = verdict;
          p.dispatch({ type: "undecide", id: a.id });
          p.dispatch({ type: "appr-reset", id: a.id,
            stamp: stamp(v["reason"] ?? "", null) });
          p.toast.show("Sent back to waiting.", () => {
            p.dispatch({ type: "appr-reset-undo", id: a.id });
            if (old !== undefined) {
              p.dispatch({ type: "decide", id: a.id, verdict: old });
            }
          });
          return null;
        }} />
      <ApprovalForm key={`s-${asking ?? "none"}`} open={asking === "split"}
        title="Add a second checker" maker={p.nameOf(p.me)}
        checker={p.nameOf(a.checkerId)} submitLabel="Add the checker"
        onClose={() => setAsking(null)}
        fields={[
          { key: "second", label: "Second checker", kind: "select",
            required: true, options: people.map((x) => ({ value: x.id,
              label: `${x.name[p.lang]}, ${x.role[p.lang]}` })),
            initial: people[0]?.id ?? "" },
          { key: "reason", label: "Why", kind: "textarea" },
        ]}
        onSubmit={(v) => {
          p.dispatch({ type: "appr-split", id: a.id,
            stamp: stamp(v["reason"] ?? "", v["second"] ?? null) });
          p.toast.show("Second checker added.", () =>
            p.dispatch({ type: "appr-split-undo", id: a.id }));
          return null;
        }} />
    </>
  );
}
