import type { Fils } from "@payroll/engine";
import { useState } from "react";
import { Explainable } from "../../components/explain";
import type { Urgency } from "../../demo/data/hiring-types";
import { nextRequestId, type HiringDraft } from "../../demo/hiring-state";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { personFor } from "../../demo/time-off";
import { Icon } from "../../ui/Icon";
import { Money } from "../../ui/Money";
import b from "../../ui/button.module.css";
import { useToast } from "../../ui/Toast";
import { PageHead } from "../../ui/templates";
import tp from "../../ui/templates/templates.module.css";
import { DateField } from "../DateField";
import { useActor } from "../moves/view";
import { Picker } from "../Picker";
import {
  budgetRows,
  freePositions,
  hireCost,
  requestHref,
  requestsNow,
  type HireCost,
} from "./model";
import h from "./hiring.module.css";

const lines = (s: string): string[] => s.split("\n").map((x) => x.trim())
  .filter((x) => x !== "");

const HEADS = [1, 2, 3, 4, 5];

/**
 * "Request a hire": a hiring manager, HR or the General manager asks
 * for a person. It goes to HR's queue (a task and a note on Home, no
 * email), then to the General manager for sign-off. The form is in
 * five sections; a cost summary beside it follows the grade, the
 * headcount and the start as they change, from the same engine
 * figures as the Hiring budget. "Save draft" keeps it for the person
 * who wrote it.
 */
export function RequestForm(p: { budgetId: string | null }) {
  const { data, state, dispatch } = useDemo();
  const actor = useActor();
  const toast = useToast();
  const me = personFor(data, state.role);
  const manager = state.role === "manager";
  const staff = state.role === "hr" || state.role === "gm";
  const own = data.people.person(me)?.departmentId ?? "";
  const free = freePositions(budgetRows(data, state),
    requestsNow(data, state)).filter((x) => !manager ||
    x.departmentId === own);
  const allRoles = data.hiring.roles();
  const depts = data.hiring.departments();
  const asOf = data.hiring.asOf;
  const saved = state.hiringDrafts[me];
  const rolesIn = (d: string) => {
    const xs = allRoles.filter((r) => r.departmentIds.includes(d));
    return xs.length > 0 ? xs : allRoles;
  };
  const [init] = useState((): HiringDraft & { fromDraft: boolean } => {
    if (saved !== undefined && (p.budgetId === null ||
      saved.budgetId === p.budgetId)) {
      // A position taken since the draft was saved: a new position.
      const still = free.some((x) => x.id === saved.budgetId);
      return { ...saved, budgetId: still ? saved.budgetId : null,
        fromDraft: true };
    }
    const pick0 = free.find((x) => x.id === p.budgetId) ?? null;
    const dept0 = pick0?.departmentId ?? (manager ? own : depts[0]!.id);
    const job0 = pick0?.jobKey ?? rolesIn(dept0)[0]!.jobKey;
    const boss0 = pick0?.ownerId ?? (manager ? me
      : data.hiring.hiringManagerFor(dept0));
    const crit0 = data.hiring.criteria(job0);
    return { fromDraft: false, budgetId: pick0?.id ?? null,
      departmentId: dept0, jobKey: job0, grade: pick0?.grade ??
        allRoles.find((r) => r.jobKey === job0)!.gradeMin,
      reason: "new", replacesName: "", headcount: 1,
      startIso: pick0 !== null && pick0.startIso > asOf ? pick0.startIso
        : data.hiring.addDays(asOf, 69), urgency: "normal",
      timeToFillDays: 45,
      jobDescription: data.hiring.jobDescription(job0, dept0),
      mustHave: crit0.mustHave, niceToHave: crit0.niceToHave,
      stages: data.hiring.stages(boss0), hiringManagerId: boss0 };
  });
  const [fromDraft, setFromDraft] = useState(init.fromDraft);
  const [budgetId, setBudgetId] = useState(init.budgetId);
  const [dept, setDept] = useState(init.departmentId);
  const [jobKey, setJobKey] = useState(init.jobKey);
  const [grade, setGrade] = useState(init.grade);
  const [reason, setReason] = useState(init.reason);
  const [replaces, setReplaces] = useState(init.replacesName);
  const [headcount, setHeadcount] = useState(init.headcount);
  const [start, setStart] = useState(init.startIso);
  const [urgency, setUrgency] = useState<Urgency>(init.urgency);
  const [ttf, setTtf] = useState(String(init.timeToFillDays));
  const [jd, setJd] = useState(init.jobDescription);
  const [jdOwn, setJdOwn] = useState(init.fromDraft);
  const [must, setMust] = useState(init.mustHave.join("\n"));
  const [nice, setNice] = useState(init.niceToHave.join("\n"));
  const [boss, setBoss] = useState(init.hiringManagerId);
  const [stages, setStages] = useState(init.stages);
  const [problems, setProblems] = useState<string[]>([]);

  const role = allRoles.find((r) => r.jobKey === jobKey) ?? allRoles[0]!;
  const band = data.hiring.band(grade);
  const locked = budgetId !== null;
  const retemplate = (k: string, d: string): void => {
    if (!jdOwn) setJd(data.hiring.jobDescription(k, d));
    const c = data.hiring.criteria(k);
    setMust(c.mustHave.join("\n"));
    setNice(c.niceToHave.join("\n"));
  };
  const setRole = (k: string, d = dept): void => {
    setJobKey(k);
    setGrade(allRoles.find((r) => r.jobKey === k)?.gradeMin ?? grade);
    retemplate(k, d);
  };
  const setDepartment = (d: string): void => {
    setDept(d);
    const hm = data.hiring.hiringManagerFor(d);
    setBoss(hm);
    setStages(data.hiring.stages(hm));
    setRole(rolesIn(d)[0]!.jobKey, d);
  };
  const choosePosition = (id: string): void => {
    const x = free.find((y) => y.id === id) ?? null;
    setBudgetId(x?.id ?? null);
    if (x === null) return;
    setDept(x.departmentId);
    setJobKey(x.jobKey);
    setGrade(x.grade);
    setBoss(x.ownerId);
    setStages(data.hiring.stages(x.ownerId));
    if (x.startIso > asOf) setStart(x.startIso);
    retemplate(x.jobKey, x.departmentId);
  };
  const soon = data.hiring.tooSoon(start, Number(ttf));
  const cost = hireCost(data, state, { grade, startIso: start, headcount,
    budgetId });

  const draftNow = (): HiringDraft => ({ jobKey, departmentId: dept,
    budgetId, reason, replacesName: replaces.trim(), headcount,
    startIso: start, urgency, timeToFillDays: Number(ttf), grade,
    jobDescription: jd, mustHave: lines(must), niceToHave: lines(nice),
    stages: stages.filter((x) => x.name.trim() !== ""),
    hiringManagerId: boss });
  const submit = (): void => {
    const draft = draftNow();
    const found = data.hiring.check(draft);
    if (reason === "replacement" && replaces.trim() === "") {
      found.push("Say who the person replaces.");
    }
    if (draft.stages.length === 0) found.push("Keep at least one stage.");
    setProblems(found);
    if (found.length > 0) return;
    const id = nextRequestId(state);
    dispatch({ type: "hiring-raise", draft, who: { by: actor.id,
      role: actor.role, on: actor.on },
    n: data.hiring.requests().length + state.hiringNew.length + 1 });
    toast.show(`${role.title}: sent to HR, then to the General manager ` +
      "for sign-off", () => dispatch({ type: "hiring-raise-undo", id }));
    location.hash = requestHref(id);
  };
  const [savedNow, setSavedNow] = useState(false);
  /** Said in the bar, not a toast: on phones a toast would sit on the
   * bar's own buttons. "Discard the draft" above the form undoes it. */
  const saveDraft = (): void => {
    dispatch({ type: "hiring-draft-save", by: me, draft: { ...draftNow(),
      on: actor.on } });
    setFromDraft(true);
    setSavedNow(true);
  };
  const discard = (): void => {
    dispatch({ type: "hiring-draft-clear", by: me });
    location.hash = hrefOf("people", "hiring", "requests");
  };
  const grades = Array.from({ length: role.gradeMax - role.gradeMin + 1 },
    (_, i) => role.gradeMin + i);
  if (!grades.includes(grade)) grades.push(grade);

  return (
    <div className={tp.page}>
      <PageHead title="Request a hire"
        back={{ label: "Hiring requests", href: hrefOf("people", "hiring",
          "requests") }}
        lede={"HR reviews it first, then the General manager signs off " +
          "the budget. Every question stays on the request, not in " +
          "email."} />
      {fromDraft && saved !== undefined && (
        <p className={h.draftNote}>
          <span>{`Your draft, saved ${data.hiring.dateText(saved.on)}. ` +
            "Only you can see it."}</span>
          <button type="button" className={`${b.btn} ${b.quiet}`}
            onClick={discard}>Discard the draft</button>
        </p>
      )}
      <div className={h.formLayout}>
        <form className={h.form} noValidate aria-label="Request a hire"
          id="hire-form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}>
          <section className={h.group} aria-labelledby="hf-g1">
            <h2 id="hf-g1" className={h.section}>Role</h2>
            <div className={`${h.field} ${h.wide}`}>
              <span>Position</span>
              <Picker label="Position" value={budgetId ?? ""}
                onChange={choosePosition}
                options={[{ value: "", label: "A new position (needs a " +
                  "budget)" }, ...free.map((x) => ({ value: x.id,
                  label: `Budgeted: ${x.title}, ${x.departmentText}` }))]} />
              <small>{locked ? "The budget is already signed off."
                : "The General manager signs off the budget with the " +
                  "request."}</small>
            </div>
            <div className={h.field}>
              <span>Department</span>
              <Picker label="Department" value={dept}
                disabled={locked || manager} onChange={setDepartment}
                options={depts.map((d) => ({ value: d.id,
                  label: d.text }))} />
            </div>
            <div className={h.field}>
              <span>Role</span>
              <Picker label="Role" value={jobKey} disabled={locked}
                onChange={(k) => setRole(k)}
                options={rolesIn(dept).map((r) => ({ value: r.jobKey,
                  label: r.title }))} />
            </div>
            <div className={h.field}>
              <span>Grade</span>
              <Picker label="Grade" value={String(grade)} disabled={locked}
                onChange={(g) => setGrade(Number(g))}
                options={grades.map((g) => ({ value: String(g),
                  label: `Grade ${g}` }))} />
              <small>Basic pay band: <Money value={band.min} size="sm"
                tween={false} /> to <Money value={band.max} size="sm"
                tween={false} /></small>
            </div>
            <div className={h.field}>
              <span>How many people</span>
              <Picker label="How many people" value={String(headcount)}
                onChange={(n) => setHeadcount(Number(n))}
                options={HEADS.map((n) => ({ value: String(n),
                  label: n === 1 ? "1 person" : `${n} people` }))} />
            </div>
            <div className={h.field}>
              <span>Reason</span>
              <Picker label="Reason" value={reason}
                onChange={(v) => setReason(v as "new" | "replacement")}
                options={[{ value: "new", label: "A new role" },
                  { value: "replacement",
                    label: "Replaces someone who left" }]} />
            </div>
            {reason === "replacement" && (
              <label className={h.field}>
                <span>Who it replaces</span>
                <input value={replaces}
                  onChange={(e) => setReplaces(e.target.value)} />
              </label>
            )}
          </section>

          <section className={h.group} aria-labelledby="hf-g2">
            <h2 id="hf-g2" className={h.section}>Timing</h2>
            <div className={h.field}>
              <span>Target start date</span>
              <DateField label="Target start date" value={start}
                min={data.hiring.addDays(asOf, 1)}
                max={data.hiring.lastStart} today={asOf}
                onChange={setStart} describedBy="hf-start" />
              <small id="hf-start">{`The first day at work. Today is ` +
                `${data.hiring.dateText(asOf)}.`}</small>
            </div>
            <label className={h.field}>
              <span>Days to find someone</span>
              <input type="number" inputMode="numeric" min={14} max={120}
                value={ttf} onChange={(e) => setTtf(e.target.value)} />
              <small>{soon ? "The start comes before this time ends; HR " +
                "may ask to move it." : "From the General manager's " +
                "sign-off to an offer."}</small>
            </label>
            <div className={h.field}>
              <span>Urgency</span>
              <Picker label="Urgency" value={urgency}
                onChange={(u) => setUrgency(u as Urgency)}
                options={(["normal", "high", "urgent"] as const).map((u) =>
                  ({ value: u, label: data.hiring.urgencyText[u] }))} />
            </div>
          </section>

          <section className={h.group} aria-labelledby="hf-g3">
            <h2 id="hf-g3" className={h.section}>Job description</h2>
            <div className={`${h.field} ${h.wide}`}>
              <textarea value={jd} rows={12} aria-labelledby="hf-g3"
                aria-describedby="hf-jd" onChange={(e) => {
                  setJd(e.target.value);
                  setJdOwn(true);
                }} />
              <small id="hf-jd">Starts from the template for the role; edit
                freely.</small>
            </div>
            <div className={`${h.actions} ${h.wide}`}>
              <button type="button" className={`${b.btn} ${b.secondary}`}
                disabled={!jdOwn}
                onClick={() => {
                  setJd(data.hiring.jobDescription(jobKey, dept));
                  setJdOwn(false);
                }}>
                <Icon name="undo" size={16} />
                Start again from the template</button>
            </div>
          </section>

          <section className={h.group} aria-labelledby="hf-g4">
            <h2 id="hf-g4" className={h.section}>Criteria</h2>
            <label className={h.field}>
              <span>Must have</span>
              <textarea value={must}
                onChange={(e) => setMust(e.target.value)} />
              <small>One per line.</small>
            </label>
            <label className={h.field}>
              <span>Nice to have</span>
              <textarea value={nice}
                onChange={(e) => setNice(e.target.value)} />
              <small>One per line.</small>
            </label>
          </section>

          <section className={h.group} aria-labelledby="hf-g5">
            <h2 id="hf-g5" className={h.section}>Interview stages</h2>
            <ol className={`${h.stages} ${h.wide}`}>
              {stages.map((x, i) => (
                <li key={i} className={h.stage}>
                  <span className={h.stageNo} aria-hidden="true">
                    {i + 1}</span>
                  <label className={h.stageField}>
                    <span className="visually-hidden">
                      {`Stage ${i + 1}`}</span>
                    <input value={x.name} onChange={(e) =>
                      setStages(stages.map((y, j) => j === i
                        ? { ...y, name: e.target.value } : y))} />
                    <small>{`Panel: ${x.panel.map((q) => q.name)
                      .join(", ")}`}</small>
                  </label>
                  <button type="button" className={h.remove}
                    disabled={stages.length === 1}
                    aria-label={`Remove stage ${i + 1}`}
                    onClick={() =>
                      setStages(stages.filter((_, j) => j !== i))}>
                    <Icon name="x" size={16} /></button>
                </li>
              ))}
            </ol>
            <div className={`${h.actions} ${h.wide}`}>
              <button type="button" className={`${b.btn} ${b.secondary}`}
                onClick={() => setStages([...stages, {
                  name: "Another round",
                  panel: data.hiring.stages(boss)[1]!.panel }])}>
                Add a stage</button>
            </div>
          </section>

          {problems.length > 0 && (
            <p className={h.problems} role="alert">{problems.join(" ")}</p>
          )}
        </form>
        <CostSummary cost={cost} title={role.title} staff={staff}
          locked={locked} />
      </div>
      <div className={h.bar} role="group" aria-label="Request actions">
        <p className={h.barText}>
          <span className={h.barCost}>First-year cost <Money
            value={cost.firstYear} size="sm" />
          {cost.leftAfter < 0n && (staff || locked) && <strong>, over
            budget</strong>}</span>
          <span className={h.barHint} data-saved={savedNow}
            role="status">{savedNow ? "Draft saved. Only you can see it."
              : "HR reviews it first, then the General manager signs off."}
          </span>
        </p>
        <div className={h.barActions}>
          <button type="button" className={`${b.btn} ${b.secondary}`}
            onClick={saveDraft}>Save draft</button>
          <button type="submit" form="hire-form"
            className={`${b.btn} ${b.primary}`}>Send for sign-off</button>
        </div>
      </div>
    </div>
  );
}

/**
 * The live cost: one person's month, everyone's first year and the
 * budget it is measured against, each with its working. Over budget
 * is said in words, never by colour alone. A manager sees the cost of
 * their own request, not the company's budget.
 */
function CostSummary(p: { cost: HireCost; title: string; staff: boolean;
  locked: boolean }) {
  const { data } = useDemo();
  const c = p.cost;
  const ex = data.hiring.explain;
  const over = c.leftAfter < 0n;
  const showLeft = p.staff || c.position !== null;
  const leftLabel = c.position !== null ? "Budget left for the position"
    : "Left unspent today";
  const gap = <Money value={(over ? -c.leftAfter : c.leftAfter) as Fils}
    size="sm" tween={false} />;
  const verdict = c.position !== null
    ? over ? <>Over budget by {gap}. Lower the headcount, or ask the
      General manager to change the budget.</>
      : <>Within budget: {gap} left after this hire.</>
    : !p.staff ? <>A new position: the General manager signs off this
      first-year cost as its budget.</>
      : over ? <>More than is left unspent today, by {gap}. A new
        position brings its own budget once the General manager signs
        it off.</>
        : <>{gap} less than is left unspent today. A new position brings
          its own budget once it is signed off.</>;
  return (
    <aside className={h.summary} aria-labelledby="hf-sum">
      <h2 id="hf-sum" className={h.summaryTitle}>Cost summary</h2>
      <p className={h.summaryLede}>{`${p.title}, grade ${c.cost.grade}, ` +
        `${c.headcount === 1 ? "1 person" : `${c.headcount} people`}, ` +
        `from ${c.cost.startText}`}</p>
      <dl className={h.summaryFigures}>
        <div>
          <dt>A full month, each</dt>
          <dd><Explainable explanation={ex.monthly(`ask:${p.title}`,
            p.title, c.cost)}>
            <Money value={c.cost.monthly} size="sm" />
          </Explainable></dd>
        </div>
        <div>
          <dt>First-year cost</dt>
          <dd><Explainable explanation={ex.hire(`ask:${p.title}`, p.title,
            c.cost, c.headcount)}>
            <Money value={c.firstYear} size="md" />
          </Explainable></dd>
        </div>
        {showLeft && (
          <div>
            <dt>{leftLabel}</dt>
            <dd><Money value={c.leftNow} size="sm" /></dd>
          </div>
        )}
        {showLeft && (
          <div>
            <dt>{c.position !== null ? "Left after this hire"
              : "Unspent less this cost"}</dt>
            <dd><Explainable explanation={ex.after(`ask:${p.title}`,
              p.title, { leftLabel, leftNow: c.leftNow,
                lessLabel: "First-year cost", less: c.firstYear,
        ...(c.position === null ? { heading: "Unspent less this cost",
          result: "Unspent less this cost" } : {}) })}>
              <Money value={c.leftAfter} size="sm" />
            </Explainable></dd>
          </div>
        )}
      </dl>
      <p className={h.verdict} data-over={over && showLeft}
        role="status">
        {over && showLeft && <Icon name="alert" size={16} />}
        <span>{verdict}</span>
      </p>
      <p className={h.quiet}>{p.locked ? "Costed at the foot of the " +
        "grade, as the budget rows are." : "Costed at the foot of the " +
        "grade. Visa, medical, insurance and gratuity are not included."}
      </p>
    </aside>
  );
}
