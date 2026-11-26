import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LetterKind, MERGE_FIELDS } from "@payroll/contract";
import { describe, expect, it } from "vitest";
import { placeholders } from "../src/letters/merge";
import { STARTERS_EN } from "../src/letters/starters";
import { STARTERS_AR } from "../src/letters/starters-ar";

const strings = (s: { name: string; body: { title: string;
  paragraphs: string[] } }) => [s.name, s.body.title, ...s.body.paragraphs];
const keysOf = (s: { body: { title: string; paragraphs: string[] } }) =>
  placeholders([s.body.title, ...s.body.paragraphs].join("\n"));

describe("starter letters", () => {
  it("English copy is exactly the plan's", () => {
    expect(STARTERS_EN).toEqual({
      "salary-certificate": { name: "Salary certificate", body: {
        title: "Salary Certificate", paragraphs: [
          "To: {{input.addressee}}",
          "This is to certify that {{employee.fullName}}, employee number " +
          "{{employee.number}}, has been employed by {{company.name}} " +
          "since {{employee.joiningDate}} as {{employee.jobTitle}}.",
          "The current monthly basic salary is {{salary.basic}} and the " +
          "total monthly salary is {{salary.monthlyTotal}}.",
          "This certificate is issued on {{letter.date}} at the " +
          "employee's request for the purpose of {{input.purpose}}. It " +
          "reflects our records on that date."] } },
      noc: { name: "No objection letter", body: {
        title: "No Objection Letter", paragraphs: [
          "To: {{input.addressee}}",
          "{{company.name}} has no objection to {{employee.fullName}}, " +
          "employed with us as {{employee.jobTitle}} since " +
          "{{employee.joiningDate}}, for the following purpose: " +
          "{{input.purpose}}.",
          "This letter is issued on {{letter.date}} at the employee's " +
          "request."] } },
      experience: { name: "Experience letter", body: {
        title: "Experience Letter", paragraphs: [
          "To whom it may concern",
          "This is to certify that {{employee.fullName}} worked with " +
          "{{company.name}} from {{employee.joiningDate}} to " +
          "{{employee.lastWorkingDate}}. The last position held was " +
          "{{employee.jobTitle}}.",
          "This letter is issued on {{letter.date}} at the employee's " +
          "request."] } },
      offer: { name: "Offer letter", body: {
        title: "Offer of Employment", paragraphs: [
          "Dear {{input.candidateName}},",
          "{{company.name}} is pleased to offer you the position of " +
          "{{input.position}}, starting on {{input.startDate}}, with a " +
          "total monthly salary of {{input.offerMonthlyTotal}}.",
          "The full terms will be set out in the employment contract " +
          "that we will send you. Please reply to tell us whether you " +
          "accept this offer."] } },
      warning: { name: "Warning letter", body: {
        title: "Written Warning", paragraphs: [
          "To: {{employee.fullName}}, {{employee.jobTitle}}",
          "This letter is a written warning about the following matter " +
          "on {{input.incidentDate}}: {{input.reason}}",
          "Please take the steps needed so that this does not happen " +
          "again. You may reply in writing to {{input.replyTo}}."] } },
    });
  });
  it("no starter states law or legal effect", () => {
    const en = new RegExp("\\b(article|law|laws|decree|resolution|ministry|" +
      "mohre|legal|legally|binding|sign|signed|signature|compliant|" +
      "compliance|statutory)\\b", "i");
    for (const k of LetterKind.options) {
      for (const s of strings(STARTERS_EN[k])) expect(s).not.toMatch(en);
      for (const s of strings(STARTERS_AR[k])) {
        for (const w of ["المادة", "قانون", "مرسوم", "ملزم", "توقيع",
          "وزارة"]) expect(s).not.toContain(w);
      }
    }
  });
  it("Arabic twins use the same placeholders; all are known", () => {
    const known = new Set(MERGE_FIELDS.map((f) => f.key));
    for (const k of LetterKind.options) {
      expect(keysOf(STARTERS_AR[k]), k).toEqual(keysOf(STARTERS_EN[k]));
      for (const key of keysOf(STARTERS_EN[k])) {
        expect(known.has(key), key).toBe(true);
      }
    }
  });
  it("every Arabic kind is marked for native review", () => {
    const src = readFileSync(join(import.meta.dirname, "..", "src",
      "letters", "starters-ar.ts"), "utf8");
    const marks = src.match(/NEEDS NATIVE REVIEW/g) ?? [];
    expect(marks.length).toBeGreaterThanOrEqual(LetterKind.options.length);
  });
});
