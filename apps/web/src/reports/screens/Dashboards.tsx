import { figures } from "../../demo/figures";
import { useDemo } from "../../demo/state";
import { Money } from "../../ui/Money";
import { ReportPage } from "../../ui/templates";
import { useMoney, useReportCrumbs } from "../fmt";
import { useReportsSource } from "../load";
import {
  blockText,
  execDashboardRows,
  hrDashboardRows,
} from "./dashboard-rows";

const COLUMNS = [{ label: "Measure" }, { label: "Now", end: true },
  { label: "Compared with", end: true }, { label: "What it tells you" }];

/** HR dashboard: people, papers and what is waiting, in one table. */
export function DashboardHr() {
  const src = useReportsSource();
  const crumbs = useReportCrumbs();
  const { data, state } = useDemo();
  const last = src.months.at(-1)!;
  const fig = figures(data, state);
  return (
    <ReportPage crumbs={crumbs}
      title="HR dashboard" period={`As of the report date, ` +
      `${last.label} run`}
    figure={{ label: "Problems before sign-off", value:
      `${blockText(fig.blocking)}, ${fig.toReview} to review` }}
    columns={COLUMNS} rows={hrDashboardRows(src, data, state)}
    csvName="hr-dashboard-2026-10.csv"
    note={"Each row comes from the same data as Home, the headcount, " +
      "leave and documents reports and the decisions inbox."} />
  );
}

/** Executive dashboard: the run, what moved it, and what it costs. */
export function DashboardExec() {
  const src = useReportsSource();
  const crumbs = useReportCrumbs();
  const { data, state } = useDemo();
  const { signed } = useMoney();
  const now = src.months.at(-1)!;
  const before = src.months.at(-2)!;
  return (
    <ReportPage crumbs={crumbs}
      title="Executive dashboard"
      period={`${now.label} run against ${before.label}`}
      figure={{ label: "Net pay for the run", value: (
        <Money value={data.headline().netTotalFils} tween={false} />) }}
      columns={COLUMNS} rows={execDashboardRows(src, data, state,
        (f) => signed(f as never))}
      csvName="executive-dashboard-2026-10.csv"
      note={"Figures are the run as it stands today, including the pay " +
        "still held out of the file. Open Variance for the full split."} />
  );
}
