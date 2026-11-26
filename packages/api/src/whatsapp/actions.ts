import {
  CHANNEL_APPROVABLE_SUBJECTS,
  WHATSAPP_ACTION_TEMPLATE,
} from "@payroll/contract";
import { viewFor } from "../approvals/requests";
import type { Payload } from "../channels/dispatch-record";
import type { DeliveryRowDb } from "../channels/fallback";
import type { EventCtx } from "../channels/notify";
import { settingsBody } from "../channels/settings";
import { phoneHash } from "./phone";
import { ACTION_TTL_HOURS, signAction } from "./token";

/** Pure: may WhatsApp decide this subject type? (a product rule) */
export function channelApprovable(subjectType: string,
  allowed: readonly string[] = CHANNEL_APPROVABLE_SUBJECTS): boolean {
  return allowed.includes(subjectType);
}

export const actionKey = (c: EventCtx) =>
  c.deps.keyring.derive("payroll/wa-action/v1");

async function openAction(c: EventCtx, d: DeliveryRowDb, approvalId: string,
  step: number, hash: string): Promise<{ id: string; expires: Date }> {
  const [had] = await c.tx.query<{ id: string; expires_at: string }>(
    `SELECT id, expires_at FROM channel_actions WHERE company_id = $1
       AND delivery_id = $2 AND status = 'open' AND phone_hash = $3`,
    [c.companyId, d.id, hash]);
  if (had !== undefined) {
    return { id: had.id, expires: new Date(had.expires_at) };
  }
  const id = c.deps.newId();
  const now = c.deps.now();
  const expires = new Date(now.getTime() + ACTION_TTL_HOURS * 3600_000);
  await c.tx.query(
    `INSERT INTO channel_actions (id, company_id, approval_id, step_order,
       recipient_user_id, phone_hash, delivery_id, status, expires_at,
       created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', $8, $9)`,
    [id, c.companyId, approvalId, step, d.user_id, hash, d.id,
      expires.toISOString(), now.toISOString()]);
  return { id, expires };
}

/**
 * Last step before a WhatsApp send. An approval request whose subject
 * WhatsApp may decide, with approvals switched on and the step still
 * pending, gets one action row and two signed tokens (approve and
 * reject) as quick-reply payloads; anything else is sent as is.
 */
export async function prepareWhatsApp(c: EventCtx, d: DeliveryRowDb,
  p: Payload, toE164: string): Promise<Payload> {
  const approvalId = p.meta?.approvalId;
  const step = Number(p.meta?.stepOrder);
  if (d.kind !== "approval-pending" || approvalId === undefined) return p;
  if (!(await settingsBody(c.tx, c.companyId)).body.whatsappApprovals) {
    return p;
  }
  const view = await viewFor(c.tx, c.companyId, approvalId);
  if (!channelApprovable(view.subjectType) || view.status !== "pending" ||
    view.currentStep !== step) return p;
  const a = await openAction(c, d, approvalId, step,
    phoneHash(c.deps.keyring, toE164));
  const sign = (decision: "a" | "r") => signAction(actionKey(c), {
    companyId: c.companyId, actionId: a.id, decision,
    expiresAt: Math.floor(a.expires.getTime() / 1000) });
  return { ...p, templateName: WHATSAPP_ACTION_TEMPLATE,
    buttons: [sign("a"), sign("r")] };
}
