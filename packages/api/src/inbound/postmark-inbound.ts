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

/**
 * From every Authentication-Results header: the first spf=, dkim= and
 * dmarc= token wins (case-insensitive); else Received-SPF gives spf;
 * missing gives "none"; unrecognised words give "unknown".
 */
export function readAuthHeaders(headers: { Name: string; Value: string }[])
  : Auth {
  const results = headers.filter((h) =>
    h.Name.toLowerCase() === "authentication-results").map((h) => h.Value);
  const find = (kind: string) => {
    for (const r of results) {
      const m = new RegExp(`\\b${kind}=([a-z]+)`, "i").exec(r);
      if (m !== null) return m[1];
    }
    return undefined;
  };
  const all = results.join(";");
  const rspf = headers.find((h) => h.Name.toLowerCase() === "received-spf")
    ?.Value.trim().split(/\s/)[0];
  return { spf: verdict(find("spf") ?? rspf), dkim: verdict(find("dkim")),
    dmarc: verdict(find("dmarc")),
    spfDomain: domainAfter(all, /smtp\.mailfrom=([^\s;]+)/i),
    dkimDomain: domainAfter(all, /header\.d=([^\s;]+)/i) };
}

function sameText(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function postmarkInbound(cfg: { basicAuth: string })
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
        auth: readAuthHeaders(d.Headers),
        attachments: d.Attachments.map((a) => ({ name: a.Name,
          contentType: a.ContentType,
          bytes: new Uint8Array(Buffer.from(a.Content, "base64")) })) };
    },
  };
}
