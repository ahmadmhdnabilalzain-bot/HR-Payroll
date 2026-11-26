import { Suspense, type ComponentType } from "react";
import { useRunApproval } from "../demo/actions";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { useRunDetail } from "../demo/useRunDetail";
import { formatNumber } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { downloadText } from "../lib/download";
import { Money } from "../ui/Money";
import { MoreMenu, PageHead } from "../ui/templates";
import tp from "../ui/templates/templates.module.css";
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
    <Suspense fallback={loading}>
      {id === undefined ? <Catalogue /> : <Report id={id} />}
    </Suspense>
  );
}

function useEnv(): Env {
  const { lang, t } = useLocale();
  const { data } = useDemo();
  const d = useRunDetail();
  const a = useRunApproval();
  return { d, data, lang, t, approved: a.phase === "file" };
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
    <article className={`${tp.page} ${s.report}`}
      aria-labelledby="report-title">
      <PageHead id="report-title" title={title} lede={t(BLURB[p.id])}
        crumbs={[{ label: t("shell.navReports"), href: hrefOf("reports") }]}
        actions={<MoreMenu items={[{ label: t("reports.csv"), onSelect: csv,
          disabled: state.hideAmounts, hint: t("reports.hiddenCsv") },
        { label: t("reports.print"), onSelect: () => print() }]} />}
        meta={table.note === undefined ? undefined
          : <p className={s.note}>{table.note}</p>} />
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
