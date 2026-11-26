import { describe, expect, it } from "vitest";
import {
  buildDemoCompany,
  connectPage,
  connectPages,
  holidays,
  type DemoCompany,
} from "../src/index";
import { BANNED_WORDS, SEEDS, asText } from "./wpd-scan";

const each = (fn: (c: DemoCompany) => void) =>
  SEEDS.forEach((s) => fn(buildDemoCompany(s)));

describe("WPE connections (S32 to S34)", () => {
  it("three pages, each says nothing is connected", () => each((c) => {
    const p = connectPages(c);
    expect(p.map((x) => x.id)).toEqual(["whatsapp", "email-in",
      "calendar"]);
    for (const x of p) expect(x.notice).toMatch(/Nothing is connected/);
  }));

  it("every switch starts Off and every choice is a listed value", () =>
    each((c) => {
      for (const p of connectPages(c)) {
        const keys = p.groups.flatMap((g) => g.items);
        expect(new Set(keys.map((k) => k.key)).size).toBe(keys.length);
        for (const k of keys) {
          if (k.choices !== null) expect(k.choices).toContain(k.value);
        }
        for (const k of keys.filter((x) => /switch$/.test(x.key))) {
          expect(k.value).toBe("Off");
        }
      }
    }));

  it("the pay run is never answered by message", () => each((c) => {
    const wa = connectPage(c, "whatsapp").groups.flatMap((g) => g.items);
    const run = wa.find((k) => k.key === "wa:pay-run")!;
    expect(run.choices).toBeNull();
    expect(run.value).toBe("On screen only");
  }));

  it("calendar counts come from the records", () => each((c) => {
    const cal = connectPage(c, "calendar").groups[0]!.items;
    const hol = cal.find((k) => k.key === "cal:holidays")!;
    const n = holidays(c).filter((h) => h.state === "upcoming").length;
    expect(hol.help).toContain(`${n} event`);
  }));

  it("sample messages use real people; addresses are .test; masked", () =>
    each((c) => {
      const t = asText(connectPages(c));
      expect(t).toMatch(/Bank letter from /);
      expect(t).not.toMatch(/https?:\/\/[^ ]*\.(com|ae|org)\b/);
      expect(t).toMatch(/\*{8}/);
    }));

  it("no banned word, no raw date", () => each((c) => {
    const t = asText(connectPages(c));
    expect(t).not.toMatch(BANNED_WORDS);
    expect(t).not.toMatch(/\b\d{4}-\d{2}-\d{2}\b/);
    expect(t).not.toMatch(/compliant|guarantee/i);
  }));
});
