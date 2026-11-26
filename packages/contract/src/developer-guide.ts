import type { z } from "zod";
import { API_KEY_SCOPES, ApiScope } from "./api-keys";
import {
  GuideExample,
  type DeveloperGuide,
} from "./developer-guide-schema";
import { ROUTES } from "./routes";
import { WEBHOOK_EVENT_TYPES, WEBHOOK_SIGNATURE_NOTE } from "./webhooks";

export const EXAMPLE_KEY = "hrk_0123456789abcdef_" + "EXAMPLE".repeat(6) +
  "X";
export const EXAMPLE_COMPANY = "00000000-0000-4000-8000-000000000000";

const H = `-H "Authorization: Bearer ${EXAMPLE_KEY}" ` +
  `-H "X-Company-Id: ${EXAMPLE_COMPANY}"`;

function examples(base: string) {
  return [
    { label: "List employees", language: "shell" as const,
      code: `curl ${H} ${base}/v1/employees` },
    { label: "Request leave", language: "shell" as const,
      code: `curl -X POST ${H} -H "Content-Type: application/json" ` +
        `-d '{"leaveTypeId":"${EXAMPLE_COMPANY}","startDate":` +
        `"2026-04-06","endDate":"2026-04-07"}' ${base}/v1/leave-requests` },
    { label: "Verify a webhook", language: "javascript" as const,
      code: [
        'const { createHmac, timingSafeEqual } = require("node:crypto");',
        "function verify(secret, id, ts, body, header, nowSec) {",
        "  if (Math.abs(nowSec - Number(ts)) > 300) return false;",
        "  const want = Buffer.from(\"v1=\" + createHmac(\"sha256\", secret)",
        "    .update(id + \".\" + ts + \".\" + body).digest(\"hex\"));",
        "  return header.split(\",\").some((v) => {",
        "    const got = Buffer.from(v.trim());",
        "    return got.length === want.length &&",
        "      timingSafeEqual(got, want);",
        "  });",
        "}",
        "// secret looks like whsec_EXAMPLE"].join("\n") },
  ];
}

const P = (id: DeveloperGuide["sections"][number]["id"], title: string,
  paragraphs: string[], ex: z.infer<typeof GuideExample>[] = []) =>
  ({ id, title, paragraphs, examples: ex });

/** Pure: the developer guide as data (the web page renders it). */
export function buildDeveloperGuide(baseUrl: string): DeveloperGuide {
  const scopes = ApiScope.options.map((scope) => ({ scope,
    routes: ROUTES.filter((r) => API_KEY_SCOPES[r.id] === scope)
      .map((r) => ({ id: r.id, method: r.method, path: r.path })) }));
  return { baseUrl, scopes, webhookEvents: [...WEBHOOK_EVENT_TYPES],
    sections: [
      P("auth", "Authentication", ["Send the key as a bearer token and " +
        "X-Company-Id with the key's company. Keys cannot call routes " +
        "that need an authenticator code (MFA), approval routes or " +
        "settings routes."]),
      P("scopes", "Scopes", ["A key reaches only the routes of its " +
        "scopes. Salary, bank and identity fields need payroll:read."]),
      P("rate-limits", "Rate limits", ["Every response carries " +
        "RateLimit-Limit, RateLimit-Remaining and RateLimit-Reset. Over " +
        "the limit the answer is 429 with Retry-After. Limits are " +
        "product defaults (120 per minute unless set), not provider " +
        "limits."]),
      P("errors", "Errors", ["Errors are JSON with a stable code, a " +
        "message and a request id."]),
      P("webhooks", "Webhooks", [WEBHOOK_SIGNATURE_NOTE]),
      P("examples", "Examples", [], examples(baseUrl)),
    ] };
}
