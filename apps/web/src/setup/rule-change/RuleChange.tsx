import { useState } from "react";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { formatDate } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import { useCellMoney } from "../../pay/gate/cell-money";
import b from "../../ui/button.module.css";
import { Money } from "../../ui/Money";
import { KeyValues, ReportPage } from "../../ui/templates";
import { useToast } from "../../ui/Toast";
import { actorOf } from "../rules/actor";
import { useRuleChange } from "./load";
import s from "./rule-change.module.css";
import {
  stageOf,
  type RuleChangeStage,
  type RuleChangeStep,
  type RuleChangeVerdict,
} from "./state";

const MASK = /AED [\d,.]+/g;

const VERDICT: Record<RuleChangeVerdict, string> = {
  plan: "Planned for the next run",
  hold: "Held",
};

function StageWord(p: { stage: RuleChangeStage }) {
  const k = p.stage.kind;
  const tone = k === "planned" ? "done" : k === "held" ? "held" : "waiting";
  const word = k === "waiting-hr" ? "Waiting for HR"
    : k === "waiting-gm" ? "Waiting for the General manager"
      : k === "held" ? "Held" : "Planned for the next run";
  return <span className={s.stage} data-tone={tone}>{word}</span>;
}

/**
 * S09: before a rule pack update applies, who it changes and by how
 * much in the next run, worked out by the engine; the notice to send;
 * HR then the General manager decide to plan it or hold it.
 */
export function RuleChange() {
  const { preview: r } = useRuleChange();
  const { data, state, dispatch } = useDemo();
  const { lang } = useLocale();
  const toast = useToast();
  const { m, signed } = useCellMoney();
  const [who, setWho] = useState(r.rows[0]?.employeeId ?? "");
  const ch = r.change;
  const actor = actorOf(data, state);
  const steps = state.ruleChangeSteps.filter((x) => x.changeId === ch.id);
  const stage = stageOf(steps, ch.id);
  const last = steps[steps.length - 1];
  const myTurn = (stage.kind === "waiting-hr" && state.role === "hr") ||
    (stage.kind === "waiting-gm" && state.role === "gm");
  const canUndo = last !== undefined && last.role === state.role;
  const hide = (t: string): string =>
    state.hideAmounts ? t.replace(MASK, "AED ••••••") : t;

  const decide = (verdict: RuleChangeVerdict): void => {
    const step: RuleChangeStep = { changeId: ch.id, verdict,
      who: actor.who, title: actor.role, role: state.role, on: actor.on };
    dispatch({ type: "rule-change-step", step });
    toast.show(`${VERDICT[verdict]}: ${ch.title}. Nothing in the ` +
      "October run changes.", () =>
      dispatch({ type: "rule-change-undo", changeId: ch.id }));
  };
  const undo = (): void => {
    dispatch({ type: "rule-change-undo", changeId: ch.id });
    toast.show("Decision undone.");
  };

  const rows = [...r.rows.map((x) => [x.name, x.department,
    x.overtimeText, m(x.beforeNet), m(x.afterNet), signed(x.difference)]),
  ["Whole run", `${r.checked} people`, "", m(r.totals.beforeNet),
    m(r.totals.afterNet), signed(r.totals.difference)]];
  const person = r.rows.find((x) => x.employeeId === who) ?? r.rows[0];
  const ruleHref = (key: string): string =>
    hrefOf("setup", "rules", "packs", `${ch.packId}:${key}`);
  const nextStep = stage.kind === "waiting-hr"
    ? `${r.deciders.hr.name} (HR) decides first, then ` +
      `${r.deciders.gm.name} (General manager).`
    : stage.kind === "waiting-gm"
      ? `${r.deciders.gm.name} (General manager) decides next.`
      : stage.kind === "planned"
        ? `The rule pack keeps 25% and 50% until the ${ch.nextRun} run. ` +
          "Nothing is applied."
        : "The rule pack in force is unchanged.";

  return (
    <>
      <ReportPage title="Rule change preview"
        period={`${ch.title}. ${ch.label} Next run: ${ch.nextRun}. ` +
          r.summaryText}
        figure={{ label: "Change to the run's net pay", value: (
          <Money value={r.totals.difference} size="lg" tween={false}
            signed />) }}
        columns={[{ label: "Person" }, { label: "Department" },
          { label: "Overtime in October" }, { label: "Before", end: true },
          { label: "After", end: true }, { label: "Difference", end: true }]}
        rows={rows} csvName="rule-change-preview-hypothetical-2026-11.csv"
        note={`${ch.basisText} ${r.unchanged} people have no overtime in ` +
          "October, so their pay stays the same. UAE nationals were " +
          "checked through the overtime step; their pension " +
          "stays not computed. Employer cost moves by " +
          `${signed(r.totals.employerCostDifference)}.`} />
      <div className={s.more}>
        <section className={s.panel} aria-labelledby="rc-decide">
          <h2 id="rc-decide">Decision</h2>
          <p><StageWord stage={stage} /></p>
          <p className={s.muted}>{nextStep}</p>
          {steps.length > 0 && (
            <ol className={s.steps} aria-label="Decisions so far">
              {steps.map((x, i) => (
                <li key={i}>
                  <span>{VERDICT[x.verdict]}<small>{x.who}, {x.title}
                  </small></span>
                  <span className={s.when}>{formatDate(x.on, lang)}</span>
                </li>
              ))}
            </ol>
          )}
          <div className={s.actions}>
            {myTurn && (
              <>
                <button type="button" className={`${b.btn} ${b.primary}`}
                  onClick={() => decide("plan")}>Plan for the next run</button>
                <button type="button" className={`${b.btn} ${b.secondary}`}
                  onClick={() => decide("hold")}>Hold</button>
              </>
            )}
            {canUndo && (
              <button type="button" className={`${b.btn} ${b.quiet}`}
                onClick={undo}>Undo my decision</button>
            )}
          </div>
          {!myTurn && !canUndo && stage.kind.startsWith("waiting") && (
            <p className={s.muted}>You can read this; {stage.kind ===
              "waiting-hr" ? "HR" : "the General manager"} decides now.</p>
          )}
        </section>

        <section className={s.panel} aria-labelledby="rc-change">
          <h2 id="rc-change">The change</h2>
          <p className={s.flag}>{ch.label}</p>
          <KeyValues items={[
            ...ch.values.map((v) => ({ label: v.label, value: (
              <a className={s.link} href={ruleHref(v.key)}>
                {v.fromText} to {v.toText}</a>) })),
            { label: "Rule pack", value: ch.packName },
            { label: "Source", value: ch.sourceText },
            { label: "Would apply from", value:
              formatDate(ch.effectiveFrom.iso, lang) },
            { label: "Raised", value: formatDate(ch.proposedOn.iso, lang) },
          ]} />
          <a className={`${b.btn} ${b.quiet}`}
            href={hrefOf("setup", "rules", "packs")}>Rules and sources</a>
        </section>

        <section className={s.panel} aria-labelledby="rc-notice">
          <h2 id="rc-notice">Notice to the people it changes</h2>
          {person === undefined ? (
            <p>Nobody's pay changes, so no notice is needed.</p>
          ) : (
            <>
              <div className={s.people} role="group"
                aria-label="Whose notice">
                {r.rows.map((x) => (
                  <button key={x.employeeId} type="button"
                    className={s.person}
                    aria-pressed={x.employeeId === person.employeeId}
                    onClick={() => setWho(x.employeeId)}>{x.name}</button>
                ))}
              </div>
              <p className={s.subject}><span>Subject</span>
                {r.noticeSubject}</p>
              <p className={s.subject}><span>From</span>
                {r.noticeFrom.name}, {r.noticeFrom.title}</p>
              <div className={s.letter}>{hide(person.notice)}</div>
              <p className={s.muted}>
                {stage.kind === "planned"
                  ? `Ready to send to ${r.rows.length} people with the ` +
                    `${ch.nextRun} payslips. Nothing is sent.`
                  : "Not sent. It goes out only once the General manager " +
                    "plans the change."}</p>
            </>
          )}
        </section>
      </div>
    </>
  );
}
