import { describe, expect, it } from "vitest";
import {
  askPolicies,
  AS_OF,
  policyById,
  policyLibrary,
  POLICY_NOTE,
} from "../src/index";
import { asText, BANNED_WORDS } from "./wpd-scan";

const top = (q: string) => askPolicies(q).hits[0];

describe("WPE policy library", () => {
  it("has the eight policies, each with numbered sections", () => {
    const lib = policyLibrary();
    expect(lib.map((p) => p.id)).toEqual(["leave", "overtime", "expenses",
      "probation", "notice", "eos", "conduct", "hiring"]);
    for (const p of lib) {
      expect(p.sections.length).toBeGreaterThanOrEqual(4);
      expect(p.reviewed < AS_OF).toBe(true);
      expect(p.version).toMatch(/^\d+\.\d+$/);
      const ids = p.sections.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const s of p.sections) expect(s.number).toMatch(/^\d+\.\d+$/);
    }
  });
  it("is the same on every call and holds no pay figure or authority"
    + " claim", () => {
    expect(policyLibrary()).toEqual(policyLibrary());
    const text = asText(policyLibrary()) + POLICY_NOTE;
    expect(text).not.toMatch(BANNED_WORDS);
    expect(text).not.toMatch(/\bAED\b|\d{1,3},\d{3}|complian/i);
    expect(text).not.toMatch(/certified|certification/i);
    expect(text).not.toMatch(/Zarqan|Keka/);
  });
  it("owners are job titles and notes say as we read it", () => {
    for (const p of policyLibrary()) {
      expect(p.owner).not.toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
      for (const s of p.sections) {
        if (s.note !== null) expect(s.note).toMatch(/^As we read it/);
      }
    }
  });
  it("finds the section that answers, and quotes it", () => {
    expect(top("How do I report sick?")?.citation)
      .toBe("Leave policy, section 3.2");
    expect(top("how long is probation")?.citation)
      .toBe("Probation policy, section 1.1");
    expect(top("I want to resign, how much notice")?.policyId)
      .toBe("notice");
    expect(top("when is my gratuity paid")?.policyId).toBe("eos");
    expect(top("can I claim a receipt for a client meal")?.policyId)
      .toBe("expenses");
    const hit = top("how are overtime hours recorded")!;
    expect(policyById(hit.policyId)!.sections
      .find((s) => s.id === hit.sectionId)!.text).toBe(hit.quote);
  });
  it("says nothing when the policies do not cover it", () => {
    for (const q of ["", "   ", "what is the capital of France",
      "can I bring my dog on Fridays", "the", "?!"]) {
      const a = askPolicies(q);
      expect(a.covered).toBe(false);
      expect(a.hits).toEqual([]);
    }
  });
  it("is deterministic, ranks best first and returns three at most", () => {
    const a = askPolicies("leave notice overtime expenses");
    expect(a).toEqual(askPolicies("leave notice overtime expenses"));
    expect(a.hits.length).toBeLessThanOrEqual(3);
    const scores = a.hits.map((h) => h.score);
    expect([...scores].sort((x, y) => y - x)).toEqual(scores);
  });
  it("policyById returns null for an unknown id", () => {
    expect(policyById("nope")).toBeNull();
  });
});
