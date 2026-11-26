import s from "./papers.module.css";
import type { Tone } from "./words";

export interface HistoryItem {
  text: string;
  when?: string;
  tone: Tone;
}

/** What happened to a record, newest last: an inset grouped list. */
export function History(p: { items: HistoryItem[] }) {
  return (
    <ul className={s.history}>
      {p.items.map((x, i) => (
        <li key={i}>
          <span className={s.dot} data-tone={x.tone} aria-hidden="true" />
          <span>
            {x.text}
            {x.when !== undefined && (
              <span className={s.historyWhen}>{x.when}</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
