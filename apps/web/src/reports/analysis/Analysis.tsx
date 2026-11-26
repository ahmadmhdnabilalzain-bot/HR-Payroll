import { useState } from "react";
import { useDemo } from "../../demo/state";
import { useExtras } from "../../demo/data/payroll-extras-load";
import { ReportPage } from "../../ui/templates";
import s from "../../pay/gate/gate.module.css";

const MASK = "AED ••••••";

/**
 * X30: choose a dataset, what to group by and what to add up; see a
 * table with bars. Read from the existing selectors; nothing is saved.
 */
export function AnalysisBuilder() {
  const x = useExtras();
  const { state } = useDemo();
  const [dsId, setDs] = useState(x.datasets[0]!.id);
  const ds = x.datasets.find((d) => d.id === dsId) ?? x.datasets[0]!;
  const [dimId, setDim] = useState(ds.dims[0]!.id);
  const [mId, setM] = useState(ds.measures[0]!.id);
  const dim = ds.dims.find((d) => d.id === dimId) ?? ds.dims[0]!;
  const measure = ds.measures.find((d) => d.id === mId) ?? ds.measures[0]!;
  const r = x.analyse(ds.id, dim.id, measure.id);
  const hide = state.hideAmounts && measure.kind === "money";
  const most = r.rows.reduce((n, y) => y.value > n ? y.value : n, 0n);
  const pick = (id: string): void => {
    const next = x.datasets.find((d) => d.id === id) ?? x.datasets[0]!;
    setDs(next.id);
    setDim(next.dims[0]!.id);
    setM(next.measures[0]!.id);
  };
  return (
    <ReportPage title="Analysis builder"
      period={`${measure.label} by ${dim.label.toLowerCase()}, ` +
        ds.label.toLowerCase()}
      figure={{ label: `${measure.label}, all together`,
        value: hide ? MASK : r.totalDisplay }}
      columns={[{ label: dim.label }, { label: measure.label, end: true }]}
      rows={r.rows.map((y) => [y.label === "" ? "Not recorded" : y.label,
        hide ? MASK : y.display])}
      bars={r.rows.map((y) => most === 0n ? 0
        : Number(y.value * 1000n / most))}
      meta={(
        <div className={s.controls} role="group" aria-label="Build the table">
          <div className={s.segments} role="group" aria-label="Dataset">
            {x.datasets.map((d) => (
              <button key={d.id} type="button" className={s.segment}
                aria-pressed={d.id === ds.id} onClick={() => pick(d.id)}>
                {d.label}</button>
            ))}
          </div>
          <label className={s.field}>
            <span>Group by</span>
            <select value={dim.id} onChange={(e) => setDim(e.target.value)}>
              {ds.dims.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </label>
          <label className={s.field}>
            <span>Add up</span>
            <select value={measure.id} onChange={(e) => setM(e.target.value)}>
              {ds.measures.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      csvName={`analysis-${ds.id}-${dim.id}-${measure.id}.csv`}
      note={`${ds.source}. Nothing here is saved; choose again to ` +
        "build another table."} />
  );
}
