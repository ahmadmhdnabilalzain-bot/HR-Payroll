# Plan 11: Owner View, Pre-Pay Gate, Reports and Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Features delivered (11; count progress by these names):**

- F1 Pre-pay gate: variance with causes, changed or missing inputs,
  open claims and leave, contract salary mismatch, WPS dry-run
  findings, duplicate bank accounts; enforced at approval (Task 2).
- F2 What-if and rule-change replay of a past pay run, labelled
  HYPOTHETICAL (Tasks 3, 4).
- F3 Rule-dated deadline calendar with late alerts and ICS download
  (Tasks 3, 5).
- F4 Owner brief: one screen of what needs a decision (Task 10).
- F5 Compliance score with fine exposure from sourced rules only
  (Task 5).
- F6 Report builder and scheduled exports, CSV and PDF (Task 8).
- F7 Payroll reports: register, cost by department, variance,
  gratuity liability estimate (Task 8).
- F8 Inspection pack: one sealed ZIP export (Task 9).
- F9 Verifiable payslips: payslip PDF with a verification QR (Task 6).
- F10 Audit-readiness checklist and evidence locker (Task 9).
- F11 Correction record for amended pay runs (Task 7).

**Goal:** Give the owner one place to decide, check and prove: a gate
that must be clear before a pay run is approved, hypothetical replays,
a dated calendar, an honest compliance score, reports and exports,
payslips anyone can verify, a correction record and an inspection pack.

**Architecture:** Plan 11 extends Plan 3's `packages/contract` and
`packages/api` (new `OWNER_ROUTES` list joined to the existing routes)
and adds two small pure modules to `packages/engine` (deadline dates
and a payslip-level rule-change preview that shares
`previewRuleChange`'s change code). Every checker, scorer, replay and
report builder is a pure function over loaded rows, tested alone; the
service files only load, call and store. Statutory dates and the one
sourced late-payment rule live in a new engine pack `ae-deadlines`;
nothing statutory is in the API. Files reuse Plan 7's encrypted file
store and pdfkit; approvals reuse Plan 6's spine.

**Tech Stack:** As Plan 3 (Node 22, TypeScript 7.0.2, zod 4.6.7, Hono
4.13.17, pglite 0.5.16, pg 8.23.1, Vitest 5.1.2, fast-check 4.11.0, tsx
4.23.15). From Plan 7: pdfkit 0.20.2, dejavu-fonts-ttf 2.37.3,
pdfjs-dist 6.4.299 (tests). New: `qrcode` 1.5.4 (published 2024-08-05)
and `@types/qrcode` 1.5.6 (dev, 2025-10-24). Node built-ins:
`zlib.crc32` (Node 22.2 and later; checked on Node 22.23.5) and
`crypto.sign`/`crypto.verify` with Ed25519 (seed import via PKCS#8
DER checked on Node 22.23.5).

**Spec:** `docs/superpowers/specs/2026-11-25-master-feature-list.md`
(unique items 2, 3, 5, 6, 7: UQ5, UQ6, UQ7, UQ9, UQ14, UQ15, UQ16,
UQ18, UQ19; tags SR, O and "flag, never deduct"),
`docs/superpowers/specs/2026-11-25-combined-feature-list.md` (section
E: standard reports and custom report builder; payroll analytics;
gratuity liability report),
`docs/research/2026-11-25-wps-resolution-340.md` (WPS due date,
summary only), `docs/research/2026-11-26-gpssa-primary.md` (DL57 Art
11(4) and 12, READ),
`docs/research/2026-11-25-gpssa-emiratisation-nafis.md`,
`docs/research/2026-11-26-vat-einvoicing-primary.md` (record retention
NOT VERIFIED; no QR rule), `docs/engineering-standards.md`, `LEDGER.md`
sections 1 to 3 (speed ruling, autonomous mode). Extends
`docs/superpowers/plans/2026-11-26-plan-3-backend.md`; uses
`docs/superpowers/plans/2026-11-26-plan-5-monthly-payroll.md`
(`calculatePayslip`, `PayslipInput`, `PayrollPacks`),
`docs/superpowers/plans/2026-11-26-plan-6-expenses.md` (approval
spine, `pendingClaimCount`) and
`docs/superpowers/plans/2026-11-26-plan-7-documents.md` (file store,
`BinaryResult`, pdfkit, `ae-emiratisation`).

**Prerequisites (per task).** Where this plan consumes a function of
another plan that its Interfaces blocks do not name exactly, the
executor exports it from the named file under the name given here,
renaming only at the export.

| Task | Needs merged first |
|---|---|
| 1 | Plan 3 |
| 2 | Plan 3; Plan 6 Task 6 (`PayRun.pendingClaimCount`) |
| 3 | Plan 5 (engine payslip, `DL57_ART11` source id) |
| 4 | Plans 3 and 5; Task 3 |
| 5 | Plan 7 Tasks 2 and 8 (Emiratisation pack and report); Tasks 1-3 |
| 6 | Plan 7 Tasks 3 and 7 (file store, `BinaryResult`, pdfkit); Task 1 |
| 7 | Plan 6 Task 2 (approval spine); Task 6 |
| 8 | Tasks 2, 6 and 7 |
| 9 | Tasks 5 to 8 |
| 10 | Tasks 1 to 9 |

Tasks 1 to 4 can start before Plans 6 and 7 land (Task 2 last of
them). Task 3 runs in parallel with Tasks 1 and 2.

## Global Constraints

- Plan 3's Global Constraints apply unchanged: 80-character lines,
  files under about 300 lines, functions under 30, `Fils` inside,
  `Money` (`^\d{1,9}\.\d{2}$`) on the wire, RLS forced on every tenant
  table, all queries through `withTenant`, injected time, ids and
  randomness (`AppDeps`), `/v1`, `X-Company-Id`, offline tests.
- Signed amounts (differences only) use the new `SignedMoney`
  (`^-?\d{1,9}\.\d{2}$`, never `"-0.00"`). Every other amount stays
  `Money`.
- No statutory number in `packages/api` or `packages/contract`. Legal
  dates and the GPSSA late addition come from the engine pack
  `ae-deadlines`; Emiratisation dates from Plan 7's `ae-emiratisation`.
  Product defaults are named constants whose doc comment and any
  user-facing text say "product default, not law".
- Fine exposure is a union: `computed` (amount plus trace) or
  `not-assessed` (reason) or `none` (a product check with no fine). It
  is `computed` only when every trace rule that sets the amount has
  status `official` or `secondary` and none is overridden; rounding
  mode params are exempt. A total is `null` when nothing is computed.
  Nothing unsourced is ever shown as zero.
- A check that could not run is listed in `checksNotRun` or as
  `not-assessed`; it is never counted as passed.
- The system makes files; it pays nobody. "Late" means "no payment
  recorded by the due date" from a filing record a person entered.
- Everything hypothetical carries `hypothetical: true` and the label
  `HYPOTHETICAL` on the wire and is never stored as a payslip.
- Never "compliant", "certified", "WPS compliant", "legally valid" or
  "e-signature" in any copy. Verifiable payslips are a "verification
  code"; the copy says it is not an electronic signature. SIF content
  keeps Plan 3's `SIF_STATEMENT`.
- Negative pay differences are flagged, never deducted.
- Corrections promise no remedy and no fine cover (UQ16 tag O).
- No record retention period is stated or enforced; nothing in the
  evidence locker is deleted (retention NOT VERIFIED).
- File and pay exports need the same gate as SIF download: roles
  owner or hr, and an MFA session.
- Audit actions: first segment has no hyphen; audit data never holds
  amounts, notes, reasons, tokens, keys or IBAN-derived values
  (`ownerAudit`, Task 1).
- No DELETE route or grant; removal is a status.
- Migrations are numbered `1101_` to `1108_` (Plan 11's range; `1109`
  is kept free).
- Each task ends with `pnpm check` green and one commit. Review: fresh
  per-task review after Tasks 2, 3, 6, 7 and 9 (money, law, crypto,
  evidence); one whole-branch review at the end (speed ruling).

## Review Focus

1. A manager or employee calling any binary owner route (payslip PDF of
   a colleague, report export, evidence file, inspection pack): 403 or
   404 and no file bytes, because the leak test reads only text bodies
   (Task 9 `binary_routes_deny_other_roles`).
2. A report cell whose text starts with `=`, `+`, `-` or `@` (an
   employee named `=HYPERLINK(...)`): the CSV cell is prefixed with
   `'`, while signed money such as `-12.00` is left as is (Task 1
   `csv_guards_formula_cells`).
3. A payslip checked after a correction replaced it: verification says
   `superseded`, not `genuine` (Task 7
   `verify_superseded_after_correction`).
4. A company where no fine is sourced: the exposure total is `null`,
   never `"0.00"`, and the score's denominator leaves out not-assessed
   checks (Task 5 `exposure_null_when_nothing_computed`).
5. The WPS late alert near midnight: at `2026-07-01T19:59:00Z` (Dubai 1
   July) the June deadline is not overdue; at `2026-07-01T20:00:00Z`
   (Dubai 2 July) with no payment recorded it is overdue (Task 5
   `wps_overdue_uses_dubai_date`).

## File Structure

```
packages/engine/src/sources.ts               + MR340_2026_SUMMARY, DL57_ART12
packages/engine/src/rules/deadlines-pack.ts  ae-deadlines (data)
packages/engine/src/deadlines/dates.ts       wpsDeadline, gpssaDeadline
packages/engine/src/deadlines/late.ts        gpssaLateAddition
packages/engine/src/preview.ts               applyRuleChange exported
packages/engine/src/payroll/preview.ts       previewPayslipRuleChange
packages/contract/src/routes-owner.ts        OWNER_ROUTES
packages/contract/src/owner/{gate,replay,deadlines,compliance,
  verification,reports,corrections,evidence,brief}.ts
packages/api/migrations/1101_gate.sql ... 1108_packs.sql
packages/api/src/db/migrate.ts               3 or 4 digit names
packages/api/src/audit/owner-audit.ts        ownerAudit
packages/api/src/export/{zip,pdf-table,ics}.ts
packages/api/src/gate/        checks (pure), load, ack, contracts
packages/api/src/replay/      to-engine (pure), compute (pure), service
packages/api/src/deadlines/   status (pure), filings, service
packages/api/src/compliance/  exposure (pure), score (pure), service
packages/api/src/verify/      keys, seal, token (pure), payslip-pdf
packages/api/src/reports/     datasets (pure), run, liability,
                              definitions, schedules, jobs
packages/api/src/corrections/ diff (pure), create, subject, delta
packages/api/src/evidence/    locker, readiness (pure), pack, pack-files
packages/api/src/brief/       brief (pure), service
packages/api/src/routes/{gate,replay,deadlines,compliance,verify,
  reports,corrections,evidence,brief}.ts
HANDOVER.md, LEDGER.md                       updated in Task 10
```

---

### Task 1: Platform: migration names, owner routes, signed money, exports

**Files:**
- Modify: `packages/api/src/db/migrate.ts`, `tests/migrate.test.ts`
- Modify: `packages/contract/src/primitives.ts` (`SignedMoney`),
  `src/routes.ts` (join `OWNER_ROUTES`; add text content types),
  `src/openapi.ts`, `src/index.ts`
- Create: `packages/contract/src/routes-owner.ts`
- Modify: `packages/api/src/db/money.ts` (`toSignedMoney`),
  `src/app.ts` and `src/http/validate.ts` (text content types)
- Create: `packages/api/src/audit/owner-audit.ts`,
  `src/export/zip.ts`
- Create or modify: `packages/api/src/http/csv.ts` (Plan 6's CSV
  writer; one writer for the whole API)
- Test: `packages/contract/tests/routes-owner.test.ts`,
  `packages/api/tests/csv.test.ts`, `tests/zip.test.ts`,
  `tests/helpers/zip-read.ts`, `tests/owner-audit.test.ts`

**Interfaces:**
- Consumes: Plan 3 `migrate`, `RouteDef`, `ROUTES`, `toMoney`,
  `appendAudit`, `AuditInput`, `AuditEvent`, `assertNoSensitive`,
  `dubaiDate`, `dubaiTime`.
- Produces:
  - `migrate(db, dir)`: names match `/^(\d{3,4})_[a-z0-9_]+\.sql$/`
    (else `MIGRATION_NAME`); applied in numeric order of the prefix; two
    files with the same number throw `MIGRATION_NAME`. Already applied
    names stay recorded as before. (Plan 10 Task 1 makes the same
    change; if the branch already has it, only add the test cases.)
  - `SignedMoney` (zod): `^-?\d{1,9}\.\d{2}$`, refusing `"-0.00"`.
    `toSignedMoney(f: Fils): string` (zero is `"0.00"`).
  - `OWNER_ROUTES: readonly RouteDef[]` (empty here; each task appends
    its routes). `routes.ts`: `ROUTES` = the existing joined list (Plan
    3's routes and any other plan's list already merged) followed by
    `...OWNER_ROUTES`. If Plan 10's `ROUTE_GROUPS` exists, append
    `OWNER_ROUTES` as its last group instead. If Plan 3's list is still
    named `ROUTES` with no join, rename it `CORE_ROUTES` as Plans 7 and
    8 do.
  - `RouteDef.contentType` gains `"text/csv"` and `"text/calendar"`
    (string bodies through Plan 3's text path; added only if absent;
    other plans' members are kept).
  - `OWNER_SENSITIVE_KEYS = ["amount","gross","net","delta","total",
    "note","reason","token","signature","seed","privateKey","iban",
    "amountDue","fingerprint"]`; `ownerAudit(tx: Db, e: AuditInput):
    Promise<AuditEvent>` throws `AUDIT_SENSITIVE_DATA` on any of them
    (any depth), then calls `appendAudit`. Every Plan 11 service audits
    through it.
  - `toCsv(statement: string | null, header: string[], rows: (string |
    null)[][]): string` in `src/http/csv.ts`, Plan 6's signature and
    rules (RFC 4180, CRLF, UTF-8 with a BOM, quoting of `,`, `"`, CR
    and LF, a leading `'` on cells starting with `=`, `+`, `-`, `@`,
    tab or CR, the statement as a first one-cell line) plus two
    additions: `null` is an empty cell, and a cell matching
    `SignedMoney` gets no `'`. If Plan 6 has not created the file,
    create it with exactly this behaviour; if it has, add the two
    additions (Plan 6's tests stay green).
  - `ZipEntry { path: string; bytes: Uint8Array }`;
    `buildZip(entries: ZipEntry[], at: Date): Uint8Array`: stored (no
    compression), CRC-32 from `zlib.crc32`, DOS date and time from the
    Dubai civil time of `at`, UTF-8 flag off; paths match
    `/^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/` with no `.` or `..`
    segment (`ZIP_PATH_INVALID`), unique (`ZIP_DUPLICATE_PATH`); total
    over 4,294,967,295 bytes throws `ZIP_TOO_LARGE` (no ZIP64).
  - `tests/helpers/zip-read.ts`: `readZip(bytes): Map<string,
    Uint8Array>` (reads the central directory, checks each local
    header and CRC, throws on mismatch).

- [ ] **Step 1: Write the failing tests**

`migrate.test.ts` (added cases): files `001_a.sql`, `070_b.sql`,
`801_c.sql`, `1101_d.sql` apply in that order (`1101` after `801`);
`12_x.sql` and `11011_x.sql` throw `MIGRATION_NAME`; `070_b.sql` and
`070_c.sql` together throw `MIGRATION_NAME`.

`routes-owner.test.ts`: `OWNER_ROUTES.map((r) => r.id)` deep-equals the
literal `OWNER_ROUTE_IDS` array in the test (empty now; each task
appends); every owner route has `auth: "tenant"` except `verifyPayslip`
(Task 6); `ROUTES` ends with `OWNER_ROUTES`; no `(method, path)` pair
repeats in `ROUTES`; `SignedMoney` accepts `"-12.00"`, `"0.00"` and
rejects `"-0.00"`, `"12"`, `"--1.00"`.

`csv.test.ts`:
- `csv_quotes_and_crlf`: `toCsv(null, ["a","b"], [["x,y", 'q"'],
  [null, "z"]])` equals `'\uFEFFa,b\r\n"x,y","q"""\r\n,z\r\n'`.
- `csv_guards_formula_cells` (Review Focus 2): cells
  `"=HYPERLINK(1)"`, `"+1"`, `"@x"`, `"-x"` become `"'=HYPERLINK(1)"`,
  `"'+1"`, `"'@x"`, `"'-x"`; `"-12.00"` stays `"-12.00"`.

`zip.test.ts`: two entries round-trip through `readZip` byte for byte;
`buildZip([{ path: "../x", ... }])` throws `ZIP_PATH_INVALID`; two
`"a.txt"` throw `ZIP_DUPLICATE_PATH`; the same input and `at` give
identical bytes; the DOS date of `at = 2026-03-31T21:00:00Z` decodes to
2026-04-01 01:00:00.

`owner-audit.test.ts`: `ownerAudit` with `data: { note: "x" }` and with
`data: { nested: { gross: "1.00" } }` throws `AUDIT_SENSITIVE_DATA`;
`data: { changed: ["category"] }` appends.

- [ ] **Step 2: Run** `pnpm --filter @payroll/contract test` and
  `pnpm --filter @payroll/api test migrate csv zip owner-audit`.
  Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): owner route registry and exports`.

### Task 2: Pre-pay gate (F1)

Money task: fresh per-task review.

**Files:**
- Create: `packages/contract/src/owner/gate.ts`
- Modify: `packages/contract/src/routes-owner.ts`, `src/errors.ts`,
  `src/examples.ts`, `src/index.ts`
- Create: `packages/api/migrations/1101_gate.sql`,
  `src/gate/checks.ts` (pure), `src/gate/variance.ts` (pure),
  `src/gate/load.ts`, `src/gate/ack.ts`, `src/gate/contracts.ts`,
  `src/routes/gate.ts`
- Modify: `packages/api/src/payroll/pay-runs.ts` (approve calls
  `assertGateClear`), `src/app.ts`, `tests/helpers/seed.ts`
  (`seedTwoMonths`, `seedOwnerView`, `ackAll`; `seedPayroll` calls
  `ackAll`), `tests/leak.test.ts`, `tests/conformance.test.ts`
- Test: `packages/api/tests/gate-checks.test.ts`, `tests/gate.test.ts`

**Interfaces:**
- Consumes: Plan 3 `RunSnapshot`, `SnapshotEmployee`, `snapshotHash`,
  `loadEmployee`, `unpaidLeaveDaysIn`, `buildSifBatch`, `canonicalJson`,
  `sha256Hex`, `Keyring`; `generateSif`, `validateSif`, `defaultLayout`
  from `@payroll/wps`; Plan 6 `PayRun.pendingClaimCount`; Task 1
  `ownerAudit`, `OWNER_ROUTES`.
- Produces (contract):
  - `GateSeverity = z.enum(["error","review","info"])`;
    `GateCode = z.enum(["VARIANCE_EXPLAINED","VARIANCE_UNEXPLAINED",
    "TOTAL_VARIANCE_HIGH","NO_PREVIOUS_RUN","EMPLOYEE_ADDED_AFTER_RUN",
    "SALARY_CHANGED_AFTER_RUN","UNPAID_LEAVE_CHANGED","LEAVE_PENDING",
    "CLAIMS_PENDING","CONTRACT_MISMATCH","CONTRACT_FIGURE_MISSING",
    "WPS_SETTINGS_MISSING","WPS_BANK_DETAILS_MISSING","WPS_ERROR",
    "WPS_WARNING","DUPLICATE_BANK_ACCOUNT"])`.
  - `VarianceCause = z.enum(["NEW_JOINER","LEAVER","SALARY_CHANGED",
    "OVERRIDE","ONE_OFF","UNPAID_LEAVE","NOT_IN_RUN"])`.
  - `GateFinding { code; severity; employeeIds: Id[]; causes:
    VarianceCause[]; detail: Record<string, string>; fingerprint:
    ^[0-9a-f]{64}$; acknowledged: { by: Id; at: Timestamp } | null }`
    (no amounts, notes or bank values in a finding).
  - `GateReport { runId; status: "clear" | "needs-review" | "blocked";
    findings: GateFinding[]; checksNotRun: string[]; computedAt;
    statement: typeof GATE_STATEMENT }`; `GATE_STATEMENT` = "Checks
    run by this system before approval. Contract and variance checks
    are product checks, not legal findings. The WPS check is a format
    dry run."
  - `GateAcknowledge { fingerprint; note: string 3..500 }`.
  - `ContractSalary { id; employeeId; basic: Money; total: Money;
    effectiveFrom: IsoDate; source: "mohre-contract" | "offer-letter" |
    "other"; createdBy; createdAt }`; `ContractSalaryCreate` (all but
    ids and created fields; `note?: string max 500`, stored encrypted,
    never returned).
  - Routes (owner, hr; tenant): `getPayRunGate GET
    /v1/pay-runs/{id}/gate` to `GateReport`; `acknowledgeGateFinding
    POST /v1/pay-runs/{id}/gate/acknowledgements` (`GateAcknowledge`,
    200) to `GateReport`; `listContractSalaries GET
    /v1/employees/{id}/contract-salaries` to `ContractSalary[]`;
    `createContractSalary POST /v1/employees/{id}/contract-salaries`
    (201) to `ContractSalary`.
  - Errors (status): `GATE_NOT_CLEAR` 409 (`detail.codes`),
    `FINDING_NOT_FOUND` 404, `FINDING_NOT_ACKNOWLEDGEABLE` 422,
    `RUN_NOT_DRAFT` (Plan 3's, reused).
- Produces (api):
  - Migration 1101: `contract_salaries(id, company_id, employee_id,
    basic_enc, total_enc, effective_from, source, note_enc, created_by,
    created_at)` (insert, select); `gate_acknowledgements(company_id,
    run_id, fingerprint, acknowledged_by, acknowledged_at, note_enc,
    pk(run_id, fingerprint))` (insert, select).
  - `TOTAL_VARIANCE_REVIEW_BPS = 1000` (product default, not law).
  - `GateEmployee { employeeId; salaryVersion; currentSalaryVersion;
    joiner: boolean; leaver: boolean; unpaidLeaveDays;
    currentUnpaidLeaveDays; gross: Fils; recurringBasic: Fils;
    recurringTotal: Fils; overrideCodes: string[]; oneOffCodes: string[]
    }`; `GateInput { runId; inputHash; current: GateEmployee[];
    previous: { employeeId; gross: Fils; salaryVersion }[] | null;
    addedAfterRun: string[]; wpsSettingsMissing: boolean;
    bankMissing: string[]; sifFindings: { code; severity }[] | null;
    pendingLeave: { employeeId }[]; pendingClaimCount: number;
    contracts: { employeeId; basic: Fils; total: Fils }[];
    ibanGroups: string[][]; acks: { fingerprint; by; at }[] }`.
  - `varianceCauses(cur: GateEmployee, prev: { salaryVersion } |
    undefined): VarianceCause[]` (pure; order as the enum).
  - `evaluateGate(i: GateInput): { findings: GateFinding[];
    checksNotRun: string[] }` (pure). Rules:
    1. Per employee with `gross` different from last month's:
       causes found give `VARIANCE_EXPLAINED` (info); none give
       `VARIANCE_UNEXPLAINED` (review). Previous employees missing now
       give `VARIANCE_EXPLAINED` with cause `NOT_IN_RUN`.
    2. `|sum current - sum previous| * 10000 > TOTAL_VARIANCE_REVIEW_BPS
       * sum previous`: `TOTAL_VARIANCE_HIGH` (review, detail `bps`).
    3. `previous` null: info `NO_PREVIOUS_RUN`, `checksNotRun`
       `["variance"]` (does not block: a first run must be approvable).
    4. `addedAfterRun` (in scope for the period, joined after the
       snapshot): `EMPLOYEE_ADDED_AFTER_RUN` (error: void and recreate).
       `currentSalaryVersion > salaryVersion`: `SALARY_CHANGED_AFTER_RUN`
       (review). `currentUnpaidLeaveDays !== unpaidLeaveDays`:
       `UNPAID_LEAVE_CHANGED` (error).
    5. `pendingLeave` for run employees: `LEAVE_PENDING` (review);
       `pendingClaimCount > 0`: `CLAIMS_PENDING` (review, detail
       `count`).
    6. Contract: no record effective on or before the period's last
       day: `CONTRACT_FIGURE_MISSING` (info; adds `"contract:<id>"` to
       `checksNotRun`); recurring basic or recurring total (no
       overrides or one-offs) different: `CONTRACT_MISMATCH` (review,
       `detail.fields` `"basic"`, `"total"` or `"basic,total"`).
    7. WPS: `wpsSettingsMissing`: `WPS_SETTINGS_MISSING` (error);
       `bankMissing`: one `WPS_BANK_DETAILS_MISSING` (error) listing all
       ids; else each SIF finding: `WPS_ERROR` (error) or `WPS_WARNING`,
       `detail.findingCode`, one per distinct code. A warning is
       `review`, except codes in `WPS_INFO_CODES = ["ROUTING_UNKNOWN"]`,
       which are `info` (the routing table is known to be partial).
    8. Each `ibanGroups` entry of two or more ids:
       `DUPLICATE_BANK_ACCOUNT` (review).
    9. `fingerprint = sha256Hex(canonicalJson({ runId, inputHash, code,
       employeeIds: sorted, detail }))`; `acknowledged` from `acks`.
    10. Status: any error is `blocked`; else any unacknowledged review
        is `needs-review`; else `clear`.
  - `loadGateInput(tx, deps, companyId, runId): Promise<GateInput>`:
    decrypts the snapshot; previous = the approved regular run of the
    month before; `ibanGroups` from decrypted IBANs of run employees,
    grouped in memory and never returned; SIF dry run: `buildSifBatch`
    then `generateSif` and `validateSif(text, defaultLayout,
    dubaiDate(now))`, nothing stored (`buildSifBatch`'s
    `COMPANY_WPS_SETTINGS_MISSING` and `EMPLOYEE_BANK_MISSING` become
    the two inputs above).
  - `gateReport(ctx, runId): Promise<GateReport>`;
    `acknowledge(ctx, runId, body)`: run must be draft (409
    `RUN_NOT_DRAFT`); fingerprint not in the current findings: 404
    `FINDING_NOT_FOUND`; an `error` or `info` finding: 422
    `FINDING_NOT_ACKNOWLEDGEABLE`; idempotent for the same fingerprint;
    audit `gate.acknowledged` (`data: { runId, code }`).
  - `assertGateClear(ctx, run)`: recomputes inside Plan 3's approve
    transaction; not `clear` gives 409 `GATE_NOT_CLEAR` with
    `detail.codes` (codes only).
  - Contract salaries: amounts encrypted with AAD
    `"<companyId>:contract_salaries:<column>:<id>"`; audit
    `contract.salary-recorded` (`data: { employeeId, source }`).
  - `ackAll(app, token, companyId, runId)` (test helper): acknowledges
    every open review finding with the note `"seed"`. Plan 3's
    `seedPayroll` calls it before approving, and so does every test
    that approves through the route.
  - `seedOwnerView(app, seeded)` starts here, returning `{ marRunId }`
    from `seedTwoMonths`; Tasks 6 to 9 add `kid`, `correctionId`,
    `definitionId`, `scheduleId`, `exportId`, `evidenceId` and
    `packId`, so the leak and conformance tests fill every `{id}`.
  - `seedTwoMonths(app, seeded)`: February 2026 run approved; March
    2026 run draft with employee A's salary changed between the runs
    and a one-off `bonus` 500.00 for employee B; returns `{ febRunId,
    marRunId }`.

- [ ] **Step 1: Write the failing tests**

`gate-checks.test.ts` (pure, builders in the file):
- `gate_explains_salary_change`: version 3 now, 2 last month, gross
  up: `VARIANCE_EXPLAINED`, causes `["SALARY_CHANGED"]`.
- `gate_unexplained_variance_is_review`: same version, gross differs,
  no codes: `VARIANCE_UNEXPLAINED`, severity `review`, status
  `needs-review`.
- `gate_total_variance_threshold`: previous total 100000n, current
  110000n: no `TOTAL_VARIANCE_HIGH`; 110001n: present, `detail.bps`
  `"1000"`.
- `gate_first_run_not_blocked`: `previous: null`: status `clear`,
  `checksNotRun` `["variance"]`.
- `gate_wps_errors_block`: `bankMissing: ["e1","e2"]`: one finding
  with both ids, status `blocked`.
- `gate_duplicate_iban_groups`: `ibanGroups [["e1","e3"],["e2"]]`: one
  `DUPLICATE_BANK_ACCOUNT` with `["e1","e3"]`; `JSON.stringify` of the
  result contains no `"AE"`.
- `gate_contract_mismatch_ignores_overrides`: contract basic 400000n,
  recurring basic 400000n, override for basic: no mismatch; contract
  total 500000n against recurring total 550000n: `detail.fields
  "total"`.
- `gate_ack_clears_review`: one review finding acknowledged: `clear`.
- `gate_fingerprint_changes_with_input_hash`: same finding, another
  `inputHash`: another fingerprint.
- fast-check: for any input, `status === "clear"` implies no `error`
  and every `review` acknowledged.

`gate.test.ts` (uses `seedTwoMonths`):
- `gate_report_for_march`: A has `VARIANCE_EXPLAINED` with
  `SALARY_CHANGED`; B has causes `["ONE_OFF"]`; body text has no
  sentinel amount or IBAN.
- `approve_blocked_until_reviewed`: owner approve with MFA gives 409
  `GATE_NOT_CLEAR` whose `detail.codes` lists every unacknowledged
  review code; after acknowledging each, approve gives 200.
- `gate_new_finding_after_ack_blocks`: acknowledge all, then change
  C's salary: approve gives 409 with `SALARY_CHANGED_AFTER_RUN`.
- `gate_duplicate_bank_account`: give two employees one IBAN: one
  `DUPLICATE_BANK_ACCOUNT` with both ids.
- `gate_unpaid_leave_approved_after_run_blocks`: approve an unpaid
  leave in March after the run exists: `UNPAID_LEAVE_CHANGED`,
  `blocked`; acknowledging it gives 422
  `FINDING_NOT_ACKNOWLEDGEABLE`.
- `gate_claims_pending_counts`: with a submitted Plan 6 claim for B:
  `CLAIMS_PENDING` with `detail.count "1"`.
- `gate_contract_mismatch_from_record`: record contract basic
  different from A's basic: `CONTRACT_MISMATCH`; without records:
  `CONTRACT_FIGURE_MISSING` and `checksNotRun` has `contract:<A>`.
- `gate_ack_audit_has_no_note`: audit `data` text lacks the note.
- `gate_manager_forbidden`: manager gets 403 `FORBIDDEN` on both gate
  routes and on contract salaries.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test gate`. Expected:
  FAIL.
- [ ] **Step 3: Implement** the files above; add the four routes to
  `OWNER_ROUTES` and `OWNER_ROUTE_IDS`, rows to the conformance table,
  and `mayView` entries (owner and hr only) to the leak test.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS (Plan 3's existing
  approve tests seed WPS settings and acknowledge or avoid findings;
  adjust their setup, not the gate).
- [ ] **Step 5: Commit** `feat(api): pre-pay gate`.

### Task 3: Engine: deadline dates, GPSSA late addition, payslip preview

Law task: fresh per-task review.

**Files:**
- Modify: `packages/engine/src/sources.ts`, `src/preview.ts` (export
  `applyRuleChange`), `src/index.ts`
- Create: `packages/engine/src/rules/deadlines-pack.ts`,
  `src/deadlines/dates.ts`, `src/deadlines/late.ts`,
  `src/payroll/preview.ts`
- Test: `packages/engine/tests/deadlines.test.ts`,
  `tests/payslip-preview.test.ts`, `tests/no-fine-figures.test.ts`

**Interfaces:**
- Consumes: `RulePack`, `selectPack`, `requireParam`, `deepFreeze`,
  `sourceOf`, `mulDiv`, `Fils`, `Traced`, `EngineError`,
  `parseIsoDate`, `formatIsoDate`; Plan 5 `calculatePayslip`,
  `PayslipInput`, `Payslip`, `PayrollPacks`, source id `DL57_ART11`.
- Produces:
  - Source ids: `MR340_2026_SUMMARY` = `{ url: "https://u.ae/en/
    information-and-services/jobs/Sector-of-employment/
    employment-in-the-private-sector/payment-of-wages"` (one string,
    no spaces), `note: "Ministerial Resolution 340 of 2026 as
    summarised by u.ae and secondary sources; resolution text not
    read"` }; `DL57_ART12` = `{ url:
    "https://uaelegislation.gov.ae/en/legislations/2254", note:
    "Federal Decree-Law 57 of 2023, Article 12" }`.
  - `DEADLINE_PACKS: readonly RulePack[]`: one pack `ae-deadlines`,
    version and effectiveFrom `2026-06-01` (Resolution 340 in force),
    effectiveTo `null`, frozen, exactly these params:

    | key | value | status | source |
    |---|---|---|---|
    | wpsDueDayOfNextMonth | 1 | secondary | MR340_2026_SUMMARY |
    | wpsLateAlertDayOfNextMonth | 2 | convention | ENGINE_CONVENTION |
    | wpsFinePerWorkerFils | null | unsourced | none |
    | wpsFineCapFils | null | unsourced | none |
    | gpssaPayableFromDayOfNextMonth | 1 | official | DL57_ART12 |
    | gpssaLastDayOfNextMonth | 15 | official | DL57_ART12 |
    | gpssaLateDailyBps | 10 | official | DL57_ART11 |
    | gpssaLateCapBps | 10000 | official | DL57_ART11 |
    | gpssaLateRounding | "DOWN" | convention | ENGINE_CONVENTION |

    (`gpssaLateCapBps` 10000: "must not exceed the value of the
    subscriptions due", Art 11(4); the day-2 alert is our reading of
    conflicting grace reports, hence `convention`.)
  - `wpsDeadline(year: number, month: number, packs?: readonly
    RulePack[]): Traced<{ dueDate: string; alertFrom: string }>` and
    `gpssaDeadline(year, month, packs?): Traced<{ payableFrom: string;
    lastDay: string }>`: the pack is selected on the 1st of the next
    month (`NO_PACK_FOR_DATE` before 2026-06-01, so May 2026 is the
    first period); trace ids `deadline.wps.due`, `deadline.wps.alert`,
    `deadline.gpssa.last-day`.
  - `gpssaLateAddition(amountDue: Fils, daysLate: number, packs:
    readonly RulePack[] | undefined, on: string): Traced<Fils>`:
    `daysLate` a whole number 0 or more (else `INVALID_COUNT`);
    result = the smaller of
    `mulDiv(amountDue, dailyBps * daysLate, 10000n, rounding)` and
    `mulDiv(amountDue, capBps, 10000n, rounding)`, with `dailyBps`,
    `capBps` and `rounding` read from the pack selected on `on` (the
    caller passes the deadline's last day; no default); trace id
    `gpssa.late-addition` with the three rules.
  - `applyRuleChange(packs: readonly RulePack[], change: RuleChange):
    RulePack[]` (the existing private `applyChange`, exported and
    renamed; `previewRuleChange` keeps its signature and behaviour).
  - `PayslipPreview { hypothetical: true; before: Traced<Payslip>;
    after: Traced<Payslip>; grossDelta: Fils; netDelta: Fils }`;
    `previewPayslipRuleChange(input: PayslipInput, packs: PayrollPacks,
    change: RuleChange, overrides?: Record<string, ParamValue>):
    PayslipPreview`: applies `applyRuleChange` to whichever of
    `packs.payroll` or `packs.gpssa` holds `change.packId`
    (`MISSING_PACK` when neither).

- [ ] **Step 1: Write the failing tests**

`deadlines.test.ts`:
- `wps_due_first_of_next_month`: `wpsDeadline(2026, 6)` gives
  `dueDate "2026-07-01"`, `alertFrom "2026-07-02"`; December 2026 gives
  `"2027-01-01"`; trace rule status of `deadline.wps.due` is
  `secondary`, of `deadline.wps.alert` `convention`.
- `no_pack_before_resolution_340`: `wpsDeadline(2026, 4)` throws
  `NO_PACK_FOR_DATE`; `wpsDeadline(2026, 5)` returns `2026-06-01`.
- `gpssa_last_day_fifteenth`: `gpssaDeadline(2026, 6).value.lastDay`
  is `"2026-07-15"`, status `official`.
- `gpssa_late_addition_daily`: amount 1000000n, 3 days: 3000n; 0 days:
  0n.
- `gpssa_late_addition_capped`: amount 1000000n, 1001 days: 1000000n.
- `gpssa_late_addition_rounds_down`: amount 999n, 1 day: 0n.
- `wps_fines_unsourced`: both `wpsFine*` params have value `null`,
  source `null`, status `unsourced`.
- `pack_frozen`: `Object.isFrozen` of a param is true.

`payslip-preview.test.ts` (FX rebuilt locally as in Plan 5):
- `identity_change_zero_delta`: `overtimeUpliftBps` set to its current
  value: `grossDelta` 0n and `before.value` deep-equals `after.value`
  (only the trace rule status differs).
- `overtime_change_moves_gross`: FX with 120 overtime minutes, uplift
  5000: `after.value.gross` equals `calculatePayslip(input,
  { ...DEFAULT_PAYROLL_PACKS, payroll: applyRuleChange(...) })
  .value.gross` and `grossDelta = after - before > 0n`; the changed
  rule in `after.trace` has status `hypothetical`.
- `unknown_pack_refused`: packId `"ae-nope"` throws `MISSING_PACK`.
- `settlement_preview_unchanged`: `previewRuleChange` output for the
  Plan 1 sample equals the snapshot taken before this task.

`no-fine-figures.test.ts`: the files under `packages/engine/src/
deadlines/`, `src/rules/deadlines-pack.ts`, and (from Task 5)
`packages/api/src/compliance/` and `src/deadlines/` contain none of
the strings `"1,000"`, `"20,000"`, `"100000"`, `"2000000"` (the WPS
per-worker fine and cap reported as "commonly understood"); files
that do not exist yet are skipped.

- [ ] **Step 2: Run** `pnpm --filter @payroll/engine test deadlines
  payslip-preview no-fine`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above; the purity test now scans
  `src/deadlines/`.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(engine): deadline dates and payslip
  preview`.

### Task 4: What-if and rule-change replay of a past pay run (F2)

**Files:**
- Create: `packages/contract/src/owner/replay.ts`
- Modify: `packages/contract/src/routes-owner.ts`, `src/errors.ts`,
  `src/examples.ts`, `src/index.ts`
- Create: `packages/api/src/replay/to-engine.ts` (pure),
  `src/replay/compute.ts` (pure), `src/replay/service.ts`,
  `src/routes/replay.ts`
- Modify: `src/app.ts`, `tests/conformance.test.ts`,
  `tests/leak.test.ts`
- Test: `packages/api/tests/replay-compute.test.ts`,
  `tests/replay.test.ts`

**Interfaces:**
- Consumes: Task 3 `previewPayslipRuleChange`, `applyRuleChange`;
  `previewRuleChange`, `calculateSettlement`, `calculatePayslip`,
  `GRATUITY_PACKS`, `DEFAULT_PAYROLL_PACKS`, `PAYROLL_PACKS`,
  `mulDiv`, `EngineError` from `@payroll/engine`; Plan 3 `RunSnapshot`,
  `SnapshotEmployee`, `PayRunEntry`, stored payslips; Task 1
  `toSignedMoney`, `ownerAudit`.
- Produces (contract):
  - `ReplayChange` = discriminated union on `kind`: `{ kind: "rule";
    packId: "ae-payroll" | "ae-gratuity"; key: string 1..64; newValue:
    number | string | boolean }` or `{ kind: "raise"; bps: int
    1..10000; employeeIds?: Id[] (1..500) }`.
  - `REPLAY_STATEMENT` = "HYPOTHETICAL. Recomputed by the payroll
    engine from this run's stored inputs with one change. Nothing was
    paid, saved or sent. Rows that do not match what was paid say so."
  - `ReplayNotReplayedCode = z.enum(["GCC_NATIONAL_NOT_MODELLED",
    "GPSSA_INPUT_NOT_STORED","ABSENCE_DATES_NOT_STORED",
    "ENGINE_REFUSED"])`.
  - `ReplayRow { employeeId; employeeName; status: "replayed" |
    "not-replayed"; code: ReplayNotReplayedCode | null; engineCode:
    string | null; paidGross: Money; before: { gross: Money; net:
    Money } | null; after: same | null; delta: { gross: SignedMoney;
    net: SignedMoney } | null; baselineMatchesPaid: boolean | null;
    changedLines: { traceId; before: Money; after: Money }[];
    settlement: { status: "none" | "not-affected" | "replayed" |
    "refused"; before: Money | null; after: Money | null; delta:
    SignedMoney | null } }`.
  - `ReplayResult { hypothetical: true; label: "HYPOTHETICAL";
    statement: typeof REPLAY_STATEMENT; runId; period; change:
    ReplayChange; param: { from: { value; status }; to: { value;
    status: "hypothetical" } } | null; rows: ReplayRow[]; totals: {
    before: Money; after: Money; delta: SignedMoney; replayedCount:
    int; notReplayedCount: int } }`.
  - Route: `replayPayRun POST /v1/pay-runs/{id}/replay` (owner, hr;
    body `{ change: ReplayChange }`, 200) to `ReplayResult`.
  - Errors: `REPLAY_CHANGE_INVALID` 422 (`detail.reason`:
    `"unknown-key"`, `"type-mismatch"`),
    `RUN_VOID` 409, `EMPLOYEE_NOT_IN_RUN` 422.
- Produces (api):
  - `toPayslipInput(e: SnapshotEmployee, entry: PayRunEntry |
    undefined, period: Period, contractHours: number): { ok: true;
    input: PayslipInput; extras: Fils } | { ok: false; code }` (pure):
    `gcc-national` and `uae-national` give the two codes;
    `unpaidLeaveDays > 0` gives `ABSENCE_DATES_NOT_STORED`. Basic is
    the `basic` component; other components map by `sifBucket`
    (`housing`, `conveyance`, `medical`, `passage` to the same kind;
    the rest to `other`). A full-month employee uses the entry's
    override amounts where given (what was paid); a partial-month
    employee uses recurring amounts (the engine prorates). One-offs
    are `extras`, added to both sides. `absences`, `overtime`,
    `restDayWork`, `deductions`, `loans` are empty; `probationEndDate`
    null; `shiftWorker` false; `normalHoursPerDay = contractHours`.
  - `contractHours` = the value of `maxNormalHoursPerDay` read from
    `PAYROLL_PACKS` (no number in the API; no overtime is replayed, so
    hours change nothing).
  - `replayRun(s: RunSnapshot, paid: { employeeId; gross: Fils }[],
    change: ReplayChange): ReplayComputed` (pure; `ReplayComputed` is
    `ReplayResult` rows and totals with `Fils`): for `rule` with
    `ae-payroll`, `previewPayslipRuleChange` per employee and the
    settlement is `not-affected`; for `ae-gratuity`, payslip
    before = after (`calculatePayslip` once) and leavers get
    `previewRuleChange` on the same settlement input Plan 3's
    `computePayRun` builds; for `raise`, every component of the chosen
    employees (all when omitted) is `mulDiv(amount, 10000 + bps, 10000,
    HALF_UP)` (product rounding), both payslip and settlement are
    computed twice. `delta = after - before` of the same computation,
    never against `paidGross`. `before.gross` and `after.gross` are
    the engine gross plus `extras` (one-offs), and
    `baselineMatchesPaid = before.gross === paidGross`. An
    `EngineError` for one employee gives `not-replayed` with
    `ENGINE_REFUSED` and `engineCode`. Totals cover replayed rows
    only.
  - `replayPayRun(ctx, runId, body)`: validates the key exists in the
    named pack and that `typeof newValue` equals the current value's
    type (else 422); void run gives 409; unknown employee ids 422;
    persists nothing; audit `replay.run` (`data: { runId, kind, packId?,
    key?, replayedCount }`).

- [ ] **Step 1: Write the failing tests**

`replay-compute.test.ts` (pure; snapshot builders in the file):
- `replay_identity_change_zero_delta`: expat, full month, basic
  1000000n, housing 400000n, change `ae-payroll` `overtimeUpliftBps` to
  its current value: delta gross `0n`, `baselineMatchesPaid` true.
- `replay_raise_full_month`: same employee, raise 1000 bps: after gross
  1540000n, delta 140000n.
- `replay_raise_selected_only`: two employees, `employeeIds` one of
  them: the other's delta is 0n.
- `replay_gratuity_change_matches_engine`: leaver joined `2019-01-01`,
  left `2026-03-31`, basic 400000n, `unusedLeaveDays: 0`,
  `serviceUnpaidLeaveDays: 0`, change `ae-gratuity`
  `tier1DaysPerYear` 22: settlement delta equals
  `previewRuleChange(sameInput, GRATUITY_PACKS, change).delta`;
  payslip delta 0n.
- `replay_not_replayed_codes`: a UAE national, a GCC national and an
  expat with `unpaidLeaveDays: 2` give the three codes; totals exclude
  them.
- `replay_partial_joiner_flags_mismatch`: joined `2026-03-10`, entered
  overrides: status `replayed`, `baselineMatchesPaid` false.
- `replay_one_off_on_both_sides`: full-month expat paid basic 1000000n
  plus one-off 50000n (`paidGross` 1050000n): `before.gross` 1050000n,
  `baselineMatchesPaid` true; with a raise of 1000 bps `after.gross`
  1150000n (the one-off is not raised).
- fast-check (100 runs): for random full-month expats and raise bps,
  `totals.delta === sum of row deltas` and every row's `delta ===
  after - before`.

`replay.test.ts`:
- `replay_api_is_hypothetical`: owner replays the seeded approved run:
  200, `hypothetical: true`, `label "HYPOTHETICAL"`, `statement` equals
  `REPLAY_STATEMENT`; `SELECT count(*)` of payslips and pay runs is
  unchanged.
- `replay_unknown_key_422`: key `"nope"` gives `REPLAY_CHANGE_INVALID`
  with `detail.reason "unknown-key"`; a string for a numeric param
  gives `"type-mismatch"`; packId `"ae-gpssa"` gives 400
  `VALIDATION_FAILED`.
- `replay_audit_has_no_amounts`: the `replay.run` event `data` text
  has no sentinel amount.
- `replay_manager_forbidden`: 403 `FORBIDDEN`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test replay`.
  Expected: FAIL.
- [ ] **Step 3: Implement** the files above (route, conformance row,
  `OWNER_ROUTE_IDS`). The route is a POST, so the leak test does not
  call it; `replay_manager_forbidden` covers it.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): what-if and rule-change replay`.

### Task 5: Deadline calendar, filing records and compliance score (F3, F5)

**Files:**
- Create: `packages/contract/src/owner/deadlines.ts`,
  `src/owner/compliance.ts`
- Modify: `packages/contract/src/routes-owner.ts`, `src/errors.ts`,
  `src/examples.ts`, `src/index.ts`
- Create: `packages/api/migrations/1102_filings.sql`,
  `src/deadlines/status.ts` (pure), `src/deadlines/filings.ts`,
  `src/deadlines/service.ts`, `src/export/ics.ts` (pure),
  `src/compliance/exposure.ts` (pure), `src/compliance/score.ts`
  (pure), `src/compliance/service.ts`, `src/routes/deadlines.ts`,
  `src/routes/compliance.ts`
- Modify: `src/app.ts`, `tests/conformance.test.ts`,
  `tests/leak.test.ts`
- Test: `packages/api/tests/deadline-status.test.ts`,
  `tests/ics.test.ts`, `tests/exposure.test.ts`,
  `tests/deadlines.test.ts`, `tests/compliance.test.ts`

**Interfaces:**
- Consumes: Task 3 `wpsDeadline`, `gpssaDeadline`,
  `gpssaLateAddition`, `DEADLINE_PACKS`; Plan 7 `EMIRATISATION_PACKS`
  (params `largeCheckpoints`, `midCheckpoints`) and its report
  function `emiratisationReport(tx: Db, deps: AppDeps, companyId:
  string, asOf: string): Promise<EmiratisationReport>` (exported from
  Plan 7's `src/emiratisation/report.ts`); Plan 3 `verifyChain`,
  `dubaiDate`, stored SIF files; Task 2 `gateReport`; Task 1
  `ownerAudit`, `toCsv`.
- Produces (contract):
  - `DeadlineKind = z.enum(["wps-salary","gpssa-contribution",
    "emiratisation-checkpoint"])`; `DeadlineStatus = z.enum(["upcoming",
    "due-soon","done","done-late","overdue","info"])`.
  - `Deadline { id: string (kind:YYYY-MM or kind:date); kind; period:
    Period | null; dueDate: IsoDate; alertFrom: IsoDate | null;
    status; statusLabel: string; doneOn: IsoDate | null; rule:
    TraceLine; productDefaults: string[] }` (`statusLabel` for
    `overdue` is "No payment recorded by the due date").
  - `FilingKind = z.enum(["wps-salary","gpssa"])`; `FilingPut { doneOn:
    IsoDate; amountDue?: Money (gpssa only, else 422
    FILING_AMOUNT_NOT_ALLOWED) }`; `Filing { kind; period; doneOn;
    amountDue: Money | null; recordedBy; recordedAt }`.
  - `Exposure` = union on `status`: `{ status: "computed"; amount:
    Money; trace: TraceLine[] }`, `{ status: "not-assessed"; reason:
    string }`, `{ status: "none" }`.
  - `ComplianceCheck { id: "wps-salary-last-period" |
    "gpssa-last-period" | "sif-last-run-clean" |
    "emiratisation-next-checkpoint" | "audit-chain" |
    "contract-figures"; label; status: "pass" | "fail" |
    "not-assessed" | "not-applicable"; basis: "rule" | "product-check";
    rule: TraceLine | null; reason: string | null; fix: string | null;
    fixBy: IsoDate | null; exposure: Exposure }`.
  - `ComplianceScore { asOf; checks: ComplianceCheck[]; score: {
    passed; failed; notAssessed; notApplicable; percent: int | null };
    exposure: { computedTotal: Money | null; computedCount: int;
    notAssessedCount: int }; statement: typeof COMPLIANCE_STATEMENT }`;
    `COMPLIANCE_STATEMENT` = "A score of this system's own checks.
    Fines are shown only where a sourced rule sets the amount; every
    other item says not assessed. Not legal advice."
  - Routes (owner, hr): `listDeadlines GET /v1/deadlines` (query
    `{ from: IsoDate; to: IsoDate }`, at most 400 days, else 422
    `RANGE_TOO_LONG`) to `Deadline[]`; `downloadDeadlinesIcs GET
    /v1/deadlines/ics` (same query, `contentType: "text/calendar"`);
    `listFilings GET /v1/filings` (query `{ year: int }`) to
    `Filing[]`; `putFiling PUT /v1/filings/{kind}/{year}/{month}`
    (`FilingPut`) to `Filing`; `getComplianceScore GET
    /v1/compliance/score` to `ComplianceScore`.
- Produces (api):
  - Migration 1102: `filings(company_id, kind, year, month, done_on,
    amount_due_enc, recorded_by, recorded_at, pk(company_id, kind,
    year, month))` (insert, select, update: a correction overwrites
    and audits).
  - `DUE_SOON_DAYS = 7` (product default, not law).
  - `deadlineStatus(today: string, dueDate: string, alertFrom: string
    | null, doneOn: string | null): DeadlineStatus` (pure): done on or
    before due: `done`; done after: `done-late`; not done and today on
    or after `alertFrom` (or after `dueDate` when null): `overdue`;
    within `DUE_SOON_DAYS` before due: `due-soon`; else `upcoming`.
  - `listDeadlines(ctx, from, to)`: months whose due date falls in
    range; WPS for every month with an approved regular run or an
    active employee; GPSSA only for months with an active
    `uae-national`; Emiratisation dates from Plan 7's band and its
    checkpoint list (status `info`; the band comes from Plan 7's
    report, no Emiratisation dates when the band is `none`); months
    before the pack give no WPS or GPSSA rows (the engine's
    `NO_PACK_FOR_DATE` is caught and the month is skipped). `today` =
    `dubaiDate(deps.now())`.
  - `toIcs(deadlines: Deadline[], stamp: Date): string` (pure):
    `BEGIN:VCALENDAR`, `VERSION:2.0`, `PRODID:-//payroll//deadlines//EN`,
    one `VEVENT` per deadline with `UID:<id>@payroll`,
    `DTSTAMP:<UTC basic format>`, `DTSTART;VALUE=DATE:<YYYYMMDD>`,
    `SUMMARY`, `DESCRIPTION` with rule status and source note; CRLF;
    lines folded at 75 octets; `,`, `;`, `\` and newlines escaped.
  - `putFiling(ctx, kind, year, month, body)`: audit `filing.recorded`
    (`data: { kind, year, month }`).
  - `complianceScore(ctx): Promise<ComplianceScore>` loads
    `ComplianceFacts` and calls `buildChecks`, `scoreChecks` and
    `sumExposure` (used by the route and by Task 10).
  - `exposureFromTrace(amount: Fils | null, trace: TraceLine[],
    exemptKeys: readonly string[]): Exposure` (pure): `null` amount
    gives `not-assessed` with `reason` `"UNSOURCED_PARAM"`; any rule
    (outside `exemptKeys`) with status not `official`/`secondary`
    gives `not-assessed`, reason `"DEPENDS_ON_<STATUS>"`; any
    `overridden` rule gives `"DEPENDS_ON_OVERRIDE"`; else `computed`.
  - `scoreChecks(checks: ComplianceCheck[]): ComplianceScore["score"]`
    and `sumExposure(checks)` (pure): `percent = round(passed * 100 /
    (passed + failed))`, null when both are 0; `computedTotal` null
    when `computedCount` is 0.
  - `buildChecks(f: ComplianceFacts): ComplianceCheck[]` (pure) over
    `ComplianceFacts { today; lastRun: { period; sifErrorCount: number
    | null; contractMismatch: boolean | null } | null; wps: {
    deadline: Traced<...>; filing: Filing | null } | null; gpssa: {
    deadline; filing; applies: boolean } | null; emiratisation:
    EmiratisationReport | null; chainOk: boolean }`. Rules:
    1. `wps-salary-last-period` (rule): `pass` when done on time, `fail`
       when done late or overdue, `not-assessed` without a run or pack;
       exposure `not-assessed`, reason
       `"UNSOURCED_PARAM:wpsFinePerWorkerFils"`; fix "Record the salary
       payment for YYYY-MM", `fixBy` the alert date.
    2. `gpssa-last-period` (rule): `not-applicable` without nationals;
       status as above against `lastDay`; exposure: `computed` from
       `gpssaLateAddition(amountDue, daysLate, undefined, lastDay)`
       through
       `exposureFromTrace(..., ["gpssaLateRounding"])` where `daysLate =
       (doneOn or today) - lastDay` (0 when on time); `not-assessed`,
       reason `"AMOUNT_DUE_NOT_ENTERED"`, without `amountDue`.
    3. `sif-last-run-clean` (product check): `pass` 0 errors, `fail`
       errors or no SIF; exposure `none`.
    4. `emiratisation-next-checkpoint` (rule): from Plan 7's report:
       `on-target` pass, `below-target` fail, `needs-input`
       not-assessed, `not-applicable` not-applicable; exposure via
       `exposureFromTrace(fineExposure, trace, [])`.
    5. `audit-chain` (product check): `verifyChain` ok pass; exposure
       `none`.
    6. `contract-figures` (product check): last run's gate has
       `CONTRACT_MISMATCH` fail, `CONTRACT_FIGURE_MISSING` only
       not-assessed, else pass; exposure `none`.

- [ ] **Step 1: Write the failing tests**

`deadline-status.test.ts`: due `2026-07-01`, alert `2026-07-02`:
today `2026-06-20` gives `upcoming`; `2026-06-26` and `2026-07-01`
give `due-soon` (the due date itself is not overdue); `2026-07-02` with
no filing gives `overdue`; done `2026-06-30` gives `done`; done
`2026-07-03` gives `done-late`.

`ics.test.ts`: two deadlines give two `VEVENT` blocks, every line ends
with CRLF, no line exceeds 75 octets, a summary with `,` and `;` is
escaped as `\,` and `\;`; `DTSTART;VALUE=DATE:20260701`.

`exposure.test.ts`:
- `exposure_official_rules_computed`: amount 3000n, rules official and
  a `gpssaLateRounding` convention rule exempt: `computed`.
- `exposure_convention_not_assessed`: a convention rule not exempt:
  `not-assessed`, reason `DEPENDS_ON_CONVENTION`.
- `exposure_override_not_assessed`: an `overridden` official rule:
  `DEPENDS_ON_OVERRIDE`.
- `exposure_null_amount`: `null` gives `UNSOURCED_PARAM`.
- `exposure_null_when_nothing_computed` (Review Focus 4): checks with
  only `not-assessed` and `none` exposures: `computedTotal` null (not
  `"0.00"`); one pass, one fail, two not-assessed: `percent` 50.

`deadlines.test.ts`:
- `wps_overdue_uses_dubai_date` (Review Focus 5): an approved June
  2026 run (the pack starts with May): at
  `2026-07-01T19:59:00Z` the June row is `due-soon`; at
  `2026-07-01T20:00:00Z` with no filing it is `overdue` with the
  "No payment recorded" label; after `putFiling` with `doneOn
  2026-07-01` it is `done`.
- `gpssa_rows_only_with_nationals`: no UAE national: no GPSSA rows;
  add one: the June row has `dueDate "2026-07-15"`, rule status
  `official`.
- `emiratisation_dates_from_plan7_pack`: band large (60 active): rows
  `2026-12-31` with status `info`; band none: no rows.
- `filing_amount_only_for_gpssa`: `amountDue` on `wps-salary` gives
  422 `FILING_AMOUNT_NOT_ALLOWED`; the audit has no amount.
- `ics_download`: `Content-Type` starts with `text/calendar`.

`compliance.test.ts`:
- `gpssa_exposure_computed_from_entered_amount`: national employee,
  June filing `doneOn 2026-07-18`, `amountDue "10000.00"`: the check
  fails, exposure `computed` `"30.00"` (3 days x 0.1%).
- `gpssa_exposure_not_assessed_without_amount`: same without
  `amountDue`: `not-assessed`, `AMOUNT_DUE_NOT_ENTERED`.
- `wps_fine_never_computed`: an overdue WPS check has exposure
  `not-assessed` and its reason names `wpsFinePerWorkerFils`.
- `score_counts_assessed_only`: response `score.percent` equals
  `round(passed * 100 / (passed + failed))`.
- `compliance_manager_forbidden`: 403.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test deadline ics
  exposure compliance` and the engine's `no-fine-figures` test.
  Expected: FAIL.
- [ ] **Step 3: Implement** the files above (five routes, conformance
  rows, `mayView` owner and hr).
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): deadline calendar and compliance
  score`.

### Task 6: Verifiable payslips and the payslip PDF (F9)

Crypto and security task: fresh per-task review.

**Design (stated here once; Ruling 9).**
- Algorithm: Ed25519 (RFC 8032) through `crypto.sign(null, msg, key)`
  and `crypto.verify`. One active key per company.
- Key creation: a 32-byte seed from `deps.randomBytes(32)`, imported as
  PKCS#8 DER (`302e020100300506032b657004220420` + seed). The seed is
  stored only as `Keyring.encrypt(dekWrapped, "<companyId>:
  verification_keys:seed:<kid>", base64(seed))`; the raw 32-byte public
  key is stored in clear. `kid` = first 16 hex characters of
  `sha256Hex` of the raw public key.
- Message signed: `"payslip-verification:v1\n" + companyId + "\n" +
  payslipId + "\n" + bodyHash + "\n" + issuedAt`, where `bodyHash =
  sha256Hex(canonicalJson(sealBody(payslip)))` and `sealBody` keeps
  `id, payRunId, employeeId, period, lines (code, amount), gross,
  net`.
- Token: `v1.<kid>.<companyId>.<payslipId>.<base64url signature>`
  (about 180 characters). The QR holds `<verifyBaseUrl>#<token>` (the
  fragment keeps the token out of web server logs), error correction
  level M.
- Verification (online): parse strictly, enter the token's company,
  load key, seal and payslip, recompute `bodyHash`, verify. Results:
  `genuine`, `superseded` (a correction replaced it, Task 7),
  `revoked` (key revoked), else `not-genuine` with one identical body
  for every failure cause.
- Rotation: owner with MFA; the old key becomes `retired` and still
  verifies. Revocation: owner with MFA; its seals answer `revoked` and
  payslips get a new seal from the active key at the next PDF.
- Never in logs, audit, errors or responses: seed, private key,
  signature bytes outside the token.
- Limits: master key from the environment (no KMS, Plan 3 Ruling 9);
  no rate limit on the public route; no offline check; not an
  electronic signature.

**Files:**
- Create: `packages/contract/src/owner/verification.ts`
- Modify: `packages/contract/src/routes-owner.ts`, `src/routes.ts`
  (`contentType` gains `"application/zip"` and `"stored"`;
  `storedTypes?: string[]`), `src/payroll.ts` (`Payslip` gains
  `verificationUrl: string | null`), `src/errors.ts`,
  `src/examples.ts`, `src/openapi.ts`, `src/index.ts`,
  `tests/routes.test.ts` (public routes are now the four plus
  `verifyPayslip`)
- Modify: `packages/api/package.json` (`qrcode` 1.5.4, dev
  `@types/qrcode` 1.5.6), `src/config.ts` (`verifyBaseUrl` from
  `PAYSLIP_VERIFY_URL`, required, `https://` only), `src/deps.ts`
  (`AppDeps.verifyBaseUrl`), `src/app.ts` (`stored` sends
  `BinaryResult.mime`), `src/payroll/pay-runs.ts` (approve calls
  `issueSeals`), `src/payroll/payslips.ts` (`verificationUrl`),
  `tests/helpers/test-app.ts` (`verifyBaseUrl:
  "https://verify.example.test"`), Plan 3's `tests/main.test.ts` (its
  valid env gains `PAYSLIP_VERIFY_URL`; a missing or `http://` value
  throws)
- Create: `packages/api/migrations/1103_verification.sql`,
  `src/export/pdf-table.ts`, `src/verify/token.ts` (pure),
  `src/verify/keys.ts`, `src/verify/seal.ts`,
  `src/verify/payslip-pdf.ts`, `src/routes/verify.ts`
- Test: `packages/api/tests/verify-token.test.ts`,
  `tests/verify.test.ts`, `tests/pdf-table.test.ts`

**Interfaces:**
- Consumes: Plan 7 `BinaryResult`, pdfkit and DejaVu font loading as in
  `pdfkitRenderer`, `contentDisposition`; Plan 3 `Keyring`,
  `canonicalJson`, `sha256Hex`, `ctx.enterTenant`, payslip loading and
  scope rules, `NOT_COMPUTED_PAY`; Task 1 `ownerAudit`.
- Produces (contract):
  - `VERIFY_STATEMENT` = "This code shows that this payslip was issued
    through this system for this company and has not been changed
    since. It is not an electronic signature and does not show that
    the pay is lawful."
  - `VerifyRequest { token: string 1..400 }`; `VerifyResult` = union
    on `status`: `{ status: "genuine" | "superseded"; companyName;
    employeeName; period; gross: Money; net: Money; issuedAt;
    statement }`, `{ status: "revoked"; statement }`, `{ status:
    "not-genuine" }`.
  - `VerificationKey { kid: ^[0-9a-f]{16}$; status: "active" |
    "retired" | "revoked"; createdAt; publicKeyPem }`.
  - Routes: `verifyPayslip POST /v1/verify/payslip` (public) to
    `VerifyResult`; `downloadPayslipPdf GET /v1/payslips/{id}/pdf`
    (all roles, Plan 3 payslip scope, `application/pdf`);
    `listVerificationKeys GET /v1/verification-keys` (owner, hr);
    `rotateVerificationKey POST /v1/verification-keys/rotate` (owner,
    mfa, 201); `revokeVerificationKey POST
    /v1/verification-keys/{kid}/revoke` (owner, mfa).
  - Errors: `KEY_NOT_FOUND` 404, `KEY_ALREADY_REVOKED` 409,
    `PAYSLIP_NOT_APPROVED` 409.
- Produces (api):
  - Migration 1103: `verification_keys(company_id, kid, status,
    public_key, seed_enc, created_at, retired_at, revoked_at,
    pk(company_id, kid))`, partial unique `(company_id) WHERE status
    = 'active'`; `payslip_seals(company_id, payslip_id, kid, issued_at,
    body_hash, token, status: 'current' | 'superseded', pk(payslip_id,
    kid))` (insert, select, update of `status`).
  - `TableDoc { title: string; meta: [string, string][]; columns: {
    label: string; align: "left" | "right"; width: number }[]; rows:
    string[][]; notes: string[]; qr?: { text: string; caption: string
    } }` and `renderTablePdf(doc: TableDoc, createdAt: Date):
    Promise<Uint8Array>` (A4, landscape when more than 6 columns,
    DejaVu fonts, header repeated per page, QR drawn as filled squares
    from `QRCode.create(text, { errorCorrectionLevel: "M" }).modules`,
    `CreationDate` = `createdAt`; English only).
  - `parseToken(t: string): { kid; companyId; payslipId; sig:
    Uint8Array } | null` (pure; regex
    `^v1\.([0-9a-f]{16})\.([0-9a-f-]{36})\.([0-9a-f-]{36})\.
    ([A-Za-z0-9_-]{86})$` as one line); `sealMessage(companyId,
    payslipId, bodyHash, issuedAt): Uint8Array`; `sealBody(p: Payslip):
    unknown`.
  - `activeKey(tx, deps, companyId): Promise<{ kid; privateKey:
    KeyObject }>` (creates one when none); `signWithCompanyKey(tx,
    deps, companyId, message: Uint8Array): Promise<{ kid; signature:
    Uint8Array }>` (used by Task 9); `rotateKey(ctx)`; `revokeKey(ctx,
    kid)`; `publicKeyPem(raw: Uint8Array): string`.
  - `issueSeals(tx, deps, companyId, runId): Promise<number>` (one seal
    per current payslip without a current seal from a non-revoked key;
    audit `seal.issued` `data: { runId, count }`); `ensureSeal(tx,
    deps, companyId, payslipId): Promise<string>` returns the token.
  - `verifyToken(ctx, token): Promise<VerifyResult>`.
  - `payslipPdf(ctx, payslipId): Promise<BinaryResult>`: approved
    payslips only (409 `PAYSLIP_NOT_APPROVED`); the PDF shows company,
    employee, period, every line, gross, net, every `notComputed`
    item, the settlement summary when present, the QR with caption
    "Check this payslip: <verifyBaseUrl>" and `VERIFY_STATEMENT`;
    audit `payslip.downloaded`; file name
    `payslip-<YYYY-MM>-<employee number>.pdf`.

- [ ] **Step 1: Write the failing tests**

`verify-token.test.ts` (pure): `parseToken` accepts a well-formed
token and returns null for a wrong version, a 15-character kid, an
extra segment, padding `=` and a non-uuid id; `sealMessage` is
byte-identical for equal inputs; `sealBody` drops `employeeName` and
`verificationUrl`.

`pdf-table.test.ts`: rendering a 3-row table gives bytes starting with
`%PDF-`; pdfjs text contains the title, each row's cells and each note;
a 7-column table has a landscape first page (width greater than
height); a doc with `qr` renders without error.

`verify.test.ts` (seeded approved run; `deps.randomBytes` sequential):
- `seal_issued_on_approval`: after approve, every payslip has a seal;
  `GET /v1/me/payslips` gives `verificationUrl` starting with
  `https://verify.example.test#v1.`.
- `verify_genuine`: the token from the URL verifies as `genuine` with
  the payslip's gross and net; no auth header needed.
- `verify_tampered_body_not_genuine`: the test decrypts the stored
  payslip body, raises `net`, re-encrypts it with the test keyring and
  writes it back as the database superuser: `{ status: "not-genuine"
  }`.
- `verify_failures_identical`: a random token, a wrong company id, a
  flipped signature byte and an unknown kid all give a body
  deep-equal to `{ status: "not-genuine" }`.
- `rotate_keeps_old_tokens`: rotate, the old token stays `genuine`,
  the new key is `active` and the old one `retired`.
- `revoke_then_reseal`: revoke the key: the old token gives `revoked`;
  the next PDF download issues a token with the new kid that verifies
  `genuine`.
- `key_material_never_stored_plain`: the `verification_keys` table
  text, every audit `data` and every log line contain neither the
  base64 nor hex seed.
- `rotate_needs_owner_mfa`: hr 403 `FORBIDDEN`; owner without MFA 403
  `MFA_REQUIRED`.
- `payslip_pdf_scope`: the employee gets their own PDF (`%PDF-`,
  `application/pdf`, pdfjs text contains their employee number and
  `VERIFY_STATEMENT`); a colleague's id gives 404; a manager gets 404
  for a report's payslip (Plan 3 rule: others see own payslips only);
  a draft run's payslip gives 409 `PAYSLIP_NOT_APPROVED` to hr.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test verify
  pdf-table`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above (five routes, conformance
  rows; `mayView`: keys owner and hr).
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): verifiable payslips and PDF`.

### Task 7: Correction record for amended pay runs (F11)

Money task: fresh per-task review.

**Files:**
- Create: `packages/contract/src/owner/corrections.ts`
- Modify: `packages/contract/src/routes-owner.ts`, `src/payroll.ts`
  (`PayRun` gains `kind`, `correctsRunId`; `Payslip` gains `status`,
  `supersededBy`, `correctionOf`), `src/approvals.ts` (`SubjectType`
  adds `"pay-run-correction"`), `src/errors.ts`, `src/examples.ts`,
  `src/index.ts`
- Create: `packages/api/migrations/1104_corrections.sql`,
  `src/corrections/diff.ts` (pure), `src/corrections/create.ts`,
  `src/corrections/subject.ts`, `src/corrections/delta.ts`,
  `src/routes/corrections.ts`
- Modify: Plan 6 `src/approvals/subjects.ts` (`SubjectFacts
  .claimantEmployeeId: string | null`; optional `SubjectHandler
  .mfaToDecide`, `.defaultTiers`, `.chainLocked`),
  `src/approvals/chains.ts` (default tiers per handler; `putChain` on
  a locked type 422 `CHAIN_LOCKED`), `src/approvals/decide.ts` (MFA
  check), Plan 3 `src/payroll/pay-runs.ts` (approve and void refuse
  correction runs: 409 `RUN_IS_CORRECTION`), `src/payroll/payslips.ts`
  (new fields; employees see approved correction payslips),
  `src/verify/seal.ts` (`verifyToken` gives `superseded`),
  `src/app.ts`, `tests/conformance.test.ts`, `tests/leak.test.ts`
- Test: `packages/api/tests/correction-diff.test.ts`,
  `tests/corrections.test.ts`

**Interfaces:**
- Consumes: Plan 3 `computePayRun`, `RunSnapshot`, `snapshotHash`,
  idempotency pattern of `createPayRun`; Plan 6 `openRequest`,
  `cancelRequest`, `viewFor`, `SubjectHandler`, `ApprovalView`; Task 6
  `issueSeals`; Task 1 `toCsv`, `toSignedMoney`, `ownerAudit`.
- Produces (contract):
  - `CorrectionCategory = z.enum(["data-entry","late-input",
    "engine-error","other"])`; `CorrectionCreate { category; reason:
    string 10..1000; entries: PayRunEntry[] (1..500) }` (entries give
    the corrected amounts as overrides and one-offs).
  - `RECOVERY_NOTE` = "A negative difference is an overpayment. It is
    not deducted automatically. Any recovery is a separate decision."
  - `CorrectionRow { employeeId; employeeName; before: { gross: Money;
    net: Money }; after: same; delta: { gross: SignedMoney; net:
    SignedMoney }; lines: { code; before: Money | null; after: Money |
    null; delta: SignedMoney }[]; settlementDelta: SignedMoney | null
    }`.
  - `Correction { id; originalRunId; correctionRunId; period; category;
    reason; status: "pending" | "approved" | "rejected" | "cancelled";
    approval: ApprovalView | null; rows: CorrectionRow[]; totals: {
    grossDelta: SignedMoney; netDelta: SignedMoney; overpaymentCount:
    int }; recoveryNote: typeof RECOVERY_NOTE; createdBy; createdAt;
    closedAt: Timestamp | null }`; `CorrectionSummary` = without `rows`
    and `reason`.
  - Routes (owner, hr): `createCorrection POST
    /v1/pay-runs/{id}/corrections` (header `Idempotency-Key`, 201,
    `altStatus` 200) to `Correction`; `listCorrections GET
    /v1/pay-run-corrections` (query `{ payRunId?: Id }`) to
    `CorrectionSummary[]`; `getCorrection GET
    /v1/pay-run-corrections/{id}`; `cancelCorrection POST
    /v1/pay-run-corrections/{id}/cancel`; `downloadCorrectionDelta GET
    /v1/pay-run-corrections/{id}/delta` (mfa, `text/csv`).
  - Errors: `RUN_NOT_APPROVED` (Plan 3's), `RUN_IS_CORRECTION` 409,
    `EMPLOYEE_NOT_IN_RUN` 422 (Task 4's), `CORRECTION_NO_CHANGE` 422
    (`detail.employeeIds`), `CORRECTION_OPEN` 409, `CHAIN_LOCKED` 422,
    `CORRECTION_NOT_PENDING` 409, `PAY_RUN_PROBLEMS` (Plan 3's).
- Produces (api):
  - Migration 1104: `pay_runs` gains `kind text not null default
    'regular' check (kind in ('regular','correction'))` and
    `corrects_run_id uuid null`; the period index becomes `unique
    (company_id, year, month) WHERE status <> 'void' AND kind =
    'regular'`; `payslips` gains `superseded_by uuid null`;
    `pay_run_corrections(id, company_id, original_run_id,
    correction_run_id, category, reason_enc, employee_ids uuid[],
    status, approval_id, created_by, created_at, closed_at)`, partial
    unique `(original_run_id) WHERE status = 'pending'`.
  - `diffPayslips(before: ComputedPayslip[], after: ComputedPayslip[]):
    CorrectionRow-with-Fils[]` (pure): lines matched by `code`;
    `delta = after - before`; a payslip with no line, gross, net or
    settlement change is reported in `unchanged: string[]`.
  - `createCorrection(ctx, runId, key, body)`: one tenant transaction:
    the run must be approved and regular; every entry's employee in its
    snapshot; no pending correction for the run; the correction
    snapshot = the original snapshot's records for those employees with
    the new entries; `computePayRun`; problems give 422; the diff base
    is each employee's **current** payslip for the period (the
    original, or the payslip of an earlier approved correction);
    `unchanged` non-empty gives 422 `CORRECTION_NO_CHANGE`; inserts a
    draft run of kind `correction` (idempotency as Plan 3: same key
    and body 200, other body 409 `IDEMPOTENCY_KEY_REUSED`), its payslips, the
    record, then `openRequest(ctx, handlers, "pay-run-correction",
    correctionId, userId)`; audit `correction.created` (`data: {
    originalRunId, category, employeeCount }`).
  - Correction subject handler: `facts` gives `claimantEmployeeId:
    null`, `claimantUserId: null`, `lineManagerUserId: null`, `total`
    = sum of absolute net deltas, `overLimit: false`, summary
    `{ employeeName: "<n> employees", title: "Pay run correction
    YYYY-MM", total, flagCodes: [category] }`; `canView` true for owner
    and hr, false otherwise; `defaultTiers` `[{ approver: {
    kind: "role", role: "owner" }, minTotal: "0.00" }]`; `chainLocked:
    true`; `mfaToDecide: true`; the submitter is excluded by the spine,
    so a creator never approves (equal to Plan 3's owner, MFA and
    not-creator rule). `onClosed("approved")`: correction run approved
    (`approvedBy`, `approvedAt`), the diffed current payslips get
    `superseded_by`, their seals `superseded`, `issueSeals` for the
    new payslips, record `approved`, audit `correction.approved`.
    `rejected` or `returned`: run void, record `rejected`, audit
    `correction.rejected`.
  - `cancelCorrection`: pending only (409 `CORRECTION_NOT_PENDING`);
    `cancelRequest`, run void, record `cancelled`.
  - `deltaCsv(c: Correction): string`: columns `employee_number,
    employee_name, item, before, after, difference`; one row per
    changed line plus one `settlement` row when it changed. No second
    SIF is produced.

- [ ] **Step 1: Write the failing tests**

`correction-diff.test.ts`: basic 400000n to 420000n gives a line delta
20000n and gross delta 20000n; a removed one-off gives `after: null`
and a negative delta; an identical payslip is listed in `unchanged`;
fast-check: the sum of line deltas equals the gross delta.

`corrections.test.ts` (seeded approved March run; owner O, second
owner O2, hr H):
- `correction_flow_owner_approves`: H creates with a higher basic for
  A: 201, status `pending`, one row with positive `grossDelta`; O2 in
  the inbox approves with MFA: status `approved`; A's original payslip
  has `status "superseded"` and `supersededBy` the new payslip;
  `GET /v1/me/payslips` for A lists both.
- `creator_cannot_approve`: O creates; O deciding gives 403
  `SOD_VIOLATION`; with no other owner the create gives 422
  `NO_ELIGIBLE_APPROVER`.
- `correction_decide_needs_mfa`: O2 without MFA gets 403
  `MFA_REQUIRED`.
- `chain_locked`: `PUT /v1/approval-chains/pay-run-correction` gives
  422 `CHAIN_LOCKED`.
- `no_change_refused`: entries equal to what was paid give 422
  `CORRECTION_NO_CHANGE` with A's id.
- `second_open_correction_409`: `CORRECTION_OPEN`.
- `second_correction_diffs_current_payslip`: after one approved
  correction raising A's basic by 200.00, a second raising it by
  another 100.00 shows `before` equal to the first correction's
  payslip and line delta `"100.00"`; on approval exactly one of A's
  March payslips has `status "current"`.
- `negative_delta_flagged_not_deducted`: a lower basic: `netDelta`
  negative, `overpaymentCount` 1, `recoveryNote` equals
  `RECOVERY_NOTE`; no payslip has a deduction line.
- `regular_period_still_unique`: after an approved correction, a new
  regular run for March gives 409 `RUN_EXISTS_FOR_PERIOD`.
- `approve_route_refuses_correction_run`: `POST
  /v1/pay-runs/{correctionRunId}/approve` gives 409
  `RUN_IS_CORRECTION`.
- `verify_superseded_after_correction` (Review Focus 3): A's old
  payslip token verifies as `superseded`; the new payslip's token as
  `genuine`.
- `delta_csv`: download with MFA gives `text/csv` with a `basic` row
  and difference `"200.00"`; without MFA 403.
- `idempotent_create`: the same key and body twice give 201 then 200
  with one record.
- `correction_audit_has_no_reason`: audit `data` text lacks the
  reason and any amount.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test correction`.
  Expected: FAIL.
- [ ] **Step 3: Implement** the files above; Plan 6's
  `approvals.test.ts` must still pass unchanged (the expense handler
  sets none of the new optional fields).
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): pay run correction record`.

### Task 8: Payroll reports, report builder and scheduled exports (F6, F7)

**Files:**
- Create: `packages/contract/src/owner/reports.ts`
- Modify: `packages/contract/src/routes-owner.ts`, `src/errors.ts`,
  `src/examples.ts`, `src/index.ts`
- Create: `packages/api/migrations/1105_reports.sql`,
  `src/reports/datasets.ts` (pure), `src/reports/load.ts`,
  `src/reports/liability.ts`, `src/reports/run.ts`,
  `src/reports/definitions.ts`, `src/reports/schedules.ts`,
  `src/reports/next-run.ts` (pure), `src/reports/jobs.ts`,
  `src/routes/reports.ts`
- Modify: Plan 7's `src/files/files.ts` (add `storeGeneratedFile`),
  `src/main.ts` (`main.ts jobs`), root `package.json` (`api:jobs`),
  `src/app.ts`, `tests/conformance.test.ts`, `tests/leak.test.ts`
- Test: `packages/api/tests/datasets.test.ts`,
  `tests/next-run.test.ts`, `tests/reports.test.ts`,
  `tests/report-jobs.test.ts`

**Interfaces:**
- Consumes: Task 2 `varianceCauses`; Task 6 `renderTablePdf`; Task 7
  payslip `status` and run `kind`; Task 1
  `toCsv`, `toSignedMoney`, `ownerAudit`; `calculateSettlement`,
  `GRATUITY_PACKS` from `@payroll/engine`; Plan 3 payslips, runs,
  employees, departments, `verifyChain`, audit events, `dubaiDate`;
  Plan 7 `FileRef`, `readFile`, `BinaryResult`.
- Produces (contract):
  - `DatasetId = z.enum(["payroll-register","payroll-cost-by-department",
    "payroll-variance","gratuity-liability","headcount","audit-log"])`;
    `DatasetInfo { id; label; columns: { id; label; kind: "text" |
    "money" | "signed-money" | "int" | "date" }[]; notes: string[] }`.
  - `PeriodMode = z.enum(["fixed","last-closed-month",
    "last-12-closed-months"])`; `ReportFilters { periodMode;
    fromPeriod?: Period; toPeriod?: Period; asOf?: IsoDate;
    departmentIds?: Id[] (1..50) }`.
  - `ReportSpec { dataset; columns: string[] (1..30, unique); filters;
    sort?: { column; dir: "asc" | "desc" } }`; `ReportResult { dataset;
    columns: { id; label }[]; rows: (string | null)[][]; notes:
    string[]; resolved: { fromPeriod: Period | null; toPeriod: Period |
    null; asOf: IsoDate | null }; generatedAt }`.
  - `ReportDefinition { id; name 1..120; spec: ReportSpec; status:
    "active" | "archived"; createdBy; createdAt; updatedAt }`;
    `ReportDefinitionCreate { name; spec }`; `ReportDefinitionUpdate
    { name?; spec?; status? }`.
  - `Cadence` = union on `kind`: `{ kind: "monthly"; day: int 1..28 }`,
    `{ kind: "weekly"; weekday: int 1..7 }` (1 = Monday);
    `ReportSchedule { id; definitionId; cadence; format: "csv" | "pdf";
    active: boolean; nextRunOn: IsoDate; pausedReason:
    "creator-not-allowed" | "definition-archived" | null; createdBy;
    createdAt }`; `ReportScheduleCreate { definitionId; cadence; format
    }`; `ReportScheduleUpdate { cadence?; format?; active? }`.
  - `ReportExport { id; definitionId; scheduleId: Id | null; format;
    fileName; rowCount: int; createdBy; createdAt }`;
    `EXPORT_DELIVERY_NOTE` = "Scheduled exports appear in the exports
    list. Email delivery is not built."
  - `LIABILITY_NOTE` = "Estimate: the gratuity each employee would get
    if they left on the date shown, from current basic salary. Leave
    pay, notice pay and other dues are not included. Unpaid leave
    before this system was used is not known."
  - Routes (owner, hr; mfa where marked): `listReportDatasets GET
    /v1/report-datasets`; `runReport POST /v1/reports/run`
    (`ReportSpec`, 200) to `ReportResult`; `listReportDefinitions GET
    /v1/report-definitions`; `createReportDefinition POST
    /v1/report-definitions` (201); `updateReportDefinition PATCH
    /v1/report-definitions/{id}`; `exportReport POST
    /v1/report-definitions/{id}/exports` (mfa, body `{ format }`, 201)
    to `ReportExport`; `listReportExports GET /v1/report-exports`;
    `downloadReportExport GET /v1/report-exports/{id}/download` (mfa,
    `stored`, `storedTypes` `["text/csv","application/pdf"]`);
    `listReportSchedules GET /v1/report-schedules`;
    `createReportSchedule POST /v1/report-schedules` (mfa, 201);
    `updateReportSchedule PATCH /v1/report-schedules/{id}` (mfa).
  - Errors: `REPORT_COLUMN_UNKNOWN` 422, `REPORT_RANGE_TOO_LONG` 422
    (over 24 months), `REPORT_TOO_LARGE` 422 (over 20,000 rows),
    `REPORT_TOO_LARGE_FOR_PDF` 422 (over 5,000 rows),
    `DEFINITION_ARCHIVED` 409.
- Produces (api):
  - Migration 1105: `report_definitions(id, company_id, name, spec
    jsonb, status, created_by, created_at, updated_at)`;
    `report_schedules(id, company_id, definition_id, cadence jsonb,
    format, active, next_run_on, paused_reason, created_by,
    created_at)`; `report_exports(id, company_id, definition_id,
    schedule_id, run_on date, format, file_id, row_count, created_by,
    created_at, unique(schedule_id, run_on))`; function
    `due_report_schedules(p_today date) RETURNS TABLE(company_id uuid,
    schedule_id uuid)` `SECURITY DEFINER`, `SET search_path = public`,
    returning only ids of active schedules with `next_run_on <=
    p_today`. Because RLS is forced, the function is owned by a new
    role `payroll_jobs` (NOLOGIN, BYPASSRLS, created when missing)
    whose only grant is SELECT on `report_schedules`; `GRANT EXECUTE`
    to `payroll_app`. Plan 3's catalog test still checks that
    `payroll_app` has no BYPASSRLS.
  - Plan 7 `files.ts` gains `storeGeneratedFile(tx: Db, deps: AppDeps,
    companyId: string, createdBy: string, name: string, mime:
    GeneratedMime, bytes: Uint8Array): Promise<FileRef>` with
    `GeneratedMime = "text/csv" | "application/pdf" |
    "application/zip"` (no sniffing: the bytes are ours; Plan 7's
    `storeFile` is unchanged). If Plan 7's `files.mime` has a CHECK
    constraint, migration 1105 widens it to these three types.
  - `DATASETS: Record<DatasetId, DatasetDef>` (pure) where `DatasetDef
    { info: DatasetInfo; build(rows: LoadedRows, f: ResolvedFilters):
    (string | null)[][] }`. Columns:
    - `payroll-register`: period, employeeNumber, employeeName,
      department, runKind, basic, allowances, oneOffs, gross, net,
      payslipStatus (from approved regular and correction runs;
      superseded payslips appear as rows with that status).
    - Totals and every other dataset count **current** payslips only,
      so a corrected employee is never counted twice.
    - `payroll-cost-by-department`: period, department, headcount,
      gross, net, employerContributions (always the text "not
      computed").
    - `payroll-variance`: period, employeeNumber, employeeName,
      previousGross, gross, difference (`signed-money`), causes (the
      Task 2 causes joined by `;`).
    - `gratuity-liability`: asOf, employeeNumber, employeeName,
      joiningDate, basic, gratuity (null when not computed), status
      (`computed` | `not-eligible` | `not-applicable` | `refused`),
      reason; notes `[LIABILITY_NOTE]`.
    - `headcount`: period, department, active, joiners, leavers.
    - `audit-log`: seq, at, actorUserId, action, entityType, entityId
      (never `data`).
  - `resolveFilters(f: ReportFilters, today: string): ResolvedFilters`
    (pure): `last-closed-month` is the month before today's month;
    `last-12-closed-months` the 12 months ending there; `fixed` needs
    both periods; `asOf` defaults to today.
  - `gratuityLiability(tx, deps, companyId, asOf): Promise<
    LiabilityRow[]>`: per employee active on `asOf`,
    `calculateSettlement({ gratuity: { joiningDate, lastWorkingDate:
    asOf, unpaidLeaveDays: <approved unpaid leave days from joining to
    asOf>, lastBasicMonthly: <current basic>, workerClass },
    unusedLeaveDays: 0 }, GRATUITY_PACKS)` taking the gratuity part;
    an `EngineError` gives `refused` with its code.
    `unpaidLeaveDaysBetween(tx, companyId, employeeId, from, to):
    Promise<number>` is added beside Plan 3's `unpaidLeaveDaysIn`.
  - `JobCtx { tx: Db; deps: AppDeps; companyId: string; userId: string
    }` (what a scheduled run has instead of a request).
  - `runReport(ctx, spec): Promise<ReportResult>`;
    `exportDefinition(c: ReqCtx | JobCtx, defId, format, scheduleId:
    string | null, runOn: string): Promise<ReportExport>`
    renders CSV (`toCsv`) or PDF (`renderTablePdf` with notes), stores
    with `storeGeneratedFile`, audit `report.exported` (`data: {
    definitionId, format, rowCount }`).
  - `nextRunOn(c: Cadence, after: string): string` (pure, strictly
    after).
  - `runDueExports(db: Db, deps: AppDeps): Promise<{ ran: number;
    paused: number; skipped: number }>`: `today = dubaiDate(now)`;
    calls `due_report_schedules(today)`; per row one `withTenant({
    companyId, userId: createdBy })`: locks the schedule `FOR UPDATE`;
    the creator must still be an owner or hr member (else `active`
    false, `paused_reason "creator-not-allowed"`, audit
    `report.schedule-paused`); an archived definition pauses with
    `"definition-archived"`; inserts the export row `ON CONFLICT
    (schedule_id, run_on) DO NOTHING` and skips when no row returns;
    else renders, stores, sets `next_run_on = nextRunOn(cadence,
    today)`. `main.ts jobs` runs it once and exits (run by an external
    scheduler; none is set up).

- [ ] **Step 1: Write the failing tests**

`datasets.test.ts` (pure, rows built in the file): the register for
two payslips gives two rows with `gross` `"5500.00"` and `"4000.00"`;
cost by department sums gross per department and the last column is
`"not computed"`; variance gives `difference "-150.00"` for a drop and
causes `"SALARY_CHANGED"`; liability rows keep `null` gratuity for a
refused employee; `resolveFilters({ periodMode: "last-closed-month"
}, "2026-03-05")` gives February 2026 for both ends;
`last-12-closed-months` from `"2026-01-10"` gives 2025-01 to 2025-12.

`next-run.test.ts`: monthly day 28 after `2026-02-28` gives
`2026-03-28`; after `2026-02-27` gives `2026-02-28`; weekly weekday 1
after Monday `2026-03-02` gives `2026-03-09`.

`reports.test.ts`:
- `run_register_columns_subset`: columns `["employeeNumber","gross"]`
  give exactly two columns in that order.
- `unknown_column_422`: `REPORT_COLUMN_UNKNOWN`.
- `range_over_24_months_422`.
- `liability_matches_engine`: one expat joined `2019-01-01`, basic
  4000.00, asOf `2026-03-31`: gratuity equals the engine's gratuity for
  the same input formatted with `toMoney`; notes contain
  `LIABILITY_NOTE`.
- `export_csv_and_download`: create a definition, export CSV with MFA:
  201; download gives `text/csv` and the bytes equal `toCsv` of the
  run's rows; without MFA 403 `MFA_REQUIRED`.
- `export_pdf_text`: PDF export's pdfjs text contains each column
  label and the notes.
- `reports_manager_forbidden`: manager gets 403 on `runReport`,
  `listReportExports` and `downloadReportExport`; employee the same.

`report-jobs.test.ts`:
- `schedule_runs_once_per_day`: a due schedule; `runDueExports` called
  twice with the same clock (and once more concurrently with
  `Promise.all`): exactly one `report_exports` row; `nextRunOn`
  advanced once.
- `schedule_paused_when_creator_demoted`: the hr creator's membership
  role changed to `employee`: `paused: 1`, no export, `pausedReason
  "creator-not-allowed"`.
- `job_crosses_tenants_without_leak`: schedules in companies A and B:
  each export is stored under its own company; `withTenant` for A
  sees only A's exports.
- `due_function_returns_ids_only`: the function's result columns are
  exactly `company_id, schedule_id`.
- `due_function_owner_bypasses_rls`: `pg_proc.proowner` of the function
  is `payroll_jobs`, which has `rolbypassrls` true and no grant except
  SELECT on `report_schedules` (from `information_schema
  .role_table_grants`); called inside `withTenant` with no company, it
  returns the due schedules of both companies.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test datasets
  next-run reports report-jobs`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above (eleven routes,
  conformance rows, `mayView` owner and hr).
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): payroll reports, builder and
  scheduled exports`.

### Task 9: Evidence locker, readiness checklist, inspection pack (F8, F10)

Evidence and security task: fresh per-task review.

**Files:**
- Create: `packages/contract/src/owner/evidence.ts`
- Modify: `packages/contract/src/routes-owner.ts`, `src/errors.ts`,
  `src/examples.ts`, `src/index.ts`
- Create: `packages/api/migrations/1106_evidence.sql`,
  `migrations/1107_readiness.sql`, `migrations/1108_packs.sql`,
  `src/evidence/locker.ts`, `src/evidence/readiness.ts` (pure),
  `src/evidence/readiness-facts.ts`, `src/evidence/pack-files.ts`,
  `src/evidence/pack.ts`, `src/routes/evidence.ts`
- Modify: `src/app.ts`, `tests/conformance.test.ts`,
  `tests/leak.test.ts`
- Test: `packages/api/tests/readiness.test.ts`,
  `tests/evidence.test.ts`, `tests/inspection-pack.test.ts`,
  `tests/binary-routes.test.ts`

**Interfaces:**
- Consumes: Plan 7 `claimFile`, `readFile`, `FileRef`,
  `contentDisposition`; Task 8 `storeGeneratedFile`; Task 6
  `payslipPdf` renderer pieces, `signWithCompanyKey`, `publicKeyPem`;
  Task 5 filings; Task 7 corrections; Task 1 `buildZip`, `toCsv`,
  `ownerAudit`; Plan 3 `verifyChain`, `eventHash`, `GENESIS_HASH`,
  audit rows, attendance, SIF files, `SIF_STATEMENT`.
- Produces (contract):
  - `EvidenceCategory = z.enum(["trade-licence","establishment-card",
    "mohre-contract","wps-bank-confirmation","gpssa-receipt","policy",
    "inspection-pack","other"])`.
  - `EvidenceItem { id; category; label 1..200; period: Period | null;
    employeeId: Id | null; file: FileRef; supersededBy: Id | null;
    addedBy; addedAt }`; `EvidenceAdd { fileId: Id; category (not
    "inspection-pack"); label; period?; employeeId?; supersedes?: Id
    }`.
  - `ReadinessItemId = z.enum(["wps-employer-set",
    "bank-details-complete","contract-figures-entered",
    "pay-runs-approved","sif-files-clean","salary-payments-recorded",
    "audit-chain-verifies","trade-licence-on-file",
    "establishment-card-on-file","contracts-on-file",
    "inspection-pack-recent"])`; `ReadinessItem { id; label; kind:
    "auto" | "manual"; status: "done" | "open" | "not-applicable";
    detail: string | null; evidenceIds: Id[]; confirmedBy: Id | null;
    confirmedAt: Timestamp | null }`; `ReadinessChecklist { asOf;
    items; summary: { done; open; notApplicable }; statement:
    typeof READINESS_STATEMENT }`; `READINESS_STATEMENT` = "A product
    checklist for getting records ready. It is not a legal list of
    what an inspector may ask for."; `ReadinessConfirm { evidenceIds:
    Id[] (1..20) }`.
  - `PackPart = z.enum(["contracts","payslips","wps","audit",
    "attendance","corrections"])`; `PackRequest { from: IsoDate; to:
    IsoDate; employeeIds?: Id[] (1..500); parts: PackPart[] (1..6,
    unique) }`; `InspectionPack { id; from; to; parts; employeeCount;
    fileName; size: int; sha256; kid; createdBy; createdAt;
    evidenceId }`.
  - Routes (owner, hr): `listEvidence GET /v1/evidence` (query `{
    category?; employeeId?; includeSuperseded?: "true" }`); `addEvidence
    POST /v1/evidence` (201); `downloadEvidence GET
    /v1/evidence/{id}/download` (mfa, `stored`, `storedTypes` the three
    Plan 7 upload types plus `application/zip`); `getAuditReadiness GET
    /v1/audit-readiness`; `confirmReadinessItem PUT
    /v1/audit-readiness/items/{itemId}` (`ReadinessConfirm`; manual
    items only, else 422 `ITEM_NOT_MANUAL`); `generateInspectionPack
    POST /v1/inspection-packs` (mfa, 201); `listInspectionPacks GET
    /v1/inspection-packs`; `downloadInspectionPack GET
    /v1/inspection-packs/{id}/download` (mfa, `application/zip`).
  - Errors: `EVIDENCE_ALREADY_SUPERSEDED` 409, `ITEM_NOT_MANUAL` 422,
    `EVIDENCE_CATEGORY_MISMATCH` 422, `PACK_RANGE_TOO_LONG` 422 (over
    366 days), `PACK_TOO_LARGE` 422, `FILE_NOT_AVAILABLE` (Plan 7's).
- Produces (api):
  - Migration 1106: `evidence_items(id, company_id, category, label,
    year, month, employee_id, file_id, superseded_by, added_by,
    added_at)`; trigger refusing UPDATE of any column except
    `superseded_by` (once, null to a value) and every DELETE; grants
    select, insert, update. Migration 1107: `readiness_confirmations(
    company_id, item_id, evidence_ids uuid[], confirmed_by,
    confirmed_at, pk(company_id, item_id))` (insert, select, update).
    Migration 1108: `inspection_packs(id, company_id, from_date,
    to_date, parts text[], employee_count, file_id, size, sha256, kid,
    evidence_id, created_by, created_at)` (insert, select).
  - `PACK_MAX_BYTES = 104_857_600` and `PACK_RECENT_DAYS = 90`
    (product defaults, not law).
  - `addEvidence(ctx, body)`: `claimFile(ctx, fileId,
    "evidence:<id>")`; `supersedes` sets the old item's
    `superseded_by` (409 when already set; categories must match, else
    422); audit `evidence.added` and `evidence.superseded` (`data: {
    category }`). No retention period; nothing is ever deleted.
  - `evaluateReadiness(f: ReadinessFacts): ReadinessItem[]` (pure).
    Auto items: `wps-employer-set` (company WPS ids set);
    `bank-details-complete` (every active employee has labour person
    id, routing and IBAN; `detail` "N of M"); `contract-figures-entered`
    (every active employee has a contract salary record);
    `pay-runs-approved` (each of the last 12 closed months from the
    first run on has an approved regular run; no runs gives
    `not-applicable`); `sif-files-clean` (each such run has a SIF with
    zero errors); `salary-payments-recorded` (each such month has a
    `wps-salary` filing); `audit-chain-verifies`; `contracts-on-file`
    (every active employee has a current `mohre-contract` item);
    `inspection-pack-recent` (a pack within `PACK_RECENT_DAYS`).
    Manual items: `trade-licence-on-file`, `establishment-card-on-file`
    (done when confirmed with current, non-superseded evidence of the
    matching category; a superseded confirmation reverts to `open`).
  - Pack layout (`buildPackFiles` in `pack-files.ts`, pure over loaded
    rows plus rendered PDFs):

    ```
    README.txt                  contents, statements, how to verify
    manifest.json               files with size and sha256
    manifest.sig                base64 Ed25519 signature
    verification-key.pem        the signing public key
    contracts/contract-figures.csv
    contracts/<number>-<evidenceId>.<pdf|png|jpg>
    payslips/register.csv
    payslips/<YYYY-MM>/<number>-<payslipId>.pdf
    wps/<YYYY-MM>/<fileName>    stored SIF text
    wps/<YYYY-MM>/findings.json
    audit/events.jsonl
    audit/chain-certificate.json
    attendance/attendance.csv
    corrections/corrections.csv
    ```

    `manifest.json` = `{ format: "inspection-pack/v1", companyName,
    from, to, parts, employeeCount, generatedAt, kid, statements:
    [PACK_STATEMENT, SIF_STATEMENT], files: [{ path, size, sha256 }] }`
    (every file except the three `manifest.*`/key files); the
    signature covers `"inspection-pack:v1\n" + sha256Hex(manifest
    bytes)` through `signWithCompanyKey`. `PACK_STATEMENT` = "Prepared
    from this system's records. It states no legal conclusion."
  - Audit slice: every event with `at` from the Dubai start of `from`
    to the Dubai end of `to` (not filtered by employee, so the chain
    stays contiguous; events hold no values). `chain-certificate.json`
    = `{ companyId, firstSeq, lastSeq, prevHashBeforeSlice, lastHash,
    headSeq, headHash, chainVerified, checked, formula:
    "sha256(prevHash + \"\\n\" + canonicalJson(event))" }`.
  - `generatePack(ctx, body)`: `to < from` 400; range over 366 days
    422; employee ids outside the company 404; renders payslip PDFs
    with seals (`ensureSeal`), builds files, `buildZip`, refuses over
    `PACK_MAX_BYTES` (422 `PACK_TOO_LARGE`), stores with
    `storeGeneratedFile`, adds an `inspection-pack` evidence item;
    audit `inspection.pack-generated` (`data: { from, to, parts,
    employeeCount }`); download audits `inspection.pack-downloaded`.

- [ ] **Step 1: Write the failing tests**

`readiness.test.ts` (pure): a company with WPS ids, all bank details
and no runs: `pay-runs-approved` `not-applicable`, `wps-employer-set`
done; one employee without IBAN: `bank-details-complete` open with
`detail "2 of 3"`; a manual item confirmed with a superseded evidence
id: `open`; `summary` counts match the items.

`evidence.test.ts`:
- `add_and_supersede`: upload (Plan 7 `POST /v1/files`), add as
  `trade-licence`: 201; add a newer one with `supersedes`: the old
  item has `supersededBy`; a second supersede gives 409
  `EVIDENCE_ALREADY_SUPERSEDED`; superseding across categories gives
  422.
- `evidence_immutable`: as the test superuser, `UPDATE evidence_items
  SET label = 'x'` and `DELETE` both fail with the trigger message.
- `confirm_manual_item`: confirm `trade-licence-on-file` with that
  evidence: `done`; confirming `wps-employer-set` gives 422
  `ITEM_NOT_MANUAL`.
- `file_claimed_once`: adding the same file twice gives 409
  `FILE_NOT_AVAILABLE`.

`inspection-pack.test.ts` (seeded approved run with SIF, attendance,
one correction, one `mohre-contract` item):
- `pack_contents`: generate with all parts (MFA): 201; download;
  `readZip` lists every path in the layout for the seeded data; each
  manifest entry's size and sha256 match the file.
- `pack_signature_verifies`: `crypto.verify` of the manifest message
  with `verification-key.pem` and `manifest.sig` is true.
- `pack_audit_slice_reverifies`: recomputing `eventHash` over
  `events.jsonl` from `prevHashBeforeSlice` ends at `lastHash`.
- `pack_payslip_pdf_has_code`: pdfjs text of a payslip PDF in the pack
  contains `VERIFY_STATEMENT`.
- `pack_range_too_long`: 367 days give 422 `PACK_RANGE_TOO_LONG`.
- `pack_needs_mfa`: owner without MFA gets 403 `MFA_REQUIRED` on
  generate and download.
- `pack_stored_as_evidence`: `GET /v1/evidence?category=
  inspection-pack` lists it; `inspection-pack-recent` is `done`.
- `pack_too_large`: with `PACK_MAX_BYTES` injected at 1,000 bytes for
  the test, 422 `PACK_TOO_LARGE` and nothing stored.

`binary-routes.test.ts`, `binary_routes_deny_other_roles` (Review
Focus 1): for every route in `ROUTES`
whose `contentType` is `application/pdf`, `application/zip`,
`text/csv` or `stored` (ids collected at run time), a manager and an
employee calling it with seeded ids of another employee get 403 or
404, and the response body is not a PDF (`%PDF-`), not a ZIP
(`PK\x03\x04`) and contains no comma-separated header row.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test readiness
  evidence inspection-pack binary-routes`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above (eight routes,
  conformance rows, `mayView` owner and hr).
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): evidence locker, readiness and
  inspection pack`.

### Task 10: Owner brief (F4), handover and ledger

**Files:**
- Create: `packages/contract/src/owner/brief.ts`
- Modify: `packages/contract/src/routes-owner.ts`, `src/examples.ts`,
  `src/index.ts`
- Create: `packages/api/src/brief/brief.ts` (pure),
  `src/brief/service.ts`, `src/routes/brief.ts`
- Modify: `src/app.ts`, `tests/conformance.test.ts`,
  `tests/leak.test.ts`, `HANDOVER.md`, `LEDGER.md`
- Test: `packages/api/tests/brief.test.ts`,
  `tests/brief-service.test.ts`

**Interfaces:**
- Consumes: Task 2 `gateReport`; Task 5 `listDeadlines`,
  `complianceScore` (service functions behind the routes); Task 8
  `gratuityLiability`; Task 7 corrections list; Task 9
  `evaluateReadiness`; Plan 6 `inbox`; Plan 3 runs and employees.
- Produces (contract):
  - `BriefKind = z.enum(["pay-run-approval","gate-review",
    "approvals-waiting","correction-pending","deadline-overdue",
    "deadline-soon","compliance-failed","readiness-open"])`;
    `BriefItem { kind; severity: "act-now" | "this-week" | "fyi";
    title: string; count: int >= 1; link: { routeId: string; params:
    Record<string, string> } }`.
  - `OwnerBrief { asOf; role: "owner" | "hr"; decisions: BriefItem[];
    deadlines: Deadline[]; compliance: { score: ComplianceScore["score"];
    exposure: ComplianceScore["exposure"] }; payroll: { period: Period
    | null; gross: Money | null; previousGross: Money | null; delta:
    SignedMoney | null; headcount: int; joiners: int; leavers: int };
    gratuityLiability: { asOf; total: Money | null; computedCount:
    int; notComputedCount: int }; statement: typeof BRIEF_STATEMENT }`;
    `BRIEF_STATEMENT` = "From approved pay runs and entered records.
    Items marked not assessed have no sourced rule or no input yet."
  - Route: `getOwnerBrief GET /v1/owner/brief` (owner, hr) to
    `OwnerBrief`.
- Produces (api):
  - `BRIEF_SOON_DAYS = 14` (product default, not law).
  - `buildBrief(f: BriefFacts): OwnerBrief-with-Fils` (pure). Items:
    `pay-run-approval` (owner only; draft regular runs: `act-now` when
    the gate is `clear`, else `this-week`); `gate-review` (draft runs
    `needs-review` or `blocked`, count = open findings, `act-now`);
    `approvals-waiting` (Plan 6 inbox count, `this-week`);
    `correction-pending` (`this-week`); `deadline-overdue`
    (`act-now`); `deadline-soon` (due within `BRIEF_SOON_DAYS`,
    `this-week`); `compliance-failed` (`this-week`); `readiness-open`
    (`fyi`). Items with count 0 are left out. Order: severity, then
    the `BriefKind` order. Each link names an existing route id.
  - `payroll`: latest approved regular run against the one before;
    `delta` null when either is missing. `gratuityLiability.total` =
    sum of computed rows, null when none computed.

- [ ] **Step 1: Write the failing tests**

`brief.test.ts` (pure):
- `brief_severity_order`: facts with one overdue deadline, one
  waiting approval and one open readiness item give kinds
  `["deadline-overdue","approvals-waiting","readiness-open"]`.
- `brief_hr_has_no_approve_item`: role `hr` with a draft run: no
  `pay-run-approval`, but `gate-review` when findings are open.
- `brief_zero_counts_dropped`: no corrections: no
  `correction-pending`.
- `brief_liability_null_when_none_computed`: all rows refused: total
  `null`, `notComputedCount` equals the row count.
- `brief_links_name_real_routes`: every `link.routeId` is an id in
  `ROUTES`.

`brief-service.test.ts`: with `seedTwoMonths`: the owner's brief has
`pay-run-approval` with `this-week` (gate needs review) and
`gate-review` with the open finding count; `payroll.delta` equals
`toSignedMoney(march gross - february gross)` only after March is
approved; the exposure block equals `GET /v1/compliance/score`'s;
manager and employee get 403.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test brief`.
  Expected: FAIL.
- [ ] **Step 3: Implement** the files above (route, conformance row,
  `mayView` owner and hr).
- [ ] **Step 4: Update `HANDOVER.md`** (state: Plan 11 built; the
  eleven feature names; commands `pnpm api:jobs`; package layout rows
  for `gate`, `replay`, `deadlines`, `compliance`, `verify`,
  `reports`, `corrections`, `evidence`, `brief`; limits: no KMS, no
  rate limit on `verifyPayslip`, no scheduler or email, WPS fines and
  the 2026 Emiratisation fine not assessed, replay skips nationals and
  dated absences, PDFs English only, no second SIF for corrections,
  retention not enforced) and **append to `LEDGER.md`** section 3 one
  line per Ruling below, dated.
- [ ] **Step 5: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 6: Commit** `feat(api): owner brief; handover`.

---

## Rulings

Claude's calls under the owner's "decide, don't ask" instruction. Each
says what it costs if wrong. The executor appends them to `LEDGER.md`.

1. **Replay recomputes engine before and after from the stored
   snapshot; delta is after minus before of the same computation.**
   Plan 3 runs hold entered amounts and no engine wiring exists, so a
   "rule change on what was paid" would mix two methods. Each row says
   whether the engine baseline matches what was paid. Cost: partial
   months show a mismatch flag until pay runs use `calculatePayslip`.
2. **Replay skips UAE and GCC nationals and employees with unpaid days
   (`not-replayed` with a code)** because the snapshot has no GPSSA
   inputs or absence dates; no inputs are assumed. Cost: smaller
   replays for national-heavy companies until those inputs are
   stored.
3. **Replay allows only `ae-payroll` and `ae-gratuity` keys, and a
   raise in basis points.** `previewRuleChange` keeps its signature;
   `previewPayslipRuleChange` shares `applyRuleChange`. Cost: GPSSA
   rule previews wait for Ruling 2.
4. **The gate blocks approval** (recomputed in the approve
   transaction). Errors must be fixed; review findings need an
   acknowledgement with a note, bound to the run's input hash; a check
   that cannot run (first run, no contract figure) is listed in
   `checksNotRun` and does not block, so the first run stays
   approvable. Cost: one more step before approval; a missing figure
   is visible, not hidden.
5. **"Missing inputs" means inputs that appeared or changed after the
   draft was computed** (new joiner, salary version, unpaid leave),
   plus the bank and WPS data the SIF needs, because Plan 3 already
   refuses incomplete pay inputs at creation. Cost: none known.
6. **Contract salary figures are entered by HR** (`contract_salaries`,
   source `mohre-contract`, `offer-letter` or `other`); MOHRE filing
   data is not read. The mismatch is a product check (SR tag). Cost:
   double entry until a MOHRE integration exists.
7. **Duplicate bank accounts are found by comparing decrypted IBANs in
   memory inside the tenant transaction;** nothing IBAN-derived leaves
   the server. Cost: decrypting every run employee's IBAN per gate
   view (fine at SME size).
8. **`ae-deadlines` statuses:** WPS due day `secondary` (Resolution
   340 summary, text unread); the day-2 alert `convention` (grace
   reports conflict); WPS fine and cap `unsourced`; GPSSA days, the
   0.1% daily addition and its cap `official` (DL57 Art 11(4) and 12,
   read); rounding `DOWN` `convention`. The pack starts 2026-06-01.
   Cost: earlier months show no WPS or GPSSA rows; a changed rule is a
   new pack version.
9. **Verifiable payslips use Ed25519 with a per-company key** whose
   seed is encrypted by the company data key (Design block in Task
   6), online verification, a compact token, rotation and revocation.
   Copy says "verification code" and "not an electronic signature".
   Cost: a leaked master key exposes every company's seed (KMS
   required before real data); no offline check; the public route has
   no rate limit (tokens are unguessable, so it leaks only what the
   token holder already has).
10. **Money exposure counts as sourced only for `official` or
    `secondary` rules that are not overridden;** dates may use
    `secondary` and `convention` with the status shown. Rounding-mode
    params are exempt. Today only the GPSSA late addition can be
    computed, and only when HR enters the amount due (Plan 3 runs do
    not compute GPSSA). Cost: most exposure shows "not assessed",
    which is the honest state.
11. **The compliance percent counts assessed checks only;** it is null
    when none is assessed. Cost: a company with few assessed checks
    sees a percent over a small base, always shown with the counts.
12. **"Late" means no payment recorded.** Filing records are entered by
    a person; the product pays nobody. Cost: a forgotten entry shows
    as overdue.
13. **Emiratisation dates and exposure come from Plan 7's
    `ae-emiratisation` pack and report,** not a second pack. Cost:
    Task 5 waits for Plan 7.
14. **Reports are owner and hr only; file exports and their downloads
    need MFA,** matching SIF download. Cost: hr must enrol MFA to
    export.
15. **Scheduled exports run from `main.ts jobs` under an external
    scheduler** (none is set up), enumerate tenants through one
    `SECURITY DEFINER` function owned by a NOLOGIN `payroll_jobs` role
    with BYPASSRLS and one SELECT grant, returning ids only, re-check the
    creator's role per run, and are idempotent per schedule and day.
    Delivery is the in-app exports list; email is not built. Cost: the
    owner must set up a cron entry; no push delivery.
16. **Own stored-only ZIP writer and CSV writer** (no dependency;
    `zlib.crc32`). No ZIP64. Cost: packs over 4 GB are refused (the
    100 MB product cap is far below).
17. **`qrcode` 1.5.4 for the QR matrix** (MIT, widely used; its CLI
    pulls `yargs`, unused by us). Cost: one dependency to watch; a
    hand-written encoder could replace it.
18. **Corrections are separate runs of kind `correction`** (period
    index narrowed to regular runs), approved through Plan 6's spine
    with a locked owner-only chain, MFA to decide and the creator
    excluded. They produce a delta CSV, never a second SIF (no bank
    guide covers a second file for a month). Negative differences are
    flagged, never deducted; no remedy is promised (UQ16 tag O). Cost:
    HR pays top-ups outside the SIF.
19. **Plan 6's spine is widened, not forked:** `claimantEmployeeId`
    nullable and three optional handler fields. Cost: one more review
    of Plan 6's decide path.
20. **Evidence is immutable** (trigger), superseded rather than
    removed, and never deleted; no retention period is stated because
    the 7-year figure is NOT VERIFIED. Cost: storage grows; a PDPL
    erasure process is a later plan (UQ17).
21. **Inspection packs cover at most 366 days, include the whole audit
    slice for the range** (contiguous chain, no values inside) with the
    hash before the slice and the head, and are signed with the same
    company key. Cost: an inspector sees entity ids of employees
    outside the selection, never their data.
22. **PDFs are English only** until Arabic text has native review
    (Plan 1 and Plan 7 rule). Cost: Arabic-speaking staff read the
    English payslip PDF for now.
23. **Migration runner accepts 3 or 4 digits in numeric order;** Plan
    11 uses 1101 to 1108 (1109 kept free). Cost: none; names already
    applied are unchanged.
24. **Owner routes are a separate `OWNER_ROUTES` list joined last;**
    content types are added only if absent; tests never hard-code the
    total route count. Cost: one merge of `routes.ts` with Plans 6 to
    8.
25. **Review:** per-task review after Tasks 2, 3, 6, 7 and 9; one
    whole-branch review at the end (speed ruling). No pause for plan
    review. Cost: a slipped bug in Tasks 1, 4, 5, 8 or 10 is caught
    later.
26. **WPS warnings in the gate are `review`, except `ROUTING_UNKNOWN`,
    which is `info`,** because the routing table is known to be partial
    and real files often raise it. Test helpers acknowledge open
    findings (`ackAll`, called by `seedPayroll`). Cost: owners
    acknowledge other warnings (such as an IBAN checksum) each month;
    other plans' tests that approve through the route add one helper
    call.
27. **One CSV writer for the API** (Plan 6's `src/http/csv.ts`, with a
    BOM), extended with empty cells for `null` and no guard on signed
    money. Cost: none; a second writer would drift.
28. **A correction diffs against and replaces each employee's current
    payslip,** so a second correction builds on the first and exactly
    one payslip per employee and period is current. Cost: none known.
