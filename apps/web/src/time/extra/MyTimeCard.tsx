import { Suspense, useState } from "react";
import type { DayRow } from "../../demo/data/time-types";
import type { TimeFix } from "../../demo/more-state";
import { useDemo } from "../../demo/state";
import { personFor } from "../../demo/time-off";
import { fill, X } from "../../home/extra/words";
import { Status, type Tone } from "../../people/team/common";
import s from "../../people/team/team.module.css";
import { dayText } from "../../people/words";
import b from "../../ui/button.module.css";
import { useToast } from "../../ui/Toast";
import { ApprovalForm, FilterList } from "../../ui/templates";
import { useTimeData } from "../shared";
import { hm, plural, W } from "../words";

const C = X.card;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const STATE: Record<DayRow["state"], [string, Tone]> = {
  present: [C.present, "ok"], leave: [C.leave, "plain"],
  "absent-unpaid": [C.absent, "warn"] };

/** E09, My time card: the viewer's own days, and corrections they ask. */
export function MyTimeCard() {
  return (
    <Suspense fallback={<p role="status" className="visually-hidden">
      {W.loading}</p>}>
      <Card />
    </Suspense>
  );
}

function Card() {
  const t = useTimeData();
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  const [day, setDay] = useState<DayRow | null>(null);
  const me = personFor(data, state.role);
  const nameOf = (id: string): string => data.people.person(id)?.name.en
    ?? id;
  const checker = data.people.approverOf(me);
  const sheet = t.sheets.find((x) => x.employeeId === me);
  const days = t.days.filter((d) => d.employeeId === me)
    .sort((a, c) => c.date.localeCompare(a.date));
  const live = state.timeFixes.filter((f) => !f.withdrawn);
  const mine = live.filter((f) => f.employeeId === me);
  const forMe = live.filter((f) => f.checkerId === me &&
    f.employeeId !== me);
  const nowOf = (f: TimeFix) => {
    const v = state.decided[f.approvalId];
    return v === undefined ? "waiting" as const : v === "approve"
      ? "agreed" as const : "declined" as const;
  };
  const late = (d: DayRow): number => sheet?.late.find((l) =>
    l.date === d.date)?.minutes ?? 0;
  const pending = (d: DayRow): boolean => mine.some((f) =>
    f.date === d.date && nowOf(f) === "waiting");
  const decide = (f: TimeFix, v: "approve" | "decline"): void => {
    dispatch({ type: "decide", id: f.approvalId, verdict: v });
    toast.show(`${v === "approve" ? C.agreed : C.declined}: ${
      nameOf(f.employeeId)}, ${dayText(f.date, "en")}`, () => dispatch(
      { type: "undecide", id: f.approvalId }));
  };
  const takeBack = (f: TimeFix): void => {
    dispatch({ type: "more-fix-withdraw", id: f.id });
    toast.show(C.taken, () => dispatch({ type: "more-fix-restore",
      id: f.id }));
  };
  const wordOf = (f: TimeFix): string => nowOf(f) === "waiting"
    ? fill(C.waiting, { name: nameOf(f.checkerId) })
    : nowOf(f) === "agreed" ? C.agreed : C.declined;
  const partText = (f: TimeFix): string => f.part === "absent"
    ? C.partAbsent : f.part === "in" ? `${C.partIn}: ${f.clockIn}`
      : f.part === "out" ? `${C.partOut}: ${f.clockOut}`
        : `${f.clockIn} to ${f.clockOut}`;
  if (sheet === undefined) {
    return <FilterList title={C.title} lede={C.notJoined} rows={[]}
      rowKey={() => ""} columns={[{ key: "d", label: C.day,
        render: () => "" }]} empty={C.notJoined} />;
  }
  return (
    <>
      <FilterList title={C.title}
        lede={`${C.lede} ${plural(sheet.presentDays, "day", "days")} ` +
          `present of ${sheet.workingDays}; overtime ${hm(
            sheet.overtimeMinutes)}.`}
        rows={days} rowKey={(d) => d.date}
        searchText={(d) => dayText(d.date, "en")}
        segments={[
          { id: "all", label: W.october, match: () => true },
          { id: "late", label: C.late, match: (d) => late(d) > 0 },
          { id: "gap", label: C.notClocked, match: (d) =>
            d.state === "absent-unpaid" || (d.state === "present" &&
              (d.clockIn === null || d.clockOut === null)) },
        ]}
        columns={[
          { key: "d", label: C.day, render: (d) => (
            <span className={s.name}>
              <span>{dayText(d.date, "en")}</span>
              <Status tone={late(d) > 0 ? "warn" : STATE[d.state][1]}>
                {late(d) > 0 ? fill(C.daysLate, { n: late(d) })
                  : STATE[d.state][0]}</Status>
            </span>) },
          { key: "t", label: `${C.in} / ${C.out}`, render: (d) =>
            d.clockIn === null && d.clockOut === null ? C.noClock
              : `${d.clockIn ?? "–"} to ${d.clockOut ?? "–"}` },
          { key: "w", label: C.worked, end: true, render: (d) =>
            hm(d.workedMinutes) },
          { key: "x", label: "", end: true, render: (d) =>
            d.state === "leave" ? null : (
              <button type="button" disabled={pending(d)}
                className={`${b.btn} ${b.quiet} ${s.tall}`}
                aria-label={`${pending(d) ? C.pendingShort : C.fixShort}: ${
                  dayText(d.date, "en")}`}
                onClick={() => setDay(d)}>
                {pending(d) ? C.pendingShort : C.fixShort}</button>) },
        ]}
        empty={C.none} />
      <section className={s.after} aria-labelledby="fix-mine">
        <h2 id="fix-mine" className={s.sectionTitle}>{C.mineTitle}</h2>
        <ul className={s.group}>
          {mine.length === 0 && (
            <li><span className={s.line}><span className={s.lineMain}>
              {C.emptyMine}</span></span></li>)}
          {mine.map((f) => (
            <li key={f.id}><span className={s.line}>
              <span className={s.lineMain}>
                <span>{dayText(f.date, "en")}: {partText(f)}</span>
                <small>{f.reason}</small>
                <Status tone={nowOf(f) === "agreed" ? "ok"
                  : nowOf(f) === "waiting" ? "warn" : "plain"}>
                  {wordOf(f)}</Status>
              </span>
              {nowOf(f) === "waiting" && (
                <button type="button"
                  className={`${b.btn} ${b.quiet} ${s.tall}`}
                  onClick={() => takeBack(f)}>{C.takeBack}</button>)}
            </span></li>))}
        </ul>
      </section>
      {forMe.length > 0 && (
        <section className={s.after} aria-labelledby="fix-team">
          <h2 id="fix-team" className={s.sectionTitle}>{C.teamTitle}</h2>
          <ul className={s.group}>
            {forMe.map((f) => (
              <li key={f.id}><span className={s.line}>
                <span className={s.lineMain}>
                  <span>{nameOf(f.employeeId)}, {dayText(f.date, "en")}:
                    {" "}{partText(f)}</span>
                  <small>{f.reason}</small>
                  <Status tone={nowOf(f) === "agreed" ? "ok"
                    : nowOf(f) === "waiting" ? "warn" : "plain"}>
                    {nowOf(f) === "waiting" ? C.waitingYou
                      : nowOf(f) === "agreed" ? C.agreed : C.declined}
                  </Status>
                </span>
                {nowOf(f) === "waiting" ? (
                  <span className={s.btnRow}>
                    <button type="button"
                      className={`${b.btn} ${b.secondary} ${s.tall}`}
                      aria-label={`${C.agree}: ${nameOf(f.employeeId)}`}
                      onClick={() => decide(f, "approve")}>{C.agree}
                    </button>
                    <button type="button"
                      className={`${b.btn} ${b.quiet} ${s.tall}`}
                      aria-label={`${C.decline}: ${nameOf(f.employeeId)}`}
                      onClick={() => decide(f, "decline")}>{C.decline}
                    </button>
                  </span>) : (
                  <button type="button"
                    className={`${b.btn} ${b.quiet} ${s.tall}`}
                    onClick={() => dispatch({ type: "undecide",
                      id: f.approvalId })}>{C.undo}</button>)}
              </span></li>))}
          </ul>
        </section>)}
      <p className={s.after}><span className={s.note}>{C.teamNote}</span></p>
      {day !== null && (
        <ApprovalForm open title={fill(C.form, { date: dayText(day.date,
          "en") })} maker={nameOf(me)} checker={nameOf(checker)}
        submitLabel={C.submit} onClose={() => setDay(null)}
        fields={[
          { key: "part", label: C.part, kind: "select", required: true,
            initial: day.state === "absent-unpaid" ? "absent" : "both",
            options: [{ value: "in", label: C.partIn },
              { value: "out", label: C.partOut },
              { value: "both", label: C.partBoth },
              { value: "absent", label: C.partAbsent }] },
          { key: "in", label: C.clockIn, kind: "text",
            initial: day.clockIn ?? "08:00", help: C.timeHelp },
          { key: "out", label: C.clockOut, kind: "text",
            initial: day.clockOut ?? "17:00" },
          { key: "reason", label: C.reason, kind: "textarea",
            required: true },
        ]}
        onSubmit={(v) => {
          const part = v["part"] as TimeFix["part"];
          const [cin, cout] = [(v["in"] ?? "").trim(),
            (v["out"] ?? "").trim()];
          const needIn = part === "in" || part === "both" ||
            part === "absent";
          const needOut = part === "out" || part === "both" ||
            part === "absent";
          if ((needIn && !TIME.test(cin)) || (needOut &&
            !TIME.test(cout))) return C.badTime;
          if (needIn && needOut && cout <= cin) return C.outBefore;
          if (pending(day)) return C.pending;
          dispatch({ type: "more-fix", draft: { employeeId: me,
            date: day.date, part, clockIn: needIn ? cin : "",
            clockOut: needOut ? cout : "", reason: (v["reason"] ?? "")
              .trim(), checkerId: checker, requestedOn: data.people.asOf } });
          toast.show(fill(C.sent, { name: nameOf(checker) }));
          return null;
        }} />)}
    </>
  );
}
