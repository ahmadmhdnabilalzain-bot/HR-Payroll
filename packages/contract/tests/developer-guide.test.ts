import { describe, expect, it } from "vitest";
import {
  API_KEY_SCOPES,
  buildDeveloperGuide,
  buildOpenApi,
  EXAMPLE_KEY,
  ROUTES,
  WEBHOOK_EVENT_TYPES,
} from "../src/index";

const g = buildDeveloperGuide("https://api.example.com");
const text = JSON.stringify(g);

describe("developer guide", () => {
  it("guide_examples_name_real_routes", () => {
    const shell = g.sections.flatMap((s) => s.examples)
      .filter((e) => e.language === "shell");
    for (const e of shell) {
      const method = /-X (POST|PATCH|PUT)/.exec(e.code)?.[1] ?? "GET";
      const path = /https:\/\/api\.example\.com(\/v1\/[^\s']+)/
        .exec(e.code)![1];
      const r = ROUTES.find((x) => x.method === method && x.path === path);
      expect(r, e.label).toBeDefined();
      expect(API_KEY_SCOPES[r!.id], e.label).toBeDefined();
    }
    for (const s of g.scopes) {
      expect(s.routes.map((r) => r.id).sort()).toEqual(Object.entries(
        API_KEY_SCOPES).filter(([, v]) => v === s.scope).map(([k]) => k)
        .sort());
    }
  });
  it("guide_no_real_secrets", () => {
    for (const m of text.match(/hrk_[A-Za-z0-9_]+/g) ?? []) {
      expect(m).toBe(EXAMPLE_KEY);
    }
    for (const m of text.match(/whsec_[A-Za-z0-9_-]+/g) ?? []) {
      expect(m).toBe("whsec_EXAMPLE");
    }
    expect(/\bimport /.test(text)).toBe(false);
  });
  it("guide_webhook_events", () => {
    expect(g.webhookEvents).toEqual([...WEBHOOK_EVENT_TYPES]);
  });
});

describe("OpenAPI additions", () => {
  const doc = buildOpenApi();
  const op = (path: string, m: string) =>
    (doc.paths[path] as Record<string, Record<string, unknown>>)[m]!;
  it("marks key routes and lists webhooks", () => {
    const list = op("/v1/employees", "get");
    expect(list["x-api-key-scope"]).toBe("employees:read");
    expect(list.security).toEqual([{ bearer: [] }, { apiKey: [] }]);
    expect(op("/v1/employees/{id}/bank", "get")["x-api-key-scope"])
      .toBeUndefined();
    expect(Object.keys(doc.webhooks).sort()).toEqual(
      [...WEBHOOK_EVENT_TYPES].sort());
    expect(() => JSON.stringify(doc)).not.toThrow();
  });
});
