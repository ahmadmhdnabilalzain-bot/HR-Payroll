import { addDays, daysBetween, fils } from "@payroll/engine";
import { AS_OF } from "./calendar";
import type { FakeIdentifier } from "./fake-ids";
import type {
  ApprovalItem,
  DemoDocument,
  DemoEmployee,
  DemoExpenseClaim,
  DemoLeaveRequest,
  DemoPayRun,
  DocumentKind,
  ExpiryState,
} from "./types";

export function expiryState(daysLeft: number): ExpiryState {
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 30) return "expiring-30";
  return daysLeft <= 90 ? "expiring-90" : "valid";
}

const fakeNumber = (n: number): FakeIdentifier => {
  const value = `DEMO-V-${String(n).padStart(6, "0")}`;
  return { value, masked: `DEMO-V-****${value.slice(-2)}`, fake: true,
    note: "Fake: DEMO prefix, not an issued number" };
};

/** [employee, kind, days from the demo date]: two near expiry. */
const DOCS: readonly [string, DocumentKind, number][] = [
  ["emp-017", "residence-visa", 12],
  ["emp-022", "emirates-id", 25],
  ["emp-025", "residence-visa", 140],
  ["emp-024", "emirates-id", 400],
];

export function buildDocuments(employees: DemoEmployee[])
  : DemoDocument[] {
  return DOCS.map(([id, kind, offset], i) => {
    const e = employees.find((x) => x.id === id)!;
    const expiresOn = addDays(AS_OF, offset);
    const daysLeft = daysBetween(AS_OF, expiresOn);
    return { id: `doc-${String(i + 1).padStart(3, "0")}`, kind,
      employeeId: e.id, number: kind === "emirates-id" ? e.emiratesId
        : fakeNumber(i + 1), expiresOn, state: expiryState(daysLeft),
      daysLeft };
  });
}

/** Two claims with demo receipts (fictional suppliers). */
export function buildExpenses(): DemoExpenseClaim[] {
  return [
    { id: "exp-001", employeeId: "emp-013",
      titleKey: "expense.entertainment", date: "2026-10-15",
      amount: fils(42500n), vat: fils(2024n), status: "approved",
      receipt: "receipt-001.png (DEMO)" },
    { id: "exp-002", employeeId: "emp-011", titleKey: "expense.travel",
      date: "2026-10-27", amount: fils(118000n), vat: fils(5619n),
      status: "pending", receipt: "receipt-002.png (DEMO)" },
  ];
}

/** The head of each employee's department decides (no one self-checks). */
function checkerOf(es: DemoEmployee[], e: DemoEmployee): string {
  const heads = es.filter((x) => x.departmentId === e.departmentId)
    .sort((a, b) => b.grade - a.grade);
  const head = heads[0]!;
  return head.id === e.id ? "emp-001" : head.id;
}

const item = (n: number, x: Omit<ApprovalItem, "id" | "status">)
  : ApprovalItem => ({ id: `ap-${String(n).padStart(3, "0")}`,
  status: "pending", ...x });

/** Maker-checker: the pay run goes from the HR manager to the GM. */
export function buildApprovals(es: DemoEmployee[],
  leave: DemoLeaveRequest[], expenses: DemoExpenseClaim[],
  run: DemoPayRun): ApprovalItem[] {
  const byId = (id: string) => es.find((e) => e.id === id)!;
  const out: Omit<ApprovalItem, "id" | "status">[] = [
    { kind: "pay-run", subjectId: run.id, employeeId: null,
      requestedOn: AS_OF, amount: run.totals.net,
      titleKey: "approval.pay-run", makerEmployeeId: "emp-028",
      checkerEmployeeId: "emp-001" },
    ...leave.filter((r) => r.status === "pending").map((r) => ({
      kind: "leave" as const, subjectId: r.id, employeeId: r.employeeId,
      requestedOn: "2026-10-27", amount: null, titleKey: "approval.leave",
      makerEmployeeId: r.employeeId,
      checkerEmployeeId: checkerOf(es, byId(r.employeeId)) })),
    ...expenses.filter((x) => x.status === "pending").map((x) => ({
      kind: "expense" as const, subjectId: x.id, employeeId: x.employeeId,
      requestedOn: x.date, amount: x.amount, titleKey: x.titleKey,
      makerEmployeeId: x.employeeId,
      checkerEmployeeId: checkerOf(es, byId(x.employeeId)) })),
  ];
  return out.map((x, i) => item(i + 1, x));
}
