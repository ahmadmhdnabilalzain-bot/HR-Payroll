import { REPLY_TEXTS } from "@payroll/contract";
import type { SubjectHandlers } from "../approvals/subjects";
import type { WaInboundEvent } from "../channels/ports";
import { markSeen } from "../channels/seen";
import type { HandlerDeps } from "../deps";
import type { Enter } from "../http/context";
import { ApiError } from "../http/errors";
import {
  audit,
  countBad,
  decideAs,
  lockAction,
  preCheck,
  refuseAction,
  setAction,
  tooManyBad,
  type ActCtx,
  type ReplyKey,
} from "./action-checks";
import { onText } from "./inbound-text";
import { phoneHash } from "./phone";
import { verifyAction, type ActionClaims } from "./token";

export interface HookCtx {
  enter: Enter;
  deps: HandlerDeps;
  handlers: SubjectHandlers;
  requestId: string;
}

type Ev<K> = Extract<WaInboundEvent, { kind: K }>;
export type Outcome = ReplyKey | "silent" | null;

/** Replies inside the window the approver just opened; never retried. */
export async function sendReply(h: HookCtx, to: string, messageId: string,
  key: ReplyKey): Promise<void> {
  const out = await h.deps.channels.whatsapp.sendText({ toE164: to,
    text: REPLY_TEXTS[key].en, idempotencyKey: `${messageId}:reply` });
  h.deps.log({ requestId: h.requestId, event: "whatsapp.reply",
    status: out.status });
}

/** The action's recipient (to open the tenant as that user), or null. */
export async function recipientOf(h: HookCtx, companyId: string,
  actionId: string): Promise<string | null> {
  const rows = await h.enter({ companyId, userId: null }, (tx) =>
    tx.query<{ recipient_user_id: string }>(
      `SELECT recipient_user_id FROM channel_actions
       WHERE company_id = $1 AND id = $2`, [companyId, actionId]));
  return rows[0]?.recipient_user_id ?? null;
}

const STALE_CODES = ["APPROVAL_NOT_PENDING", "APPROVAL_STEP_CHANGED"];

/**
 * After `decide` threw (its transaction rolled back): record the
 * message as seen, void the action and audit the refusal.
 */
export async function afterFailure(a: ActCtx, actionId: string,
  err: unknown): Promise<Outcome> {
  if (!(err instanceof ApiError)) throw err;
  await markSeen(a.tx, a.companyId, "whatsapp", a.messageId, a.deps.now());
  const r = await lockAction(a, actionId);
  if (r === null) return null;
  await setAction(a, r.id, "void");
  await audit(a, r, "whatsapp.action-refused", { errorCode: err.code });
  return STALE_CODES.includes(err.code) ? "stale" : "refused";
}

async function buttonTx(a: ActCtx, v: ActionClaims): Promise<Outcome> {
  if (!(await markSeen(a.tx, a.companyId, "whatsapp", a.messageId,
    a.deps.now()))) return null;
  if (await tooManyBad(a)) return null;
  const r = await lockAction(a, v.actionId);
  const refused = await refuseAction(a, r, "open");
  if (refused !== null) {
    await countBad(a);
    return refused;
  }
  const pre = await preCheck(a, r!);
  if (pre !== null) return pre;
  if (v.decision === "r") {
    await setAction(a, r!.id, "awaiting-reason", { reasonUntil:
      new Date(a.deps.now().getTime() + REASON_WINDOW_MS) });
    return "reasonPrompt";
  }
  await decideAs(a, r!, "approve");
  return "approved";
}

/** Reject needs a typed reason within this window (product default). */
export const REASON_WINDOW_MS = 10 * 60_000;

/** Runs `fn` as the recipient; a refusal from the spine is recorded. */
export async function asRecipient(h: HookCtx, companyId: string,
  actionId: string, e: { messageId: string; fromE164: string },
  fn: (a: ActCtx) => Promise<Outcome>): Promise<void> {
  const userId = await recipientOf(h, companyId, actionId);
  if (userId === null) return;
  const mk = (tx: ActCtx["tx"]): ActCtx => ({ tx, deps: h.deps,
    handlers: h.handlers, companyId, messageId: e.messageId,
    hash: phoneHash(h.deps.keyring, e.fromE164) });
  const t = { companyId, userId };
  let out: Outcome;
  try {
    out = await h.enter(t, (tx) => fn(mk(tx)));
  } catch (err) {
    out = await h.enter(t, (tx) => afterFailure(mk(tx), actionId, err));
  }
  if (out !== null && out !== "silent") {
    await sendReply(h, e.fromE164, e.messageId, out);
  }
}

async function onButton(h: HookCtx, e: Ev<"button">): Promise<void> {
  const key = h.deps.keyring.derive("payroll/wa-action/v1");
  const v = verifyAction(key, e.payload,
    Math.floor(h.deps.now().getTime() / 1000));
  if (typeof v === "string") return;
  await asRecipient(h, v.companyId, v.actionId, e, (a) => buttonTx(a, v));
}

/** One event; a failure is logged with the request id, never returned. */
export async function handleEvent(h: HookCtx, e: WaInboundEvent)
  : Promise<void> {
  try {
    if (e.kind === "button") await onButton(h, e);
    else if (e.kind === "text") await onText(h, e);
  } catch (err) {
    h.deps.log({ requestId: h.requestId, event: "whatsapp.event-failed",
      error: String((err as { code?: unknown }).code ?? "unknown") });
  }
}
