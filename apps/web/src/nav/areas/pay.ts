// NEEDS NATIVE REVIEW: the Arabic labels are authored by Claude.
import {
  finesToDecide,
  settlementsToSend,
  waitingOf,
} from "../../pay/derive";
import { loadPay, payIfLoaded } from "../../pay/load";
import type { Area, NavCtx } from "../types";

/** WP6: owned by its package builder (navigation map, section 7). */

const HR_GM = ["hr", "gm"] as const;

// The pay records load beside the entry chunk, so counts that read
// them show once the panel is first opened.
void loadPay();

/** A count over the loaded records; null (no count) until they load. */
const withPay = (f: (c: NavCtx, v: NonNullable<ReturnType<
  typeof payIfLoaded>>) => number) => (c: NavCtx): number | null => {
  const v = payIfLoaded();
  return v === null ? null : f(c, v);
};

const pay = (rest: string): Area["route"] =>
  ({ section: "pay-run", rest: [rest] });

export const AREAS: readonly Area[] = [
  { id: "pay.runs", section: "pay", group: "month",
    label: { en: "Past runs", ar: "دورات الرواتب السابقة" },
    status: "live", archetype: "LF", roles: HR_GM, route: pay("runs"),
    keywords: "past runs history trend payslips june july august " +
      "september variance" },
  { id: "pay.offcycle", section: "pay", group: "month",
    label: { en: "Off-cycle", ar: "مدفوعات خارج الدورة" },
    status: "live", archetype: "LF", roles: HR_GM, route: pay("off-cycle"),
    keywords: "off cycle outside run settlement advance bonus" },
  { id: "pay.corrections", section: "pay", group: "changes",
    label: { en: "Pay corrections", ar: "تصحيحات الرواتب" },
    status: "live", archetype: "FA", roles: HR_GM,
    route: pay("corrections"),
    count: (c) => waitingOf(c.state, ["correction"]),
    keywords: "correction arrears underpaid mistake retro" },
  { id: "pay.revisions", section: "pay", group: "changes",
    label: { en: "Salary revisions", ar: "تعديلات الرواتب" },
    status: "live", archetype: "FA", roles: HR_GM, route: pay("revisions"),
    count: (c) => waitingOf(c.state, ["revision"]),
    keywords: "raise increment revise basic back pay arrears promotion" },
  { id: "pay.expenses", section: "pay", group: "changes",
    label: { en: "Expense claims", ar: "مطالبات المصروفات" },
    status: "live", archetype: "FA", roles: HR_GM, route: pay("expenses"),
    count: withPay((c, v) => v.expenses.filter((x) => !x.settled &&
      c.data.approvalsInbox().some((a) => a.kind === "expense" &&
        a.employeeId === x.employeeId && c.state.decided[a.id] ===
        undefined)).length),
    keywords: "expense claim receipt reimburse vat" },
  { id: "pay.fines", section: "pay", group: "changes",
    label: { en: "Traffic fines", ar: "المخالفات المرورية" },
    status: "live", archetype: "LF", roles: HR_GM, route: pay("fines"),
    count: withPay((c, v) => finesToDecide(v, c.state)),
    keywords: "traffic fine car speeding parking" },
  { id: "pay.deductions", section: "pay", group: "changes",
    label: { en: "Deductions", ar: "سجل الاستقطاعات" },
    status: "live", archetype: "LF", roles: HR_GM, route: pay("deductions"),
    keywords: "deduction ledger loan repayment taken from pay" },
  { id: "pay.loans", section: "pay", group: "owed",
    label: { en: "Loans and advances", ar: "القروض والسلف" },
    status: "live", archetype: "FA", roles: HR_GM, route: pay("loans"),
    count: (c) => waitingOf(c.state, ["loan", "advance"]),
    keywords: "loan advance instalment repay balance" },
  { id: "pay.settlements", section: "pay", group: "owed",
    label: { en: "Final settlements", ar: "التسويات النهائية" },
    status: "live", archetype: "RT", roles: HR_GM,
    route: pay("settlements"),
    count: withPay((c, v) => settlementsToSend(v, c.state) +
      waitingOf(c.state, ["settlement"])),
    keywords: "gratuity end of service leaver exit settlement statement" },
  { id: "setup.paygroups", section: "setup", group: "pay",
    label: { en: "Pay groups", ar: "مجموعات الرواتب" },
    status: "live", archetype: "ST", roles: HR_GM, route: pay("groups"),
    keywords: "pay group payday branches head office" },
  { id: "setup.payelements", section: "setup", group: "pay",
    label: { en: "Pay elements", ar: "عناصر الرواتب" },
    status: "live", archetype: "ST", roles: HR_GM, route: pay("elements"),
    keywords: "earning deduction allowance element code" },
];
