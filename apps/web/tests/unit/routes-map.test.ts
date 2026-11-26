import { describe, expect, it } from "vitest";
import { ROUTES } from "../../src/api/contract";
import { CLIENT_ROUTES } from "../../src/api/routes-map";

describe("routes map", () => {
  it("every-method-has-a-route", () => {
    const known = new Set(ROUTES.map((r) => `${r.method} ${r.path}`));
    const missing = Object.entries(CLIENT_ROUTES)
      .filter(([, r]) => !known.has(`${r.method} ${r.path}`))
      .map(([k]) => k);
    expect(missing).toEqual([]);
    expect(Object.keys(CLIENT_ROUTES).length).toBe(34);
  });

  it("no-route-mapped-twice", () => {
    const ids = Object.values(CLIENT_ROUTES).map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
