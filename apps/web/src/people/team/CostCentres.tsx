import { fils } from "@payroll/engine";
import type { CostCentreView } from "../../demo/data/team-types";
import { useDemo } from "../../demo/state";
import { Money } from "../../ui/Money";
import { FilterList } from "../../ui/templates";
import { W } from "./words";
import s from "./team.module.css";

interface Row {
  key: string;
  name: string;
  code: string;
  slips: number;
  gross: CostCentreView["monthlyGross"]["value"];
}

/**
 * P08, Cost centres: one for each department, with the pay run's own
 * gross. The last row adds them up. No row opens anything: a cost
 * centre has no page of its own in the demo.
 */
export function CostCentres() {
  const { data } = useDemo();
  const list = data.team.costCentres();
  const w = W.centres;
  const rows: Row[] = list.map((x) => ({ key: x.code,
    name: x.departmentText, code: x.code, slips: x.payslips,
    gross: x.monthlyGross.value }));
  const total = fils(list.reduce((n, x) =>
    n + BigInt(x.monthlyGross.value), 0n));
  return (
    <FilterList title={w.title} lede={w.lede} rows={rows}
      actions={(
        <span className={s.total}>
          <span>{w.total}</span> <Money value={total} size="lg" />
        </span>
      )}
      rowKey={(r) => r.key}
      searchText={(r) => `${r.name} ${r.code}`}
      columns={[
        { key: "n", label: w.dept, render: (r) => (
          <span className={s.name}>
            <span>{r.name}</span>
            <span className={s.sub}>{r.code}</span>
          </span>) },
        { key: "p", label: w.slips, end: true,
          render: (r) => `${r.slips} payslips` },
        { key: "g", label: w.gross, end: true,
          render: (r) => <Money value={r.gross} size="sm" /> },
      ]}
      empty={w.empty} />
  );
}
