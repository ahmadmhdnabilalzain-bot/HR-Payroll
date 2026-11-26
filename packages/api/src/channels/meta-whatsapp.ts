import {
  jsonField,
  outcomeOf,
  transportFailure,
} from "./outcome";
import type {
  HttpClient,
  SendOutcome,
  WaTemplateMessage,
  WhatsAppSender,
} from "./ports";

// UNVERIFIED: Meta Cloud API message shape (URL, body and response
// fields); the research READ pricing and template rules only.
interface MetaCfg {
  graphVersion: string;
  phoneNumberId: string;
  accessToken: string;
}

function templateBody(m: WaTemplateMessage) {
  const components: unknown[] = [{ type: "body", parameters:
    m.bodyParams.map((text) => ({ type: "text", text })) }];
  m.buttonPayloads.forEach((payload, index) => components.push({
    type: "button", sub_type: "quick_reply", index: String(index),
    parameters: [{ type: "payload", payload }] }));
  return { messaging_product: "whatsapp", to: m.toE164.replace(/^\+/, ""),
    type: "template", template: { name: m.templateName,
      language: { code: m.language }, components } };
}

export function metaWhatsAppSender(http: HttpClient, cfg: MetaCfg)
  : WhatsAppSender {
  const url = `https://graph.facebook.com/${cfg.graphVersion}/` +
    `${cfg.phoneNumberId}/messages`;
  const post = async (body: unknown): Promise<SendOutcome> => {
    try {
      const res = await http.send({ method: "POST", url, timeoutMs: 10_000,
        headers: { Authorization: `Bearer ${cfg.accessToken}`,
          "Content-Type": "application/json" },
        body: JSON.stringify(body) });
      return outcomeOf(res, jsonField(res.body, (j) => j.messages?.[0]?.id));
    } catch (e) {
      return transportFailure(e);
    }
  };
  return { configured: true,
    sendTemplate: (m) => post(templateBody(m)),
    sendText: (m) => post({ messaging_product: "whatsapp",
      to: m.toE164.replace(/^\+/, ""), type: "text",
      text: { body: m.text } }) };
}
