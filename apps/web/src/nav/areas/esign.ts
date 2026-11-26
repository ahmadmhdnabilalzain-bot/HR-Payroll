// NEEDS NATIVE REVIEW: the Arabic labels are authored by Claude.
import {
  actorOf,
  esignRows,
  waitingFor,
} from "../../people/esign/model";
import type { Area, NavCtx } from "../types";

const OFFICE = ["hr", "gm", "it"] as const;
const STAFF = ["manager", "employee"] as const;

const mine = (c: NavCtx): number =>
  waitingFor(esignRows(c.data, c.state), actorOf(c.data, c.state)).length;

/**
 * D5 electronic signing: signing profiles (who is registered), the
 * signing links HR passes on to new people, a link's own page (open to
 * whoever holds it) and the viewer's own Documents to sign. The
 * register itself is P35's `people.signatures` (exit-files.ts).
 */
export const AREAS: readonly Area[] = [
  { id: "people.signing-profiles", section: "people", group: "moves",
    label: { en: "Signing profiles", ar: "ملفات التوقيع" },
    status: "live", archetype: "LF", roles: OFFICE,
    route: { section: "people", rest: ["esign", "profiles"] },
    keywords: "D5 e-signature signing profile registered new staff " +
      "consent typed signature style" },
  { id: "people.signing-links", section: "people", group: "moves",
    label: { en: "Signing links", ar: "روابط التوقيع" },
    status: "live", archetype: "LF", roles: OFFICE,
    route: { section: "people", rest: ["esign", "links"] },
    keywords: "D5 signing link joining pack new employee candidate " +
      "remind" },
  { id: "people.signing-link", section: "people", group: "moves",
    label: { en: "Send to sign", ar: "إرسال للتوقيع" },
    status: "live", archetype: "FA",
    route: { section: "people", rest: ["esign", "link"] },
    keywords: "D5 sign on phone link new joiner" },
  { id: "me.sign", section: "me", group: "mine",
    label: { en: "Documents to sign", ar: "مستندات للتوقيع" },
    status: "live", archetype: "FA", roles: STAFF,
    route: { section: "me", rest: ["sign"] }, count: mine,
    keywords: "D5 sign document electronically signature to sign " +
      "acknowledge policy" },
];
