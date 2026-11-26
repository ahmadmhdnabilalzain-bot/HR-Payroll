import { describe, expect, it } from "vitest";
import {
  NotificationPrefs,
  PREF_DEFAULTS,
  QuietHours,
  TEMPLATE_TERMS,
  TEMPLATES,
} from "../src/index";

const holes = (s: string) =>
  [...s.matchAll(/\{([a-zA-Z]+)\}/g)].map((m) => m[1]).sort();

describe("TEMPLATES", () => {
  it("placeholders equal the declared vars in every copy", () => {
    for (const [kind, t] of Object.entries(TEMPLATES)) {
      const vars = Object.keys(t.vars).sort();
      for (const text of [t.en.subject + t.en.body,
        t.ar.subject + t.ar.body]) {
        expect([...new Set(holes(text))], kind).toEqual(vars);
      }
    }
  });
  it("no Arabic copy is marked reviewed", () => {
    for (const t of Object.values(TEMPLATES)) {
      expect(t.arReviewed).toBe(false);
    }
  });
  it("every term prefix names existing terms", () => {
    const keys = Object.keys(TEMPLATE_TERMS);
    for (const t of Object.values(TEMPLATES)) {
      for (const v of Object.values(t.vars)) {
        if (v.kind !== "term") continue;
        expect(keys.some((k) => k.startsWith(v.prefix)), v.prefix)
          .toBe(true);
      }
    }
  });
  it("English copy has no digit except the code's expiry", () => {
    for (const [kind, t] of Object.entries(TEMPLATES)) {
      const text = t.en.subject + t.en.body;
      const digits = text.match(/\d+/g) ?? [];
      expect(digits, kind).toEqual(kind === "channel-verify-code"
        ? ["10"] : []);
    }
  });
});

describe("preferences", () => {
  it("quiet hours need different start and end", () => {
    const r = QuietHours.safeParse({ enabled: true, start: "22:00",
      end: "22:00" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(["end"]);
  });
  it("PREF_DEFAULTS parses", () => {
    expect(NotificationPrefs.safeParse(PREF_DEFAULTS).success).toBe(true);
    expect(PREF_DEFAULTS.kinds["approval-pending"]).toEqual(
      { email: true, whatsapp: false });
  });
});
