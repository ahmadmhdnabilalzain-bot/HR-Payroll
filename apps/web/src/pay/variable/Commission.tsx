import type { ReactNode } from "react";
import { Explainable } from "../../components/explain";
import {
  commissionStatus,
  type CommissionStatus,
} from "../../demo/commission-state";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { formatDate } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import b from "../../ui/button.module.css";
import { Money } from "../../ui/Money";
import { useToast } from "../../ui/Toast";
import {
  FilterList,
  RecordTabs,
  StatusPill,
  type StatusTone,
} from "../../ui/templates";
import { NotFound, useMakerChecker } from "../parts";
import { useVariableSource } from "./load";
import type { CommissionStatement } from "./source";
import { StatementLines } from "./Statement";
import s from "../pay.module.css";

const LIST = hrefOf("pay-run", "commission");

export const COMMISSION_WORD: Record<CommissionStatus, string> = {
  open: "Not prepared", waiting: "Waiting for sign-off",
  signed: "Signed off", declined: "Declined",
};
const TONE: Record<CommissionStatus, StatusTone> = {
  open: "neutral", waiting: "warn", signed: "done", declined: "neutral",
};

/** P66: this month's statements; HR prepares, the GM signs off. */
export function CommissionStatements() {
  const v = useVariableSource();
  const { data, state, dispatch } = useDemo();
  const { lang } = useLocale();
  const toast = useToast();
  const mc = useMakerChecker();
  const plan = v.commission;
  const month = state.commissionMonths[plan.month];
  const st = commissionStatus(month);
  const stamp = { by: mc.makerId, role: state.role, on: mc.today };
  const t = v.commissionTotals;
  const prepare = (): void => {
    dispatch({ type: "commission-prepare", month: plan.month,
      prepared: stamp, totals: { count: t.count, commission: t.commission,
        net: t.net } });
    toast.show(`Prepared the ${plan.monthText} statements. ` +
      `${mc.checker} can now sign them off`, () => dispatch({
      type: "commission-unprepare", month: plan.month }));
  };
  const decide = (verdict: "signed" | "declined"): void => {
    dispatch({ type: "commission-decide", month: plan.month,
      decision: { ...stamp, verdict } });
    toast.show(verdict === "signed" ? "Signed off. Each person sees " +
      "their own statement" : "Declined. HR can prepare them again",
    () => dispatch({ type: "commission-undecide", month: plan.month }));
  };
  const btn = (kind: "primary" | "secondary", label: string,
    onClick: () => void): ReactNode => (
    <button type="button" className={`${b.btn} ${b[kind]}`}
      onClick={onClick}>{label}</button>
  );
  const who = (id: string): string => data.employee(id).name.en;
  const action = state.role === "hr"
    ? (st === "open" || st === "declined"
      ? btn("primary", st === "open" ? "Prepare statements"
        : "Prepare again", prepare)
      : st === "waiting" ? btn("secondary", "Take back",
        () => dispatch({ type: "commission-unprepare",
          month: plan.month })) : null)
    : state.role === "gm"
      ? (st === "waiting" ? (
        <>{btn("primary", "Sign off", () => decide("signed"))}
          {btn("secondary", "Decline", () => decide("declined"))}</>)
        : st === "signed" || st === "declined"
          ? btn("secondary", "Take back the decision", () => dispatch({
            type: "commission-undecide", month: plan.month })) : null)
      : null;
  const line = month === undefined ? "HR has not prepared them yet."
    : `Prepared by ${who(month.prepared.by)} on ` +
      `${formatDate(month.prepared.on, lang)}` +
      (month.decision === null ? "." : `; ${month.decision.verdict ===
        "signed" ? "signed off" : "declined"} by ${who(month.decision.by)} ` +
        `on ${formatDate(month.decision.on, lang)}.`);
  return (
    <FilterList title="Sales commission"
      lede={`Statements for ${plan.monthText}. Each salesperson has a ` +
        "monthly target; commission is paid by tier, less any clawback " +
        `on a cancelled sale, and joins ${plan.paidWith}. HR prepares ` +
        "the statements; the General manager signs them off."}
      meta={<span><StatusPill tone={TONE[st]}>{COMMISSION_WORD[st]}
      </StatusPill> <span className={s.muted}>{line}</span></span>}
      rows={plan.statements} rowKey={(x) => x.employeeId}
      searchText={(x) => `${x.name} ${x.jobText}`}
      rowHref={(x) => hrefOf("pay-run", "commission", x.employeeId)}
      avatar={(x) => ({ id: x.employeeId, name: x.name })}
      columns={[
        { key: "who", label: "Person", render: (x) => x.name },
        { key: "t", label: "Target", end: true, render: (x) =>
          <Money value={x.target} size="sm" /> },
        { key: "a", label: "Attainment", end: true, render: (x) =>
          <Explainable explanation={v.attainment(x)}>
            <span className="tabular">{x.display.attainment}</span>
          </Explainable> },
        { key: "c", label: "Commission", end: true, render: (x) =>
          <Explainable explanation={v.commissionOf(x)}>
            <Money value={x.commission} size="sm" /></Explainable> },
        { key: "cb", label: "Clawback", end: true, render: (x) =>
          x.clawback === 0n ? <span className={s.muted}>None</span>
            : <Money value={x.clawback} size="sm" signed /> },
        { key: "p", label: "To pay", end: true, render: (x) =>
          <Explainable explanation={v.payableOf(x)}>
            <Money value={x.net} size="sm" /></Explainable> },
      ]}
      empty="No one is on the commission plan." actions={action} />
  );
}

export function CommissionRecord(p: { id: string }) {
  const v = useVariableSource();
  const st = v.commission.statements.find((x) => x.employeeId === p.id);
  if (st === undefined) {
    return <NotFound what="statement" back={{ label: "Sales commission",
      href: LIST }} />;
  }
  return <Record st={st} />;
}

function Record(p: { st: CommissionStatement }) {
  const v = useVariableSource();
  const { state } = useDemo();
  const status = commissionStatus(state.commissionMonths[v.commission.month]);
  const x = p.st;
  return (
    <RecordTabs title={`${x.name}, ${v.commission.monthText}`}
      lede={`${x.jobText}, ${x.departmentText}`}
      back={{ label: "Sales commission", href: LIST }}
      avatar={{ id: x.employeeId, name: x.name }}
      status={{ word: COMMISSION_WORD[status], tone: TONE[status] }}
      stats={[
        { label: "Commission to pay", value: (
          <Explainable explanation={v.payableOf(x)}>
            <Money value={x.net} size="lg" /></Explainable>) },
        { label: "Attainment", value: (
          <Explainable explanation={v.attainment(x)}>
            <span className="tabular">{x.display.attainment}</span>
          </Explainable>) },
      ]}
      tabs={[
        { id: "statement", label: "Statement", render: () =>
          <StatementLines v={v} st={x} label="Statement" /> },
        { id: "plan", label: "The plan", render: () => (
          <>
            <p className={s.muted}>{v.commission.basis}</p>
            <p className={s.muted}>{v.commission.notComputed}</p>
          </>
        ) },
      ]} />
  );
}
