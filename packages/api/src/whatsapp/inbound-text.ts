import type { WaInboundEvent } from "../channels/ports";
import { markSeen } from "../channels/seen";
import {
  decideAs,
  lockAction,
  preCheck,
  refuseAction,
  type ActCtx,
} from "./action-checks";
import {
  asRecipient,
  sendReply,
  type HookCtx,
  type Outcome,
} from "./inbound";
import { phoneHash } from "./phone";

type TextEv = Extract<WaInboundEvent, { kind: "text" }>;
const NO_TENANT = { companyId: null, userId: null };

/** STOP: every opt-in of this phone ends, in every company. */
async function stop(h: HookCtx, e: TextEv, hash: string): Promise<void> {
  const n = await h.enter(NO_TENANT, async (tx) => {
    const [w] = await tx.query<{ n: number }>(
      "SELECT withdraw_whatsapp_by_phone($1, $2) AS n",
      [hash, h.deps.now().toISOString()]);
    await tx.query("SELECT expire_awaiting_by_phone($1)", [hash]);
    return w?.n ?? 0;
  });
  if (n > 0) await sendReply(h, e.fromE164, e.messageId, "stopped");
}

/**
 * Review M8: two rejects wait for a reason on this phone. Neither gets
 * the text; both expire and the approver is asked to tap again.
 */
async function ambiguous(h: HookCtx, e: TextEv, hash: string)
  : Promise<void> {
  await h.enter(NO_TENANT, (tx) =>
    tx.query("SELECT expire_awaiting_by_phone($1)", [hash]));
  await sendReply(h, e.fromE164, e.messageId, "ambiguous");
}

async function reasonTx(a: ActCtx, actionId: string, text: string)
  : Promise<Outcome> {
  if (!(await markSeen(a.tx, a.companyId, "whatsapp", a.messageId,
    a.deps.now()))) return null;
  const r = await lockAction(a, actionId);
  const refused = await refuseAction(a, r, "awaiting-reason");
  if (refused !== null) return refused === "stale" ? null : refused;
  const reason = text.trim();
  if (reason.length < 3 || reason.length > 500) return "reasonPrompt";
  const pre = await preCheck(a, r!);
  if (pre !== null) return pre;
  await decideAs(a, r!, "reject", reason);
  return "rejected";
}

/**
 * Text from a phone: STOP withdraws; otherwise it is the typed reason
 * for a reject tapped in the last 10 minutes, or it is ignored.
 */
export async function onText(h: HookCtx, e: TextEv): Promise<void> {
  const hash = phoneHash(h.deps.keyring, e.fromE164);
  if (e.text.trim().toUpperCase() === "STOP") return stop(h, e, hash);
  const all = await h.enter(NO_TENANT, (tx) =>
    tx.query<{ company_id: string; action_id: string }>(
      "SELECT * FROM find_awaiting_reason($1, $2)",
      [hash, h.deps.now().toISOString()]));
  if (all.length > 1) return ambiguous(h, e, hash);
  const [found] = all;
  if (found === undefined) return;
  await asRecipient(h, found.company_id, found.action_id, e, (a) =>
    reasonTx(a, found.action_id, e.text));
}
