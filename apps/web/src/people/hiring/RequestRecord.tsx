import type { Fils } from "@payroll/engine";
import { useRef, useState, type ReactNode } from "react";
import { Explainable } from "../../components/explain";
import type {
  MilestoneState,
  RequestStatus,
} from "../../demo/data/hiring-types";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { personFor } from "../../demo/time-off";
import { Outside } from "../../shell/Outside";
import { Money } from "../../ui/Money";
import b from "../../ui/button.module.css";
import { useListFlip } from "../../ui/templates/listEnter";
import m from "../../ui/templates/motion.module.css";
import { useToast } from "../../ui/Toast";
import {
  KeyValues,
  MoreMenu,
  RecordTabs,
  Sheet,
  type RecordStat,
  type StatusTone,
} from "../../ui/templates";
import { Dot } from "../moves/Dot";
import { reqNow, STAGE_WORD, useActor, type Tone } from "../moves/view";
import {
  actsFor,
  budgetRows,
  canSeeRequest,
  candidatesOf,
  hireCost,
  requestsNow,
  timelineOf,
  trackOf,
  undoable,
  type Act,
  type RequestNow,
} from "./model";
import h from "./hiring.module.css";

const PILL: Record<RequestStatus, StatusTone> = { "with-hr": "warn",
  changes: "warn", "with-gm": "warn", open: "ok", "on-hold": "neutral",
  declined: "neutral", withdrawn: "neutral", filled: "done" };

const NEXT: Record<RequestStatus, string> = {
  "with-hr": "HR reviews the request. Then the General manager signs " +
    "off the budget.",
  changes: "HR asked for changes. The person who raised it updates it " +
    "and sends it again.",
  "with-gm": "The General manager signs off the budget, declines it or " +
    "asks for changes.",
  open: "An open position on the hiring board. The timeline shows what " +
    "is due.",
  "on-hold": "On hold. HR or the General manager can resume it.",
  declined: "Declined. Nothing more happens on this request.",
  withdrawn: "Withdrawn. Nothing more happens on this request.",
  filled: "Filled. The new person is on the staff list or joining.",
};

const MILE_TONE: Record<MilestoneState, Tone> = { done: "neutral",
  due: "neutral", overdue: "neutral", waiting: "neutral" };
const MILE_WORD: Record<MilestoneState, string> = { done: "Done",
  due: "Due", overdue: "Overdue", waiting: "Not started" };

/** One hiring request: details, thread, timeline and its decisions. */
export function RequestRecord(p: { id: string }) {
  const { data, state, dispatch } = useDemo();
  const actor = useActor();
  const toast = useToast();
  const me = personFor(data, state.role);
  const [asking, setAsking] = useState<Act | null>(null);
  const [note, setNote] = useState("");
  const [noteProblem, setNoteProblem] = useState("");
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const r = requestsNow(data, state).find((x) => x.id === p.id);
  if (r === undefined) return <Outside missing />;
  if (!canSeeRequest(data, state, r)) return <Outside />;
  const req = data.moves.requisitions().find((x) =>
    x.id === r.requisitionId);
  const acts = actsFor(r, state.role, me);
  const last = undoable(r, me);
  const staff = state.role === "hr" || state.role === "gm";

  /** One undo path: the step and, with it, the requisition. */
  const undoStep = (id: string): void =>
    dispatch({ type: "hiring-step-undo", id });
  const take = (a: Act, why: string): void => {
    const id = `hstep-${state.nextHiring}`;
    const key = req === undefined ? "" : `req:${req.id}`;
    dispatch({ type: "hiring-step", step: { requestId: r.id, to: a.to,
      from: r.status, note: why, by: actor.id, role: actor.role,
      on: actor.on, req: req !== undefined && (a.to === "open" ||
        a.to === "on-hold") ? { key, before: state.moveSteps[key] ?? null,
        set: { value: a.to, from: reqNow(req, state), by: actor.id,
          role: actor.role, on: actor.on } } : null } });
    toast.show(`${r.title}: ${a.id === "resume" ? "resumed"
      : a.label.toLowerCase()}`, () => undoStep(id));
  };
  const start = (a: Act): void => {
    if (a.note === "none") take(a, "");
    else {
      setNote("");
      setNoteProblem("");
      setAsking(a);
    }
  };
  const send = (): void => {
    const text = message.trim();
    if (text === "") return;
    const id = `hmsg-${state.nextHiring}`;
    dispatch({ type: "hiring-message", message: { requestId: r.id, text,
      by: actor.id, role: actor.role, on: actor.on } });
    setMessage("");
    toast.show("Message sent", () =>
      dispatch({ type: "hiring-message-undo", id }));
  };
  const canEdit = (state.role === "hr" && ["with-hr", "with-gm"]
    .includes(r.status)) || (r.status === "changes" &&
    r.raisedById === me);
  const primary = acts.find((a) => a.primary);
  const others = acts.filter((a) => !a.primary);
  const band = data.hiring.band(r.grade);
  const timeline = timelineOf(data, state, r);
  const left = data.hiring.daysLeft(r.signedOffIso, r.timeToFillDays);
  const messages = r.events.filter((e) => e.to === null).length;
  const actions = (
    <div className={h.actions}>
      {last !== null ? (
        <button type="button" className={`${b.btn} ${b.secondary}`}
          onClick={() => undoStep(last.id)}>Undo</button>
      ) : primary !== undefined && (
        <button type="button" className={`${b.btn} ${b.primary}`}
          onClick={() => start(primary)}>{primary.label}</button>
      )}
      {last === null && others.slice(0, 1).map((a) => (
        <button key={a.id} type="button"
          className={`${b.btn} ${b.secondary}`}
          onClick={() => start(a)}>{a.label}</button>
      ))}
      {canEdit && others.length <= 1 && (
        <button type="button" className={`${b.btn} ${b.quiet}`}
          onClick={() => setEditing(true)}>Edit</button>
      )}
      {last === null && others.length > 1 && (
        <MoreMenu label="More actions" items={[
          ...others.slice(1).map((a) => ({ label: a.label,
            onSelect: () => start(a) })),
          ...(canEdit ? [{ label: "Edit the request",
            onSelect: () => setEditing(true) }] : [])]} />
      )}
    </div>
  );
  const deciding = staff && ["with-hr", "changes", "with-gm", "on-hold"]
    .includes(r.status);
  const stats: RecordStat[] = deciding ? costStats(data, state, r)
    : [{ label: "People", value: String(r.headcount) },
      { label: "Target start", value: r.start.display },
      { label: "Time to fill", value: timeline.find((m) =>
        m.key === "offer")?.state === "done" ? "Offer made" : left === null
        ? `${r.timeToFillDays} days` : left < 0
          ? `${-left} days past the target` : `${left} days left` }];
  return (
    <>
      <RecordTabs title={r.title}
        lede={`${r.number}, ${r.departmentText}. Raised by ` +
          `${r.raisedByName} on ${r.raisedOn.display}.`}
        back={{ label: "Hiring requests", href: hrefOf("people", "hiring",
          "requests") }}
        status={{ word: data.hiring.statusText[r.status],
          tone: PILL[r.status] }}
        stats={stats}
        next={deciding ? `${NEXT[r.status]} ${headWords(data, state, r)}`
          : NEXT[r.status]}
        actions={actions}
        tabs={[
          { id: "summary", label: "Summary", render: () => (
            <Summary r={r} band={band} staff={staff} />) },
          { id: "thread", label: `Messages (${messages})`, render: () => (
            <div className={h.stack}>
              <Flip keys={r.events.map((e) => e.id)}>
              <ol className={h.rows} aria-label="Messages and steps">
                {r.events.map((e) => (
                  <li key={e.id} data-key={e.id} className={h.message}>
                    <span className={h.who}>{`${e.name}, ${e.title}, ` +
                      e.on.display}</span>
                    <span>{e.to === null ? e.text : <Dot
                      tone="neutral">{e.text}</Dot>}</span>
                    {e.to === null && e.byId === me &&
                      state.hiringMessages.some((m) => m.id === e.id) && (
                      <span>
                        <button type="button"
                          className={`${b.btn} ${b.quiet}`}
                          onClick={() => dispatch({
                            type: "hiring-message-undo", id: e.id })}>
                          Take back</button>
                      </span>
                    )}
                  </li>
                ))}
              </ol>
              </Flip>
              <form className={h.compose} onSubmit={(e) => {
                e.preventDefault();
                send();
              }}>
                <label className={h.field}>
                  <span>Write a message</span>
                  <textarea value={message} rows={3}
                    onChange={(e) => setMessage(e.target.value)} />
                  <small>Everyone on this request sees it, here and on
                    Home. No email is sent.</small>
                </label>
                <div className={h.actions}>
                  <button type="submit" className={`${b.btn} ${b.secondary}`}
                    disabled={message.trim() === ""}>Send</button>
                </div>
              </form>
            </div>
          ) },
          { id: "jd", label: "Job description", render: () => (
            <p className={h.plain}>{r.jobDescription}</p>) },
          { id: "criteria", label: "Criteria", render: () => (
            <div className={h.stack}>
              <h3>Must have</h3>
              <ul className={h.list}>{r.mustHave.map((x) =>
                <li key={x}>{x}</li>)}</ul>
              <h3>Nice to have</h3>
              {r.niceToHave.length === 0 ? <p className={h.quiet}>None
                listed.</p> : <ul className={h.list}>{r.niceToHave.map((x) =>
                <li key={x}>{x}</li>)}</ul>}
              <h3>Interview stages</h3>
              <ol className={h.list}>{r.stages.map((x) => (
                <li key={x.name}>{`${x.name}: ` +
                  x.panel.map((q) => q.name).join(", ")}</li>))}</ol>
            </div>
          ) },
          { id: "timeline", label: "Timeline", render: () => (
            <div className={h.stack}>
              <Track r={r} />
              <ol className={h.rows} aria-label="Timeline">
                {timeline.map((m, i) => (
                  <li key={m.key} className={h.row}>
                    <span className={h.rowHead}>
                      <span className={h.mileNo} data-state={m.state}
                        aria-hidden="true">{i + 1}</span>{m.label}</span>
                    <span>{m.state === "done" && m.due !== null
                      ? `Target was ${m.due.display}` : m.text}</span>
                    <span className={h.rowEnd} data-state={m.state}>
                      <Dot tone={MILE_TONE[m.state]}>
                      {MILE_WORD[m.state]}</Dot></span>
                  </li>
                ))}
              </ol>
              <p className={h.quiet}>{data.hiring.requestBasis}</p>
            </div>
          ) },
          ...(req === undefined ? [] : [{ id: "candidates",
            label: "Candidates", render: () => (
              <Candidates r={r} />) }]),
        ]} />
      <Sheet open={asking !== null} title={asking?.label ?? ""}
        onClose={() => setAsking(null)}>
        {asking !== null && (
          <form className={h.stack} onSubmit={(e) => {
            e.preventDefault();
            if (asking.note === "required" && note.trim() === "") {
              setNoteProblem("Say what should change, or why.");
              return;
            }
            take(asking, note.trim());
            setAsking(null);
          }}>
            <label className={h.field}>
              <span>{asking.note === "required" ? "What and why"
                : "A note (optional)"}</span>
              <textarea value={note} onChange={(e) =>
                setNote(e.target.value)} />
              <small>It goes in the request's messages for everyone on
                it.</small>
            </label>
            {noteProblem !== "" && <p className={h.problems}
              role="alert">{noteProblem}</p>}
            <div className={h.actions}>
              <button type="submit" className={`${b.btn} ${b.primary}`}>
                {asking.label}</button>
            </div>
          </form>
        )}
      </Sheet>
      {editing && <EditSheet r={r} onClose={() => setEditing(false)} />}
    </>
  );
}

/** "1 person from 18 Jan 2027": the figures' basis, in words. */
function headWords(d: ReturnType<typeof useDemo>["data"],
  s: ReturnType<typeof useDemo>["state"], r: RequestNow): string {
  const c = hireCost(d, s, r);
  const basis = `Costed for ${r.headcount === 1 ? "1 person"
    : `${r.headcount} people`} from ${r.start.display}, at the foot of ` +
    `grade ${r.grade}.`;
  if (c.leftAfter >= 0n) return basis;
  return `${basis} ${c.position !== null ? "Over budget: it costs more " +
    "than the position's budget left." : "It costs more than is left " +
    "unspent today; a new position brings its own budget."}`;
}

/**
 * The decision figures, for HR and the General manager while the
 * request is undecided: the first-year cost, the budget it is measured
 * against, and what is left after it, each with its working. A
 * budgeted position counts against its own budget; a new position is
 * set beside what is left unspent across the budget today.
 */
function costStats(d: ReturnType<typeof useDemo>["data"],
  s: ReturnType<typeof useDemo>["state"], r: RequestNow): RecordStat[] {
  const c = hireCost(d, s, r);
  const ex = d.hiring.explain;
  const rows = budgetRows(d, s);
  const leftLabel = c.position !== null ? "Budget left"
    : "Left unspent today";
  return [
    { label: "First-year cost", value: (
      <Explainable explanation={ex.hire(r.id, r.title, c.cost,
        c.headcount)}>
        <Money value={c.firstYear} tween={false} />
      </Explainable>) },
    { label: leftLabel, value: (
      <Explainable explanation={c.position !== null
        ? ex.left(c.position.id, c.position.title, {
          firstYear: c.position.cost.firstYear,
          committed: c.position.committed, offered: c.position.offered })
        : ex.total(leftLabel, rows.map((x) => ({
          title: `${x.title}, ${x.departmentText}`, value: x.left })))}>
        <Money value={c.leftNow} tween={false} />
      </Explainable>) },
    { label: c.position !== null ? "Left after this hire"
      : "Unspent less this cost", value: (
      <Explainable explanation={ex.after(r.id, r.title, { leftLabel,
        leftNow: c.leftNow, lessLabel: "First-year cost",
        less: c.firstYear })}>
        <Money value={c.leftAfter} tween={false} />
      </Explainable>) }];
}

/**
 * The milestone track: the targets placed by date from the sign-off to
 * the start, today as a marker on the same scale, and a sentence that
 * says whether hiring is on plan or which target is late.
 */
function Track(p: { r: RequestNow }) {
  const { data, state } = useDemo();
  const ms = timelineOf(data, state, p.r);
  const t = trackOf(data, p.r, ms);
  const first = t.late[0];
  const words = p.r.signedOffIso === null
    ? "The targets are set once the General manager signs off."
    : first !== undefined ? `Behind plan: ${first.label.toLowerCase()}, ` +
      `${first.text}.${t.late.length > 1 ? ` ${t.late.length - 1} more ` +
        `${t.late.length === 2 ? "target is" : "targets are"} late.` : ""}`
      : ms.every((m) => m.state === "done") ? "Every target is met."
        : "On plan: every target so far is met.";
  const placed = t.points.filter((x) => x.at !== null);
  return (
    <div className={h.track}>
      <p className={h.trackWords} data-late={first !== undefined}>
        {words}</p>
      {placed.length > 0 && (
        <div className={h.trackLine} role="img" aria-label={`Targets ` +
          `from the sign-off to the start; today is ${t.todayText}.`}>
          <span className={h.trackRail} />
          {placed.map((x, i) => (
            <span key={x.key} className={h.trackDot} data-state={x.state}
              style={{ insetInlineStart: `${(x.at ?? 0) * 100}%` }}
              title={`${x.label}, ${x.dueText}`}>{i + 1}</span>
          ))}
          {t.today !== null && (
            <span className={h.trackToday} data-end={t.today > 0.75}
              style={{ insetInlineStart: `${t.today * 100}%` }}>
              <span>Today</span></span>
          )}
        </div>
      )}
      {placed.length > 0 && (
        <div className={h.trackEnds} aria-hidden="true">
          <span>{`Signed off ${data.hiring.dateText(
            p.r.signedOffIso ?? "")}`}</span>
          <span>{`Starts ${p.r.start.display}`}</span>
        </div>
      )}
    </div>
  );
}

/** The shared list motion on a thread: a message slides in, one taken
 * back fades where it stood (listEnter.ts). */
function Flip(p: { keys: string[]; children: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  useListFlip(host, p.keys);
  return <div className={m.host} ref={host}>{p.children}</div>;
}

function Summary(p: { r: RequestNow; band: { min: Fils; max: Fils };
  staff: boolean }) {
  const { data } = useDemo();
  const r = p.r;
  return (
    <KeyValues items={[
      { label: "Hiring manager", value: r.hiringManagerName },
      { label: "Reason", value: r.reason === "replacement"
        ? `Replaces ${r.replacesName ?? "someone who left"}`
        : "A new role" },
      { label: "Urgency", value: data.hiring.urgencyText[r.urgency] },
      { label: "Days to find someone", value: `${r.timeToFillDays} days, ` +
        "from the sign-off" },
      { label: "Grade", value: `Grade ${r.grade}` },
      { label: "Basic pay band", value: <><Money value={p.band.min}
        size="sm" tween={false} />{" to "}<Money value={p.band.max}
        size="sm" tween={false} /></> },
      { label: "Position", value: r.budgetId === null
        ? "A new position: the budget is signed off with this request"
        : p.staff ? <a className={h.link} href={hrefOf("people", "hiring",
          "budget", r.budgetId)}>Budgeted position</a>
          : "A budgeted position" },
    ]} />
  );
}

function Candidates(p: { r: RequestNow }) {
  const { data, state } = useDemo();
  const xs = candidatesOf(data, state, p.r);
  const staff = state.role === "hr" || state.role === "gm";
  if (xs.length === 0) {
    return <p className={h.quiet}>Nobody has applied yet.</p>;
  }
  return (
    <div className={h.stack}>
      <ul className={h.rows} aria-label="Candidates">
        {xs.map((c) => (
          <li key={c.id} className={h.row}>
            <span className={h.rowHead}>{c.name}</span>
            <span>{`${c.source}, applied ${c.appliedOn.display}`}</span>
            <span className={h.rowEnd}><Dot tone="neutral">
              {STAGE_WORD[c.now]}</Dot></span>
          </li>
        ))}
      </ul>
      {staff && (
        <a className={h.link} href={hrefOf("people", "moves", "board")}>
          Open the candidates board</a>
      )}
    </div>
  );
}

/** HR's review (or the raiser's update): the text and the plan. */
function EditSheet(p: { r: RequestNow; onClose(): void }) {
  const { data, state, dispatch } = useDemo();
  const actor = useActor();
  const toast = useToast();
  const r = p.r;
  const role = data.hiring.roles().find((x) => x.jobKey === r.jobKey);
  const [jd, setJd] = useState(r.jobDescription);
  const [must, setMust] = useState(r.mustHave.join("\n"));
  const [nice, setNice] = useState(r.niceToHave.join("\n"));
  const [grade, setGrade] = useState(r.grade);
  const [ttf, setTtf] = useState(String(r.timeToFillDays));
  const [problem, setProblem] = useState("");
  const lo = Math.min(role?.gradeMin ?? r.grade, r.grade);
  const hi = Math.max(role?.gradeMax ?? r.grade, r.grade);
  const split = (s: string) => s.split("\n").map((x) => x.trim())
    .filter((x) => x !== "");
  return (
    <Sheet open title="Edit the request" onClose={p.onClose}>
      <form className={h.stack} onSubmit={(e) => {
        e.preventDefault();
        const found = data.hiring.check({ jobKey: r.jobKey,
          departmentId: r.departmentId, headcount: r.headcount,
          startIso: r.startIso, timeToFillDays: Number(ttf), grade,
          jobDescription: jd, mustHave: split(must) });
        if (found.length > 0) {
          setProblem(found.join(" "));
          return;
        }
        const id = `hedit-${state.nextHiring}`;
        dispatch({ type: "hiring-edit", edit: { requestId: r.id,
          jobDescription: jd, mustHave: split(must),
          niceToHave: split(nice), grade, timeToFillDays: Number(ttf),
          by: actor.id, role: actor.role, on: actor.on } });
        toast.show(`${r.title}: request edited`, () =>
          dispatch({ type: "hiring-edit-undo", id }));
        p.onClose();
      }}>
        <label className={h.field}>
          <span>Job description</span>
          <textarea value={jd} rows={10}
            onChange={(e) => setJd(e.target.value)} />
        </label>
        <label className={h.field}>
          <span>Must have (one per line)</span>
          <textarea value={must} onChange={(e) => setMust(e.target.value)} />
        </label>
        <label className={h.field}>
          <span>Nice to have (one per line)</span>
          <textarea value={nice} onChange={(e) => setNice(e.target.value)} />
        </label>
        <label className={h.field}>
          <span>Grade</span>
          <select value={grade} onChange={(e) =>
            setGrade(Number(e.target.value))}>
            {Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).map((g) => (
              <option key={g} value={g}>{`Grade ${g}`}</option>))}
          </select>
        </label>
        <label className={h.field}>
          <span>Days to find someone</span>
          <input type="number" inputMode="numeric" value={ttf} min={14}
            max={120} onChange={(e) => setTtf(e.target.value)} />
        </label>
        {problem !== "" && <p className={h.problems} role="alert">
          {problem}</p>}
        <div className={h.actions}>
          <button type="submit" className={`${b.btn} ${b.primary}`}>
            Save</button>
        </div>
      </form>
    </Sheet>
  );
}
