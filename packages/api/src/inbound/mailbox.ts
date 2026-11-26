import { timingSafeEqual } from "node:crypto";
import {
  INBOUND_PROCESSING_NOTE,
  InboundSettingsBody,
  type InboundSettings,
  type InboundSettingsUpdate,
} from "@payroll/contract";
import { sha256Hex } from "../audit/canonical";
import { channelAudit } from "../channels/audit";
import { channelSealer } from "../channels/crypto";
import type { Db } from "../db/db";
import type { HandlerDeps } from "../deps";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";

const B32 = "abcdefghijklmnopqrstuvwxyz234567";
const DEFAULTS: InboundSettingsBody = { enabled: false, allowlist: [],
  acknowledgedProcessing: false };

/** 16 lower-case base32 characters (80 bits) from 10 random bytes. */
export function mailboxSecret(random: (n: number) => Uint8Array): string {
  const b = random(10);
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of b) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  return out;
}

/** `in+<company hex>.<secret>@<domain>`. */
export const addressOf = (companyId: string, secret: string,
  domain: string) => `in+${companyId.replace(/-/g, "")}.${secret}@${domain}`;

const HASH = /^([0-9a-f]{32})\.([a-z2-7]{16})$/;

/** The company and secret named by a MailboxHash, or null. */
export function parseMailboxHash(h: string)
  : { companyId: string; secret: string } | null {
  const m = HASH.exec(h);
  if (m === null) return null;
  const x = m[1]!;
  const companyId = `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}` +
    `-${x.slice(16, 20)}-${x.slice(20)}`;
  return { companyId, secret: m[2]! };
}

interface MailboxRow { secret_hash: string; secret_enc: string;
  version: number }

async function mailbox(tx: Db, companyId: string) {
  const [r] = await tx.query<MailboxRow>(
    "SELECT * FROM inbound_mailboxes WHERE company_id = $1", [companyId]);
  return r ?? null;
}

/** Does this secret open the company's current mailbox? */
export async function mailboxMatches(tx: Db, companyId: string,
  secret: string): Promise<boolean> {
  const r = await mailbox(tx, companyId);
  if (r === null) return false;
  const a = Buffer.from(r.secret_hash);
  const b = Buffer.from(sha256Hex(secret));
  return a.length === b.length && timingSafeEqual(a, b);
}

async function writeSecret(tx: Db, deps: HandlerDeps, companyId: string,
  version: number): Promise<string> {
  const secret = mailboxSecret(deps.randomBytes);
  const s = await channelSealer(tx, deps, companyId);
  await tx.query(
    `INSERT INTO inbound_mailboxes (company_id, secret_hash, secret_enc,
       version, rotated_at) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (company_id) DO UPDATE SET secret_hash = $2,
       secret_enc = $3, version = $4, rotated_at = $5`,
    [companyId, sha256Hex(secret), s.seal("inbound_mailboxes", "secret",
      companyId, secret), version, deps.now().toISOString()]);
  return secret;
}

/** The address (created on first read when the adapter is set up). */
async function addressFor(tx: Db, deps: HandlerDeps, companyId: string)
  : Promise<string | null> {
  const domain = deps.channels.inboundEmailDomain;
  if (!deps.channels.inboundEmail.configured || domain === null) return null;
  const r = await mailbox(tx, companyId);
  const secret = r === null ? await writeSecret(tx, deps, companyId, 1)
    : (await channelSealer(tx, deps, companyId)).open("inbound_mailboxes",
      "secret", companyId, r.secret_enc);
  return addressOf(companyId, secret, domain);
}

export async function inboundBody(tx: Db, companyId: string, lock = false) {
  const [r] = await tx.query<{ version: number; body: unknown }>(
    `SELECT version, body FROM inbound_settings WHERE company_id = $1
     ${lock ? "FOR UPDATE" : ""}`, [companyId]);
  if (r === undefined) return { version: 0, body: DEFAULTS };
  const p = InboundSettingsBody.safeParse(r.body);
  return { version: r.version, body: p.success ? p.data : DEFAULTS };
}

export async function getInboundSettings(ctx: ReqCtx)
  : Promise<InboundSettings> {
  const c = ctx.tenant!.companyId;
  const s = await inboundBody(ctx.tx, c);
  return { ...s.body, version: s.version,
    address: await addressFor(ctx.tx, ctx.deps, c),
    provider: ctx.deps.channels.inboundEmail.configured ? "configured"
      : "not-configured", note: INBOUND_PROCESSING_NOTE };
}

export async function putInboundSettings(ctx: ReqCtx<InboundSettingsUpdate>)
  : Promise<InboundSettings> {
  const c = ctx.tenant!.companyId;
  const { expectedVersion, ...body } = ctx.body;
  const cur = await inboundBody(ctx.tx, c, true);
  if (cur.version !== expectedVersion) {
    throw new ApiError("SETTINGS_VERSION_CONFLICT");
  }
  const at = ctx.deps.now().toISOString();
  await ctx.tx.query(
    `INSERT INTO inbound_settings (company_id, version, body, updated_by,
       updated_at) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (company_id) DO UPDATE SET version = $2, body = $3,
       updated_by = $4, updated_at = $5`,
    [c, cur.version + 1, JSON.stringify(body), ctx.user!.id, at]);
  const changed = (["enabled", "allowlist", "acknowledgedProcessing"] as
    const).filter((k) => JSON.stringify(body[k]) !==
    JSON.stringify(cur.body[k]));
  await channelAudit(ctx.tx, { companyId: c, at, actorUserId: ctx.user!.id,
    action: "inbound.settings-updated", entityType: "company", entityId: c,
    data: { changed } });
  return getInboundSettings(ctx);
}

/** The old address stops working at once. */
export async function rotateAddress(ctx: ReqCtx): Promise<InboundSettings> {
  const c = ctx.tenant!.companyId;
  if (!ctx.deps.channels.inboundEmail.configured) {
    throw new ApiError("CHANNEL_NOT_CONFIGURED");
  }
  const r = await mailbox(ctx.tx, c);
  await writeSecret(ctx.tx, ctx.deps, c, (r?.version ?? 0) + 1);
  await channelAudit(ctx.tx, { companyId: c,
    at: ctx.deps.now().toISOString(), actorUserId: ctx.user!.id,
    action: "inbound.address-rotated", entityType: "company", entityId: c,
    data: {} });
  return getInboundSettings(ctx);
}
