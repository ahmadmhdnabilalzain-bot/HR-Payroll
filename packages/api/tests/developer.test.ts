import { describe, expect, it } from "vitest";
import { FAKE_API_BASE } from "./helpers/fake-channels";
import { call, makeApp } from "./helpers/test-app";

describe("developer surface", () => {
  it("serves OpenAPI and the guide without auth, cached", async () => {
    const ctx = await makeApp();
    const doc = await call(ctx.app, null, null, "GET", "/v1/openapi.json");
    expect(doc.status).toBe(200);
    expect(doc.body.openapi).toBe("3.1.0");
    expect(doc.headers.get("cache-control")).toBe("public, max-age=300");
    const g = await call(ctx.app, null, null, "GET", "/v1/developer/guide");
    expect(g.body.baseUrl).toBe(FAKE_API_BASE);
  });
});
