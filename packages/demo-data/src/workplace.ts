import { addDays, daysBetween, fils } from "@payroll/engine";
import { AS_OF, monthKey, NEXT_PERIOD } from "./calendar";
import type { FakeIdentifier } from "./fake-ids";
import type { Rng } from "./rng";
import type {
  ApprovalItem,
  DemoDepartment,
  DemoDocument,
  DemoEmployee,
  DemoGoal,
  DemoLeaveRequest,
  DocumentKind,
  ExpiryState,
} from "./types";

const KINDS: readonly DocumentKind[] = ["passport", "residence-visa",
  "emirates-id", "labour-card"];
/** Days from the demo date: one expired, three inside 30 days. */
const OFFSETS = [-6, 9, 18, 27, 45, 70, 85, 120, 200, 365, 540, 700];

export function expiryState(daysLeft: number): ExpiryState {
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 30) return "expiring-30";
  return daysLeft <= 90 ? "expiring-90" : "valid";
}

const fakeNumber = (prefix: string, n: number): FakeIdentifier => {
  const value = `DEMO-${prefix}-${String(n).padStart(6, "0")}`;
  return { value, masked: `DEMO-${prefix}-****${value.slice(-2)}`,
    fake: true, note: "Fake: DEMO prefix, not an issued number" };
};

function docOf(n: number, kind: DocumentKind, e: DemoEmployee | null,
  offset: number): DemoDocument {
  const expiresOn = addDays(AS_OF, offset);
  const daysLeft = daysBetween(AS_OF, expiresOn);
  const number = kind === "emirates-id" && e !== null ? e.emiratesId
    : fakeNumber(kind.slice(0, 2).toUpperCase(), n);
  return { id: `doc-${String(n).padStart(3, "0")}`, kind,
    employeeId: e?.id ?? null, number, expiresOn, state:
      expiryState(daysLeft), daysLeft };
}

export function buildDocuments(employees: DemoEmployee[], rng: Rng)
  : DemoDocument[] {
  const joined = rng.shuffle(employees.filter((e) =>
    e.joiningDate <= AS_OF && e.leavingDate === null));
  const docs = OFFSETS.map((off, i) => docOf(i + 1,
    KINDS[i % KINDS.length]!, joined[i]!, off));
  docs.push(docOf(OFFSETS.length + 1, "trade-licence", null, 52));
  return docs;
}

export function buildGoals(depts: readonly DemoDepartment[],
  employees: DemoEmployee[]): DemoGoal[] {
  const dept: DemoGoal[] = depts.map((d, i) => ({ id: `goal-${d.code}`,
    employeeId: null, departmentId: d.id, titleKey: `goal.${d.code}`,
    target: [100, 95, 120, 12, 30, 90][i]!,
    actual: [96, 91, 104, 9, 24, 93][i]!,
    unit: (["percent", "percent", "percent", "count", "days",
      "percent"] as const)[i]!, dueOn: "2026-12-31" }));
  const people = employees.filter((e) => e.grade >= 4).slice(0, 4)
    .map((e, i): DemoGoal => ({ id: `goal-p${i + 1}`, employeeId: e.id,
      departmentId: e.departmentId, titleKey: `goal.personal.${i + 1}`,
      target: 100, actual: [40, 75, 60, 100][i]!, unit: "percent",
      dueOn: "2027-03-31" }));
  return [...dept, ...people];
}

const item = (n: number, x: Omit<ApprovalItem, "id" | "status">)
  : ApprovalItem => ({ id: `ap-${String(n).padStart(3, "0")}`,
  status: "pending", ...x });

/** Everything waiting on someone, as the inbox lists it. */
export function buildApprovals(employees: DemoEmployee[],
  leave: DemoLeaveRequest[], docs: DemoDocument[]): ApprovalItem[] {
  const pending = leave.filter((r) => r.status === "pending");
  const ot = employees.find((e) => e.cases.includes("overtime"))!;
  const expired = docs.find((d) => d.state === "expired")!;
  const claimants = employees.filter((e) => e.cases.length === 0)
    .slice(0, 2);
  const out: Omit<ApprovalItem, "id" | "status">[] = [
    ...pending.map((r) => ({ kind: "leave" as const, subjectId: r.id,
      employeeId: r.employeeId, requestedOn: "2026-10-27", amount: null,
      titleKey: "approval.leave" })),
    { kind: "pay-run", subjectId: `run-${monthKey(NEXT_PERIOD.year,
      NEXT_PERIOD.month)}`, employeeId: null, requestedOn: AS_OF,
    amount: null, titleKey: "approval.pay-run" },
    { kind: "overtime", subjectId: "ot-2026-10-20", employeeId: ot.id,
      requestedOn: "2026-10-21", amount: null,
      titleKey: "approval.overtime" },
    { kind: "document-renewal", subjectId: expired.id,
      employeeId: expired.employeeId, requestedOn: "2026-10-25",
      amount: null, titleKey: "approval.document" },
    ...claimants.map((e, i) => ({ kind: "expense" as const,
      subjectId: `exp-${String(i + 1).padStart(3, "0")}`,
      employeeId: e.id, requestedOn: "2026-10-29",
      amount: fils([42500n, 118000n][i]!), titleKey:
        `approval.expense.${i + 1}` })),
  ];
  return out.map((x, i) => item(i + 1, x));
}
