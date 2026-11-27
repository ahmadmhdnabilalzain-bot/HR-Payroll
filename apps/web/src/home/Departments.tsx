import { useRef, useState } from "react";
import { Explainable } from "../components/explain";
import type { DepartmentRow } from "../demo/data/types";
import { useFlip } from "../demo/motion";
import { Count } from "../ui/Count";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { useRunDetail } from "../demo/useRunDetail";
import { useLocale } from "../i18n/LocaleProvider";
import { Money } from "../ui/Money";
import { useRowLink } from "../ui/RowLink";
import s from "./Departments.module.css";

type Metric = "cost" | "headcount";

/** Bar length in per mille of the largest row; bigint, no float money. */
function share(d: DepartmentRow, max: DepartmentRow, m: Metric): number {
  if (m === "headcount") {
    return max.headcount === 0 ? 0
      : Math.round((d.headcount * 1000) / max.headcount);
  }
  return max.costFils === 0n ? 0
    : Number((d.costFils * 1000n) / max.costFils);
}

const value = (d: DepartmentRow, m: Metric): bigint =>
  m === "cost" ? d.costFils : BigInt(d.headcount);

/**
 * Headcount and cost by department as quiet bars. Switching the
 * measure re-sorts the rows (FLIP) and eases the bars and numbers.
 */
export function Departments() {
  const { t } = useLocale();
  const { data } = useDemo();
  const [metric, setMetric] = useState<Metric>("cost");
  const rows = [...data.departments()].sort((a, b) => {
    const d = value(b, metric) - value(a, metric);
    return d > 0n ? 1 : d < 0n ? -1 : 0;
  });
  const top = rows[0];
  const box = useRef<HTMLOListElement>(null);
  useFlip(box, [metric]);
  return (
    <section className={s.panel} aria-labelledby="dept-title">
      <header className={s.head}>
        <div>
          <h2 id="dept-title" className={s.title}>{t("home.deptTitle")}</h2>
          <p className={s.note}>{t("home.deptNote")}</p>
        </div>
        <div className={s.seg} role="group" aria-label={t("home.deptShow")}>
          {(["cost", "headcount"] as const).map((m) => (
            <button key={m} type="button" aria-pressed={metric === m}
              onClick={() => setMetric(m)}>
              {m === "cost" ? t("home.deptCost") : t("home.deptHeadcount")}
            </button>
          ))}
        </div>
      </header>
      <ol className={s.rows} ref={box}>
        {top !== undefined && rows.map((d) => (
          <DeptItem key={d.id} d={d} top={top} metric={metric} />
        ))}
      </ol>
    </section>
  );
}

/**
 * Where a department opens: the departments report, for every
 * department, the Executive office too (the report shows it).
 */
export function deptHref(): string {
  return hrefOf("reports", "departments");
}

/** One department: the whole row opens its report. */
function DeptItem(p: { d: DepartmentRow; top: DepartmentRow;
  metric: Metric }) {
  const link = useRowLink({ href: deptHref() });
  return (
    <li data-flip={p.d.id}>
      <div {...link} className={`${s.row} ${link.className}`}>
        <DeptRow d={p.d} top={p.top} metric={p.metric} />
      </div>
    </li>
  );
}

function DeptRow(p: { d: DepartmentRow; top: DepartmentRow;
  metric: Metric }) {
  const { lang } = useLocale();
  const { explain } = useRunDetail();
  const k = share(p.d, p.top, p.metric) / 1000;
  return (
    <>
      <span className={s.name}>{p.d.name[lang]}</span>
      <span className={s.bar} aria-hidden="true">
        <span className={s.fill} style={{ "--k": k } as object} />
      </span>
      <span className={s.value}>
        <Explainable explanation={explain[`dept-${p.metric === "cost"
          ? "cost" : "people"}:${p.d.id}`]}>
          {p.metric === "cost" ? <Money value={p.d.costFils} size="sm" />
            : <Count value={p.d.headcount} />}
        </Explainable>
      </span>
    </>
  );
}
