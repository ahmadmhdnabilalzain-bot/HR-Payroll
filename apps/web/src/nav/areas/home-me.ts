// NEEDS NATIVE REVIEW: the Arabic labels are authored by Claude.
import { personFor, requestRows } from "../../demo/time-off";
import { inboxTasks } from "../../home/inbox/model";
import type { Area, NavCtx } from "../types";

const STAFF = ["manager", "employee"] as const;

/** Leave requests waiting for the viewer's decision. */
const waitingForMe = (c: NavCtx): number => {
  const me = personFor(c.data, c.state.role);
  return requestRows(c.data, c.state).filter((r) => r.state === "waiting" &&
    r.approverId === me).length;
};

const mine = (id: string, en: string, ar: string, archetype: Area[
  "archetype"], page: string, keywords: string,
count?: (c: NavCtx) => number): Area => ({ id, section: "me",
  group: "mine", label: { en, ar }, status: "live", archetype,
  roles: STAFF, route: { section: "me", rest: [page] }, keywords,
  ...(count === undefined ? {} : { count }) });

/**
 * WP10: the employee and manager bar (navigation map, rows E02 to
 * E07, E10) and Requests. Home itself (tasks, notices, the IT view)
 * is the Home word's, with no panel.
 */
export const AREAS: readonly Area[] = [
  mine("me.payslips", "My payslips", "قسائم راتبي", "LF", "payslips",
    "payslip salary net pay month history"),
  mine("me.documents", "My documents", "مستنداتي", "LF", "documents",
    "visa passport emirates id papers expiry",
    (c) => inboxTasks(c.data, c.state).filter((x) =>
      x.source.kind === "document" && !x.done).length),
  mine("me.leave", "My leave", "إجازاتي", "FA", "leave",
    "leave holiday vacation balance request"),
  mine("me.profile", "My profile", "ملفي", "RT", "profile",
    "profile details email bank account"),
  { id: "requests.waiting", section: "requests", group: "mine",
    label: { en: "Waiting for you", ar: "بانتظارك" }, status: "live",
    archetype: "custom", roles: ["manager"], route: { section: "time-off" },
    count: waitingForMe, keywords: "approve decide leave team" },
  { id: "requests.mine", section: "requests", group: "mine",
    label: { en: "My requests", ar: "طلباتي" }, status: "live",
    archetype: "LF", roles: STAFF, route: { section: "me",
      rest: ["requests"] }, keywords: "my requests leave withdraw" },
];
