import { useState } from "react";
import { Explainable } from "../../components/explain";
import {
  bonusIdFor,
  bonusStatus,
  inLiveRun,
  type BonusRun,
} from "../../demo/bonus-state";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { formatDate } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import b from "../../ui/button.module.css";
import { Money } from "../../ui/Money";
import { useToast } from "../../ui/Toast";
import {
  ApprovalForm,
  FilterList,
  PageFoot,
  PageHead,
  RecordTabs,
  type FormValues,
} from "../../ui/templates";
import { NotFound, useMakerChecker } from "../parts";
import { BONUS_WORD, BonusState } from "./bonus-parts";
import { PayoutMeter } from "./Meters";
import { NameLink, VarList, VarRow, varStyles as vs } from "./rows";
import { useVariableSource } from "./load";
import s from "../pay.module.css";

const LIST = hrefOf("pay-run", "bonus");
const LEDE = "A bonus paid off-cycle, outside the monthly run. HR " +
  "prepares the run and the General manager signs it off.";

/** R13: bonus runs, newest first; HR prepares one with the form. */
export function BonusRuns() {
  const v = useVariableSource();
  const { state } = useDemo();
  const [open, setOpen] = useState(false);
  const runs = state.bonusRuns;
  const prepare = state.role === "hr" ? (
    <button type="button" className={`${b.btn} ${b.primary}`}
      onClick={() => setOpen(true)}>New bonus run</button>
  ) : null;
  if (runs.length === 0) {
    return (
      <>
        <div className={s.page}>
          <PageHead title="Bonus runs" lede={LEDE} />
          <div className={vs.empty}>
            <p>{state.role === "hr"
              ? `No bonus run yet. Prepare the ${v.bonus.label}.`
              : "No bonus run yet. HR prepares one for you to sign off."}
            </p>
            {prepare}
            <details className={vs.how}>
              <summary>How the bonus is worked out</summary>
              <p>{v.bonus.basis}</p>
            </details>
          </div>
          <PageFoot />
        </div>
        {open && <NewBonus onClose={() => setOpen(false)} />}
      </>
    );
  }
  return (
    <>
      <FilterList title="Bonus runs" lede={LEDE}
        rows={runs} rowKey={(r) => r.id} searchText={(r) => r.label}
        rowHref={(r) => hrefOf("pay-run", "bonus", r.id)}
        segments={[
          { id: "all", label: "All", match: () => true },
          { id: "draft", label: "Draft", match: (r) =>
            bonusStatus(r) === "draft" },
          { id: "wait", label: "Waiting", match: (r) =>
            bonusStatus(r) === "waiting" },
          { id: "done", label: "Signed off", match: (r) =>
            bonusStatus(r) === "signed" },
        ]}
        columns={[
          { key: "n", label: "Run", render: (r) => r.label },
          { key: "p", label: "People", end: true, render: (r) =>
            <span className="tabular">{r.totals.count}</span> },
          { key: "g", label: runs.every((r) => r.totals.net ===
            r.totals.gross) ? "Bonus" : "Gross", end: true, render: (r) =>
            <Money value={r.totals.gross} size="sm" /> },
          ...(runs.every((r) => r.totals.net === r.totals.gross) ? [] : [
            { key: "net", label: "Net", end: true, render: (r: BonusRun) =>
              <Money value={r.totals.net} size="sm" /> }]),
          { key: "st", label: "Status", render: (r) =>
            <BonusState run={r} /> },
        ]}
        empty={state.role === "hr"
          ? "No bonus run yet. Prepare the Q3 performance bonus."
          : "No bonus run yet. HR prepares one for you to sign off."}
        emptyAction={prepare}
        actions={runs.length > 0 ? prepare : undefined} />
      {open && <NewBonus onClose={() => setOpen(false)} />}
    </>
  );
}

/** FA: choose who is in the run; the figures come from the engine. */
function NewBonus(p: { onClose(): void }) {
  const v = useVariableSource();
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  const mc = useMakerChecker();
  const plan = v.bonus;
  const taken = inLiveRun(state, plan.id);
  const submit = (f: FormValues): string | null => {
    const scope = f["scope"] === "top" ? "top" : "all";
    const ids = plan.rows.filter((r) => (scope === "all" ||
      r.rating === 5) && !taken.has(r.employeeId))
      .map((r) => r.employeeId);
    if (ids.length === 0) {
      return "Everyone in that choice is already in a bonus run.";
    }
    const t = v.totalsOf(ids);
    const id = bonusIdFor(state);
    dispatch({ type: "bonus-new", draft: { planId: plan.id,
      label: plan.label, scope, ids, created: { by: mc.makerId,
        role: state.role, on: mc.today },
      totals: { count: t.count, gross: t.gross, net: t.net } } });
    toast.show(`Prepared ${plan.label}. Review it, then send it to ` +
      `${data.employee(mc.checkerId).name.en}`, () =>
      dispatch({ type: "bonus-remove", id }));
    return null;
  };
  return (
    <ApprovalForm open title="New bonus run" maker={mc.maker}
      checker={mc.checker} submitLabel="Prepare the run"
      onClose={p.onClose} onSubmit={submit}
      fields={[
        { key: "scope", label: plan.label, kind: "select", required: true,
          initial: "all", help: "People already in a bonus run are " +
            "left out. You review every figure before it is sent.",
          options: plan.scopes.map((x) => ({ value: x.id,
            label: x.label })) },
      ]} />
  );
}

export function BonusRecord(p: { id: string }) {
  const { state } = useDemo();
  const run = state.bonusRuns.find((r) => r.id === p.id);
  if (run === undefined) {
    return <NotFound what="bonus run" back={{ label: "Bonus runs",
      href: LIST }} />;
  }
  return <Run run={run} />;
}

function Run(p: { run: BonusRun }) {
  const r = p.run;
  const v = useVariableSource();
  const { lang } = useLocale();
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  const mc = useMakerChecker();
  const st = bonusStatus(r);
  const rows = v.bonus.rows.filter((x) => r.ids.includes(x.employeeId));
  const name = (id: string): string => data.employee(id).name.en;
  const stamp = { by: mc.makerId, role: state.role, on: mc.today };
  const undo = (text: string, back: () => void): void =>
    toast.show(text, back);
  const send = (): void => {
    dispatch({ type: "bonus-send", id: r.id, stamp });
    undo(`Sent to ${mc.checker} to sign off`, () =>
      dispatch({ type: "bonus-unsend", id: r.id }));
  };
  const decide = (verdict: "signed" | "declined"): void => {
    dispatch({ type: "bonus-decide", id: r.id,
      decision: { ...stamp, verdict } });
    undo(verdict === "signed" ? "Signed off. It shows in the pay run " +
      "history" : "Declined. HR can prepare it again",
    () => dispatch({ type: "bonus-undecide", id: r.id }));
  };
  const isHr = state.role === "hr";
  const isGm = state.role === "gm";
  const actions = (
    <>
      {st === "draft" && isHr && (
        <>
          <button type="button" className={`${b.btn} ${b.primary}`}
            onClick={send}>Send for sign-off</button>
          <button type="button" className={`${b.btn} ${b.secondary}`}
            onClick={() => {
              dispatch({ type: "bonus-remove", id: r.id });
              location.hash = LIST;
            }}>Remove this draft</button>
        </>
      )}
      {st === "waiting" && isGm && (
        <>
          <button type="button" className={`${b.btn} ${b.primary}`}
            onClick={() => decide("signed")}>Sign off</button>
          <button type="button" className={`${b.btn} ${b.secondary}`}
            onClick={() => decide("declined")}>Decline</button>
        </>
      )}
      {st === "waiting" && isHr && (
        <button type="button" className={`${b.btn} ${b.secondary}`}
          onClick={() => dispatch({ type: "bonus-unsend", id: r.id })}>
          Take back from sign-off</button>
      )}
      {(st === "signed" || st === "declined") && isGm && (
        <button type="button" className={`${b.btn} ${b.secondary}`}
          onClick={() => dispatch({ type: "bonus-undecide", id: r.id })}>
          Take back the decision</button>
      )}
    </>
  );
  const next = st === "draft"
    ? (isHr ? "Check each figure, then send the run to " +
      `${mc.checker} to sign off.` : "HR has not sent this run yet.")
    : st === "waiting" ? (isGm ? "Check the figures, then sign off or " +
      "decline." : `Waiting for ${mc.checker} to sign it off.`)
      : st === "signed" ? "Signed off. It is in the pay run history " +
        `and is paid on ${v.bonus.payDateText}.`
        : "Declined. HR can prepare a new run.";
  const history = [
    { when: formatDate(r.created.on, lang), what: `Prepared by ` +
      `${name(r.created.by)}` },
    ...(r.sent === null ? [] : [{ when: formatDate(r.sent.on, lang),
      what: `Sent for sign-off by ${name(r.sent.by)}` }]),
    ...(r.decision === null ? [] : [{ when: formatDate(r.decision.on, lang),
      what: `${r.decision.verdict === "signed" ? "Signed off" : "Declined"}` +
        ` by ${name(r.decision.by)}` }]),
  ];
  const ids = rows.map((x) => x.employeeId);
  const same = r.totals.net === r.totals.gross;
  const eligible = v.totalsOf(v.bonus.rows.map((x) => x.employeeId));
  const gross = (
    <Explainable explanation={v.runGross(ids)}>
      <Money value={r.totals.gross} size="lg" /></Explainable>);
  const people = (
    <div className={s.stack}>
      <PayoutMeter selected={r.totals.gross} eligible={eligible.gross}
        figure={gross} text={`${r.totals.count} of ${eligible.count} ` +
          `eligible people, ${r.totals.gross === eligible.gross ? "all of "
            : ""}${eligible.display.gross} eligible in all`} />
      <VarList label="People in the run">
        {rows.map((x) => (
          <VarRow key={x.employeeId}
            title={<NameLink href={hrefOf("people", x.employeeId)}>
              {x.name}</NameLink>}
            note={`${x.jobText}. Rated ${x.rating} \u00b7 ` +
              `${x.display.rate} of basic`}
            end={<Explainable explanation={v.bonusAmount(x)}>
              <Money value={x.bonus} size="sm" /></Explainable>} />
        ))}
      </VarList>
      {same && <p className={s.muted}>No deductions are taken from this
        bonus, so each person is paid the full amount.</p>}
      <details className={vs.how}>
        <summary>How the bonus is worked out</summary>
        <p>{v.bonus.basis}</p>
        <p>{v.bonus.notComputed}</p>
      </details>
    </div>
  );
  return (
    <RecordTabs title={r.label}
      lede={`An off-cycle bonus for ${r.totals.count} ` +
        `${r.totals.count === 1 ? "person" : "people"}, paid on ` +
        v.bonus.payDateText}
      back={{ label: "Bonus runs", href: LIST }}
      status={{ word: BONUS_WORD[st], tone: st === "signed" ? "done"
        : st === "waiting" ? "warn" : "neutral" }}
      stats={[
        same ? { label: "Bonus to pay", value: (
          <>
            <Explainable explanation={v.runNet(ids)}>
              <Money value={r.totals.net} size="lg" /></Explainable>
            <small className={vs.under}>No deductions</small>
          </>) }
          : { label: "Gross bonus", value: gross },
        ...(same ? [] : [{ label: "Net bonus", value: (
          <Explainable explanation={v.runNet(ids)}>
            <Money value={r.totals.net} size="lg" /></Explainable>) }]),
        { label: "People", value: String(r.totals.count) },
      ]}
      next={next} actions={actions} history={history}
      tabs={[
        { id: "people", label: `People (${rows.length})`,
          render: () => people },
        ...(same ? [] : [{ id: "slips", label: "Net after deductions",
          render: () => (
            <>
              <p className={s.muted}>{v.bonus.notComputed}</p>
              <VarList label="Net after deductions">
                {rows.map((x) => (
                  <VarRow key={x.employeeId} title={x.name}
                    note={<>Deductions taken{" "}
                      <Money value={x.deductions} size="sm" /></>}
                    end={<Explainable explanation={v.bonusNet(x)}>
                      <Money value={x.net} size="sm" /></Explainable>} />
                ))}
              </VarList>
            </>) }]),
      ]} />
  );
}
