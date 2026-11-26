import { describe, expect, it } from "vitest";
import { readConfig } from "../../src/config";
import { mockOptionsFromUrl } from "../../src/api/mock/options";
import { loadPrefs, savePrefs } from "../../src/lib/prefs";

describe("config", () => {
  it("defaults-to-mock", () => {
    expect(readConfig({})).toEqual({ apiMode: "mock", apiBase: "" });
    expect(readConfig({ VITE_API_MODE: "http", VITE_API_BASE: "/api" }))
      .toEqual({ apiMode: "http", apiBase: "/api" });
  });

  it("unknown-mode-throws", () => {
    expect(() => readConfig({ VITE_API_MODE: "live" }))
      .toThrow(/CONFIG_API_MODE/);
  });

  it("mock-options-from-url", () => {
    const o = mockOptionsFromUrl(
      "?mock-fail=listEmployees,getCompany&mock-seed=large" +
      "&mock-latency=0&mock-as=hr@demo.test", "2026-11-26");
    expect([...o.failures]).toEqual(["listEmployees", "getCompany"]);
    expect(o.seed).toBe("large");
    expect(o.latencyMs).toBe(0);
    expect(o.signInAs).toBe("hr@demo.test");
    expect(o.today).toBe("2026-11-26");
  });

  it("mock-options-ignore-junk", () => {
    const o = mockOptionsFromUrl("?mock-fail=notAMethod&mock-seed=x" +
      "&mock-latency=-5", "2026-11-26");
    expect([...o.failures]).toEqual([]);
    expect(o.seed).toBe("demo");
    expect(o.latencyMs).toBeGreaterThan(0);
    expect(o.signInAs).toBeNull();
  });
});

describe("prefs", () => {
  it("round-trip-and-safe", () => {
    savePrefs({ lang: "ar", theme: "dark" });
    expect(loadPrefs()).toEqual({ lang: "ar", theme: "dark" });
    localStorage.setItem("prefs", "{not json");
    expect(loadPrefs()).toEqual({ lang: null, theme: null });
  });
});
