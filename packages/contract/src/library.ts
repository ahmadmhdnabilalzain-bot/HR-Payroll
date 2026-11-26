import { z } from "zod";
import { FileRef } from "./files";
import { Id, listOf, Timestamp } from "./primitives";
import { Role } from "./roles";

export const LibraryCategory = z.enum(["policy", "handbook", "form",
  "notice", "other"]);
export type LibraryCategory = z.infer<typeof LibraryCategory>;

/** Who may see a library document. An empty audience matches nobody. */
export const Audience = z.object({
  allStaff: z.boolean(),
  departmentIds: z.array(Id).max(200),
  employeeIds: z.array(Id).max(1000),
  roles: z.array(Role),
});
export type Audience = z.infer<typeof Audience>;

export const LibraryCreate = z.object({
  title: z.string().min(1).max(120),
  titleAr: z.string().min(1).max(120).optional(),
  category: LibraryCategory,
  fileId: Id,
  audience: Audience,
  requiresAck: z.boolean(),
});
export type LibraryCreate = z.infer<typeof LibraryCreate>;

export const LibraryVersionCreate = z.object({
  fileId: Id,
  note: z.string().min(1).max(500).optional(),
  requiresAck: z.boolean(),
});
export type LibraryVersionCreate = z.infer<typeof LibraryVersionCreate>;

export const LibraryVersion = z.object({
  id: Id,
  version: z.number().int().min(1),
  file: FileRef,
  note: z.string().nullable(),
  requiresAck: z.boolean(),
  publishedBy: Id,
  publishedAt: Timestamp,
});
export type LibraryVersion = z.infer<typeof LibraryVersion>;

/** The text a reader confirms. A receipt, never a signature. */
export const ACK_STATEMENT =
  "I confirm that I received and read this document.";

export const MyReceipt = z.object({
  versionId: Id,
  viewedAt: Timestamp.nullable(),
  acknowledgedAt: Timestamp.nullable(),
  statement: z.literal(ACK_STATEMENT),
});
export type MyReceipt = z.infer<typeof MyReceipt>;

/** `audience` is null for roles other than owner and hr. */
export const LibraryDocument = z.object({
  id: Id,
  title: z.string(),
  titleAr: z.string().nullable(),
  category: LibraryCategory,
  audience: Audience.nullable(),
  current: LibraryVersion,
  myReceipt: MyReceipt.nullable(),
});
export type LibraryDocument = z.infer<typeof LibraryDocument>;
export const LibraryDocumentList = listOf(LibraryDocument);

export const AckRequest = z.object({ versionId: Id });
export type AckRequest = z.infer<typeof AckRequest>;

export const ReceiptRow = z.object({
  employeeId: Id,
  employeeName: z.string(),
  status: z.enum(["acknowledged", "viewed", "pending"]),
  viewedAt: Timestamp.nullable(),
  acknowledgedAt: Timestamp.nullable(),
});
export type ReceiptRow = z.infer<typeof ReceiptRow>;

export const ReceiptReport = z.object({
  documentId: Id,
  versionId: Id,
  version: z.number().int().min(1),
  rows: z.array(ReceiptRow),
  counts: z.object({
    acknowledged: z.number().int().min(0),
    viewed: z.number().int().min(0),
    pending: z.number().int().min(0),
  }),
});
export type ReceiptReport = z.infer<typeof ReceiptReport>;
