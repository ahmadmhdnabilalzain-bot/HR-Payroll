import { createHmac, timingSafeEqual } from "node:crypto";
import type { WaInboundEvent, WhatsAppInbound } from "../channels/ports";

// UNVERIFIED: Meta webhook signature header (X-Hub-Signature-256:
// sha256=<hex>) and payload shape (entry[].changes[].value.messages[]),
// from general knowledge; the research READ neither. One file.

const SIG = /^sha256=([0-9a-f]{64})$/;

function sameText(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

type Msg = { id?: unknown; from?: unknown; type?: unknown;
  button?: { payload?: unknown }; text?: { body?: unknown };
  interactive?: { button_reply?: { id?: unknown } } };

function eventOf(m: Msg): WaInboundEvent | null {
  if (typeof m.id !== "string" || m.id.length > 200) return null;
  const from = typeof m.from === "string" && /^\d{8,15}$/.test(m.from)
    ? `+${m.from}` : null;
  const payload = m.button?.payload ?? m.interactive?.button_reply?.id;
  if (from !== null && typeof payload === "string") {
    return { kind: "button", messageId: m.id, fromE164: from, payload };
  }
  if (from !== null && typeof m.text?.body === "string") {
    return { kind: "text", messageId: m.id, fromE164: from,
      text: m.text.body };
  }
  return { kind: "other", messageId: m.id };
}

function messages(json: unknown): Msg[] {
  const entries = (json as { entry?: unknown })?.entry;
  if (!Array.isArray(entries)) return [];
  return entries.flatMap((e: { changes?: unknown }) =>
    Array.isArray(e?.changes) ? e.changes : [])
    .flatMap((c: { value?: { messages?: unknown } }) =>
      Array.isArray(c?.value?.messages) ? c.value.messages : []);
}

export function metaWhatsAppInbound(cfg: { appSecret: string;
  verifyToken: string }): WhatsAppInbound {
  return {
    configured: true,
    verifySignature(rawBody, header) {
      const m = SIG.exec(header ?? "");
      if (m === null) return false;
      const want = createHmac("sha256", cfg.appSecret)
        .update(rawBody, "utf8").digest("hex");
      return sameText(m[1]!, want);
    },
    challenge(q) {
      const ok = q["hub.mode"] === "subscribe" &&
        sameText(q["hub.verify_token"] ?? "", cfg.verifyToken);
      return ok ? q["hub.challenge"] ?? null : null;
    },
    parse: (json) => messages(json).map(eventOf)
      .filter((e): e is WaInboundEvent => e !== null),
  };
}
