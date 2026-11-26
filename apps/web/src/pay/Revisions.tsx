import { useState } from "react";
import { ExplainLink } from "../components/explain";
import { hrefOf } from "../demo/route";
import type { PlanItem } from "../demo/planning-state";
import { useDemo } from "../demo/state";
import { useRunDetail } from "../demo/useRunDetail";
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
  RequestStatus,
  Status,
  useMakerChecker,
} from "./parts";
import type { PayRequest } from "./pay-state";
import s from "./pay.module.css";
import type { RevisionView } from "./types";

const LIST = hrefOf("pay-run", "revisions");

type Row = { key: string; name: string; rev: RevisionView | null;
  req: PayRequest | null; plan: PlanItem | null };

const DATE = /^2026-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** R21: basic salary revisions; a late one carries back pay. */
export function Revisions() {
  const { lang } = useLocale();
  const { data, state, dispatch } = useDemo();
  const pay = usePay();
  const toast = useToast();
  const mc = useMakerChecker();
  const [open, setOpen] = useState(false);
  const reqs = requestsOf(state, ["revision"]).filter((r) =>
    requestState(state, r) !== "withdrawn");
  const plans = state.planBatches.flatMap((x) => x.items);
  const rows: Row[] = [
    ...plans.map((i) => ({ key: `plan-${i.employeeId}`, rev: null,
      req: null, plan: i, name: i.name })),
    ...reqs.map((r) => ({ key: r.id, rev: null, req: r, plan: null,
      name: data.employee(r.employeeId).name.en })),
    ...pay.revisions.map((r) => ({ key: r.id, name: r.name, rev: r,
      req: null, plan: null })),
  ];
  const submit = (v: FormValues): string | null => {
    const who = pay.people.find((p) => p.id === v["person"]);
    const to = filsOfInput(v["basic"] ?? "");
    const eff = (v["effective"] ?? "").trim();
    if (who === undefined) return "Choose the person.";
    if (to === null || to <= 0n) {
      return "Enter the new monthly basic in dirhams, for example 9500.";
    }
    if (to === who.basic) {
      return `${who.name}'s basic is already that amount.`;
    }
    if (!DATE.test(eff)) return "Choose the date it takes effect in 2026.";
    dispatch({ type: "pay-request", draft: { kind: "revision",
      employeeId: who.id, amount: to, months: null, month: null,
      effective: eff, reason: (v["reason"] ?? "").trim(),
      requestedOn: mc.today, makerId: mc.makerId,
      checkerId: mc.checkerId } });
    const id = `pay-new-${state.nextPay}`;
    toast.show(`Sent to ${data.employee(mc.checkerId).name.en} to decide`,
      () => dispatch({ type: "pay-withdraw", id }));
    return null;
  };
  return (
    <>
      <FilterList title="Salary revisions"
        lede={"Changes to basic salary. When one is entered after its " +
          "date, the months already paid on the old basic are owed as " +
          "back pay in the next run."}
        rows={rows} rowKey={(r) => r.key} searchText={(r) => r.name}
        rowHref={(r) => hrefOf("pay-run", "revisions", r.key)}
        segments={[
          { id: "all", label: "All", match: () => true },
          { id: "back", label: "With back pay", match: (r) =>
            (r.rev?.arrears ?? 0n) > 0n },
          { id: "wait", label: "Waiting", match: (r) => r.req !== null &&
            requestState(state, r.req) === "waiting" },
        ]}
        columns={[
          { key: "who", label: "Person", render: (r) => r.name },
          { key: "eff", label: "From", render: (r) => r.plan !== null
            ? r.plan.effective : r.rev !== null
              ? r.rev.effective
              : dayMonth(r.req!.effective ?? "", lang) },
          { key: "to", label: "New basic", end: true, render: (r) =>
            <Money value={r.plan?.to ?? r.rev?.to ?? r.req!.amount}
              size="sm" /> },
          { key: "back", label: "Back pay", end: true, render: (r) =>
            r.rev === null || r.rev.arrears === 0n
              ? <span className={s.muted}>None</span>
              : <Money value={r.rev.arrears} size="sm" /> },
          { key: "st", label: "Status", render: (r) => r.plan !== null
            ? <Status tone="done">2027 plan, signed off</Status>
            : r.req !== null
              ? <RequestStatus r={r.req} /> : (
              <Status tone="done">{r.rev!.arrears > 0n
                ? `In the ${pay.thisRun} run` : "In pay"}</Status>) },
        ]}
        empty="No revisions match. Clear the search to see all."
        actions={(
          <button type="button" className={`${b.btn} ${b.primary}`}
            onClick={() => setOpen(true)}>Revise a salary</button>
        )} />
      {open && (
        <ApprovalForm open title="Revise a salary" maker={mc.maker}
          checker={mc.checker} submitLabel="Send for a decision"
          onClose={() => setOpen(false)} onSubmit={submit}
          fields={[
            { key: "person", label: "Person", kind: "select",
              required: true, initial: pay.people[0]?.id ?? "",
              options: pay.people.map((p) => ({ value: p.id,
                label: p.name })) },
            { key: "basic", label: "New monthly basic (AED)", kind: "text",
              required: true, help: "Basic only; allowances stay as they " +
                "are" },
            { key: "effective", label: "Takes effect", kind: "date",
              required: true, initial: "2026-11-01",
              help: "A date in a month already paid makes back pay" },
            { key: "reason", label: "Reason", kind: "textarea",
              help: "For example: annual review, promotion" },
          ]} />
      )}
    </>
  );
}

export function RevisionRecord(p: { id: string }) {
  const { state } = useDemo();
  const pay = usePay();
  const plan = state.planBatches.flatMap((x) => x.items).find((i) =>
    `plan-${i.employeeId}` === p.id);
  if (plan !== undefined) return <PlanRevisionPage i={plan} />;
  const rev = pay.revisions.find((r) => r.id === p.id);
  if (rev !== undefined) return <RevisionPage r={rev} />;
  const req = requestsOf(state, ["revision"]).find((r) => r.id === p.id);
  if (req !== undefined) return <RequestPage r={req} />;
  return <NotFound what="revision" back={{ label: "Salary revisions",
    href: LIST }} />;
}

/** A signed-off 2027 plan increase, now a salary revision. */
function PlanRevisionPage(p: { i: PlanItem }) {
  const i = p.i;
  return (
    <RecordTabs title={i.name} lede="From the 2027 compensation plan"
      back={{ label: "Salary revisions", href: LIST }}
      stats={[
        { label: "New basic", value: <Money value={i.to} size="lg" /> },
        { label: "Before", value: <Money value={i.from} size="lg" /> },
        { label: "Takes effect", value: i.effective },
      ]}
      tabs={[{ id: "details", label: "Details", render: () => (
        <KeyValues items={[
          { label: "Department", value: i.departmentText },
          { label: "Steps", value: String(i.steps) },
          { label: "Source", value: "Compensation planning, signed " +
            "off by the General manager" },
        ]} />) }]} />
  );
}

function RevisionPage(p: { r: RevisionView }) {
  const r = p.r;
  const detail = useRunDetail();
  const pay = usePay();
  return (
    <RecordTabs title={r.name} lede={r.reason}
      back={{ label: "Salary revisions", href: LIST }}
      actions={(
        <a className={`${b.btn} ${b.quiet}`}
          href={hrefOf("people", r.employeeId)}>Open profile</a>
      )}
      stats={[
        { label: "New basic", value: <Money value={r.to} size="lg" /> },
        { label: "Before", value: <Money value={r.from} size="lg" /> },
        { label: "Back pay", value: <Money value={r.arrears} size="lg" /> },
      ]}
      tabs={[{ id: "details", label: "Details", render: () => (
        <div className={s.stack}>
          <KeyValues items={[
            { label: "Takes effect", value: r.effective },
            { label: "Entered", value: r.entered },
            { label: "Back pay", value: r.arrears > 0n
              ? `Added to the ${pay.thisRun} run`
              : "None: entered before its date" },
          ]} />
          <p className={s.note}>{r.note}</p>
          {r.arrears > 0n && (
            <ExplainLink explanation={detail.explain[r.explainId]}
              className={s.inline}>{`How ${pay.thisRun} pay is worked out`}
            </ExplainLink>
          )}
        </div>
      ) }]} />
  );
}

function RequestPage(p: { r: PayRequest }) {
  const { lang } = useLocale();
  const { data } = useDemo();
  const pay = usePay();
  const r = p.r;
  const before = pay.people.find((x) => x.id === r.employeeId)?.basic;
  return (
    <RecordTabs title={data.employee(r.employeeId).name.en}
      lede={"Salary revision, sent " +
        dayMonth(r.requestedOn, lang)}
      back={{ label: "Salary revisions", href: LIST }}
      stats={[
        { label: "New basic", value: <Money value={r.amount} size="lg" /> },
        ...(before === undefined ? [] : [{ label: "Now",
          value: <Money value={before} size="lg" /> }]),
        { label: "Takes effect",
          value: dayMonth(r.effective ?? "", lang) },
      ]}
      tabs={[
        { id: "decision", label: "Decision", render: () => (
          <RequestPanel r={r} what="Salary revision" />) },
        { id: "details", label: "Details", render: () => (
          <KeyValues items={[
            { label: "Status", value: <RequestStatus r={r} /> },
            { label: "Reason", value: r.reason === "" ? "None given"
              : r.reason },
          ]} />) },
      ]} />
  );
}
