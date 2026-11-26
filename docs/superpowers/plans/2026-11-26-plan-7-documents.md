# Plan 7: Documents, Letters and Emiratisation Implementation Plan

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
new migrations, services and route files in the API. File metadata
sits in a tenant table under row-level security; the bytes are
encrypted with the company data key and kept in Plan 6's `BlobStore`,
reachable only through that row. Letters are merged from whitelisted
fields in one pure pass into escaped HTML and printed to PDF by
headless Chrome (puppeteer-core) behind a `PdfRenderer` interface, with
scripts and network off. Emiratisation numbers live in a new engine
rule-pack (`ae-emiratisation`); a pure engine function computes the
report and the API only gathers inputs.

**Tech Stack:** Plan 3's stack (Node 22, TypeScript 7.0.2, zod 4.6.7,
Hono 4.13.17, pglite 0.5.16, pg 8.23.1, Vitest 5.1.2, fast-check
4.11.0), plus puppeteer-core 25.16.0 driving a system Chrome or
Chromium (`CHROME_PATH`), dejavu-fonts-ttf 2.37.3 (font embedded in the
HTML) and pdfjs-dist 6.4.299 (dev, tests only). All pinned exactly.

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

**Shared pieces with Plans 6 and 8 (drafted in parallel):** Plan 6
(`2026-11-26-plan-6-expenses.md`) owns `RouteDef.contentType: "binary"`
(raw bytes served with the stored type), `RouteDef.bodyLimit`, the
`PAYLOAD_TOO_LARGE` error and the `BlobStore` port (`src/storage/
blob.ts`, `memoryBlobStore`, `fsBlobStore`, `AppDeps.blobs`, Plan 6
Tasks 1 and 3). Plan 7 uses them. If Plan 6 is not merged when Plan 7
Task 1 or 3 starts, add exactly those pieces with Plan 6's names,
paths and signatures (copy them from Plan 6's plan), so the second plan
to merge finds one copy. Plan 8 also renames Plan 3's route list to
`CORE_ROUTES`; whichever plan lands first does the rename. Plan 8's
offers are records, not letters; its "issue experience letter" exit
task can call this plan's letters later.

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
- Uploads: type by magic bytes only (PDF, PNG, JPEG); the file name
  never decides the type; at most `MAX_UPLOAD_BYTES = 10485760`
  decoded bytes.
- File bytes are encrypted with the company DEK (AAD
  `"<companyId>:files:blob:<fileId>"`) and stored in `deps.blobs` under
  key `<companyId>/files/<fileId>`; the key is read only from a `files`
  row seen through RLS. Downloads are `Content-Disposition: attachment`
  with `X-Content-Type-Options: nosniff`, `Content-Security-Policy:
  sandbox` and `Cache-Control: no-store`.
- Letter HTML: every merged value is HTML-escaped; the page carries
  `CSP_META` (Task 7); Chrome runs with JavaScript off and every request
  that is not a `data:` URL aborted.
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
4. A merge value typed by a user that contains `{{salary.basic}}` or
   HTML such as `<img src="http://...">` (an addressee, a warning
   reason): inserted literally and escaped, never expanded or fetched,
   so a manager's warning letter can never carry a salary and the
   renderer makes no request (Task 6 `merge_is_single_pass`, Task 7
   `html_escapes_values` and `manager_input_not_expanded`).
5. An upload named `policy.pdf` whose bytes are HTML, SVG or an
   executable: refused with 415 by byte sniffing (Task 3
   `files_sniff_ignores_name`).

## File Structure

New files unless marked; API paths are under `packages/api/`.

- Contract (Task 1): `packages/contract/src/files.ts`, `documents.ts`,
  `library.ts`, `letters.ts`, `merge-fields.ts`, `emiratisation.ts`,
  `routes-documents.ts`; modify `routes.ts`, `errors.ts`,
  `examples.ts`, `openapi.ts`, `index.ts`.
- Engine (Task 2): `packages/engine/src/rules/emiratisation-pack.ts`,
  `src/emiratisation/types.ts`, `count.ts`, `compute.ts`; modify
  `src/sources.ts`, `src/index.ts`.
- Files (Task 3): `src/files/sniff.ts`, `names.ts`, `files.ts`,
  `src/routes/files.ts`; modify `src/crypto/keyring.ts`,
  `src/audit/audit.ts`, `src/storage/fs-blob.ts` (Plan 6), `src/app.ts`.
- Employee documents (Task 4): `src/documents/employee-docs.ts`,
  `redact.ts`, `expiry.ts`, `expiry-defaults.ts`, `settings.ts`,
  `retention.ts`, `src/routes/employee-documents.ts`,
  `src/routes/document-settings.ts`.
- Library (Task 5): `src/library/audience.ts`, `library.ts`,
  `receipts.ts`, `src/routes/library.ts`.
- Letters (Tasks 6, 7): `src/letters/merge.ts`, `starters.ts`,
  `starters-ar.ts`, `templates.ts`, `values.ts`, `letters.ts`,
  `sample.ts`, `src/pdf/renderer.ts`, `src/pdf/letter-html.ts`,
  `src/routes/letter-templates.ts`, `src/routes/letters.ts`.
- Emiratisation (Task 8): `src/emiratisation/report.ts`,
  `src/routes/emiratisation.ts`.
- Migrations: `migrations/070_files.sql` to `075_emiratisation.sql`.

---

### Task 1: Contract additions (schemas, routes, errors, OpenAPI)

Mergeable on its own; a later web plan builds screens from it.

**Files:**
- Create in `packages/contract/src/`: `files.ts`, `documents.ts`,
  `library.ts`, `letters.ts`, `merge-fields.ts`, `emiratisation.ts`,
  `routes-documents.ts`
- Modify: `routes.ts` (rename the Plan 3 array to `CORE_ROUTES` unless
  Plan 8 already did; append `...DOCUMENT_ROUTES` to `ROUTES`; add
  Plan 6's `RouteDef` fields if absent), `errors.ts`, `examples.ts`,
  `openapi.ts`, `index.ts`
- Modify: `packages/contract/tests/routes.test.ts`,
  `tests/openapi.test.ts`
- Test: `packages/contract/tests/documents-schemas.test.ts`

**Interfaces (Produces; all exported from `index.ts`):**
- `RouteDef`: Plan 6's `contentType: "binary"` (a `GET` returning raw
  bytes with their stored type; `response` is `z.any()`) and
  `bodyLimit?: number` are used as they are. Methods stay `GET | POST |
  PUT | PATCH`.
- `files.ts`: `MAX_UPLOAD_BYTES = 10485760`; `FILE_BODY_LIMIT =
  14200000` (base64 of the maximum plus JSON); `AllowedMime =
  z.enum(["application/pdf","image/png","image/jpeg"])`; `FileUpload {
  name: string 1..200; contentBase64: string }`; `FileRef { id; name:
  string 1..200; mime: AllowedMime; size: int 1..MAX_UPLOAD_BYTES;
  sha256: ^[0-9a-f]{64}$; uploadedAt: Timestamp }`.
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
  }`; `LetterPreview { fileName; contentBase64: string; watermark:
  typeof PREVIEW_WATERMARK }`; `PREVIEW_WATERMARK = "PREVIEW - NOT
  ISSUED"`.
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
  - `fileUpload` POST `/v1/files` all, body `FileUpload`, `bodyLimit:
    FILE_BODY_LIMIT`, 201 `FileRef`.
  - `employeeDocumentsList` GET `/v1/employees/{id}/documents` all;
    `employeeDocumentCreate` POST same path all (the handler limits
    managers and employees to their own employee id);
    `employeeDocumentGet` GET `/v1/employee-documents/{id}` all;
    `employeeDocumentVersionAdd` POST `/v1/employee-documents/{id}/
    versions` all (same self rule); `employeeDocumentVerify` POST
    `/v1/employee-documents/{id}/verify` owner, hr;
    `employeeDocumentDownload` GET `/v1/employee-documents/{id}/
    versions/{versionId}/download` all (same self rule), binary;
    `documentAlerts` GET `/v1/document-alerts` all;
    `documentSettingsGet` GET `/v1/document-settings` owner, hr;
    `documentSettingsPut` PUT `/v1/document-settings` owner;
    `documentRetentionDue` GET `/v1/document-retention` owner, hr.
  - `libraryList` GET `/v1/library` all; `libraryCreate` POST
    `/v1/library` owner, hr; `libraryGet` GET `/v1/library/{id}` all;
    `libraryVersionAdd` POST `/v1/library/{id}/versions` owner, hr;
    `libraryAudiencePut` PUT `/v1/library/{id}/audience` owner, hr;
    `libraryDownload` GET `/v1/library/{id}/download` all,
    binary; `libraryAcknowledge` POST `/v1/library/{id}/
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
    `/v1/letters/preview` owner, hr, manager, 200 `LetterPreview`;
    `letterIssue` POST `/v1/letters` owner, hr, manager, 201;
    `lettersList` GET `/v1/letters` all; `letterGet` GET
    `/v1/letters/{id}` all; `letterDownload` GET `/v1/letters/{id}/
    download` all, binary; `letterAcknowledge` POST
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
- `errors.ts` adds (status): `FILE_EMPTY` 400, `FILE_BASE64_INVALID`
  400, `MALFORMED_PLACEHOLDER` 422, `FILE_TOO_LARGE` 413,
  `PAYLOAD_TOO_LARGE` 413 (Plan 6's; add only if absent),
  `PDF_RENDERER_UNAVAILABLE` 503, `FILE_TYPE_NOT_ALLOWED` 415,
  `FILE_NOT_AVAILABLE` 409, `DOCUMENT_SLOT_EXISTS` 409,
  `VERSION_NOT_CURRENT` 409, `VERSION_NOT_DRAFT` 409,
  `TEMPLATE_NOT_PUBLISHED` 409, `UNKNOWN_MERGE_FIELD` 422,
  `MERGE_VALUE_MISSING` 422, `ARABIC_NOT_REVIEWED` 422,
  `NOT_ARABIC_TEMPLATE` 422, `EMPLOYEE_REQUIRED` 422,
  `OVERRIDE_NOT_ALLOWED` 422, `SALARY_LETTER_NEEDS_HR` 403.
- `openapi.ts`: Plan 6's binary handling (200 with `image/jpeg`,
  `image/png` and `application/pdf` binary content) covers the three
  download routes; add it with Plan 6's wording if absent.

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
"salary-certificate"]` deep-equals `["owner","hr"]`; `ACK_STATEMENT`,
`RETENTION_NOTICE` and `PREVIEW_WATERMARK` equal the exact strings
above; no exported
string constant in `files.ts`, `documents.ts`, `library.ts`,
`letters.ts` matches `/\bsign|binding|compliant/i`; every new value in
`EXAMPLES` parses against its schema.

`routes.test.ts` (modify): the Plan 3 count line becomes
`CORE_ROUTES.length === 49` (if not already); add
`DOCUMENT_ROUTES.length === 35`; every `DOCUMENT_ROUTES` entry appears
in `ROUTES` exactly once (no total count, so other plans' arrays can
join); ids and `(method, path)` stay unique across `ROUTES`; the
`DOCUMENT_ROUTES` ids with `contentType "binary"` are exactly
`["employeeDocumentDownload","libraryDownload","letterDownload"]` and
all are `GET`; `fileUpload` has `bodyLimit` `FILE_BODY_LIMIT`; every
`DOCUMENT_ROUTES` entry has `auth: "tenant"`.

`openapi.test.ts` (add): `letterDownload` has a 200 response listing
`application/pdf`; operation count still equals `ROUTES.length`.

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
     `largeRequiredRounding`, one of the engine's `RoundingMode` values
     `"DOWN" | "HALF_UP" | "UP"` (`"HALF_EVEN"` is refused with
     `INVALID_PARAM`).
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
  4 are counted nationals, override `largeRequiredRounding: "DOWN"`:
  checkpoint `2026-12-31`, band `large`, required 4, counted 4, status
  `on-target`, shortfall 0, `fineExposure` 0n.
- `large_needs_rounding`: the same without overrides: status
  `needs-input`, `missingParams` `["largeRequiredRounding"]`, required
  null, `countedNationals` 4.
- `fine_2026_unsourced_does_not_throw` (Review Focus): 3 counted of 4
  required (DOWN): status `below-target`, shortfall 1, `fineExposure`
  null, `fineNote` equals `FINE_2026_NOTE`.
- `fine_2026_override`: plus `finePerPostPerYear_2026: 12000000`:
  `fineExposure` 12000000n and the `.fine` trace rule `overridden`.
- `checkpoint_2025`: asOf `2025-08-01`, 40 skilled, 1 counted, DOWN:
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
  skilledHeadcount` (large band); the function never throws for asOf in
  2025 or 2026.

- [ ] **Step 2: Run** `pnpm --filter @payroll/engine test
  emiratisation`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above. Rounding uses the engine's
  existing integer division helpers; no floating point.
- [ ] **Step 4: Run** `pnpm --filter @payroll/engine test` and `pnpm
  check`. Expected: PASS (the purity test covers the new `src/` files).
- [ ] **Step 5: Commit** `feat(engine): Emiratisation pack and tracker`.

### Task 3: File storage and upload

Security and tenancy: this task keeps per-task review.

**Files:**
- Create: `packages/api/src/files/sniff.ts`, `src/files/names.ts`,
  `src/files/files.ts`, `src/routes/files.ts`,
  `packages/api/migrations/070_files.sql`
- Modify: `src/crypto/keyring.ts` (byte methods), `src/audit/audit.ts`
  (`SENSITIVE_KEYS`), `src/storage/fs-blob.ts` (key pattern),
  `src/app.ts` (register the route), `tests/helpers/test-app.ts`
  (`upload` and `fakePdf` helpers)
- If Plan 6 Tasks 1 and 3 are not merged: create Plan 6's
  `src/storage/blob.ts`, `src/storage/fs-blob.ts`, `AppDeps.blobs`,
  `RouteDef.contentType "binary"` and `bodyLimit` handling in
  `register`, exactly as Plan 6 specifies them.
- Test: `packages/api/tests/keyring-bytes.test.ts`,
  `tests/file-name.test.ts`, `tests/files.test.ts`

**Interfaces:**
- Consumes: Plan 3 `register`, `ReqCtx`, `ApiError`, `withTenant`,
  `Keyring`, `appendAudit`, `sha256Hex`; Plan 6 `BlobStore` (`put(key,
  bytes)`, `get(key)`), `memoryBlobStore`, `fsBlobStore`, binary
  responses in `register`; Task 1 `FileUpload`, `FileRef`,
  `MAX_UPLOAD_BYTES`, `FILE_BODY_LIMIT`, `AllowedMime`.
- Produces:
  - `Keyring.encryptBytes(dekWrapped: string, aad: string, plain:
    Uint8Array): Uint8Array` and `decryptBytes(dekWrapped, aad, cipher:
    Uint8Array): Uint8Array` (AES-256-GCM; layout `0x01 | iv(12) |
    tag(16) | ct`).
  - `fsBlobStore` accepts keys matching
    `^[0-9a-f-]{36}/(receipts|files)/[0-9a-f-]{36}$` (Plan 6 allowed
    `receipts` only).
  - `decodeBase64Strict(s: string): Uint8Array`: only
    `[A-Za-z0-9+/]` with up to two `=` at the end and a length that is
    a multiple of 4, else `ApiError(400, "FILE_BASE64_INVALID")`.
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
    The download routes of Tasks 4, 5 and 7 use it with the stored name.
  - Migration 070: `files(id, company_id, name, mime, size, sha256,
    blob_key, uploaded_by, uploaded_at, attached_to text null)`, RLS
    forced, grants select and insert, and update of `attached_to`.
  - `storeFile(ctx: ReqCtx, name: string, bytes: Uint8Array):
    Promise<FileRef>` (inserts the row, then `deps.blobs.put(
    "<companyId>/files/<fileId>", encryptBytes(dek, aad, bytes))`);
    `claimFile(ctx, fileId: string, attachTo: string): Promise<FileRef>`
    (marks `attached_to`; 409 `FILE_NOT_AVAILABLE` when already
    attached or uploaded by another user; 404 `NOT_FOUND` when no row
    is visible); `readFile(ctx, fileId): Promise<{ ref: FileRef; bytes:
    Uint8Array }>` (blob key only from the visible row; checks the
    stored sha256 after decrypting; a missing blob is 500 `INTERNAL`).
  - `POST /v1/files`: a body over `FILE_BODY_LIMIT` gives Plan 6's 413
    `PAYLOAD_TOO_LARGE`; bad base64 400 `FILE_BASE64_INVALID`; zero
    decoded bytes 400 `FILE_EMPTY`; more than `MAX_UPLOAD_BYTES` 413
    `FILE_TOO_LARGE`; unknown magic 415 `FILE_TYPE_NOT_ALLOWED`; stores
    with `safeFileName(body.name)`; audit `file.uploaded` `data: {
    fileId, mime, size }`.
  - `SENSITIVE_KEYS` adds `"documentNumber"`, `"inputs"`,
    `"mergeValues"`, `"contentBase64"`.
  - `test-app.ts`: `upload(app, token, companyId, name, bytes):
    Promise<FileRef>` and `fakePdf(marker: string): Uint8Array` (bytes
    of `"%PDF-1.4\n% " + marker + "\n%%EOF\n"`); `makeApp` uses
    `memoryBlobStore()` and exposes it as `blobs`.

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
`files_sniff_ignores_name` (Review Focus 5): `<html>` bytes and an SVG
named `policy.pdf` give 415, and PNG bytes named `notes.txt` give 201
`image/png`; `"abc"` as base64 gives 400 `FILE_BASE64_INVALID`; `""`
gives 400 `FILE_EMPTY`; `MAX_UPLOAD_BYTES + 1` decoded bytes give 413
`FILE_TOO_LARGE` and exactly `MAX_UPLOAD_BYTES` give 201; every value
in the memory blob store after uploading a file containing the marker
`SENTINEL-FILE` lacks that marker; `readFile` under company B's tenant
for A's file id gives 404, and `decryptBytes` with B's DEK on A's
stored blob throws; `claimFile` twice gives 409 `FILE_NOT_AVAILABLE`;
a file uploaded by the employee and claimed by hr gives 409; the
`file.uploaded` audit `data` has no file name; no log line contains
the marker; `fsBlobStore` accepts a `files` key and still refuses
`<id>/other/<id>` with `BLOB_KEY_INVALID`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `pnpm --filter @payroll/api test` and `pnpm check`.
  Expected: PASS (the RLS catalog test now covers `files`).
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
- Consumes: Task 3 `claimFile`, `readFile`, `contentDisposition`;
  Plan 6's binary response in `register`; Plan 3 `viewerScope`,
  `loadEmployee`, `dubaiDate`, `appendAudit`; Task 1 schemas.
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
    boolean): EmployeeDocument`: owner, hr and the employee themself
    (any role, managers included) get `current` and versions with
    `documentNumber`; the manager of the employee gets `current: null`,
    no `versions`, and still `type`, `label`, `expiryDate`, `verified`,
    `versionCount`. Anyone else never reaches it (404 earlier).
  - Behaviour: create and add-version claim the file; owner and hr may
    act for anyone; a manager or employee only for their own linked
    employee id (other ids 404, no link 422 `NO_EMPLOYEE_LINK`); a
    version is unverified until owner or hr verifies the current
    version; adding a version locks the slot row `FOR UPDATE` and takes
    `max(version) + 1`; download is allowed for owner, hr and self
    (others 404) and returns the stored bytes with the stored type and
    `contentDisposition(file.name)`; alerts use only each slot's
    current version and skip employees with status `left` or a
    `lastWorkingDate` before today; a manager's alerts cover self and
    direct reports, an employee's only self.
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
- `manager_own_document`: the manager uploads and creates their own
  Emirates ID (201), sees `current.documentNumber` and downloads it.
- reusing a claimed `fileId` gives 409 `FILE_NOT_AVAILABLE`.
- `alerts_exclude_leavers` (Review Focus 2): a left employee's expired
  passport is not in the hr alert list.
- the manager's alert list covers self and reports only and its body
  contains no `documentNumber` key; the employee's covers only self.
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
covers `SENTINELS[...].documentNumber`; the `{id}` filler maps each
new route to its id type (employee, employee document, library
document, letter template, letter) and fills `{versionId}` with that
document's current version; binary bodies are read as text (latin1)
before the check, so the seeded `fakePdf` markers are visible.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `pnpm --filter @payroll/api test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): employee documents and expiry
  alerts`.

### Task 5: Company library, sharing and read or acknowledge receipts

**Files:**
- Create: `packages/api/src/library/audience.ts`,
  `src/library/library.ts`, `src/library/receipts.ts`,
  `src/routes/library.ts`, `migrations/072_library.sql`
- Test: `packages/api/tests/library-audience.test.ts`,
  `tests/library.test.ts`

**Interfaces:**
- Consumes: Task 3 `claimFile`, `readFile`, `contentDisposition`;
  Plan 6's binary response in `register`; Plan 3
  employees and departments, `appendAudit`; Task 1 schemas and
  `ACK_STATEMENT`.
- Produces:
  - Migration 072: `library_documents(id, company_id, title, title_ar,
    category, audience jsonb, created_by, created_at)`,
    `library_versions(id, company_id, document_id, version, file_id,
    note, requires_ack, published_by, published_at, unique(document_id,
    version))`, `library_receipts(company_id, version_id, user_id,
    employee_id, viewed_at, acknowledged_at, primary key(version_id,
    user_id))`.
  - `inAudience(a: Audience, m: { employeeId: string | null;
    departmentId: string | null; role: Role }): boolean` (pure): true
    when `allStaff`, or the employee id is listed, or the department is
    listed, or the role is listed. An empty audience matches nobody.
  - Visibility: owner and hr see every library document; others only
    where `inAudience` holds (else 404 on get, download and
    acknowledge).
  - Download records `viewed_at` for the current version when unset
    (`INSERT ... ON CONFLICT (version_id, user_id) DO UPDATE SET
    viewed_at = coalesce(library_receipts.viewed_at, excluded.viewed_at)`)
    and returns the bytes; audit `library.downloaded`.
  - Acknowledge: `versionId` must be the current version, else 409
    `VERSION_NOT_CURRENT`; sets `acknowledged_at` once (the same
    coalesce pattern, so two concurrent calls keep one row and one
    time) and also sets `viewed_at` when unset; returns `MyReceipt` with
    `statement: ACK_STATEMENT`. Acknowledging a version that does not
    require it is allowed.
  - `receiptReport(tx, companyId, documentId, today):
    Promise<ReceiptReport>` for the current version: rows are the
    employees in the audience now who are active today (status not
    `left`), resolved at report time; status `acknowledged`, else
    `viewed`, else `pending`; sorted by name.
  - A new version starts a new set of receipts (receipts are per
    version). Audience changes keep old receipts.
  - Audit: `library.created`, `library.version.added`,
    `library.audience.updated` (`data: { allStaff, departmentCount,
    employeeCount, roles }`), `library.acknowledged`.

- [ ] **Step 1: Write the failing tests**

`library-audience.test.ts`: department match is true; an empty
audience is false for every role; a role match is true for a member
with no employee link; `allStaff` is true for everyone; a listed
employee in another department is true.

`library.test.ts`:
- hr creates a policy (`requiresAck` true) for department D; an
  employee in D lists it with `audience: null`; an employee outside D
  does not list it and gets 404 on get, download and acknowledge; the
  owner lists every document with `audience` set.
- after the D employee downloads, the receipts report shows them
  `viewed`; after acknowledging the current version, `acknowledged`
  with counts `{ acknowledged: 1, viewed: 0, pending: n }`.
- after hr adds version 2, acknowledging with version 1's id gives 409
  `VERSION_NOT_CURRENT` and the report for version 2 shows that
  employee `pending`.
- two concurrent acknowledges (`Promise.all`) leave one
  `library_receipts` row and return the same `acknowledgedAt`.
- `receipts_exclude_leavers` (Review Focus 2): a D employee who has
  left is not a row; an employee hired into D after publication is a
  `pending` row.
- setting the audience to empty hides it from the employee; the
  receipts rows stay in the table.
- the acknowledge response's `statement` equals `ACK_STATEMENT` and the
  response text contains no `sign` substring (case-insensitive).
- an employee calling `GET /v1/library/{id}/receipts` gets 403.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `pnpm --filter @payroll/api test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): company library and receipts`.

### Task 6: Letter templates, starter letters and merge

**Files:**
- Create: `packages/api/src/letters/merge.ts`, `src/letters/starters.ts`,
  `src/letters/starters-ar.ts`, `src/letters/templates.ts`,
  `src/letters/values.ts`, `src/routes/letter-templates.ts`,
  `migrations/073_letter_templates.sql`
- Modify: `src/routes/auth.ts` (signup calls `seedStarterTemplates` in
  its existing `withTenant` transaction)
- Test: `packages/api/tests/merge.test.ts`, `tests/starters.test.ts`,
  `tests/letter-templates.test.ts`

**Interfaces:**
- Consumes: Task 1 `MERGE_FIELDS`, `PLACEHOLDER`, `TemplateBody`,
  letter schemas; Plan 3 `appendAudit`, `loadEmployee`, `toMoney`.
- Produces:
  - Migration 073: `letter_templates(id, company_id, kind, name, lang,
    starter, created_at)`, `letter_template_versions(id, company_id,
    template_id, version, status, body jsonb, fields text[],
    uses_salary, created_by, created_at, published_at, review_status,
    reviewer_name, reviewed_at, unique(template_id, version))` and a
    partial unique index allowing one `published` version per template.
  - `placeholders(text: string): string[]` (sorted, unique keys).
  - `validateTemplateBody(body: TemplateBody): { fields: string[];
    usesSalary: boolean }`: any `{{` not part of a `PLACEHOLDER` match
    throws `ApiError(422, "MALFORMED_PLACEHOLDER")`; keys not in
    `MERGE_FIELDS` throw `ApiError(422, "UNKNOWN_MERGE_FIELD", {
    fields })`.
  - `Segment { text: string; isolate: boolean }`; `MergedBody { title:
    Segment[]; paragraphs: Segment[][] }`.
  - `mergeTemplate(body: TemplateBody, values: Record<string,
    string>): MergedBody`: one pass over the template text only,
    splitting it into literal segments and value segments; inserted
    values are never scanned again; a value segment of a `date` or
    `money` field has `isolate: true` (Task 7 keeps it left to right
    inside Arabic); a missing, empty or whitespace-only value is
    missing; all missing keys (sorted) go in one `ApiError(422,
    "MERGE_VALUE_MISSING", { fields })`. `segmentsText(s: Segment[])`
    joins the texts (tests and the stored values use it).
  - `STARTERS_EN: Record<LetterKind, { name: string; body:
    TemplateBody }>` with exactly the copy below, and `STARTERS_AR`
    (same kinds, Arabic copy written by the implementer, each string
    marked `// NEEDS NATIVE REVIEW`, using exactly the same placeholder
    set as its English twin).
  - `seedStarterTemplates(tx, companyId, userId, at)`: ten templates
    (five kinds times two languages), `starter: true`, version 1
    `published`; Arabic versions get `review_status
    "needs-native-review"`, English null.
  - Template rules: every new version is a `draft` (no route edits a
    version); publish needs `draft` (409 `VERSION_NOT_DRAFT`), makes it
    `published` and the previous one `superseded`; native review is
    owner only, only for `lang "ar"` (422 `NOT_ARABIC_TEMPLATE`),
    records `reviewer_name` and time on that version only; a new
    Arabic version starts `needs-native-review`.
  - `formatMoney(f: Fils, lang: Lang): string`: en `"AED 4,000.00"`,
    ar `"4,000.00 درهم"` (`// NEEDS NATIVE REVIEW`); dates stay ISO
    `YYYY-MM-DD` in both languages; nationality stays the ISO code.
  - `buildMergeValues(src: { company: Company; employee: EmployeeRow |
    null; departmentName: string | null; issuerName: string; inputs:
    Record<string, string>; letterDate: string; letterId: string; lang:
    Lang; includeSalary: boolean }): Record<string, string>`: absent
    data gives no key (so `mergeTemplate` reports it); salary keys only
    when `includeSalary`; `salary.monthlyTotal` = sum of the recurring
    components; money inputs are parsed with `parseAed` and formatted.
  - Audit: `letter.template.created`, `letter.template.version.added`,
    `letter.template.published`, `letter.template.reviewed`
    (`data: { templateId, version, reviewerName }`).
- English starter copy (verbatim; `name` / `title` / paragraphs):
  - salary-certificate, "Salary certificate" / "Salary Certificate":
    "To: {{input.addressee}}"; "This is to certify that
    {{employee.fullName}}, employee number {{employee.number}}, has been
    employed by {{company.name}} since {{employee.joiningDate}} as
    {{employee.jobTitle}}."; "The current monthly basic salary is
    {{salary.basic}} and the total monthly salary is
    {{salary.monthlyTotal}}."; "This certificate is issued on
    {{letter.date}} at the employee's request for the purpose of
    {{input.purpose}}. It reflects our records on that date."
  - noc, "No objection letter" / "No Objection Letter": "To:
    {{input.addressee}}"; "{{company.name}} has no objection to
    {{employee.fullName}}, employed with us as {{employee.jobTitle}}
    since {{employee.joiningDate}}, for the following purpose:
    {{input.purpose}}."; "This letter is issued on {{letter.date}} at
    the employee's request."
  - experience, "Experience letter" / "Experience Letter": "To whom it
    may concern"; "This is to certify that {{employee.fullName}} worked
    with {{company.name}} from {{employee.joiningDate}} to
    {{employee.lastWorkingDate}}. The last position held was
    {{employee.jobTitle}}."; "This letter is issued on {{letter.date}}
    at the employee's request."
  - offer, "Offer letter" / "Offer of Employment": "Dear
    {{input.candidateName}},"; "{{company.name}} is pleased to offer you
    the position of {{input.position}}, starting on
    {{input.startDate}}, with a total monthly salary of
    {{input.offerMonthlyTotal}}."; "The full terms will be set out in
    the employment contract that we will send you. Please reply to tell
    us whether you accept this offer."
  - warning, "Warning letter" / "Written Warning": "To:
    {{employee.fullName}}, {{employee.jobTitle}}"; "This letter is a
    written warning about the following matter on
    {{input.incidentDate}}: {{input.reason}}"; "Please take the steps
    needed so that this does not happen again. You may reply in writing
    to {{input.replyTo}}."
  - The renderer (Task 7) adds the company heading, the date and
    reference lines and the issuer lines (the issuer's display name,
    then `issuer.title` when that input is given; it is optional and
    never reported missing), so starters do not repeat them.

- [ ] **Step 1: Write the failing tests**

`merge.test.ts`: `placeholders("Hi {{employee.fullName}} {{
company.name }}")` is `["company.name","employee.fullName"]`;
`validateTemplateBody` with `{{employee.salaryBank}}` throws
`UNKNOWN_MERGE_FIELD` with `fields` `["employee.salaryBank"]`; with
`{{employee}}` or `"{{ employee.fullName"` throws
`MALFORMED_PLACEHOLDER`; the salary-certificate starter gives
`usesSalary` true and the warning starter false; `mergeTemplate` with
two missing values throws `MERGE_VALUE_MISSING` with both keys sorted;
a value `"   "` counts as missing; the `employee.joiningDate` segment
has `isolate: true` and `employee.fullName` `isolate: false`;
`merge_is_single_pass` (Review Focus
4): `input.reason = "see {{salary.basic}}"` with `salary.basic`
also present gives output containing the literal `"see
{{salary.basic}}"` and not the salary value; fast-check: for values
without `{{`, merged output contains no `{{`.

`starters.test.ts`: each English starter equals the copy above
(`toEqual` against literals in the test); no English starter string
matches `/\b(article|law|laws|decree|resolution|ministry|mohre|legal|
legally|binding|sign|signed|signature|compliant|compliance|statutory)
\b/i`; no Arabic starter string contains `المادة`, `قانون`, `مرسوم`,
`ملزم`, `توقيع` or `وزارة`; each Arabic starter's `placeholders` set
equals its English twin's; every placeholder in every starter is in
`MERGE_FIELDS`; `starters-ar.ts` contains `NEEDS NATIVE REVIEW` at
least once per kind.

`letter-templates.test.ts`:
- after signup, `GET /v1/letter-templates` returns ten templates, each
  with `current.version` 1 `published`; Arabic ones have
  `nativeReview.status "needs-native-review"`, English ones
  `nativeReview: null`.
- creating a template with `{{employee.salaryBank}}` gives 422
  `UNKNOWN_MERGE_FIELD`.
- add a version (draft 2), publish it: version 2 `published`, version 1
  `superseded`; publishing version 2 again gives 409
  `VERSION_NOT_DRAFT`.
- hr native review gives 403 `FORBIDDEN`; owner review of an English
  version gives 422 `NOT_ARABIC_TEMPLATE`; owner review of Arabic
  version 1 sets `reviewed` and `reviewerName`; a published Arabic
  version 2 is `needs-native-review` again.
- the manager can list templates and fields and gets 403 on create.
- audit rows exist for each action above, and no `data` contains a
  template paragraph.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `pnpm --filter @payroll/api test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): letter templates and merge`.

### Task 7: PDF rendering and letter issue, preview, download, receipt

Salary data and access: this task keeps per-task review.

**Files:**
- Modify: `packages/api/package.json` (dependencies `puppeteer-core`
  25.16.0, `dejavu-fonts-ttf` 2.37.3; dev `pdfjs-dist` 6.4.299),
  `src/deps.ts` (`AppDeps.pdf`), `src/config.ts` and `src/main.ts`
  (Chrome settings), `tests/main.test.ts`, `tests/helpers/test-app.ts`,
  the retention route (add letters), `tests/leak.test.ts` (`mayView`
  for letter routes), root `package.json` (script `letters:sample`)
- Create: `packages/api/src/pdf/renderer.ts`, `src/pdf/letter-html.ts`,
  `src/pdf/chrome-renderer.ts`, `src/letters/letters.ts`,
  `src/letters/sample.ts`, `src/routes/letters.ts`,
  `migrations/074_letters.sql`, `tests/helpers/text-pdf.ts`
- Test: `packages/api/tests/letter-html.test.ts`, `tests/pdf.test.ts`,
  `tests/letters.test.ts`, `tests/letters-access.test.ts`

**Interfaces:**
- Consumes: Task 6 `mergeTemplate`, `Segment`, `segmentsText`,
  `buildMergeValues`, templates; Task 3 `storeFile`, `claimFile`,
  `readFile`, `contentDisposition`; Plan 6's binary response; Task 4
  `retentionDue`, `retainUntil`; Task 1 `PREVIEW_WATERMARK`; Plan 3
  `viewerScope`, `loadEmployee`, `dubaiDate`, `appendAudit`.
- Produces:
  - `LetterPage { lang: Lang; heading: string; dateLine: string;
    refLine: string; title: Segment[]; paragraphs: Segment[][];
    issuerLines: string[]; watermark: string | null }`.
  - `interface PdfRenderer { render(page: LetterPage):
    Promise<Uint8Array>; close(): Promise<void> }`;
    `unavailableRenderer(): PdfRenderer` (`render` throws
    `ApiError(503, "PDF_RENDERER_UNAVAILABLE")`).
  - `CSP_META = '<meta http-equiv="Content-Security-Policy"
    content="default-src \'none\'; style-src \'unsafe-inline\';
    font-src data:">'` (one line in code); `escapeHtml(s: string):
    string` (`&`, `<`, `>`, `"`, `'`).
  - `letterHtml(page: LetterPage, fontBase64: string): string` (pure):
    `<!doctype html>`, `<html lang="<lang>" dir="rtl|ltr">`, `<meta
    charset="utf-8">`, `CSP_META`, one `<style>` with an `@font-face`
    for DejaVu Sans from `data:font/ttf;base64,<fontBase64>`; heading,
    date and reference lines, title, paragraphs, issuer lines and the
    watermark (a fixed, rotated, light-grey block) all escaped; a
    segment with `isolate: true` is wrapped in `<bdi dir="ltr">`; no
    `<script>`, no `<img>`, no external URL.
  - `chromeRenderer(opts: { executablePath: string; noSandbox:
    boolean; fontBase64: string; timeoutMs: number }): PdfRenderer`:
    launches one browser lazily with puppeteer-core and reuses it; per
    render opens a page, `setJavaScriptEnabled(false)`, turns on
    request interception and aborts every request whose URL does not
    start with `data:`, `setContent(letterHtml(...), { waitUntil:
    "load" })`, `pdf({ format: "A4", printBackground: true, timeout })`,
    closes the page; any failure logs `{ event: "pdf.render.failed" }`
    without content and throws `ApiError(500, "INTERNAL")`.
  - `loadConfig` gains `chromePath: string | null` (`CHROME_PATH`) and
    `chromeNoSandbox: boolean` (`CHROME_NO_SANDBOX === "1"`); `main.ts`
    builds `chromeRenderer` (font read from `dejavu-fonts-ttf/ttf/
    DejaVuSans.ttf` via `createRequire`, `timeoutMs` 10000) when
    `chromePath` is set, else `unavailableRenderer()`, and closes it on
    shutdown.
  - `tests/helpers/text-pdf.ts`: `textPdfRenderer(): PdfRenderer`
    returning the bytes of `"%PDF-1.4\n% " + JSON.stringify({ lang,
    heading, dateLine, refLine, title, paragraphs, issuerLines,
    watermark }) + "\n%%EOF\n"` with segments joined by
    `segmentsText`; `makeApp` uses it unless given `pdf`. Letter bodies
    in API tests are therefore readable text.
  - `LETTER_LABELS: Record<Lang, { date: string; ref: string }>` =
    en `{ date: "Date", ref: "Reference" }`, ar `{ date: "التاريخ",
    ref: "المرجع" }` (`// NEEDS NATIVE REVIEW`). `dateLine` =
    `"<label>: <letter.date>"`; heading = `company.name` (en) or
    `company.nameAr` (ar; null gives `MERGE_VALUE_MISSING`
    `["company.nameAr"]`).
  - Migration 074: `letters(id, company_id, kind, lang, template_id,
    template_version_id, template_version, employee_id, issued_by,
    issued_at, file_id, sha256, uses_salary, merge_enc,
    acknowledged_at)`; `merge_enc` is the encrypted canonical JSON of
    the merge values, AAD `"<companyId>:letters:merge:<letterId>"`.
  - `prepareLetter(ctx, req: LetterRequest): Promise<{ page:
    LetterPage; meta }>` applies, in order: template exists (404) and
    has a published version (409 `TEMPLATE_NOT_PUBLISHED`); caller role
    in `LETTER_GENERATE_ROLES[kind]` (403 `FORBIDDEN`); a version that
    `usesSalary` needs owner or hr (403 `SALARY_LETTER_NEEDS_HR`); kinds
    in `KINDS_NEEDING_EMPLOYEE` need `employeeId` (422
    `EMPLOYEE_REQUIRED`); the employee is in the caller's
    `viewerScope` and a manager's direct report (404 otherwise); merge
    (422 `MERGE_VALUE_MISSING`). `loadLetterValues(ctx, letterId)`
    decrypts `merge_enc` (internal, used by tests).
  - `POST /v1/letters/preview`: `prepareLetter`, render with
    `PREVIEW_WATERMARK`, return `LetterPreview` (base64); stores
    nothing; allowed for Arabic versions not yet reviewed; audit
    `letter.previewed` (`data: { kind, lang, templateVersion }`).
  - `POST /v1/letters`: `prepareLetter`, then an Arabic version must be
    `reviewed` (422 `ARABIC_NOT_REVIEWED`); renders with no watermark;
    stores the PDF through `storeFile` and claims it for the letter;
    saves `sha256` of the bytes and `merge_enc`; file name
    `"<kind>-<letter.date>-<lang>.pdf"`; audit `letter.issued` (`data:
    { letterId, kind, lang, templateVersion, sha256 }`).
  - Reads: owner and hr see every letter; the issuer sees letters they
    issued; the employee named on a letter sees it; nobody else (404).
    `GET /v1/letters?employeeId` filters inside that set. Download
    returns the stored bytes as `application/pdf` with
    `contentDisposition(fileName)`; audit `letter.downloaded`.
  - `POST /v1/letters/{id}/acknowledge`: only the employee named on the
    letter (others 404); sets `acknowledged_at` once; returns `Letter`;
    audit `letter.acknowledged`.
  - Retention route: letters join the report with class `letter` and
    anchors `issue` = issue date in Dubai, `employment-end` = the
    employee's last working date, `expiry` null.
  - `src/letters/sample.ts` (shell, run by `pnpm letters:sample`):
    needs `CHROME_PATH` (else prints `CHROME_PATH is required` and
    exits 1); renders every starter in both languages with fake data
    (`"Sample Employee"`, `"عينة موظف"`, `"4000.00"`, joining date
    `2019-01-01`) into `out/letters/` for a human to look at.

- [ ] **Step 1: Write the failing tests**

`letter-html.test.ts` (pure): `html_escapes_values` (Review Focus 4): a
paragraph segment `<img src="http://x">` appears as `&lt;img
src=&quot;http://x&quot;&gt;` and the output contains no `<img`; the
output contains `CSP_META` exactly and no `<script`; an Arabic page has
`<html lang="ar" dir="rtl">` and an English page `<html lang="en"
dir="ltr">`; an isolated segment `2019-01-01` is
`<bdi dir="ltr">2019-01-01</bdi>`; the watermark text appears only when
set; the only `url(` in the output starts `url(data:font/ttf;base64,`.

`pdf.test.ts` (real Chrome; `describe.skipIf(!chromePath)` where
`chromePath` is `CHROME_PATH`, else `/usr/bin/google-chrome` or
`/usr/bin/chromium` when the file exists): output starts with `%PDF-`;
pdfjs (`pdfjs-dist/legacy/build/pdf.mjs`) text of an English page
contains `"Salary Certificate"`, `"Sample Employee"` and
`"Reference"`, and no `"{{"`; with a watermark the text contains
`PREVIEW_WATERMARK`; an Arabic page with an isolated date renders one
page; a page whose paragraph is `<img src="http://127.0.0.1:9/x">`
renders and its text contains `<img` as text; `close()` resolves.

`letters.test.ts` (clock `2026-11-26T08:00:00Z`; seeded company with
`nameAr` set; `textPdfRenderer`):
- hr issues the English salary certificate for the employee with
  `input.addressee` and `input.purpose`: 201, `templateVersion` 1;
  `sha256` equals the SHA-256 of the download bytes; the download has
  `Content-Type: application/pdf`, an attachment disposition, and text
  containing the employee's name and `"AED 7,777.0"` (their sentinel
  basic, formatted); the `letter.issued` audit `data` text contains no
  sentinel amount and no employee name.
- after hr publishes version 2, the first letter still says
  `templateVersion` 1 and a new letter says 2.
- noc without `input.purpose` gives 422 `MERGE_VALUE_MISSING` with
  `detail.fields` `["input.purpose"]`.
- Arabic gate: issuing the Arabic salary certificate gives 422
  `ARABIC_NOT_REVIEWED`; preview gives 200 whose decoded
  `contentBase64` contains `PREVIEW_WATERMARK`, and no row is added to
  `letters`; after the owner's native review of that version, issue
  gives 201.
- salary certificate without `employeeId` gives 422
  `EMPLOYEE_REQUIRED`; offer without one gives 201.
- the `letters.merge_enc` column contains no sentinel amount and no
  employee name.
- the employee acknowledges their own letter: `acknowledgedAt` set; a
  second call returns the same value; another employee gets 404.
- with retention `letter` `{ months: 1, from: "issue" }` and the clock
  moved to `2027-01-01T08:00:00Z`, the retention report lists the
  letter.
- with `makeApp({ pdf: unavailableRenderer() })`, issue gives 503
  `PDF_RENDERER_UNAVAILABLE` and no `letters` row.

`letters-access.test.ts`:
- the manager issuing a salary certificate gets 403 `FORBIDDEN`; a
  warning for a direct report gives 201; for a non-report 404.
- a custom warning template using `{{salary.basic}}`: the manager gets
  403 `SALARY_LETTER_NEEDS_HR`; hr gets 201.
- `manager_input_not_expanded` (Review Focus 4): the manager issues a
  warning with `input.reason "see {{salary.basic}}"`; the download text
  contains `see {{salary.basic}}` and no sentinel amount;
  `loadLetterValues` has no `salary.basic` key.
- the employee's `GET /v1/letters` lists only letters naming them; the
  employee downloading a colleague's letter gets 404; the manager
  downloading a salary certificate hr issued for their report gets 404.
- the employee calling preview gets 403 `FORBIDDEN`.
- company B's owner with A's letter id gets 404 on get and download.

`main.test.ts` (add): `CHROME_PATH=/x` gives `chromePath "/x"`; absent
gives null; `CHROME_NO_SANDBOX=1` gives true.

`leak.test.ts` (modify): `mayView` for letter routes = owner, hr, the
issuer and the named employee; with `textPdfRenderer` the letter
downloads are plain text, so the sentinel check covers them.

- [ ] **Step 2: Run** `pnpm install` then `pnpm --filter @payroll/api
  test`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `pnpm --filter @payroll/api test` and `pnpm
  check` (PASS; `pdf.test.ts` runs where Chrome exists and is skipped
  elsewhere, say which in the report). Then `CHROME_PATH=<path> pnpm
  letters:sample`: ten PDFs in `out/letters/`. Rasterise one English
  and one Arabic sample (`pdftoppm -png` if available), look at them,
  and record in the task report whether Arabic letters join, the date
  reads `2019-01-01`, spaces are even and the final full stop sits at
  the left end of the Arabic sentence.
- [ ] **Step 5: Commit** `feat(api): letters rendered to PDF`.

### Task 8: Emiratisation API, whole-plan conformance, handover

**Files:**
- Create: `packages/api/src/emiratisation/report.ts`,
  `src/routes/emiratisation.ts`, `migrations/075_emiratisation.sql`
- Modify: `tests/conformance.test.ts` (happy-path rows for the 35
  routes), `tests/helpers/seed.ts` (`seedHeadcount`), `HANDOVER.md`,
  `LEDGER.md`
- Test: `packages/api/tests/emiratisation-api.test.ts`,
  `tests/overridable-keys.test.ts`

**Interfaces:**
- Consumes: Task 2 `computeEmiratisation`, `EMIRATISATION_PACKS`,
  `EMIRATISATION_OVERRIDABLE` (engine); Task 1 schemas and the
  contract's copy of the list; Plan 3 `listEmployees`, `loadEmployee`,
  `dubaiDate`, `toMoney`, `appendAudit`.
- Produces:
  - Migration 075: `emiratisation_flags(company_id, employee_id pk,
    skilled, work_permit_valid, paid_via_wps, gpssa_registered,
    updated_at)` and `emiratisation_settings(company_id pk,
    sector_in_scope, overrides jsonb, updated_at)`.
  - `buildEmiratisationInput(tx, deps, companyId, asOf):
    Promise<EmiratisationInput>`: every employee; `isUaeNational` =
    `workerClass === "uae-national"`; flags from the table (missing row
    gives nulls); `monthlyWage` = sum of recurring salary components
    (null when no salary).
  - `GET /v1/emiratisation?asOf` (default today): runs the engine with
    the stored overrides; maps `fineExposure` with `toMoney`; an
    `EngineError` maps to 422 `ENGINE_REFUSED` (Plan 3).
  - `PUT /v1/emiratisation/settings`: owner; keys outside the list
    give 422 `OVERRIDE_NOT_ALLOWED` (the contract schema refines this;
    the handler checks again against the engine's list); audit
    `emiratisation.settings.updated` `data.changed` = sorted dotted
    keys (`"overrides.largeRequiredRounding"`, `"sectorInScope"`).
  - `PUT /v1/employees/{id}/emiratisation`: owner, hr; audit
    `employee.emiratisation.updated` (`data: { changed }`).
  - `seedHeadcount(app, seeded, n, opts: { nationals: number; skilled:
    number })` adds `n` active employees through the API (basic
    `"7000.00"`, so every national is above the minimum wage); the
    first `nationals` are `uae-national` with all three flags true;
    the first `skilled` new employees are `skilled: true` and every
    other employee of the company, seeded ones included, gets
    `skilled: false`, so no flag is left null.

- [ ] **Step 1: Write the failing tests**

`overridable-keys.test.ts`: the contract's `EMIRATISATION_OVERRIDABLE`
deep-equals the engine's.

`emiratisation-api.test.ts` (clock `2026-12-01T08:00:00Z`):
- the base seeded company (under 20) gives band `none`, status
  `not-applicable`, 200.
- `seedHeadcount(app, seeded, 55, { nationals: 4, skilled: 40 })` (60
  active in all), owner override `largeRequiredRounding "DOWN"`:
  status `on-target`, required 4, `countedNationals` 4; the response
  text has no sentinel amount.
- after hr sets one national's `paidViaWps` to false (3 counted):
  `below-target`, shortfall 1, `fineExposure` null and
  `fineNote` set, status 200 (Review Focus: the unsourced 2026 fine
  never fails the report).
- owner override `finePerPostPerYear_2026: 12000000` gives
  `fineExposure "120000.00"`.
- override key `minWageFils` gives 422 `OVERRIDE_NOT_ALLOWED`; hr PUT of
  settings gives 403; the manager GET gives 403.
- `asOf=2024-06-01` gives 422 `ENGINE_REFUSED` with
  `detail.engineCode "NO_PACK_FOR_DATE"`.
- the settings audit row's `data.changed` equals
  `["overrides.largeRequiredRounding"]` after the first PUT.

`conformance.test.ts` (modify): one happy-path call per new route in
the table; JSON responses parse with `def.response`; binary responses
have the declared `Content-Type`; every error code sent is in
`ERROR_CODES`; the app's route list still equals `ROUTES`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Update `HANDOVER.md`** (state; `pnpm letters:sample`;
  layout rows for documents, library, letters, Emiratisation; limits:
  no virus scan, letters need `CHROME_PATH`, no notifications sent,
  Arabic letters blocked until
  native review, Emiratisation figures secondary with the 2026 fine
  unresolved, retention has no defaults and deletes nothing, no web
  screens yet) and **append to `LEDGER.md`** section 3 every ruling
  below with today's date.
- [ ] **Step 6: Commit** `feat(api): Emiratisation report, handover`.

---

## Rulings

Claude's calls under the owner's "decide, don't ask" instruction. The
owner can overrule any. Each says what it costs if wrong. The executor
appends them to `LEDGER.md` section 3.

1. **PDF: headless Chrome through puppeteer-core 25.16.0, HTML built
   by our code, DejaVu Sans embedded, behind `PdfRenderer`.** Spike on
   2026-11-26 in the scratchpad, rasterised with `pdftoppm` and looked
   at: a three-line Arabic paragraph with a Latin name, an ISO date and
   amounts. pdfkit 0.20.2 with DejaVu Sans shaped Arabic and ordered
   words and wrapped lines correctly, but moved each space at an
   Arabic and Latin boundary to the wrong side (doubling it gave uneven
   gaps) and put the sentence-final full stop before the last Arabic
   word; fontsource Noto subsets lost digits (no font fallback);
   reordering runs ourselves, the `rtla` feature and non-breaking
   spaces made it worse. Chrome (`/usr/bin/google-chrome`) rendered
   the same paragraph correctly, with even spaces and the full stop in
   place; it also showed that a bare ISO date inside Arabic reads
   `01-01-2019` under the Unicode bidi rules, and that `<bdi
   dir="ltr">` keeps `2019-01-01`, hence `isolate` segments. With a
   warm browser one page took about 25 ms; a CSP meta stopped an
   injected image from loading. Costs: Chrome or Chromium must be
   installed where the API runs (`CHROME_PATH`; without it letters
   return 503); PDF bytes are not reproducible (Chrome stamps its own
   creation time), so each letter keeps the hash of its stored bytes;
   `pdf.test.ts` skips on machines without Chrome, and API tests use a
   text renderer. Cost if wrong: replace `chrome-renderer.ts` (one
   file); `letterHtml`, merge and storage stay.
2. **File bytes in Plan 6's `BlobStore` (filesystem in production,
   memory in tests), metadata in the RLS table `files`.** One storage
   mechanism for receipts and documents. The blob key is read only
   from a row visible through RLS, and the AAD binds each blob to its
   company and file id, so a wrong key cannot be decrypted. Cost:
   blobs sit outside database transactions (a crash between row and
   blob leaves an orphan blob, harmless and unreadable); object
   storage later is one `BlobStore` implementation.
3. **Two-step upload as JSON with base64** (`POST /v1/files`, then a
   JSON create that claims the file), matching Plan 6's receipt upload
   and the contract's JSON model. Cost: about a third more bytes on
   the wire; unclaimed files accumulate until a cleanup job exists.
4. **Upload types: PDF, PNG, JPEG by magic bytes; 10 MiB cap.** No
   Office files, no HEIC. Cost: users convert phone photos or Word
   files first; adding a type is one sniff rule.
5. **No virus scan in this plan.** No offline scanner exists for the
   test suite. Mitigation: type allowlist, attachment-only downloads,
   `nosniff` and a sandbox CSP. Cost: a malicious PDF can reach a
   colleague's PDF reader; a scan with quarantine is required before
   real customer data, with the pen test (Plan 3 ruling 22).
6. **No external or expiring share links.** Sharing is inside the
   tenant only (audiences). Cost: sending a document to a bank or
   landlord is a manual download; links come with verifiable letters
   (UQ15) later.
7. **Expiry alerts are computed on read** (`GET /v1/document-alerts`
   and the dashboard a web plan builds); nothing is sent, because Plan
   3 has no scheduler or mailer. Lead days are company settings with a
   `convention` default of 60, 30 and 7 days, not law. Cost: nobody is
   told unless they open the app; email or WhatsApp delivery is a
   notifications plan.
8. **One slot per statutory type per employee** (Emirates ID, visa,
   passport, labour card, contract), renewals are versions, and only
   the current version raises alerts; `other` may repeat. Cost: an
   employee with two passports keeps the second as `other`.
9. **Managers see type, expiry and verified state of their reports'
   documents, never the number or the file.** Cost: a manager who
   needs the scan asks HR.
10. **Employees may upload their own documents**, unverified until
    owner or hr verifies. Cost: HR must verify; unverified copies still
    raise alerts, which is the safer side.
11. **Retention: settings per class (six document types plus
    `letter`) and a due list; no default period and no deletion.** The
    PDPL text read has no periods (Art 5(7) only says data is not kept
    after its purpose ends) and `payroll_app` has no delete grant. The
    two-year MOHRE figure is secondary and is not used. Cost: data is
    kept past its purpose until UQ17 builds erasure that keeps the
    audit chain; that is an Art 5(7) gap the owner sees in the
    handover.
12. **Library receipts are per version, audiences resolve at report
    time, leavers drop out.** Cost: a report printed last month can
    differ from today's for the same version.
13. **Acknowledgement is a receipt, never a signature.** No e-signature
    is offered or claimed (Decree-Law 46 of 2021 questions stay with
    counsel). Cost: customers who want signed letters use another tool
    until UQ15.
14. **Letter generation roles:** salary certificate, NOC, experience
    and offer by owner and hr; warning also by a manager for direct
    reports; any template using a salary field needs owner or hr.
    Employees view and acknowledge letters naming them; letter
    requests by employees are deferred. Cost: an employee asks HR
    outside the app for a letter.
15. **One language per letter** (English or Arabic); bilingual layouts
    are deferred. Cost: a bilingual letter is two PDFs.
16. **Arabic gate is per template version:** an owner records a native
    reviewer's name before an Arabic version can be issued; preview
    works before that with a watermark. Starter Arabic copy ships
    unreviewed. Cost: no Arabic letter is issued until a native speaker
    reviews each starter.
17. **Starter letters state no law and no legal effect**; custom
    templates are the company's own words. Dates are ISO
    `YYYY-MM-DD` in both languages, nationality is the ISO code,
    money is `AED 4,000.00`. Cost: some recipients expect long-form
    dates or country names; a formatting change, not a data change.
18. **Templates are immutable once created; every edit is a new
    version; issued letters pin their version and store the PDF hash
    and an encrypted copy of the merge values.** Cost: storage per
    letter; no letter can be regenerated silently.
19. **Emiratisation rule-pack holds only what the research table
    states,** as `secondary` (the note demands a primary check), with
    end-2025 8% as a derived `convention`, and these `unsourced` with
    company overrides: half-year targets, rounding of the required
    count, the 20 to 49 band's 2026 figure, the 2026 fine. The pack
    covers 2025 and 2026 only. Cost: the report says `needs-input`
    until a company enters those values; a wrong secondary figure
    misstates a target until the primary text is read.
20. **The 2026 fine stays unsourced** (sources give AED 9,000 and AED
    10,000 a month); the report never fails on it and shows
    `FINE_2026_NOTE`. Cost: no fine estimate for 2026 without a
    company-entered figure.
21. **Counting conditions, "skilled" and sector membership are
    HR-entered inputs;** a national counts only with all three flags
    true and, from 2026-07-01, a recurring monthly total at or above
    the minimum wage (`convention` base). The 14-sector list is not
    encoded. Cost: a wrong flag changes the count; the trace shows
    every input.
22. **Migrations 070 to 079 reserved for Plan 7; contract routes in a
    second array (`DOCUMENT_ROUTES`)** so plans drafted in parallel do
    not fight over one count or one migration number (Plan 6 uses 007
    to 010, Plan 8 801 to 807 and `HR_ROUTES`). Plan 6 owns the binary
    route fields, `PAYLOAD_TOO_LARGE` and `BlobStore`; Plan 7 owns PDF
    rendering, letter templates and `files`; Plan 8's offers and exit
    letters can use Plan 7's letters later. Plan 6's routes test counts
    "74, or the existing count plus 25"; with Plan 7 merged first that
    count includes Plan 7's 35. Cost: one lockfile and one `routes.ts`
    merge per plan.
23. **Audit action names:** first segment without a hyphen, as the
    contract regex requires. Plan 3 lists `pay-run.created` and
    `leave-type.created`, which that regex rejects; the Plan 3 executor
    must rename them (for example `payrun.created`) or loosen the regex.
    Cost: a failing audit write in Plan 3 if nobody does.
24. **No MFA step-up for letters or document downloads.** Cost: weaker
    than bank reveal; add `mfa: true` to `letterIssue` if the owner
    wants it.
25. **No web screens in this plan;** a later web plan builds them from
    the contract and `EXAMPLES`. Cost: features are reachable through
    the API only until then.
26. **Items pulled forward:** UQ34 letters and sharing (listed M2 and
    M3), part of UQ17 (settings and due list only) and UQ20 (tracker
    only, no hiring planner) land now, as the owner's brief asks.
    Cost: build time; no other plan depends on them.
27. **Review:** per the speed ruling, one whole-branch review at the
    end, plus per-task review of Task 2 (statutory values), Task 3
    (file storage and tenancy) and Task 7 (salary letters and access).
    Cost: a slipped bug in Tasks 1, 4, 5, 6 or 8 is caught later.
28. **Dependencies:** puppeteer-core 25.16.0 (22 Oct 2026; drives an
    installed Chrome, downloads nothing), dejavu-fonts-ttf 2.37.3
    (2022), pdfjs-dist 6.4.299 (3 Oct 2026, tests only); all at least
    two weeks old on 2026-11-26. Cost: a one-line pin change.
29. **Letter preview returns JSON with the PDF in base64,** because
    Plan 6's binary routes are `GET` only and preview needs a request
    body. Cost: a third more bytes per preview; nothing is stored.
