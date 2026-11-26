import type { LetterKind } from "@payroll/contract";
import type { Starter } from "./starters";

/**
 * Arabic twins of the English starters, written by the implementer
 * and NOT reviewed by a native speaker. Each uses exactly its English
 * twin's placeholders. An Arabic version cannot be issued until an
 * owner records a native review of it (Plan 7 Ruling 16).
 */
export const STARTERS_AR: Readonly<Record<LetterKind, Starter>> = {
  // NEEDS NATIVE REVIEW
  "salary-certificate": { name: "شهادة راتب", body: {
    title: "شهادة راتب", paragraphs: [
      "إلى: {{input.addressee}}",
      "نشهد بأن {{employee.fullName}}، الرقم الوظيفي {{employee.number}}، " +
      "يعمل لدى {{company.name}} منذ {{employee.joiningDate}} بوظيفة " +
      "{{employee.jobTitle}}.",
      "يبلغ الراتب الأساسي الشهري الحالي {{salary.basic}}، ويبلغ إجمالي " +
      "الراتب الشهري {{salary.monthlyTotal}}.",
      "صدرت هذه الشهادة بتاريخ {{letter.date}} بناءً على طلب الموظف " +
      "لغرض {{input.purpose}}، وهي تعكس سجلاتنا في ذلك التاريخ."] } },
  // NEEDS NATIVE REVIEW
  noc: { name: "رسالة عدم ممانعة", body: {
    title: "رسالة عدم ممانعة", paragraphs: [
      "إلى: {{input.addressee}}",
      "لا تمانع {{company.name}} في قيام {{employee.fullName}}، العامل " +
      "لدينا بوظيفة {{employee.jobTitle}} منذ {{employee.joiningDate}}، " +
      "بالغرض التالي: {{input.purpose}}.",
      "صدرت هذه الرسالة بتاريخ {{letter.date}} بناءً على طلب الموظف."] } },
  // NEEDS NATIVE REVIEW
  experience: { name: "شهادة خبرة", body: {
    title: "شهادة خبرة", paragraphs: [
      "إلى من يهمه الأمر",
      "نشهد بأن {{employee.fullName}} عمل لدى {{company.name}} من " +
      "{{employee.joiningDate}} إلى {{employee.lastWorkingDate}}، وكانت " +
      "آخر وظيفة شغلها {{employee.jobTitle}}.",
      "صدرت هذه الشهادة بتاريخ {{letter.date}} بناءً على طلب الموظف."] } },
  // NEEDS NATIVE REVIEW
  offer: { name: "عرض عمل", body: {
    title: "عرض عمل", paragraphs: [
      "عزيزي/عزيزتي {{input.candidateName}}،",
      "يسر {{company.name}} أن تعرض عليك وظيفة {{input.position}}، " +
      "اعتبارًا من {{input.startDate}}، براتب شهري إجمالي قدره " +
      "{{input.offerMonthlyTotal}}.",
      "ستُحدَّد الشروط الكاملة في عقد العمل الذي سنرسله إليك. يرجى الرد " +
      "لإبلاغنا بقبولك هذا العرض أو عدمه."] } },
  // NEEDS NATIVE REVIEW
  warning: { name: "إنذار كتابي", body: {
    title: "إنذار كتابي", paragraphs: [
      "إلى: {{employee.fullName}}، {{employee.jobTitle}}",
      "تُعد هذه الرسالة إنذارًا كتابيًا بشأن الأمر التالي بتاريخ " +
      "{{input.incidentDate}}: {{input.reason}}",
      "يرجى اتخاذ الخطوات اللازمة لعدم تكرار ذلك. يمكنك الرد كتابيًا " +
      "إلى {{input.replyTo}}."] } },
};
