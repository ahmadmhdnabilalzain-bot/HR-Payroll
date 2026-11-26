import { useMemo, useState } from "react";
import { useDemo } from "../../demo/state";
import { useExtras } from "../../demo/data/payroll-extras-load";
import { Money } from "../../ui/Money";
import { ReportPage } from "../../ui/templates";
import { useCellMoney as useMoney } from "../../pay/gate/cell-money";
import s from "../../pay/gate/gate.module.css";

/**
 * S38: our October run against your current system's figures, from
 * a built-in sample export. Each difference is matched to causes the
 * engine works out; nothing is imported.
 */
export function ParallelRun() {
  const x = useExtras();
  const { state } = useDemo();
  const { m, signed } = useMoney();
  const [id, setId] = useState(x.samples[0]!.id);
  const sample = x.samples.find((y) => y.id === id) ?? x.samples[0]!;
  const r = useMemo(() => x.compare(sample.text), [x, sample]);
  const rows = r.rows.map((y) => [y.name,
    y.ours === null ? "Not in our run" : m(y.ours),
    y.theirs === null ? "Not read" : m(y.theirs),
    y.difference === null || y.difference === 0n ? ""
      : signed(y.difference), y.statusText, y.causeText]);
  return (
    <ReportPage title="Parallel run: October"
      period={`Our run against your current system. ${r.summaryText}`}
      figure={{ label: "Net pay for these people, ours", value: (
        <Money value={r.oursTotal} size="lg" tween={false} />) }}
      columns={[{ label: "Person" }, { label: "Ours", end: true },
        { label: "Old system", end: true },
        { label: "Difference", end: true }, { label: "Result" },
        { label: "Likely cause" }]}
      meta={(
        <div className={s.controls} role="group" aria-label="Old system file">
          <div className={s.segments} role="group" aria-label="Sample file">
            {x.samples.map((y) => (
              <button key={y.id} type="button" className={s.segment}
                aria-pressed={y.id === sample.id} onClick={() => setId(y.id)}>
                {y.label}</button>
            ))}
          </div>
          {!state.hideAmounts && (
            <details className={s.details}>
              <summary>Show the file, {sample.fileName}</summary>
              <pre className={s.file}>{sample.text}</pre>
            </details>
          )}
        </div>
      )}
      rows={rows} csvName={`parallel-run-${sample.id}-2026-10.csv`}
      note={`${sample.note} Old system total ${m(r.theirsTotal)}. Each ` +
        "likely cause is the difference we get when we run " +
        "the person's month on the old system's assumption, as set up in " +
        "this sample. Nothing is imported."} />
  );
}
