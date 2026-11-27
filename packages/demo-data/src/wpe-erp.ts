import { fils, formatAed, type Fils } from "@payroll/engine";
import { displayDate } from "./display";
import { demoLabel, isDemoLabelKey } from "./labels";
import { payElements } from "./pay";
import { DEMO_EMAIL_DOMAIN } from "./roster";
import type { DemoCompany } from "./types";
import { payrollJournal } from "./wpe-payroll-extras";

/**
 * WPE ERP, general ledger and Teams connections (S43, S35, S36).
 * FICTIONAL sample data. Nothing is connected in a browser-only demo
 * and every page says so first. The sample accounts and cost centres
 * are invented for the demo: they are not any company's real codes and
 * the file layout is a plain CSV, not a vendor's own format. The
 * posting preview is the existing payroll journal with a code on each
 * line; every amount is the journal's own (the engine's).
 */

export type ErpPageId = "erp" | "gl" | "teams";

export interface ErpItem {
  key: string;
  label: string;
  value: string;
  help: string;
  /** The values a person may pick; null means read only. */
  choices: readonly string[] | null;
}

export interface ErpGroup { title: string; items: ErpItem[] }

export interface ErpPage {
  id: ErpPageId;
  title: string;
  lede: string;
  /** Said at the top: what is and is not connected. */
  notice: string;
  groups: ErpGroup[];
  /** What a test of the connection says in the demo. */
  testResult: string;
}

const ON_OFF = ["On", "Off"] as const;

const NOTICE = "Nothing is connected. Nothing below is sent " +
  "to anyone.";

export const TEST_RESULT = "Not connected. No request was made.";

const item = (key: string, label: string, value: string, help: string,
  choices: readonly string[] | null = null): ErpItem =>
  ({ key, label, value, help, choices });

/* ---------------------------------------------------------------- *
 * Sample chart of accounts and the mapping
 * ---------------------------------------------------------------- */

export interface GlAccount {
  code: string;
  name: string;
  kind: "expense" | "liability";
}

/** Invented codes, for the demo only. */
export const CHART_OF_ACCOUNTS: readonly GlAccount[] = [
  { code: "5010", name: "Salaries and wages", kind: "expense" },
  { code: "5020", name: "Housing and transport allowances",
    kind: "expense" },
  { code: "5030", name: "Other allowances", kind: "expense" },
  { code: "5040", name: "Overtime", kind: "expense" },
  { code: "5090", name: "Other pay costs", kind: "expense" },
  { code: "2110", name: "Salaries payable (salary file)",
    kind: "liability" },
  { code: "2115", name: "Salaries payable (held)", kind: "liability" },
  { code: "2120", name: "Staff loans receivable", kind: "liability" },
  { code: "2125", name: "Staff fines recovered", kind: "liability" },
  { code: "2190", name: "Other pay deductions", kind: "liability" },
];

const COMPANY_CODE = "1000";
const OFFICE_CENTRE = { code: "CC-000", name: "Whole company" };

const ELEMENT_ACCOUNT: Record<string, string> = {
  basic: "5010", housing: "5020", transport: "5020", phone: "5030",
  "back-pay": "5010", overtime: "5040", loan: "2120",
  "traffic-fine": "2125",
};

export interface MappingRow {
  /** The journal's own account text. */
  source: string;
  kind: "pay element" | "net pay" | "deduction";
  code: string;
  account: string;
}

const accountName = (code: string): string =>
  CHART_OF_ACCOUNTS.find((a) => a.code === code)?.name ?? "";

const mapRow = (source: string, kind: MappingRow["kind"], code: string)
  : MappingRow => ({ source, kind, code, account: accountName(code) });

/** Each pay element and each net pay line, with its sample account. */
export function accountMapping(): MappingRow[] {
  return [
    ...payElements().filter((e) => e.type === "earning").map((e) =>
      mapRow(`Salary cost: ${e.label}`, "pay element",
        ELEMENT_ACCOUNT[e.code] ?? "5090")),
    mapRow("Salary cost: Other earnings", "pay element", "5090"),
    mapRow("Net pay to the salary file", "net pay", "2110"),
    mapRow("Net pay held out of the salary file", "net pay", "2115"),
    ...payElements().filter((e) => e.type === "deduction").map((e) =>
      mapRow(`Taken from pay: ${e.label}`, "deduction",
        ELEMENT_ACCOUNT[e.code] ?? "2190")),
    mapRow("Taken from pay: Other deductions", "deduction", "2190"),
  ];
}

export interface CostCentre { code: string; name: string; department: string }

const deptName = (c: DemoCompany, id: string): string => {
  const d = c.departments.find((x) => x.id === id);
  return d !== undefined && isDemoLabelKey(d.labelKey)
    ? demoLabel(d.labelKey, "en") : d?.code ?? "";
};

/** One cost centre per department, plus one for the whole company. */
export function costCentres(c: DemoCompany): CostCentre[] {
  return [
    ...c.departments.map((d, i): CostCentre => ({
      code: `CC-${String(100 + i * 10)}`, department: deptName(c, d.id),
      name: deptName(c, d.id) })),
    { ...OFFICE_CENTRE, department: "Whole company" },
  ];
}

/* ---------------------------------------------------------------- *
 * Posting preview: the payroll journal as a CSV
 * ---------------------------------------------------------------- */

export const POSTING_HEADER = ["Line", "Company code", "Posting date",
  "Account", "Account name", "Cost centre", "Debit (AED)",
  "Credit (AED)", "Text"] as const;

export interface PostingLine {
  line: number;
  account: string;
  accountName: string;
  costCentre: string;
  debit: Fils;
  credit: Fils;
  /** The CSV cells, as written to the file. */
  cells: string[];
}

export interface PostingPreview {
  period: string;
  fileName: string;
  lines: PostingLine[];
  unmapped: string[];
  debits: Fils;
  credits: Fils;
  balanced: boolean;
  display: { debits: string; credits: string; lines: string };
  note: string;
}

const plain = (f: bigint): string =>
  `${f / 100n}.${String(f % 100n).padStart(2, "0")}`;

/** The journal's lines with a code each, ready for a CSV file. */
export function postingPreview(c: DemoCompany): PostingPreview {
  const j = payrollJournal(c);
  const map = new Map(accountMapping().map((m) => [m.source, m]));
  const centres = costCentres(c);
  const unmapped: string[] = [];
  const date = displayDate("2026-10-31");
  const lines = j.lines.map((l, i): PostingLine => {
    const m = map.get(l.account);
    if (m === undefined) unmapped.push(l.account);
    const cc = centres.find((x) => x.department === l.department)
      ?? OFFICE_CENTRE;
    const debit = l.side === "debit" ? l.amount : fils(0n);
    const credit = l.side === "credit" ? l.amount : fils(0n);
    const code = m?.code ?? "";
    return { line: i + 1, account: code, accountName: m?.account ?? "",
      costCentre: cc.code, debit, credit,
      cells: [String(i + 1), COMPANY_CODE, date, code, m?.account ?? "",
        cc.code, debit === 0n ? "" : plain(debit),
        credit === 0n ? "" : plain(credit), `${j.period} pay: ` +
        `${l.account}, ${l.department}`] };
  });
  const debits = fils(lines.reduce((n, l) => n + l.debit, 0n));
  const credits = fils(lines.reduce((n, l) => n + l.credit, 0n));
  return { period: j.period, fileName: "payroll-posting-october-2026.csv",
    lines, unmapped, debits, credits, balanced: debits === credits,
    display: { debits: formatAed(debits), credits: formatAed(credits),
      lines: `${lines.length} lines` },
    note: "The payroll journal, one line per account and cost centre, " +
      "as a CSV file your finance team could load into an ERP or a " +
      "general ledger. It is a preview built from the October run. " +
      "Nothing is posted, and your accountant maps the sample codes." };
}

/** The preview file's text: header, then one row per line. */
export function postingCsv(p: PostingPreview): string {
  const cell = (v: string): string => `"${v.replace(/"/g, '""')}"`;
  return "﻿" + [POSTING_HEADER.map(cell).join(","), ...p.lines.map((l) =>
    l.cells.map(cell).join(","))].join("\r\n");
}

/* ---------------------------------------------------------------- *
 * Employee sync: what an ERP would receive about each person
 * ---------------------------------------------------------------- */

export interface SyncRow {
  number: string;
  name: string;
  department: string;
  costCentre: string;
  joined: string;
}

/** A sample of the employee sync: no pay, no ID numbers. */
export function employeeSync(c: DemoCompany, limit = 5): SyncRow[] {
  const centres = costCentres(c);
  return c.employees.slice(0, limit).map((e): SyncRow => {
    const dept = deptName(c, e.departmentId);
    return { number: e.number, name: e.fullName, department: dept,
      costCentre: centres.find((x) => x.department === dept)?.code
        ?? OFFICE_CENTRE.code, joined: displayDate(e.joiningDate) };
  });
}

/* ---------------------------------------------------------------- *
 * Teams: the message a decision would send
 * ---------------------------------------------------------------- */

export interface TeamsCard {
  id: string;
  title: string;
  detail: string;
  amount: string | null;
  buttons: string[];
}

const nameOf = (c: DemoCompany, id: string): string =>
  c.employees.find((e) => e.id === id)?.fullName ?? id;

/** One card per request waiting, from the existing inbox. */
export function teamsCards(c: DemoCompany, limit = 3): TeamsCard[] {
  return c.approvals.slice(0, limit).map((a): TeamsCard => {
    const who = a.employeeId === null ? "" : nameOf(c, a.employeeId);
    const title = a.kind === "pay-run" ? "October pay run is ready to " +
      "sign off" : a.kind === "leave" ? `Leave request: ${who}` :
      `Expense claim: ${who}`;
    return { id: a.id, title,
      detail: `Prepared by ${nameOf(c, a.makerEmployeeId)}. To decide: ` +
        `${nameOf(c, a.checkerEmployeeId)}. Sent ${displayDate(
          a.requestedOn)}.`,
      amount: a.amount === null ? null : formatAed(a.amount),
      buttons: ["Open in MubinFlow", "Decide later"] };
  });
}

/* ---------------------------------------------------------------- *
 * The three pages
 * ---------------------------------------------------------------- */

const mask = (tail: string): string => `${"*".repeat(8)}${tail}`;

function erp(c: DemoCompany): ErpPage {
  const r = employeeSync(c, 1)[0];
  const sample = r === undefined ? "No employees." :
    `${r.number}, ${r.name}, ${r.department}, ${r.costCentre}, ` +
    `joined ${r.joined}`;
  return { id: "erp", title: "ERP connection", testResult: TEST_RESULT,
    lede: "Send staff records and each month's pay posting to your ERP.",
    notice: NOTICE,
    groups: [
      { title: "Connection", items: [
        item("erp:switch", "ERP connection", "Off",
          "Off until your own ERP is connected.", ON_OFF),
        item("erp:endpoint", "Endpoint",
          "Sample .test address",
          `https://erp.${DEMO_EMAIL_DOMAIN}/api/v1. ` +
          "A sample address on a .test domain. It does not exist."),
        item("erp:token", "Access token", mask("c41f"),
          "Shown masked. A real token is shown once, when it is made."),
        item("erp:company", "Company code", COMPANY_CODE,
          "Goes on every line of the posting file."),
      ] },
      { title: "What would be sent", items: [
        item("erp:sync", "Employee sync", "Off",
          "Staff number, name, department, cost centre and joining " +
          "date. No pay and no ID numbers. First record: " + sample + ".",
          ON_OFF),
        item("erp:posting", "Pay posting file", "Off",
          "The month's payroll journal as a CSV, after the run is " +
          "signed off. Preview below.", ON_OFF),
        item("erp:layout", "File layout", "CSV, one line per account",
          "Plain CSV with nine columns. Your ERP's own import layout is " +
          "set up with your accountant."),
      ] },
    ] };
}

function gl(c: DemoCompany): ErpPage {
  const p = postingPreview(c);
  return { id: "gl", title: "General ledger", testResult: TEST_RESULT,
    lede: "Book the payroll journal in your accounting system.",
    notice: NOTICE,
    groups: [
      { title: "Connection", items: [
        item("gl:switch", "General ledger sync", "Off",
          "Off until your own accounting system is connected.", ON_OFF),
        item("gl:endpoint", "Endpoint",
          "Sample .test address",
          `https://ledger.${DEMO_EMAIL_DOMAIN}/journals. ` +
          "A sample address on a .test domain. It does not exist."),
        item("gl:token", "Access token", mask("9a2e"),
          "Shown masked."),
        item("gl:when", "When it sends", "After sign-off",
          "One journal for the month, once the pay run is signed off.",
          ["After sign-off", "Only when HR sends it"]),
      ] },
      { title: "What would be sent", items: [
        item("gl:lines", "Journal lines", p.display.lines,
          `${p.display.debits} debit and ${p.display.credits} credit` +
          (p.balanced ? ", equal." : ", not equal.")),
        item("gl:codes", "Accounts", `${accountMapping().length} mapped`,
          "Each pay element and deduction has a sample account. Your " +
          "accountant changes them."),
      ] },
    ] };
}

function teams(c: DemoCompany): ErpPage {
  const first = teamsCards(c, 1)[0];
  return { id: "teams", title: "Chat messages", testResult: TEST_RESULT,
    lede: "Tell the person who must decide, in a chat channel.",
    notice: NOTICE.replace("Nothing below is sent to anyone.",
      "No message is sent."),
    groups: [
      { title: "Connection", items: [
        item("teams:switch", "Messages in chat", "Off",
          "Off until your own chat channel is connected.", ON_OFF),
        item("teams:endpoint", "Channel address",
          "Sample .test address",
          `https://teams.${DEMO_EMAIL_DOMAIN}/hooks/hr-decisions. ` +
          "A sample address on a .test domain. It does not exist."),
        item("teams:token", "Secret", mask("5d07"), "Shown masked."),
      ] },
      { title: "What would be sent", items: [
        item("teams:what", "Requests waiting for a decision", "Off",
          "A card for each request that waits for a decision: pay run, " +
          "leave and expenses. The decision is made in MubinFlow, never " +
          "in chat.", ON_OFF),
        item("teams:first", "First card", first?.title ?? "None",
          "Built from a real request. Preview below."),
      ] },
    ] };
}

/** The three pages, built from the existing records. */
export function erpPages(c: DemoCompany): ErpPage[] {
  return [erp(c), gl(c), teams(c)];
}

/** A page by id. */
export const erpPage = (c: DemoCompany, id: ErpPageId): ErpPage =>
  erpPages(c).find((p) => p.id === id)!;
