import type {
  RetentionClass,
  RetentionDueItem,
  RetentionRule,
} from "@payroll/contract";

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

/** `date` plus `months`, clamped to the last day of the target month. */
export function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const total = y * 12 + (m - 1) + months;
  const ty = Math.floor(total / 12);
  const tm = total % 12;
  const last = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  return `${pad(ty, 4)}-${pad(tm + 1)}-${pad(Math.min(d, last))}`;
}

export interface RetentionAnchors {
  employmentEnd: string | null;
  expiry: string | null;
  issue: string;
}

/** Keep until this date; null when no period is set or no anchor. */
export function retainUntil(rule: RetentionRule, a: RetentionAnchors)
  : string | null {
  if (rule.months === null) return null;
  const anchor = rule.from === "employment-end" ? a.employmentEnd
    : rule.from === "expiry" ? a.expiry : a.issue;
  return anchor === null ? null : addMonths(anchor, rule.months);
}

export interface RetentionCandidate {
  kind: RetentionDueItem["kind"];
  id: string;
  employeeId: string | null;
  retentionClass: RetentionClass;
  retainUntil: string | null;
}

/** Items whose keep-until date is today or earlier, by date then id. */
export function retentionDue(items: readonly RetentionCandidate[],
  today: string): RetentionDueItem[] {
  const due: RetentionDueItem[] = [];
  for (const i of items) {
    if (i.retainUntil !== null && i.retainUntil <= today) {
      due.push({ kind: i.kind, id: i.id, employeeId: i.employeeId,
        retentionClass: i.retentionClass, retainUntil: i.retainUntil });
    }
  }
  return due.sort((a, b) => a.retainUntil < b.retainUntil ? -1
    : a.retainUntil > b.retainUntil ? 1 : a.id < b.id ? -1
    : a.id > b.id ? 1 : 0);
}
