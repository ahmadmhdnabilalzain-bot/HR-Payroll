import { useRef, useState } from "react";
import type { DepartmentRow } from "../demo/data/types";
import { useFlip, useTweenedNumber } from "../demo/motion";
import { useDemo } from "../demo/state";
import { useLocale } from "../i18n/LocaleProvider";
import { Money } from "../ui/Money";
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
          <li key={d.id} className={s.row} data-flip={d.id}>
            <DeptRow d={d} top={top} metric={metric} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function DeptRow(p: { d: DepartmentRow; top: DepartmentRow;
  metric: Metric }) {
  const { lang } = useLocale();
  const count = useTweenedNumber(p.d.headcount);
  const k = share(p.d, p.top, p.metric) / 1000;
  return (
    <>
      <span className={s.name}>{p.d.name[lang]}</span>
      <span className={s.bar} aria-hidden="true">
        <span className={s.fill} style={{ transform: `scaleX(${k})` }} />
      </span>
      <span className={s.value}>
        {p.metric === "cost" ? <Money value={p.d.costFils} size="sm" />
          : <span className="tabular">{count}</span>}
      </span>
    </>
  );
}
