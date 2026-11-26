import { Suspense, type ComponentType } from "react";
import { useRunApproval } from "../demo/actions";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { useRunDetail } from "../demo/useRunDetail";
import { formatNumber } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { ReportPage } from "../ui/templates";
import type { ViewProps } from "../views";
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
import { SAFETY_SCREENS } from "../people/safety/Report";
import { MORE_SCREENS } from "./more";
import { ANALYSIS_SCREENS } from "./analysis";
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
  ...SAFETY_SCREENS,
  ...MORE_SCREENS,
  ...ANALYSIS_SCREENS,
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

/** The run reports (summary, departments, ...) on the RP template. */
function Report(p: { id: ReportId }) {
  const { lang, t } = useLocale();
  const env = useEnv();
  const table: Table = BUILD[p.id](env);
  const company = env.data.companyName.en.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  return (
    <ReportPage title={t(TITLE[p.id])} period={t(BLURB[p.id])}
      crumbs={[{ label: t("shell.navReports"), href: hrefOf("reports") }]}
      columns={table.columns} rows={table.rows} bars={table.bars}
      note={table.note}
      csvName={`${company}-${p.id}-${env.d.month}.csv`}
      foot={t("reports.foot", {
        count: formatNumber(table.rows.length, lang) })} />
  );
}
