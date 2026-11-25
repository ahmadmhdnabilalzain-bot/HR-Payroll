import { z } from "zod";

const DIGITS = /^\d+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const CaseFileSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  input: z.object({
    joiningDate: z.string().regex(DATE),
    lastWorkingDate: z.string().regex(DATE),
    unpaidLeaveDays: z.number(),
    lastBasicMonthly: z.string().regex(DIGITS),
    workerClass: z.string().min(1),
  }),
  expectedFils: z.string().regex(DIGITS),
  sourceId: z.string().min(1),
  status: z.enum(["official", "secondary"]),
});

export type CaseFile = z.infer<typeof CaseFileSchema>;
