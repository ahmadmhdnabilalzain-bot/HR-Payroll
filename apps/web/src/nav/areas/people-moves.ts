import type { Area, NavCtx } from "../types";
import { itemsNow, offerNow } from "../../people/moves/view";

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
  { id: "people.requisitions", section: "people", group: "hiring",
    label: { en: "Hiring: requisitions", ar: "التوظيف: طلبات الشغور" },
    status: "live", archetype: "LF", roles: HR_GM, route: go("requisitions"),
    count: (c) => c.data.moves.summary().openRequisitions,
    keywords: "requisition vacancy open role recruit hire" },
  { id: "people.board", section: "people", group: "hiring",
    label: { en: "Hiring: candidates board", ar: "التوظيف: المرشحون" },
    status: "live", archetype: "LF", roles: HR_GM, route: go("board"),
    count: (c) => c.data.moves.summary().candidatesInProcess,
    keywords: "candidate applicant interview screening pipeline" },
  { id: "people.offers", section: "people", group: "hiring",
    label: { en: "Offers and offer letters", ar: "عروض العمل" },
    status: "live", archetype: "FA", roles: HR_GM, route: go("offers"),
    count: (c) => c.data.moves.offers().filter((o) => {
      const now = offerNow(o, c.state);
      return now === "draft" || now === "waiting" || now === "sent";
    }).length, keywords: "offer letter salary package candidate" },
  { id: "people.vacancies", section: "people", group: "hiring",
    label: { en: "Vacancies", ar: "الوظائف الشاغرة" },
    status: "live", archetype: "LF", roles: HR_GM, route: go("vacancies"),
    keywords: "vacancy advertised job posting open positions" },
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
  { id: "people.transfers", section: "people", group: "moves",
    label: { en: "Transfers and re-joins", ar: "النقل والعودة" },
    status: "live", archetype: "FA", roles: HR_GM, route: go("transfers"),
    keywords: "transfer move branch department rejoin return" },
  { id: "people.end", section: "people", group: "moves",
    label: { en: "End employment, resignation", ar: "إنهاء الخدمة" },
    status: "live", archetype: "FA", roles: HR_GM, route: go("end"),
    keywords: "resignation notice terminate last working day" },
];
