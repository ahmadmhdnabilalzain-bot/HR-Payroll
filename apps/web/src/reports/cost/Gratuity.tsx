import { Explainable } from "../../components/explain";
import { Money } from "../../ui/Money";
import { FilterList } from "../../ui/templates";
import { useCostSource } from "./load";
import type { CostSource } from "./source";
import s from "./cost.module.css";
import tpl from "../../ui/templates/templates.module.css";

type Row = CostSource["gratuity"]["rows"][number];
const COUNTED = (r: Row): boolean => r.amount !== null;

/** R33: gratuity per person as of the demo day, and the company total. */
export function GratuityProvisionScreen() {
  const src = useCostSource();
  const g = src.gratuity;
  return (
    <>
      <FilterList title="Gratuity provision"
        lede={g.display.counts}
        meta={(
          <section className={s.summary} aria-label="Company total">
            <div className={tpl.figure}>
              <span>
                Company's accrued liability estimate, {src.asOfText}</span>
              <strong>
                <Explainable explanation={src.totalExplain}>
                  <Money value={g.total} size="lg" />
                </Explainable>
              </strong>
            </div>
            <p className={s.basis}>{g.basis}</p>
            {g.settlement.map((x) => (
              <p key={x.employeeId} className={s.basis}>
                {x.name} has left. The gratuity is in the final settlement
                and not in this total.
              </p>
            ))}
          </section>
        )}
        rows={g.rows} rowKey={(r) => r.employeeId}
        searchText={(r) => `${r.name} ${r.departmentText} ${r.jobText}`}
        segments={[
          { id: "all", label: "Everyone", match: () => true },
          { id: "counted", label: "Counted", match: COUNTED },
          { id: "not-eligible", label: "Not yet eligible",
            match: (r) => r.outcome === "not-eligible" },
          { id: "national", label: "UAE nationals",
            match: (r) => r.outcome === "not-applicable" },
        ]}
        columns={[
          { key: "who", label: "Person", render: (r) => r.name },
          { key: "dept", label: "Department",
            render: (r) => r.departmentText },
          { key: "svc", label: "Service", render: (r) => r.display.service },
          { key: "amt", label: "Provision", end: true, render: (r) =>
            r.amount === null
              ? <span className={s.muted}>{r.display.amount}</span>
              : (
                <Explainable explanation={src.explain[r.employeeId]}>
                  <Money value={r.amount} size="sm" tween={false} />
                </Explainable>) },
        ]}
        empty="Nobody matches. Clear the search to see everyone." />
    </>
  );
}
