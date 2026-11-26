import {
  WHATSAPP_CONSENT_TEXT,
  type MyChannels,
} from "@payroll/contract";
import type { ReqCtx } from "../http/context";

interface OptRow {
  status: "pending" | "active" | "withdrawn";
  phone_last4: string;
  consent_version: number;
  consented_at: string | null;
}

const state = (on: boolean) => on ? "configured" : "not-configured";

/** The caller's channels: own email, WhatsApp state (last 4 digits). */
export async function myChannels(ctx: ReqCtx): Promise<MyChannels> {
  const c = ctx.tenant!.companyId;
  const [o] = await ctx.tx.query<OptRow>(
    `SELECT status, phone_last4, consent_version, consented_at
     FROM channel_opt_ins WHERE company_id = $1 AND user_id = $2
     ORDER BY (status <> 'withdrawn') DESC, created_at DESC, id DESC
     LIMIT 1`, [c, ctx.user!.id]);
  const [co] = await ctx.tx.query<{ name: string }>(
    "SELECT name FROM companies WHERE id = $1", [c]);
  // Unreviewed Arabic is never shown (Ruling 12).
  const text = WHATSAPP_CONSENT_TEXT.en.split("{company}")
    .join(co?.name ?? "");
  return {
    email: { address: ctx.user!.email },
    whatsapp: o === undefined ? { status: "none", phoneLast4: null,
      consentVersion: null, consentedAt: null }
      : { status: o.status, phoneLast4: o.phone_last4,
        consentVersion: o.consent_version, consentedAt: o.consented_at },
    providers: { email: state(ctx.deps.channels.email.configured),
      whatsapp: state(ctx.deps.channels.whatsapp.configured) },
    consentText: text,
  };
}
