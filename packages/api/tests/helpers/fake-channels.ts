import { notConfiguredPorts } from "../../src/channels/not-configured";
import { metaWhatsAppInbound } from "../../src/whatsapp/meta-inbound";
import { postmarkInbound } from "../../src/inbound/postmark-inbound";
import { fakeOidc } from "./fake-oidc";
import type {
  ChannelPorts,
  EmailMessage,
  HttpRequest,
  HttpResponse,
  SendOutcome,
  WaTemplateMessage,
  WaTextMessage,
} from "../../src/channels/ports";

export interface FakeOpts {
  email: boolean;
  whatsapp: boolean;
  whatsappInbound: boolean;
  inboundEmail: boolean;
  oidc: boolean;
}

/** The fake provider's webhook secret and verify token (tests only). */
export const WA_APP_SECRET = "test-app-secret";
export const WA_VERIFY_TOKEN = "test-verify-token";

export const FAKE_API_BASE = "https://api.test.example";
export const FAKE_APP_BASE = "https://app.test.example";

export type WaSent = (WaTemplateMessage | WaTextMessage) & { at: number };

/** Records requests; answers from a script (default: 200 empty). */
export interface FakeHttp {
  requests: HttpRequest[];
  script: ((r: HttpRequest) => HttpResponse | Error)[];
}

export interface FakeChannels {
  ports: ChannelPorts;
  outbox: { email: EmailMessage[]; whatsapp: WaSent[] };
  failNext(channel: "email" | "whatsapp", outcome: SendOutcome): void;
  http: FakeHttp;
  dns: Map<string, string[]>;
  /** TXT records by name (review I4). */
  txt: Map<string, string[]>;
}

type Queue = Record<"email" | "whatsapp", SendOutcome[]>;

function outcome(q: Queue, ch: "email" | "whatsapp", n: number)
  : SendOutcome {
  return q[ch].shift() ?? { status: "sent",
    providerMessageId: `${ch}-${n}` };
}

function fakeHttp(): FakeHttp & { send: (r: HttpRequest) =>
  Promise<HttpResponse> } {
  const h: FakeHttp & { send: (r: HttpRequest) => Promise<HttpResponse> } =
    { requests: [], script: [], async send(r) {
      h.requests.push(r);
      const next = h.script.shift();
      const res = next === undefined
        ? { status: 200, headers: {}, body: "" } : next(r);
      if (res instanceof Error) throw res;
      return res;
    } };
  return h;
}

/** Every port as an in-memory fake; configured unless `opts` says. */
export function fakeChannels(opts: Partial<FakeOpts> = {}): FakeChannels {
  const o: FakeOpts = { email: true, whatsapp: true,
    whatsappInbound: true, inboundEmail: true, oidc: true, ...opts };
  const outbox: FakeChannels["outbox"] = { email: [], whatsapp: [] };
  const queue: Queue = { email: [], whatsapp: [] };
  const dns = new Map<string, string[]>();
  const txt = new Map<string, string[]>();
  const http = fakeHttp();
  const base = notConfiguredPorts({ publicApiBaseUrl: FAKE_API_BASE,
    publicAppBaseUrl: FAKE_APP_BASE });
  const NOT = { status: "not-configured" } as const;
  const wa = async (m: WaTemplateMessage | WaTextMessage) => {
    if (!o.whatsapp) return NOT;
    const r = outcome(queue, "whatsapp", outbox.whatsapp.length + 1);
    if (r.status === "sent") outbox.whatsapp.push({ ...m, at: Date.now() });
    return r;
  };
  const ports: ChannelPorts = { ...base, http,
    email: { configured: o.email, async send(m) {
      if (!o.email) return NOT;
      const r = outcome(queue, "email", outbox.email.length + 1);
      if (r.status === "sent") outbox.email.push(m);
      return r;
    } },
    whatsapp: { configured: o.whatsapp, sendTemplate: wa, sendText: wa },
    whatsappInbound: o.whatsappInbound ? metaWhatsAppInbound({
      appSecret: WA_APP_SECRET, verifyToken: WA_VERIFY_TOKEN })
      : base.whatsappInbound,
    inboundEmail: o.inboundEmail ? postmarkInbound({
      basicAuth: "hook:test-inbound-secret", authservId: "mx.test" })
      : base.inboundEmail,
    inboundEmailDomain: o.inboundEmail ? "in.test.example" : null,
    oidc: o.oidc ? fakeOidc() : base.oidc,
    resolveHost: async (host) => dns.get(host) ?? [],
    resolveTxt: async (name) => txt.get(name) ?? [] };
  return { ports, outbox, http, dns, txt,
    failNext: (ch, out) => queue[ch].push(out) };
}
