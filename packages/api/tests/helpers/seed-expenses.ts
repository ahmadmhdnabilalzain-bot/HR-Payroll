import type { App } from "../../src/http/context";
import { setupExpenses, meal, approvedClaim } from "./expense-fixtures";
import type { Seeded, SeedUser } from "./seed";
import { call, type Clock } from "./test-app";

type Target = keyof Seeded["emp"];
type Ctx = { app: App; clock: Clock };

/** One distinct claim amount per seeded employee record. */
export const EXPENSE_SENTINELS: Record<Target, string> = {
  manager: "8888.01", report: "8888.02", report2: "8888.03",
  outsider: "8888.04",
};

const PNG = (n: number) => Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d,
  0x0a, 0x1a, 0x0a, n]).toString("base64");

/** Who files and who approves each record's claim (the chain default). */
function roles(s: Seeded): Record<Target, [SeedUser, SeedUser]> {
  return { manager: [s.manager, s.hr], report: [s.employee, s.manager],
    report2: [s.hr, s.manager], outsider: [s.hr, s.owner] };
}

/**
 * One approved claim (with one receipt) per seeded employee record,
 * each with its sentinel amount. Returns claim and receipt ids.
 */
export async function seedExpenses(ctx: Ctx, s: Seeded) {
  const cats = await setupExpenses(ctx, s);
  const claims = {} as Record<Target, string>;
  const receipts = {} as Record<Target, string>;
  for (const [i, t] of (Object.keys(EXPENSE_SENTINELS) as Target[])
    .entries()) {
    const [filer, approver] = roles(s)[t];
    const up = await call(ctx.app, filer.token, s.companyId, "POST",
      "/v1/receipts", { fileName: "r.png", contentType: "image/png",
        dataBase64: PNG(i), employeeId: s.emp[t] });
    if (up.status !== 201) throw new Error(`receipt ${up.status} ${up.text}`);
    receipts[t] = up.body.id;
    claims[t] = await approvedClaim(ctx, filer, approver, s,
      [meal(cats, EXPENSE_SENTINELS[t], { date: "2026-02-15",
        receiptIds: [up.body.id] })], { employeeId: s.emp[t] });
  }
  return { claims, receipts };
}
