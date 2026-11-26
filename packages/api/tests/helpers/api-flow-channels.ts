import { dispatchDue } from "../../src/channels/dispatch";
import { withTenant } from "../../src/db/tenant";
import type { Hitter } from "./api-flow";
import { waBody } from "./wa-world";
import type { FakeOidc } from "./fake-oidc";
import { call } from "./test-app";
import {
  hashOf,
  INBOUND_BASIC,
  PNG,
  postmarkPayload,
} from "./email-in";
import type { makeApp } from "./test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;

export interface FlowUsers {
  /** Owner with an MFA session. */
  owner: string;
  /** A second owner with an MFA session. */
  owner2: string;
  /** An employee user linked to `empId`. */
  emp: string;
  empId: string;
  company: string;
}

/** One happy-path call per Plan 13 route (each task appends). */
export async function channelFlow(_ctx: Ctx, hit: Hitter, u: FlowUsers)
  : Promise<void> {
  const c = u.company;
  const s = await hit("getChannelSettings", u.owner, c);
  await hit("putChannelSettings", u.owner, c, {}, { ...settingsBody(s.body),
    emailEnabled: true, expectedVersion: s.body.version });
  await notifications(hit, u);
  await optInFlow(_ctx, hit, u);
  await waHookFlow(hit);
  await inboundFlow(hit, u);
  await calendarFlow(hit, u);
  await ssoFlow(_ctx, hit, u);
  await webhookFlow(_ctx, hit, u);
  await apiKeyFlow(hit, u);
  await hit("getOpenApi", null, null);
  await hit("getDeveloperGuide", null, null);
}

async function apiKeyFlow(hit: Hitter, u: FlowUsers) {
  const c = u.company;
  const k = await hit("createApiKey", u.owner, c, {}, { name: "Sync",
    scopes: ["employees:read"] });
  await hit("listApiKeys", u.owner, c);
  await hit("updateApiKey", u.owner, c, { id: k.body.key.id },
    { rateLimitPerMinute: 60 });
  await hit("rotateApiKey", u.owner, c, { id: k.body.key.id },
    { graceHours: 0 });
  await hit("revokeApiKey", u.owner, c, { id: k.body.key.id });
}

async function webhookFlow(ctx: Ctx, hit: Hitter, u: FlowUsers) {
  const c = u.company;
  ctx.fakes.dns.set("hooks.example.com", ["93.184.216.34"]);
  const ep = await hit("createWebhookEndpoint", u.owner, c, {}, {
    url: "https://hooks.example.com/x", events: ["employee.created"] });
  await hit("listWebhookEndpoints", u.owner, c);
  await hit("updateWebhookEndpoint", u.owner, c, { id: ep.body.id },
    { description: "ops" });
  await hit("rotateWebhookSecret", u.owner, c, { id: ep.body.id },
    { graceHours: 1 });
  const t = await hit("testWebhookEndpoint", u.owner, c,
    { id: ep.body.id });
  await hit("listWebhookDeliveries", u.owner, c);
  await hit("redeliverWebhook", u.owner, c, { id: t.body.id });
}

async function ssoFlow(ctx: Ctx, hit: Hitter, u: FlowUsers) {
  const c = u.company;
  const s = await hit("getSsoSettings", u.owner, c);
  await hit("putSsoSettings", u.owner, c, {}, { allowedDomains: [],
    googleHostedDomains: [], microsoftTenantIds: [], jitEmployees: false,
    enforceSso: false, expectedVersion: s.body.version });
  const oidc = ctx.deps.channels.oidc as FakeOidc;
  await hit("ssoLinkStart", u.owner, null, { provider: "google" });
  const code = (st: { nonce: string }) => {
    const now = Math.floor(ctx.clock.now.getTime() / 1000);
    oidc.codes.set("flow", oidc.issuer.idToken({ sub: "flow-1",
      iss: "https://accounts.google.com", aud: "client-google",
      nonce: st.nonce, exp: now + 600, iat: now }));
    return "flow";
  };
  const linkSt = oidc.starts.at(-1)!;
  await call(ctx.app, u.owner, null, "POST",
    "/v1/auth/sso/google/callback", { code: code(linkSt),
      state: linkSt.state });
  await hit("ssoStart", null, null, { provider: "google" },
    { intent: "login" });
  const st = oidc.starts.at(-1)!;
  await hit("ssoCallback", null, null, { provider: "google" },
    { code: code(st), state: st.state });
  const ids = await hit("listSsoIdentities", u.owner, null);
  await hit("unlinkSsoIdentity", u.owner, null,
    { id: ids.body.items[0].id });
}

async function calendarFlow(hit: Hitter, u: FlowUsers) {
  const c = u.company;
  const f = await hit("createCalendarFeed", u.emp, c, {}, { scope: "my" });
  await hit("listCalendarFeeds", u.emp, c);
  const token = String(f.body.url).split("/v1/calendar/")[1]!;
  await hit("getCalendarFeed", null, null, { token });
  await hit("revokeCalendarFeed", u.emp, c, { id: f.body.id });
}

async function inboundFlow(hit: Hitter, u: FlowUsers) {
  const c = u.company;
  const cur = await hit("getInboundSettings", u.owner, c);
  await hit("putInboundSettings", u.owner, c, {}, {
    enabled: true, allowlist: ["@vendor.test"],
    acknowledgedProcessing: true, expectedVersion: cur.body.version });
  const rot = await hit("rotateInboundAddress", u.owner, c);
  const pay = postmarkPayload({ from: "ap@vendor.test",
    hash: hashOf(rot.body.address), atts: [{ name: "r.png",
      type: "image/png", bytes: PNG }, { name: "s.png", type: "image/png",
      bytes: PNG }] });
  const basic = `Basic ${Buffer.from(INBOUND_BASIC).toString("base64")}`;
  await hit("inboundEmailHook", null, null, { provider: "postmark" }, pay,
    { headers: { authorization: basic } });
  await hit("inboundEmailHook", null, null, { provider: "postmark" },
    { ...pay, MessageID: "msg-2" }, { headers: { authorization: basic } });
  const list = await hit("listInboundItems", u.owner, c);
  const [a, b] = list.body.items.map((x: { id: string }) => x.id);
  await hit("getInboundItem", u.owner, c, { id: a });
  await hit("downloadInboundAttachment", u.owner, c, { id: a,
    index: "0" });
  await hit("acceptInboundItem", u.owner, c, { id: a }, { as: "receipt",
    employeeId: u.empId, attachmentIndexes: [0] });
  await hit("dismissInboundItem", u.owner, c, { id: b },
    { reason: "duplicate" });
}

async function waHookFlow(hit: Hitter) {
  await hit("whatsAppHookVerify", null, null, {}, undefined, { query:
    "?hub.mode=subscribe&hub.verify_token=test-verify-token" +
    "&hub.challenge=ch-42" });
  // The body is re-serialised by `call` to the same text it was signed as.
  const { body, sig } = waBody([{ id: "flow-1", from: "+971500000099",
    text: "hello" }]);
  await hit("whatsAppHook", null, null, {}, JSON.parse(body), {
    headers: { "x-hub-signature-256": sig } });
}

async function optInFlow(ctx: Ctx, hit: Hitter, u: FlowUsers) {
  const c = u.company;
  const s = await hit("getChannelSettings", u.owner, c);
  await hit("putChannelSettings", u.owner, c, {}, { ...settingsBody(s.body),
    whatsappEnabled: true, expectedVersion: s.body.version });
  await hit("getMyChannels", u.emp, c);
  await hit("startWhatsAppOptIn", u.emp, c, {}, { phone: "+971500000077",
    consentVersion: 1, agreed: true });
  await dispatchDue((t, fn) => withTenant(ctx.deps.db, t, fn), ctx.deps);
  const sent = ctx.fakes.outbox.whatsapp.at(-1) as { bodyParams: string[] };
  await hit("verifyWhatsAppOptIn", u.emp, c, {},
    { code: sent.bodyParams[0] });
  await hit("withdrawWhatsAppOptIn", u.emp, c);
}

async function notifications(hit: Hitter, u: FlowUsers) {
  const c = u.company;
  await hit("listNotifications", u.emp, c);
  await hit("markNotificationsRead", u.emp, c, {}, { all: true });
  const p = await hit("getNotificationPrefs", u.emp, c);
  const { note: _n, ...prefs } = p.body;
  await hit("putNotificationPrefs", u.emp, c, {}, prefs);
  await hit("listNotificationDeliveries", u.owner, c);
  await hit("listNotificationTemplates", u.owner, c);
}

function settingsBody(b: Record<string, unknown>) {
  return { whatsappEnabled: b.whatsappEnabled,
    whatsappApprovals: b.whatsappApprovals,
    whatsappDailyCap: b.whatsappDailyCap,
    whatsappHourlyPerUser: b.whatsappHourlyPerUser,
    emailEnabled: b.emailEnabled };
}
