import { Explainable } from "../../components/explain";
import { Money } from "../../ui/Money";
import type { CommissionStatement, VariableSource } from "./source";
import s from "../pay.module.css";

/**
 * One salesperson's statement as lines: target, sales and attainment,
 * each tier band with its rate, the commission, the clawback line and
 * what is paid. Used on the pay side and on the employee's own page.
 */
export function StatementLines(p: { v: VariableSource;
  st: CommissionStatement; label: string }) {
  const { v, st } = p;
  const line = (key: string, text: string, note: string | null,
    end: React.ReactNode) => (
    <li key={key} className={s.row}>
      <span className={s.rowText}>{text}
        {note !== null && <small>{note}</small>}</span>
      <span className={s.rowEnd}>{end}</span>
    </li>
  );
  return (
    <ul className={s.list} aria-label={p.label}>
      {line("target", "Monthly sales target", null,
        <Money value={st.target} size="sm" />)}
      {line("booked", "Sales booked in October", null,
        <Money value={st.booked} size="sm" />)}
      {line("att", "Attainment", "Sales booked against the target",
        <Explainable explanation={v.attainment(st)}>
          <span className="tabular">{st.display.attainment}</span>
        </Explainable>)}
      {st.bands.map((x) => line(x.id, x.label,
        `${x.rateText} on the sales in this band`,
        <Money value={x.commission} size="sm" />))}
      {line("comm", "Commission before clawback", null,
        <Explainable explanation={v.commissionOf(st)}>
          <Money value={st.commission} size="sm" /></Explainable>)}
      {line("claw", "Clawback", st.reversedSales === 0n
        ? "No sale was cancelled"
        : "A September sale was cancelled in October",
      st.clawback === 0n ? <span className={s.muted}>None</span>
        : <Money value={st.clawback} size="sm" signed />)}
      {line("pay", "Commission to pay",
        st.carried > 0n ? "Part of the clawback is carried forward"
          : "Joins the next salary run",
        <Explainable explanation={v.payableOf(st)}>
          <Money value={st.net} size="sm" /></Explainable>)}
    </ul>
  );
}
