import { useDemo } from "../../demo/state";
import type { TrainingCourseView, TrainingRecord }
  from "../../demo/data/talent-types";
import { FilterList } from "../../ui/templates";
import { Status } from "../team/common";
import { talentHref, useScope } from "./common";
import { Course } from "./Course";
import { fill, T } from "./words";

const W = T.training;

export interface CourseLine { course: TrainingCourseView;
  done: number; booked: number; todo: number; overdue: number;
  session: string | null }

/** Counts for a course over the records a role may see. */
export function lineOf(course: TrainingCourseView, recs: TrainingRecord[],
  asOf: string): CourseLine {
  const mine = recs.filter((r) => r.courseId === course.id);
  const n = (st: TrainingRecord["status"]) =>
    mine.filter((r) => r.status === st).length;
  const booked = mine.find((r) => r.status === "scheduled");
  return { course, done: n("done"), booked: n("scheduled"),
    todo: n("to-do"), session: booked === undefined ? null
      : booked.display.when,
    overdue: mine.filter((r) => r.status === "to-do" &&
      r.dueOn !== null && r.dueOn.iso < asOf).length };
}

/**
 * P64, Training and learning: the courses, how many have completed
 * them, the sessions booked. A manager sees their team's records only.
 */
export function Training(p: { rest: string[] }) {
  const { data, state } = useDemo();
  const inScope = useScope();
  const recs = data.talent.records().filter((r) => inScope(r.employeeId));
  const lines = data.talent.courses()
    .map((c) => lineOf(c, recs, data.talent.asOf))
    .filter((l) => l.done + l.booked + l.todo > 0);
  if (p.rest[0] !== undefined) {
    const line = lines.find((l) => l.course.id === p.rest[0]);
    return <Course line={line ?? null}
      records={recs.filter((r) => r.courseId === p.rest[0])} />;
  }
  return (
    <FilterList title={W.title}
      lede={state.role === "manager" ? W.teamLede : W.lede}
      rows={lines} rowKey={(l) => l.course.id}
      searchText={(l) => `${l.course.name} ${l.course.audience}`}
      rowHref={(l) => talentHref("training", l.course.id)}
      segments={[
        { id: "all", label: W.all, match: () => true },
        { id: "req", label: W.required, match: (l) => l.course.mandatory },
        { id: "opt", label: W.optional, match: (l) => !l.course.mandatory },
      ]}
      columns={[
        { key: "c", label: W.course, render: (l) => (
          <span>
            <span>{l.course.name}</span>{" "}
            <span className="visually-hidden">
              {l.course.mandatory ? W.reqWord : W.optWord}</span>
          </span>) },
        { key: "p", label: W.progress, render: (l) =>
          fill("{a} completed, {b} booked, {c} to do",
            { a: l.done, b: l.booked, c: l.todo }) },
        { key: "s", label: W.session, render: (l) =>
          l.session ?? W.noSession },
        { key: "o", label: W.status, render: (l) => (
          <Status tone={l.overdue > 0 ? "warn" : "ok"}>
            {l.overdue > 0 ? fill(W.overdue, { n: l.overdue })
              : W.noneOverdue}</Status>) },
      ]}
      empty={W.empty} />
  );
}
