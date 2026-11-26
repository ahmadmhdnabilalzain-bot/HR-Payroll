import { jsonField, outcomeOf, transportFailure } from "./outcome";
import type { EmailSender, HttpClient } from "./ports";

// UNVERIFIED: Postmark send API shape (endpoint, header and field
// names); the research READ only the inbound webhook. One file.
const ENDPOINT = "https://api.postmarkapp.com/email";

export function postmarkEmailSender(http: HttpClient, cfg: { token: string;
  from: string }): EmailSender {
  return { configured: true, async send(m) {
    try {
      const res = await http.send({ method: "POST", url: ENDPOINT,
        timeoutMs: 10_000, headers: { Accept: "application/json",
          "Content-Type": "application/json",
          "X-Postmark-Server-Token": cfg.token },
        body: JSON.stringify({ From: cfg.from, To: m.to,
          Subject: m.subject, TextBody: m.text,
          MessageStream: "outbound" }) });
      return outcomeOf(res, jsonField(res.body, (j) => j.MessageID));
    } catch (e) {
      return transportFailure(e);
    }
  } };
}
