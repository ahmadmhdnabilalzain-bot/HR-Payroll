import type { LetterKind, TemplateBody } from "@payroll/contract";

export interface Starter {
  name: string;
  body: TemplateBody;
}

/**
 * The English starter letters: no law, no legal effect, no statement
 * of what the law requires. The renderer adds the company heading,
 * date and reference lines and the issuer lines.
 */
export const STARTERS_EN: Readonly<Record<LetterKind, Starter>> = {
  "salary-certificate": { name: "Salary certificate", body: {
    title: "Salary Certificate", paragraphs: [
      "To: {{input.addressee}}",
      "This is to certify that {{employee.fullName}}, employee number " +
      "{{employee.number}}, has been employed by {{company.name}} since " +
      "{{employee.joiningDate}} as {{employee.jobTitle}}.",
      "The current monthly basic salary is {{salary.basic}} and the total " +
      "monthly salary is {{salary.monthlyTotal}}.",
      "This certificate is issued on {{letter.date}} at the employee's " +
      "request for the purpose of {{input.purpose}}. It reflects our " +
      "records on that date."] } },
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
      "{{input.position}}, starting on {{input.startDate}}, with a total " +
      "monthly salary of {{input.offerMonthlyTotal}}.",
      "The full terms will be set out in the employment contract that we " +
      "will send you. Please reply to tell us whether you accept this " +
      "offer."] } },
  warning: { name: "Warning letter", body: {
    title: "Written Warning", paragraphs: [
      "To: {{employee.fullName}}, {{employee.jobTitle}}",
      "This letter is a written warning about the following matter on " +
      "{{input.incidentDate}}: {{input.reason}}",
      "Please take the steps needed so that this does not happen again. " +
      "You may reply in writing to {{input.replyTo}}."] } },
};
