// NEEDS NATIVE REVIEW: the Arabic labels are authored by Claude.
import { askRows, waitingFor } from "../../demo/files-state";
import { waitingSigns } from "../../people/files/signing";
import type { Area, AreaRoute, NavCtx } from "../types";

const HR_GM = ["hr", "gm"] as const;
const people = (...rest: string[]): AreaRoute =>
  ({ section: "people", rest });
const more = (screen: string): AreaRoute =>
  ({ section: "time-off", rest: ["more", screen] });

const encashWaiting = (c: NavCtx): number => waitingFor(askRows(
  c.data.files.leave.seeds(), c.state, "encash"), c.state.role);
const fixWaiting = (c: NavCtx): number => waitingFor(askRows([], c.state,
  "correction"), c.state.role);

/**
 * WP17: exit interviews (P17), e-signatures (P35), documents with
 * versions (P41), and the Time extras T03, T05, T06, T11, T12, T15,
 * T16 and T23 (screens under people/exit, people/files, time/more).
 */
export const AREAS: readonly Area[] = [
  { id: "people.exit", section: "people", group: "moves",
    label: { en: "Exit interviews", ar: "مقابلات نهاية الخدمة" },
    status: "live", archetype: "FA", roles: HR_GM, route: people("exit"),
    keywords: "P17 exit interview leaving reasons resignation why " +
      "people leave" },
  { id: "people.signatures", section: "people", group: "requests",
    label: { en: "E-signatures", ar: "التوقيع الإلكتروني" },
    status: "live", archetype: "LF", roles: ["hr", "gm", "it"],
    route: people("files", "signatures"),
    count: (c) => waitingSigns(c.data, c.state),
    keywords: "P35 signature sign letter offer typed name signing" },
  { id: "people.documents", section: "people", group: "papers",
    label: { en: "Documents and versions", ar: "المستندات والإصدارات" },
    status: "live", archetype: "RT", roles: ["hr", "gm", "it"],
    route: people("files", "documents"),
    keywords: "P41 documents upload file versions contract passport " +
      "papers on file" },
  { id: "time.leave-for", section: "time", group: "leave",
    label: { en: "Record leave", ar: "تسجيل إجازة لموظف" },
    status: "live", archetype: "FA", roles: ["hr"], route: more("leave-for"),
    keywords: "T03 record leave on behalf someone asked in person" },
  { id: "time.encash", section: "time", group: "leave",
    label: { en: "Leave encashment", ar: "صرف بدل الإجازة" },
    status: "live", archetype: "FA", roles: ["hr", "gm", "employee"],
    route: more("encash"), count: encashWaiting,
    keywords: "T05 leave encashment cash out unused annual days pay" },
  { id: "time.liability", section: "time", group: "leave",
    label: { en: "Leave liability", ar: "التزامات الإجازات" },
    status: "live", archetype: "RP", roles: HR_GM, route: more("liability"),
    keywords: "T06 leave liability unused days owed tickets provision" },
  { id: "time.corrections", section: "time", group: "attendance",
    label: { en: "Attendance corrections", ar: "تصحيح الحضور" },
    status: "live", archetype: "FA", roles: HR_GM, route: more("corrections"),
    count: fixWaiting,
    keywords: "T11 attendance correction fix day late absent punch" },
  { id: "time.phone", section: "time", group: "attendance",
    label: { en: "Phone clock-in", ar: "تسجيل الحضور بالهاتف" },
    status: "live", archetype: "FA", roles: ["hr", "gm", "it"],
    route: more("phone"),
    keywords: "T12 phone clock in geofence site area mobile" },
  { id: "time.wfh", section: "time", group: "attendance",
    label: { en: "Work from home", ar: "العمل من المنزل" },
    status: "live", archetype: "RP", roles: ["hr", "gm", "it"],
    route: more("wfh"),
    keywords: "T15 work from home remote days limit fridays" },
  { id: "time.kiosk", section: "time", group: "attendance",
    label: { en: "Kiosk check-in", ar: "تسجيل الحضور بالرمز" },
    status: "live", archetype: "FA", roles: ["hr", "it"],
    route: more("kiosk"),
    keywords: "T16 kiosk qr code check in scan wall" },
  { id: "time.cover", section: "time", group: "rosters",
    label: { en: "Leave-safe roster", ar: "جدول آمن للإجازات" },
    status: "live", archetype: "CA", roles: HR_GM, route: more("cover"),
    keywords: "T23 leave safe roster cover overtime cost team minimum" },
];
