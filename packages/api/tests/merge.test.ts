import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  mergeTemplate,
  placeholders,
  segmentsText,
  validateTemplateBody,
} from "../src/letters/merge";
import { STARTERS_EN } from "../src/letters/starters";

const body = (...paragraphs: string[]) => ({ title: "T", paragraphs });
const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return { code: (e as { code?: string }).code,
      detail: (e as { detail?: unknown }).detail };
  }
  return null;
};

describe("placeholders and validation", () => {
  it("finds sorted unique keys", () => {
    expect(placeholders("Hi {{employee.fullName}} {{ company.name }} " +
      "{{employee.fullName}}")).toEqual(["company.name",
      "employee.fullName"]);
  });
  it("refuses unknown and malformed placeholders", () => {
    expect(codeOf(() => validateTemplateBody(body(
      "{{employee.salaryBank}}")))).toEqual({ code: "UNKNOWN_MERGE_FIELD",
      detail: { fields: ["employee.salaryBank"] } });
    for (const bad of ["{{employee}}", "{{ employee.fullName",
      "a {{ b }} c", "{{employee.full-name}}"]) {
      expect(codeOf(() => validateTemplateBody(body(bad)))?.code, bad)
        .toBe("MALFORMED_PLACEHOLDER");
    }
  });
  it("knows which starters use salary", () => {
    expect(validateTemplateBody(STARTERS_EN["salary-certificate"].body)
      .usesSalary).toBe(true);
    expect(validateTemplateBody(STARTERS_EN.warning.body).usesSalary)
      .toBe(false);
  });
});

describe("mergeTemplate", () => {
  const values = { "employee.fullName": "Asha", "company.name": "Acme",
    "employee.joiningDate": "2019-01-01" };
  it("reports every missing value at once, sorted", () => {
    expect(codeOf(() => mergeTemplate(body("{{input.reason}} " +
      "{{input.addressee}} {{employee.fullName}}"), values))).toEqual({
      code: "MERGE_VALUE_MISSING",
      detail: { fields: ["input.addressee", "input.reason"] } });
    expect(codeOf(() => mergeTemplate(body("{{input.reason}}"),
      { "input.reason": "   " }))?.code).toBe("MERGE_VALUE_MISSING");
  });
  it("isolates dates and money, not text", () => {
    const m = mergeTemplate(body("{{employee.fullName}} since " +
      "{{employee.joiningDate}}."), values);
    expect(m.paragraphs[0]).toEqual([
      { text: "Asha", isolate: false }, { text: " since ", isolate: false },
      { text: "2019-01-01", isolate: true }, { text: ".", isolate: false }]);
  });
  it("merge_is_single_pass (Review Focus 4)", () => {
    const m = mergeTemplate(body("Reason: {{input.reason}}"),
      { "input.reason": "see {{salary.basic}}", "salary.basic": "AED 9" });
    const text = segmentsText(m.paragraphs[0]!);
    expect(text).toBe("Reason: see {{salary.basic}}");
    expect(text).not.toContain("AED 9");
  });
  it("values without {{ never produce {{", () => {
    fc.assert(fc.property(fc.string().filter((s) => !s.includes("{")),
      (v) => {
        const m = mergeTemplate(body("{{input.reason}} and " +
          "{{input.purpose}}"), { "input.reason": v.trim() || "x",
          "input.purpose": `${v}!` });
        expect(segmentsText(m.paragraphs[0]!)).not.toContain("{{");
      }));
  });
});
