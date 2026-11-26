import type { App } from "../../src/http/context";
import type { Seeded, SeedUser } from "./seed";
import { call, type Clock } from "./test-app";

/** The fixed clock of the expense tests (Dubai 2026-03-20 12:00). */
export const EXPENSE_START = "2026-03-20T08:00:00.000Z";

export interface Cats { meals: string; mileage: string; perDiem: string }
type Ctx = { app: App; clock: Clock };

async function must(p: Promise<{ status: number; text: string; body: any }>,
  want: number) {
  const r = await p;
  if (r.status !== want) throw new Error(`${r.status} ${r.text}`);
  return r.body;
}

const RATES = {
  mileageRates: [{ code: "car", label: "Own car", perKm: "0.75",
    effectiveFrom: "2026-01-01" }],
  perDiemRates: [{ code: "gcc", label: "GCC trip", labelAr: null,
    daily: "200.00", effectiveFrom: "2026-01-01" }],
};

/** Replaces the policy's limits (rates stay), whatever its version. */
export async function setLimits(ctx: Ctx, s: Seeded,
  limits: unknown[], claimWindowDays: number | null = null) {
  const cur = await must(call(ctx.app, s.hr.token, s.companyId, "GET",
    "/v1/expense-policy"), 200);
  return must(call(ctx.app, s.hr.token, s.companyId, "PUT",
    "/v1/expense-policy", { claimWindowDays, limits, ...RATES,
      expectedVersion: cur.version }), 200);
}

/** Categories meals, mileage and per-diem; rates car 0.75, gcc 200. */
export async function setupExpenses(ctx: Ctx, s: Seeded): Promise<Cats> {
  const cat = async (code: string, kind: string) => (await must(call(
    ctx.app, s.hr.token, s.companyId, "POST", "/v1/expense-categories",
    { code, name: code, kind }), 201)).id as string;
  const cats = { meals: await cat("meals", "receipt"),
    mileage: await cat("mileage", "mileage"),
    perDiem: await cat("per-diem", "per-diem") };
  await setLimits(ctx, s, []);
  return cats;
}

export const meal = (cats: Cats, amount: string,
  over: Record<string, unknown> = {}) => ({ kind: "receipt",
  categoryId: cats.meals, date: "2026-03-10", description: "Client lunch",
  receiptIds: [], amount, vatAmount: "0.00", supplierName: "Cafe",
  supplierTrn: null, ...over });

export const drive = (cats: Cats, km: number, date = "2026-03-10") => ({
  kind: "mileage", categoryId: cats.mileage, date,
  description: "Site visit", receiptIds: [], distanceKm: km,
  rateCode: "car" });

/** POST /v1/expense-claims as `u`; returns the raw response. */
export function createClaim(ctx: Ctx, u: SeedUser, s: Seeded,
  items: unknown[], extra: Record<string, unknown> = {}) {
  return call(ctx.app, u.token, s.companyId, "POST", "/v1/expense-claims",
    { title: "Trip", items, ...extra });
}

export function claimAction(ctx: Ctx, u: SeedUser, s: Seeded, id: string,
  action: "submit" | "cancel", body?: unknown) {
  return call(ctx.app, u.token, s.companyId, "POST",
    `/v1/expense-claims/${id}/${action}`, body ?? (action === "cancel"
      ? {} : undefined));
}

/** A claim filed and submitted by `u`; returns the claim body. */
export async function submitted(ctx: Ctx, u: SeedUser, s: Seeded,
  items: unknown[], extra: Record<string, unknown> = {}) {
  const c = await must(createClaim(ctx, u, s, items, extra), 201);
  return must(claimAction(ctx, u, s, c.id, "submit"), 200);
}

/** Submitted by `u`, approved by `approver` (one-step chain). */
export async function approvedClaim(ctx: Ctx, u: SeedUser,
  approver: SeedUser, s: Seeded, items: unknown[],
  extra: Record<string, unknown> = {}) {
  const c = await submitted(ctx, u, s, items, extra);
  await must(call(ctx.app, approver.token, s.companyId, "POST",
    `/v1/approvals/${c.approval.id}/approve`, { stepOrder: 1 }), 200);
  return c.id as string;
}
