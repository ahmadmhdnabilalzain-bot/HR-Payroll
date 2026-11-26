import { useDemo } from "../../demo/state";
import { RecordTabs } from "../../ui/templates";
import { Progress } from "./common";
import { fill, W } from "./words";
import s from "./team.module.css";

/**
 * P07, Staff across the group: three figures, then one tab for each
 * site listing its departments, biggest first, with a bar.
 */
export function Sites() {
  const { data } = useDemo();
  const sites = data.team.sites();
  const ov = data.team.overview();
  const depts = new Set(sites.flatMap((x) =>
    x.byDepartment.map((d) => d.departmentId)));
  const w = W.sites;
  return (
    <RecordTabs title={w.title}
      lede={`${w.lede} ${fill(W.overview.asOf, { date: ov.asOf.display })}.`}
      stats={[{ label: W.overview.figure, value: ov.headcount },
        { label: w.siteCount, value: sites.length },
        { label: w.deptCount, value: depts.size }]}
      tabs={sites.map((x) => ({ id: x.location, label: x.locationText,
        render: () => {
          const most = Math.max(1, ...x.byDepartment.map((d) => d.count));
          return (
            <>
              <p className={s.note}>{x.text}</p>
              <ul className={s.group}>
                {[...x.byDepartment].sort((a, b) => b.count - a.count)
                  .map((d) => (
                    <li key={d.departmentId} className={s.line}
                      data-plain="true">
                      <span className={s.lineMain}>
                        <span>{d.departmentText}</span>
                      </span>
                      <Progress pct={d.count * 100 / most}
                        label={String(d.count)} />
                      <span />
                    </li>
                  ))}
              </ul>
            </>
          );
        } }))} />
  );
}
