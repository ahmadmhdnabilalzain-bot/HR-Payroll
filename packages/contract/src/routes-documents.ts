import {
  AlertsQuery,
  DocumentSettings,
  DocumentVersionCreate,
  EmployeeDocument,
  EmployeeDocumentCreate,
  EmployeeDocumentList,
  ExpiryAlertList,
  RetentionReport,
  VersionParams,
} from "./documents";
import {
  EmiratisationFlags,
  EmiratisationQuery,
  EmiratisationReport,
  EmiratisationSettings,
  EmiratisationSettingsPut,
} from "./emiratisation";
import { FILE_BODY_LIMIT, FileContent, FileRef, FileUpload } from "./files";
import {
  Letter,
  LetterList,
  LetterPreview,
  LetterRequest,
  LettersQuery,
  LetterTemplate,
  LetterTemplateCreate,
  LetterTemplateList,
  NativeReviewRequest,
  TemplateVersionCreate,
  TemplateVersionParams,
} from "./letters";
import {
  AckRequest,
  Audience,
  LibraryCreate,
  LibraryDocument,
  LibraryDocumentList,
  LibraryVersionCreate,
  MyReceipt,
  ReceiptReport,
} from "./library";
import { MergeFieldList } from "./merge-fields";
import { IdParams } from "./primitives";
import {
  ALL_ROLES,
  DECIDERS,
  OWNER,
  PAYROLL,
  ten,
  type RouteDef,
} from "./route-def";

const one = { params: IdParams };
const bin = "binary" as const;

const VAULT: readonly RouteDef[] = [
  ten(ALL_ROLES, { id: "fileUpload", method: "POST", path: "/v1/files",
    body: FileUpload, response: FileRef, status: 201,
    bodyLimit: FILE_BODY_LIMIT }),
  ten(ALL_ROLES, { id: "employeeDocumentsList", method: "GET",
    path: "/v1/employees/{id}/documents", ...one,
    response: EmployeeDocumentList }),
  ten(ALL_ROLES, { id: "employeeDocumentCreate", method: "POST",
    path: "/v1/employees/{id}/documents", ...one,
    body: EmployeeDocumentCreate, response: EmployeeDocument,
    status: 201 }),
  ten(ALL_ROLES, { id: "employeeDocumentGet", method: "GET",
    path: "/v1/employee-documents/{id}", ...one,
    response: EmployeeDocument }),
  ten(ALL_ROLES, { id: "employeeDocumentVersionAdd", method: "POST",
    path: "/v1/employee-documents/{id}/versions", ...one,
    body: DocumentVersionCreate, response: EmployeeDocument,
    status: 201 }),
  ten(PAYROLL, { id: "employeeDocumentVerify", method: "POST",
    path: "/v1/employee-documents/{id}/verify", ...one,
    response: EmployeeDocument }),
  ten(ALL_ROLES, { id: "employeeDocumentDownload", method: "GET",
    path: "/v1/employee-documents/{id}/versions/{versionId}/download",
    params: VersionParams, response: FileContent, contentType: bin }),
  ten(ALL_ROLES, { id: "documentAlerts", method: "GET",
    path: "/v1/document-alerts", query: AlertsQuery,
    response: ExpiryAlertList }),
  ten(PAYROLL, { id: "documentSettingsGet", method: "GET",
    path: "/v1/document-settings", response: DocumentSettings }),
  ten(OWNER, { id: "documentSettingsPut", method: "PUT",
    path: "/v1/document-settings", body: DocumentSettings,
    response: DocumentSettings }),
  ten(PAYROLL, { id: "documentRetentionDue", method: "GET",
    path: "/v1/document-retention", response: RetentionReport }),
];

const LIBRARY: readonly RouteDef[] = [
  ten(ALL_ROLES, { id: "libraryList", method: "GET", path: "/v1/library",
    response: LibraryDocumentList }),
  ten(PAYROLL, { id: "libraryCreate", method: "POST", path: "/v1/library",
    body: LibraryCreate, response: LibraryDocument, status: 201 }),
  ten(ALL_ROLES, { id: "libraryGet", method: "GET",
    path: "/v1/library/{id}", ...one, response: LibraryDocument }),
  ten(PAYROLL, { id: "libraryVersionAdd", method: "POST",
    path: "/v1/library/{id}/versions", ...one, body: LibraryVersionCreate,
    response: LibraryDocument, status: 201 }),
  ten(PAYROLL, { id: "libraryAudiencePut", method: "PUT",
    path: "/v1/library/{id}/audience", ...one, body: Audience,
    response: LibraryDocument }),
  ten(ALL_ROLES, { id: "libraryDownload", method: "GET",
    path: "/v1/library/{id}/download", ...one, response: FileContent,
    contentType: bin }),
  ten(ALL_ROLES, { id: "libraryAcknowledge", method: "POST",
    path: "/v1/library/{id}/acknowledge", ...one, body: AckRequest,
    response: MyReceipt }),
  ten(PAYROLL, { id: "libraryReceipts", method: "GET",
    path: "/v1/library/{id}/receipts", ...one, response: ReceiptReport }),
];

const tv = { params: TemplateVersionParams };

const TEMPLATES: readonly RouteDef[] = [
  ten(DECIDERS, { id: "letterFields", method: "GET",
    path: "/v1/letter-fields", response: MergeFieldList }),
  ten(DECIDERS, { id: "letterTemplatesList", method: "GET",
    path: "/v1/letter-templates", response: LetterTemplateList }),
  ten(PAYROLL, { id: "letterTemplateCreate", method: "POST",
    path: "/v1/letter-templates", body: LetterTemplateCreate,
    response: LetterTemplate, status: 201 }),
  ten(DECIDERS, { id: "letterTemplateGet", method: "GET",
    path: "/v1/letter-templates/{id}", ...one, response: LetterTemplate }),
  ten(PAYROLL, { id: "letterTemplateVersionAdd", method: "POST",
    path: "/v1/letter-templates/{id}/versions", ...one,
    body: TemplateVersionCreate, response: LetterTemplate, status: 201 }),
  ten(PAYROLL, { id: "letterTemplatePublish", method: "POST",
    path: "/v1/letter-templates/{id}/versions/{versionId}/publish", ...tv,
    response: LetterTemplate }),
  ten(OWNER, { id: "letterTemplateNativeReview", method: "POST",
    path: "/v1/letter-templates/{id}/versions/{versionId}/native-review",
    ...tv, body: NativeReviewRequest, response: LetterTemplate }),
];

const LETTERS: readonly RouteDef[] = [
  ten(DECIDERS, { id: "letterPreview", method: "POST",
    path: "/v1/letters/preview", body: LetterRequest,
    response: LetterPreview }),
  ten(DECIDERS, { id: "letterIssue", method: "POST", path: "/v1/letters",
    body: LetterRequest, response: Letter, status: 201 }),
  ten(ALL_ROLES, { id: "lettersList", method: "GET", path: "/v1/letters",
    query: LettersQuery, response: LetterList }),
  ten(ALL_ROLES, { id: "letterGet", method: "GET",
    path: "/v1/letters/{id}", ...one, response: Letter }),
  ten(ALL_ROLES, { id: "letterDownload", method: "GET",
    path: "/v1/letters/{id}/download", ...one, response: FileContent,
    contentType: bin }),
  ten(ALL_ROLES, { id: "letterAcknowledge", method: "POST",
    path: "/v1/letters/{id}/acknowledge", ...one, response: Letter }),
];

const EMIRATISATION: readonly RouteDef[] = [
  ten(PAYROLL, { id: "emiratisationReport", method: "GET",
    path: "/v1/emiratisation", query: EmiratisationQuery,
    response: EmiratisationReport }),
  ten(OWNER, { id: "emiratisationSettingsPut", method: "PUT",
    path: "/v1/emiratisation/settings", body: EmiratisationSettingsPut,
    response: EmiratisationSettings }),
  ten(PAYROLL, { id: "employeeEmiratisationPut", method: "PUT",
    path: "/v1/employees/{id}/emiratisation", ...one,
    body: EmiratisationFlags, response: EmiratisationFlags }),
];

/** Plan 7: files, documents, library, letters and Emiratisation. */
export const DOCUMENT_ROUTES: readonly RouteDef[] = [
  ...VAULT,
  ...LIBRARY,
  ...TEMPLATES,
  ...LETTERS,
  ...EMIRATISATION,
];
