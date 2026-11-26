import { z } from "zod";
import { INPUT_KEYS } from "./merge-fields";
import { Id, Lang, listOf, Timestamp } from "./primitives";
import type { Role } from "./roles";

export const LetterKind = z.enum(["salary-certificate", "noc",
  "experience", "offer", "warning"]);
export type LetterKind = z.infer<typeof LetterKind>;

/** Who may issue each kind (a manager: warnings for direct reports). */
export const LETTER_GENERATE_ROLES: Readonly<Record<LetterKind,
  readonly Role[]>> = Object.freeze({
  "salary-certificate": ["owner", "hr"],
  noc: ["owner", "hr"],
  experience: ["owner", "hr"],
  offer: ["owner", "hr"],
  warning: ["owner", "hr", "manager"],
});

export const KINDS_NEEDING_EMPLOYEE: readonly LetterKind[] = Object.freeze(
  ["salary-certificate", "noc", "experience", "warning"]);

export const TemplateBody = z.object({
  title: z.string().min(1).max(120),
  paragraphs: z.array(z.string().min(1).max(2000)).min(1).max(40),
});
export type TemplateBody = z.infer<typeof TemplateBody>;

export const LetterTemplateCreate = z.object({
  kind: LetterKind,
  name: z.string().min(1).max(80),
  lang: Lang,
  body: TemplateBody,
});
export type LetterTemplateCreate = z.infer<typeof LetterTemplateCreate>;

export const TemplateVersionCreate = z.object({ body: TemplateBody });
export type TemplateVersionCreate = z.infer<typeof TemplateVersionCreate>;

export const NativeReviewRequest = z.object({
  reviewerName: z.string().trim().min(2).max(80),
});
export type NativeReviewRequest = z.infer<typeof NativeReviewRequest>;

export const NativeReview = z.object({
  status: z.enum(["needs-native-review", "reviewed"]),
  reviewerName: z.string().nullable(),
  reviewedAt: Timestamp.nullable(),
});
export type NativeReview = z.infer<typeof NativeReview>;

/** `nativeReview` is null for English versions. */
export const TemplateVersion = z.object({
  id: Id,
  version: z.number().int().min(1),
  status: z.enum(["draft", "published", "superseded"]),
  body: TemplateBody,
  fields: z.array(z.string()),
  usesSalary: z.boolean(),
  createdBy: Id,
  createdAt: Timestamp,
  publishedAt: Timestamp.nullable(),
  nativeReview: NativeReview.nullable(),
});
export type TemplateVersion = z.infer<typeof TemplateVersion>;

export const LetterTemplate = z.object({
  id: Id,
  kind: LetterKind,
  name: z.string(),
  lang: Lang,
  starter: z.boolean(),
  current: TemplateVersion.nullable(),
  versions: z.array(TemplateVersion).optional(),
});
export type LetterTemplate = z.infer<typeof LetterTemplate>;
export const LetterTemplateList = listOf(LetterTemplate);

export const LetterRequest = z.object({
  templateId: Id,
  employeeId: Id.optional(),
  inputs: z.record(z.string(), z.string().min(1).max(500))
    .refine((r) => Object.keys(r).every((k) => INPUT_KEYS.includes(k)),
      { message: "unknown input key" }),
});
export type LetterRequest = z.infer<typeof LetterRequest>;

export const Letter = z.object({
  id: Id,
  kind: LetterKind,
  lang: Lang,
  templateId: Id,
  templateVersion: z.number().int().min(1),
  employeeId: Id.nullable(),
  issuedBy: Id,
  issuedAt: Timestamp,
  fileName: z.string(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  acknowledgedAt: Timestamp.nullable(),
});
export type Letter = z.infer<typeof Letter>;
export const LetterList = listOf(Letter);

export const LettersQuery = z.object({ employeeId: Id.optional() });

export const PREVIEW_WATERMARK = "PREVIEW - NOT ISSUED";

export const LetterPreview = z.object({
  fileName: z.string(),
  contentBase64: z.string(),
  watermark: z.literal(PREVIEW_WATERMARK),
});
export type LetterPreview = z.infer<typeof LetterPreview>;

/** Template and version ids in a path. */
export const TemplateVersionParams = z.object({ id: Id, versionId: Id });
