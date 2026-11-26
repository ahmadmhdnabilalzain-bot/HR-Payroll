import type { ReactNode } from "react";
import type { DemoData } from "../../demo/data/types";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { personFor } from "../../demo/time-off";
import s from "./team.module.css";

/** Team and Growth are for HR and the General manager (map section 7). */
export function useAllowed(): boolean {
  const { state } = useDemo();
  return state.role === "hr" || state.role === "gm";
}

/**
 * The page a manager or employee lands on from a deep link: the
 * shell's own refusal ("This page is outside your view.").
 */
export { Outside } from "../../shell/Outside";

export const teamHref = (...rest: string[]): string =>
  hrefOf("people", "team", ...rest);
export const growthHref = (...rest: string[]): string =>
  hrefOf("people", "growth", ...rest);
export const profileHref = (id: string): string => hrefOf("people", id);

export type Tone = "ok" | "warn" | "open" | "plain";

/** A status as a grey, green, amber or accent dot and a plain word. */
export function Status(p: { tone: Tone; children: ReactNode }) {
  return <span className={s.status} data-tone={p.tone}>{p.children}</span>;
}

/** A share as a thin bar; the figure beside it says the number. */
export function Progress(p: { pct: number; label: string }) {
  return (
    <span className={s.progress}>
      <span className={s.track} role="img" aria-label={p.label}>
        <i style={{ inlineSize: `${Math.min(100, Math.max(0, p.pct))}%` }} />
      </span>
      <span className="tabular">{p.label}</span>
    </span>
  );
}

/** The person the current role stands for: id, name and job title. */
export function useMe(): { id: string; name: string; title: string } {
  const { data, state } = useDemo();
  const id = personFor(data, state.role);
  const p = data.people.person(id);
  return { id, name: p?.name.en ?? id, title: p?.role.en ?? "" };
}

/** A person with the job they hold ("Khalid Al Nuaimi, General manager"). */
export function whoIs(data: DemoData, id: string): string {
  const p = data.people.person(id);
  return p === null ? id : `${p.name.en}, ${p.role.en}`;
}

/** "27 Oct 2026", the way the data package writes a date. */
export function shortDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const mon = new Intl.DateTimeFormat("en-GB", { month: "short",
    timeZone: "UTC" }).format(new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, 1)));
  return `${d} ${mon} ${y}`;
}
