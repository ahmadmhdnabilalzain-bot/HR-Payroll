import type { ReactNode } from "react";
import s from "./templates.module.css";

/** "Aisha Al Marri" gives "AM": the first and the last word. */
export function initials(name: string): string {
  const w = name.trim().split(/\s+/).filter(Boolean);
  const first = w[0]?.[0] ?? "";
  const last = w.length > 1 ? w.at(-1)?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

/** One of the eight avatar tints, the same for a name every time. */
export function tintOf(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (h % 8) + 1;
}

/**
 * A person's initials on a tint (--color-avatar-1..8, by a hash of the
 * name). Decorative: the name is always written beside it. Lane 1's
 * avatar component replaces this once it lands.
 */
export function Avatar(p: { name: string; size?: number }) {
  return (
    <span className={s.avatar} aria-hidden="true" style={{
      "--tint": `var(--color-avatar-${tintOf(p.name)})`,
      "--size": `${p.size ?? 32}px` } as object}>
      {initials(p.name)}
    </span>
  );
}

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
