import { useState } from "react";
import type { Urgency } from "../../demo/data/hiring-types";
import { nextRequestId } from "../../demo/hiring-state";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { personFor } from "../../demo/time-off";
import { Money } from "../../ui/Money";
import b from "../../ui/button.module.css";
import { useToast } from "../../ui/Toast";
import { PageHead } from "../../ui/templates";
import tp from "../../ui/templates/templates.module.css";
import { useActor } from "../moves/view";
import { budgetRows, freePositions, requestHref, requestsNow } from "./model";
import h from "./hiring.module.css";

const lines = (s: string): string[] => s.split("\n").map((x) => x.trim())
  .filter((x) => x !== "");

/**
 * "Request a hire": a hiring manager, HR or the General manager asks
 * for a person. It goes to HR's queue (a task and a note on Home, no
 * email); the job description starts from a template and stays text.
 */
export function RequestForm(p: { budgetId: string | null }) {
  const { data, state, dispatch } = useDemo();
  const actor = useActor();
  const toast = useToast();
  const me = personFor(data, state.role);
  const manager = state.role === "manager";
  const own = data.people.person(me)?.departmentId ?? "";
  const free = freePositions(budgetRows(data, state),
    requestsNow(data, state)).filter((x) => !manager ||
    x.departmentId === own);
  const allRoles = data.hiring.roles();
  const depts = data.hiring.departments();
  const pick0 = free.find((x) => x.id === p.budgetId) ?? null;
  const dept0 = pick0?.departmentId ?? (manager ? own : depts[0]!.id);
  const rolesIn = (d: string) => {
    const xs = allRoles.filter((r) => r.departmentIds.includes(d));
    return xs.length > 0 ? xs : allRoles;
  };
  const job0 = pick0?.jobKey ?? rolesIn(dept0)[0]!.jobKey;
  const grade0 = pick0?.grade ??
    allRoles.find((r) => r.jobKey === job0)!.gradeMin;
  const boss0 = pick0?.ownerId ?? (manager ? me
    : data.hiring.hiringManagerFor(dept0));
  const asOf = data.hiring.asOf;
  const [budgetId, setBudgetId] = useState<string | null>(pick0?.id ?? null);
  const [dept, setDept] = useState(dept0);
  const [jobKey, setJobKey] = useState(job0);
  const [grade, setGrade] = useState(grade0);
  const [reason, setReason] = useState<"new" | "replacement">("new");
  const [replaces, setReplaces] = useState("");
  const [headcount, setHeadcount] = useState("1");
  const [start, setStart] = useState(pick0 !== null &&
    pick0.startIso > asOf ? pick0.startIso : data.hiring.addDays(asOf, 69));
  const [urgency, setUrgency] = useState<Urgency>("normal");
  const [ttf, setTtf] = useState("45");
  const [jd, setJd] = useState(data.hiring.jobDescription(job0, dept0));
  const [jdOwn, setJdOwn] = useState(false);
  const crit0 = data.hiring.criteria(job0);
  const [must, setMust] = useState(crit0.mustHave.join("\n"));
  const [nice, setNice] = useState(crit0.niceToHave.join("\n"));
  const [boss, setBoss] = useState(boss0);
  const [stages, setStages] = useState(data.hiring.stages(boss0));
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

  const submit = (): void => {
    const draft = { jobKey, departmentId: dept, budgetId, reason,
      replacesName: replaces.trim(), headcount: Number(headcount),
      startIso: start, urgency, timeToFillDays: Number(ttf), grade,
      jobDescription: jd, mustHave: lines(must), niceToHave: lines(nice),
      stages: stages.filter((x) => x.name.trim() !== ""),
      hiringManagerId: boss };
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
    toast.show(`${role.title}: request sent to HR`, () =>
      dispatch({ type: "hiring-raise-undo", id }));
    location.hash = requestHref(id);
  };

  return (
    <div className={tp.page}>
      <PageHead title="Request a hire"
        back={{ label: "Hiring requests", href: hrefOf("people", "hiring",
          "requests") }}
        lede={"HR receives it in their queue, reviews it, and the " +
          "General manager signs off the budget. Every question stays " +
          "on the request."} />
      <form className={h.form} noValidate aria-label="Request a hire"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}>
        <h2 className={h.section}>The position</h2>
        <label className={h.field}>
          <span>Position</span>
          <select value={budgetId ?? ""} onChange={(e) =>
            choosePosition(e.target.value)}>
            <option value="">A new position (needs a budget)</option>
            {free.map((x) => (
              <option key={x.id} value={x.id}>{`Budgeted: ${x.title}, ` +
                x.departmentText}</option>
            ))}
          </select>
          <small>{locked ? "The budget is already signed off."
            : "The General manager signs off the budget with the request."}
          </small>
        </label>
        <label className={h.field}>
          <span>Department</span>
          <select value={dept} disabled={locked || manager}
            onChange={(e) => setDepartment(e.target.value)}>
            {depts.map((d) => <option key={d.id} value={d.id}>{d.text}
            </option>)}
          </select>
        </label>
        <label className={h.field}>
          <span>Role</span>
          <select value={jobKey} disabled={locked}
            onChange={(e) => setRole(e.target.value)}>
            {rolesIn(dept).map((r) => <option key={r.jobKey}
              value={r.jobKey}>{r.title}</option>)}
          </select>
        </label>
        <label className={h.field}>
          <span>Grade</span>
          <select value={grade} disabled={locked}
            onChange={(e) => setGrade(Number(e.target.value))}>
            {Array.from({ length: role.gradeMax - role.gradeMin + 1 },
              (_, i) => role.gradeMin + i).map((g) => (
              <option key={g} value={g}>{`Grade ${g}`}</option>))}
          </select>
          <small>Basic pay band: <Money value={band.min} size="sm"
            tween={false} /> to <Money value={band.max} size="sm"
            tween={false} /></small>
        </label>
        <label className={h.field}>
          <span>Reason</span>
          <select value={reason} onChange={(e) =>
            setReason(e.target.value as "new" | "replacement")}>
            <option value="new">A new role</option>
            <option value="replacement">Replaces someone who left</option>
          </select>
        </label>
        {reason === "replacement" && (
          <label className={h.field}>
            <span>Who it replaces</span>
            <input value={replaces}
              onChange={(e) => setReplaces(e.target.value)} />
          </label>
        )}
        <label className={h.field}>
          <span>How many people</span>
          <input type="number" inputMode="numeric" min={1} max={5}
            value={headcount} onChange={(e) => setHeadcount(e.target.value)} />
        </label>

        <h2 className={h.section}>The timeline</h2>
        <label className={h.field}>
          <span>Target start date</span>
          <input type="date" value={start} min={data.hiring.addDays(asOf, 1)}
            max={data.hiring.lastStart}
            onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className={h.field}>
          <span>Days to find someone</span>
          <input type="number" inputMode="numeric" min={14} max={120}
            value={ttf} onChange={(e) => setTtf(e.target.value)} />
          <small>{soon ? "The start comes before this time ends; HR may " +
            "ask to move it." : "From the General manager's sign-off to " +
            "an offer."}</small>
        </label>
        <label className={h.field}>
          <span>Urgency</span>
          <select value={urgency} onChange={(e) =>
            setUrgency(e.target.value as Urgency)}>
            {(["normal", "high", "urgent"] as const).map((u) => (
              <option key={u} value={u}>{data.hiring.urgencyText[u]}
              </option>))}
          </select>
        </label>

        <h2 className={h.section}>Job description and criteria</h2>
        <label className={`${h.field} ${h.wide}`}>
          <span>Job description</span>
          <textarea value={jd} rows={12} onChange={(e) => {
            setJd(e.target.value);
            setJdOwn(true);
          }} />
          <small>Starts from the template for the role; edit freely.</small>
        </label>
        <div className={`${h.actions} ${h.wide}`}>
          <button type="button" className={`${b.btn} ${b.quiet}`}
            onClick={() => {
              setJd(data.hiring.jobDescription(jobKey, dept));
              setJdOwn(false);
            }}>Start again from the template</button>
        </div>
        <label className={h.field}>
          <span>Must have</span>
          <textarea value={must} onChange={(e) => setMust(e.target.value)} />
          <small>One per line.</small>
        </label>
        <label className={h.field}>
          <span>Nice to have</span>
          <textarea value={nice} onChange={(e) => setNice(e.target.value)} />
          <small>One per line.</small>
        </label>

        <h2 className={h.section}>Interview stages</h2>
        <ol className={`${h.stages} ${h.wide}`}>
          {stages.map((x, i) => (
            <li key={i} className={h.stage}>
              <label className={h.field}>
                <span>{`Stage ${i + 1}`}</span>
                <input value={x.name} onChange={(e) => setStages(stages.map(
                  (y, j) => j === i ? { ...y, name: e.target.value } : y))} />
                <small>{`Panel: ${x.panel.map((q) => q.name)
                  .join(", ")}`}</small>
              </label>
              <button type="button" className={`${b.btn} ${b.quiet}`}
                onClick={() => setStages(stages.filter((_, j) => j !== i))}>
                Remove<span className="visually-hidden">{` stage ${i + 1}`}
                </span></button>
            </li>
          ))}
        </ol>
        <div className={`${h.actions} ${h.wide}`}>
          <button type="button" className={`${b.btn} ${b.quiet}`}
            onClick={() => setStages([...stages, { name: "Another round",
              panel: data.hiring.stages(boss)[1]!.panel }])}>
            Add a stage</button>
        </div>

        {problems.length > 0 && (
          <p className={h.problems} role="alert">{problems.join(" ")}</p>
        )}
        <div className={`${h.actions} ${h.wide}`}>
          <button type="submit" className={`${b.btn} ${b.primary}`}>
            Send to HR</button>
          <a className={`${b.btn} ${b.secondary}`} href={hrefOf("people",
            "hiring", "requests")}>Cancel</a>
        </div>
      </form>
    </div>
  );
}
