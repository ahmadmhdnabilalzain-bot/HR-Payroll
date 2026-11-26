import { describe, expect, it } from "vitest";
import * as documents from "../src/documents";
import * as files from "../src/files";
import * as letters from "../src/letters";
import * as library from "../src/library";
import {
  ACK_STATEMENT,
  Audience,
  DocumentNumber,
  EmiratisationSettingsPut,
  EmployeeDocumentCreate,
  EXAMPLES,
  LETTER_GENERATE_ROLES,
  LeadDays,
  LetterRequest,
  MERGE_FIELDS,
  PREVIEW_WATERMARK,
  RETENTION_NOTICE,
  SCHEMAS,
  TemplateBody,
} from "../src/index";
import { DOCUMENT_EXAMPLES } from "../src/examples-documents";

const F = "00000000-0000-4000-8000-000000000701";

describe("employee documents", () => {
  it("a passport needs an expiry date", () => {
    const r = EmployeeDocumentCreate.safeParse({ type: "passport",
      fileId: F });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(["expiryDate"]);
  });
  it("expiry before issue fails; a contract needs no expiry", () => {
    expect(EmployeeDocumentCreate.safeParse({ type: "passport",
      fileId: F, issueDate: "2026-02-01", expiryDate: "2026-01-01" })
      .success).toBe(false);
    expect(EmployeeDocumentCreate.safeParse({ type: "contract",
      fileId: F }).success).toBe(true);
  });
  it("document numbers are plain", () => {
    expect(DocumentNumber.safeParse("P123/45").success).toBe(true);
    expect(DocumentNumber.safeParse("<b>").success).toBe(false);
  });
  it("lead days are 1 to 6 strictly descending days in 1..365", () => {
    for (const bad of [[30, 60], [30, 30], [], [400]]) {
      expect(LeadDays.safeParse(bad).success, String(bad)).toBe(false);
    }
    expect(LeadDays.safeParse([90, 30, 7]).success).toBe(true);
  });
});

describe("library and letters", () => {
  it("an audience lists at most 1000 employees", () => {
    const ids = Array.from({ length: 1001 }, () => F);
    expect(Audience.safeParse({ allStaff: false, departmentIds: [],
      employeeIds: ids, roles: [] }).success).toBe(false);
  });
  it("a template body has at most 40 paragraphs", () => {
    expect(TemplateBody.safeParse({ title: "T",
      paragraphs: Array.from({ length: 41 }, () => "p") }).success)
      .toBe(false);
  });
  it("letter inputs are input keys only", () => {
    const base = { templateId: F };
    expect(LetterRequest.safeParse({ ...base,
      inputs: { "salary.basic": "1" } }).success).toBe(false);
    expect(LetterRequest.safeParse({ ...base,
      inputs: { "input.purpose": "Bank" } }).success).toBe(true);
  });
  it("merge fields are unique, dotted, and salary fields are money", () => {
    const keys = MERGE_FIELDS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) expect(k).toMatch(/^[a-z]+\.[a-zA-Z]+$/);
    for (const f of MERGE_FIELDS.filter((x) => x.salary)) {
      expect(f.kind, f.key).toBe("money");
    }
  });
  it("salary certificates are owner and hr only", () => {
    expect(LETTER_GENERATE_ROLES["salary-certificate"])
      .toEqual(["owner", "hr"]);
  });
});

describe("fixed wording", () => {
  it("the statements are the exact text", () => {
    expect(ACK_STATEMENT).toBe(
      "I confirm that I received and read this document.");
    expect(RETENTION_NOTICE).toBe("The PDPL text read sets no retention " +
      "periods. Set one per class with your adviser. Nothing is deleted " +
      "automatically.");
    expect(PREVIEW_WATERMARK).toBe("PREVIEW - NOT ISSUED");
  });
  it("no exported string implies a signature or legal effect", () => {
    for (const mod of [files, documents, library, letters]) {
      for (const [k, v] of Object.entries(mod)) {
        if (typeof v === "string") {
          expect(v, k).not.toMatch(/\bsign|binding|compliant/i);
        }
      }
    }
  });
  it("emiratisation overrides refuse other keys", () => {
    expect(EmiratisationSettingsPut.safeParse({ sectorInScope: null,
      overrides: { minWageFils: 1 } }).success).toBe(false);
    expect(EmiratisationSettingsPut.safeParse({ sectorInScope: true,
      overrides: { largeRequiredRounding: "DOWN" } }).success).toBe(true);
  });
  it("every new example parses against its schema", () => {
    for (const [name, value] of Object.entries(DOCUMENT_EXAMPLES)) {
      const r = SCHEMAS[name]!.safeParse(value);
      expect(r.success, `${name}: ${r.error?.message}`).toBe(true);
      expect(EXAMPLES[name]).toBe(value);
    }
  });
});
