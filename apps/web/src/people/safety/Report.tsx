import type { ComponentType } from "react";
import { useDemo } from "../../demo/state";
import { ReportPage } from "../../ui/templates";
import type { ViewProps } from "../../views";
import { T } from "./words";

const W = T.report;

/** E14, Safety incidents report: by month and severity. */
function SafetyReport() {
  const { data, state } = useDemo();
  const closed = Object.entries(state.safetyMarks)
    .filter(([k, m]) => k.startsWith("inc:") && m.status === "closed")
    .map(([k]) => k.slice(4));
  const months = data.safety.byMonth(closed);
  const total = months.reduce((n, m) => n + m.total, 0);
  const max = Math.max(1, ...months.map((m) => m.total));
  const first = months[0]?.monthText.split(" ")[0] ?? "";
  const last = months[months.length - 1]?.monthText ?? "";
  return (
    <ReportPage title={W.title} period={`${first} to ${last}`}
      figure={{ label: W.figure, value: String(total) }}
      columns={[{ label: W.month }, { label: W.low, end: true },
        { label: W.medium, end: true }, { label: W.high, end: true },
        { label: W.total, end: true }, { label: W.open, end: true }]}
      rows={months.map((m) => [m.monthText, String(m.low),
        String(m.medium), String(m.high), String(m.total),
        String(m.open)])}
      bars={months.map((m) => Math.round(m.total * 1000 / max))}
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
