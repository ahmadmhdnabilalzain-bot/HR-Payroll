import { EngineError, parseAed, parseIsoDate } from "@payroll/engine";
import { z } from "zod";
import type { SifBatch, SifEmployee } from "./generate";
import type { EdrInput, EvpInput } from "./records";

/** I/O shell: schema for the `sif` demo's batch file. */

const digits = z.string().regex(/^[0-9]+$/, "must be digits only");
const count = z.number().int("must be a whole number")
  .min(0, "must be 0 or more");

const isoDate = z.string().refine((v) => {
  try {
    parseIsoDate(v);
    return true;
  } catch {
    return false;
  }
}, "must be a real date in the form YYYY-MM-DD");

/** "4000.00" to fils; the error keeps its field path. */
const amount = z.string().transform((v, ctx) => {
  try {
    return parseAed(v);
  } catch {
    ctx.addIssue({ code: "custom",
      message: "must be an AED amount like 4000.00" });
    return z.NEVER;
  }
});

const Edr = z.object({
  personId: digits,
  routingCode: z.string().regex(/^[0-9]{9}$/, "must be 9 digits"),
  account: z.string(),
  payStart: isoDate,
  payEnd: isoDate,
  days: count,
  fixed: amount,
  variable: amount,
  unpaidLeaveDays: count,
}).strict();

const Evp = z.object({
  personId: digits,
  routingCode: z.string().regex(/^[0-9]{9}$/, "must be 9 digits"),
  housing: amount,
  conveyance: amount,
  medical: amount,
  passage: amount,
  overtime: amount,
  otherAllowances: amount,
  leaveEncashment: amount,
}).strict();

export const BatchSchema = z.object({
  employerId: digits,
  bankRoutingCode: z.string().regex(/^[0-9]{9}$/, "must be 9 digits"),
  createdDate: isoDate,
  createdTime: z.string().regex(/^[0-9]{6}$/, "must be HHMMSS"),
  month: z.object({
    year: z.number().int().min(2000).max(2099),
    month: z.number().int().min(1).max(12),
  }).strict(),
  reference: z.string().optional(),
  employees: z.array(z.object({ edr: Edr, evp: Evp.optional() }).strict())
    .min(1, "must list at least one employee"),
}).strict();

type Batch = z.infer<typeof BatchSchema>;

function issues(error: z.ZodError): string {
  return error.issues.map((i) => {
    const path = i.path.map(String).join(".");
    return `${path === "" ? "(file)" : path}: ${i.message}`;
  }).join("; ");
}

function toEmployee(e: Batch["employees"][number]): SifEmployee {
  const edr: EdrInput = e.edr;
  if (e.evp === undefined) return { edr };
  const evp: EvpInput = e.evp;
  return { edr, evp };
}

function toBatch(b: Batch): SifBatch {
  const ref = b.reference === undefined ? {} : { reference: b.reference };
  return {
    employerId: b.employerId,
    bankRoutingCode: b.bankRoutingCode,
    createdDate: b.createdDate,
    createdTime: b.createdTime,
    month: b.month,
    ...ref,
    employees: b.employees.map(toEmployee),
  };
}

/**
 * Untrusted JSON to a batch. Throws INVALID_BATCH_FILE naming every bad
 * field by its path, e.g. `employees.0.edr.fixed`.
 */
export function parseBatch(json: unknown, file: string): SifBatch {
  const parsed = BatchSchema.safeParse(json);
  if (!parsed.success) {
    const why = issues(parsed.error);
    throw new EngineError("INVALID_BATCH_FILE",
      "batch file has invalid fields", { file, why });
  }
  return toBatch(parsed.data);
}
