import type { Finding } from "@payroll/wps";
import { totalsOf } from "./payroll";
import { buildSif } from "./sif";
import type { DemoCompany, DemoEmployee } from "./types";

export type IbanFixResult =
  | { ok: true; demo: DemoCompany; findings: Finding[] }
  | { ok: false; reason: string; findings: Finding[] };

/** The validator's findings on one account, in plain words. */
const PLAIN: Record<string, string> = {
  ACCOUNT_LENGTH: "An IBAN has 23 characters: AE followed by 21 digits.",
  IBAN_CHECKSUM: "This IBAN does not add up: one digit is probably " +
    "mistyped. Check it against the bank letter.",
  ROUTING_IBAN_BANK_MISMATCH: "This IBAN belongs to a different bank " +
    "than the one on file for this employee.",
};
const BAD = Object.keys(PLAIN);

const SHAPE = /^AE\d{21}$/;

function withIban(e: DemoEmployee, iban: string): DemoEmployee {
  return { ...e, iban: { value: iban,
    masked: `AE** **** **** **** ***${iban.slice(-4)}`, fake: true,
    note: "Entered in the demo" } };
}

/**
 * Enters `iban` for one employee and returns the new demo state: the
 * held pay joins the salary file, the SIF is generated and checked
 * again through packages/wps, and totals, issues and the headline
 * follow from the new state. Pure and deterministic; the input demo
 * is not changed. An IBAN the validator finds fault with is refused,
 * with its reason in plain words.
 */
export function applyIbanFix(demo: DemoCompany, employeeId: string,
  iban: string): IbanFixResult {
  const value = iban.replace(/\s+/g, "").toUpperCase();
  if (!demo.employees.some((e) => e.id === employeeId)) {
    return { ok: false, reason: "There is no such employee in the demo.",
      findings: [] };
  }
  if (!SHAPE.test(value)) {
    return { ok: false, reason: PLAIN.ACCOUNT_LENGTH!, findings: [] };
  }
  const employees = demo.employees.map((e) => e.id === employeeId
    ? withIban(e, value) : e);
  const payslips = demo.payRun.payslips.map((s) => s.employeeId ===
    employeeId ? { ...s, sif: { included: true as const } } : s);
  const payRun = { ...demo.payRun, payslips, totals: totalsOf(payslips) };
  const sif = buildSif(demo.company, employees, payRun);
  const mine = sif.findings.filter((f) => f.value === value &&
    BAD.includes(f.code));
  if (mine.length > 0) {
    return { ok: false, reason: PLAIN[mine[0]!.code]!,
      findings: sif.findings };
  }
  const approvals = demo.approvals.map((a) => a.kind === "pay-run"
    ? { ...a, amount: payRun.totals.net } : a);
  return { ok: true, findings: sif.findings,
    demo: { ...demo, employees, payRun, sif, approvals } };
}
