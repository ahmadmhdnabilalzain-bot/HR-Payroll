import { commissionStatus } from "../demo/commission-state";
import { useDemo } from "../demo/state";
import { personFor } from "../demo/time-off";
import { useVariableSource } from "../pay/variable/load";
import { StatementLines } from "../pay/variable/Statement";
import s from "../pay/pay.module.css";

/**
 * P66, the employee's side: their own commission statement, on the
 * payslip page, once the General manager has signed the month off.
 * Nothing shows for someone who is not on the commission plan.
 */
export function MyCommission() {
  const v = useVariableSource();
  const { data, state } = useDemo();
  const me = personFor(data, state.role);
  const st = v.commission.statements.find((x) => x.employeeId === me);
  if (st === undefined) return null;
  const month = state.commissionMonths[v.commission.month];
  const status = commissionStatus(month);
  return (
    <section className={`${s.page} ${s.section}`} aria-labelledby="mycomm">
      <h2 id="mycomm" className={s.sectionTitle}>
        {`Commission statement, ${v.commission.monthText}`}</h2>
      {status === "signed" ? (
        <>
          <StatementLines v={v} st={st} label="My commission statement" />
          <p className={s.note}>It joins {v.commission.paidWith}.</p>
        </>
      ) : (
        <p className={s.muted}>Your statement for {v.commission.monthText}
          {" "}appears here once the General manager has signed it off.</p>
      )}
    </section>
  );
}
