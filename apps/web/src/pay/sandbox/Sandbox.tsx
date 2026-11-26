import { useMemo, useRef } from "react";
import { fils } from "@payroll/engine";
import { Explainable } from "../../components/explain";
import {
  draftDetail,
  draftProblem,
  newDraft,
  EMPLOYER_NOTE,
  SANDBOX_NOT_SAVED,
  type SandboxDraft,
  type SandboxKind,
} from "../../demo/data/sandbox";
import { hrefOf } from "../../demo/route";
import type { SandboxDraftSpec } from "../../demo/sandbox-state";
import { useDemo } from "../../demo/state";
import { formatDate } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import { actorOf } from "../../setup/rules/actor";
import b from "../../ui/button.module.css";
import { useMaskText } from "../../ui/mask";
import { Money } from "../../ui/Money";
import { PageHead, ReportPage, type Cell } from "../../ui/templates";
import { useListFlip } from "../../ui/templates/listEnter";
import m from "../../ui/templates/motion.module.css";
import { useToast } from "../../ui/Toast";
import { employerExplain, personExplain, totalEmployerExplain,
  totalExplain } from "./explain";
import { useSandbox } from "./load";
import s from "./sandbox.module.css";

const KINDS: { kind: SandboxKind; label: string }[] = [
  { kind: "housing-raise", label: "Raise housing allowance" },
  { kind: "new-allowance", label: "Add transport top-up" },
  { kind: "overtime-rates", label: "Change overtime rates" },
];

const PAGE_LEDE = "Try a change to how people are paid and see October " +
  "worked out again for the people it reaches. " + SANDBOX_NOT_SAVED;

/** The pay-structure sandbox (R41): a what-if, never the real run. */
export function Sandbox() {
  const { options, run } = useSandbox();
  const { data, state, dispatch } = useDemo();
  const { lang } = useLocale();
  const toast = useToast();
  const mask = useMaskText();
  const actor = actorOf(data, state);
  const draft: SandboxDraft | null = state.sandboxDraft;
  const problem = draft === null ? null : draftProblem(draft);
  const result = useMemo(() => draft === null || problem !== null ? null
    : run(draft), [draft, problem, run]);
  const detail = draft === null ? "" : draftDetail(draft);
  const saved = state.sandboxPlans.some((p) => p.title === detail);
  const pick = (d: SandboxDraft): void =>
    dispatch({ type: "sandbox-pick", draft: d });
  const preset = (k: SandboxKind): SandboxDraft => options.presets
    .find((p) => p.draft.kind === k)?.draft ?? newDraft(k);

  const save = (): void => {
    if (result === null || draft === null) return;
    dispatch({ type: "sandbox-save", plan: { title: detail,
      draft: draft as SandboxDraftSpec, people: result.rows.length,
      net: result.totals.net, gross: result.totals.gross,
      employerCost: result.totals.employerCost, by: actor.who,
      role: state.role, on: actor.on } });
    toast.show("Saved as a draft plan. The October run is unchanged.",
      () => dispatch({ type: "sandbox-unsave",
        id: `sandbox-plan-${state.nextSandbox}` }));
  };
  const discard = (): void => {
    if (draft === null) return;
    dispatch({ type: "sandbox-discard", draft: draft as SandboxDraftSpec });
    toast.show("Draft discarded.", () => dispatch({ type: "sandbox-restore",
      draft: draft as SandboxDraftSpec }));
  };

  // A saved plan slides in, a taken-back one fades (listEnter.ts).
  const plansHost = useRef<HTMLDivElement>(null);
  useListFlip(plansHost, state.sandboxPlans.map((p) => p.id));
  const plans = (
    <section className={s.plans} aria-labelledby="sb-plans">
      <h2 id="sb-plans">Draft plans</h2>
      <div className={m.host} ref={plansHost}>
      {state.sandboxPlans.length === 0 ? (
        <p className={s.muted}>None saved yet. Try a change, then choose
          Save as draft plan.</p>
      ) : (
        <ul className={s.planList}>
          {state.sandboxPlans.map((p) => (
            <li key={p.id} data-key={p.id}>
              <div>
                <strong>{mask(p.title)}</strong>
                <span className={s.muted}>
                  {p.people} {p.people === 1 ? "person" : "people"}; net
                  pay{" "}
                  <Money value={p.net} size="sm" tween={false} signed />.
                  Saved by {p.by}, {formatDate(p.on, lang)}. Draft only.
                </span>
              </div>
              <button type="button" className={`${b.btn} ${b.quiet}`}
                onClick={() => {
                  dispatch({ type: "sandbox-unsave", id: p.id });
                  toast.show("Draft plan taken back.");
                }}>Take back</button>
            </li>
          ))}
        </ul>
      )}
      </div>
    </section>
  );

  const picker = (
    <form className={s.picker} aria-label="Draft change"
      onSubmit={(e) => e.preventDefault()}>
      {draft === null ? (
        <div className={s.presets} role="group" aria-label="Start from">
          {options.presets.map((p) => (
            <button key={p.id} type="button" className={s.preset}
              onClick={() => pick(p.draft)}>{p.title}</button>
          ))}
        </div>
      ) : (
        <div className={s.fields}>
          <label className={s.field}><span>Change</span>
            <select value={draft.kind}
              onChange={(e) => pick(preset(e.target.value as SandboxKind))}>
              {KINDS.map((k) => (
                <option key={k.kind} value={k.kind}>{k.label}</option>
              ))}
            </select></label>
          {draft.kind !== "overtime-rates" && (
            <label className={s.field}><span>Grade</span>
              <select value={draft.grade ?? ""}
                onChange={(e) => pick({ ...draft, grade:
                  e.target.value === "" ? null : Number(e.target.value) })}>
                <option value="">Everyone</option>
                {options.grades.map((g) => (
                  <option key={g.grade} value={g.grade}>
                    {g.text}, {g.people} {g.people === 1 ? "person"
                      : "people"}</option>
                ))}
              </select></label>
          )}
          {draft.kind === "housing-raise" && (
            <label className={s.field}><span>Rise</span>
              <select value={draft.percentBps} onChange={(e) =>
                pick({ ...draft, percentBps: Number(e.target.value) })}>
                {options.percents.map((x) => (
                  <option key={x.bps} value={x.bps}>{x.text}</option>
                ))}
              </select></label>
          )}
          {draft.kind === "new-allowance" && (
            <label className={s.field}><span>Amount a month</span>
              <select value={String(draft.monthly)} onChange={(e) =>
                pick({ ...draft, monthly: fils(BigInt(e.target.value)) })}>
                {options.allowances.map((x) => (
                  <option key={String(x.monthly)} value={String(x.monthly)}>
                    {mask(x.text)}</option>
                ))}
              </select></label>
          )}
          {draft.kind === "overtime-rates" && (
            <>
              <label className={s.field}><span>Day uplift</span>
                <select value={draft.dayBps} onChange={(e) =>
                  pick({ ...draft, dayBps: Number(e.target.value) })}>
                  {options.dayUplifts.map((x) => (
                    <option key={x.bps} value={x.bps}>{x.text}</option>
                  ))}
                </select></label>
              <label className={s.field}><span>Night uplift</span>
                <select value={draft.nightBps} onChange={(e) =>
                  pick({ ...draft, nightBps: Number(e.target.value) })}>
                  {options.nightUplifts.map((x) => (
                    <option key={x.bps} value={x.bps}>{x.text}</option>
                  ))}
                </select></label>
            </>
          )}
        </div>
      )}
      {problem !== null && <p className={s.error} role="alert">{problem}</p>}
    </form>
  );

  if (draft === null || result === null) {
    return (
      <div className={s.page}>
        <PageHead title="Pay-structure sandbox" lede={PAGE_LEDE}
          crumbs={[{ label: "Pay run", href: hrefOf("pay-run") }]}
          actions={draft === null ? undefined : (
            <button type="button" className={`${b.btn} ${b.quiet}`}
              onClick={discard}>Discard</button>)} />
        {picker}
        {draft === null && (
          <p className={s.muted}>Pick a change to start. October is worked
            out again in the sandbox; the real run never moves.</p>
        )}
        {plans}
      </div>
    );
  }

  const t = result.totals;
  const rows: Cell[][] = result.rows.map((r) => [r.name, r.gradeText,
    { fils: r.difference.net, signed: true },
    { fils: r.difference.gross, signed: true },
    r.pensionNotComputed
      ? `${r.display.employerCost}; pension: Not computed`
      : { fils: r.difference.employerCost, signed: true }]);
  const total: Cell[] = [`Whole run, ${result.rows.length} of ${
    result.rows.length + result.unchanged}`, "",
  { fils: t.net, signed: true }, { fils: t.gross, signed: true },
  { fils: t.employerCost, signed: true }];
  const explain = (row: number, col: number) => {
    if (col !== 2 && col !== 4) return undefined;
    if (row === result.rows.length) {
      return col === 2 ? totalExplain(result, detail)
        : totalEmployerExplain(result, detail);
    }
    const r = result.rows[row]!;
    if (col === 4) return r.pensionNotComputed ? undefined
      : employerExplain(r, detail);
    return personExplain(r, detail);
  };

  return (
    <>
      <ReportPage id="sb-title" title="Pay-structure sandbox"
        crumbs={[{ label: "Pay run", href: hrefOf("pay-run") }]}
        period={`${detail}. ${SANDBOX_NOT_SAVED} ${result.scopeText}. ` +
          result.summaryText}
        meta={picker}
        figure={{ label: "Change to net pay", value: (
          <Money value={t.net} size="lg" tween={false} signed />),
        explanation: totalExplain(result, detail) }}
        columns={[{ label: "Person" }, { label: "Grade" },
          { label: "Net pay", end: true }, { label: "Gross pay", end: true },
          { label: "Employer cost", end: true }]}
        rows={rows} total={total} explain={explain}
        csvName="pay-sandbox-draft-2026-10.csv"
        actions={(
          <>
            <button type="button" className={`${b.btn} ${b.quiet}`}
              onClick={discard}>Discard</button>
            <button type="button" className={`${b.btn} ${b.primary}`}
              disabled={saved || result.rows.length === 0}
              onClick={save}>{saved ? "Saved as draft plan"
                : "Save as draft plan"}</button>
          </>
        )}
        note={`Changes are against October as run: net pay ` +
          `${mask(result.display.runNet)} in the sandbox. ${EMPLOYER_NOTE}`} />
      <div className={s.below}>
        {plans}
        <span className="visually-hidden" aria-live="polite">
          {saved ? "Saved as a draft plan" : ""}</span>
      </div>
    </>
  );
}
