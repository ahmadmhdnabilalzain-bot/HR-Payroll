import type { GoalView } from "../../demo/data/team-types";
import { useDemo } from "../../demo/state";
import { personFor } from "../../demo/time-off";
import { Status } from "../../people/team/common";
import s from "../../people/team/team.module.css";
import { FilterList } from "../../ui/templates";
import { X } from "./words";

const W = X.kpi;
const TONE = { done: "ok", "on-track": "plain", "at-risk": "warn" } as const;

/**
 * E13, My KPIs: the viewer's own goals for the year, their
 * department's, and for a manager their team's. Read only: the targets
 * are set in the KPI library and the appraisal cycle.
 */
export function MyKpis() {
  const { data, state } = useDemo();
  const me = personFor(data, state.role);
  const dept = data.people.person(me)?.departmentId ?? "";
  const team = new Set(data.people.people().filter((p) =>
    p.approverId === me).map((p) => p.id));
  const isMgr = state.role === "manager";
  const all = data.team.goals();
  const own = (g: GoalView): boolean => g.employeeId === me;
  const rows = all.filter((g) => own(g) || (g.kind === "department" &&
    g.departmentId === dept) || (isMgr && g.employeeId !== null &&
    team.has(g.employeeId)));
  const segs = [
    { id: "mine", label: W.mine, match: own },
    ...(isMgr ? [{ id: "team", label: W.team, match: (g: GoalView) =>
      g.employeeId !== null && team.has(g.employeeId) &&
      g.employeeId !== me }] : []),
    { id: "dept", label: W.dept, match: (g: GoalView) =>
      g.kind === "department" },
    { id: "all", label: W.all, match: () => true },
  ];
  return (
    <FilterList title={W.title} lede={isMgr ? W.lede2 : W.lede}
      rows={rows} rowKey={(g) => g.id}
      searchText={(g) => `${g.title} ${g.employeeName ?? ""}`}
      segments={segs}
      columns={[
        { key: "g", label: W.goal, render: (g) => (
          <span className={s.name}>
            <span>{g.title}</span>
            <span className={s.sub}>
              {g.employeeName ?? g.departmentText}, {W.due} {
                g.dueOn.display}</span>
          </span>) },
        { key: "p", label: W.progress, render: (g) => (
          <span className={s.name}>
            <span>{g.progressText}</span>
            <span className={s.track} role="img"
              aria-label={`${g.progressPct}%`}>
              <i style={{ inlineSize: `${g.progressPct}%` }} />
            </span>
          </span>) },
        { key: "s", label: W.status, render: (g) => (
          <Status tone={TONE[g.status]}>{g.statusText}</Status>) },
      ]}
      empty={W.none} />
  );
}
