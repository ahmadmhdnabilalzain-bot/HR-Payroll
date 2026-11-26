import { fils, formatAed, type Fils } from "@payroll/engine";
import { ibanChecksumOk } from "@payroll/wps";
import { AS_OF } from "./calendar";
import { DEMO_LABELS, isDemoLabelKey } from "./labels";
import { employeeById } from "./selectors";
import type { DemoCompany, DemoEmployee } from "./types";
import { ACCESS_FACTS, auditEvents, reportDate } from "./wp7";

const stamp = (iso: string): string =>
  `${reportDate(iso)}, ${iso.slice(11, 16)}`;

/* ---------------------------------------------------------------- *
 * Permissions and roles: who can do what
 * ---------------------------------------------------------------- */

export interface AccessPermission { id: string; label: string;
  area: "Self-service" | "People" | "Time" | "Pay" | "Reports" |
    "Setup" }

export const ACCESS_PERMISSIONS: readonly AccessPermission[] = [
  { id: "self.view-own", label: "See own payslips and leave",
    area: "Self-service" },
  { id: "team.view", label: "See the people who report to them",
    area: "People" },
  { id: "people.view", label: "See people's records", area: "People" },
  { id: "people.edit", label: "Add and change people", area: "People" },
  { id: "people.salary-view", label: "See salaries", area: "People" },
  { id: "leave.approve", label: "Decide leave requests", area: "Time" },
  { id: "expense.approve", label: "Decide expense claims", area: "Pay" },
  { id: "pay.view", label: "See pay runs", area: "Pay" },
  { id: "pay.prepare", label: "Prepare a pay run and settlements",
    area: "Pay" },
  { id: "pay.approve", label: "Sign off a pay run", area: "Pay" },
  { id: "pay.export-sif", label: "Create and send the salary file",
    area: "Pay" },
  { id: "reports.view", label: "See reports", area: "Reports" },
  { id: "audit.view", label: "Read the audit trail", area: "Reports" },
  { id: "access.manage", label: "Add users and change roles",
    area: "Setup" },
  { id: "access.review", label: "Sign off the access review",
    area: "Setup" },
  { id: "connections.manage", label: "Manage API keys and webhooks",
    area: "Setup" },
  { id: "data.import", label: "Import data", area: "Setup" },
  { id: "data.export", label: "Export data", area: "Setup" },
];

export interface AccessRole { id: string; label: string;
  description: string;
  /** Admin roles must use the second sign-in step. */
  admin: boolean; permissions: readonly string[] }

const SELF = ["self.view-own"];

export const ACCESS_ROLES: readonly AccessRole[] = [
  { id: "employee", label: "Employee", admin: false,
    description: "Everyone: own payslips, leave and documents.",
    permissions: SELF },
  { id: "line-manager", label: "Line manager", admin: false,
    description: "Decides leave and small expense claims for the team.",
    permissions: [...SELF, "team.view", "leave.approve",
      "expense.approve"] },
  { id: "hr-officer", label: "HR officer", admin: true,
    description: "Keeps people's records.",
    permissions: [...SELF, "people.view", "people.edit",
      "reports.view"] },
  { id: "hr-manager", label: "HR manager", admin: true,
    description: "Prepares the pay run and the salary file; cannot " +
      "sign it off.", permissions: [...SELF, "people.view", "people.edit",
      "people.salary-view", "leave.approve", "pay.view", "pay.prepare",
      "pay.export-sif", "reports.view", "data.import"] },
  { id: "finance-manager", label: "Finance manager", admin: true,
    description: "Sees pay runs, salaries and reports; exports data.",
    permissions: [...SELF, "people.salary-view", "pay.view",
      "reports.view", "data.export"] },
  { id: "finance-clerk", label: "Finance clerk", admin: false,
    description: "Retired role, no one holds it now (kept for the " +
      "record).", permissions: [...SELF, "people.salary-view",
      "pay.view", "reports.view", "data.export"] },
  { id: "finance-read-only", label: "Finance, read only", admin: false,
    description: "Sees pay runs and reports; changes nothing.",
    permissions: [...SELF, "pay.view", "reports.view"] },
  { id: "general-manager", label: "General manager", admin: true,
    description: "Signs off the pay run, large expenses and raises.",
    permissions: [...SELF, "people.view", "people.salary-view",
      "leave.approve", "expense.approve", "pay.view", "pay.approve",
      "reports.view", "audit.view", "access.manage", "access.review"] },
  { id: "it-administrator", label: "IT administrator", admin: true,
    description: "Runs access and connections.",
    permissions: [...SELF, "audit.view", "access.manage",
      "connections.manage", "data.export", "data.import"] },
  { id: "it-support", label: "IT support", admin: false,
    description: "Reads the audit trail to help with sign-in problems.",
    permissions: [...SELF, "audit.view"] },
  { id: "auditor", label: "Auditor, read only", admin: false,
    description: "Reads records, pay runs, reports and the trail.",
    permissions: [...SELF, "people.view", "pay.view", "reports.view",
      "audit.view"] },
];

const roleOf = (id: string): AccessRole =>
  ACCESS_ROLES.find((r) => r.id === id)!;

export interface AccessUser {
  id: string;
  employeeId: string;
  email: string;
  roleIds: string[];
  /** The second sign-in step. */
  mfa: boolean;
  createdOn: string;
  lastSignInAt: string;
}

type UserSeed = [string, string[], boolean, string, string];

/**
 * The 12 people with more than the Employee role. [employee, roles,
 * second step, created, last sign-in]. Only two were added inside the
 * audit log's window (12 Jan 2026); the rest are older than the log.
 */
const USERS: readonly UserSeed[] = [
  ["emp-001", ["general-manager"], true, "2025-06-02",
    "2026-10-27T08:50:00+04:00"],
  ["emp-003", ["line-manager"], true, "2025-06-02",
    "2026-10-27T08:20:00+04:00"],
  ["emp-004", ["line-manager"], false, "2025-06-02",
    "2026-10-26T16:05:00+04:00"],
  ["emp-011", ["line-manager"], true, "2025-06-02",
    "2026-10-27T10:55:00+04:00"],
  ["emp-016", ["line-manager"], false, "2025-06-02",
    "2026-10-26T17:30:00+04:00"],
  ["emp-024", ["auditor"], true, "2025-06-09",
    "2026-10-23T12:00:00+04:00"],
  ["emp-026", ["finance-manager"], true, "2025-06-02",
    "2026-10-27T09:05:00+04:00"],
  ["emp-027", ["finance-read-only"], true, "2025-06-09",
    "2026-10-22T14:30:00+04:00"],
  ["emp-028", ["hr-manager"], true, ACCESS_FACTS.firstInvites.on,
    "2026-10-27T09:50:00+04:00"],
  ["emp-029", ["hr-officer"], true, "2025-06-09",
    "2026-10-26T11:00:00+04:00"],
  ["emp-030", ["it-administrator", "line-manager"], true,
    ACCESS_FACTS.firstInvites.on, "2026-10-27T08:40:00+04:00"],
  ["emp-031", ["it-support"], false, "2025-06-09",
    "2026-10-26T09:30:00+04:00"],
];

export function accessUsers(c: DemoCompany): AccessUser[] {
  return USERS.map(([employeeId, roleIds, mfa, createdOn,
    lastSignInAt]) => ({ id: `usr-${employeeId.slice(4)}`, employeeId,
    email: employeeById(c, employeeId).email, roleIds, mfa, createdOn,
    lastSignInAt }));
}

/** Everyone can see their own pay; the rest comes from the roles. */
function permissionsOf(c: DemoCompany, employeeId: string): Set<string> {
  const u = USERS.find(([id]) => id === employeeId);
  const roles = u === undefined ? ["employee"] : u[1];
  employeeById(c, employeeId);
  return new Set([...SELF, ...roles.flatMap((r) =>
    roleOf(r).permissions)]);
}

export const accessCan = (c: DemoCompany, employeeId: string,
  permissionId: string): boolean =>
  permissionsOf(c, employeeId).has(permissionId);

export interface AccessUserRow {
  id: string;
  employeeId: string;
  name: string;
  jobText: string;
  email: string;
  rolesText: string;
  mfaText: "On" | "Not set up";
  lastSignInText: string;
  createdText: string;
}

const jobText = (e: DemoEmployee): string => {
  const key = `job.${e.jobKey}`;
  return isDemoLabelKey(key) ? DEMO_LABELS.en[key] : e.jobKey;
};

export function accessUserRows(c: DemoCompany): AccessUserRow[] {
  return accessUsers(c).map((u) => {
    const e = employeeById(c, u.employeeId);
    return { id: u.id, employeeId: u.employeeId, name: e.fullName,
      jobText: jobText(e), email: u.email,
      rolesText: u.roleIds.map((r) => roleOf(r).label).join(", "),
      mfaText: u.mfa ? "On" : "Not set up",
      lastSignInText: stamp(u.lastSignInAt),
      createdText: reportDate(u.createdOn) };
  });
}

export interface RoleMatrix {
  roles: { id: string; label: string; description: string;
    userCount: number }[];
  rows: { permissionId: string; label: string; area: string;
    cells: Record<string, boolean> }[];
  /** "18 other people sign in with the Employee role only." */
  employeeOnlyText: string;
}

/** The "who can do what" grid; every cell is read from the roles. */
export function roleMatrix(c: DemoCompany): RoleMatrix {
  const active = c.employees.filter((e) => e.leavingDate === null);
  const users = accessUsers(c);
  const only = active.length - users.length;
  return { roles: ACCESS_ROLES.map((r) => ({ id: r.id, label: r.label,
    description: r.description, userCount: r.id === "employee"
      ? active.length : users.filter((u) => u.roleIds.includes(r.id))
        .length })),
  rows: ACCESS_PERMISSIONS.map((p) => ({ permissionId: p.id,
    label: p.label, area: p.area, cells: Object.fromEntries(
      ACCESS_ROLES.map((r) => [r.id, r.permissions.includes(p.id)])) })),
  employeeOnlyText: `${only} other people sign in with the Employee ` +
    "role only." };
}

/** The users who hold a permission, for "who can approve a pay run?". */
export function whoCan(c: DemoCompany, permissionId: string):
  { employeeId: string; name: string; rolesText: string }[] {
  return accessUserRows(c).filter((u) => accessCan(c, u.employeeId,
    permissionId)).map((u) => ({ employeeId: u.employeeId,
    name: u.name, rolesText: u.rolesText }));
}

/* ---------------------------------------------------------------- *
 * Approval rules, segregation of duties, second step, review
 * ---------------------------------------------------------------- */

/** Expense claims above this go to the General manager. */
export const EXPENSE_LIMIT: Fils = fils(100000n);

export interface ApprovalRule { id: string; label: string;
  roleId: string; text: string }

export const APPROVAL_RULES: readonly ApprovalRule[] = [
  { id: "leave", label: "Leave", roleId: "line-manager",
    text: "The person's line manager decides." },
  { id: "expense-small",
    label: `Expense claims up to ${formatAed(EXPENSE_LIMIT)}`,
    roleId: "line-manager", text: "The line manager decides." },
  { id: "expense-large",
    label: `Expense claims over ${formatAed(EXPENSE_LIMIT)}`,
    roleId: "general-manager", text: "The General manager decides, " +
      "also for a manager's own claim." },
  { id: "pay-run", label: "Pay run", roleId: "general-manager",
    text: "The HR manager prepares it and the General manager " +
      "signs it off, never the same person." },
  { id: "salary-change", label: "Salary raise",
    roleId: "general-manager", text: "The General manager signs off " +
      "before HR enters it." },
];

export function expenseRoute(amount: Fils): { ruleId: string;
  roleId: string; text: string } {
  const r = APPROVAL_RULES.find((x) => x.id === (amount <= EXPENSE_LIMIT
    ? "expense-small" : "expense-large"))!;
  return { ruleId: r.id, roleId: r.roleId, text: r.label };
}

export interface SegregationCheck { id: string; label: string;
  permissions: [string, string]; breaches: string[]; text: string }

const PAIRS: [string, string, string][] = [
  ["pay-run", "pay.prepare", "pay.approve"],
  ["salary-pay", "people.salary-view", "pay.approve"],
  ["access-pay", "access.manage", "pay.approve"],
  ["file-approve", "pay.export-sif", "pay.approve"],
];

const SOD_LABEL: Record<string, string> = {
  "pay-run": "No one both prepares and signs off a pay run",
  "salary-pay": "No one sees salaries and signs off the run, apart from " +
    "the General manager", "access-pay": "No one both manages access and " +
    "signs off the run, apart from the General manager",
  "file-approve": "No one both sends the salary file and signs off " +
    "the run" };

/** Checks the demo's own users; an empty `breaches` means it holds. */
export function segregationChecks(c: DemoCompany): SegregationCheck[] {
  return PAIRS.map(([id, a, b]) => {
    const breaches = accessUsers(c).filter((u) =>
      accessCan(c, u.employeeId, a) && accessCan(c, u.employeeId, b) &&
      !(id !== "pay-run" && id !== "file-approve" &&
        u.roleIds.includes("general-manager"))).map((u) => u.employeeId);
    return { id, label: SOD_LABEL[id]!, permissions: [a, b], breaches,
      text: breaches.length === 0 ? `${SOD_LABEL[id]}: holds.`
        : `${SOD_LABEL[id]}: ${breaches.length} breach.` };
  });
}

export interface AccessReview { on: string; byEmployeeId: string;
  checked: number; narrowed: number; text: string }

export function accessReview(c: DemoCompany): AccessReview {
  const r = ACCESS_FACTS.review;
  return { on: r.on, byEmployeeId: r.by, checked: r.checked,
    narrowed: r.narrowed, text: `Last access review ${reportDate(r.on)}, ` +
      `signed off by ${employeeById(c, r.by).fullName}: ${r.checked} ` +
      `users checked, ${r.narrowed} role narrowed.` };
}

export function accessSettings(c: DemoCompany): { mfaText: string;
  ssoText: string } {
  const us = accessUsers(c);
  return { mfaText: `Second sign-in step: required for admin roles since ` +
    `${reportDate(ACCESS_FACTS.mfaRequired.on)}; on for ` +
    `${us.filter((u) => u.mfa).length} of ${us.length} users.`,
  ssoText: "Single sign-on: not set up." };
}

/* ---------------------------------------------------------------- *
 * API keys and webhooks (always masked)
 * ---------------------------------------------------------------- */

export interface AccessApiKey {
  id: string;
  name: string;
  /** The key is never shown in full, not even here. */
  masked: string;
  /** Read-only scopes, from the permission list. */
  scopes: string[];
  createdOn: string;
  createdById: string;
  lastUsedAt: string | null;
  callsLast30Days: number;
  status: "active";
  createdText: string;
  lastUsedText: string;
  scopesText: string;
}

const KEY_TAILS: Record<string, string> = { "key-001": "a91f",
  "key-002": "3c07" };
const KEY_USE: Record<string, [string | null, number, string[]]> = {
  "key-001": ["2026-10-27T02:00:00+04:00", 30, ["pay.view",
    "reports.view"]],
  "key-002": ["2026-10-26T18:00:00+04:00", 22, ["reports.view"]],
};

export function accessApiKeys(c: DemoCompany): AccessApiKey[] {
  return ACCESS_FACTS.apiKeys.map((k) => {
    const [last, calls, scopes] = KEY_USE[k.id]!;
    const labels = scopes.map((s) => ACCESS_PERMISSIONS.find((p) =>
      p.id === s)!.label.toLowerCase());
    employeeById(c, k.by);
    return { id: k.id, name: k.name,
      masked: `zbk_demo_${"*".repeat(16)}${KEY_TAILS[k.id]}`, scopes,
      createdOn: k.on, createdById: k.by, lastUsedAt: last,
      callsLast30Days: calls, status: "active" as const,
      createdText: `${reportDate(k.on)} by ${employeeById(c, k.by)
        .fullName}`,
      lastUsedText: last === null ? "Never used" : stamp(last),
      scopesText: `Read only: ${labels.join(", ")}` };
  });
}

export interface WebhookDelivery {
  id: string;
  eventId: string;
  eventAction: string;
  /** The audit entry's own time. */
  at: string;
  atText: string;
  outcome: "delivered" | "retried" | "failed";
  attempts: number;
  httpStatus: number;
  note: string;
}

export interface AccessWebhook {
  id: string;
  name: string;
  url: string;
  secretMasked: string;
  events: string[];
  createdOn: string;
  createdById: string;
  status: "working" | "failing";
  statusText: string;
  deliveries: WebhookDelivery[];
}

const HOOKS: Record<string, { url: string; events: string[];
  tail: string }> = {
  "hook-001": { url: "https://hooks.finance.zarqan-demo.test/payroll",
    events: ["payrun.signed-off"], tail: "5e2b" },
  "hook-002": { url: "https://servicedesk.zarqan-demo.test/starters",
    events: ["employee.created"], tail: "d84c" },
};

export function accessWebhooks(c: DemoCompany): AccessWebhook[] {
  const log = auditEvents(c);
  return ACCESS_FACTS.webhooks.map((w) => {
    const h = HOOKS[w.id]!;
    const sources = log.filter((e) => h.events.includes(e.action) &&
      e.at >= `${w.on}T00:00`);
    const deliveries = sources.map((e, i): WebhookDelivery => {
      const last = i === sources.length - 1;
      const failed = w.id === "hook-002" && last;
      const retried = w.id === "hook-001" && i === 2;
      return { id: `dlv-${w.id}-${e.id}`, eventId: e.id,
        eventAction: e.action, at: e.at, atText: stamp(e.at),
        outcome: failed ? "failed" : retried ? "retried" : "delivered",
        attempts: failed ? 3 : retried ? 2 : 1,
        httpStatus: failed ? 503 : 200,
        note: failed ? "The service desk answered \"service " +
          "unavailable\" three times; not delivered."
          : retried ? "Timed out once, delivered on the second try."
            : "Delivered." };
    });
    const bad = deliveries.at(-1)?.outcome === "failed";
    const lastAt = deliveries.at(-1)?.at;
    return { id: w.id, name: w.name, url: h.url,
      secretMasked: `${"*".repeat(12)}${h.tail}`, events: h.events,
      createdOn: w.on, createdById: w.by,
      status: bad ? "failing" : "working",
      statusText: lastAt === undefined ? "No events yet"
        : bad ? `Failing: the last delivery, ${stamp(lastAt)}, did not ` +
          "go through" : `Working: last delivery ${stamp(lastAt)}`,
      deliveries };
  });
}

/* ---------------------------------------------------------------- *
 * Import sample: a file from the old system, checked row by row
 * ---------------------------------------------------------------- */

export const IMPORT_SAMPLE_NAME = "people-from-old-system-sample.csv";

export interface ImportProblem { severity: "error" | "warning";
  column: string; message: string; fix: string }

export interface ImportRow {
  /** The line in the file (the header is line 1). */
  line: number;
  employeeId: string | null;
  values: Record<string, string>;
  status: "ready" | "warning" | "error";
  statusText: string;
  problems: ImportProblem[];
}

export interface ImportSample {
  fileName: string;
  text: string;
  rows: ImportRow[];
  summary: { rows: number; ready: number; warnings: number;
    errors: number };
  summaryText: string;
  note: string;
}

const COLUMNS = ["number", "name", "email", "department", "job",
  "joining", "leaving", "nationality", "basic", "iban"] as const;
const HEADER = ["Employee no", "Full name", "Work email", "Department",
  "Job title", "Joining date", "Leaving date", "Nationality",
  "Basic salary (AED)", "IBAN"];

/** Employees in the sample, in file order. */
const SAMPLE_IDS = ["emp-001", "emp-009", "emp-012", "emp-014", "emp-018",
  "emp-019", "emp-021", "emp-023", "emp-025", "emp-027", "emp-028",
  "emp-030"];

const dmy = (iso: string): string =>
  `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const aed = (f: bigint): string =>
  `${f / 100n}.${String(f % 100n).padStart(2, "0")}`;

/** What the old system would export for one person, with its slips. */
function exported(c: DemoCompany, e: DemoEmployee): Record<string, string> {
  const dept = DEMO_LABELS.en[`dept.${c.departments.find((d) =>
    d.id === e.departmentId)!.code}` as const];
  const old = e.cases.includes("back-pay")
    ? e.basicMonthly - c.payRun.backPay[0]!.amount : e.basicMonthly;
  const v = { number: e.number, name: e.fullName, email: e.email,
    department: dept, job: jobText(e), joining: dmy(e.joiningDate),
    leaving: e.leavingDate === null || e.cases.includes("leaver") ? ""
      : dmy(e.leavingDate), nationality: e.nationality,
    basic: aed(old), iban: e.iban?.value ?? "" };
  if (e.id === "emp-019") v.number = "ZB-0018";
  if (e.id === "emp-021") v.department = "Risk";
  if (e.id === "emp-025") v.email = e.email.replace(/\.test$/, "");
  return v;
}

const problem = (severity: ImportProblem["severity"], column: string,
  message: string, fix: string): ImportProblem =>
  ({ severity, column, message, fix });

function checkRow(c: DemoCompany, e: DemoEmployee,
  v: Record<string, string>, lines: Map<string, number[]>)
  : ImportProblem[] {
  const out: ImportProblem[] = [];
  const same = lines.get(v.number!)!;
  if (same.length > 1) {
    out.push(problem("error", "number", `Employee number ${v.number} ` +
      `is used on lines ${same.join(" and ")}. Each person needs their ` +
      "own number.", "Correct the number on the line that is wrong."));
  }
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(v.email!)) {
    out.push(problem("error", "email", `The e-mail address ` +
      `${v.email} looks incomplete, so this person could not be invited.`,
    "Enter the full work e-mail address."));
  }
  const depts = c.departments.map((d) =>
    DEMO_LABELS.en[`dept.${d.code}` as const]);
  if (!depts.some((d) => d === v.department)) {
    const near = depts.find((d) => d.toLowerCase().includes(
      v.department!.toLowerCase()));
    out.push(problem("error", "department", `Department ` +
      `"${v.department}" is not one of the ${depts.length} departments ` +
      "in the system.", near === undefined ? "Choose a department."
      : `Choose "${near}", the closest match.`));
  }
  if (e.leavingDate !== null && v.leaving === "") {
    out.push(problem("warning", "leaving", `${e.fullName} is shown as ` +
      `having left on ${reportDate(e.leavingDate)}, but the file has no ` +
      "leaving date.", "Add the leaving date so pay stops after the " +
      "last working day."));
  }
  const diff = e.basicMonthly - BigInt(v.basic!.replace(".", ""));
  if (diff !== 0n) {
    out.push(problem("warning", "basic", `The basic salary in the file is ` +
      `${formatAed(fils(diff < 0n ? -diff : diff))} ` +
      `${diff > 0n ? "lower" : "higher"} than in the October pay run` +
      `${e.cases.includes("back-pay") ? ", which has the raise from " +
        `${reportDate("2026-09-01")}` : ""}.`,
    "Keep the pay run's figure unless the file is newer."));
  }
  if (v.iban === "") {
    out.push(problem("warning", "iban", "No IBAN in the file, so this " +
      "person's salary will be held out of the salary file.",
    "Add the IBAN from the employee's bank letter."));
  } else if (!ibanChecksumOk(v.iban!)) {
    out.push(problem("error", "iban", `The IBAN ending ` +
      `${v.iban!.slice(-4)} does not pass the check-digit test, which ` +
      "usually means a typing slip.",
    "Re-enter it from the employee's bank letter."));
  }
  return out;
}

/** The sample file, built from the roster, with each row checked. */
export function importSample(c: DemoCompany): ImportSample {
  const people = SAMPLE_IDS.map((id) => employeeById(c, id));
  const values = people.map((e) => exported(c, e));
  const text = [HEADER.join(","), ...values.map((v) =>
    COLUMNS.map((k) => v[k]).join(","))].join("\n") + "\n";
  const lines = new Map<string, number[]>();
  values.forEach((v, i) => lines.set(v.number!,
    [...(lines.get(v.number!) ?? []), i + 2]));
  const rows = people.map((e, i): ImportRow => {
    const problems = checkRow(c, e, values[i]!, lines);
    const status = problems.some((p) => p.severity === "error") ? "error"
      : problems.length > 0 ? "warning" : "ready";
    return { line: i + 2, employeeId: e.id, values: values[i]!, status,
      statusText: { ready: "Ready", warning: "Review",
        error: "Fix before import" }[status], problems };
  });
  const n = (s: ImportRow["status"]) => rows.filter((r) =>
    r.status === s).length;
  const summary = { rows: rows.length, ready: n("ready"),
    warnings: n("warning"), errors: n("error") };
  return { fileName: IMPORT_SAMPLE_NAME, text, rows, summary,
    summaryText: `${summary.rows} rows read: ${summary.ready} ready, ` +
      `${summary.warnings} to review, ${summary.errors} to fix. ` +
      `Checked ${reportDate(AS_OF)}.`,
    note: "Nothing is imported. Every name, number and IBAN in " +
      "this file is invented." };
}

/* ---------------------------------------------------------------- *
 * Where the data lives, said plainly
 * ---------------------------------------------------------------- */

export const DATA_LOCATION = {
  demoOnly: true as const,
  region: "Frankfurt, Germany",
  statements: [
    { id: "demo", text: "This is a demo. Every person, amount and " +
      "account in it is invented." },
    { id: "where", text: "The demo runs in your browser. The demo is " +
      "hosted in Frankfurt; the hosting region for a live service is " +
      "not decided. No real company data is held there." },
    { id: "live", text: "For a live account, where data is stored " +
      "would be agreed with you in writing before you load anything." },
    { id: "claims", text: "Nothing here says the product holds a " +
      "certification, has passed an audit, or meets a data-residency " +
      "rule. We have not yet assessed UAE data-protection rules." },
    { id: "roles", text: "Role limits in the demo are a filter in " +
      "your browser. Enforcement belongs to the backend of a live " +
      "service and is not shown here." },
  ],
  /** What this page deliberately does not claim. */
  notClaimed: ["certification", "audit report", "data-residency " +
    "compliance"],
  /** No certification is claimed, so the list is empty on purpose. */
  certifications: [] as string[],
};
