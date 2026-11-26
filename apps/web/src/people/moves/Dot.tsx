import type { ReactNode } from "react";
import type { Tone } from "./view";
import s from "./moves.module.css";

/** Status is a word with a dot, never colour alone. */
export function Dot(p: { tone: Tone; children: ReactNode }) {
  return (
    <span className={s.status}>
      <span className={s.dot} data-tone={p.tone} aria-hidden="true" />
      {p.children}
    </span>
  );
}
