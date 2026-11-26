import { personFor } from "../../demo/time-off";
import type { DemoData } from "../../demo/data/types";
import type { DemoState } from "../../demo/state";

/** Who is acting, in which role, on which demo day (all from data). */
export interface Actor {
  who: string;
  role: string;
  on: string;
  canEdit: boolean;
}

export function actorOf(d: DemoData, s: Pick<DemoState, "role">): Actor {
  const p = d.people.person(personFor(d, s.role));
  return { who: p?.name.en ?? "Unknown", role: p?.role.en ?? "",
    on: d.people.asOf, canEdit: s.role === "hr" };
}
