import { formatDate } from "../../i18n/format";
import { ReportPage } from "../../ui/templates";
import s from "./papers.module.css";
import { usePapers } from "./usePapers";

/** P45: headcount by nationality only. No target, rate or status. */
export function Emiratisation() {
  const p = usePapers();
  const n = p.data.papers.nationalities();
  const max = Math.max(1, ...n.rows.map((r) => r.count));
  return (
    <ReportPage title="Emiratisation"
      period={`Headcount as of ${formatDate(n.asOf, p.lang)}`}
      figure={{ label: "UAE nationals, active",
        value: <span className={s.big}>
          {n.uaeNationals} of {n.headcount}</span> }}
      columns={[{ label: "Nationality" },
        { label: "People", end: true }]}
      rows={[...n.rows.map((r) => [r.name, String(r.count)]),
        ["Total", String(n.headcount)]]}
      bars={[...n.rows.map((r) => Math.round(r.count * 1000 / max)), 0]}
      note={`${n.headcountText}. Headcount only (${n.label}). No target,
        rate, status or fine is worked out, and nothing is sent to Nafis
        from here.`}
      csvName="headcount-by-nationality.csv" />
  );
}
