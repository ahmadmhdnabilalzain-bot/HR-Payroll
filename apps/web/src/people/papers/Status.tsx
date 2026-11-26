import type { ReactNode } from "react";
import s from "./papers.module.css";
import type { Tone } from "./words";

/** Status as a word plus an 8 px dot (colour never alone). */
export function Status(p: { word: string; tone: Tone }) {
  return (
    <span className={s.status}>
      <span className={s.dot} data-tone={p.tone} aria-hidden="true" />
      {p.word}
    </span>
  );
}

/** A name with a quiet second line (a person's role, a reason). */
export function Stack(p: { main: ReactNode; sub: ReactNode }) {
  return (
    <span>
      {p.main}
      <span className={s.sub}>{p.sub}</span>
    </span>
  );
}
