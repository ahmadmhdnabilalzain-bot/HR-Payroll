import { hrefOf } from "../demo/route";
import type { ClaimRow, CrewRequest } from "../demo/data/time-types";
import { useDemo } from "../demo/state";
import { dayText, type Tone } from "../people/words";
import { Money } from "../ui/Money";
import b from "../ui/button.module.css";
import { useToast } from "../ui/Toast";
import {
  FilterList,
  KeyValues,
  RecordTabs,
  RowDecision,
} from "../ui/templates";
import { crewPhase, decidedLine, phaseOf, phaseWord, type Phase }
  from "./decisions";
import { Outside } from "./Outside";
import { Status, useTimeData, useWho, type Who } from "./shared";
import s from "./time.module.css";
import { hm, plural } from "./words";

const NOTE = "The amount is what the payroll adds to gross pay for " +
  "this claim. For a claim still to decide it is an estimate for the " +
  "November run, and nothing changes in October.";

/** Accept, Decline and Undo for one item, with who and a plain result. */
function useDecide(id: string, text: string) {
  const { state, dispatch } = useDemo();
  const who = useWho();
  const toast = useToast();
  const made = state.timeDecided[id];
  const put = (verdict: "accept" | "decline") => (): void => {
    dispatch({ type: "time-decide", id, verdict, by: who.me });
    toast.show(verdict === "accept" ? `${text} signed off.`
      : `${text} declined.`, () => dispatch({ type: "time-undo", id }));
  };
  const undo = (): void => dispatch({ type: "time-undo", id });
  return { made, put, undo, who };
}

function Buttons(q: { id: string; text: string; phase: Phase;
  allowed: boolean; row?: boolean }) {
  const d = useDecide(q.id, q.text);
  const fill = q.row === true ? b.secondary : b.primary;
  if (q.phase === "waiting" && q.allowed) {
    return (
      <span className={s.inline}>
        <button type="button" className={`${b.btn} ${b.secondary} `
          + s.rowBtn} onClick={d.put("decline")}>Decline</button>
        <button type="button" className={`${b.btn} ${fill} `
          + s.rowBtn} onClick={d.put("accept")}>Accept</button>
      </span>
    );
  }
  if (d.made !== undefined) {
    return (
      <button type="button" className={`${b.btn} ${b.quiet} ${s.rowBtn}`}
        onClick={d.undo}>Undo</button>
    );
  }
  return null;
}

/** The decision on a claim's row: the same rule as its record. */
function RowButtons(q: { id: string; text: string; phase: Phase;
  allowed: boolean; decider: string }) {
  const d = useDecide(q.id, q.text);
  return (
    <RowDecision open={q.phase === "waiting"} mine={q.allowed}
      waitingFor={d.who.name(q.decider)}
      yes={{ label: "Accept", run: d.put("accept") }}
      no={{ label: "Decline", run: d.put("decline") }}
      undo={d.made !== undefined && q.allowed ? d.undo : undefined} />
  );
}

/** "Waiting for Arjun Menon or you" when HR may decide it too. */
function waitWord(p: Phase, who: Who, decider: string, forId: string)
  : [string, Tone] {
  const [word, tone] = phaseWord(p, who, decider);
  return p === "waiting" && decider !== who.me && who.canDecide(forId)
    ? [`${word} or you`, tone] : [word, tone];
}

function claimsFor(t: { claims: ClaimRow[] }, who: Who): ClaimRow[] {
  return t.claims.filter((c) => who.visible.has(c.employeeId));
}

/** The time of a claim: "1 h 30 min", with the night part named. */
const timeOf = (c: ClaimRow): string => c.nightMinutes > 0
  ? `${hm(c.minutes)}, ${hm(c.nightMinutes)} at night` : hm(c.minutes);

/** T30, Overtime to decide, with what each claim adds to pay (LF). */
export function Overtime() {
  const t = useTimeData();
  const { state } = useDemo();
  const who = useWho();
  const rows = claimsFor(t, who);
  const ph = (c: ClaimRow): Phase => phaseOf(c, state);
  return (
    <FilterList title="Overtime to decide"
      lede="Claims for time past the shift. Each shows what it adds to pay."
      rows={rows} rowKey={(c) => c.id}
      searchText={(c) => who.name(c.employeeId)}
      rowHref={(c) => hrefOf("time-off", "overtime", c.id)}
      avatar={(c) => ({ id: c.employeeId,
        name: who.name(c.employeeId) })}
      rowActions={(c) => (
        <RowButtons id={c.id} text="The claim" phase={ph(c)}
          allowed={who.canDecide(c.employeeId)}
          decider={who.approverOf(c.employeeId)} />
      )}
      segments={[
        { id: "wait", label: "To decide", match: (c) => ph(c) === "waiting" },
        { id: "done", label: "Decided", match: (c) => ph(c) === "accepted" ||
          ph(c) === "declined" },
        { id: "paid", label: "Paid in October", match: (c) =>
          ph(c) === "paid" },
        { id: "all", label: "All", match: () => true },
      ]}
      columns={[
        { key: "n", label: "Person", render: (c) => who.name(c.employeeId) },
        { key: "d", label: "Day", render: (c) => dayText(c.date, who.lang) },
        { key: "t", label: "Time", end: true, render: (c) => timeOf(c) },
        { key: "v", label: "Adds to pay", end: true, render: (c) =>
          ph(c) === "declined" ? "None" : <Money value={c.value} size="sm" />
        },
        { key: "s", label: "Status", render: (c) => {
          const [word, tone] = waitWord(ph(c), who,
            who.approverOf(c.employeeId), c.employeeId);
          return <Status tone={tone}>{word}</Status>;
        } },
      ]}
      empty="Nothing here. Pick another filter or clear the search." />
  );
}

/** One claim: the figures, who decides, and the decision. */
export function OvertimeRecord(q: { id: string }) {
  const t = useTimeData();
  const { state } = useDemo();
  const who = useWho();
  const c = claimsFor(t, who).find((x) => x.id === q.id);
  if (c === undefined) return <Outside />;
  const phase = phaseOf(c, state);
  const decider = who.approverOf(c.employeeId);
  const [word, tone] = waitWord(phase, who, decider, c.employeeId);
  const made = state.timeDecided[c.id];
  const mine = claimsFor(t, who).filter((x) => x.employeeId === c.employeeId);
  return (
    <RecordTabs title={`${who.name(c.employeeId)}, ${dayText(c.date,
      who.lang)}`} lede={`${who.jobOf(c.employeeId)}.`}
    back={{ label: "Overtime to decide", href: hrefOf("time-off",
      "overtime") }}
    avatar={{ id: c.employeeId, name: who.name(c.employeeId) }}
    status={{ word, tone: tone === "danger" ? "stop" : tone === "info"
      ? "neutral" : tone }}
    history={[{ when: dayText(c.date, who.lang),
      what: `Worked ${timeOf(c)} past the shift` },
    ...(made === undefined ? [] : [{ when: dayText(t.asOf, who.lang),
      what: decidedLine(made, who, dayText(t.asOf, who.lang)) }])]}
    actions={<Buttons id={c.id} text="The claim" phase={phase}
      allowed={who.canDecide(c.employeeId)} />}
    stats={[
      { label: "Overtime", value: hm(c.minutes) },
      { label: phase === "paid" ? "Added to October pay"
        : "Adds to pay (estimate)", value: phase === "declined" ? "None"
        : <Money value={c.value} size="lg" /> },
      { label: "Day", value: dayText(c.date, who.lang) },
    ]}
    tabs={[
      { id: "claim", label: "Claim", render: () => (
        <>
          <KeyValues items={[
            { label: "Person", value: <a href={hrefOf("people",
              c.employeeId)}>{who.name(c.employeeId)}</a> },
            { label: "Day", value: dayText(c.date, who.lang) },
            { label: "Time", value: timeOf(c) },
            { label: "Decided by", value: `${who.name(decider)}, ` +
              who.jobOf(decider) },
            { label: "Paid in", value: c.phase === "paid"
              ? "October run" : "November run" },
            ...(made === undefined ? [] : [{ label: "Decision",
              value: decidedLine(made, who, dayText(t.asOf, who.lang)) }]),
          ]} />
          <p className={s.note}>{NOTE}</p>
        </>) },
      { id: "month", label: "Their claims", render: () => (
        <ul className={s.dayList} aria-label="Their claims">
          {mine.map((x) => (
            <li key={x.id} className={s.dayRow}>
              <a href={hrefOf("time-off", "overtime", x.id)}>
                {dayText(x.date, who.lang)}</a>
              <span>{timeOf(x)}</span>
              <span className={s.num}><Money value={x.value} size="sm" />
              </span>
            </li>
          ))}
        </ul>) },
    ]} />
  );
}

const crewFor = (t: { crew: CrewRequest[] }, who: Who): CrewRequest[] =>
  t.crew.filter((c) => who.role === "hr" || who.role === "gm" ||
    c.requestedBy === who.me);

/** T31, Crew overtime asked for in advance (LF). */
export function Crew() {
  const t = useTimeData();
  const { state } = useDemo();
  const who = useWho();
  return (
    <FilterList title="Crew overtime"
      lede="Overtime a manager asks for before it is worked."
      rows={crewFor(t, who)} rowKey={(c) => c.id}
      rowHref={(c) => hrefOf("time-off", "overtime", "crew", c.id)}
      avatar={(c) => ({ id: c.requestedBy, name: who.name(c.requestedBy) })}
      rowActions={(c) => (
        <RowButtons id={c.id} text="The request" phase={crewPhase(c, state)}
          allowed={who.canDecide(c.requestedBy)}
          decider={who.approverOf(c.requestedBy)} />
      )}
      columns={[
        { key: "r", label: "Asked by", render: (c) =>
          who.name(c.requestedBy) },
        { key: "d", label: "Day", render: (c) => dayText(c.date, who.lang) },
        { key: "p", label: "People", end: true, render: (c) =>
          plural(c.people.length, "person", "people") },
        { key: "v", label: "Estimate", end: true, render: (c) =>
          <Money value={c.estimate} size="sm" /> },
        { key: "s", label: "Status", render: (c) => {
          const [word, tone] = waitWord(crewPhase(c, state), who,
            who.approverOf(c.requestedBy), c.requestedBy);
          return <Status tone={tone}>{word}</Status>;
        } },
      ]}
      empty="No crew overtime has been asked for." />
  );
}

export function CrewRecord(q: { id: string }) {
  const t = useTimeData();
  const { state } = useDemo();
  const who = useWho();
  const c = crewFor(t, who).find((x) => x.id === q.id);
  if (c === undefined) return <Outside />;
  const phase = crewPhase(c, state);
  const decider = who.approverOf(c.requestedBy);
  const made = state.timeDecided[c.id];
  const [word] = phaseWord(phase, who, decider);
  return (
    <RecordTabs title={`Crew overtime, ${dayText(c.date, who.lang)}`}
      lede={`Asked by ${who.name(c.requestedBy)}, ` +
        `${who.jobOf(c.requestedBy)}. ${word}.`}
      back={{ label: "Crew overtime", href: hrefOf("time-off", "overtime",
        "crew") }}
      actions={<Buttons id={c.id} text="The request" phase={phase}
        allowed={who.canDecide(c.requestedBy)} />}
      stats={[
        { label: "People", value: String(c.people.length) },
        { label: "Each", value: hm(c.minutesEach) },
        { label: "Estimate for November", value: <Money
          value={c.estimate} size="lg" /> },
      ]}
      tabs={[
        { id: "request", label: "Request", render: () => (
          <>
            <KeyValues items={[
              { label: "Why", value: c.reason },
              { label: "Day", value: dayText(c.date, who.lang) },
              { label: "Decided by", value: `${who.name(decider)}, ` +
                who.jobOf(decider) },
              { label: "Status", value: word },
              ...(made === undefined ? [] : [{ label: "Decision",
                value: decidedLine(made, who, dayText(t.asOf,
                  who.lang)) }]),
            ]} />
            <p className={s.note}>{NOTE}</p>
          </>) },
        { id: "people", label: "People", render: () => (
          <ul className={s.dayList} aria-label="People">
            {c.people.map((id) => (
              <li key={id} className={s.dayRow}>
                <a href={hrefOf("people", id)}>{who.name(id)}</a>
                <span>{who.jobOf(id)}</span>
                <span className={s.num}>{hm(c.minutesEach)}</span>
              </li>
            ))}
          </ul>) },
      ]} />
  );
}
