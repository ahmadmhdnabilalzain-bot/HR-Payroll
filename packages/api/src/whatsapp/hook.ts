import type { SubjectHandlers } from "../approvals/subjects";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { handleEvent } from "./inbound";

/**
 * POST /v1/hooks/whatsapp: signature first (503 when not set up, 401
 * when wrong), then each event on its own. Always 200 afterwards:
 * errors are logged, never returned to the provider.
 */
export async function handleWhatsAppHook(ctx: ReqCtx,
  handlers: SubjectHandlers): Promise<{ ok: true }> {
  const inbound = ctx.deps.channels.whatsappInbound;
  if (!inbound.configured) throw new ApiError("HOOK_NOT_CONFIGURED");
  const raw = ctx.rawBody ?? "";
  if (!inbound.verifySignature(raw, ctx.rawHeader?.("x-hub-signature-256"))) {
    throw new ApiError("HOOK_SIGNATURE_INVALID");
  }
  let json: unknown = null;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: true };
  }
  const h = { enter: ctx.enter, deps: ctx.deps, handlers,
    requestId: ctx.requestId };
  for (const e of inbound.parse(json)) await handleEvent(h, e);
  return { ok: true };
}

/** GET /v1/hooks/whatsapp: Meta's subscription check. */
export function whatsAppChallenge(ctx: ReqCtx<unknown,
  Record<string, string>>): string {
  const inbound = ctx.deps.channels.whatsappInbound;
  if (!inbound.configured) throw new ApiError("HOOK_NOT_CONFIGURED");
  const c = inbound.challenge(ctx.query);
  if (c === null) throw new ApiError("FORBIDDEN");
  return c;
}
