import { describe, expect, it } from "vitest";
import { metaWhatsAppSender } from "../src/channels/meta-whatsapp";
import { HttpFailure } from "../src/channels/ports";
import { postmarkEmailSender } from "../src/channels/postmark-email";
import { buildChannelPorts } from "../src/channels/wire";
import { loadConfig } from "../src/config";
import { fakeChannels } from "./helpers/fake-channels";

const msg = { to: "a@b.test", subject: "Hi", text: "Body",
  idempotencyKey: "k-1" };
const reply = (status: number, body: unknown) => () =>
  ({ status, headers: {}, body: JSON.stringify(body) });

describe("provider adapters (fake HTTP only)", () => {
  it("postmark_request_shape", async () => {
    const f = fakeChannels();
    const s = postmarkEmailSender(f.ports.http, { token: "tok",
      from: "noreply@x.test" });
    f.http.script.push(reply(200, { MessageID: "m-1" }));
    expect(await s.send(msg)).toEqual({ status: "sent",
      providerMessageId: "m-1" });
    const r = f.http.requests[0]!;
    expect(r.method).toBe("POST");
    expect(r.url).toBe("https://api.postmarkapp.com/email");
    expect(r.headers["X-Postmark-Server-Token"]).toBe("tok");
    expect(JSON.parse(r.body!)).toMatchObject({ To: "a@b.test",
      Subject: "Hi", TextBody: "Body" });
    f.http.script.push(reply(422, {}), reply(503, {}),
      () => new HttpFailure("TIMEOUT"));
    expect(await s.send(msg)).toMatchObject({ retryable: false,
      code: "HTTP_422" });
    expect(await s.send(msg)).toMatchObject({ retryable: true });
    expect(await s.send(msg)).toMatchObject({ retryable: true,
      code: "TIMEOUT" });
  });

  it("meta_request_shape", async () => {
    const f = fakeChannels();
    const s = metaWhatsAppSender(f.ports.http, { graphVersion: "v99.0",
      phoneNumberId: "123", accessToken: "secret-token" });
    f.http.script.push(reply(200, { messages: [{ id: "w-1" }] }));
    const out = await s.sendTemplate({ toE164: "+971500000001",
      templateName: "approval_pending_v1", language: "en",
      bodyParams: ["Sara", "expense claim"], buttonPayloads: ["a", "r"],
      idempotencyKey: "k" });
    expect(out).toEqual({ status: "sent", providerMessageId: "w-1" });
    const r = f.http.requests[0]!;
    expect(r.url).toBe("https://graph.facebook.com/v99.0/123/messages");
    expect(r.headers.Authorization).toBe("Bearer secret-token");
    const body = JSON.parse(r.body!);
    expect(body.type).toBe("template");
    const buttons = body.template.components.filter(
      (c: { sub_type?: string }) => c.sub_type === "quick_reply");
    expect(buttons.length).toBe(2);
  });

  it("wire_not_configured", () => {
    const ports = buildChannelPorts(loadConfig({
      DATABASE_URL: "postgres://x", RECEIPTS_DIR: "/r",
      PAYROLL_MASTER_KEY: Buffer.alloc(32, 1).toString("base64") }));
    expect(ports.email.configured).toBe(false);
    expect(ports.whatsapp.configured).toBe(false);
  });

  it("wire_configured swaps in the real senders", () => {
    const ports = buildChannelPorts(loadConfig({
      DATABASE_URL: "postgres://x", RECEIPTS_DIR: "/r",
      PAYROLL_MASTER_KEY: Buffer.alloc(32, 1).toString("base64"),
      POSTMARK_SERVER_TOKEN: "t", EMAIL_FROM: "n@x.test" }));
    expect(ports.email.configured).toBe(true);
    expect(ports.whatsapp.configured).toBe(false);
  });
});
