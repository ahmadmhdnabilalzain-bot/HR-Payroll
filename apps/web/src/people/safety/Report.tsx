import { useState, type ComponentType } from "react";
import { ReportEmpty, ReportFilter } from "../../reports/ReportFilter";
import { useDemo } from "../../demo/state";
import { reportViews } from "../../time/finish/views";
import { ReportPage } from "../../ui/templates";
import type { ViewProps } from "../../views";
import { fill, T } from "./words";

const W = T.report;
type Show = "all" | "open" | "high";

/** E14, Safety incidents report: by month and severity. */
function SafetyReport() {
  const { data, state } = useDemo();
  const closed = Object.entries(state.safetyMarks)
    .filter(([k, m]) => k.startsWith("inc:") && m.status === "closed")
    .map(([k]) => k.slice(4));
  const months = data.finish.byMonthWith(closed, reportViews(data, state));
  const [show, setShow] = useState<Show>("all");
  const keep = (k: Show) => months.filter((m) => k === "all" ||
    (k === "open" ? m.open > 0 : m.high > 0));
  const rows = keep(show);
  const total = months.reduce((n, m) => n + m.total, 0);
  const max = Math.max(1, ...rows.map((m) => m.total));
  const first = months[0]?.monthText.split(" ")[0] ?? "";
  const last = months[months.length - 1]?.monthText ?? "";
  return (
    <ReportPage title={W.title} period={fill(W.period, { first, last })}
      figure={{ label: W.figure, value: String(total) }}
      meta={(
        <ReportFilter<Show> label={W.show} value={show} onChange={setShow}
          shown={rows.length} total={months.length} options={[
            { id: "all", label: W.allMonths, count: keep("all").length },
            { id: "open", label: W.withOpen, count: keep("open").length },
            { id: "high", label: W.withHigh, count: keep("high").length }]}
        />
      )}
      chart={rows.length > 0 ? undefined : <ReportEmpty text={
        months.length === 0 ? W.none : show === "open" ? W.noneOpen
          : W.noneHigh} />}
      columns={[{ label: W.month }, { label: W.low, end: true },
        { label: W.medium, end: true }, { label: W.high, end: true },
        { label: W.total, end: true }, { label: W.open, end: true }]}
      rows={rows.map((m) => [m.monthText, String(m.low),
        String(m.medium), String(m.high), String(m.total),
        String(m.open)])}
      bars={rows.map((m) => Math.round(m.total * 1000 / max))}
      note={W.note} csvName="safety-incidents-2026-10-27.csv" />
  );
}

/** The report for the Reports router: HR and General manager. */
export const SAFETY_SCREENS: Record<string,
  { view: ComponentType<ViewProps> }> = {
  "safety-incidents": { view: SafetyReport },
};

export const SAFETY_BLURBS: Readonly<Record<string, string>> = {
  "reports.safety-incidents": "How many safety incidents were logged " +
    "each month, and how serious were they?",
};
