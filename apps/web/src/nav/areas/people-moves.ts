import type { Area, NavCtx } from "../types";
import { itemsNow } from "../../people/moves/view";

/** WP3: hiring, joining and leaving (navigation map, section 7). */
const HR_GM = ["hr", "gm"] as const;
const go = (screen: string) => ({ section: "people" as const,
  rest: ["moves", screen] });

/** Checklists that still have something to do. */
const withOpen = (c: NavCtx, kind: "joiners" | "leavers"): number =>
  (kind === "joiners" ? c.data.moves.joiners() : c.data.moves.leavers())
    .filter((l) => itemsNow(l.id, l.items, c.state)
      .some((x) => x.state !== "done")).length;

export const AREAS: readonly Area[] = [
  { id: "people.joiners", section: "people", group: "moves",
    label: { en: "Joiner checklists", ar: "قوائم المنضمين" },
    status: "live", archetype: "RT", roles: HR_GM, route: go("joiners"),
    count: (c) => withOpen(c, "joiners"),
    keywords: "joiner onboarding new hire first day starter" },
  { id: "people.leavers", section: "people", group: "moves",
    label: { en: "Leaver checklists, exit", ar: "قوائم المغادرين" },
    status: "live", archetype: "RT", roles: HR_GM, route: go("leavers"),
    count: (c) => withOpen(c, "leavers"),
    keywords: "leaver offboarding exit final settlement gratuity" },
  { id: "people.end", section: "people", group: "moves",
    label: { en: "End employment, resignation", ar: "إنهاء الخدمة" },
    status: "live", archetype: "FA", roles: HR_GM, route: go("end"),
    keywords: "resignation notice terminate last working day" },
];
