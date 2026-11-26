import type { ErrorCode } from "@payroll/contract";
import { decide, verdictFor } from "../approvals/decide";
import { viewFor } from "../approvals/requests";
import type { SubjectHandlers } from "../approvals/subjects";
import { actorCtx } from "../channels/actor";
import { channelAudit } from "../channels/audit";
import { consumeRate, rateExceeded } from "../channels/rate";
import { settingsBody } from "../channels/settings";
import { channelApprovable } from "./actions";
import type { Db } from "../db/db";
import type { HandlerDeps } from "../deps";

export interface ActionRow {
  id: string;
  approval_id: string;
  step_order: number;
  recipient_user_id: string;
  phone_hash: string;
  status: string;
  expires_at: string;
  reason_until: string | null;
}

export type ReplyKey = "approved" | "reasonPrompt" | "rejected" | "stale" |
  "ambiguous" |
  "refused" | "stopped";

/** Bad taps per phone per hour before taps are ignored (default). */
const BAD_LIMIT = 10;

export interface ActCtx {
  tx: Db;
  deps: HandlerDeps;
  handlers: SubjectHandlers;
  companyId: string;
  messageId: string;
  hash: string;
}

export const tooManyBad = (a: ActCtx) => rateExceeded(a.tx, a.companyId,
  "wa-bad", a.hash, BAD_LIMIT, 3600, a.deps.now());

export const countBad = (a: ActCtx) => consumeRate(a.tx, a.companyId,
  "wa-bad", a.hash, BAD_LIMIT, 3600, a.deps.now());

export async function lockAction(a: ActCtx, id: string)
  : Promise<ActionRow | null> {
  const [r] = await a.tx.query<ActionRow>(
    `SELECT * FROM channel_actions WHERE company_id = $1 AND id = $2
     FOR UPDATE`, [a.companyId, id]);
  return r ?? null;
}

async function optedIn(a: ActCtx, r: ActionRow): Promise<boolean> {
  const rows = await a.tx.query(
    `SELECT 1 FROM channel_opt_ins WHERE company_id = $1 AND user_id = $2
       AND status = 'active' AND phone_hash = $3`,
    [a.companyId, r.recipient_user_id, a.hash]);
  return rows.length > 0;
}

/**
 * Null when the action may proceed; otherwise what to reply (or
 * "silent"). The phone must be the one the message went to, and its
 * opt-in must still be active (no reply at all after a withdrawal).
 */
export async function refuseAction(a: ActCtx, r: ActionRow | null,
  want: "open" | "awaiting-reason"): Promise<ReplyKey | "silent" | null> {
  if (r === null || r.phone_hash !== a.hash) return "silent";
  if (!(await optedIn(a, r))) return "silent";
  const now = a.deps.now();
  const live = r.status === want && new Date(r.expires_at) > now &&
    (want === "open" || (r.reason_until !== null &&
      new Date(r.reason_until) > now));
  return live ? null : "stale";
}

export async function setAction(a: ActCtx, id: string, status: string,
  extra: { reasonUntil?: Date } = {}): Promise<void> {
  const now = a.deps.now().toISOString();
  await a.tx.query(
    `UPDATE channel_actions SET status = $3, reason_until = coalesce($4,
       reason_until), decided_at = CASE WHEN $3 = 'used' THEN $5::timestamptz
       ELSE decided_at END, decided_message_id = CASE WHEN $3 = 'used'
       THEN $6 ELSE decided_message_id END
     WHERE company_id = $1 AND id = $2`, [a.companyId, id, status,
      extra.reasonUntil?.toISOString() ?? null, now, a.messageId]);
}

export async function audit(a: ActCtx, r: ActionRow, action: string,
  data: Record<string, unknown>): Promise<void> {
  await channelAudit(a.tx, { companyId: a.companyId,
    at: a.deps.now().toISOString(), actorUserId: r.recipient_user_id,
    action, entityType: "channel-action", entityId: r.id,
    data: data as never });
}

/**
 * The spine's own checks before deciding: the step must still be the
 * one the message was for, and `mayDecide` must allow the recipient.
 */
export async function preCheck(a: ActCtx, r: ActionRow)
  : Promise<ReplyKey | null> {
  const view = await viewFor(a.tx, a.companyId, r.approval_id);
  if (view.status !== "pending" || view.currentStep !== r.step_order) {
    await setAction(a, r.id, "void");
    return "stale";
  }
  // Rules may have changed since the message was sent.
  const on = (await settingsBody(a.tx, a.companyId)).body.whatsappApprovals;
  if (!on || !channelApprovable(view.subjectType)) {
    await setAction(a, r.id, "void");
    return "refused";
  }
  const ctx = await actorCtx(a.tx, a.deps, a.companyId,
    r.recipient_user_id, "whatsapp");
  const verdict = await verdictFor(ctx, r.approval_id);
  if (verdict === "ok") return null;
  await setAction(a, r.id, "void");
  await audit(a, r, "whatsapp.action-refused",
    { errorCode: verdict as ErrorCode });
  return "refused";
}

/** Decides through Plan 6's `decide` as the recipient (via WhatsApp). */
export async function decideAs(a: ActCtx, r: ActionRow,
  action: "approve" | "reject", note?: string): Promise<void> {
  const body = note === undefined ? { stepOrder: r.step_order }
    : { stepOrder: r.step_order, note };
  const ctx = await actorCtx(a.tx, a.deps, a.companyId,
    r.recipient_user_id, "whatsapp", body);
  await decide(ctx, a.handlers, r.approval_id, action);
  await setAction(a, r.id, "used");
  await audit(a, r, "whatsapp.action-used",
    { decision: action, approvalId: r.approval_id });
}
