import type { Area, NavCtx } from "../types";
import { offerNow } from "../../people/moves/view";

/** WP3: hiring, joining and leaving (navigation map, section 7). */
const HR_GM = ["hr", "gm"] as const;
const go = (screen: string) => ({ section: "people" as const,
  rest: ["moves", screen] });

export const AREAS: readonly Area[] = [
  { id: "people.requisitions", section: "people", group: "hiring",
    label: { en: "Open positions", ar: "طلبات الشغور" },
    status: "live", archetype: "LF", roles: HR_GM, route: go("requisitions"),
    keywords: "hiring requisition vacancy open role recruit hire" },
  { id: "people.board", section: "people", group: "hiring",
    label: { en: "Candidates", ar: "المرشحون" },
    status: "live", archetype: "LF", roles: HR_GM, route: go("board"),
    keywords: "hiring candidates board applicant interview " +
      "screening pipeline" },
  { id: "people.offers", section: "people", group: "hiring",
    label: { en: "Offers", ar: "عروض العمل" },
    status: "live", archetype: "FA", roles: HR_GM, route: go("offers"),
    count: (c) => c.data.moves.offers().filter((o) => {
      const now = offerNow(o, c.state);
      // Waiting for a decision: a draft to sign off, or one held.
      return now === "draft" || now === "waiting";
    }).length, keywords: "offers offer letter salary package candidate " +
      "hiring" },
  { id: "people.vacancies", section: "people", group: "hiring",
    label: { en: "Advertised jobs", ar: "الوظائف الشاغرة" },
    status: "live", archetype: "LF", roles: HR_GM, route: go("vacancies"),
    keywords: "vacancy advertised job posting open positions" },
  { id: "people.joiners", section: "people", group: "moves",
    label: { en: "Joiners", ar: "المنضمون" },
    status: "live", archetype: "RT", roles: HR_GM, route: go("joiners"),
    keywords: "joiner checklists onboarding new hire first day " +
      "starter" },
  { id: "people.leavers", section: "people", group: "moves",
    label: { en: "Leavers", ar: "المغادرون" },
    status: "live", archetype: "RT", roles: HR_GM, route: go("leavers"),
    keywords: "leaver checklists offboarding exit final settlement " +
      "gratuity" },
  { id: "people.transfers", section: "people", group: "moves",
    label: { en: "Transfers", ar: "النقل والعودة" },
    status: "live", archetype: "FA", roles: HR_GM, route: go("transfers"),
    keywords: "transfers re-joins move branch department rejoin " +
      "return" },
  { id: "people.end", section: "people", group: "moves",
    label: { en: "Resignations", ar: "إنهاء الخدمة" },
    status: "live", archetype: "FA", roles: HR_GM, route: go("end"),
    keywords: "end employment resignation notice terminate last " +
      "working day" },
];
