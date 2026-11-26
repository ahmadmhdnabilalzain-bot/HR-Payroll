import type { ReactNode } from "react";
import { useRunApproval } from "../../demo/actions";
import { useDemo } from "../../demo/state";
import { useLocale } from "../../i18n/LocaleProvider";
import s from "./dash.module.css";

export type Tone = "bad" | "warn" | "good" | "wait";

export interface Point {
  key: string;
  /** A 28 px figure: <Money/> or a count, with an optional unit. */
  figure?: ReactNode;
  text: string;
  meta?: ReactNode;
  /** A state word with its dot; colour never stands alone. */
  state?: { tone: Tone; word: string };
}

export interface Column {
  id: string;
  title: string;
  points: Point[];
}

/**
 * One screen before the table: what changed, what needs a decision,
 * what is at risk. Each column is a white card of short points, a
 * figure first where there is one.
 */
export function Summary(p: { columns: Column[]; label: string }) {
  return (
    <div className={s.summary} role="group" aria-label={p.label}>
      {p.columns.map((c) => (
        <section key={c.id} className={s.column}
          aria-labelledby={`sum-${c.id}`}>
          <h2 id={`sum-${c.id}`} className={s.columnTitle}>{c.title}</h2>
          <ul className={s.points}>
            {c.points.map((x) => (
              <li key={x.key} className={s.point}>
                {x.figure !== undefined && (
                  <span className={s.pointFigure}>{x.figure}</span>
                )}
                <span className={s.pointText}>{x.text}</span>
                {x.state !== undefined && (
                  <span className={s.state} data-tone={x.state.tone}>
                    {x.state.word}</span>
                )}
                {x.meta !== undefined && (
                  <span className={s.pointMeta}>{x.meta}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** A count with a smaller unit after it: "2 stop pay". */
export function Count(p: { n: number; unit?: string }) {
  return (
    <>
      <span className="tabular">{p.n}</span>
      {p.unit !== undefined && <span className={s.unit}>{p.unit}</span>}
    </>
  );
}

/** Where the October run's sign-off stands, as a dot and a word. */
export function useRunState(): { tone: Tone; word: string; who: string } {
  const run = useRunApproval();
  const { data } = useDemo();
  const { lang } = useLocale();
  const who = data.employee(data.runPeople().checkerId).name[lang];
  if (run.phase === "file") {
    return { tone: "good", word: "Signed off", who };
  }
  if (run.phase === "declined") {
    return { tone: "warn", word: "Sent back", who };
  }
  if (run.phase === "approve") {
    return { tone: "wait", word: "Ready for sign-off", who };
  }
  return { tone: "bad", word: "Held by bank details", who };
}
