import { RETENTION_NOTICE } from "./documents";
import { EMIRATISATION_OVERRIDABLE } from "./emiratisation";
import { IDS } from "./examples-people";
import { PREVIEW_WATERMARK } from "./letters";
import { ACK_STATEMENT } from "./library";
import { MERGE_FIELDS } from "./merge-fields";

const X = (n: string) => `00000000-0000-4000-8000-0000000007${n}`;
export const DOCUMENT_IDS = {
  file: X("01"),
  document: X("02"),
  version: X("03"),
  library: X("04"),
  libraryVersion: X("05"),
  template: X("06"),
  templateVersion: X("07"),
  letter: X("08"),
} as const;
const AT = "2026-11-26T08:00:00Z";
const I = DOCUMENT_IDS;

const file = { id: I.file, name: "Example Policy.pdf",
  mime: "application/pdf", size: 48213, sha256: "d".repeat(64),
  uploadedAt: AT };

const version = { id: I.version, version: 1, file,
  documentNumber: "P0000000", issueDate: "2021-12-21",
  expiryDate: "2031-12-20", uploadedBy: IDS.user, uploadedAt: AT,
  verifiedBy: null, verifiedAt: null };

const document = { id: I.document, employeeId: IDS.employee,
  type: "passport", label: null, expiryDate: "2031-12-20",
  verified: false, versionCount: 1, current: version };

const alert = { documentId: I.document, employeeId: IDS.employee,
  employeeName: "Example Employee", type: "passport",
  expiryDate: "2026-12-20", daysLeft: 24, status: "due", stageDays: 30 };

const lead = [60, 30, 7];
const unset = { months: null, from: "employment-end" };
const settings = {
  leadDays: { "emirates-id": lead, visa: lead, passport: lead,
    "labour-card": lead, contract: lead, other: lead },
  retention: { "emirates-id": unset, visa: unset, passport: unset,
    "labour-card": unset, contract: unset, other: unset, letter: unset },
};

const receipt = { versionId: I.libraryVersion, viewedAt: AT,
  acknowledgedAt: null, statement: ACK_STATEMENT };

const libraryDoc = { id: I.library, title: "Example Policy",
  titleAr: null, category: "policy",
  audience: { allStaff: true, departmentIds: [], employeeIds: [],
    roles: [] },
  current: { id: I.libraryVersion, version: 1, file, note: null,
    requiresAck: true, publishedBy: IDS.user, publishedAt: AT },
  myReceipt: receipt };

const template = { id: I.template, kind: "noc", name: "Example letter",
  lang: "en", starter: false,
  current: { id: I.templateVersion, version: 1, status: "published",
    body: { title: "Example", paragraphs: ["To: {{input.addressee}}"] },
    fields: ["input.addressee"], usesSalary: false, createdBy: IDS.user,
    createdAt: AT, publishedAt: AT, nativeReview: null } };

const letter = { id: I.letter, kind: "noc", lang: "en",
  templateId: I.template, templateVersion: 1, employeeId: IDS.employee,
  issuedBy: IDS.user, issuedAt: AT, fileName: "noc-2026-11-26-en.pdf",
  sha256: "e".repeat(64), acknowledgedAt: null };

const report = { asOf: "2026-11-26", checkpoint: null, band: "none",
  status: "not-applicable", headcount: 4, skilledHeadcount: null,
  nationals: 0, countedNationals: 0, required: null, shortfall: null,
  notCounted: [], missingInputs: [], missingParams: [],
  fineExposure: null, fineNote: null,
  trace: [{ id: "emiratisation.headcount", label: "Headcount",
    formula: "employees joined on or before the date and not yet left",
    inputs: { asOf: "2026-11-26" }, result: "4", rules: [] }],
  disclaimer: "Planning estimate (example)." };

export const DOCUMENT_EXAMPLES: Record<string, unknown> = {
  FileRef: file,
  FileContent: "(binary)",
  DocumentVersion: version,
  EmployeeDocument: document,
  EmployeeDocumentList: { items: [document] },
  ExpiryAlert: alert,
  ExpiryAlertList: { items: [alert] },
  DocumentSettings: settings,
  RetentionReport: { asOf: "2026-11-26", due: [],
    unsetClasses: ["passport"], notice: RETENTION_NOTICE },
  MyReceipt: receipt,
  LibraryDocument: libraryDoc,
  LibraryDocumentList: { items: [libraryDoc] },
  ReceiptReport: { documentId: I.library, versionId: I.libraryVersion,
    version: 1, rows: [{ employeeId: IDS.employee,
      employeeName: "Example Employee", status: "viewed", viewedAt: AT,
      acknowledgedAt: null }],
    counts: { acknowledged: 0, viewed: 1, pending: 0 } },
  MergeFieldList: { items: MERGE_FIELDS.slice(0, 2) },
  LetterTemplate: template,
  LetterTemplateList: { items: [template] },
  Letter: letter,
  LetterList: { items: [letter] },
  LetterPreview: { fileName: "noc-2026-11-26-en.pdf",
    contentBase64: "JVBERi0=", watermark: PREVIEW_WATERMARK },
  EmiratisationReport: report,
  EmiratisationSettings: { sectorInScope: null,
    overrides: { [EMIRATISATION_OVERRIDABLE[2]]: "DOWN" }, updatedAt: AT },
  EmiratisationFlags: { skilled: true, workPermitValid: true,
    paidViaWps: true, gpssaRegistered: null },
};
