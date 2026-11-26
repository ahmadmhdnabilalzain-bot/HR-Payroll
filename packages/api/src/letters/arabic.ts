import type { TemplateBody } from "@payroll/contract";

/** A letter of an RTL script (Arabic and Hebrew blocks, presentation
 * forms). */
export const RTL_LETTER = /[֐-ࣿיִ-﷿ﹰ-﻿]/;

/**
 * Whether a template version needs a native review before issue: an
 * Arabic template, or any template whose text holds an Arabic letter
 * (so an "en" template cannot carry unreviewed Arabic to an employee).
 */
export function needsNativeReview(lang: "en" | "ar", body: TemplateBody)
  : boolean {
  return lang === "ar" ||
    [body.title, ...body.paragraphs].some((t) => RTL_LETTER.test(t));
}
