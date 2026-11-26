# Plan 6: Expenses and Claims (Reimbursed Through Payroll) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Employees file expense claims with receipts, mileage and per
diem; claims pass company policy limits and a shared maker-checker
approval spine; approved claims ride the next pay run as reimbursement
lines that are outside gross pay and inside net pay, with an audit trail,
VAT capture fields and reports.

**Architecture:** Plan 6 extends Plan 3's `packages/contract` and
`packages/api`; it adds no package. The approval spine
(`src/approvals/`) is generic by subject type and serves expense claims
first. Policy pricing, policy checks, chain resolution and the
reimbursement step are pure modules (no db, clock or env), tested on
their own. Receipts go through two injected ports, `BlobStore` and
`ReceiptReader` (OCR as an interface only; the default reader returns
nothing). Reimbursement is added to the API payslip after the salary
computation, never inside `lines`, so gross pay, the SIF and Plan 5's
engine `Payslip` are untouched.

**Tech Stack:** As Plan 3: Node 22, TypeScript 7.0.2, zod 4.6.7, Hono
4.13.17 (plus its built-in `hono/body-limit`), pglite 0.5.16 (tests),
pg 8.23.1, node:crypto, Vitest 5.1.2, fast-check 4.11.0, tsx 4.23.15.
No new dependency.

**Spec:** `docs/superpowers/specs/2026-11-25-master-feature-list.md`
(principle 6 "one approval spine", UQ9 pre-pay gate, UQ18, UQ25, UQ35),
`docs/superpowers/specs/2026-11-25-combined-feature-list.md` (section
H: expense management), `docs/superpowers/specs/2026-11-25-idea-pool.md`
(G4, G10, G11, C7, T2, U5), `docs/research/2026-11-25-uae-spend-ap-
specialists.md` ("reimbursements flowing into payroll, claim approvals
tied to HR records, role-based limits"),
`docs/research/2026-11-25-vat-corporate-tax-einvoicing.md` (input VAT
and FTA Decision 17 of 2026, secondary only),
`docs/superpowers/plans/2026-11-26-plan-3-backend.md` (every pattern
this plan reuses), `docs/engineering-standards.md`, `LEDGER.md`
sections 1 to 3.

**Prerequisite:** Plan 3 Tasks 1 to 8 are merged (today `packages/`
holds only `engine` and `wps`). Plan 5 is not required. This plan cites
Plan 3 functions by name, never by line number.

## Global Constraints

- Every Plan 3 Global Constraint applies unchanged (80-character lines,
  files under about 300 lines, functions under 30, `Fils` inside and
  `^\d{1,9}\.\d{2}$` on the wire, RLS on every tenant table with
  `company_id`, all queries through `withTenant`, injected time and ids,
  no `.transaction(` outside `src/db/`, `/v1` base path).
- No VAT rate appears anywhere in code or tests: no 5%, no check that
  VAT is a share of the amount. The only VAT rule is `vatAmount <=
  amount`.
- Input VAT recoverability is never computed. Every claim and every VAT
  report carries `vatRecoverability: "not-assessed"` and
  `VAT_STATEMENT`, exact text: "VAT amounts and supplier TRNs are as
  entered by the claimant. Input VAT recovery is not assessed: FTA
  Decision 17 of 2026 on employee expenses is known only from secondary
  summaries." Never write "recoverable" or "claimable VAT".
- Mileage and per diem rates are company-entered policy values, not
  statutory: they have no default, and a mileage or per diem item with
  no matching rate is refused (`RATE_NOT_FOUND`).
- A reimbursement is never a payslip `line`, never part of `gross`, the
  deduction cap base, the GPSSA base, the gratuity basic or the SIF.
  `net = salaryNet + reimbursementTotal`.
- Payslips and pay runs that carry reimbursements show
  `REIMBURSEMENT_WPS_NOTE`, exact text: "Reimbursements are not in the
  WPS salary file. Pay them by separate transfer. Whether they must go
  through WPS is not sourced."
- No cards, no payments, no bank transfers, no payout files.
- Audit `data` never holds an amount, VAT figure, TRN, supplier name or
  receipt content; it holds ids, counts, codes and field names
  (`assertNoSensitive` stays as it is).
- Receipt bytes are encrypted with the company DEK before they reach the
  `BlobStore`; AAD `"<companyId>:receipts:content:<receiptId>"`.
- OCR output is a suggestion only: stored, shown, never copied into an
  item by the server.
- Contract changes are additive (Plan 3 Ruling 23). With no claims,
  every existing response value is unchanged.
- Tests run with `pnpm check`, no network, Docker or hosted database.

## Review Focus

1. A claim approved while a draft run exists, a run voided, an
   idempotent replay, or two draft runs for two months created at once:
   the claim is reimbursed exactly once (Task 6
   `reimbursed_exactly_once`).
2. The claimant holding the approver role, a manager approving a claim
   they submitted on someone's behalf, one person eligible for two
   tiers, or two approvers clicking at once: never self-approval, never
   one person on two tiers, never a step approved twice (Task 2
   `approvals.test.ts` SOD cases).
3. A receipt declared `image/png` whose bytes are HTML, a file over 5
   MiB, or company A's receipt id fetched by company B: refused or 404,
   and the download is never rendered inline (Task 3 `receipts.test.ts`).
4. A supplier name or description that starts with `=`, `+`, `-` or `@`
   in a CSV export: written as text, not a formula (Task 7
   `csv_neutralises_formulas`).
5. A leaver whose claim is approved after their final pay run, or any
   approved claim of an employee outside the next run: the claim stays
   `approved`, appears in the unpaid report with its reason, and is
   never dropped (Task 6 `claim_of_out_of_scope_employee_waits`, Task 7
   `unpaid_lists_leaver_claim`).

## File Structure

```
packages/contract/src/approvals.ts       chain, steps, tasks, decisions
packages/contract/src/receipts.ts        upload, receipt, suggestion
packages/contract/src/expenses.ts        categories, policy, claims
packages/contract/src/expense-reports.ts report queries and rows
packages/contract/src/payroll.ts         + reimbursement fields
packages/contract/src/routes.ts          + 25 routes, contentType kinds
packages/api/migrations/007..010_*.sql   approvals, receipts, policy,
                                         claims
packages/api/src/approvals/              resolve (pure), store, decide
packages/api/src/storage/                BlobStore, memory and fs
packages/api/src/receipts/               sniff, reader port, service
packages/api/src/expenses/               policy and check (pure), store,
                                         claims, submit, subject,
                                         reimburse (pure), reports
packages/api/src/http/csv.ts             CSV writer (pure)
packages/api/src/routes/                 approvals, receipts,
                                         expense-policy, expense-claims,
                                         expense-reports
```

---

### Task 1: Contract additions (schemas, 25 routes, errors, examples)

Mergeable on its own; Plan 4 can mock expense screens from this commit.

**Files:**
- Create in `packages/contract/src/`: `approvals.ts`, `receipts.ts`,
  `expenses.ts`, `expense-reports.ts`
- Modify: `payroll.ts`, `routes.ts`, `errors.ts`, `openapi.ts`,
  `examples.ts`, `index.ts`; and `packages/api/src/payroll/payslips.ts`,
  `src/payroll/pay-runs.ts` (no-claim values only, Step 4)
- Test: create `packages/contract/tests/expenses.test.ts`; modify
  `tests/routes.test.ts`, `tests/openapi.test.ts`,
  `tests/schemas.test.ts`

**Interfaces (Produces; all exported from `index.ts`):**
- `approvals.ts`: `SubjectType = z.enum(["expense-claim"])`;
  `ApproverSpec` = discriminated union on `kind`: `{ kind:
  "line-manager" }`, `{ kind: "role"; role: "owner" | "hr" }`, `{ kind:
  "user"; userId: Id }`; `ApprovalTier { approver: ApproverSpec;
  minTotal: Money }`; `ApprovalChain { subjectType; version: int >= 0;
  tiers: ApprovalTier[] (1..5); overLimitApprover: "owner" | "hr" }`;
  `ApprovalChainUpdate { tiers; overLimitApprover; expectedVersion: int
  >= 0 }`; `StepStatus = z.enum(["waiting","pending","approved",
  "rejected","returned","cancelled"])`; `ApprovalStep { order: int >= 1;
  approver: ApproverSpec; status: StepStatus; decidedBy: Id | null;
  decidedAt: Timestamp | null; note: string | null }`; `ApprovalView {
  id; subjectType; subjectId; status: "pending" | "approved" |
  "rejected" | "returned" | "cancelled"; currentStep: int | null; steps:
  ApprovalStep[]; createdAt }`; `ApprovalTask { approvalId;
  subjectType; subjectId; stepOrder; stepCount; submittedAt; ageDays:
  int >= 0; summary: { employeeName; title; total: Money; flagCodes:
  string[] } }`; `ApprovalDecision { stepOrder: int >= 1; note?: string
  1..500 }`; `ApprovalDecisionWithNote { stepOrder; note: string
  3..500 }`.
- `receipts.ts`: `ReceiptContentType = z.enum(["image/jpeg",
  "image/png","application/pdf"])`; `RECEIPT_MAX_BYTES = 5_242_880`;
  `ReceiptUpload { employeeId?: Id; fileName: string 1..120;
  contentType: ReceiptContentType; dataBase64: string }`;
  `ReceiptSuggestion { source: "none" | "ocr"; amount?: Money;
  vatAmount?: Money; supplierTrn?: ^\d{15}$; supplierName?: string
  1..120; date?: IsoDate }`; `Receipt { id; employeeId; fileName;
  contentType; size: int; sha256: ^[0-9a-f]{64}$; uploadedAt;
  suggestion: ReceiptSuggestion; duplicateOf: Id[] }`.
- `expenses.ts`:
  - `VAT_STATEMENT` (exact text in Global Constraints).
  - `ExpenseKind = z.enum(["receipt","mileage","per-diem"])`;
    `ExpenseCategory { id; code: ^[a-z][a-z0-9-]{0,31}$; name; nameAr:
    string | null; kind: ExpenseKind; active: boolean }`;
    `ExpenseCategoryCreate { code; name; nameAr?; kind }`;
    `ExpenseCategoryUpdate` (partial of `name`, `nameAr`, `active`).
  - `ExpenseLimit { categoryId: Id; role: Role | null; perItemMax:
    Money | null; monthlyMax: Money | null; receiptRequiredAbove: Money
    | null; overLimit: "block" | "flag" }` (`role: null` is the default
    for every role).
  - `MileageRate { code: ^[a-z][a-z0-9-]{0,31}$; label; perKm: Money;
    effectiveFrom: IsoDate }`; `PerDiemRate { code; label; labelAr:
    string | null; daily: Money; effectiveFrom: IsoDate }`.
  - `ExpensePolicy { version: int >= 0; claimWindowDays: int 1..3650 |
    null; limits: ExpenseLimit[] (0..500); mileageRates (0..50);
    perDiemRates (0..100) }`; `ExpensePolicyUpdate` = the same without
    `version`, plus `expectedVersion: int >= 0`.
  - `ExpenseItemInput` = discriminated union on `kind`. Common:
    `categoryId; date: IsoDate; description: string 1..200; receiptIds:
    Id[] (0..10); justification?: string 3..500`. `receipt` adds
    `amount: Money; vatAmount: Money; supplierName: string 1..120 |
    null; supplierTrn: ^\d{15}$ | null; originalCurrency?: ^[A-Z]{3}$;
    originalAmount?: ^\d{1,12}(\.\d{1,3})?$`. `mileage` adds
    `distanceKm: int 1..5000; rateCode`. `per-diem` adds `days: int
    1..60; rateCode`.
  - `ExpenseItem` = the input plus `{ id; amount: Money; vatAmount:
    Money; rateApplied: Money | null; overLimit: boolean }` (mileage and
    per diem items always have `vatAmount "0.00"`, `supplierTrn null`).
  - `ClaimStatus = z.enum(["draft","submitted","returned","approved",
    "rejected","cancelled","reimbursed"])`; `ClaimFlagCode =
    z.enum(["OVER_LIMIT","POSSIBLE_DUPLICATE","DUPLICATE_RECEIPT",
    "VAT_WITHOUT_TRN","FOREIGN_CURRENCY"])`; `ClaimFlag { code; itemId:
    Id | null; message }`.
  - `ExpenseClaim { id; employeeId; employeeName; title; status; items:
    ExpenseItem[]; total: Money; vatTotal: Money; flags: ClaimFlag[];
    createdBy: Id; submittedAt: Timestamp | null; decidedAt: Timestamp
    | null; payRunId: Id | null; policyVersion: int | null; approval:
    ApprovalView | null; vatRecoverability: z.literal("not-assessed")
    }`; `ExpenseClaimCreate { employeeId?: Id; title: string 1..120;
    items: ExpenseItemInput[] (0..50) }`; `ExpenseClaimUpdate { title?;
    items? }`; `ClaimCancel { note?: string 3..500 }`;
    `ExpenseClaimQuery { employeeId?; status?: ClaimStatus; from?:
    IsoDate; to?: IsoDate }`.
  - `CLAIM_PROBLEM_CODES` (readonly tuple, carried inside
    `detail.problems` as `"items.<n>:<CODE>"` or `"claim:<CODE>"`):
    `CLAIM_EMPTY`, `CATEGORY_NOT_FOUND`, `CATEGORY_INACTIVE`,
    `CATEGORY_KIND_MISMATCH`, `RATE_NOT_FOUND`,
    `EXPENSE_DATE_IN_FUTURE`, `EXPENSE_BEFORE_JOINING`,
    `EXPENSE_TOO_OLD`, `VAT_EXCEEDS_AMOUNT`, `RECEIPT_REQUIRED`,
    `RECEIPT_NOT_FOUND`, `EXPENSE_OVER_LIMIT`,
    `JUSTIFICATION_REQUIRED`.
- `expense-reports.ts`: `ReportFormat = z.enum(["json","csv"])`;
  `SummaryQuery { from; to; groupBy: "category" | "employee" |
  "department" | "status"; payRunId?: Id; format?: ReportFormat }`;
  `SummaryRow { key; label; claimCount; itemCount; total: Money;
  vatTotal: Money }`; `SummaryReport { rows; total; vatTotal;
  statement: typeof VAT_STATEMENT }`; `VatRegisterQuery { from; to;
  format? }`; `VatRegisterRow { claimId; itemId; employeeNumber;
  employeeName; date; categoryCode; supplierName: string | null;
  supplierTrn: string | null; amount; vatAmount; netOfVat: Money;
  receiptCount: int; status: ClaimStatus }`; `VatRegister { rows;
  statement; vatRecoverability: "not-assessed" }`; `AgingRow {
  approvalId; claimId; employeeName; total; stepOrder; approver:
  ApproverSpec; submittedAt; ageDays }`; `UnpaidRow { claimId;
  employeeId; employeeName; total; decidedAt; reason:
  "awaiting-pay-run" | "in-draft-run" | "employee-left" }`;
  `PayoutsQuery { payRunId: Id; format? }`; `PayoutRow { employeeId;
  employeeName; employeeNumber; claimIds: Id[]; total: Money }`;
  `Payouts { payRunId; runStatus; rows; total; note: typeof
  REIMBURSEMENT_WPS_NOTE }`.
- `payroll.ts` (additive): `REIMBURSEMENT_WPS_NOTE` (exact text in
  Global Constraints); `ReimbursementLine { claimId; label; amount:
  Money; traceId }`; `Payslip` gains `reimbursements:
  ReimbursementLine[]; reimbursementTotal: Money; salaryNet: Money;
  reimbursementNote: string | null`; `PayRun` gains
  `reimbursementTotal: Money; claimCount: int; pendingClaimCount: int`;
  `PayRunCreate` gains `excludeClaimIds?: Id[] (0..500)`.
- `routes.ts`: `RouteDef.contentType` becomes `"text/plain" |
  "text/csv-optional" | "binary"` (csv-optional: JSON by default, CSV
  when `format=csv`; binary: raw bytes with the stored type);
  `RouteDef.bodyLimit?: number`. New routes (id in brackets):
  - all roles: `GET /v1/approvals/inbox` (`approvalInbox`),
    `POST /v1/approvals/{id}/approve` (`approveStep`, `ApprovalDecision`),
    `POST /v1/approvals/{id}/reject` (`rejectStep`,
    `ApprovalDecisionWithNote`), `POST /v1/approvals/{id}/return`
    (`returnStep`, same body), all to `ApprovalView`;
    `POST /v1/receipts` (`uploadReceipt`, 201, `bodyLimit` 7_500_000)
    to `Receipt`; `GET /v1/receipts/{id}` (`getReceipt`);
    `GET /v1/receipts/{id}/content` (`downloadReceipt`, binary);
    `GET /v1/expense-categories`; `GET /v1/expense-policy`;
    `GET /v1/expense-claims` (query `ExpenseClaimQuery`);
    `POST /v1/expense-claims` (201); `GET /v1/expense-claims/{id}`;
    `PATCH /v1/expense-claims/{id}`;
    `POST /v1/expense-claims/{id}/submit`;
    `POST /v1/expense-claims/{id}/cancel` (`ClaimCancel`).
  - owner, hr: `GET /v1/approval-chains` (to `ApprovalChain[]`),
    `POST /v1/expense-categories` (201),
    `PATCH /v1/expense-categories/{id}`, `PUT /v1/expense-policy`,
    `GET /v1/expense-reports/summary` (`expenseSummary`),
    `.../vat-register` (`expenseVatRegister`; both csv-optional),
    `.../aging` (`expenseAging`, to `AgingRow[]`), `.../unpaid`
    (`expenseUnpaid`, to `UnpaidRow[]`), `.../payouts`
    (`expensePayouts`, csv-optional).
  - owner only: `PUT /v1/approval-chains/{subjectType}` (mfa,
    `ApprovalChainUpdate` to `ApprovalChain`).
- `errors.ts` adds (HTTP status): `NO_ELIGIBLE_APPROVER` 422,
  `NOT_AN_APPROVER` 403, `APPROVER_NEEDED_LATER` 403,
  `APPROVAL_NOT_PENDING` 409, `APPROVAL_STEP_CHANGED` 409,
  `CHAIN_VERSION_CONFLICT` 409, `CHAIN_INVALID` 422,
  `RECEIPT_TOO_LARGE` 413, `PAYLOAD_TOO_LARGE` 413,
  `RECEIPT_TYPE_NOT_ALLOWED` 415, `RECEIPT_TYPE_MISMATCH` 422,
  `RECEIPT_BASE64_INVALID` 400, `CATEGORY_CODE_TAKEN` 409,
  `POLICY_VERSION_CONFLICT` 409, `POLICY_INVALID` 422,
  `CLAIM_NOT_EDITABLE` 409, `CLAIM_NOT_CANCELLABLE` 409,
  `CANCEL_NOTE_REQUIRED` 422, `CLAIM_PROBLEMS` 422,
  `EXCLUDED_CLAIM_INVALID` 422.
- `openapi.ts`: binary routes get a 200 with `image/jpeg`, `image/png`
  and `application/pdf` binary content; csv-optional routes add
  `text/csv` beside JSON.
- `examples.ts`: one example per new response schema; the existing
  `Payslip` and `PayRun` examples gain `reimbursements: []`,
  `reimbursementTotal: "0.00"`, `salaryNet` equal to their `net`,
  `reimbursementNote: null`, `claimCount: 0`, `pendingClaimCount: 0`.

- [ ] **Step 1: Write the failing tests**

`expenses.test.ts`: `ExpenseItemInput` parses a `mileage` item without
`amount` and rejects one with `distanceKm: 0` and `12.5`; a `receipt`
item rejects `supplierTrn "12345"` and accepts `null`; `ExpenseClaim`
rejects `vatRecoverability: "recoverable"`; `ApprovalChain` rejects 0
and 6 tiers; `ApprovalDecisionWithNote` rejects `note: "ok"`;
`ReceiptSuggestion` parses `{ source: "none" }`; `VAT_STATEMENT` and
`REIMBURSEMENT_WPS_NOTE` equal the Global Constraints text; no exported
string in the contract contains `"5%"`, `"recoverable"` or
`"claimable"` (scan `Object.values` of the module namespace).

`routes.test.ts`: count of routes is 74 (Plan 3's 49 plus 25; if
another plan has already added routes, the expected count is that
count plus 25); every `binary` route is a `GET`; `uploadReceipt` has
`bodyLimit` 7_500_000; `putApprovalChain` has `mfa: true` and roles
`["owner"]`; all Plan 3 assertions still pass.

`openapi.test.ts`: `downloadReceipt` 200 lists the three receipt types;
`expenseSummary` 200 lists `application/json` and `text/csv`.

`schemas.test.ts`: every value in `EXAMPLES` still parses; the Plan 3
`Payslip` example has `salaryNet === net` and `reimbursementTotal
"0.00"`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/contract test`. Expected:
  FAIL, missing exports.
- [ ] **Step 3: Implement** the four files and the modifications above.
- [ ] **Step 4: Run** `pnpm --filter @payroll/contract test` and
  `pnpm check`. Expected: PASS. Plan 3's API tests that build payslips
  now fail typecheck on the new required fields; Task 6 fixes them, so
  until then set them in `toPayslipView` to the no-claim values
  (`reimbursements: []`, `reimbursementTotal: "0.00"`, `salaryNet =
  net`, `reimbursementNote: null`, run `claimCount` and
  `pendingClaimCount` 0) in this task.
- [ ] **Step 5: Commit** `feat(contract): expenses, approvals, receipts`.

### Task 2: Approval spine (chains, resolution, decisions)

High risk (separation of duties): this task keeps a per-task review.

**Files:**
- Create: `packages/api/src/approvals/resolve.ts` (pure),
  `src/approvals/chains.ts`, `src/approvals/requests.ts`,
  `src/approvals/decide.ts`, `src/approvals/subjects.ts`,
  `src/routes/approvals.ts`, `migrations/007_approvals.sql`
- Modify: `src/app.ts` (register routes; `createApp` builds
  `SubjectHandlers` from a list it receives, empty until Task 5)
- Test: `packages/api/tests/approvals-resolve.test.ts`,
  `tests/approvals.test.ts`, `tests/helpers/test-subject.ts`

**Interfaces:**
- Consumes: Plan 3 `withTenant` (via `ReqCtx.tx`), `appendAudit`,
  `ApiError`, `register`, `dubaiDate`; Task 1 schemas.
- Produces:
  - Migration 007: `approval_chains(company_id, subject_type, version,
    tiers jsonb, over_limit_approver, updated_by, updated_at, pk
    (company_id, subject_type))`; `approval_requests(id, company_id,
    subject_type, subject_id, status, current_step, submitted_by,
    claimant_user_id, created_at, closed_at)`; `approval_steps(
    company_id, request_id, step_order, approver jsonb, eligible uuid[],
    status, decided_by, decided_at, note, pk(request_id, step_order))`.
    Select, insert, update grants only.
  - `resolve.ts` (pure):
    `interface ResolveInput { tiers: { approver: ApproverSpec;
    minTotal: Fils }[]; overLimitApprover: "owner" | "hr"; total: Fils;
    overLimit: boolean; claimantUserId: string | null; submitterUserId:
    string; lineManagerUserId: string | null; members: { userId: string;
    role: Role }[] }`;
    `interface ResolvedStep { order: number; approver: ApproverSpec;
    eligible: string[] }`;
    `resolveChain(i: ResolveInput): ResolvedStep[]` (throws
    `ApiError(422, "NO_ELIGIBLE_APPROVER")`);
    `hasDistinctApprovers(eligible: string[][]): boolean` (backtracking;
    at most 6 steps);
    `mayDecide(steps: ResolvedStep[], current: number, actor: string,
    priorApprovers: string[], excluded: string[]): "ok" |
    "NOT_AN_APPROVER" | "SOD_VIOLATION" | "APPROVER_NEEDED_LATER"`
    (`excluded` = claimant and submitter user ids).
  - Resolution rules (in order):
    1. Tiers apply when `minTotal <= total`, in stored order.
    2. When `overLimit` and no applied tier is `{ role:
       overLimitApprover }`, append that role tier.
    3. Excluded users: claimant and submitter.
    4. `line-manager`: the line manager's user if a member and not
       excluded; `user`: that user if a member and not excluded;
       `role`: every member with that role, not excluded. An empty
       `line-manager`, `user` or `hr` step falls back to `role: hr`,
       then `role: owner`; the step's `approver` records the fallback.
       Empty after `owner`: `NO_ELIGIBLE_APPROVER`.
    5. `hasDistinctApprovers` over all steps false:
       `NO_ELIGIBLE_APPROVER`.
  - `mayDecide`: an actor in `excluded` or `priorApprovers` gives
    `SOD_VIOLATION`; else an actor not in `steps[current].eligible`
    gives `NOT_AN_APPROVER`; when the remaining
    steps minus `priorApprovers` and minus the actor fail
    `hasDistinctApprovers`, `APPROVER_NEEDED_LATER`.
  - `chains.ts`: `getChain(tx, companyId, type): Promise<ApprovalChain>`
    (when no row: version 0, one tier `{ line-manager, "0.00" }`,
    `overLimitApprover: "owner"`); `putChain(ctx, type, body)`: tiers
    sorted by `minTotal` non-decreasing and a `user` approver must be a
    member, else 422 `CHAIN_INVALID`; version mismatch 409
    `CHAIN_VERSION_CONFLICT`; audit `approval-chain.updated` (`data: {
    subjectType, version, tierCount }`).
  - `subjects.ts`: `interface SubjectFacts { claimantEmployeeId: string;
    claimantUserId: string | null; lineManagerUserId: string | null;
    total: Fils; overLimit: boolean; summary: ApprovalTask["summary"]
    }`; `interface SubjectHandler { type: SubjectType; facts(tx,
    companyId, subjectId): Promise<SubjectFacts>; onClosed(ctx:
    ReqCtx, subjectId: string, outcome: "approved" | "rejected" |
    "returned"): Promise<void> }`; `type SubjectHandlers =
    ReadonlyMap<SubjectType, SubjectHandler>`.
  - `requests.ts`: `openRequest(ctx, handlers, type, subjectId,
    submitterUserId): Promise<ApprovalView>` (loads facts, the chain
    and members, resolves, writes request and steps; step 1 `pending`,
    others `waiting`; audit `approval.opened` `data: { subjectType,
    stepCount }`); `cancelRequest(ctx, approvalId)`; `viewFor(tx,
    approvalId): Promise<ApprovalView>`; `inbox(ctx):
    Promise<ApprovalTask[]>` (pending steps whose `eligible` holds the
    caller, oldest first, `ageDays` from `dubaiDate` of submit and now).
  - `decide.ts`: `decide(ctx, handlers, approvalId, action: "approve" |
    "reject" | "return", body)`: locks the request `FOR UPDATE`; not
    pending 409 `APPROVAL_NOT_PENDING`; `body.stepOrder !==
    current_step` 409 `APPROVAL_STEP_CHANGED`; caller cannot see the
    subject 404 `NOT_FOUND`; then `mayDecide`. Approve moves to the next
    step or closes as `approved`; reject and return close at once. On
    close, calls `handler.onClosed`. Audit `approval.step-approved`,
    `approval.rejected`, `approval.returned` (`data: { subjectType,
    stepOrder }`).

- [ ] **Step 1: Write the failing tests**

`approvals-resolve.test.ts` (users `O` owner, `H` hr, `M` manager, `E`
employee, `O2` second owner; default one-tier chain unless stated):
- `resolve_line_manager`: E's claim, line manager M: one step,
  eligible `[M]`.
- `resolve_no_manager_falls_to_hr`: no line manager: approver `{ role:
  "hr" }`, eligible `[H]`.
- `resolve_hr_claimant_falls_to_owner`: H's own claim, no manager,
  members O and H: eligible `[O]`, approver `{ role: "owner" }`.
- `resolve_single_owner_refused`: members `[O]`, O's own claim: throws
  `NO_ELIGIBLE_APPROVER`.
- `resolve_tiers_by_total`: tiers manager "0.00", hr "1000.00", owner
  "5000.00"; total 1500.00 gives two steps, total 5000.00 three.
- `resolve_over_limit_adds_owner`: one manager tier, `overLimit: true`:
  steps `[line-manager, role owner]`; with an owner tier already
  applied, no extra step.
- `resolve_submitter_excluded`: hr H files for E whose line manager is
  H: H is not eligible anywhere.
- `resolve_needs_distinct_people`: tiers hr "0.00" and hr "100.00",
  members O and H (one hr): second tier falls back to owner; with tiers
  owner and owner and only O: `NO_ELIGIBLE_APPROVER`.
- `may_decide_blocks_reuse`: steps eligible `[[O, O2], [O]]`: O on step
  1 gives `APPROVER_NEEDED_LATER`; O2 gives `ok`; then O on step 2
  gives `ok`, O2 on step 2 gives `NOT_AN_APPROVER`.
- fast-check: for random members (1 to 6 users) and chains (1 to 5
  tiers), when `resolveChain` returns, no step's eligible list contains
  the claimant or submitter and `hasDistinctApprovers` is true.

`approvals.test.ts` (Review Focus 2; uses `tests/helpers/test-subject.ts`,
a `SubjectHandler` over an in-test table `test_subjects(id, company_id,
employee_id, total, status)` created by the helper, so the spine is
tested without expenses):
- `inbox_shows_pending_for_eligible_only`: M sees the task, H does not.
- `approve_closes_and_calls_handler`: M approves step 1 of a one-step
  request: status `approved`, handler outcome `approved`, audit
  `approval.step-approved`.
- `claimant_cannot_approve`: chain `{ kind: "user", userId: <H> }`
  and H's own request: the step falls back to owner; H deciding it
  gives 403 `SOD_VIOLATION`; E deciding M's pending step for E's claim
  gives 403 `SOD_VIOLATION`.
- `same_person_two_tiers_refused`: two steps, O2 approves step 1 then
  tries step 2: 403 `SOD_VIOLATION`.
- `stale_step_refused`: body `stepOrder: 1` after step 1 is approved:
  409 `APPROVAL_STEP_CHANGED`.
- `concurrent_approvals_one_wins`: O and O2 send approve for step 1
  with `Promise.all`: one 200, one 409 (`APPROVAL_STEP_CHANGED` or
  `APPROVAL_NOT_PENDING`); the step has one `decided_by`.
- `reject_needs_note`: reject with note `"ok"` is 400
  `VALIDATION_FAILED`; with `"missing receipt"` closes as `rejected`.
- `chain_put_needs_owner_mfa`: hr gets 403 `FORBIDDEN`; owner without
  MFA gets 403 `MFA_REQUIRED`; with MFA and `expectedVersion: 0` gets
  version 1; again with 0 gives 409 `CHAIN_VERSION_CONFLICT`; tiers
  "100.00" then "0.00" give 422 `CHAIN_INVALID`.
- `other_company_cannot_decide`: company B's owner deciding A's
  approval id gives 404.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test approvals`.
  Expected: FAIL.
- [ ] **Step 3: Implement** `resolve.ts` first, then the rest.
- [ ] **Step 4: Run** `pnpm --filter @payroll/api test` and `pnpm check`.
  Expected: PASS (the RLS catalog test now covers the three tables).
- [ ] **Step 5: Commit** `feat(api): shared approval spine`.

### Task 3: Receipts (storage port, upload, sniffing, OCR port)

High risk (untrusted files): this task keeps a per-task review.

**Files:**
- Create: `packages/api/src/storage/blob.ts`,
  `src/storage/fs-blob.ts`, `src/receipts/sniff.ts`,
  `src/receipts/reader.ts`, `src/receipts/receipts.ts`,
  `src/routes/receipts.ts`, `migrations/008_receipts.sql`
- Modify: `src/deps.ts` (`AppDeps` gains `blobs: BlobStore;
  receiptReader: ReceiptReader`), `src/app.ts` (`bodyLimit` and
  `binary` handling in `register`), `src/config.ts` (`receiptsDir`
  from `RECEIPTS_DIR`, required), `src/main.ts` (`fsBlobStore`),
  `tests/helpers/test-app.ts` (memory store; `makeApp({ reader })`)
- Test: `packages/api/tests/receipts-sniff.test.ts`,
  `tests/receipts.test.ts`, `tests/fs-blob.test.ts`

**Interfaces:**
- Consumes: Plan 3 `Keyring`, `appendAudit`, `viewerScope`; Task 1
  receipt schemas.
- Produces:
  - `interface BlobStore { put(key: string, bytes: Uint8Array):
    Promise<void>; get(key: string): Promise<Uint8Array | null> }`;
    `memoryBlobStore(): BlobStore`; `fsBlobStore(dir: string):
    BlobStore` (key must match `^[0-9a-f-]{36}/receipts/[0-9a-f-]{36}$`
    else throws `BLOB_KEY_INVALID`; writes to a temp name then
    renames).
  - `sniffContentType(b: Uint8Array): ReceiptContentType | null`: JPEG
    `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A`, PDF `25 50 44 46 2D`.
  - `interface ReceiptReader { read(bytes: Uint8Array, type:
    ReceiptContentType): Promise<unknown> }`; `nullReceiptReader`
    returns `{ source: "none" }`; `readSuggestion(reader, bytes, type,
    log): Promise<ReceiptSuggestion>` parses the reader's output with
    `ReceiptSuggestion`; a throw or a parse failure gives `{ source:
    "none" }` and one log line `{ event: "receipt.reader.failed" }`
    without the output.
  - `uploadReceipt(ctx, body): Promise<Receipt>`: `employeeId` defaults
    to the caller's linked employee (none: 422 `NO_EMPLOYEE_LINK`); a
    non-owner, non-hr caller uploads only for self (403 `FORBIDDEN`);
    invalid base64 400 `RECEIPT_BASE64_INVALID`; decoded size 0 or
    sniff null 415 `RECEIPT_TYPE_NOT_ALLOWED`; over `RECEIPT_MAX_BYTES`
    413 `RECEIPT_TOO_LARGE`; sniffed type differs from `contentType`
    422 `RECEIPT_TYPE_MISMATCH`. Stores SHA-256 of the plain bytes, then
    `blobs.put(key, utf8(keyring.encrypt(dek, aad, base64(bytes))))`.
    Audit `receipt.uploaded` (`data: { contentType, size }`).
  - Migration 008: `receipts(id, company_id, employee_id, uploaded_by,
    file_name, content_type, size, sha256, blob_key, suggestion jsonb,
    uploaded_at)`, index `(company_id, sha256)`.
  - `receiptVisible(ctx, row): Promise<boolean>`: owner and hr; the
    receipt's employee's own user; the uploader. Task 5 widens it.
    Not visible: 404 `NOT_FOUND`.
  - `duplicateOf`: ids of other receipts with the same `sha256`; for
    callers other than owner and hr, only those of the same employee.
  - Download: body is the decrypted bytes; headers `Content-Type` (the
    stored sniffed type), `Content-Disposition: attachment;
    filename="receipt-<id>.<jpg|png|pdf>"` (never the uploaded name),
    `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`. Audit
    `receipt.downloaded`.

- [ ] **Step 1: Write the failing tests**

`receipts-sniff.test.ts`: the three magic prefixes give their types;
`"<html><script>"` bytes, an empty array and `GIF89a` give `null`.

`fs-blob.test.ts` (temp dir under the OS temp folder, removed after):
put then get round-trips; get of a missing key is `null`; key
`"../x"` throws `BLOB_KEY_INVALID`.

`receipts.test.ts` (Review Focus 3):
- `upload_png_by_employee`: 201, `size`, `sha256` of the bytes,
  `suggestion { source: "none" }`; the memory store's stored bytes do
  not contain the PNG signature.
- `html_declared_png_refused`: 415 `RECEIPT_TYPE_NOT_ALLOWED`.
- `pdf_declared_png_refused`: 422 `RECEIPT_TYPE_MISMATCH`.
- `oversize_refused`: `RECEIPT_MAX_BYTES + 1` decoded bytes: 413
  `RECEIPT_TOO_LARGE`; a 7_600_000-byte body: 413 `PAYLOAD_TOO_LARGE`.
- `bad_base64_refused`: 400 `RECEIPT_BASE64_INVALID`.
- `download_headers`: bytes equal the upload; `Content-Disposition`
  starts with `attachment;` and names `receipt-<id>.png` even when
  `fileName` was `"x\".html"`; `nosniff` present.
- `other_employee_404`: a colleague (not manager, not hr) gets 404 on
  metadata and content.
- `other_company_404`: company B's owner with B's header gets 404 for
  A's receipt id.
- `duplicate_listed`: the same bytes uploaded twice by one employee:
  the second has `duplicateOf` = `[first id]`.
- `ocr_suggestion_stored_not_applied`: `makeApp({ reader })` whose
  reader returns `{ source: "ocr", amount: "12.50", supplierTrn:
  "100000000000003" }`: the receipt's `suggestion` equals it; a reader
  returning `{ amount: 12.5 }` or throwing gives `{ source: "none" }`
  and a log line without `12.5`.
- `audit_has_no_content`: the `receipt.uploaded` event `data` is `{
  contentType, size }` only.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test receipts`.
  Expected: FAIL.
- [ ] **Step 3: Implement** the files above; `bodyLimit` uses
  `hono/body-limit` with an `onError` that returns 413
  `PAYLOAD_TOO_LARGE` in `ApiErrorBody` form.
- [ ] **Step 4: Run** `pnpm --filter @payroll/api test` and `pnpm check`.
  Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): receipts with storage and OCR port`.

### Task 4: Categories, policy, pricing and policy checks

**Files:**
- Create: `packages/api/src/expenses/policy.ts` (pure),
  `src/expenses/check.ts` (pure), `src/expenses/categories.ts`,
  `src/expenses/policy-store.ts`, `src/routes/expense-policy.ts`,
  `migrations/009_expense_policy.sql`
- Test: `packages/api/tests/expense-pricing.test.ts`,
  `tests/expense-check.test.ts`, `tests/expense-policy.test.ts`,
  `tests/expenses-purity.test.ts`

**Interfaces:**
- Consumes: Task 1 schemas; Plan 3 `parseAed`, `toMoney`,
  `appendAudit`.
- Produces:
  - Migration 009: `expense_categories(id, company_id, code, name,
    name_ar, kind, active, unique(company_id, code))`;
    `expense_policies(company_id pk, version, claim_window_days, body
    jsonb, updated_by, updated_at)` (body holds limits and rates with
    amounts as wire strings).
  - `policy.ts` (pure; `PolicyF` is `ExpensePolicy` with `Fils`
    amounts): `pickRate<R extends { code; effectiveFrom }>(rates: R[],
    code: string, date: string): R | null` (latest `effectiveFrom <=
    date`); `priceItem(item: ExpenseItemInput, p: PolicyF): { ok: true;
    amount: Fils; vatAmount: Fils; rateApplied: Fils | null } | { ok:
    false; code: "RATE_NOT_FOUND" }` (mileage `BigInt(distanceKm) *
    perKm`; per diem `BigInt(days) * daily`; receipt items keep their
    amounts); `limitFor(p: PolicyF, categoryId: string, role: Role):
    LimitF | null` (a row for the role wins over the `role: null` row).
  - `check.ts` (pure): `interface CheckItem { index: number; categoryId:
    string; kind: ExpenseKind; date: string; amount: Fils; vatAmount:
    Fils; supplierTrn: string | null; receiptCount: number;
    receiptHashes: string[]; justification: string | null;
    originalCurrency: string | null; priced: boolean }`;
    `interface CheckInput { items: CheckItem[]; role: Role; today:
    string; joiningDate: string; claimWindowDays: number | null;
    categories: ReadonlyMap<string, { kind: ExpenseKind; active: boolean
    }>; limits: (categoryId: string) => LimitF | null; monthToDate:
    ReadonlyMap<string, Fils>; otherSignatures: ReadonlySet<string>;
    otherHashes: ReadonlySet<string> }` (`monthToDate` keys
    `"<categoryId>|YYYY-MM"`; signatures `"<categoryId>|<date>|<fils>"`);
    `checkClaim(i: CheckInput): { problems: string[]; flags: {
    code: ClaimFlagCode; index: number | null }[]; overLimitIndexes:
    number[] }`.
  - Per-item rule order: `CATEGORY_NOT_FOUND`, `CATEGORY_INACTIVE`,
    `CATEGORY_KIND_MISMATCH`, `RATE_NOT_FOUND` (when `priced` false),
    `EXPENSE_DATE_IN_FUTURE` (`date > today`),
    `EXPENSE_BEFORE_JOINING`, `EXPENSE_TOO_OLD` (`today - date >
    claimWindowDays` calendar days), `VAT_EXCEEDS_AMOUNT`,
    `RECEIPT_REQUIRED` (`amount > receiptRequiredAbove` and no
    receipt). Then limits: over `perItemMax`, or the running sum of
    `monthToDate` plus this claim's earlier items of the same category
    and month above `monthlyMax`: `block` gives problem
    `EXPENSE_OVER_LIMIT`; `flag` gives an `OVER_LIMIT` flag and, with no
    `justification`, problem `JUSTIFICATION_REQUIRED`. Flags:
    `POSSIBLE_DUPLICATE` (signature in `otherSignatures` or repeated in
    this claim), `DUPLICATE_RECEIPT` (hash in `otherHashes` or on two
    items), `VAT_WITHOUT_TRN` (`vatAmount > 0` and no TRN),
    `FOREIGN_CURRENCY` (`originalCurrency` set and not `AED`). Empty
    `items`: `["claim:CLAIM_EMPTY"]`. Every problem is reported, not the
    first only.
  - `categories.ts`, `policy-store.ts`: list, create (duplicate code 409
    `CATEGORY_CODE_TAKEN`), patch; `getPolicy(tx, companyId):
    Promise<ExpensePolicy>` (no row: version 0, empty lists,
    `claimWindowDays: null`); `putPolicy(ctx, body)`: version mismatch
    409 `POLICY_VERSION_CONFLICT`; unknown `categoryId`, two limits for
    one `(categoryId, role)`, two rates with one `(code,
    effectiveFrom)`, or a rate of `"0.00"`: 422 `POLICY_INVALID` with
    `detail.paths`. Audit `expense-category.created`,
    `expense-category.updated` (`changed`), `expense-policy.updated`
    (`data: { version, limitCount, rateCount }`).

- [ ] **Step 1: Write the failing tests**

`expense-pricing.test.ts`: mileage rates `[{ code: "car", perKm: 75n,
effectiveFrom: "2026-01-01" }, { code: "car", perKm: 80n,
effectiveFrom: "2026-07-01" }]`: 120 km on `2026-06-30` gives
`9000n` and `rateApplied 75n`; on `2026-07-01` gives `9600n`; on
`2025-12-31` gives `RATE_NOT_FOUND`; per diem `daily 20000n` times 3
days gives `60000n`, `vatAmount 0n`; a receipt item keeps `amount` and
`vatAmount`; `limitFor` returns the `manager` row for a manager and the
`null` row for an employee; with no rows, `null`.

`expense-check.test.ts` (builders in the file; today `2026-03-20`,
joined `2025-01-01`, window 90):
- `check_clean_claim`: no problems, no flags.
- `check_future_and_old`: dates `2026-03-21` and `2025-12-19` give
  `items.0:EXPENSE_DATE_IN_FUTURE` and `items.1:EXPENSE_TOO_OLD`;
  `2025-12-20` (exactly 90 days) passes.
- `check_before_joining`: `2024-12-31` gives `EXPENSE_BEFORE_JOINING`.
- `check_vat_over_amount`: amount 1000n, VAT 1001n gives
  `VAT_EXCEEDS_AMOUNT`; VAT 1000n passes.
- `check_receipt_required`: threshold 5000n, amount 5000n without
  receipt passes, 5001n gives `RECEIPT_REQUIRED`.
- `check_block_limit`: `perItemMax 10000n`, `block`, amount 10001n
  gives `EXPENSE_OVER_LIMIT`.
- `check_flag_limit_needs_justification`: same with `flag`: flag
  `OVER_LIMIT` at index 0, problem `JUSTIFICATION_REQUIRED`; with a
  justification only the flag and `overLimitIndexes [0]`.
- `check_monthly_cumulative`: `monthlyMax 50000n`, `monthToDate`
  40000n for March, two items of 6000n in March: the second is over,
  the first is not; an April item is not.
- `check_reports_all_problems`: three bad items give three problems.
- `check_flags`: a repeated signature gives `POSSIBLE_DUPLICATE`; a hash
  in `otherHashes` gives `DUPLICATE_RECEIPT`; VAT 50n without TRN gives
  `VAT_WITHOUT_TRN`; `originalCurrency "USD"` gives `FOREIGN_CURRENCY`.
- `check_empty`: `["claim:CLAIM_EMPTY"]`.

`expense-policy.test.ts`: hr creates category `fuel` (`receipt`) and a
duplicate gets 409; employee `GET /v1/expense-policy` sees version 0
and empty lists; hr `PUT` with `expectedVersion: 0` gives version 1,
again with 0 gives 409 `POLICY_VERSION_CONFLICT`; an unknown
`categoryId` gives 422 `POLICY_INVALID` with a path naming
`limits.0.categoryId`; employee `PUT` gives 403 `FORBIDDEN`; the audit
event `data` holds no amount string.

`expenses-purity.test.ts`: `src/expenses/policy.ts`,
`src/expenses/check.ts` (and, from Task 6, `src/expenses/reimburse.ts`)
contain none of `Date`, `process`, `fetch`, `node:`, `randomUUID`,
`./db`, `../db`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test expense`.
  Expected: FAIL.
- [ ] **Step 3: Implement** `policy.ts` and `check.ts` first, then the
  store and routes.
- [ ] **Step 4: Run** `pnpm --filter @payroll/api test` and `pnpm check`.
  Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): expense policy, pricing, checks`.

### Task 5: Expense claims (draft, submit, approval, cancel)

**Files:**
- Create: `packages/api/src/expenses/claims.ts`,
  `src/expenses/claim-view.ts`, `src/expenses/submit.ts`,
  `src/expenses/subject.ts`, `src/routes/expense-claims.ts`,
  `migrations/010_expense_claims.sql`
- Modify: `src/app.ts` (pass `[expenseClaimSubject]` to the approval
  handlers), `src/receipts/receipts.ts` (`receiptVisible` also true
  when the caller may view a claim whose current revision references
  the receipt)
- Test: `packages/api/tests/expense-claims.test.ts`,
  `tests/expense-submit.test.ts`, `tests/expense-approval-flow.test.ts`

**Interfaces:**
- Consumes: Task 2 `openRequest`, `cancelRequest`, `viewFor`,
  `SubjectHandler`; Task 3 receipts; Task 4 `priceItem`, `limitFor`,
  `checkClaim`, `getPolicy`; Plan 3 `viewerScope`, `loadEmployee`,
  `dubaiDate`, `appendAudit`.
- Produces:
  - Migration 010: `expense_claims(id, company_id, employee_id, title,
    status, revision, created_by, submitted_by, submitted_at,
    decided_at, approval_id, pay_run_id, policy_version, total bigint,
    vat_total bigint, flags jsonb, cancel_note)`; `expense_items(id,
    company_id, claim_id, revision, idx, kind, category_id, date,
    description, amount bigint, vat_amount bigint, supplier_name,
    supplier_trn, distance_km, days, rate_code, rate_applied bigint,
    justification, original_currency, original_amount, over_limit)`;
    `expense_item_receipts(company_id, item_id, receipt_id)`. Index
    `(company_id, status, pay_run_id)`. No delete grant: an edit inserts
    the items under `revision + 1`; reads use the claim's `revision`.
  - `claimVisible(ctx, claim): boolean`: owner and hr; the claimant's
    user; the creator; the claimant's line manager; any user in an
    `eligible` list or `decided_by` of the claim's approval steps. Not
    visible: 404 `NOT_FOUND`.
  - `toClaimView(row, items, approval): ExpenseClaim` (the only claim
    serialiser; `vatRecoverability: "not-assessed"`).
  - Create: an employee files for self (`employeeId` omitted or equal,
    else 403 `FORBIDDEN`); owner and hr may file for anyone
    (`createdBy` records them). Save-time checks only: each
    `categoryId` exists (`CATEGORY_NOT_FOUND`) and each receipt id
    belongs to the claimant employee (`RECEIPT_NOT_FOUND`), both as 422
    `CLAIM_PROBLEMS` with `detail.problems`. Audit
    `expense-claim.created` (`data: { itemCount }`).
  - Patch: claimant's user or creator, status `draft` or `returned`
    (else 409 `CLAIM_NOT_EDITABLE`); audit `expense-claim.updated`
    (`changed`).
  - `submitClaim(ctx, handlers, id)`: same editors and statuses; locks
    the claimant's `employees` row `FOR UPDATE` (serialises monthly
    limits per employee); prices items; builds `CheckInput` (`role` =
    the claimant's membership role, `employee` when the claimant has no
    membership; `today = dubaiDate(now)`; `monthToDate`, signatures and
    hashes from the employee's other claims in `submitted`, `approved`,
    `reimbursed`); problems give 422 `CLAIM_PROBLEMS`; then
    `openRequest` (its `NO_ELIGIBLE_APPROVER` propagates); stores
    totals, flags, `policy_version`, `approval_id`, status `submitted`.
    Audit `expense-claim.submitted` (`data: { itemCount, flagCodes }`).
  - `expenseClaimSubject: SubjectHandler`: `facts` gives total
    (including VAT), `overLimit` (any `over_limit` item) and summary;
    `onClosed` sets `approved` or `rejected` with `decided_at`, or
    `returned` (editable again; a later submit opens a new request).
    Audit `expense-claim.approved`, `.rejected`, `.returned`.
  - Cancel: claimant or creator for `draft`, `returned`, `submitted`
    (`cancelRequest` closes the open request); owner and hr for
    `approved` with `pay_run_id` null, note required (422
    `CANCEL_NOTE_REQUIRED`); anything else 409 `CLAIM_NOT_CANCELLABLE`.
    Audit `expense-claim.cancelled`.
  - List: `GET /v1/expense-claims` applies `claimVisible` in SQL
    (owner and hr all; else self, reports and claims where the caller
    is an approver), newest first.

- [ ] **Step 1: Write the failing tests** (`seedCompany` plus a category
  `meals` (`receipt`), a `mileage` category with rate `car` "0.75"
  from `2026-01-01`, a `per-diem` category with rate `gcc` "200.00",
  and a fixed clock `2026-03-20T08:00:00Z`)

`expense-claims.test.ts`:
- `employee_creates_draft`: 201, status `draft`, mileage item 120 km
  priced `"90.00"` on read, `vatRecoverability "not-assessed"`.
- `employee_cannot_file_for_other`: 403 `FORBIDDEN`; hr may, and
  `createdBy` is hr's user.
- `foreign_receipt_refused`: an item naming the colleague's receipt id
  gives 422 `CLAIM_PROBLEMS` with `items.0:RECEIPT_NOT_FOUND`.
- `edit_creates_revision`: a patch replaces the items; the old item
  rows still exist with the old revision; the view shows only the new
  ones.
- `visibility`: the manager sees the report's claim; a colleague gets
  404; company B gets 404.
- `audit_trail_no_amounts`: every `expense-claim.*` event's `data`
  JSON contains no item amount, VAT, TRN or supplier name.

`expense-submit.test.ts`:
- `submit_opens_approval_to_manager`: status `submitted`, `approval`
  has one pending step with approver `line-manager`, and the manager's
  inbox lists it with `total`.
- `submit_reports_all_problems`: a future-dated item and an item
  without a needed receipt give 422 with both problem strings.
- `submit_flag_limit_adds_owner_tier`: policy `meals` `perItemMax
  "100.00"` `flag`; item "150.00" with justification: steps
  `[line-manager, role owner]`, flag `OVER_LIMIT`.
- `submit_monthly_limit_counts_other_claims`: `monthlyMax "500.00"`
  `block`; an approved claim of "400.00" in March, a new "150.00":
  422 `items.0:EXPENSE_OVER_LIMIT`.
- `submit_by_single_owner_refused`: a company with only an owner who
  files a claim: 422 `NO_ELIGIBLE_APPROVER`, claim stays `draft`.
- `submit_without_rate_refused`: a mileage item dated `2025-12-31`
  gives `RATE_NOT_FOUND`.

`expense-approval-flow.test.ts`:
- `approve_sets_approved`: manager approves: claim `approved`,
  `decidedAt` set; employee view shows the step with `decidedBy`.
- `return_then_resubmit`: return with a note: claim `returned`, editable;
  resubmit opens a second approval; the first stays `returned`.
- `reject_is_final`: reject: `rejected`; a patch gives 409
  `CLAIM_NOT_EDITABLE`.
- `cancel_rules`: employee cancels a `submitted` claim (approval
  `cancelled`); hr cancels an `approved` claim without a note: 422
  `CANCEL_NOTE_REQUIRED`, with a note: `cancelled`.
- `approver_can_view_receipt`: the manager downloads the receipt of a
  claim they approve; before the claim referenced it, 404.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test expense`.
  Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `pnpm --filter @payroll/api test` and `pnpm check`.
  Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): expense claims with approvals`.

### Task 6: Reimbursement into payroll

High risk (money): this task keeps a per-task review.

**Files:**
- Create: `packages/api/src/expenses/reimburse.ts` (pure)
- Modify: `src/payroll/snapshot.ts` (load claims), `src/payroll/
  compute.ts` (`computePayRun` calls `applyReimbursements` last for each
  payslip), `src/payroll/pay-runs.ts` (link, approve, void,
  `excludeClaimIds`, counts), `src/payroll/payslips.ts` (serialise the
  new fields), `tests/compute.test.ts` (builders gain `reimbursements:
  []`), `tests/helpers/seed.ts` (`seedClaim(app, seeded, employeeKey,
  amount)` returns an approved claim id)
- Test: `packages/api/tests/reimburse.test.ts`,
  `tests/pay-run-reimbursement.test.ts`

**Interfaces:**
- Consumes: Plan 3 `RunSnapshot`, `ComputedPayslip`, `computePayRun`,
  `createPayRun`, `snapshotHash`, `buildSifBatch`; Task 5 claim rows.
- Produces:
  - `interface SnapshotReimbursement { employeeId: string; claimId:
    string; title: string; amount: Fils }`; `RunSnapshot` gains
    `reimbursements: SnapshotReimbursement[]` (sorted by `claimId`), so
    `snapshotHash` covers them.
  - `applyReimbursements(slip: ComputedPayslip, items:
    SnapshotReimbursement[]): ComputedPayslip` (only items of
    `slip.employeeId`): `salaryNet` = the incoming `net`;
    `reimbursements` one line per claim in `claimId` order, label =
    claim title, `traceId` `reimb.claim#<claimId>`;
    `reimbursementTotal` = their sum; `net = salaryNet +
    reimbursementTotal`; `reimbursementNote` =
    `REIMBURSEMENT_WPS_NOTE` when any line, else `null`. Trace: one line
    per claim (`formula "approved expense claim"`, `inputs { claimId }`,
    `rules: []`), then `reimb.total` (`"sum of approved expense
    claims"`) and `pay.net-with-reimbursements` (`"salary net +
    reimbursements"`), appended after the existing lines. `lines`,
    `gross`, `settlement`, `notComputed` and existing trace lines are
    unchanged. This step runs after whatever computes salary net (Plan
    3's sum of lines today, Plan 5's `calculatePayslip` net if it is
    wired in later), so it never enters a deduction cap, GPSSA or
    gratuity base.
  - Snapshot: claims with `status = 'approved' AND pay_run_id IS NULL`
    of in-scope employees, minus `excludeClaimIds`, read `FOR UPDATE`
    (a concurrent run re-checks `pay_run_id` and skips linked claims).
    Each `excludeClaimIds` id must be such a claim, else 422
    `EXCLUDED_CLAIM_INVALID` with `detail.claimIds`.
  - `createPayRun`: after the insert returns a row (never on replay or
    conflict), `UPDATE expense_claims SET pay_run_id` for the snapshot's
    claims; audit `expense-claim.scheduled` per claim (`data: {
    payRunId }`). `PayRun.reimbursementTotal` and `claimCount` from the
    snapshot; `pendingClaimCount` = in-scope employees' `submitted`
    claims at creation (a UQ9 warning, never a block).
  - Approve run: linked claims become `reimbursed` (audit
    `expense-claim.reimbursed`). Void run: linked `approved` claims get
    `pay_run_id = NULL` (audit `expense-claim.released`).
  - `buildSifBatch` is not changed: it reads `lines`, so reimbursements
    stay out of the SIF.

- [ ] **Step 1: Write the failing tests**

`reimburse.test.ts` (pure):
- `no_claims_changes_nothing_but_fields`: basic 4000.00 + housing
  1500.00: `gross 550000n`, `salaryNet 550000n`, `net 550000n`,
  `reimbursementTotal 0n`, `reimbursementNote null`, trace length
  unchanged.
- `adds_outside_gross`: one claim 25000n: `gross 550000n`, `salaryNet
  550000n`, `reimbursementTotal 25000n`, `net 575000n`, `lines`
  deep-equal the input lines, note equals `REIMBURSEMENT_WPS_NOTE`,
  trace ends with `reimb.claim#<id>`, `reimb.total`,
  `pay.net-with-reimbursements` whose `result` is `"575000"`.
- `ignores_other_employees`: a claim of another employee is not added.
- `order_is_stable`: claims given in reverse order give the same
  payslip.
- fast-check (200 runs, 0 to 10 claims up to 100,000,000 fils, any
  salary slip): `gross`, `lines`, `settlement` and every pre-existing
  trace line are unchanged; `net === salaryNet + reimbursementTotal`;
  `reimbursementTotal` equals the sum of the employee's claims.

`pay-run-reimbursement.test.ts` (March 2026; employee basic 4000.00,
housing 1500.00; approved claim "250.00" with VAT "11.90"):
- `run_carries_claim`: run `reimbursementTotal "250.00"`, `claimCount
  1`, `gross "5500.00"`; payslip `salaryNet "5500.00"`, `net
  "5750.00"`, one reimbursement line; the claim has `payRunId`.
- `sif_excludes_reimbursement`: after approval the SIF `total` is
  `"5500.00"` and the EDR fixed plus variable is 5500.00.
- `approve_marks_reimbursed`: claim status `reimbursed`; audit
  `expense-claim.reimbursed`.
- `reimbursed_exactly_once` (Review Focus 1): (a) a claim approved
  after the March draft exists is not in March; after March is voided
  and recreated with a new key it is, and the first claim appears once;
  (b) a replay of the same key and body after a new claim is approved
  returns the original run and does not link the new claim; (c) March
  and April runs created with `Promise.all` link each claim to exactly
  one run (`SELECT count(*) ... WHERE pay_run_id IS NOT NULL` equals
  the claim count, no claim in both payslips); (d) after approval, the
  next month's run has `claimCount 0`.
- `exclude_claim`: `excludeClaimIds` with the claim gives `claimCount
  0` and the claim stays `approved` with no `payRunId`; a submitted
  claim's id gives 422 `EXCLUDED_CLAIM_INVALID`.
- `claim_of_out_of_scope_employee_waits` (Review Focus 5): an
  employee who left `2026-02-28` with an approved claim: the March run
  has `claimCount 0` and the claim stays `approved`.
- `pending_claims_counted`: one `submitted` claim gives
  `pendingClaimCount 1` and the run is still created.
- `leaver_settlement_unchanged`: a March leaver with a claim: the
  settlement equals the engine's result for the same input without the
  claim.
- `approved_in_run_not_cancellable`: hr cancel of a linked claim gives
  409 `CLAIM_NOT_CANCELLABLE`.
- `employee_sees_own_reimbursement`: after approval `GET
  /v1/me/payslips` shows the line; a colleague's payslip is 404.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test reimburse`.
  Expected: FAIL.
- [ ] **Step 3: Implement** `reimburse.ts`, then the modifications;
  add `src/expenses/reimburse.ts` to `expenses-purity.test.ts`.
- [ ] **Step 4: Run** `pnpm --filter @payroll/api test` and `pnpm check`.
  Expected: PASS, including every Plan 3 pay-run, SIF and idempotency
  test unchanged.
- [ ] **Step 5: Commit** `feat(api): reimburse approved claims in payroll`.

### Task 7: Reports, CSV, leak and conformance, handover

**Files:**
- Create: `packages/api/src/http/csv.ts` (pure),
  `src/expenses/reports.ts`, `src/routes/expense-reports.ts`
- Modify: `src/app.ts` (csv-optional responses), `tests/leak.test.ts`,
  `tests/conformance.test.ts`, `tests/helpers/seed.ts`
  (`seedExpenses`), `HANDOVER.md`, `LEDGER.md`
- Test: `packages/api/tests/csv.test.ts`,
  `tests/expense-reports.test.ts`

**Interfaces:**
- Consumes: Tasks 1 to 6; Plan 3 `dubaiDate`, `toMoney`.
- Produces:
  - `toCsv(statement: string | null, header: string[], rows:
    string[][]): string`: RFC 4180 (CRLF, a cell with `,`, `"`, CR or LF
    is quoted with `""` escaping); a cell starting with `=`, `+`, `-`,
    `@`, tab or CR gets a leading `'`; when `statement` is given, the
    first line is that one quoted cell; UTF-8 with a BOM so Excel reads
    Arabic.
  - Reports (owner and hr only; date filters use item dates;
    default statuses `approved` and `reimbursed`):
    `summaryReport(ctx, q): SummaryReport`; `vatRegister(ctx, q):
    VatRegister` (items with `vatAmount > 0` or a TRN; `netOfVat =
    amount - vatAmount`); `agingReport(ctx): AgingRow[]` (pending
    steps, oldest first, `ageDays` by Dubai dates); `unpaidReport(ctx):
    UnpaidRow[]` (`approved` claims: `in-draft-run` when linked,
    `employee-left` when the employee's `lastWorkingDate` is before
    today's Dubai date, else `awaiting-pay-run`); `payoutsReport(ctx,
    q): Payouts` (per employee totals of claims linked to the run; 404
    for an unknown run). CSV variants carry `VAT_STATEMENT` (summary,
    VAT register) or `REIMBURSEMENT_WPS_NOTE` (payouts) as the
    statement line; amounts as wire strings.
  - `seedExpenses(app, seeded)`: one approved claim per seeded employee
    with a distinct sentinel amount `"8888.01"`, `"8888.02"` and so on
    (`EXPENSE_SENTINELS: Record<employeeId, string>`).

- [ ] **Step 1: Write the failing tests**

`csv.test.ts`:
- `csv_neutralises_formulas` (Review Focus 4): cells `"=1+1"`,
  `"+971"`, `"-5"`, `"@SUM(A1)"` are written `'=1+1` and so on.
- `csv_quotes`: `a,b` becomes `"a,b"`; `say "hi"` becomes `"say ""hi"""`;
  rows end with CRLF; the output starts with the BOM, then the quoted
  statement line.
- `csv_arabic`: `"مطعم"` round-trips unchanged.

`expense-reports.test.ts`:
- `summary_by_category`: two approved claims (meals "150.00" VAT "7.14";
  mileage "90.00"): rows for both categories, `total "240.00"`,
  `vatTotal "7.14"`, `statement` equals `VAT_STATEMENT`; a `draft`
  claim is not counted.
- `summary_by_pay_run`: `payRunId` filter counts only that run's
  claims.
- `vat_register`: one row for the meals item with `netOfVat "142.86"`,
  `vatRecoverability "not-assessed"`; the mileage item is absent;
  `format=csv` gives `text/csv`, the statement line first and a
  supplier name `"=HYPERLINK(...)"` written with a leading `'`.
- `aging_report`: a claim submitted `2026-03-10` and today
  `2026-03-20` gives `ageDays 10`.
- `unpaid_lists_leaver_claim` (Review Focus 5): the leaver's approved
  claim has reason `employee-left`; a claim in a draft run
  `in-draft-run`; another `awaiting-pay-run`.
- `payouts_for_run`: one row per employee with `claimIds` and `total`,
  `note` equals `REIMBURSEMENT_WPS_NOTE`, no IBAN in the body.
- `reports_forbidden_to_manager`: manager and employee get 403
  `FORBIDDEN` on all five.
- `reports_no_vat_rate`: no response body contains `"5%"`,
  `"recoverable"` or `"claimable"`.

`leak.test.ts` (extend): `seedExpenses` runs after `seedPayroll`; the
id filler maps `{id}` of claim, receipt and approval routes to seeded
ids and `{subjectType}` to `expense-claim`; `mayView` adds: owner and
hr see every claim, receipt, report and payout; self sees own claims,
receipts and own payslip reimbursements; a manager sees the direct
report's claims and receipts (approver); nobody else. For every tenant
`GET`, no body contains a sentinel salary amount, IBAN or expense
sentinel the caller may not view. Company B's owner gets 404 for every
A id on the new routes.

`conformance.test.ts` (extend): happy-path calls for the 25 new routes
parse with `def.response`; `binary` routes are checked by
`Content-Type` and byte equality; `csv-optional` routes are parsed as
JSON and, with `format=csv`, checked for `text/csv`; every new error
code sent is in `ERROR_CODES`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test`. Expected: FAIL.
- [ ] **Step 3: Implement** `csv.ts`, `reports.ts`, the routes and the
  test extensions.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Update `HANDOVER.md`** (state: Plan 6 built; API layout
  rows for `approvals`, `receipts`, `expenses`, `storage`; `RECEIPTS_DIR`
  in the run notes; limits: reimbursements outside the SIF, VAT not
  assessed, OCR not built, no web screens yet, approval spine used by
  expenses only) and **append to `LEDGER.md`** section 3 one dated line
  per Ruling below.
- [ ] **Step 6: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 7: Commit** `feat(api): expense reports, handover`.

---

## Rulings

Claude's calls under the owner's "decide, don't ask" instruction. Each
says what it costs if wrong. The executor appends them to `LEDGER.md`
(Task 7).

1. **WPS treatment of reimbursements (UNSOURCED, flagged).**
   Reimbursements are paid with the payroll but outside the SIF: the
   SIF carries `salaryNet`, the payslip shows `net` including
   reimbursements, and every affected payslip, run and payout report
   shows `REIMBURSEMENT_WPS_NOTE`. Why: no source says whether expense
   repayments must travel through WPS; Plan 3 Ruling 12 keeps the
   settlement out of the SIF for the same reason; putting them in the
   EVP "other allowances" field would report expenses as wages to
   MOHRE; Plan 5's adapter requires `fixed + variable = net` of the
   engine payslip, which stays salary only. Cost if WPS is required:
   one change in `buildSifBatch` (add `reimbursementTotal` to variable
   pay and the EVP `otherAllowances` field), about half a day; until
   then HR pays by a separate transfer using the payouts report.
2. **Non-taxable means "not wage".** The UAE has no personal income
   tax rule in our packs; the product meaning is: never in gross, the
   deduction cap base, GPSSA or gratuity. Proven by the Task 6 property
   test. Cost if a rule later treats some reimbursements (for example
   per diem over a cap, idea T2) as pay: a split in `applyReimbursements`
   that moves the excess into a pay line.
3. **Reimbursement is added in the API payslip, not in the engine.**
   Plan 5's engine invariant `net = gross - totalDeductions` and its
   SIF adapter stay intact. Cost: a later engine-level reimbursement
   would move one function.
4. **VAT: capture only.** Fields `amount` (VAT inclusive), `vatAmount`,
   `supplierName`, `supplierTrn`; the only check is `vatAmount <=
   amount`; no rate, no recoverability (`"not-assessed"` plus
   `VAT_STATEMENT`). FTA Decision 17 of 2026 is known from secondary
   summaries only. Cost: the accountant judges recovery outside the
   product until the official text is read and a rule-pack exists.
5. **TRN format `^\d{15}$` is a convention, not a sourced rule.** No
   checksum. Cost: a valid TRN of another shape is refused; one regex.
6. **AED only.** `originalCurrency` and `originalAmount` are free
   information fields, flagged `FOREIGN_CURRENCY`; no exchange rate is
   applied (the Central Bank rate rule applies to VAT, not to employee
   repayment). Cost: claimants convert by hand.
7. **Mileage and per diem are company policy values with no default**
   (no statutory private-sector rate was read). Whole kilometres and
   whole days, so no rounding exists. Rates are dated and the applied
   rate is stored on the item. Cost: a company that pays per 0.1 km or
   half days enters the nearest whole unit.
8. **"Per-role" limits key on Plan 3's `Role`** (owner, hr, manager,
   employee), with a `role: null` default row. Cost if the owner meant
   job grade or department: a new key column and one lookup change in
   `limitFor`; claims already stored are not affected.
9. **Limits are checked at submit only**, against claims in
   `submitted`, `approved` and `reimbursed`; `block` refuses, `flag`
   needs a justification and adds the over-limit approver. Cost: a
   policy tightened after submit does not re-check open claims.
10. **Approval spine scope (UQ18).** In: generic chains per subject
    type, amount tiers, line-manager, role and named-user approvers,
    fallback hr then owner, maker-checker (claimant and submitter
    excluded), distinct approvers across tiers, over-limit escalation,
    optimistic step numbers against double clicks, inbox and aging.
    Deferred: delegation, leave-aware rerouting (U4), risk signals from
    the engine (G11), SLA alerts, moving leave and pay-run approvals
    onto the spine, WhatsApp approvals. Cost: leave and pay runs keep
    Plan 3's own checks until a later plan migrates them.
11. **Eligibility is fixed at submit.** A role change after submit does
    not add or remove approvers; a claim whose last approver leaves is
    cancelled and resubmitted. Cost: an occasional resubmission.
12. **A one-person company cannot approve its own claims**
    (`NO_ELIGIBLE_APPROVER`), as Plan 3 Ruling 10 for pay runs. Cost:
    the owner invites a second owner, hr user or a named approver.
13. **Expense approvals need no MFA; changing a chain needs owner and
    MFA** (G10: who approves money is a sensitive setting). Cost: a
    stolen employee session can approve a report's claim; the audit
    trail shows it.
14. **No partial approval.** An approver returns the claim for changes
    instead. Cost: one more round trip for a single bad item.
15. **Claim amounts are stored in clear** (bigint fils) so reports can
    sum in SQL; payslip bodies that carry reimbursements stay encrypted
    (Plan 3). Receipt files are encrypted. Cost: a database reader sees
    expense amounts, which are not salary.
16. **Draft edits are revisions, not deletes** (Plan 3 grants no
    delete). Cost: a few spare rows per edited claim.
17. **Receipts:** JPEG, PNG and PDF only, sniffed from bytes, at most 5
    MiB, sent as base64 JSON (one body format across the API) under a
    7.5 MB body limit; always downloaded as an attachment under a
    generated name. HEIC is refused. Cost: iPhone HEIC photos need
    converting in the client (Plan 4); base64 costs a third more
    upload size.
18. **Storage is a `BlobStore` port**: memory in tests, local disk in
    development (`RECEIPTS_DIR`), object storage in a later plan. Cost:
    a multi-server deploy needs the object-storage adapter first.
19. **OCR is an interface only** (`ReceiptReader`, null by default).
    Output is untrusted, schema-checked, stored as a suggestion and
    never applied (UQ24, UQ25: humans confirm). Cost: claimants type
    every field until a reader is chosen.
20. **Duplicates are flagged, never blocked** (`POSSIBLE_DUPLICATE`,
    `DUPLICATE_RECEIPT`). Cost: an approver can still approve a real
    duplicate after seeing the flag.
21. **Payroll link:** approved, unlinked claims of in-scope employees
    join the next run created; HR can exclude claims per run; void
    releases them; approval marks them `reimbursed`; submitted claims
    are counted as a warning, never a block (UQ9 gate is M2). Cost: a
    claim approved one minute after the run waits a month unless HR
    voids and recreates the draft.
22. **A leaver's claim approved after the final run waits as
    `approved`** and shows as `employee-left` in the unpaid report; it
    is not added to the settlement (UQ12 exit flow is later). Cost: HR
    pays it by hand.
23. **Reports are for owner and hr only;** managers use the inbox and
    claim lists. CSV has a statement line first and a BOM. Cost:
    managers cannot export their team's spend; a role change on five
    routes.
24. **Audit data holds counts, codes and ids, never amounts, VAT, TRNs
    or supplier names** (Plan 3 Ruling 18). Cost: an auditor reads
    amounts from the claim, not the audit row.
25. **Backend only.** Expense and approval screens are a Plan 4
    follow-up; Task 1's `EXAMPLES` let Plan 4 mock them now. The new
    required `Payslip` and `PayRun` fields are filled with no-claim
    values in Plan 4's mocks. Cost: no user-facing expenses until that
    follow-up ships.
26. **Migrations 007 to 010.** If another plan has taken a number, the
    later-merged plan renumbers its files before merging (the runner
    records names, so a renumber after deployment is not allowed).
    Cost: one rename at merge.
27. **No cards, no payments, no payout files** (licensed partners,
    ledger 2026-11-25). Cost: none now; card spend joins the spine as a
    new `SubjectType` later.
28. **Review and parallelism:** per-task review for Task 2 (separation
    of duties), Task 3 (untrusted files) and Task 6 (money), one
    whole-branch review at the end (speed ruling). Tasks run in order
    in one worktree; the plan as a whole can run beside Plan 4 or Plan
    5 work in separate worktrees (up to 10 agents). Cost: a slipped bug
    in Tasks 1, 4, 5 or 7 is caught by the final review.
