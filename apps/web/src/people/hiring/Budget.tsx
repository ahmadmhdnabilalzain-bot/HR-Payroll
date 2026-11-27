import { useMemo, useState, type ReactNode } from "react";
import { Explainable } from "../../components/explain";
import type { BudgetStatus, PositionCost } from "../../demo/data/hiring-types";
import { nextAskId } from "../../demo/hiring-state";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { Money } from "../../ui/Money";
import b from "../../ui/button.module.css";
import { useToast } from "../../ui/Toast";
import {
  FilterList,
  KeyValues,
  RecordTabs,
  Sheet,
  type StatusTone,
} from "../../ui/templates";
import { Dot } from "../moves/Dot";
import { Picker } from "../Picker";
import { BudgetMeter, MeterKey } from "./Meter";
import type { Tone } from "../moves/view";
import { useActor } from "../moves/view";
import { Outside } from "../../shell/Outside";
import {
  asksNow,
  budgetRows,
  freePositions,
  requestHref,
  requestsNow,
  rowAfterAsk,
  type BudgetRow,
} from "./model";
import h from "./hiring.module.css";

export const BUDGET_TONE: Record<BudgetStatus, Tone> = { budgeted: "neutral",
  open: "info", "in-hiring": "info", filled: "neutral" };
const PILL: Record<BudgetStatus, StatusTone> = { budgeted: "neutral",
  open: "warn", "in-hiring": "warn", filled: "neutral" };

const signWord = (r: BudgetRow): string => r.pending !== null
  ? "Change waiting" : r.budgetState === "waiting" ? "Waiting"
    : "Signed off";

const budgetHref = (id: string): string =>
  hrefOf("people", "hiring", "budget", id);

/** P20, renamed: positions management has budgeted, with spend. */
export function BudgetList() {
  const { data, state } = useDemo();
  const rows = budgetRows(data, state);
  const [dept, setDept] = useState("all");
  const [adding, setAdding] = useState(false);
  const shown = rows.filter((r) => dept === "all" || r.departmentId === dept);
  const t = data.hiring.totals(shown);
  const ex = data.hiring.explain;
  const line = (f: (r: BudgetRow) => bigint) => shown.map((r) => ({
    title: `${r.title}, ${r.departmentText}`,
    value: f(r) as BudgetRow["left"] }));
  const depts = data.hiring.departments().filter((d) =>
    rows.some((r) => r.departmentId === d.id));
  const st = (id: BudgetStatus) => ({ id, label:
    data.hiring.budgetStatusText[id], match: (r: BudgetRow) =>
    r.status === id });
  return (
    <>
      <FilterList title="Hiring budget" rows={shown}
        lede={"Positions the General manager has budgeted, by " +
          "department, and what is spent against each."}
        rowKey={(r) => r.id}
        rowHref={(r) => budgetHref(r.id)}
        searchText={(r) => `${r.title} ${r.departmentText} ${r.ownerName}`}
        filters={(
          <Picker label="Department" value={dept} onChange={setDept}
            options={[{ value: "all", label: "All departments" },
              ...depts.map((d) => ({ value: d.id, label: d.text }))]} />
        )}
        summary={[]}
        meta={(
          <div className={h.stack}>
          <dl className={h.figures} aria-label="Budget and spend">
            <div><dt>First-year budget</dt><dd>
              <Explainable explanation={ex.total("First-year budget",
                line((r) => r.cost.firstYear))}>
                <Money value={t.firstYear} size="md" tween={false} />
              </Explainable></dd></div>
            <div><dt>Committed</dt><dd>
              <Explainable explanation={ex.total("Committed",
                line((r) => r.committed?.amount ?? 0n))}>
                <Money value={t.committed} size="md" tween={false} />
              </Explainable></dd></div>
            <div><dt>Offered</dt><dd>
              <Explainable explanation={ex.total("Offered",
                line((r) => r.offered?.amount ?? 0n))}>
                <Money value={t.offered} size="md" tween={false} />
              </Explainable></dd></div>
            <div><dt>Left</dt><dd>
              <Explainable explanation={ex.total("Left",
                line((r) => r.left))}>
                <Money value={t.left} size="md" tween={false} />
              </Explainable></dd></div>
          </dl>
          <div className={h.meterBlock}>
            <BudgetMeter size="md" label="All positions shown"
              firstYear={t.firstYear} committed={t.committed}
              offered={t.offered} />
            <MeterKey />
          </div>
          <details className={h.basis}>
            <summary>How the budget is worked out</summary>
            <p className={h.quiet}>{data.hiring.budgetBasis}</p>
          </details>
          </div>
        )}
        segments={[{ id: "all", label: "All", match: () => true },
          st("budgeted"), st("open"), st("in-hiring"), st("filled")]}
        columns={[
          { key: "p", label: "Position", render: (r) => r.title },
          { key: "d", label: "Department", render: (r) => r.departmentText },
          { key: "o", label: "Owner", render: (r) => r.ownerName },
          { key: "s", label: "Status", render: (r) => (
            <Dot tone={BUDGET_TONE[r.status]}>
              {data.hiring.budgetStatusText[r.status]}</Dot>
          ) },
          { key: "g", label: "Sign-off", render: signWord },
          { key: "y", label: "First year", end: true, render: (r) => (
            <Money value={r.cost.firstYear} size="sm" tween={false} />
          ) },
          { key: "l", label: "Left", end: true, render: (r) => (
            <Money value={r.left} size="sm" tween={false} />
          ) },
          { key: "m", label: "Spend", render: (r) => (
            <span className={h.meterCell}><BudgetMeter
              label={r.title} firstYear={r.cost.firstYear}
              committed={(r.committed?.amount ?? 0n) as BudgetRow["left"]}
              offered={(r.offered?.amount ?? 0n) as BudgetRow["left"]} />
            </span>
          ) }]}
        actions={state.role === "gm" ? (
          <button type="button" className={`${b.btn} ${b.primary}`}
            onClick={() => setAdding(true)}>Add a position</button>
        ) : undefined}
        empty="No positions here. Choose another department or status." />
      <AddPosition open={adding} onClose={() => setAdding(false)} />
    </>
  );
}

/** The engine's month and year for a budget, as two small tables. */
export function CostTables(p: { cost: PositionCost; title: string }) {
  const c = p.cost;
  return (
    <div className={h.stack}>
      <div className={h.tableWrap} tabIndex={0} role="region"
        aria-label="A full month">
        <table className={h.table}>
          <caption>{`A full month for ${p.title}, ` +
            `grade ${c.grade}`}</caption>
          <thead><tr><th scope="col">Part of pay</th>
            <th scope="col" data-end="true">A month</th></tr></thead>
          <tbody>
            {c.parts.map((x) => (
              <tr key={x.code}><th scope="row">{x.label}</th>
                <td data-end="true"><Money value={x.monthly} size="sm"
                  tween={false} /></td></tr>
            ))}
            <tr className={h.total}><th scope="row">Gross pay</th>
              <td data-end="true"><Money value={c.monthly} size="sm"
                tween={false} /></td></tr>
          </tbody>
        </table>
      </div>
      <div className={h.tableWrap} tabIndex={0} role="region"
        aria-label="First year by month">
        <table className={h.table}>
          <caption>{`Twelve payroll months from ${c.startText}`}</caption>
          <thead><tr><th scope="col">Month</th>
            <th scope="col" data-end="true">Gross pay</th></tr></thead>
          <tbody>
            {c.months.map((m) => (
              <tr key={m.month}>
                <th scope="row">{m.part ? `${m.label}, part month`
                  : m.label}</th>
                <td data-end="true"><Money value={m.gross} size="sm"
                  tween={false} /></td></tr>
            ))}
            <tr className={h.total}><th scope="row">First year</th>
              <td data-end="true"><Money value={c.firstYear} size="sm"
                tween={false} /></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** One budgeted position: its figures, spend and sign-offs. */
export function BudgetRecord(p: { id: string }) {
  const { data, state, dispatch } = useDemo();
  const actor = useActor();
  const toast = useToast();
  const rows = budgetRows(data, state);
  const r = rows.find((x) => x.id === p.id);
  const [asking, setAsking] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [note, setNote] = useState("");
  if (r === undefined) return <Outside missing />;
  const reqs = requestsNow(data, state);
  const ex = data.hiring.explain;
  const free = freePositions(rows, reqs).some((x) => x.id === r.id);
  const ask = r.pending;
  const mineAsk = ask !== null && ask.by === actor.id &&
    state.budgetAsks.some((x) => x.id === ask.id);
  const decidedHere = asksNow(data, state).filter((a) =>
    a.budgetId === r.id && a.decision !== null && a.decision.by ===
    actor.id && state.budgetDecisions[a.id] !== undefined &&
    a.kind === "change").at(-1);
  const decide = (verdict: "signed-off" | "declined", why: string): void => {
    if (ask === null) return;
    dispatch({ type: "budget-decide", decision: { askId: ask.id, verdict,
      note: why, by: actor.id, role: actor.role, on: actor.on } });
    toast.show(`${r.title}: budget change ${verdict === "signed-off"
      ? "signed off" : "declined"}`, () =>
      dispatch({ type: "budget-undecide", askId: ask.id }));
  };
  const req = reqs.find((x) => x.id === r.requestId);
  const history = [
    ...(r.signedOff === null ? [] : [{ when: r.signedOff.on.display,
      what: `Budget signed off by ${r.signedOff.name}` }]),
    ...asksNow(data, state).filter((a) => a.budgetId === r.id)
      .flatMap((a) => [{ when: a.onText, what: `${a.byName} asked to ` +
        `move the budget to ${data.hiring.stepText(a.grade, a.steps)
          .toLowerCase()}` }, ...(a.decision === null ? [] : [{
        when: data.hiring.dateText(a.decision.on),
        what: `${data.people.person(a.decision.by)?.name.en ?? ""} ` +
          (a.decision.verdict === "signed-off" ? "signed off the change"
            : "declined the change") }])])];
  const nextText: string | undefined = ask !== null
    ? `${ask.byName} asked on ${ask.onText} to move the budget to ` +
      `${data.hiring.stepText(ask.grade, ask.steps).toLowerCase()}. ` +
      "The General manager signs it off or declines it."
    : r.budgetState === "waiting" ? "The budget waits for the General " +
      "manager's sign-off on the hiring request." : undefined;
  const actions = (
    <div className={h.actions}>
      {state.role === "gm" && ask !== null && (
        <>
          <button type="button" className={`${b.btn} ${b.primary}`}
            onClick={() => decide("signed-off", "")}>
            Sign off the change</button>
          <button type="button" className={`${b.btn} ${b.secondary}`}
            onClick={() => setDeclining(true)}>Decline</button>
        </>
      )}
      {state.role === "gm" && ask === null && decidedHere !== undefined && (
        <button type="button" className={`${b.btn} ${b.quiet}`}
          onClick={() => dispatch(decidedHere.by === actor.id &&
            state.budgetAsks.some((x) => x.id === decidedHere.id)
            ? { type: "budget-ask-undo", id: decidedHere.id }
            : { type: "budget-undecide", askId: decidedHere.id })}>
          Undo</button>
      )}
      {(state.role === "hr" || state.role === "gm") && ask === null && (
        <button type="button" className={`${b.btn} ${b.secondary}`}
          onClick={() => setAsking(true)}>{state.role === "gm"
            ? "Change the budget" : "Ask for a budget change"}</button>
      )}
      {mineAsk && (
        <button type="button" className={`${b.btn} ${b.quiet}`}
          onClick={() => dispatch({ type: "budget-ask-undo",
            id: ask.id })}>Take back the ask</button>
      )}
      {free && (
        <a className={`${b.btn} ${b.secondary}`} href={hrefOf("people",
          "hiring", "requests", "new", r.id)}>Request a hire</a>
      )}
    </div>
  );
  return (
    <>
      <RecordTabs title={r.title}
        lede={`${r.departmentText}, ${r.locationText}`}
        back={{ label: "Hiring budget", href: hrefOf("people", "hiring",
          "budget") }}
        status={{ word: data.hiring.budgetStatusText[r.status],
          tone: PILL[r.status] }}
        stats={ask !== null ? askStats(r, rowAfterAsk(data, r, ask)) : [
          { label: "A full month", value: (
            <Explainable explanation={ex.monthly(r.id, r.title, r.cost)}>
              <Money value={r.cost.monthly} tween={false} />
            </Explainable>) },
          { label: "First-year budget", value: (
            <Explainable explanation={ex.firstYear(r.id, r.title, r.cost)}>
              <Money value={r.cost.firstYear} tween={false} />
            </Explainable>) },
          { label: "Left", value: (
            <Explainable explanation={ex.left(r.id, r.title, {
              firstYear: r.cost.firstYear, committed: r.committed,
              offered: r.offered })}>
              <Money value={r.left} tween={false} />
            </Explainable>) }]}
        {...(nextText === undefined ? {} : { next: nextText })}
        actions={actions}
        history={history}
        tabs={[
          { id: "budget", label: "Budget", render: () => (
            <div className={h.stack}>
              <div className={h.meterBlock}>
                <BudgetMeter size="md" label={r.title}
                  firstYear={r.cost.firstYear}
                  committed={(r.committed?.amount ?? 0n) as
                    BudgetRow["left"]}
                  offered={(r.offered?.amount ?? 0n) as
                    BudgetRow["left"]} />
                <MeterKey />
              </div>
              <KeyValues items={[
                { label: "Department", value: r.departmentText },
                { label: "Owner", value: r.ownerName },
                { label: "Budgeted at", value: r.gradeText },
                { label: "Start", value: r.start.display },
                { label: "Sign-off", value: r.signedOff === null
                  ? "Waiting for the General manager"
                  : `${r.signedOff.name}, ${r.signedOff.on.display}` },
                { label: "Committed", value: r.committed === null
                  ? "Nothing yet" : <>{`${r.committed.label}, ` +
                    `${r.committed.who}: `}<Money
                    value={r.committed.amount} size="sm" tween={false} /></> },
                { label: "Offered", value: r.offered === null
                  ? "Nothing yet" : <>{`${r.offered.label}, ` +
                    `${r.offered.who}: `}<Money
                    value={r.offered.amount} size="sm" tween={false} /></> },
                { label: "Hiring request", value: req === undefined
                  ? "None yet" : <a className={h.link}
                    href={requestHref(req.id)}>{`${req.number}, ` +
                    data.hiring.statusText[req.status].toLowerCase()}</a> },
              ]} />
              <p className={h.quiet}>{r.note}</p>
            </div>
          ) },
          { id: "months", label: "Pay by month", render: () => (
            <CostTables cost={r.cost} title={r.title} />
          ) }]} />
      <AskChange row={r} open={asking} onClose={() => setAsking(false)} />
      <Sheet open={declining} title="Decline the budget change"
        onClose={() => setDeclining(false)}>
        <form className={h.stack} onSubmit={(e) => {
          e.preventDefault();
          if (note.trim() === "") return;
          decide("declined", note.trim());
          setNote("");
          setDeclining(false);
        }}>
          <label className={h.field}>
            <span>Why (HR sees this)</span>
            <textarea value={note} required
              onChange={(e) => setNote(e.target.value)} />
          </label>
          <div className={h.actions}>
            <button type="submit" className={`${b.btn} ${b.primary}`}>
              Decline</button>
          </div>
        </form>
      </Sheet>
    </>
  );
}

/**
 * A change waiting for the General manager: the budget now, the first
 * year asked, and what would be left once it is signed off, each with
 * its working, so the decision is made with the cost in view.
 */
function askStats(r: BudgetRow, after: BudgetRow) {
  return [
    { label: "First-year budget now", value: (
      <ExplainHere k={r.id} row={r} kind="year">
        <Money value={r.cost.firstYear} tween={false} />
      </ExplainHere>) },
    { label: "First year if signed off", value: (
      <ExplainHere k={`${r.id}:ask`} row={after} kind="year">
        <Money value={after.cost.firstYear} tween={false} />
      </ExplainHere>) },
    { label: "Left if signed off", value: (
      <ExplainHere k={`${r.id}:ask`} row={after} kind="left">
        <Money value={after.left} tween={false} />
      </ExplainHere>) }];
}

function ExplainHere(p: { k: string; row: BudgetRow; kind: "year" |
  "left"; children: ReactNode }) {
  const { data } = useDemo();
  const ex = data.hiring.explain;
  const r = p.row;
  return (
    <Explainable explanation={p.kind === "year"
      ? ex.firstYear(p.k, r.title, r.cost) : ex.left(p.k, r.title, {
        firstYear: r.cost.firstYear, committed: r.committed,
        offered: r.offered })}>{p.children}</Explainable>
  );
}

/** HR asks the General manager to move a position's budget. */
function AskChange(p: { row: BudgetRow; open: boolean; onClose(): void }) {
  const { data, state, dispatch } = useDemo();
  const actor = useActor();
  const toast = useToast();
  const role = data.hiring.roles().find((x) => x.jobKey === p.row.jobKey);
  const [grade, setGrade] = useState(p.row.grade);
  const [steps, setSteps] = useState(Math.min(p.row.steps + 1,
    data.hiring.maxSteps));
  const [why, setWhy] = useState("");
  const [problem, setProblem] = useState("");
  const gm = state.role === "gm";
  const cost = useMemo(() => data.hiring.cost(grade, steps, p.row.startIso),
    [data, grade, steps, p.row.startIso]);
  const lo = Math.min(role?.gradeMin ?? p.row.grade, p.row.grade);
  const hi = Math.max(role?.gradeMax ?? p.row.grade, p.row.grade);
  return (
    <Sheet open={p.open} title={gm ? "Change the budget"
      : "Ask for a budget change"} onClose={p.onClose}>
      <form className={h.stack} onSubmit={(e) => {
        e.preventDefault();
        if (grade === p.row.grade && steps === p.row.steps) {
          setProblem("Choose a grade or step that differs from today's.");
          return;
        }
        if (why.trim() === "") {
          setProblem(gm ? "Say why, for HR and the trail."
            : "Say why, so the General manager can decide.");
          return;
        }
        const id = nextAskId(state);
        dispatch({ type: "budget-ask", ask: { kind: "change",
          budgetId: p.row.id, grade, steps, reason: why.trim(),
          jobKey: p.row.jobKey, departmentId: p.row.departmentId,
          startIso: p.row.startIso, by: actor.id, role: actor.role,
          on: actor.on } });
        toast.show(gm ? `${p.row.title}: budget changed and signed off`
          : `${p.row.title}: budget change sent to the General manager`,
        () => dispatch({ type: "budget-ask-undo", id }));
        setWhy("");
        setProblem("");
        p.onClose();
      }}>
        <label className={h.field}>
          <span>Grade</span>
          <select value={grade} onChange={(e) =>
            setGrade(Number(e.target.value))}>
            {Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).map((g) => (
              <option key={g} value={g}>{`Grade ${g}`}</option>
            ))}
          </select>
        </label>
        <label className={h.field}>
          <span>Steps above the foot of the band</span>
          <select value={steps} onChange={(e) =>
            setSteps(Number(e.target.value))}>
            {Array.from({ length: data.hiring.maxSteps + 1 }, (_, i) => i)
              .map((n) => <option key={n} value={n}>{String(n)}</option>)}
          </select>
        </label>
        <dl className={h.figures}>
          <div><dt>First year now</dt><dd><Money
            value={p.row.cost.firstYear} size="sm" tween={false} /></dd></div>
          <div><dt>First year asked</dt><dd><Money value={cost.firstYear}
            size="sm" tween={false} /></dd></div>
        </dl>
        <label className={h.field}>
          <span>Why</span>
          <textarea value={why} onChange={(e) => setWhy(e.target.value)} />
        </label>
        {problem !== "" && <p className={h.problems} role="alert">
          {problem}</p>}
        <div className={h.actions}>
          <button type="submit" className={`${b.btn} ${b.primary}`}>
            {gm ? "Change and sign off" : "Send to the General manager"}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

/** The General manager adds a budgeted position: his own sign-off. */
function AddPosition(p: { open: boolean; onClose(): void }) {
  const { data, state, dispatch } = useDemo();
  const actor = useActor();
  const toast = useToast();
  const depts = data.hiring.departments();
  const [dept, setDept] = useState(depts[0]!.id);
  const roles = data.hiring.roles().filter((r) =>
    r.departmentIds.includes(dept));
  const [jobKey, setJobKey] = useState(roles[0]?.jobKey ?? "");
  const role = roles.find((r) => r.jobKey === jobKey) ?? roles[0];
  const [grade, setGrade] = useState(role?.gradeMin ?? 3);
  const [steps, setSteps] = useState(0);
  const [start, setStart] = useState(data.hiring.addDays(data.hiring.asOf,
    69));
  const [why, setWhy] = useState("");
  const [problem, setProblem] = useState("");
  const g = role === undefined ? grade : Math.min(Math.max(grade,
    role.gradeMin), role.gradeMax);
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(start) && start > data.hiring.asOf &&
    start <= data.hiring.lastStart;
  const cost = useMemo(() => ok ? data.hiring.cost(g, steps, start) : null,
    [data, g, steps, start, ok]);
  if (state.role !== "gm") return null;
  return (
    <Sheet open={p.open} title="Add a budgeted position" onClose={p.onClose}>
      <form className={h.stack} onSubmit={(e) => {
        e.preventDefault();
        if (role === undefined || !ok) {
          setProblem(`Choose a role and a start after ` +
            `${data.hiring.dateText(data.hiring.asOf)}.`);
          return;
        }
        const id = nextAskId(state);
        dispatch({ type: "budget-ask", ask: { kind: "add", budgetId: null,
          grade: g, steps, reason: why.trim() === ""
            ? "Added by the General manager." : why.trim(),
          jobKey: role.jobKey, departmentId: dept, startIso: start,
          by: actor.id, role: actor.role, on: actor.on } });
        toast.show(`${role.title}: budget added and signed off`, () =>
          dispatch({ type: "budget-ask-undo", id }));
        setProblem("");
        p.onClose();
      }}>
        <label className={h.field}>
          <span>Department</span>
          <select value={dept} onChange={(e) => {
            setDept(e.target.value);
            const first = data.hiring.roles().find((r) =>
              r.departmentIds.includes(e.target.value));
            setJobKey(first?.jobKey ?? "");
            setGrade(first?.gradeMin ?? 3);
          }}>
            {depts.map((d) => <option key={d.id} value={d.id}>{d.text}
            </option>)}
          </select>
        </label>
        <label className={h.field}>
          <span>Role</span>
          <select value={role?.jobKey ?? ""} onChange={(e) => {
            setJobKey(e.target.value);
            setGrade(roles.find((r) => r.jobKey === e.target.value)
              ?.gradeMin ?? 3);
          }}>
            {roles.map((r) => <option key={r.jobKey} value={r.jobKey}>
              {r.title}</option>)}
          </select>
        </label>
        <label className={h.field}>
          <span>Grade</span>
          <select value={g} onChange={(e) => setGrade(Number(e.target.value))}>
            {role !== undefined && Array.from({ length: role.gradeMax -
              role.gradeMin + 1 }, (_, i) => role.gradeMin + i).map((x) => (
              <option key={x} value={x}>{`Grade ${x}`}</option>))}
          </select>
        </label>
        <label className={h.field}>
          <span>Steps above the foot of the band</span>
          <select value={steps} onChange={(e) =>
            setSteps(Number(e.target.value))}>
            {Array.from({ length: data.hiring.maxSteps + 1 }, (_, i) => i)
              .map((n) => <option key={n} value={n}>{String(n)}</option>)}
          </select>
        </label>
        <label className={h.field}>
          <span>Start</span>
          <input type="date" value={start} min={data.hiring.asOf}
            max={data.hiring.lastStart}
            onChange={(e) => setStart(e.target.value)} />
        </label>
        {cost !== null && (
          <dl className={h.figures}>
            <div><dt>A full month</dt><dd><Money value={cost.monthly}
              size="sm" tween={false} /></dd></div>
            <div><dt>First year</dt><dd><Money value={cost.firstYear}
              size="sm" tween={false} /></dd></div>
          </dl>
        )}
        <label className={h.field}>
          <span>Why this position</span>
          <textarea value={why} onChange={(e) => setWhy(e.target.value)} />
        </label>
        {problem !== "" && <p className={h.problems} role="alert">
          {problem}</p>}
        <div className={h.actions}>
          <button type="submit" className={`${b.btn} ${b.primary}`}>
            Add and sign off</button>
        </div>
      </form>
    </Sheet>
  );
}
