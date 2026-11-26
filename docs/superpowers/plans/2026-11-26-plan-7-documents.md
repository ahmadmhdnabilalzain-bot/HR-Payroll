# Plan 7: Documents, Letters, Expiry Alerts and Emiratisation

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Per-tenant document storage (employee document vault with
versions and expiry alerts, a company library with read and acknowledge
receipts), standard letters in English and Arabic rendered to PDF on the
server from versioned templates, per-class retention settings, and an
Emiratisation headcount tracker, all as API routes on the Plan 3 backend.

**Architecture:** Extends Plan 3 (`packages/contract`, `packages/api`)
additively: new schema files and a second route array in the contract;
new migrations, services and route files in the API. File bytes are
encrypted with the company data key and stored in a tenant table
(`file_blobs`) under row-level security, so tenancy needs no new
mechanism. Letters are merged from whitelisted fields in one pure pass
and rendered by pdfkit behind a `PdfRenderer` interface. Emiratisation
numbers live in a new engine rule-pack (`ae-emiratisation`); a pure
engine function computes the report and the API only gathers inputs.

**Tech Stack:** Plan 3's stack (Node 22, TypeScript 7.0.2, zod 4.6.7,
Hono 4.13.17, pglite 0.5.16, pg 8.23.1, Vitest 5.1.2, fast-check
4.11.0), plus pdfkit 0.20.2, dejavu-fonts-ttf 2.37.3, @types/pdfkit
0.17.7 (dev) and pdfjs-dist 6.4.299 (dev, tests only). All pinned
exactly.

**Spec:** `docs/superpowers/specs/2026-11-25-master-feature-list.md`
(UQ15 letters with acknowledgement trail, UQ17 retention, UQ20
Emiratisation ledger, UQ34 documents module),
`docs/superpowers/specs/2026-11-25-combined-feature-list.md` (parity
rows: document expiry alerts, HR letters, Emiratisation tracking),
`docs/research/2026-11-25-documents-module-feasibility.md`,
`docs/research/2026-11-25-gpssa-emiratisation-nafis.md`,
`docs/research/2026-11-26-pdpl-primary.md`,
`docs/superpowers/plans/2026-11-26-plan-3-backend.md` (the contract,
API, tenancy, audit and roles this plan extends),
`docs/engineering-standards.md`, `LEDGER.md` sections 1 to 3.

**Prerequisite:** Plan 3 Tasks 1 to 8 are merged (`packages/contract`
and `packages/api` exist, with `register`, `withTenant`, `appendAudit`,
`Keyring`, `seedCompany`, the leak test and the conformance test).
Plan 5 is not required. Plan 5 also edits `packages/engine/src/
sources.ts` and `src/index.ts`; both edits only add entries, so on a
conflict keep both sides.

## Global Constraints

- Plan 3's Global Constraints apply unchanged (80-character lines, files
  under about 300 lines, functions under 30, injected time and ids,
  RLS on every tenant table, `/v1`, `X-Company-Id`, offline tests).
- No statutory number appears in `packages/api` or `packages/contract`.
  Emiratisation values live only in the engine pack `ae-emiratisation`
  with status `secondary`, `convention` or `unsourced`; none is
  `official` (the research note is snippet-level).
- Never say or imply a legal effect for a document: no copy, field,
  route or error says "sign", "signed", "signature", "e-signature",
  "binding", "legally valid" or "compliant". An acknowledgement is a
  "receipt" and its text is `ACK_STATEMENT` (Task 1).
- Starter letters state no legal fact: no article, law, decree,
  resolution, ministry or authority, and no statement of what the law
  requires (exact English copy in Task 6).
- Arabic text reaches no employee before native review: an Arabic
  template version cannot be issued until an owner records a native
  review of that version; every Arabic string in code carries the
  comment `// NEEDS NATIVE REVIEW`.
- Uploads: type by magic bytes only (PDF, PNG, JPEG); the client's
  `Content-Type` is ignored; at most `MAX_UPLOAD_BYTES = 10485760`.
- File bytes are encrypted with the company DEK (AAD
  `"<companyId>:file_blobs:cipher:<fileId>"`) and stored only in
  `file_blobs`. Downloads are `Content-Disposition: attachment` with
  `X-Content-Type-Options: nosniff`, `Content-Security-Policy:
  sandbox` and `Cache-Control: no-store`.
- Document numbers, merge values, letter inputs and file bytes never
  appear in audit rows, log lines or error bodies.
- Nothing is deleted automatically. Retention has no default period
  and produces a due list only.
- Contract changes are additive: no Plan 3 schema or route changes
  meaning; no new route uses DELETE.
- Plan 7 migrations are numbered `070` to `079` (reserved).
- "Today" is `dubaiDate(deps.now())` (Plan 3 Task 6).
- Audit actions match `^[a-z]+(\.[a-z-]+)+$`: the first segment has no
  hyphen (`letter.template.published`, never `letter-template.*`).

## Review Focus

1. A renewed passport or visa (new version with a later expiry): the old
   version stops raising alerts; only the current version of each slot
   counts (Task 4 `employee-documents.test.ts`
   `renewal_clears_alert`).
2. An employee who has left: no expiry alerts for their documents, not
   counted as pending in library receipt reports, not in Emiratisation
   headcount after their last working date (Task 4
   `alerts_exclude_leavers`, Task 5 `receipts_exclude_leavers`, Task 2
   `leaver_excluded`).
3. A file name with quotes, CR or LF, Arabic letters or `../`: the
   stored name is cleaned and `Content-Disposition` cannot be broken or
   used to inject headers (Task 3 `file-name.test.ts`).
4. A merge value typed by a user that itself contains `{{salary.basic}}`
   (an addressee, a warning reason): inserted literally, never expanded,
   so a manager's warning letter can never carry a salary (Task 6
   `merge_is_single_pass`, Task 7 `manager_input_not_expanded`).
5. An upload that claims `application/pdf` but is HTML, SVG or an
   executable: refused with 415 by byte sniffing (Task 3
   `files_sniff_ignores_client_type`).

## File Structure

| Area | Files (all new unless marked) |
|---|---|
| Contract schemas | `packages/contract/src/files.ts`, `documents.ts`, `library.ts`, `letters.ts`, `merge-fields.ts`, `emiratisation.ts`, `routes-documents.ts`; modify `routes.ts`, `errors.ts`, `examples.ts`, `openapi.ts`, `index.ts` |
| Engine | `packages/engine/src/rules/emiratisation-pack.ts`, `src/emiratisation/types.ts`, `count.ts`, `compute.ts`; modify `src/sources.ts`, `src/index.ts` |
| Files | `packages/api/src/files/sniff.ts`, `names.ts`, `files.ts`, `src/http/binary.ts`, `src/routes/files.ts`; modify `src/crypto/keyring.ts`, `src/audit/audit.ts`, `src/app.ts`, `src/http/validate.ts` |
| Employee documents | `src/documents/employee-docs.ts`, `redact.ts`, `expiry.ts`, `expiry-defaults.ts`, `settings.ts`, `retention.ts`, `src/routes/employee-documents.ts`, `src/routes/document-settings.ts` |
| Library | `src/library/audience.ts`, `library.ts`, `receipts.ts`, `src/routes/library.ts` |
| Letters | `src/letters/merge.ts`, `starters.ts`, `starters-ar.ts`, `templates.ts`, `values.ts`, `letters.ts`, `sample.ts`, `src/pdf/renderer.ts`, `src/pdf/bidi-space.ts`, `src/routes/letter-templates.ts`, `src/routes/letters.ts` |
| Emiratisation | `src/emiratisation/report.ts`, `src/routes/emiratisation.ts` |
| Migrations | `packages/api/migrations/070_files.sql` to `075_emiratisation.sql` |

---

### Task 1: Contract additions (schemas, routes, errors, OpenAPI)

Mergeable on its own; a later web plan builds screens from it.

**Files:**
- Create in `packages/contract/src/`: `files.ts`, `documents.ts`,
  `library.ts`, `letters.ts`, `merge-fields.ts`, `emiratisation.ts`,
  `routes-documents.ts`
- Modify: `routes.ts` (rename the Plan 3 array to `CORE_ROUTES`; add
  the `RouteDef` fields below; `ROUTES = [...CORE_ROUTES,
  ...DOCUMENT_ROUTES]`), `errors.ts`, `examples.ts`, `openapi.ts`,
  `index.ts`
- Modify: `packages/contract/tests/routes.test.ts`,
  `tests/openapi.test.ts`
- Test: `packages/contract/tests/documents-schemas.test.ts`

**Interfaces (Produces; all exported from `index.ts`):**
- `RouteDef` gains, additively: `bodyKind?: "json" | "binary"` (default
  `"json"`; a binary route has no `body` schema) and `contentType?:
  "text/plain" | "application/pdf" | "application/octet-stream"` (a
  route with `contentType` returns those bytes, not JSON; `response` is
  `z.any()` for it). Methods stay `GET | POST | PUT | PATCH`.
- `files.ts`: `MAX_UPLOAD_BYTES = 10485760`; `AllowedMime =
  z.enum(["application/pdf","image/png","image/jpeg"])`; `FileRef { id;
  name: string 1..200; mime: AllowedMime; size: int 1..MAX_UPLOAD_BYTES;
  sha256: ^[0-9a-f]{64}$; uploadedAt: Timestamp }`; `FileUploadQuery {
  name: string 1..200 }`.
- `documents.ts`:
  - `DocumentType = z.enum(["emirates-id","visa","passport",
    "labour-card","contract","other"])`; `EXPIRY_REQUIRED_TYPES =
    ["emirates-id","visa","passport","labour-card"] as const`.
  - `DocumentNumber = ^[A-Za-z0-9/ -]{1,40}$`.
  - `DocumentVersionCreate { fileId: Id; documentNumber?:
    DocumentNumber; issueDate?: IsoDate; expiryDate?: IsoDate }`, refined
    so `expiryDate >= issueDate` when both are given.
  - `EmployeeDocumentCreate = DocumentVersionCreate & { type:
    DocumentType; label?: string 1..80 }`, refined so the four
    `EXPIRY_REQUIRED_TYPES` need `expiryDate` (issue path `expiryDate`).
  - `DocumentVersion { id; version: int >= 1; file: FileRef;
    documentNumber: string | null; issueDate: IsoDate | null;
    expiryDate: IsoDate | null; uploadedBy: Id; uploadedAt; verifiedBy:
    Id | null; verifiedAt: Timestamp | null }`.
  - `EmployeeDocument { id; employeeId; type; label: string | null;
    expiryDate: IsoDate | null; verified: boolean; versionCount: int;
    current: DocumentVersion | null; versions?: DocumentVersion[] }`
    (`current` null means "not visible to you"; `expiryDate` is the
    current version's and always visible to whoever sees the slot).
  - `ExpiryAlert { documentId; employeeId; employeeName; type;
    expiryDate: IsoDate; daysLeft: int; status: "expired" | "due";
    stageDays: int | null }`; `AlertsQuery { withinDays?: int 0..365 }`.
  - `LeadDays` = array of 1..6 ints in 1..365, strictly descending.
  - `RetentionClass = z.enum([...DocumentType.options, "letter"])`;
    `RetentionRule { months: int 1..1200 | null; from:
    "employment-end" | "expiry" | "issue" }`; `DocumentSettings {
    leadDays: Record<DocumentType, LeadDays>; retention:
    Record<RetentionClass, RetentionRule> }` (all keys required);
    `RetentionDueItem { kind: "employee-document" | "letter"; id;
    employeeId: Id | null; retentionClass; retainUntil: IsoDate }`;
    `RetentionReport { asOf: IsoDate; due: RetentionDueItem[];
    unsetClasses: RetentionClass[]; notice: typeof RETENTION_NOTICE }`.
  - `RETENTION_NOTICE = "The PDPL text read sets no retention periods.
    Set one per class with your adviser. Nothing is deleted
    automatically."`
- `library.ts`: `LibraryCategory = z.enum(["policy","handbook","form",
  "notice","other"])`; `Audience { allStaff: boolean; departmentIds:
  Id[] (max 200); employeeIds: Id[] (max 1000); roles: Role[] }`;
  `LibraryCreate { title: 1..120; titleAr?: 1..120; category; fileId;
  audience; requiresAck: boolean }`; `LibraryVersionCreate { fileId;
  note?: 1..500; requiresAck: boolean }`; `LibraryVersion { id;
  version; file: FileRef; note: string | null; requiresAck; publishedBy;
  publishedAt }`; `MyReceipt { versionId; viewedAt: Timestamp | null;
  acknowledgedAt: Timestamp | null; statement: typeof ACK_STATEMENT }`;
  `LibraryDocument { id; title; titleAr: string | null; category;
  audience: Audience | null; current: LibraryVersion; myReceipt:
  MyReceipt | null }` (`audience` null for roles other than owner and
  hr); `AckRequest { versionId: Id }`; `ReceiptRow { employeeId;
  employeeName; status: "acknowledged" | "viewed" | "pending";
  viewedAt; acknowledgedAt }`; `ReceiptReport { documentId; versionId;
  version; rows: ReceiptRow[]; counts: { acknowledged; viewed; pending
  } }`; `ACK_STATEMENT = "I confirm that I received and read this
  document."`
- `merge-fields.ts`: `MergeFieldDef { key; kind: "text" | "date" |
  "money"; salary: boolean; source: "company" | "employee" | "salary" |
  "letter" | "issuer" | "input" }` and `MERGE_FIELDS` with exactly these
  keys (kind text unless marked; `salary` false unless marked):
  `company.name`, `company.nameAr`, `employee.fullName`,
  `employee.fullNameAr`, `employee.number`, `employee.jobTitle`,
  `employee.nationality`, `employee.department`, `employee.joiningDate`
  (date), `employee.lastWorkingDate` (date), `salary.basic` (money,
  salary), `salary.monthlyTotal` (money, salary), `letter.date` (date),
  `letter.reference`, `issuer.name`, `issuer.title` (source input),
  `input.addressee`, `input.purpose`, `input.reason`,
  `input.incidentDate` (date), `input.replyTo`, `input.candidateName`,
  `input.position`, `input.startDate` (date), `input.offerMonthlyTotal`
  (money, salary). `INPUT_KEYS` = the keys whose source is `input`.
  `PLACEHOLDER = /\{\{\s*([a-z]+\.[a-zA-Z]+)\s*\}\}/g`.
- `letters.ts`: `LetterKind = z.enum(["salary-certificate","noc",
  "experience","offer","warning"])`; `LETTER_GENERATE_ROLES:
  Record<LetterKind, readonly Role[]>` = salary-certificate, noc,
  experience, offer: `["owner","hr"]`; warning: `["owner","hr",
  "manager"]`; `KINDS_NEEDING_EMPLOYEE = ["salary-certificate","noc",
  "experience","warning"]`; `TemplateBody { title: 1..120; paragraphs:
  string 1..2000 [] (1..40) }`; `LetterTemplateCreate { kind; name:
  1..80; lang: Lang; body }`; `TemplateVersionCreate { body }`;
  `NativeReviewRequest { reviewerName: 2..80 }`; `NativeReview {
  status: "needs-native-review" | "reviewed"; reviewerName: string |
  null; reviewedAt: Timestamp | null }`; `TemplateVersion { id;
  version; status: "draft" | "published" | "superseded"; body; fields:
  string[]; usesSalary: boolean; createdBy; createdAt; publishedAt:
  Timestamp | null; nativeReview: NativeReview | null }` (null for
  English); `LetterTemplate { id; kind; name; lang; starter: boolean;
  current: TemplateVersion | null; versions?: TemplateVersion[] }`;
  `LetterRequest { templateId; employeeId?: Id; inputs:
  Record<string, string 1..500> }` refined so every key is in
  `INPUT_KEYS`; `Letter { id; kind; lang; templateId; templateVersion:
  int; employeeId: Id | null; issuedBy: Id; issuedAt; fileName; sha256;
  acknowledgedAt: Timestamp | null }`; `LettersQuery { employeeId?: Id
  }`.
- `emiratisation.ts`: `EmiratisationFlags { skilled: boolean | null;
  workPermitValid: boolean | null; paidViaWps: boolean | null;
  gpssaRegistered: boolean | null }`; `EMIRATISATION_OVERRIDABLE` (a
  literal copy of the engine's list, Task 2; Task 8 tests they match);
  `EmiratisationSettingsPut { sectorInScope: boolean | null; overrides:
  Record<string, number | string> }` refined to keys in
  `EMIRATISATION_OVERRIDABLE`; `EmiratisationSettings` = that plus
  `updatedAt: Timestamp | null`; `NotCountedReason =
  z.enum(["flags-not-entered","work-permit-not-valid",
  "not-paid-via-wps","not-gpssa-registered","below-minimum-wage"])`;
  `EmiratisationReport { asOf; checkpoint: IsoDate | null; band:
  "large" | "mid" | "none" | "unknown"; status: "on-target" |
  "below-target" | "not-applicable" | "needs-input"; headcount: int;
  skilledHeadcount: int | null; nationals: int; countedNationals: int;
  required: int | null; shortfall: int | null; notCounted: {
  employeeId; reasons: NotCountedReason[] }[]; missingInputs: string[];
  missingParams: string[]; fineExposure: Money | null; fineNote: string
  | null; trace: TraceLine[]; disclaimer: string }`;
  `EmiratisationQuery { asOf?: IsoDate }`.
- `routes-documents.ts`: `DOCUMENT_ROUTES: readonly RouteDef[]`, exactly
  these 35 (id, method, path, roles; "all" = the four roles):
  - `fileUpload` POST `/v1/files` all, `bodyKind: "binary"`, query
    `FileUploadQuery`, 201 `FileRef`.
  - `employeeDocumentsList` GET `/v1/employees/{id}/documents` all;
    `employeeDocumentCreate` POST same path owner, hr, employee;
    `employeeDocumentGet` GET `/v1/employee-documents/{id}` all;
    `employeeDocumentVersionAdd` POST `/v1/employee-documents/{id}/
    versions` owner, hr, employee; `employeeDocumentVerify` POST
    `/v1/employee-documents/{id}/verify` owner, hr;
    `employeeDocumentDownload` GET `/v1/employee-documents/{id}/
    versions/{versionId}/download` owner, hr, employee, octet-stream;
    `documentAlerts` GET `/v1/document-alerts` all;
    `documentSettingsGet` GET `/v1/document-settings` owner, hr;
    `documentSettingsPut` PUT `/v1/document-settings` owner;
    `documentRetentionDue` GET `/v1/document-retention` owner, hr.
  - `libraryList` GET `/v1/library` all; `libraryCreate` POST
    `/v1/library` owner, hr; `libraryGet` GET `/v1/library/{id}` all;
    `libraryVersionAdd` POST `/v1/library/{id}/versions` owner, hr;
    `libraryAudiencePut` PUT `/v1/library/{id}/audience` owner, hr;
    `libraryDownload` GET `/v1/library/{id}/download` all,
    octet-stream; `libraryAcknowledge` POST `/v1/library/{id}/
    acknowledge` all; `libraryReceipts` GET `/v1/library/{id}/receipts`
    owner, hr.
  - `letterFields` GET `/v1/letter-fields` owner, hr, manager;
    `letterTemplatesList` GET `/v1/letter-templates` owner, hr, manager;
    `letterTemplateCreate` POST `/v1/letter-templates` owner, hr;
    `letterTemplateGet` GET `/v1/letter-templates/{id}` owner, hr,
    manager; `letterTemplateVersionAdd` POST `/v1/letter-templates/{id}/
    versions` owner, hr; `letterTemplatePublish` POST
    `/v1/letter-templates/{id}/versions/{versionId}/publish` owner, hr;
    `letterTemplateNativeReview` POST `/v1/letter-templates/{id}/
    versions/{versionId}/native-review` owner; `letterPreview` POST
    `/v1/letters/preview` owner, hr, manager, `application/pdf`, 200;
    `letterIssue` POST `/v1/letters` owner, hr, manager, 201;
    `lettersList` GET `/v1/letters` all; `letterGet` GET
    `/v1/letters/{id}` all; `letterDownload` GET `/v1/letters/{id}/
    download` all, `application/pdf`; `letterAcknowledge` POST
    `/v1/letters/{id}/acknowledge` all.
  - `emiratisationReport` GET `/v1/emiratisation` owner, hr;
    `emiratisationSettingsPut` PUT `/v1/emiratisation/settings` owner;
    `employeeEmiratisationPut` PUT `/v1/employees/{id}/emiratisation`
    owner, hr.
  - Responses: lists are bare arrays; create, get, verify and version
    routes return the entity; alerts `ExpiryAlert[]`; settings
    `DocumentSettings`; retention `RetentionReport`; acknowledge routes
    `MyReceipt` (library) and `Letter` (letter); receipts
    `ReceiptReport`; letter fields `MergeFieldDef[]`; emiratisation
    `EmiratisationReport`, `EmiratisationSettings`,
    `EmiratisationFlags`.
- `errors.ts` adds (status): `FILE_EMPTY` 400, `MALFORMED_PLACEHOLDER`
  422, `FILE_TOO_LARGE` 413, `FILE_TYPE_NOT_ALLOWED` 415,
  `FILE_NOT_AVAILABLE` 409, `DOCUMENT_SLOT_EXISTS` 409,
  `VERSION_NOT_CURRENT` 409, `VERSION_NOT_DRAFT` 409,
  `TEMPLATE_NOT_PUBLISHED` 409, `UNKNOWN_MERGE_FIELD` 422,
  `MERGE_VALUE_MISSING` 422, `ARABIC_NOT_REVIEWED` 422,
  `NOT_ARABIC_TEMPLATE` 422, `EMPLOYEE_REQUIRED` 422,
  `OVERRIDE_NOT_ALLOWED` 422, `SALARY_LETTER_NEEDS_HR` 403.
- `openapi.ts`: a binary route's request body is
  `application/octet-stream` with `{ type: "string", format: "binary"
  }`; a `contentType` route's 200 or 201 response uses that media type
  with the same schema.

- [ ] **Step 1: Write the failing tests**

`documents-schemas.test.ts`: `EmployeeDocumentCreate` for `passport`
without `expiryDate` fails with path `["expiryDate"]`; `expiryDate
"2026-01-01"` with `issueDate "2026-02-01"` fails; `contract` without
expiry passes; `DocumentNumber` accepts `"P123/45"` and rejects
`"<b>"`; `LeadDays` rejects `[30, 60]`, `[30, 30]`, `[]`, `[400]` and
accepts `[90, 30, 7]`; `Audience` with 1001 employee ids fails;
`TemplateBody` with 41 paragraphs fails; `LetterRequest` with `inputs:
{ "salary.basic": "1" }` fails and with `{ "input.purpose": "Bank" }`
passes; `MERGE_FIELDS` keys are unique and match `^[a-z]+\.[a-zA-Z]+$`;
every `salary: true` field has kind `money`; `LETTER_GENERATE_ROLES[
"salary-certificate"]` deep-equals `["owner","hr"]`; `ACK_STATEMENT`
and `RETENTION_NOTICE` equal the exact strings above; no exported
string constant in `files.ts`, `documents.ts`, `library.ts`,
`letters.ts` matches `/\bsign|binding|compliant/i`; every new value in
`EXAMPLES` parses against its schema.

`routes.test.ts` (modify): replace the single count line with
`CORE_ROUTES.length === 49`, `DOCUMENT_ROUTES.length === 35` and
`ROUTES` deep-equals `[...CORE_ROUTES, ...DOCUMENT_ROUTES]`; ids and
`(method, path)` stay unique across `ROUTES`; routes with `bodyKind
"binary"` are exactly `["fileUpload"]`; routes with `contentType
"application/pdf"` are exactly `["letterPreview","letterDownload"]`;
with `"application/octet-stream"` exactly
`["employeeDocumentDownload","libraryDownload"]`; every
`DOCUMENT_ROUTES` entry has `auth: "tenant"`.

`openapi.test.ts` (add): operation `fileUpload` has request content
`application/octet-stream`; `letterDownload` has a 200 response with
content `application/pdf`; operation count still equals
`ROUTES.length`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/contract test`. Expected:
  FAIL, modules not found.
- [ ] **Step 3: Implement** the files above. `EXAMPLES` gets one valid
  example per new response schema, with obviously fake values
  (`"P0000000"`, `"Example Policy"`).
- [ ] **Step 4: Run** `pnpm --filter @payroll/contract test` and
  `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(contract): documents, letters and
  Emiratisation schemas`.

### Task 2: Emiratisation rule-pack and pure tracker (engine)

Statutory values: this task keeps per-task review.

**Files:**
- Create: `packages/engine/src/rules/emiratisation-pack.ts`,
  `src/emiratisation/types.ts`, `src/emiratisation/count.ts`,
  `src/emiratisation/compute.ts`
- Modify: `packages/engine/src/sources.ts` (add one id),
  `src/index.ts` (export the new modules)
- Test: `packages/engine/tests/emiratisation-pack.test.ts`,
  `tests/emiratisation.test.ts`

**Interfaces:**
- Consumes: `RulePack`, `ParamValue`, `selectPack`, `requireParam`,
  `deepFreeze`, `sourceOf`, `EngineError`, `TraceLine`, `Fils`,
  `assertIsoDate` (existing engine modules).
- Produces:
  - Source id `RESEARCH_EMIRATISATION` = `{ url: "", note:
    "docs/research/2026-11-25-gpssa-emiratisation-nafis.md, snippet
    level; primary MOHRE text not read" }`.
  - `EMIRATISATION_PACKS: readonly RulePack[]`: one pack, id
    `ae-emiratisation`, version `2026-11-26`, effectiveFrom
    `2025-01-01`, effectiveTo `2027-01-01`, `deepFreeze`d, with exactly
    these params (value, status; source `RESEARCH_EMIRATISATION` for
    `secondary`, `ENGINE_CONVENTION` for `convention`, `null` for
    `unsourced`):

    | Key | Value | Status |
    |---|---|---|
    | `bandLargeMinHeadcount` | 50 | secondary |
    | `bandMidMinHeadcount` | 20 | secondary |
    | `largeCheckpoints` | `"06-30,12-31"` | secondary |
    | `midCheckpoints` | `"12-31"` | convention |
    | `largeTargetBps_2025-06-30` | null | unsourced |
    | `largeTargetBps_2025-12-31` | 800 | convention |
    | `largeTargetBps_2026-06-30` | null | unsourced |
    | `largeTargetBps_2026-12-31` | 1000 | secondary |
    | `largeRequiredRounding` | null | unsourced |
    | `largeCountSkilledNationalsOnly` | true | convention |
    | `midRequired_2025-12-31` | 2 | secondary |
    | `midRequired_2026-12-31` | null | unsourced |
    | `minWageFils` | 600000 | secondary |
    | `minWageCountingFrom` | `"2026-07-01"` | secondary |
    | `minWageBase` | `"recurring-monthly-total"` | convention |
    | `finePerPostPerYear_2025` | 10800000 | secondary |
    | `finePerPostPerYear_2026` | null | unsourced |

    Each param's source note (or a comment for unsourced ones) says
    why: 800 is derived from "up 2% a year to 10% by end 2026"; the
    half-year steps, rounding and the 2026 mid-band figure are not in
    the note; the 2026 fine is "unresolved: AED 9,000 or 10,000 a month
    in the sources".
  - `EMIRATISATION_OVERRIDABLE = ["largeTargetBps_2025-06-30",
    "largeTargetBps_2026-06-30","largeRequiredRounding",
    "midRequired_2026-12-31","finePerPostPerYear_2026"] as const`.
  - `FINE_2026_NOTE = "The 2026 fine per unfilled post is unresolved:
    sources give AED 9,000 and AED 10,000 a month. Enter a figure to see
    an estimate."`; `EMIRATISATION_DISCLAIMER = "Planning estimate from
    secondary sources. Not legal advice. Confirm targets and counting
    rules with MOHRE."`
  - `types.ts`: `EmiratisationEmployee { employeeId: string;
    isUaeNational: boolean; joiningDate: string; lastWorkingDate: string
    | null; skilled: boolean | null; workPermitValid: boolean | null;
    paidViaWps: boolean | null; gpssaRegistered: boolean | null;
    monthlyWage: Fils | null }`; `EmiratisationInput { asOf: string;
    sectorInScope: boolean | null; employees: EmiratisationEmployee[]
    }`; `EmiratisationResult` = the contract's `EmiratisationReport`
    with `fineExposure: Fils | null` (types restated in the engine; no
    contract import).
  - `count.ts`: `activeOn(e, asOf): boolean` (joined on or before
    `asOf`, and no last working date or one on or after `asOf`);
    `notCountedReasons(e, asOf, minWage: bigint, countingFrom: string):
    NotCountedReason[]` (empty means counted; any null flag gives only
    `flags-not-entered`; otherwise one reason per false flag, in the
    enum's order, plus `below-minimum-wage` when `asOf >= countingFrom`
    and `monthlyWage` is null or below `minWage`).
  - `compute.ts`: `computeEmiratisation(input: EmiratisationInput,
    packs?: readonly RulePack[], overrides?: Record<string,
    ParamValue>): EmiratisationResult`. Throws only `INVALID_DATE` (bad
    `asOf`) and `NO_PACK_FOR_DATE`. Unsourced params never throw out of
    it: a small `tryParam` returns null and adds the key to
    `missingParams`.
- Rules inside `computeEmiratisation`:
  1. Headcount = employees `activeOn(asOf)`. Band: `>= 50` large;
     `20..49` mid when `sectorInScope` is true, `unknown` when null
     (status `needs-input`, `missingInputs` `["sectorInScope"]`),
     `none` when false; `< 20` none. `none` gives `not-applicable`.
  2. Checkpoint = the first date of the band's checkpoint list in
     `asOf`'s year on or after `asOf`.
  3. Large: any active employee with `skilled` null adds
     `"skilled:<employeeId>"` to `missingInputs` and the status is
     `needs-input`. `skilledHeadcount` = active and skilled. Required
     = `skilledHeadcount * bps / 10000` rounded by
     `largeRequiredRounding` (`"FLOOR" | "HALF_UP" | "CEIL"`).
     Counted nationals = active UAE nationals with no reasons, and
     skilled when `largeCountSkilledNationalsOnly`.
  4. Mid: required = `midRequired_<checkpoint>`; counted nationals as
     above without the skilled condition.
  5. Missing target or rounding: `required` and `shortfall` null,
     status `needs-input`; counts are still reported.
  6. Otherwise `shortfall = max(0, required - counted)`; status
     `on-target` when 0, else `below-target`. Fine: shortfall 0 gives
     `0n`; else `shortfall * finePerPostPerYear_<checkpoint year>`;
     when that param is missing, `fineExposure` null and `fineNote`
     `FINE_2026_NOTE`.
  7. Trace lines (ids): `emiratisation.headcount`, `.band`, `.skilled`,
     `.required`, `.counted`, `.fine`, each with its rules
     (`overridden` true for overrides).

- [ ] **Step 1: Write the failing tests**

`emiratisation-pack.test.ts`: the pack's param keys equal the table's
17 keys; every `unsourced` param has value null and source null;
no param has status `official`; the unsourced keys sorted equal
`EMIRATISATION_OVERRIDABLE` sorted; `selectPack(EMIRATISATION_PACKS,
"2024-12-31")` throws `NO_PACK_FOR_DATE`; the pack is frozen.

`emiratisation.test.ts` (builders in the file; "N skilled" means N
active employees with `skilled: true`; a counted national has all
three flags true and wage 700000n):
- `large_on_target`: asOf `2026-12-01`, 60 active, 40 skilled of whom
  4 are counted nationals, override `largeRequiredRounding: "FLOOR"`:
  checkpoint `2026-12-31`, band `large`, required 4, counted 4, status
  `on-target`, shortfall 0, `fineExposure` 0n.
- `large_needs_rounding`: the same without overrides: status
  `needs-input`, `missingParams` `["largeRequiredRounding"]`, required
  null, `countedNationals` 4.
- `fine_2026_unsourced_does_not_throw` (Review Focus): 3 counted of 4
  required (FLOOR): status `below-target`, shortfall 1, `fineExposure`
  null, `fineNote` equals `FINE_2026_NOTE`.
- `fine_2026_override`: plus `finePerPostPerYear_2026: 12000000`:
  `fineExposure` 12000000n and the `.fine` trace rule `overridden`.
- `checkpoint_2025`: asOf `2025-08-01`, 40 skilled, 1 counted, FLOOR:
  checkpoint `2025-12-31`, required 3, shortfall 2, `fineExposure`
  21600000n; the `.required` trace rule status is `convention`.
- `mid_band`: 30 active, asOf `2025-10-01`, `sectorInScope` true:
  band `mid`, required 2; `sectorInScope` null: band `unknown`,
  `needs-input`, `missingInputs` `["sectorInScope"]`; false:
  `not-applicable`.
- `under_20`: 19 active: band `none`, `not-applicable`, no throw.
- `not_counted_reasons`: a national with `paidViaWps` false gives
  `["not-paid-via-wps"]`; with `gpssaRegistered` null gives
  `["flags-not-entered"]`.
- `min_wage_cutoff`: a national paid 550000n is counted on `2026-06-15`
  and on `2026-07-01` has `["below-minimum-wage"]`.
- `leaver_excluded` (Review Focus 2): last working date `2026-05-31`
  is not in headcount on `2026-06-01` and is on `2026-05-31`.
- `skilled_null_needs_input`: large band with one `skilled: null`:
  `missingInputs` contains `"skilled:<that id>"`.
- `asof_out_of_range`: `2024-06-01` throws `NO_PACK_FOR_DATE`.
- property (fast-check, 100 runs, 0 to 120 random employees):
  `countedNationals <= nationals`; `required` null or `<=
  skilledHeadcount` (large) ; the function never throws for asOf in
  2025 or 2026.

- [ ] **Step 2: Run** `pnpm --filter @payroll/engine test
  emiratisation`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above. Rounding uses the engine's
  existing integer division helpers; no floating point.
- [ ] **Step 4: Run** `pnpm --filter @payroll/engine test` and `pnpm
  check`. Expected: PASS (the purity test covers the new `src/` files).
- [ ] **Step 5: Commit** `feat(engine): Emiratisation pack and tracker`.

### Task 3: File storage, binary routes and upload

Security and tenancy: this task keeps per-task review.

**Files:**
- Create: `packages/api/src/files/sniff.ts`, `src/files/names.ts`,
  `src/files/files.ts`, `src/http/binary.ts`, `src/routes/files.ts`,
  `packages/api/migrations/070_files.sql`
- Modify: `src/crypto/keyring.ts` (byte methods), `src/audit/audit.ts`
  (`SENSITIVE_KEYS`), `src/app.ts` and `src/http/validate.ts` (binary
  bodies and responses in `register`), `tests/helpers/test-app.ts`
  (`upload` helper)
- Test: `packages/api/tests/keyring-bytes.test.ts`,
  `tests/file-name.test.ts`, `tests/files.test.ts`

**Interfaces:**
- Consumes: Plan 3 `register`, `ReqCtx`, `ApiError`, `withTenant`,
  `Keyring`, `appendAudit`, `sha256Hex`; Task 1 `FileRef`,
  `MAX_UPLOAD_BYTES`, `AllowedMime`.
- Produces:
  - `Keyring.encryptBytes(dekWrapped: string, aad: string, plain:
    Uint8Array): Uint8Array` and `decryptBytes(dekWrapped, aad, cipher:
    Uint8Array): Uint8Array` (AES-256-GCM; layout `0x01 | iv(12) |
    tag(16) | ct`).
  - `sniffMime(bytes: Uint8Array): AllowedMime | null`: `%PDF-` at
    offset 0, the 8-byte PNG signature, or `FF D8 FF`.
  - `safeFileName(name: string): string`: (1) remove U+0000 to U+001F
    and U+007F; (2) replace `/`, `\` and `"` with `_`; (3) trim spaces
    and dots at both ends; (4) cut to 200 code points; (5) empty gives
    `"file"`.
  - `contentDisposition(name: string): string` =
    `attachment; filename="<ascii>"; filename*=UTF-8''<pct>` where
    `ascii` replaces every character outside `[A-Za-z0-9._ -]` with
    `_` and `pct` is `encodeURIComponent` with `'()*` also encoded.
  - Migration 070: `files(id, company_id, name, mime, size, sha256,
    uploaded_by, uploaded_at, attached_to text null)` and
    `file_blobs(file_id pk, company_id, cipher bytea)`, RLS forced on
    both, grants select and insert (and update of `attached_to`).
  - `storeFile(ctx: ReqCtx, name: string, bytes: Uint8Array):
    Promise<FileRef>`; `claimFile(ctx, fileId: string, attachTo:
    string): Promise<FileRef>` (marks `attached_to`; 409
    `FILE_NOT_AVAILABLE` when already attached or uploaded by another
    user; 404 `NOT_FOUND` when not visible); `readFile(ctx, fileId):
    Promise<{ ref: FileRef; bytes: Uint8Array }>` (checks the stored
    sha256 after decrypting).
  - `BinaryResult { kind: "binary"; bytes: Uint8Array; fileName:
    string }`; `register` sends it with the route's `contentType` and
    the headers in Global Constraints. Binary-body routes read the
    body under Hono's `bodyLimit` (`MAX_UPLOAD_BYTES`, 413
    `FILE_TOO_LARGE` before buffering past the limit) and put a
    `Uint8Array` in `ctx.body`.
  - `POST /v1/files`: empty body 400 `FILE_EMPTY`; unknown magic 415
    `FILE_TYPE_NOT_ALLOWED`; stores with `safeFileName(query.name)`;
    audit `file.uploaded` `data: { fileId, mime, size }`.
  - `SENSITIVE_KEYS` adds `"documentNumber"`, `"inputs"`,
    `"mergeValues"`, `"bytes"`.
  - `test-app.ts`: `upload(app, token, companyId, name, bytes):
    Promise<FileRef>` and `fakePdf(marker: string): Uint8Array` (bytes
    of `"%PDF-1.4\n% " + marker + "\n%%EOF\n"`).

- [ ] **Step 1: Write the failing tests**

`keyring-bytes.test.ts`: round trip of 1 MiB of bytes; wrong AAD
throws; another company's DEK throws; first byte of the cipher is
`0x01`; two encryptions differ.

`file-name.test.ts` (Review Focus 3): `safeFileName("../../etc/passwd")`
is `"_.._etc_passwd"`; `safeFileName('a"b\r\nc.pdf')` is `"a_bc.pdf"`;
`safeFileName("  ...  ")` is `"file"`; a 300-character name gives 200
code points; `contentDisposition("جواز.pdf")` equals `attachment;
filename="____.pdf"; filename*=UTF-8''%D8%AC%D9%88%D8%A7%D8%B2.pdf`;
`contentDisposition("it's (1).pdf")` contains `%27s%20%281%29.pdf`; no
output contains CR or LF.

`files.test.ts`: upload of `fakePdf("x")` gives 201 with `mime
"application/pdf"`, `size` and `sha256` of the bytes;
`files_sniff_ignores_client_type` (Review Focus 5): `<html>` bytes and
an SVG sent with `Content-Type: application/pdf` give 415, and PNG bytes
sent as `text/plain` give 201 `image/png`; empty body 400 `FILE_EMPTY`;
`MAX_UPLOAD_BYTES + 1` bytes give 413 `FILE_TOO_LARGE` and exactly
`MAX_UPLOAD_BYTES` give 201; the `file_blobs.cipher` column of an upload
containing the marker `SENTINEL-FILE` does not contain that marker;
`readFile` under company B's tenant for A's file id gives 404, and
`decryptBytes` with B's DEK on A's cipher throws; `claimFile` twice
gives 409 `FILE_NOT_AVAILABLE`; a file uploaded by the employee and
claimed by hr gives 409; the `file.uploaded` audit `data` has no file
name; a log line never contains the marker.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `pnpm --filter @payroll/api test` and `pnpm check`.
  Expected: PASS (the RLS catalog test now covers `files` and
  `file_blobs`).
- [ ] **Step 5: Commit** `feat(api): encrypted file storage and upload`.

### Task 4: Employee document vault, expiry alerts, settings, retention

**Files:**
- Create: `packages/api/src/documents/employee-docs.ts`,
  `src/documents/redact.ts`, `src/documents/expiry.ts`,
  `src/documents/expiry-defaults.ts`, `src/documents/settings.ts`,
  `src/documents/retention.ts`, `src/routes/employee-documents.ts`,
  `src/routes/document-settings.ts`,
  `migrations/071_employee_documents.sql`
- Modify: `tests/helpers/seed.ts` (`seedDocuments`; sentinel document
  numbers), `tests/leak.test.ts` (`mayView` rows for document routes)
- Test: `packages/api/tests/expiry.test.ts`, `tests/retention.test.ts`,
  `tests/employee-documents.test.ts`

**Interfaces:**
- Consumes: Task 3 `claimFile`, `readFile`, `BinaryResult`; Plan 3
  `viewerScope`, `loadEmployee`, `dubaiDate`, `appendAudit`; Task 1
  schemas.
- Produces:
  - Migration 071: `employee_documents(id, company_id, employee_id,
    type, label, created_at)` with a partial unique index on
    `(company_id, employee_id, type) WHERE type <> 'other'`;
    `employee_document_versions(id, company_id, document_id, version,
    file_id, number_enc, issue_date, expiry_date, uploaded_by,
    uploaded_at, verified_by, verified_at, unique(document_id,
    version))`; `document_settings(company_id pk, lead_days jsonb,
    retention jsonb, updated_at)`. `number_enc` AAD
    `"<companyId>:employee_document_versions:number:<versionId>"`.
  - `DEFAULT_LEAD_DAYS: Record<DocumentType, number[]>` = `[60, 30, 7]`
    for every type (`convention`: a company preference, not law; the
    file says so). `DEFAULT_RETENTION` = `{ months: null, from:
    "employment-end" }` for every class.
  - `loadSettings(tx, companyId): Promise<DocumentSettings>` (stored
    row merged over the defaults).
  - `daysBetween(from: string, to: string): number` (calendar days,
    `to - from`).
  - `expiryAlerts(items: { documentId; employeeId; employeeName; type;
    expiryDate: string | null }[], leadDays: Record<DocumentType,
    number[]>, today: string, withinDays?: number): ExpiryAlert[]`:
    no expiry or `daysLeft > max(leadDays[type])` gives nothing;
    `daysLeft < 0` is `expired` with `stageDays` null; else `due` with
    `stageDays` the smallest lead day `>= daysLeft`; `withinDays`
    drops `due` rows above it (expired rows stay); sorted by
    `daysLeft`, then `employeeName`, then `documentId`.
  - `addMonths(date: string, months: number): string` (clamps to the
    month's last day); `retainUntil(rule: RetentionRule, anchors: {
    employmentEnd: string | null; expiry: string | null; issue: string
    }): string | null` (null when `months` is null or the anchor is
    null); `retentionDue(items: { kind; id; employeeId; retentionClass;
    retainUntil: string | null }[], today): RetentionDueItem[]`
    (`retainUntil <= today`, sorted by date then id).
  - `toDocumentView(row, viewer: { role; employeeId }, withVersions:
    boolean): EmployeeDocument`: owner, hr and the employee themself get
    `current` and versions with `documentNumber`; a manager of the
    employee gets `current: null`, no `versions`, and still `type`,
    `label`, `expiryDate`, `verified`, `versionCount`. Anyone else never
    reaches it (404 earlier).
  - Behaviour: create and add-version claim the file; the employee
    role may create or add versions only for their own employee id
    (other ids 404); a version is unverified until owner or hr verifies
    the current version; adding a version locks the slot row `FOR
    UPDATE` and takes `max(version) + 1`; download allowed for owner,
    hr and self (others 404) and returns the stored bytes as
    `BinaryResult`; alerts use only each slot's current version and
    skip employees with status `left` or a `lastWorkingDate` before
    today; the manager's alerts cover direct reports, the employee's
    their own.
  - `PUT /v1/document-settings` stores the full object; audit
    `document.settings.updated` `data.changed` = dotted keys that
    changed (`"leadDays.passport"`, `"retention.visa"`), sorted.
  - `GET /v1/document-retention`: employee documents only in this task
    (Task 7 adds letters); anchors: `employment-end` = the employee's
    `lastWorkingDate`, `expiry` = current version expiry, `issue` = the
    current version's upload date in Dubai; `unsetClasses` = classes
    whose `months` is null; `notice` = `RETENTION_NOTICE`.
  - Audit: `document.created` (`data: { documentId, type, version: 1
    }`), `document.version.added`, `document.verified`,
    `document.downloaded`.
  - `seed.ts`: `SENTINELS[employeeId].documentNumber` (`"P7777001"`,
    `"P7777002"` and so on); `seedDocuments(app, seeded)` gives every
    seeded employee a passport with that number, expiry
    `2026-12-20`, and a file `fakePdf(<documentNumber>)`.

- [ ] **Step 1: Write the failing tests**

`expiry.test.ts` (pure; leadDays `[60, 30, 7]` everywhere, today
`2026-11-26`): `daysBetween("2026-11-26","2026-12-01")` is 5; expiry
`2026-11-26` gives `due`, `daysLeft` 0, `stageDays` 7; `2026-11-25`
gives `expired`, -1, null; `2026-12-26` gives `due` 30 with stage 30;
`2026-12-27` gives stage 60; `2027-01-25` (60 days) is `due`;
`2027-01-26` (61) is absent; null expiry is absent; `withinDays: 7`
keeps the expired row and the 0-day row only; order is by `daysLeft`
then name.

`retention.test.ts` (pure): `addMonths("2026-01-31", 1)` is
`"2026-02-28"`; `addMonths("2024-02-29", 12)` is `"2025-02-28"`;
`retainUntil({ months: 24, from: "employment-end" }, { employmentEnd:
"2024-10-31", expiry: null, issue: "2024-01-01" })` is `"2026-10-31"`;
`months: null` gives null; employment-end with no end date gives null;
`retentionDue` keeps `2026-11-26` and drops `2026-11-27` for today
`2026-11-26`.

`employee-documents.test.ts` (clock at `2026-11-26T08:00:00Z`):
- hr creates a passport for the employee; self GET shows
  `current.documentNumber`; the manager of that employee gets
  `current: null` with `expiryDate` set; the other employee gets 404;
  manager download 404; self download returns the uploaded bytes with
  `Content-Disposition` starting `attachment;` and
  `X-Content-Type-Options: nosniff`.
- a second passport slot gives 409 `DOCUMENT_SLOT_EXISTS`; two
  `other` slots both give 201.
- `renewal_clears_alert` (Review Focus 1): passport expiring
  `2026-12-01` is in `GET /v1/document-alerts`; after adding version 2
  expiring `2031-12-01` it is absent; `versionCount` 2; hr can still
  download version 1.
- the employee creates their own visa (201, `verified` false); hr
  verify sets `verifiedBy`; employee verify gives 403 `FORBIDDEN`;
  employee posting to a colleague's id gives 404.
- reusing a claimed `fileId` gives 409 `FILE_NOT_AVAILABLE`.
- `alerts_exclude_leavers` (Review Focus 2): a left employee's expired
  passport is not in the hr alert list.
- the manager's alert list covers only reports and its body contains no
  `documentNumber` key; the employee's covers only self.
- owner puts passport lead days `[180, 90, 30]`: a passport 120 days out
  appears with stage 180; hr PUT gives 403; the audit row's
  `data.changed` is `["leadDays.passport"]`.
- retention: default report has `unsetClasses` with all seven classes
  and `due` `[]`; after setting `passport` to `{ months: 24, from:
  "employment-end" }`, a passport of an employee whose last working
  date is `2024-10-31` is due with `retainUntil "2026-10-31"`; an active
  employee's is not; the row count of `employee_documents` is unchanged.
- no audit row's `data` text contains any sentinel document number;
  `number_enc` contains none either.
- company B's owner with A's document id gets 404.

`leak.test.ts` (modify): `mayView` lets owner, hr and self see an
employee's document routes, alerts and downloads; the body check also
covers `SENTINELS[...].documentNumber`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `pnpm --filter @payroll/api test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): employee documents and expiry
  alerts`.

<!-- TASKS 5-8 -->
