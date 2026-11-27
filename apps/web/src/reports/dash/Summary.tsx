import type { ReactNode } from "react";
import { useRunApproval } from "../../demo/actions";
import { useDemo } from "../../demo/state";
import { useLocale } from "../../i18n/LocaleProvider";
import { useRowLink } from "../../ui/RowLink";
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
  /** Where the point opens: the whole point is the link. */
  href?: string;
  /** Where a point whose figure is its own button opens: the rest of
   * the point is a row link around it (never a button in a link). */
  rowHref?: string;
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
            {c.points.map((x) => {
              const body = (
                <>
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
                </>
              );
              if (x.href === undefined && x.rowHref !== undefined) {
                return <PointRow key={x.key} href={x.rowHref}
                  label={x.text}>{body}</PointRow>;
              }
              return (
                <li key={x.key} className={s.point}>
                  {x.href === undefined ? body : (
                    <a className={s.pointLink} href={x.href}>{body}</a>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/**
 * A point that holds its own control (a figure's working): the point is
 * a row link, and a press on the figure, or inside the sheet it opens
 * (a portal, so React bubbles it here), stays with the figure.
 */
function PointRow(p: { href: string; label: string; children: ReactNode }) {
  const row = useRowLink({ href: p.href, label: p.label });
  return (
    <li className={s.point}>
      <div {...row} className={`${row.className} ${s.pointLink}`}
        onClick={(e) => {
          if (e.target instanceof Node && e.currentTarget.contains(e.target)) {
            row.onClick(e);
          }
        }}>{p.children}</div>
    </li>
  );
}

/** A count with a smaller unit after it: "2 stop pay". */
export function Count(p: { n: number; unit?: string }) {
  return (
    <>
      <span className="tabular">{p.n}</span>
      {p.unit !== undefined && p.unit !== "" && (
        <span className={s.unit}>{p.unit}</span>)}
    </>
  );
}

/** Where the October run's sign-off stands, as a dot and a word. */
export function useRunState(): { tone: Tone; word: string; who: string;
  /** Who decides, or who decided. */
  meta: string } {
  const run = useRunApproval();
  const { data } = useDemo();
  const { lang } = useLocale();
  const who = data.employee(data.runPeople().checkerId).name[lang];
  const decides = `${who}, General manager, decides`;
  if (run.phase === "file") {
    return { tone: "good", word: "Signed off", who,
      meta: `Decided by ${who}; the salary file can go` };
  }
  if (run.phase === "declined") {
    return { tone: "warn", word: "Sent back", who,
      meta: `${who} sent it back to HR` };
  }
  if (run.phase === "approve") {
    return { tone: "wait", word: "Ready for sign-off", who, meta: decides };
  }
  return { tone: "bad", word: "Held by bank details", who, meta: decides };
}

/**
 * Every point opens its page, found from its own words (itemSeam),
 * except the keys given: a point whose figure is already a button
 * (its working) is a row link around it, never a button inside a link.
 */
export function linkPoints(columns: Column[], hrefOf: (words: string)
  => string | undefined, keep: readonly string[] = []): Column[] {
  return columns.map((c) => ({ ...c, points: c.points.map((x) => {
    const href = hrefOf(x.text);
    if (href === undefined) return x;
    return keep.includes(x.key) ? { ...x, rowHref: href } : { ...x, href };
  }) }));
}
