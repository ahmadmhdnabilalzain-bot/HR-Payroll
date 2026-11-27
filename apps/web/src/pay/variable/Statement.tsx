import { Explainable } from "../../components/explain";
import { Money } from "../../ui/Money";
import { AttainmentMeter } from "./Meters";
import { Clawback, VarList, VarRow } from "./rows";
import type { CommissionStatement, VariableSource } from "./source";
import s from "../pay.module.css";

/**
 * One salesperson's statement: an attainment meter on the tier bands,
 * then lines for target, sales and attainment, each band with its
 * rate, the commission, the clawback and what is paid. Used on the pay
 * side and on the employee's own page.
 */
export function StatementLines(p: { v: VariableSource;
  st: CommissionStatement; label: string }) {
  const { v, st } = p;
  const att = (
    <Explainable explanation={v.attainment(st)}>
      <span className="tabular">{st.display.attainment}</span>
    </Explainable>
  );
  return (
    <div className={s.stack}>
      <AttainmentMeter tiers={v.commission.tiers}
        attainmentBps={st.attainmentBps} figure={att}
        attainmentText={st.display.attainment} />
      <VarList label={p.label}>
        <VarRow title="Monthly sales target"
          end={<Money value={st.target} size="sm" />} />
        <VarRow title="Sales booked in October"
          end={<Money value={st.booked} size="sm" />} />
        <VarRow title="Attainment" note="Sales booked against the target"
          end={att} />
        {st.bands.map((x) => (
          <VarRow key={x.id} title={x.label}
            note={`${x.rateText} on the sales in this band`}
            end={<Money value={x.commission} size="sm" />} />
        ))}
        <VarRow title="Commission before clawback"
          end={<Explainable explanation={v.commissionOf(st)}>
            <Money value={st.commission} size="sm" /></Explainable>} />
        <VarRow title="Clawback" note={st.reversedSales === 0n
          ? "No sale was cancelled"
          : "A September sale was cancelled in October"}
        end={st.clawback === 0n ? <span className={s.muted}>None</span>
          : <Clawback amount={st.clawback} word={false} />} />
        <VarRow title="Commission to pay" note={st.carried > 0n
          ? "Part of the clawback is carried forward"
          : "Joins the next salary run"}
        end={<Explainable explanation={v.payableOf(st)}>
          <Money value={st.net} size="sm" /></Explainable>} />
      </VarList>
    </div>
  );
}
