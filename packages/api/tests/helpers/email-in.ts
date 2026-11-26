import { seedCompany, type Seeded } from "./seed";
import { call, makeApp } from "./test-app";

export type Ctx = Awaited<ReturnType<typeof makeApp>>;
export const INBOUND_BASIC = "hook:test-inbound-secret";
export const INBOUND_DOMAIN = "in.test.example";
export const SARA = "sara@acme.test";

export const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a,
  0x0a, 1, 2, 3, 4]);
export const PDF = new Uint8Array([...Buffer.from("%PDF-1.4\n"), 1, 2]);
export const HTML = new Uint8Array(Buffer.from("<html><script>x</script>"));

export interface Att { name: string; type: string; bytes: Uint8Array }

/** A Postmark-shaped inbound payload (names UNVERIFIED, see adapter). */
export function postmarkPayload(o: { from: string; hash: string;
  id?: string; spf?: string; dkim?: string; dmarc?: string;
  domain?: string; subject?: string; atts?: Att[] }) {
  const domain = o.domain ?? o.from.split("@")[1];
  return { MessageID: o.id ?? "msg-1", From: o.from,
    FromFull: { Email: o.from, Name: "" }, MailboxHash: o.hash,
    Subject: o.subject ?? "Taxi receipt", TextBody: "See attached.",
    Headers: [{ Name: "Authentication-Results", Value: `mx.test; spf=${
      o.spf ?? "pass"} smtp.mailfrom=${domain}; dkim=${o.dkim ?? "pass"} ` +
      `header.d=${domain}; dmarc=${o.dmarc ?? "none"}` }],
    Attachments: (o.atts ?? []).map((a) => ({ Name: a.name,
      ContentType: a.type, Content: Buffer.from(a.bytes)
        .toString("base64"), ContentLength: a.bytes.length })) };
}

export async function postInbound(ctx: Ctx, payload: unknown,
  basic = INBOUND_BASIC, raw?: string) {
  const r = await ctx.app.request("/v1/hooks/email/postmark", {
    method: "POST", headers: { "content-type": "application/json",
      authorization: `Basic ${Buffer.from(basic).toString("base64")}` },
    body: raw ?? JSON.stringify(payload) });
  return { status: r.status, text: await r.text() };
}

/** One received item (with a kept PNG) in a seeded company. */
export async function inboundItemFor(ctx: Ctx, s: Seeded)
  : Promise<string> {
  const cur = await call(ctx.app, s.hr.token, s.companyId, "GET",
    "/v1/inbound/settings");
  const put = await call(ctx.app, s.owner.token, s.companyId, "PUT",
    "/v1/inbound/settings", { enabled: true, allowlist: ["@vendor.test"],
      acknowledgedProcessing: true, expectedVersion: cur.body.version });
  await postInbound(ctx, postmarkPayload({ from: "ap@vendor.test",
    hash: hashOf(put.body.address), atts: [{ name: "r.png",
      type: "image/png", bytes: PNG }] }));
  const items = await call(ctx.app, s.hr.token, s.companyId, "GET",
    "/v1/inbound/items");
  return items.body.items[0].id as string;
}

/** The mailbox hash in a company's address. */
export const hashOf = (address: string) =>
  address.slice(3, address.indexOf("@"));

export interface InWorld { ctx: Ctx; s: Seeded; hash: string;
  items(): Promise<any[]> }

/** Inbound enabled; employee "report" has the email SARA. */
export async function inWorld(name: string, ctx?: Ctx): Promise<InWorld> {
  const c = ctx ?? await makeApp();
  const s = await seedCompany(c, name);
  await call(c.app, s.hr.token, s.companyId, "PATCH",
    `/v1/employees/${s.emp.report}`, { email: SARA });
  const cur = await call(c.app, s.hr.token, s.companyId, "GET",
    "/v1/inbound/settings");
  const put = await call(c.app, s.owner.token, s.companyId, "PUT",
    "/v1/inbound/settings", { enabled: true, allowlist: ["@vendor.test"],
      acknowledgedProcessing: true, expectedVersion: cur.body.version });
  if (put.status !== 200) throw new Error(`inbound ${put.text}`);
  return { ctx: c, s, hash: hashOf(put.body.address),
    items: async () => (await call(c.app, s.hr.token, s.companyId, "GET",
      "/v1/inbound/items")).body.items };
}
