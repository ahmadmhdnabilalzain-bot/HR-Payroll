import type { ReactNode } from "react";
import s from "./templates.module.css";

export type StatusTone = "ok" | "warn" | "stop" | "neutral" | "done";

/**
 * Status is a dot and a word, never the dot alone: the word stays
 * neutral ink, the dot carries the state. `pill` sets it on a tinted
 * capsule (a record's status beside its title).
 */
export function StatusPill(p: { tone: StatusTone; children: ReactNode;
  pill?: boolean }) {
  return (
    <span className={p.pill === true ? s.pill : s.status}
      data-tone={p.tone}>
      <span className={s.dot} aria-hidden="true" />
      {p.children}
    </span>
  );
}
