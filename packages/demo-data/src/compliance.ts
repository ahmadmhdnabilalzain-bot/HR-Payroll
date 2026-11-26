import { AS_OF } from "./calendar";
import type { DemoEmployee, NationalityHeadcount } from "./types";

const activeOn = (e: DemoEmployee, d: string) => e.joiningDate <= d &&
  (e.leavingDate === null || e.leavingDate >= d);

/**
 * Headcount by nationality on the demo date: plain counts, nothing
 * more. The engine's Emiratisation pack rests on secondary research
 * into the general private-sector rule, and whether banks fall under
 * it is unconfirmed, so the bank demo shows no target, status or fine.
 */
export function buildNationalities(employees: DemoEmployee[])
  : Omit<NationalityHeadcount, "headcountText"> {
  const active = employees.filter((e) => activeOn(e, AS_OF));
  const counts = new Map<string, number>();
  for (const e of active) {
    counts.set(e.nationality, (counts.get(e.nationality) ?? 0) + 1);
  }
  return { asOf: AS_OF,
    label: "sample data, regime for banks to be confirmed",
    headcount: active.length,
    uaeNationals: active.filter((e) => e.nationality === "AE").length,
    byNationality: [...counts.entries()].map(([nationality, count]) =>
      ({ nationality, count })).sort((a, b) => b.count - a.count ||
      (a.nationality < b.nationality ? -1 : 1)) };
}
