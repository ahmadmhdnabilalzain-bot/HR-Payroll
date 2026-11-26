import { createHmac } from "node:crypto";
import { viewFor } from "../../src/approvals/requests";
import { withTenant } from "../../src/db/tenant";
import {
  dispatch,
  enableWhatsApp,
  optIn,
  setPrefs,
} from "./channel-jobs";
import {
  EXPENSE_START,
  meal,
  setupExpenses,
  submitted,
  type Cats,
} from "./expense-fixtures";
import { WA_APP_SECRET } from "./fake-channels";
import { seedCompany, type Seeded, type SeedUser } from "./seed";
import { call, makeApp } from "./test-app";

export type Ctx = Awaited<ReturnType<typeof makeApp>>;
export const M_PHONE = "+971500000002";
export const E_PHONE = "+971500000005";

type WaMsg = { id: string; from: string } &
  ({ payload: string } | { text: string });

/** A Meta-shaped webhook body and its signature header. */
export function waBody(msgs: WaMsg[], secret = WA_APP_SECRET) {
  const messages = msgs.map((m) => ({ id: m.id,
    from: m.from.replace(/^\+/, ""), timestamp: "1",
    ...("payload" in m ? { type: "button", button: { payload: m.payload,
      text: "Approve" } } : { type: "text", text: { body: m.text } }) }));
  const body = JSON.stringify({ object: "whatsapp_business_account",
    entry: [{ id: "1", changes: [{ field: "messages",
      value: { messaging_product: "whatsapp", messages } }] }] });
  const sig = createHmac("sha256", secret).update(body).digest("hex");
  return { body, sig: `sha256=${sig}` };
}

export async function postHook(ctx: Ctx, msgs: WaMsg[], secret?: string) {
  const { body, sig } = waBody(msgs, secret);
  const r = await ctx.app.request("/v1/hooks/whatsapp", { method: "POST",
    headers: { "content-type": "application/json",
      "x-hub-signature-256": sig }, body });
  return { status: r.status, text: await r.text() };
}

export interface WaWorld {
  ctx: Ctx;
  s: Seeded;
  cats: Cats;
  /** Submits a claim by the employee; returns its approval id. */
  claim(amount?: string): Promise<string>;
  /** The last action template sent to `phone`: [approve, reject]. */
  buttons(phone?: string): string[];
  replies(phone?: string): string[];
}

/** E's claims wait for manager M, who is opted in on WhatsApp. */
export async function waWorld(name: string, approvals = true)
  : Promise<WaWorld> {
  const ctx = await makeApp({ start: EXPENSE_START });
  const s = await seedCompany(ctx, name);
  const cats = await setupExpenses(ctx, s);
  await enableWhatsApp(ctx, s, { whatsappApprovals: approvals });
  await waUser(ctx, s, s.manager, M_PHONE);
  const sent = (phone: string) => ctx.fakes.outbox.whatsapp.filter((m) =>
    m.toE164 === phone);
  return { ctx, s, cats,
    async claim(amount = "40.00") {
      const c = await submitted(ctx, s.employee, s, [meal(cats, amount)]);
      await dispatch(ctx);
      return c.approval.id as string;
    },
    buttons: (phone = M_PHONE) => (sent(phone).filter((m) =>
      "buttonPayloads" in m).at(-1) as { buttonPayloads: string[] })
      .buttonPayloads,
    replies: (phone = M_PHONE) => sent(phone).flatMap((m) =>
      "text" in m ? [m.text] : []) };
}

/** Opts `u` in with `phone` and turns on WhatsApp approval notices. */
export async function waUser(ctx: Ctx, s: Seeded, u: SeedUser,
  phone: string) {
  await optIn(ctx, s, u, phone);
  await setPrefs(ctx, s, u, "approval-pending",
    { email: false, whatsapp: true });
}

export function approvalOf(ctx: Ctx, s: Seeded, id: string) {
  return withTenant(ctx.deps.db, { companyId: s.companyId, userId: null },
    (tx) => viewFor(tx, s.companyId, id));
}

export async function auditActions(ctx: Ctx, s: Seeded) {
  const r = await call(ctx.app, s.owner.token, s.companyId, "GET",
    "/v1/audit-events?limit=200");
  return r.body.items as { action: string; actorUserId: string | null;
    data: Record<string, unknown> }[];
}
