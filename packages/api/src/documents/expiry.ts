import type { DocumentType, ExpiryAlert } from "@payroll/contract";

const DAY_MS = 86_400_000;
const utc = (d: string) => Date.parse(`${d}T00:00:00Z`);

/** Calendar days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((utc(to) - utc(from)) / DAY_MS);
}

export interface AlertItem {
  documentId: string;
  employeeId: string;
  employeeName: string;
  type: DocumentType;
  expiryDate: string | null;
}

function alertOf(i: AlertItem, lead: number[], today: string)
  : ExpiryAlert | null {
  if (i.expiryDate === null) return null;
  const daysLeft = daysBetween(today, i.expiryDate);
  if (daysLeft > Math.max(...lead)) return null;
  const base = { documentId: i.documentId, employeeId: i.employeeId,
    employeeName: i.employeeName, type: i.type, expiryDate: i.expiryDate,
    daysLeft };
  if (daysLeft < 0) return { ...base, status: "expired", stageDays: null };
  const stage = Math.min(...lead.filter((d) => d >= daysLeft));
  return { ...base, status: "due", stageDays: stage };
}

const byOrder = (a: ExpiryAlert, b: ExpiryAlert) =>
  a.daysLeft - b.daysLeft ||
  (a.employeeName < b.employeeName ? -1 : a.employeeName > b.employeeName
    ? 1 : 0) ||
  (a.documentId < b.documentId ? -1 : a.documentId > b.documentId ? 1 : 0);

/**
 * Alerts for documents expired or inside their largest lead day.
 * `withinDays` drops due rows further out (expired rows stay).
 */
export function expiryAlerts(items: readonly AlertItem[],
  leadDays: Readonly<Record<DocumentType, number[]>>, today: string,
  withinDays?: number): ExpiryAlert[] {
  const out: ExpiryAlert[] = [];
  for (const i of items) {
    const a = alertOf(i, leadDays[i.type], today);
    if (a === null) continue;
    if (withinDays !== undefined && a.status === "due" &&
      a.daysLeft > withinDays) continue;
    out.push(a);
  }
  return out.sort(byOrder);
}
