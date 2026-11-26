import type { HiringCandidate } from "../../demo/data/moves-types";
import s from "./moves.module.css";

/** A candidate's interviews: date, result, who sat on the panel. */
export function Interviews(p: { list: HiringCandidate["interviews"] }) {
  if (p.list.length === 0) {
    return <p className={s.quiet}>No interviews yet.</p>;
  }
  return (
    <ul className={s.group} aria-label="Interviews">
      {p.list.map((i) => (
        <li key={i.date.iso}>
          <div className={s.item}>
            <div className={s.itemMain}>
              <span className={s.itemTitle}>
                {i.date.display}: {i.outcomeText}
              </span>
              <span className={s.itemMeta}>
                <span>{i.panel.map((x) => x.name).join(", ")}</span>
                <span>{i.note}</span>
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
