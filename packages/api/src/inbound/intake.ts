import type { InboundEmail } from "../channels/ports";
import { consumeRate } from "../channels/rate";
import { markSeen } from "../channels/seen";
import type { Db } from "../db/db";
import type { HandlerDeps } from "../deps";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { senderAuthDecision } from "./auth-decision";
import { keepItem, rejectItem } from "./items";
import { inboundBody, mailboxMatches, parseMailboxHash } from "./mailbox";
import { domainOf, matchSender } from "./sender";

/** Inbound emails per company per Dubai day (product default). */
const DAILY_LIMIT = 200;

function parseBody(ctx: ReqCtx): InboundEmail {
  let json: unknown;
  try {
    json = JSON.parse(ctx.rawBody ?? "");
  } catch {
    throw new ApiError("INBOUND_PAYLOAD_INVALID");
  }
  return ctx.deps.channels.inboundEmail.parse(json);
}

async function activeEmployees(tx: Db, companyId: string, today: string) {
  return tx.query<{ id: string; email: string | null }>(
    `SELECT id, email FROM employees WHERE company_id = $1
       AND (last_working_date IS NULL OR last_working_date >= $2)`,
    [companyId, today]);
}

/** Steps 1 to 6 of the intake, inside the company's transaction. */
async function intakeTx(tx: Db, deps: HandlerDeps, companyId: string,
  e: InboundEmail): Promise<void> {
  const now = deps.now();
  if (!(await markSeen(tx, companyId, "email", e.messageId, now))) return;
  const c = { tx, deps, companyId };
  if (!(await inboundBody(tx, companyId)).body.enabled) {
    return rejectItem(c, e, "DISABLED");
  }
  const rate = await consumeRate(tx, companyId, "inbound", "all",
    DAILY_LIMIT, 86400, new Date(now.getTime() + 4 * 3600_000));
  if (!rate.allowed) return rejectItem(c, e, "RATE_LIMITED");
  const verdict = senderAuthDecision(e.auth, domainOf(e.from));
  if (verdict === "reject") return rejectItem(c, e, "SENDER_AUTH_FAILED");
  const settings = (await inboundBody(tx, companyId)).body;
  const who = matchSender(e.from, await activeEmployees(tx, companyId,
    now.toISOString().slice(0, 10)), settings.allowlist);
  if (!who.allowed) return rejectItem(c, e, "SENDER_NOT_ALLOWED");
  await keepItem(c, e, who.employeeId, verdict === "flag");
}

/**
 * POST /v1/hooks/email/{provider}. Status codes follow the provider's
 * retry rule (non-200 is retried, 403 stops): 503 not set up, 401 bad
 * credentials, 403 bad payload or unknown mailbox (nothing stored).
 * Every path that reaches the company answers 200; no reply email is
 * ever sent.
 */
export async function intakeEmail(ctx: ReqCtx): Promise<{ ok: true }> {
  const adapter = ctx.deps.channels.inboundEmail;
  if (!adapter.configured) throw new ApiError("HOOK_NOT_CONFIGURED");
  if (!adapter.authenticate(ctx.rawHeader?.("authorization"))) {
    throw new ApiError("HOOK_SIGNATURE_INVALID");
  }
  const e = parseBody(ctx);
  const box = parseMailboxHash(e.mailboxHash);
  if (box === null) throw new ApiError("INBOUND_REFUSED");
  await ctx.enter({ companyId: box.companyId, userId: null }, async (tx) => {
    if (!(await mailboxMatches(tx, box.companyId, box.secret))) {
      throw new ApiError("INBOUND_REFUSED");
    }
    await intakeTx(tx, ctx.deps, box.companyId, e);
  });
  return { ok: true };
}
