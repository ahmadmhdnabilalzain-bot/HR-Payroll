import type { GoalView } from "../../demo/data/team-types";
import { useDemo } from "../../demo/state";
import { FilterList } from "../../ui/templates";
import { profileHref, Status } from "../team/common";
import { fill } from "../team/words";
import { G } from "./words";
import s from "../team/team.module.css";

const TONE = { done: "ok", "on-track": "plain", "at-risk": "warn" } as const;

/**
 * P61, Goals and KPIs: department goals first, then each person's, and
 * the probation goals. A bar shows progress against the target; the
 * status compares it with how far through the year we are.
 */
export function Goals() {
  const { data } = useDemo();
  const rows = data.team.goals();
  const g = G.goals;
  const of = (k: GoalView["kind"]) => (x: GoalView) => x.kind === k;
  return (
    <FilterList title={g.title} lede={g.lede} rows={rows}
      rowKey={(x) => x.id}
      searchText={(x) => `${x.title} ${x.employeeName ?? ""} ` +
        x.departmentText}
      rowHref={(x) => (x.employeeId === null ? undefined
        : profileHref(x.employeeId)) as string}
      segments={[
        { id: "dept", label: g.dept, match: of("department") },
        { id: "mine", label: g.mine, match: (x) => x.kind !== "department" },
        { id: "risk", label: g.risk, match: (x) => x.status === "at-risk" },
      ]}
      columns={[
        { key: "g", label: g.goal, render: (x) => (
          <span className={s.name}>
            <span>{x.title}</span>
            <span className={s.sub}>
              {x.employeeName ?? x.departmentText}
              {x.weight > 0 ? `, ${fill(g.weight, { n: x.weight })}` : ""}
              {x.kind === "probation" ? `, ${fill(g.dueOn,
                { date: x.dueOn.display })}` : ""}
            </span>
          </span>) },
        { key: "p", label: g.progress, render: (x) => (
          <span className={s.name}>
            <span>{x.progressText}</span>
            <span className={s.track} role="img"
              aria-label={`${x.progressPct}%`}>
              <i style={{ inlineSize: `${x.progressPct}%` }} />
            </span>
          </span>) },
        { key: "s", label: g.status, render: (x) => (
          <Status tone={TONE[x.status]}>{x.statusText}</Status>) },
      ]}
      empty={g.empty} />
  );
}
