import { useState } from "react";
import { fils, type Fils } from "@payroll/engine";
import type { Claim } from "../../demo/more-state";
import { useDemo } from "../../demo/state";
import { personFor } from "../../demo/time-off";
import { parseAmountInput } from "../../i18n/amount-input";
import { Status, type Tone } from "../../people/team/common";
import s from "../../people/team/team.module.css";
import { dayText } from "../../people/words";
import b from "../../ui/button.module.css";
import { Money } from "../../ui/Money";
import { useToast } from "../../ui/Toast";
import { ApprovalForm, FilterList } from "../../ui/templates";
import { fill, X } from "./words";

const W = X.claim;

type Now = "waiting" | "agreed" | "declined";
const TONE: Record<Now, Tone> = { waiting: "warn", agreed: "ok",
  declined: "plain" };

interface Row {
  id: string;
  title: string;
  date: string;
  amount: Fils;
  now: Now;
  checkerId: string | null;
  claim: Claim | null;
}

/**
 * E08, My expenses: the claims the viewer made, new ones sent to the
 * line manager (up to the limit) or the General manager. A claim is
 * one more approval in the shared inbox, so the decider sees it on
 * Home and the decision reads back here.
 */
export function MyExpenses() {
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const me = personFor(data, state.role);
  const myName = data.people.person(me)?.name.en ?? "";
  const nameOf = (id: string): string => data.people.person(id)?.name.en
    ?? id;
  const nowOf = (id: string): Now => {
    const v = state.decided[id];
    return v === undefined ? "waiting" : v === "approve" ? "agreed"
      : "declined";
  };
  const rows: Row[] = [
    ...state.claims.filter((c) => c.employeeId === me && !c.withdrawn)
      .map((c): Row => ({ id: c.id, title: c.note === "" ? c.kind
        : `${c.kind}, ${c.note}`, date: c.date, amount: c.amount,
      now: nowOf(c.approvalId), checkerId: c.checkerId, claim: c })),
    ...data.approvalsInbox().filter((a) => a.kind === "expense" &&
      a.employeeId === me).map((a): Row => ({ id: a.id,
      title: a.title.en, date: a.requestedOn, amount: a.amountFils ??
        fils(0n), now: nowOf(a.id), checkerId: a.checkerId, claim: null })),
  ];
  const takeBack = (c: Claim): void => {
    dispatch({ type: "more-claim-withdraw", id: c.id });
    toast.show(W.taken, () => dispatch({ type: "more-claim-restore",
      id: c.id }));
  };
  const toDecide = state.claims.filter((c) => !c.withdrawn &&
    c.checkerId === me && c.employeeId !== me);
  const decide = (c: Claim, v: "approve" | "decline"): void => {
    dispatch({ type: "decide", id: c.approvalId, verdict: v });
    toast.show(`${v === "approve" ? W.agreed : W.declined}: ${
      nameOf(c.employeeId)}, ${c.kind}`, () => dispatch({ type: "undecide",
      id: c.approvalId }));
  };
  const word = (r: Row): string => r.now === "waiting"
    ? fill(W.waiting, { name: nameOf(r.checkerId ?? "") })
    : r.now === "agreed" ? W.agreed : W.declined;
  return (
    <>
      <FilterList title={W.title} lede={W.lede} rows={rows}
        rowKey={(r) => r.id} searchText={(r) => r.title}
        segments={[
          { id: "all", label: W.all, match: () => true },
          { id: "open", label: W.open, match: (r) => r.now === "waiting" },
          { id: "closed", label: W.closed, match: (r) =>
            r.now !== "waiting" },
        ]}
        actions={(
          <button type="button" className={`${b.btn} ${b.primary} ${s.tall}`}
            onClick={() => setOpen(true)}>{W.add}</button>)}
        columns={[
          { key: "c", label: W.title, render: (r) => (
            <span className={s.name}>
              <span>{r.title}</span>
              <span className={s.sub}>{dayText(r.date, "en")}</span>
            </span>) },
          { key: "a", label: W.amount, end: true, render: (r) =>
            <Money value={r.amount} size="sm" /> },
          { key: "s", label: W.status, render: (r) => (
            <Status tone={TONE[r.now]}>{word(r)}</Status>) },
          { key: "x", label: "", end: true, render: (r) =>
            r.claim !== null && r.now === "waiting" ? (
              <button type="button"
                className={`${b.btn} ${b.quiet} ${s.tall}`}
                onClick={() => takeBack(r.claim!)}>{W.takeBack}</button>)
              : null },
        ]}
        empty={W.empty} />
      {toDecide.length > 0 && (
        <section className={s.after} aria-labelledby="claims-team">
          <h2 id="claims-team" className={s.sectionTitle}>{W.teamTitle}</h2>
          <ul className={s.group}>
            {toDecide.map((c) => (
              <li key={c.id}><span className={s.line}>
                <span className={s.lineMain}>
                  <span>{nameOf(c.employeeId)}, {c.kind}</span>
                  <small>{dayText(c.date, "en")}{c.note === "" ? ""
                    : `, ${c.note}`}</small>
                  <Money value={c.amount} size="sm" />
                </span>
                {state.decided[c.approvalId] === undefined ? (
                  <span className={s.btnRow}>
                    <button type="button"
                      className={`${b.btn} ${b.secondary} ${s.tall}`}
                      aria-label={`${W.agree}: ${nameOf(c.employeeId)}`}
                      onClick={() => decide(c, "approve")}>{W.agree}
                    </button>
                    <button type="button"
                      className={`${b.btn} ${b.quiet} ${s.tall}`}
                      aria-label={`${W.decline}: ${nameOf(c.employeeId)}`}
                      onClick={() => decide(c, "decline")}>{W.decline}
                    </button>
                  </span>) : (
                  <span>
                    <Status tone={state.decided[c.approvalId] === "approve"
                      ? "ok" : "plain"}>{state.decided[c.approvalId] ===
                      "approve" ? W.agreed : W.declined}</Status>
                    <button type="button"
                      className={`${b.btn} ${b.quiet} ${s.tall}`}
                      onClick={() => dispatch({ type: "undecide",
                        id: c.approvalId })}>{W.undo}</button>
                  </span>)}
              </span></li>))}
          </ul>
        </section>)}
      {open && (
        <ApprovalForm open title={W.form} maker={myName}
          checker={nameOf(data.more.claimRoute(me, 0n).checkerId)}
          submitLabel={W.submit} onClose={() => setOpen(false)}
          fields={[
            { key: "kind", label: W.kind, kind: "select", required: true,
              initial: "", options: [{ value: "", label: W.chooseKind },
                ...data.more.expenseKinds.map((k) => ({ value: k,
                  label: k }))] },
            { key: "date", label: W.date, kind: "date", required: true,
              initial: data.people.asOf },
            { key: "amount", label: W.amount, kind: "text", required: true,
              help: data.more.claimLimitText },
            { key: "note", label: W.note, kind: "textarea",
              help: W.receiptHelp },
          ]}
          onSubmit={(v) => {
            let amount: bigint;
            try { amount = parseAmountInput(v["amount"] ?? ""); } catch {
              return W.badAmount;
            }
            const input = { kind: v["kind"] ?? "", date: v["date"] ?? "",
              amount, note: (v["note"] ?? "").trim() };
            const err = data.more.checkClaim(input);
            if (err !== null) return err;
            const route = data.more.claimRoute(me, amount);
            dispatch({ type: "more-claim", draft: { employeeId: me,
              kind: input.kind, date: input.date, amount: fils(amount),
              note: input.note, checkerId: route.checkerId,
              requestedOn: data.people.asOf } });
            toast.show(fill(W.sent, { name: nameOf(route.checkerId) }));
            return null;
          }} />)}
    </>
  );
}
