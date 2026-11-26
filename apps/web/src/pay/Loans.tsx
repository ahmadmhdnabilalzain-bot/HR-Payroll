import type { Fils } from "@payroll/engine";
import { useState } from "react";
import { Explainable } from "../components/explain";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { useRunDetail } from "../demo/useRunDetail";
import { formatDate } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import b from "../ui/button.module.css";
import { Money } from "../ui/Money";
import { useToast } from "../ui/Toast";
import {
  ApprovalForm,
  FilterList,
  KeyValues,
  RecordTabs,
  type FormValues,
} from "../ui/templates";
import { filsOfInput, requestsOf, requestState } from "./derive";
import { usePay } from "./load";
import {
  NotFound,
  RequestPanel,
  RequestStatus,
  Status,
  useMakerChecker,
  type Tone,
} from "./parts";
import type { PayRequest } from "./pay-state";
import s from "./pay.module.css";
import type { LoanStatus, LoanView } from "./types";

const LIST = hrefOf("pay-run", "loans");
const KIND = { loan: "Loan", advance: "Salary advance" } as const;
const STATUS: Record<LoanStatus, [string, Tone]> = {
  active: ["Repaying", "neutral"], closed: ["Repaid", "done"],
  starts: ["Starts in November", "neutral"],
};
const FIRST_MONTHS = ["November 2026", "December 2026"] as const;
const MAX_MONTHS = { loan: 24, advance: 3 } as const;

type Row = { key: string; loan: LoanView | null; req: PayRequest | null;
  name: string; kind: "loan" | "advance"; ref: string; balance: Fils;
  instalment: Fils | null };

function rowsOf(loans: LoanView[], reqs: PayRequest[]): Row[] {
  return [...reqs.map((r): Row => ({ key: r.id, loan: null, req: r,
    name: "", kind: r.kind === "advance" ? "advance" : "loan",
    ref: "New request", balance: r.amount, instalment: null })),
  ...loans.map((l): Row => ({ key: l.ref, loan: l, req: null,
    name: l.name, kind: l.kind, ref: l.ref, balance: l.balance,
    instalment: l.instalment }))];
}

/** R30: every loan and advance, with new ones sent for a decision. */
export function Loans() {
  const { data, state, dispatch } = useDemo();
  const pay = usePay();
  const toast = useToast();
  const mc = useMakerChecker();
  const [open, setOpen] = useState(false);
  const reqs = requestsOf(state, ["loan", "advance"]).filter((r) =>
    requestState(state, r) !== "withdrawn");
  const rows = rowsOf(pay.loans, reqs).map((r) => r.req === null ? r
    : { ...r, name: data.employee(r.req.employeeId).name.en });
  const submit = (v: FormValues): string | null => {
    const kind = v["kind"] === "advance" ? "advance" : "loan";
    const amount = filsOfInput(v["amount"] ?? "");
    const months = Number(v["months"]);
    const who = pay.people.find((p) => p.id === v["person"]);
    if (who === undefined) return "Choose the person.";
    if (amount === null || amount <= 0n) {
      return "Enter the amount in dirhams, for example 5000 or 5000.50.";
    }
    if (!Number.isInteger(months) || months < 1 ||
      months > MAX_MONTHS[kind]) {
      return `A ${kind === "loan" ? "loan" : "salary advance"} is ` +
        `repaid in 1 to ${MAX_MONTHS[kind]} months.`;
    }
    const busy = pay.loans.find((l) => l.employeeId === who.id &&
      l.status !== "closed");
    if (busy !== undefined) {
      return `${who.name} is already repaying ${busy.ref}. A new one ` +
        "can be given once it is repaid.";
    }
    dispatch({ type: "pay-request", draft: { kind, employeeId: who.id,
      amount, months, month: v["first"] ?? FIRST_MONTHS[0],
      effective: null, reason: (v["reason"] ?? "").trim(),
      requestedOn: mc.today, makerId: mc.makerId,
      checkerId: mc.checkerId } });
    const id = `pay-new-${state.nextPay}`;
    toast.show(`Sent to ${data.employee(mc.checkerId).name.en} to decide`,
      () => dispatch({ type: "pay-withdraw", id }));
    return null;
  };
  return (
    <>
      <FilterList title="Loans and advances"
        lede={"Balances come from the payslips: each instalment is taken " +
          "in the pay run, within the deduction limits."}
        rows={rows} rowKey={(r) => r.key}
        searchText={(r) => `${r.name} ${r.ref} ${KIND[r.kind]}`}
        rowHref={(r) => hrefOf("pay-run", "loans", r.key)}
        segments={[
          { id: "all", label: "All", match: () => true },
          { id: "now", label: "Repaying", match: (r) =>
            r.loan?.status === "active" },
          { id: "next", label: "Starting", match: (r) =>
            r.req !== null || r.loan?.status === "starts" },
          { id: "done", label: "Repaid", match: (r) =>
            r.loan?.status === "closed" },
        ]}
        columns={[
          { key: "who", label: "Person", render: (r) => r.name },
          { key: "kind", label: "Kind", render: (r) => (
            <span>{KIND[r.kind]} <span className={s.muted}>{r.ref}</span>
            </span>) },
          { key: "inst", label: "Instalment", end: true, render: (r) =>
            r.instalment === null ? <span className={s.muted}>
              {`${r.req?.months ?? 0} months`}</span>
              : <Money value={r.instalment} size="sm" /> },
          { key: "bal", label: "Balance", end: true, render: (r) =>
            <Money value={r.balance} size="sm" /> },
          { key: "st", label: "Status", render: (r) => r.req !== null
            ? <RequestStatus r={r.req} />
            : <Status tone={STATUS[r.loan!.status][1]}>
              {STATUS[r.loan!.status][0]}</Status> },
        ]}
        empty="No loans or advances match. Clear the search to see all."
        actions={(
          <button type="button" className={`${b.btn} ${b.primary}`}
            onClick={() => setOpen(true)}>Give a loan or advance</button>
        )} />
      {open && (
        <ApprovalForm open title="Give a loan or advance"
          maker={mc.maker} checker={mc.checker}
          submitLabel="Send for a decision" onClose={() => setOpen(false)}
          onSubmit={submit}
          fields={[
            { key: "person", label: "Person", kind: "select",
              required: true, initial: pay.people[0]?.id ?? "",
              options: pay.people.map((p) => ({ value: p.id,
                label: p.name })) },
            { key: "kind", label: "Kind", kind: "select", initial: "loan",
              options: [{ value: "loan", label: "Loan" },
                { value: "advance", label: "Salary advance" }] },
            { key: "amount", label: "Amount (AED)", kind: "text",
              required: true, help: "For example 5000 or 5000.50" },
            { key: "months", label: "Months to repay", kind: "number",
              required: true, initial: "3",
              help: "Up to 24 for a loan, 3 for an advance" },
            { key: "first", label: "First deduction", kind: "select",
              initial: FIRST_MONTHS[0], options: FIRST_MONTHS.map((m) =>
                ({ value: m, label: m })) },
            { key: "reason", label: "Reason", kind: "textarea",
              help: "Optional. The person sees it on the request." },
          ]} />
      )}
    </>
  );
}

/** One loan, advance or new request. */
export function LoanRecord(p: { id: string }) {
  const { state } = useDemo();
  const pay = usePay();
  const loan = pay.loans.find((l) => l.ref === p.id);
  if (loan !== undefined) return <LoanPage loan={loan} />;
  const req = requestsOf(state, ["loan", "advance"]).find((r) =>
    r.id === p.id);
  if (req !== undefined) return <RequestPage r={req} />;
  return <NotFound what="loan" back={{ label: "Loans and advances",
    href: LIST }} />;
}

function LoanPage(p: { loan: LoanView }) {
  const l = p.loan;
  const detail = useRunDetail();
  const ex = l.explainId === null ? undefined : detail.explain[l.explainId];
  const [label, tone] = STATUS[l.status];
  return (
    <RecordTabs title={l.name} lede={`${KIND[l.kind]} ${l.ref}`}
      back={{ label: "Loans and advances", href: LIST }}
      actions={(
        <a className={`${b.btn} ${b.quiet}`}
          href={hrefOf("people", l.employeeId)}>Open profile</a>
      )}
      stats={[
        { label: "Balance", value: <Money value={l.balance} size="lg" /> },
        { label: "Monthly instalment",
          value: <Money value={l.instalment} size="lg" /> },
        { label: l.kind === "loan" ? "Borrowed" : "Advanced",
          value: <Money value={l.principal} size="lg" /> },
      ]}
      tabs={[
        { id: "deductions", label: "Deductions", render: () =>
          l.ledger.length === 0 ? (
            <p className={s.muted}>{`No deductions yet. The first is in ` +
              `${l.firstDeduction} 2026, in that month's pay run.`}</p>
          ) : (
            <ul className={s.list} aria-label="Deductions">
              {l.ledger.map((r) => (
                <li key={r.month} className={s.row}>
                  <span className={s.rowText}>
                    <span>{r.month}</span>
                    <small>Balance after: {" "}
                      <Money value={r.balance} size="sm" /></small>
                  </span>
                  <span className={s.rowEnd}>
                    {ex !== undefined && r.month.startsWith("October") ? (
                      <Explainable explanation={ex}>
                        <Money value={r.taken} size="sm" />
                      </Explainable>
                    ) : <Money value={r.taken} size="sm" />}
                  </span>
                </li>
              ))}
            </ul>
          ) },
        { id: "terms", label: "Terms", render: () => (
          <div className={s.stack}>
            <KeyValues items={[
              { label: "Status", value: <Status tone={tone}>{label}
              </Status> },
              { label: "Reference", value: l.ref },
              { label: "First deduction", value: `${l.firstDeduction} 2026` },
            ]} />
            <p className={s.note}>{l.note}</p>
          </div>
        ) },
      ]} />
  );
}

function RequestPage(p: { r: PayRequest }) {
  const { lang } = useLocale();
  const { data } = useDemo();
  const r = p.r;
  const what = r.kind === "advance" ? "Salary advance" : "Loan";
  return (
    <RecordTabs title={data.employee(r.employeeId).name.en}
      lede={`${what} request, sent ${formatDate(r.requestedOn, lang)}`}
      back={{ label: "Loans and advances", href: LIST }}
      stats={[
        { label: "Amount", value: <Money value={r.amount} size="lg" /> },
        { label: "Months to repay", value: String(r.months ?? 0) },
        { label: "First deduction", value: r.month ?? "" },
      ]}
      tabs={[
        { id: "decision", label: "Decision", render: () => (
          <RequestPanel r={r} what={`${what} request`} />) },
        { id: "details", label: "Details", render: () => (
          <div className={s.stack}>
            <KeyValues items={[
              { label: "Status", value: <RequestStatus r={r} /> },
              { label: "Reason", value: r.reason === "" ? "None given"
                : r.reason },
            ]} />
            <p className={s.note}>Each instalment is checked against the
              deduction limits in the pay run of its month, so the first
              one may be smaller.</p>
          </div>
        ) },
      ]} />
  );
}
