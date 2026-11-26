import { fils } from "@payroll/engine";
import { Money } from "../../ui/Money";
import { ReportPage } from "../../ui/templates";
import { useDemo } from "../../demo/state";
import { plural, useMoney } from "../fmt";
import { usePlanningSource } from "./load";
import s from "./planning.module.css";

/** P68: seats, vacancies and leavers against the 2027 budget. */
export function WorkforceScreen() {
  const src = usePlanningSource();
  const w = src.workforce;
  const { state } = useDemo();
  const { m } = useMoney();
  const merit = (dept: string): bigint => state.planBatches.flatMap((x) =>
    x.items).filter((i) => i.departmentId === dept)
    .reduce((n, i) => n + (i.to - i.from) * 12n, 0n);
  const all = w.rows.reduce((n, r) => n + merit(r.departmentId), 0n);
  const mer = (v: bigint): string => v === 0n ? "None yet" : m(fils(v));
  const rows = w.rows.map((r) => [r.departmentText, String(r.seats),
    String(r.filled), String(r.vacant), String(r.onHold), String(r.now),
    String(r.yearEnd), r.gap === 0 ? "None" : String(r.gap),
    m(r.budget.total) + " (estimate)", mer(merit(r.departmentId))]);
  const t = w.totals;
  rows.push(["Whole company", String(t.seats), String(t.filled),
    String(t.vacant), String(t.onHold), String(t.now), String(t.yearEnd),
    String(w.rows.reduce((n, r) => n + r.gap, 0)),
    m(t.budget) + " (estimate)", mer(all)]);
  return (
    <>
      <ReportPage title="Workforce planning"
        period={`${w.year} plan, people as of ${w.asOfText}`}
        figure={{ label: `${w.year} payroll budget, estimate`,
          value: <Money value={t.budget} size="lg" tween={false} /> }}
        columns={[{ label: "Department" }, { label: "Seats", end: true },
          { label: "Filled", end: true }, { label: "Vacant", end: true },
          { label: "On hold", end: true }, { label: "People now", end: true },
          { label: "Expected at year end", end: true },
          { label: "Still to fill", end: true },
          { label: `${w.year} budget`, end: true },
          { label: "Signed-off increases, a year", end: true }]}
        rows={rows} csvName="workforce-plan-2027.csv" note={w.basis} />
      <div className={s.wrap}>
        {w.leavers.map((l) => (
          <p key={l.name} className={s.basis}>
            {`Leaver: ${l.name}, ${l.departmentText}, last day ` +
              `${l.lastDay}. ${l.seatText}.`}</p>
        ))}
        {w.joiners.map((j) => (
          <p key={j.name} className={s.basis}>
            {`Joiner: ${j.name}, ${j.departmentText}, joins ${j.joins}.`}</p>
        ))}
        <p className={s.basis}>
          {`${plural(t.unpriced, "open seat has", "open seats have")} no ` +
            "accepted offer, so it is counted as a seat but not priced."}
        </p>
      </div>
    </>
  );
}
