import type { LetterLine } from "../../demo/data/moves-types";
import { Money } from "../../ui/Money";
import s from "./moves.module.css";

/**
 * An offer letter as a page of text. Pay lines go through <Money>, so
 * hiding amounts hides them here too.
 */
export function Letter(p: { lines: LetterLine[] }) {
  return (
    <article className={s.letter} aria-label="Offer letter">
      {p.lines.map((l, i) => l.kind === "pay" ? (
        <div key={i} className={s.letterPay}>
          <span>{l.label}</span>
          <Money value={l.fils} />
        </div>
      ) : l.text === "" ? <div key={i} className={s.gap} /> : (
        <p key={i} className={i < 2 ? s.letterHead : s.letterLine}>
          {l.text}
        </p>
      ))}
    </article>
  );
}
