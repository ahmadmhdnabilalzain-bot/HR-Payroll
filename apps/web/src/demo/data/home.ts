import {
  accessApiKeys,
  accessReview,
  accessWebhooks,
  appendAuditEvents,
  auditEvents,
  homeNoticesFor,
  homeNotificationsFor,
  homeTasksFor,
  importSample,
  myDocumentViews,
  payrollHistory,
  teamToday,
  verifyAuditChain,
  type DemoCompany,
} from "@payroll/demo-data";
import { auditDrafts, TAMPER_AT } from "../audit-state";
import type { HomeData, ItOverview } from "./home-types";

/**
 * The demo never claims an outcome ("approved" reads as a regulator's
 * word to a bank). Package texts that use it are reworded here, once;
 * the data agent has been asked to fix them at the source.
 */
export function clean(text: string): string {
  return text.replace(/\bapproved\b/g, "signed off")
    .replace(/\bApproved\b/g, "Signed off");
}

const memo = <T>(f: () => T): (() => T) => {
  let hit: { v: T } | null = null;
  return () => (hit ??= { v: f() }).v;
};

/** Home and Me (WP10) for one state of the company (see home-types). */
export function adaptHome(c: DemoCompany): HomeData {
  const it = memo((): ItOverview => {
    const sample = importSample(c);
    const events = auditEvents(c);
    return { review: { ...accessReview(c), text: clean(accessReview(c)
      .text) }, keys: accessApiKeys(c),
    hooks: accessWebhooks(c).map((h) => ({ ...h, name: clean(h.name) })),
    importSummary: sample.summary, importText: sample.summaryText,
    auditCount: events.length,
    verifyChain: (added = [], tampered = false) => {
      const all = appendAuditEvents(events, auditDrafts(added,
        events.at(-1)!.at));
      return verifyAuditChain(tampered ? all.map((e) =>
        e.seq === TAMPER_AT ? { ...e, summary: `${e.summary} (edited)` }
          : e) : all);
    } };
  });
  const history = memo(() => payrollHistory(c)
    .filter((m) => m.status === "paid"));
  return {
    tasks: (role) => homeTasksFor(c, role).map((t) => ({ ...t,
      title: clean(t.title), detail: clean(t.detail) })),
    notifications: (role) => homeNotificationsFor(c, role).map((n) => ({
      ...n, title: clean(n.title), body: clean(n.body) })),
    notices: (role) => homeNoticesFor(c, role).map((n) => ({ ...n,
      title: clean(n.title), body: clean(n.body) })),
    teamToday: (id) => teamToday(c, id),
    documents: (id) => myDocumentViews(c, id),
    payslips: (id) => history().flatMap((m) => m.lines
      .filter((l) => l.employeeId === id)
      .map((l) => ({ month: m.month, grossFils: l.gross, netFils: l.net }))),
    it,
  };
}
