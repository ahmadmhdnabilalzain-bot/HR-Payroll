import { useDemo } from "../../demo/state";
import { canSee } from "../../demo/time-off";
import type { TrainingRecord } from "../../demo/data/talent-types";
import { KeyValues, RecordTabs } from "../../ui/templates";
import { Outside, profileHref, Status } from "../team/common";
import { talentHref } from "./common";
import type { CourseLine } from "./Training";
import { fill, T } from "./words";
import s from "./talent.module.css";

const W = T.training;

/** One course: who has completed it, who is booked, who still has to. */
export function Course(p: { line: CourseLine | null;
  records: TrainingRecord[] }) {
  const { data, state } = useDemo();
  const { line } = p;
  if (line === null) return <Outside />;
  const c = line.course;
  const asOf = data.talent.asOf;
  const order = { "to-do": 0, scheduled: 1, done: 2 } as const;
  const people = [...p.records].sort((a, b) =>
    order[a.status] - order[b.status] || a.name.localeCompare(b.name));
  return (
    <RecordTabs title={c.name}
      back={{ label: W.back, href: talentHref("training") }}
      stats={[{ label: W.completed, value: line.done },
        { label: W.booked, value: line.booked },
        { label: W.todo, value: line.todo }]}
      tabs={[
        { id: "people", label: W.people, render: () => (
          people.length === 0 ? <p className={s.note}>{W.noOne}</p> : (
            <ul className={s.plain} aria-label={W.people}>
              {people.map((r) => {
                const late = r.status === "to-do" && r.dueOn !== null &&
                  r.dueOn.iso < asOf;
                const tone = r.status === "done" ? "ok"
                  : r.status === "scheduled" ? "open"
                    : late ? "warn" : "plain";
                const inner = (
                  <>
                    <span className={s.main}>
                      <span>{r.name}</span>
                      <span className={s.sub}>{r.display.when}</span>
                    </span>
                    <span className={s.end}>
                      <Status tone={tone}>{r.display.status}</Status>
                      {r.nextDueOn !== null && (
                        <span className={s.sub}>{W.nextDue}{" "}
                          {r.nextDueOn.display}</span>)}
                    </span>
                  </>);
                return (
                  <li key={r.id}>
                    {canSee(data, state, r.employeeId)
                      ? <a className={s.line}
                        href={profileHref(r.employeeId)}>{inner}</a>
                      : <div className={s.line}>{inner}</div>}
                  </li>);
              })}
            </ul>)) },
        { id: "about", label: W.about, render: () => (
          <KeyValues items={[
            { label: W.kind, value: c.mandatory ? W.reqWord : W.optWord },
            { label: W.audience, value: c.audience },
            { label: W.repeats, value: c.repeatDays === null ? W.once
              : fill(W.every, { n: c.repeatDays }) },
            { label: W.provider, value: c.provider }]} />) },
      ]} />
  );
}
