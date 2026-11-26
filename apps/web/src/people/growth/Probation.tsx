import { useState } from "react";
import { Explainable } from "../../components/explain";
import type { ProbationEvaluationView } from "../../demo/data/team-types";
import type { ProbationCall, ProbationRecord } from "../../demo/team-state";
import { useDemo } from "../../demo/state";
import b from "../../ui/button.module.css";
import { useToast } from "../../ui/Toast";
import { ApprovalForm, FilterList } from "../../ui/templates";
import { shortDay, Status, useMe, whoIs } from "../team/common";
import { fill } from "../team/words";
import { decideByExplanation } from "./probation-explain";
import { G } from "./words";
import s from "../team/team.module.css";
import { SignLink } from "../esign/Sign";

const SCORE_KEYS = ["attendance", "quality", "teamwork", "learning"] as const;

/**
 * P19, Probation ending, evaluate. HR records the evaluation and sends
 * it; the General manager decides (switch role to see it). Maker and
 * checker always differ. Every step names who, their job and the date,
 * and can be undone. Decide-by opens its working.
 */
export function Probation() {
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  const me = useMe();
  const [form, setForm] = useState(false);
  const g = G.prob;
  const { gmId } = data.people.personas();
  const scope = data.basis().ruleSet.en;
  const rows = [...data.team.probation()].sort((a, b2) =>
    (a.status === b2.status ? 0 : a.status === "in-progress" ? -1 : 1));
  const recordOf = (x: ProbationEvaluationView): ProbationRecord | undefined =>
    state.probationRecords[x.id]?.withdrawn === true ? undefined
      : state.probationRecords[x.id];
  const target = rows.find((x) => x.status === "in-progress" &&
    recordOf(x) === undefined);
  const day = shortDay;
  const checkerName = data.people.person(gmId)?.name.en ?? "";
  const call = (x: ProbationEvaluationView, c: ProbationCall): void => {
    dispatch({ type: "team-probation-decide", id: x.id, byId: me.id,
      on: data.people.asOf, call: c });
    toast.show(fill(g.decidedToast, { text: c === "confirm" ? g.confirmed
      : g.kept, name: x.employeeName }),
    () => dispatch({ type: "team-probation-undo", id: x.id }));
  };
  const statusOf = (x: ProbationEvaluationView) => {
    const r = recordOf(x);
    if (r?.verdict != null) {
      const done = r.verdict.call === "confirm";
      return { tone: done ? "ok" as const : "plain" as const,
        word: done ? g.confirmed : g.kept,
        sub: fill(g.byOn, { who: whoIs(data, r.verdict.byId),
          date: day(r.verdict.on) }) };
    }
    if (r !== undefined) {
      return { tone: "warn" as const, word: g.waiting,
        sub: fill(g.sent, { who: whoIs(data, r.sentById),
          date: day(r.sentOn), checker: checkerName }) };
    }
    return x.status === "confirmed"
      ? { tone: "ok" as const, word: g.confirmed, sub: x.statusText +
        (x.averageText === null ? "" : `. ${fill(g.average,
          { text: x.averageText })}`) }
      : { tone: "open" as const, word: g.now, sub: g.noEval };
  };
  return (
    <>
      <FilterList title={g.title} lede={g.lede} rows={rows}
        rowKey={(x) => x.id}
        searchText={(x) => `${x.employeeName} ${x.title}`}
        segments={[
          { id: "now", label: g.now, match: (x) => x.status === "in-progress" },
          { id: "done", label: g.done, match: (x) => x.status === "confirmed" },
        ]}
        actions={state.role === "hr" && target !== undefined && (
          <button type="button" className={`${b.btn} ${b.primary} ${s.tall}`}
            onClick={() => setForm(true)}>{g.record}</button>
        )}
        columns={[
          { key: "p", label: g.person, render: (x) => (
            <span className={s.name}>
              <span>{x.employeeName}</span>
              <span className={s.sub}>{x.title}</span>
            </span>) },
          { key: "s", label: g.status, render: (x) => {
            const st = statusOf(x);
            return (
              <span className={s.name}>
                <Status tone={st.tone}>{st.word}</Status>
                <span className={s.sub}>{st.sub}</span>
                <SignLink docId={`probation:${x.employeeId}`} />
              </span>);
          } },
          { key: "d", label: g.decision, render: (x) => x.status ===
            "in-progress" && recordOf(x)?.verdict == null ? (
              <Explainable explanation={decideByExplanation(x, scope)}>
                {fill(g.decideOn, { date: x.decideBy.display })}
              </Explainable>) : "" },
          { key: "a", label: "", end: true, render: (x) => {
            const r = recordOf(x);
            if (r === undefined) return null;
            if (r.verdict !== null) {
              return state.role === "gm" ? (
                <button type="button"
                  className={`${b.btn} ${b.quiet} ${s.tall}`}
                  onClick={() => {
                    dispatch({ type: "team-probation-undo", id: x.id });
                    toast.show(g.undone);
                  }}>{g.undo}</button>) : null;
            }
            if (state.role === "gm") {
              return (
                <span className={s.btnRow}>
                  <button type="button"
                    className={`${b.btn} ${b.primary} ${s.tall}`}
                    onClick={() => call(x, "confirm")}>{g.confirm}</button>
                  <button type="button"
                    className={`${b.btn} ${b.secondary} ${s.tall}`}
                    onClick={() => call(x, "extend")}>{g.again}</button>
                </span>);
            }
            return (
              <button type="button" className={`${b.btn} ${b.quiet} ${s.tall}`}
                onClick={() => {
                  dispatch({ type: "team-probation-withdraw", id: x.id });
                  toast.show(g.withdrawn);
                }}>{g.withdraw}</button>);
          } },
        ]}
        empty={g.none} />
      {target !== undefined && (
        <ApprovalForm open={form} title={fill(g.form,
          { name: target.employeeName })}
        maker={me.name} checker={checkerName} submitLabel={g.submit}
        onClose={() => setForm(false)}
        fields={[
          ...SCORE_KEYS.map((k, i) => ({ key: k, label: g[k],
            kind: "select" as const, required: true, initial: "3",
            options: ["1", "2", "3", "4", "5"].map((v) =>
              ({ value: v, label: v })),
            ...(i === 0 ? { help: [g.scoreHelp, ...target.notes.slice(0, 2)]
              .join(" ") } : {}) })),
          { key: "suggest", label: g.suggest, kind: "select",
            initial: "confirm", options: [
              { value: "confirm", label: g.suggestConfirm },
              { value: "extend", label: g.suggestAgain }] },
          { key: "note", label: g.note, kind: "textarea",
            help: fill(g.manager, { name: target.evaluatorName }) },
        ]}
        onSubmit={(v) => {
          const n = (k: string): number => Number(v[k]);
          dispatch({ type: "team-probation-send", draft: {
            evaluationId: target.id, employeeId: target.employeeId,
            scores: { attendance: n("attendance"), quality: n("quality"),
              teamwork: n("teamwork"), learning: n("learning") },
            suggestion: v["suggest"] === "extend" ? "extend" : "confirm",
            note: v["note"] ?? "", sentById: me.id, sentOn: data.people.asOf,
            checkerId: gmId } });
          toast.show(fill(g.sentToast, { name: checkerName }),
            () => dispatch({ type: "team-probation-withdraw",
              id: target.id }));
          return null;
        }} />
      )}
    </>
  );
}
