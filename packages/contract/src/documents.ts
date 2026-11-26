import { z } from "zod";
import { FileRef } from "./files";
import { Id, IsoDate, listOf, Timestamp } from "./primitives";

export const DocumentType = z.enum(["emirates-id", "visa", "passport",
  "labour-card", "contract", "other"]);
export type DocumentType = z.infer<typeof DocumentType>;

/** Types whose documents must carry an expiry date. */
export const EXPIRY_REQUIRED_TYPES = ["emirates-id", "visa", "passport",
  "labour-card"] as const;

/** Letters, digits, slash, space and hyphen; never markup. */
export const DocumentNumber = z.string().regex(/^[A-Za-z0-9/ -]{1,40}$/);

const versionShape = {
  fileId: Id,
  documentNumber: DocumentNumber.optional(),
  issueDate: IsoDate.optional(),
  expiryDate: IsoDate.optional(),
};

type Dated = { issueDate?: string | undefined;
  expiryDate?: string | undefined };
const datesInOrder = (v: Dated) => v.issueDate === undefined ||
  v.expiryDate === undefined || v.expiryDate >= v.issueDate;
const order = { message: "expiryDate is before issueDate",
  path: ["expiryDate"] };

export const DocumentVersionCreate = z.object(versionShape)
  .refine(datesInOrder, order);
export type DocumentVersionCreate = z.infer<typeof DocumentVersionCreate>;

const needsExpiry = (t: string) =>
  (EXPIRY_REQUIRED_TYPES as readonly string[]).includes(t);

export const EmployeeDocumentCreate = z.object({ ...versionShape,
  type: DocumentType, label: z.string().min(1).max(80).optional() })
  .refine((v) => !needsExpiry(v.type) || v.expiryDate !== undefined,
    { message: "this type needs an expiry date", path: ["expiryDate"] })
  .refine(datesInOrder, order);
export type EmployeeDocumentCreate = z.infer<typeof EmployeeDocumentCreate>;

export const DocumentVersion = z.object({
  id: Id,
  version: z.number().int().min(1),
  file: FileRef,
  documentNumber: z.string().nullable(),
  issueDate: IsoDate.nullable(),
  expiryDate: IsoDate.nullable(),
  uploadedBy: Id,
  uploadedAt: Timestamp,
  verifiedBy: Id.nullable(),
  verifiedAt: Timestamp.nullable(),
});
export type DocumentVersion = z.infer<typeof DocumentVersion>;

/**
 * `current` null means "not visible to you" (a manager sees type,
 * expiry and verified state of a report's document, never the number
 * or the file). `expiryDate` is the current version's.
 */
export const EmployeeDocument = z.object({
  id: Id,
  employeeId: Id,
  type: DocumentType,
  label: z.string().nullable(),
  expiryDate: IsoDate.nullable(),
  verified: z.boolean(),
  versionCount: z.number().int().min(1),
  current: DocumentVersion.nullable(),
  versions: z.array(DocumentVersion).optional(),
});
export type EmployeeDocument = z.infer<typeof EmployeeDocument>;
export const EmployeeDocumentList = listOf(EmployeeDocument);

export const ExpiryAlert = z.object({
  documentId: Id,
  employeeId: Id,
  employeeName: z.string(),
  type: DocumentType,
  expiryDate: IsoDate,
  daysLeft: z.number().int(),
  status: z.enum(["expired", "due"]),
  stageDays: z.number().int().nullable(),
});
export type ExpiryAlert = z.infer<typeof ExpiryAlert>;
export const ExpiryAlertList = listOf(ExpiryAlert);

export const AlertsQuery = z.object({
  withinDays: z.coerce.number().int().min(0).max(365).optional(),
});

/** Days before expiry when an alert stage starts: a company choice. */
export const LeadDays = z.array(z.number().int().min(1).max(365))
  .min(1).max(6)
  .refine((a) => a.every((d, i) => i === 0 || d < a[i - 1]!),
    { message: "lead days must be strictly descending" });
export type LeadDays = z.infer<typeof LeadDays>;

export const RetentionClass = z.enum([...DocumentType.options, "letter"]);
export type RetentionClass = z.infer<typeof RetentionClass>;

export const RetentionRule = z.object({
  months: z.number().int().min(1).max(1200).nullable(),
  from: z.enum(["employment-end", "expiry", "issue"]),
});
export type RetentionRule = z.infer<typeof RetentionRule>;

export const DocumentSettings = z.object({
  leadDays: z.record(DocumentType, LeadDays),
  retention: z.record(RetentionClass, RetentionRule),
});
export type DocumentSettings = z.infer<typeof DocumentSettings>;

export const RETENTION_NOTICE = "The PDPL text read sets no retention " +
  "periods. Set one per class with your adviser. Nothing is deleted " +
  "automatically.";

export const RetentionDueItem = z.object({
  kind: z.enum(["employee-document", "letter"]),
  id: Id,
  employeeId: Id.nullable(),
  retentionClass: RetentionClass,
  retainUntil: IsoDate,
});
export type RetentionDueItem = z.infer<typeof RetentionDueItem>;

export const RetentionReport = z.object({
  asOf: IsoDate,
  due: z.array(RetentionDueItem),
  unsetClasses: z.array(RetentionClass),
  notice: z.literal(RETENTION_NOTICE),
});
export type RetentionReport = z.infer<typeof RetentionReport>;

/** Employee document and version ids in a download path. */
export const VersionParams = z.object({ id: Id, versionId: Id });
