import { useDemo } from "../../demo/state";
import { ReportPage } from "../../ui/templates";
import { fill } from "../team/words";
import { G } from "./words";

/**
 * P62, Department performance: the mid-year average rating and the
 * state of this year's goals, department by department.
 */
export function Performance() {
  const { data } = useDemo();
  const rows = data.team.performance();
  const g = G.perf;
  const goals = rows.reduce((n, d) => n + d.goals, 0);
  const risk = rows.reduce((n, d) => n + d.goalsAtRisk, 0);
  return (
    <ReportPage title={g.title}
      period={fill(g.period, { date: data.team.overview().asOf.display })}
      figure={{ label: g.figure,
        value: fill(g.of, { n: risk, total: goals }) }}
      columns={[{ label: g.dept }, { label: g.rating, end: true },
        { label: g.goals }]}
      rows={rows.map((d) => [d.departmentText, d.averageText,
        fill(g.line, { done: d.goalsDone, on: d.goalsOnTrack,
          risk: d.goalsAtRisk })])}
      bars={rows.map((d) => Math.round(d.averageRating * 200))}
      note={g.note} csvName="department-performance.csv" />
  );
}
