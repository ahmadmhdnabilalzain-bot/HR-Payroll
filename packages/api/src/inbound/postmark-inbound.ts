import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type {
  AuthVerdictT,
  InboundEmail,
  InboundEmailAdapter,
} from "../channels/ports";
import { ApiError } from "../http/errors";

// The research READ that Postmark's inbound payload has From, Subject,
// TextBody, HtmlBody, base64 attachments, headers with SPF, DKIM and
// spam results, and MailboxHash. UNVERIFIED (general knowledge, one
// file): the exact names FromFull.Email, MessageID, Headers[{Name,
// Value}], Attachments[{Name, Content, ContentType, ContentLength}],
// the Authentication-Results and Received-SPF formats, and Basic
// credentials on the hook URL.

const Payload = z.object({
  MessageID: z.string().min(1).max(500),
  FromFull: z.object({ Email: z.string().min(3).max(254) }),
  MailboxHash: z.string().min(1).max(200),
  Subject: z.string().max(5000).default(""),
  TextBody: z.string().max(2_000_000).default(""),
  Headers: z.array(z.object({ Name: z.string(), Value: z.string() }))
    .max(500).default([]),
  Attachments: z.array(z.object({ Name: z.string().max(255),
    Content: z.string(), ContentType: z.string().max(255) }))
    .max(50).default([]),
});

const VERDICTS: readonly AuthVerdictT[] = ["pass", "fail", "softfail",
  "neutral", "none"];
const verdict = (v: string | undefined): AuthVerdictT => {
  if (v === undefined) return "none";
  const x = v.toLowerCase() as AuthVerdictT;
  return VERDICTS.includes(x) ? x : "unknown";
};

type Auth = InboundEmail["auth"];

function domainAfter(text: string, key: RegExp): string | null {
  const m = key.exec(text);
  if (m === null) return null;
  const v = m[1]!.toLowerCase();
  return v.includes("@") ? v.slice(v.lastIndexOf("@") + 1) : v;
}

const UNVERIFIED: Auth = { spf: "none", dkim: "none", dmarc: "none",
  spfDomain: null, dkimDomain: null };

const topmost = (headers: { Name: string; Value: string }[], name: string) =>
  headers.find((h) => h.Name.toLowerCase() === name)?.Value;

/** The authserv-id: the text before the first `;` (RFC 8601 2.2). */
const servId = (v: string) =>
  v.split(";")[0]!.trim().split(/\s+/)[0]!.toLowerCase();

/**
 * Only results the provider itself added count (security review I1):
 * the topmost Authentication-Results, and only when its authserv-id is
 * the configured one; else the topmost Received-SPF, only when it
 * names that server as `receiver=`. Anything else, or no configured
 * id, is unverified ("none" everywhere: flagged for review, never a
 * pass). Senders can write these headers themselves; the provider
 * adds its own above them (UNVERIFIED for Postmark: the header order
 * and whether it strips inbound headers that claim its id).
 */
export function readAuthHeaders(headers: { Name: string; Value: string }[],
  authservId: string | null): Auth {
  if (authservId === null) return UNVERIFIED;
  const id = authservId.toLowerCase();
  const ar = topmost(headers, "authentication-results");
  if (ar !== undefined && servId(ar) === id) {
    const find = (kind: string) =>
      new RegExp(`\\b${kind}=([a-z]+)`, "i").exec(ar)?.[1];
    return { spf: verdict(find("spf")), dkim: verdict(find("dkim")),
      dmarc: verdict(find("dmarc")),
      spfDomain: domainAfter(ar, /smtp\.mailfrom=([^\s;]+)/i),
      dkimDomain: domainAfter(ar, /header\.d=([^\s;]+)/i) };
  }
  const rspf = topmost(headers, "received-spf");
  const receiver = rspf === undefined ? null
    : /\breceiver=([^\s;]+)/i.exec(rspf)?.[1]?.toLowerCase() ?? null;
  if (ar === undefined && rspf !== undefined && receiver === id) {
    return { ...UNVERIFIED, spf: verdict(rspf.trim().split(/\s/)[0]) };
  }
  return UNVERIFIED;
}

function sameText(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function postmarkInbound(cfg: { basicAuth: string;
  authservId: string | null })
  : InboundEmailAdapter {
  const want = `Basic ${Buffer.from(cfg.basicAuth).toString("base64")}`;
  return {
    configured: true,
    authenticate: (h) => sameText(h ?? "", want),
    parse(json) {
      const p = Payload.safeParse(json);
      if (!p.success) throw new ApiError("INBOUND_PAYLOAD_INVALID");
      const d = p.data;
      return { messageId: d.MessageID, from: d.FromFull.Email,
        mailboxHash: d.MailboxHash, subject: d.Subject, text: d.TextBody,
        auth: readAuthHeaders(d.Headers, cfg.authservId),
        attachments: d.Attachments.map((a) => ({ name: a.Name,
          contentType: a.ContentType,
          bytes: new Uint8Array(Buffer.from(a.Content, "base64")) })) };
    },
  };
}
