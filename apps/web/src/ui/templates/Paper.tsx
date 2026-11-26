import type { ReactNode } from "react";
import s from "./templates.module.css";

/**
 * A letter drawn as a page: a paper card at a readable measure, a
 * letterhead (the company, a rule, the reference and date), the title,
 * the body and the signature block. What a third party receives: no
 * provenance in here (that is the page's sources line). Printing shows
 * the paper alone.
 */
export function Paper(p: { company: string; title: string;
  label: string; reference?: string | undefined;
  date?: string | undefined; sign?: ReactNode; children: ReactNode }) {
  return (
    <article className={s.paper} aria-label={p.label}>
      <header className={s.letterhead}>
        <span className={s.lhName}>{p.company}</span>
        <span className={s.lhMeta}>
          {p.reference !== undefined && <span>{p.reference}</span>}
          {p.date !== undefined && <span>{p.date}</span>}
        </span>
      </header>
      <h2 className={s.paperTitle}>{p.title}</h2>
      <div className={s.paperBody}>{p.children}</div>
      {p.sign !== undefined && (
        <footer className={s.paperSign}>{p.sign}</footer>
      )}
    </article>
  );
}

/** A pay line in a letter: the label, dotted leaders, the amount. */
export function PaperLine(p: { label: string; value: ReactNode;
  total?: boolean }) {
  return (
    <div className={s.paperLine} data-total={p.total === true}>
      <span>{p.label}</span>
      <span className={s.leader} aria-hidden="true" />
      <span>{p.value}</span>
    </div>
  );
}
