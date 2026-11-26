import { z } from "zod";

const DIGITS = /^\d+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const amount = z.string().regex(DIGITS);
const date = z.string().regex(DATE);

const Allowance = z.object({ code: z.string(), monthly: amount,
  kind: z.enum(["housing", "conveyance", "medical", "passage", "other"]) });

const Gpssa = z.object({ regime: z.enum(["dl57-2023", "law7-1999"]),
  fixingMonth: z.string(), fixingBasic: amount,
  fixingAllowances: amount, arrears: amount });

const Employee = z.object({
  workerClass: z.enum(["expat-full-time", "uae-national",
    "gcc-national"]),
  joiningDate: date, leavingDate: date.nullable(),
  probationEndDate: date.nullable(), shiftWorker: z.boolean(),
  normalHoursPerDay: z.number(), basicMonthly: amount,
  allowances: z.array(Allowance), gpssa: Gpssa.nullable(),
});

const Input = z.object({
  year: z.number(), month: z.number(), employee: Employee,
  absences: z.array(z.object({ date,
    kind: z.enum(["unpaid", "sick", "maternity"]) })),
  sickDaysUsedBefore: z.number(), maternityDaysUsedBefore: z.number(),
  overtime: z.array(z.object({ date, minutes: z.number(),
    nightMinutes: z.number() })),
  restDayWork: z.array(z.object({ date,
    kind: z.enum(["rest-day", "holiday"]),
    compensation: z.enum(["pay", "day-off"]) })),
  encashLeaveDays: z.number(),
  deductions: z.array(z.object({ ref: z.string(), amount,
    kind: z.enum(["overpayment", "violation", "damage", "court-debt",
      "scheme"]), consentOnFile: z.boolean() })),
  loans: z.array(z.object({ ref: z.string(), instalment: amount,
    balance: amount, consentOnFile: z.boolean() })),
});

const Expected = z.object({ gross: amount, totalDeductions: amount,
  net: amount, employerCost: amount });

export const PayrollCaseFileSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  input: Input,
  overrides: z.record(z.string(),
    z.union([z.string(), z.number(), z.boolean()])).optional(),
  expected: Expected,
  sourceIds: z.array(z.string().min(1)).min(1),
  status: z.enum(["official", "secondary", "convention", "unsourced"]),
});

export type PayrollCaseFile = z.infer<typeof PayrollCaseFileSchema>;
