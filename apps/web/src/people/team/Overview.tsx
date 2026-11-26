import { useDemo } from "../../demo/state";
import { Icon } from "../../ui/Icon";
import { RecordTabs } from "../../ui/templates";
import { growthHref, profileHref, teamHref } from "./common";
import { fill, W } from "./words";
import s from "./team.module.css";

/**
 * P01, People overview: three figures, then two tabs. "This month" is
 * what changed, each line a link to where it lives; "Departments" is
 * the head count and open seats for each.
 */
export function Overview() {
  const { data } = useDemo();
  const ov = data.team.overview();
  const seats = data.team.seats();
  const probation = data.team.probation().find((x) =>
    x.status === "in-progress");
  const soon = data.team.positions().find((x) => x.pendingHire !== null);
  const open = seats.reduce((n, d) => n + d.vacant + d.onHold, 0);
  const w = W.overview;
  return (
    <RecordTabs title={w.title}
      lede={`${fill(w.asOf, { date: ov.asOf.display })}. ${ov.headcountText}.`}
      stats={[{ label: w.figure, value: ov.headcount },
        { label: w.open, value: open },
        { label: w.probation, value: ov.onProbation }]}
      tabs={[
        { id: "month", label: w.month, render: () => (
          <ul className={s.group}>
            {ov.joinedThisMonth.map((x) => (
              <Line key={x.employeeId} href={profileHref(x.employeeId)}
                title={fill(w.joined, { name: x.name })}
                sub={fill(w.on, { date: x.on.display })} />
            ))}
            {ov.leftThisMonth.map((x) => (
              <Line key={x.employeeId} href={profileHref(x.employeeId)}
                title={fill(w.left, { name: x.name })}
                sub={fill(w.on, { date: x.on.display })} />
            ))}
            {soon !== undefined && (
              <Line href={teamHref("positions")}
                title={soon.pendingHire ?? ""} sub={w.seatsLine} />
            )}
            {probation !== undefined && (
              <Line href={growthHref("probation")}
                title={fill(w.inProbation, { name: probation.employeeName })}
                sub={fill(w.decideBy, { date: probation.decideBy.display })} />
            )}
            <Line href={teamHref("positions")} title={w.vacancies}
              sub={w.seatsLine} value={String(ov.openVacancies)} />
          </ul>) },
        { id: "depts", label: w.dept, render: () => (
          <ul className={s.group}>
            {seats.map((d) => (
              <Line key={d.departmentId} href={teamHref("positions")}
                title={d.departmentText}
                sub={d.vacant + d.onHold === 0 ? w.none
                  : fill(w.openOf, { n: d.vacant + d.onHold })}
                value={String(d.filled)} />
            ))}
          </ul>) },
      ]} />
  );
}

function Line(p: { href: string; title: string; sub: string;
  value?: string }) {
  return (
    <li>
      <a className={s.line} href={p.href}>
        <span className={s.lineMain}>
          <span>{p.title}</span>
          <small>{p.sub}</small>
        </span>
        <span className={s.lineValue}>{p.value ?? ""}</span>
        <span className={s.chev} aria-hidden="true">
          <Icon name="chevronEnd" size={16} />
        </span>
      </a>
    </li>
  );
}
