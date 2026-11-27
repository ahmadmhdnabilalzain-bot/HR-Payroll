import s from "./ReportFilter.module.css";

export interface FilterOption<K extends string> {
  id: K;
  label: string;
  /** How many rows it keeps, said on the button. */
  count: number;
}

/**
 * A report's filter: a row of 44 px segments, and one line that says
 * what is shown ("2 of 3 shown") for screen readers and eyes alike.
 */
export function ReportFilter<K extends string>(p: { label: string;
  options: FilterOption<K>[]; value: K; onChange(k: K): void;
  shown: number; total: number }) {
  return (
    <div className={s.bar}>
      <div className={s.segments} role="group" aria-label={p.label}>
        {p.options.map((o) => (
          <button key={o.id} type="button" className={s.segment}
            aria-pressed={o.id === p.value}
            onClick={() => p.onChange(o.id)}>
            {o.label} <span className="tabular">{o.count}</span>
          </button>
        ))}
      </div>
      <p className={s.state} role="status" aria-live="polite">
        {p.shown === p.total ? `All ${p.total} shown`
          : `${p.shown} of ${p.total} shown`}
      </p>
    </div>
  );
}

/** What an empty filter says, above the (empty) table. */
export function ReportEmpty(p: { text: string }) {
  return <p className={s.empty}>{p.text}</p>;
}
