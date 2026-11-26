import { Suspense, type ComponentType } from "react";
import { useRunApproval } from "../demo/actions";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { useRunDetail } from "../demo/useRunDetail";
import { formatNumber } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { downloadText } from "../lib/download";
import { Icon } from "../ui/Icon";
import { Money } from "../ui/Money";
import b from "../ui/button.module.css";
import type { ViewProps } from "../views";
import { toCsv, type Cell } from "./csv";
import {
  BLURB,
  BUILD,
  REPORTS,
  TITLE,
  type Env,
  type ReportId,
  type Table,
} from "./defs";
import { Catalogue } from "./Catalogue";
import { Guard } from "./Guard";
import { COST_SCREENS } from "./cost";
import { MORE_SCREENS } from "./more";
import { Audit } from "./screens/Audit";
import { DashboardExec, DashboardHr } from "./screens/Dashboards";
import { Headcount } from "./screens/Headcount";
import { Leave } from "./screens/Leave";
import { Overtime } from "./screens/Overtime";
import { Trend } from "./screens/Trend";
import { Variance } from "./screens/Variance";
import s from "./Reports.module.css";

/** The newer reports, each on its own template page (WP7). */
const SCREENS: Record<string, { view: ComponentType<ViewProps>;
  gmOnly?: boolean; itOk?: boolean }> = {
  trend: { view: Trend }, variance: { view: Variance },
  overtime: { view: Overtime }, headcount: { view: Headcount },
  leave: { view: Leave }, audit: { view: Audit, itOk: true },
  "dashboard-hr": { view: DashboardHr },
  "dashboard-exec": { view: DashboardExec, gmOnly: true },
  ...COST_SCREENS,
  ...MORE_SCREENS,
};

/** Reports: a short list; each opens at once, downloads and prints. */
export function Reports(p: ViewProps) {
  const { t } = useLocale();
  const id = REPORTS.find((x) => x === p.rest[0]);
  const screen = SCREENS[p.rest[0] ?? ""];
  const loading = <p className={s.loading}>{t("reports.loading")}</p>;
  if (screen !== undefined) {
    return (
      <Suspense fallback={loading}>
        <Guard gmOnly={screen.gmOnly === true}
          itOk={screen.itOk === true}>
          <screen.view rest={p.rest} />
        </Guard>
      </Suspense>
    );
  }
  return (
    <div className={s.page}>
      <Suspense fallback={loading}>
        {id === undefined ? <Catalogue /> : <Report id={id} />}
      </Suspense>
    </div>
  );
}

function useEnv(): Env {
  const { lang, t } = useLocale();
  const { data } = useDemo();
  const d = useRunDetail();
  const a = useRunApproval();
  return { d, data, lang, t, approved: a.phase === "file" };
}

function Crumbs(p: { title?: string }) {
  const { lang, t } = useLocale();
  const { data } = useDemo();
  return (
    <nav aria-label={t("shell.breadcrumb")} className={s.crumbs}>
      <span>{data.companyName[lang]}</span>
      <span aria-hidden="true" className={s.sep}>/</span>
      {p.title === undefined
        ? <span aria-current="page">{t("shell.navReports")}</span>
        : <>
          <a href={hrefOf("reports")}>{t("shell.navReports")}</a>
          <span aria-hidden="true" className={s.sep}>/</span>
          <span aria-current="page">{p.title}</span>
        </>}
    </nav>
  );
}

function CellView(p: { c: Cell }) {
  const { lang } = useLocale();
  if (typeof p.c === "number") {
    return <span className="tabular">{formatNumber(p.c, lang)}</span>;
  }
  if (typeof p.c === "string") return <>{p.c}</>;
  return <Money value={p.c.fils} size="sm" tween={false} />;
}

function Report(p: { id: ReportId }) {
  const { lang, t } = useLocale();
  const env = useEnv();
  const { state } = useDemo();
  const table: Table = BUILD[p.id](env);
  const title = t(TITLE[p.id]);
  const company = env.data.companyName.en.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  const csv = (): void => downloadText(`${company}-${p.id}-${env.d.month}` +
    ".csv", toCsv([table.columns.map((c) => c.label), ...table.rows]),
  "text/csv;charset=utf-8");
  return (
    <article className={s.report} aria-labelledby="report-title">
      <header className={s.header}>
        <Crumbs title={title} />
        <h1 id="report-title" className={s.title}>{title}</h1>
        <p className={s.sub}>{t(BLURB[p.id])}</p>
        <div className={s.actions}>
          <button type="button" className={`${b.btn} ${b.primary} ${s.act}`}
            onClick={csv} disabled={state.hideAmounts}
            title={state.hideAmounts ? t("reports.hiddenCsv") : undefined}>
            {t("reports.csv")}
          </button>
          <button type="button" className={`${b.btn} ${b.secondary} ${s.act}`}
            onClick={() => print()}>{t("reports.print")}</button>
        </div>
        {table.note !== undefined && (
          <p className={s.note}>{table.note}</p>
        )}
      </header>
      <table className={s.table}>
        <thead>
          <tr>
            {table.columns.map((c, i) => (
              <th key={i} scope="col" className={c.end ? s.end : undefined}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r, i) => (
            <tr key={i} style={{ "--i": Math.min(i, 8) } as object}>
              {r.map((c, j) => {
                const col = table.columns[j];
                const label = col?.label ?? "";
                return j === 0 ? (
                  <th key={j} scope="row" className={s.first}>
                    <span><CellView c={c} /></span>
                    {table.bars !== undefined && (table.bars[i] ?? 0) > 0 && (
                      <span className={s.bar} aria-hidden="true">
                        <span className={s.fill} style={{
                          transform: `scaleX(${(table.bars[i] ?? 0) / 1000})`,
                        }} />
                      </span>
                    )}
                  </th>
                ) : (
                  <td key={j} data-label={label}
                    className={col?.end === true ? s.end : undefined}>
                    {c === "" ? <span className={s.none}>{"–"}</span>
                      : <CellView c={c} />}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className={s.foot}>
        {t("reports.foot", { scope: env.d.scope,
          count: formatNumber(table.rows.length, lang) })}
      </p>
    </article>
  );
}
