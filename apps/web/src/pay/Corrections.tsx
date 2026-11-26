import { useState } from "react";
import { Explainable } from "../components/explain";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
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
import { dayMonth, filsOfInput, requestsOf, requestState } from "./derive";
import { usePay } from "./load";
import {
  NotFound,
  RequestPanel,
  RequestRow,
  RequestStatus,
  Status,
  useMakerChecker,
} from "./parts";
import type { PayRequest } from "./pay-state";
import s from "./pay.module.css";
import type { CorrectionView } from "./types";

const LIST = hrefOf("pay-run", "corrections");

type Row = { key: string; name: string; month: string;
  cor: CorrectionView | null; req: PayRequest | null };

/** R20: corrections to months already paid, owed in the next run. */
export function Corrections() {
  const { data, state, dispatch } = useDemo();
  const pay = usePay();
  const toast = useToast();
  const mc = useMakerChecker();
  const [open, setOpen] = useState(false);
  const months = pay.runs.filter((r) => r.paid).map((r) => r.label);
  const reqs = requestsOf(state, ["correction"]).filter((r) =>
    requestState(state, r) !== "withdrawn");
  const rows: Row[] = [
    ...reqs.map((r) => ({ key: r.id, cor: null, req: r,
      month: r.month ?? "", name: data.employee(r.employeeId).name.en })),
    ...pay.corrections.map((c) => ({ key: c.id, name: c.name,
      month: c.month, cor: c, req: null })),
  ];
  const submit = (v: FormValues): string | null => {
    const who = pay.people.find((p) => p.id === v["person"]);
    const amount = filsOfInput(v["amount"] ?? "");
    const reason = (v["reason"] ?? "").trim();
    if (who === undefined) return "Choose the person.";
    if (amount === null || amount <= 0n) {
      return "Enter the amount owed in dirhams, for example 250.";
    }
    if (reason === "") return "Say what was wrong, in a sentence.";
    dispatch({ type: "pay-request", draft: { kind: "correction",
      employeeId: who.id, amount, months: null,
      month: v["month"] ?? months.at(-1) ?? "", effective: null, reason,
      requestedOn: mc.today, makerId: mc.makerId,
      checkerId: mc.checkerId } });
    const id = `pay-new-${state.nextPay}`;
    toast.show(`Sent to ${data.employee(mc.checkerId).name.en} to decide`,
      () => dispatch({ type: "pay-withdraw", id }));
    return null;
  };
  return (
    <>
      <FilterList title="Pay corrections"
        lede={"Mistakes in months already paid. Each month is worked out " +
          "again with the record put right; the difference is paid in " +
          `the ${pay.nextRun} run.`}
        rows={rows} rowKey={(r) => r.key}
        searchText={(r) => `${r.name} ${r.month}`}
        rowHref={(r) => hrefOf("pay-run", "corrections", r.key)}
        rowActions={(r) => <RequestRow r={r.req} what="Correction" />}
        segments={[
          { id: "all", label: "All", match: () => true },
          { id: "due", label: `To pay in ${pay.nextRun}`, match: (r) =>
            r.cor !== null },
          { id: "wait", label: "Waiting", match: (r) => r.req !== null &&
            requestState(state, r.req) === "waiting" },
        ]}
        columns={[
          { key: "who", label: "Person", render: (r) => r.name },
          { key: "m", label: "Month", render: (r) => r.month },
          { key: "amt", label: "Owed", end: true, render: (r) =>
            <Money value={r.cor?.amount ?? r.req!.amount} size="sm" /> },
          { key: "st", label: "Status", render: (r) => r.req !== null
            ? <RequestStatus r={r.req} />
            : <Status tone="neutral">{`Pays in ${r.cor!.payIn}`}</Status> },
        ]}
        empty="No corrections match. Clear the search to see all."
        actions={(
          <button type="button" className={`${b.btn} ${b.primary}`}
            onClick={() => setOpen(true)}>Record a correction</button>
        )} />
      {open && (
        <ApprovalForm open title="Record a correction" maker={mc.maker}
          checker={mc.checker} submitLabel="Send for a decision"
          onClose={() => setOpen(false)} onSubmit={submit}
          fields={[
            { key: "person", label: "Person", kind: "select",
              required: true, initial: pay.people[0]?.id ?? "",
              options: pay.people.map((p) => ({ value: p.id,
                label: p.name })) },
            { key: "month", label: "Month paid", kind: "select",
              initial: months.at(-1) ?? "", options: months.map((m) =>
                ({ value: m, label: m })) },
            { key: "amount", label: "Owed to the person (AED)",
              kind: "text", required: true,
              help: "The difference after the month is worked out again" },
            { key: "reason", label: "What was wrong", kind: "textarea",
              required: true },
          ]} />
      )}
    </>
  );
}

export function CorrectionRecord(p: { id: string }) {
  const { state } = useDemo();
  const pay = usePay();
  const cor = pay.corrections.find((c) => c.id === p.id);
  if (cor !== undefined) return <CorrectionPage c={cor} />;
  const req = requestsOf(state, ["correction"]).find((r) => r.id === p.id);
  if (req !== undefined) return <RequestPage r={req} />;
  return <NotFound what="correction" back={{ label: "Pay corrections",
    href: LIST }} />;
}

function CorrectionPage(p: { c: CorrectionView }) {
  const c = p.c;
  return (
    <RecordTabs title={c.name} lede={`Correction to ${c.month}`}
      back={{ label: "Pay corrections", href: LIST }}
      actions={(
        <a className={`${b.btn} ${b.quiet}`}
          href={hrefOf("people", c.employeeId)}>Open profile</a>
      )}
      stats={[
        { label: "Owed", value: (
          <Explainable explanation={c.explanation}>
            <Money value={c.amount} size="lg" />
          </Explainable>) },
        { label: "Paid then", value: <Money value={c.paidNet} size="lg" /> },
        { label: "Should have been",
          value: <Money value={c.correctNet} size="lg" /> },
      ]}
      tabs={[{ id: "details", label: "Details", render: () => (
        <div className={s.stack}>
          <KeyValues items={[
            { label: "What was wrong", value: c.reason },
            { label: "To pay in", value: `The ${c.payIn} 2026 pay run` },
          ]} />
          <p className={s.note}>Net pay for the month is worked out again
            by the same engine; nothing is typed by hand.</p>
        </div>
      ) }]} />
  );
}

function RequestPage(p: { r: PayRequest }) {
  const { lang } = useLocale();
  const { data } = useDemo();
  const pay = usePay();
  const r = p.r;
  return (
    <RecordTabs title={data.employee(r.employeeId).name.en}
      lede={`Correction to ${r.month ?? ""}, sent ` +
        dayMonth(r.requestedOn, lang)}
      back={{ label: "Pay corrections", href: LIST }}
      stats={[
        { label: "Owed", value: <Money value={r.amount} size="lg" /> },
        { label: "To pay in", value: pay.nextRun },
      ]}
      tabs={[
        { id: "decision", label: "Decision", render: () => (
          <RequestPanel r={r} what="Correction" />) },
        { id: "details", label: "Details", render: () => (
          <KeyValues items={[
            { label: "Status", value: <RequestStatus r={r} /> },
            { label: "What was wrong", value: r.reason },
          ]} />) },
      ]} />
  );
}
