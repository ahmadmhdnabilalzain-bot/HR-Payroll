import type { z } from "zod";
import * as documents from "./documents";
import * as emiratisation from "./emiratisation";
import * as files from "./files";
import * as letters from "./letters";
import * as library from "./library";
import * as merge from "./merge-fields";

/** Plan 7's named schemas (OpenAPI components and EXAMPLES keys). */
const NAMES: [Record<string, unknown>, string[]][] = [
  [files, ["FileUpload", "FileRef", "FileContent"]],
  [documents, ["DocumentVerify", "DocumentVersionCreate",
    "EmployeeDocumentCreate",
    "DocumentVersion", "EmployeeDocument", "EmployeeDocumentList",
    "ExpiryAlert", "ExpiryAlertList", "RetentionRule", "DocumentSettings",
    "RetentionDueItem", "RetentionReport"]],
  [library, ["Audience", "LibraryCreate", "LibraryVersionCreate",
    "LibraryVersion", "MyReceipt", "LibraryDocument",
    "LibraryDocumentList", "AckRequest", "ReceiptRow", "ReceiptReport"]],
  [merge, ["MergeFieldDef", "MergeFieldList"]],
  [letters, ["TemplateBody", "LetterTemplateCreate",
    "TemplateVersionCreate", "NativeReviewRequest", "NativeReview",
    "TemplateVersion", "LetterTemplate", "LetterTemplateList",
    "LetterRequest", "Letter", "LetterList", "LetterPreview"]],
  [emiratisation, ["EmiratisationFlags", "EmiratisationSettingsPut",
    "EmiratisationSettings", "EmiratisationReport"]],
];

export const DOCUMENT_SCHEMAS: Readonly<Record<string, z.ZodType>> =
  Object.fromEntries(NAMES.flatMap(([mod, names]) => names.map((n) => {
    const s = mod[n];
    if (s === undefined) throw new Error(`no schema ${n}`);
    return [n, s as z.ZodType];
  })));
