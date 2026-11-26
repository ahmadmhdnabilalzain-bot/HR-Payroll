import { useState } from "react";
import type { AppraisalView, ProbationEvaluationView }
  from "../../demo/data/team-types";
import type { ProbationRecord } from "../../demo/team-state";
import { useDemo } from "../../demo/state";
import { personFor } from "../../demo/time-off";
import { Status, type Tone } from "../../people/team/common";
import s from "../../people/team/team.module.css";
import b from "../../ui/button.module.css";
import { useToast } from "../../ui/Toast";
import { ApprovalForm, FilterList } from "../../ui/templates";
import { fill, X } from "./words";

const W = X.grow;
const SCORES = ["attendance", "quality", "teamwork", "learning"] as const;
const TONE: Record<AppraisalView["status"], Tone> = {
  "not-started": "plain", "self-done": "warn", finalised: "ok" };

/**
 * E11, Team probation and appraisal (manager): the appraisals of the
 * people who report to the viewer in the open cycle, and anyone in the
 * team still on probation. A probation evaluation goes to the General
 * manager through the same record HR's Probation screen reads. Ratings
 * stay with the appraisal cycle: nothing is rated here.
 */
export function TeamReviews() {
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  const [form, setForm] = useState<ProbationEvaluationView | null>(null);
  const me = personFor(data, state.role);
  const team = new Set(data.people.people().filter((p) =>
    p.approverId === me).map((p) => p.id));
  const cycle = data.team.cycles().find((c) => c.status === "open");
  const rows = cycle === undefined ? [] : data.team.appraisals(cycle.id)
    .filter((a) => team.has(a.employeeId));
  const probation = data.team.probation().filter((x) =>
    x.status === "in-progress" && team.has(x.employeeId));
  const { gmId } = data.people.personas();
  const gmName = data.people.person(gmId)?.name.en ?? "";
  const myName = data.people.person(me)?.name.en ?? "";
  const recordOf = (x: ProbationEvaluationView): ProbationRecord | undefined =>
    state.probationRecords[x.id]?.withdrawn === true ? undefined
      : state.probationRecords[x.id];
  const word = (a: AppraisalView): string => a.status === "finalised"
    ? W.final : a.status === "self-done" ? W.mgrTodo : W.notStarted;
  return (
    <>
      <FilterList title={W.title}
        lede={cycle === undefined ? W.lede : `${W.lede} ${fill(W.cycle,
          { name: cycle.name })}. ${fill(W.managerDue,
          { date: cycle.managerDueOn.display })}.`}
        rows={rows} rowKey={(a) => a.id}
        searchText={(a) => `${a.employeeName} ${a.title}`}
        segments={[
          { id: "all", label: W.all, match: () => true },
          { id: "todo", label: W.needs, match: (a) =>
            a.status !== "finalised" },
        ]}
        columns={[
          { key: "p", label: W.person, render: (a) => (
            <span className={s.name}>
              <span>{a.employeeName}</span>
              <span className={s.sub}>{a.title}</span>
            </span>) },
          { key: "s", label: W.appraisal, render: (a) => (
            <Status tone={TONE[a.status]}>{word(a)}</Status>) },
          { key: "r", label: W.rated, render: (a) =>
            a.rating === null ? (a.selfRating === null ? "-"
              : fill(W.selfRating, { n: a.selfRating }))
              : `${a.rating}, ${a.ratingText}` },
        ]}
        empty={team.size === 0 ? W.teamEmpty : W.emptyApp} />
      <section className={s.after} aria-labelledby="grow-prob">
        <h2 id="grow-prob" className={s.sectionTitle}>{W.probation}</h2>
        <ul className={s.group}>
          {probation.length === 0 && (
            <li><span className={s.line}><span className={s.lineMain}>
              {W.noProbation}</span></span></li>)}
          {probation.map((x) => {
            const r = recordOf(x);
            return (
              <li key={x.id}><span className={s.line}>
                <span className={s.lineMain}>
                  <span>{x.employeeName}</span>
                  <small>{fill(W.onProbation,
                    { date: x.probationEnd.display })}</small>
                  <Status tone={r === undefined ? "open" : "warn"}>
                    {r === undefined ? x.statusText : fill(W.waitingHr,
                      { name: gmName })}</Status>
                </span>
                {r === undefined ? (
                  <button type="button"
                    className={`${b.btn} ${b.secondary} ${s.tall}`}
                    aria-label={`${W.evaluate}: ${x.employeeName}`}
                    onClick={() => setForm(x)}>{W.evaluate}</button>) : (
                  <button type="button"
                    className={`${b.btn} ${b.quiet} ${s.tall}`}
                    onClick={() => {
                      dispatch({ type: "team-probation-withdraw",
                        id: x.id });
                      toast.show(W.withdrawn);
                    }}>{W.withdraw}</button>)}
              </span></li>);
          })}
        </ul>
      </section>
      {form !== null && (
        <ApprovalForm open title={fill(W.formTitle, { name:
          form.employeeName })} maker={myName} checker={gmName}
        submitLabel={W.submit} onClose={() => setForm(null)}
        fields={[
          ...SCORES.map((k, i) => ({ key: k, label: W[k],
            kind: "select" as const, required: true, initial: "3",
            options: ["1", "2", "3", "4", "5"].map((v) =>
              ({ value: v, label: v })),
            ...(i === 0 ? { help: W.scoreHelp } : {}) })),
          { key: "suggest", label: W.suggest, kind: "select",
            initial: "confirm", options: [
              { value: "confirm", label: W.suggestConfirm },
              { value: "extend", label: W.suggestAgain }] },
          { key: "note", label: W.note, kind: "textarea" },
        ]}
        onSubmit={(v) => {
          const n = (k: string): number => Number(v[k]);
          dispatch({ type: "team-probation-send", draft: {
            evaluationId: form.id, employeeId: form.employeeId,
            scores: { attendance: n("attendance"), quality: n("quality"),
              teamwork: n("teamwork"), learning: n("learning") },
            suggestion: v["suggest"] === "extend" ? "extend" : "confirm",
            note: v["note"] ?? "", sentById: me, sentOn: data.people.asOf,
            checkerId: gmId } });
          toast.show(fill(W.sentToast, { name: gmName }));
          return null;
        }} />)}
    </>
  );
}
