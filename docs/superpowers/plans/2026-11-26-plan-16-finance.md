# Plan 16: Finance Modules (Payables, Budgets, Project Billing, Trips,
# Card Partner Interface) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Features delivered (10; count progress by these names):**

- F1 Supplier master data: suppliers with TRN, payment terms, contacts
  and encrypted bank details behind MFA (Task 1).
- F2 Purchase orders and goods receipts, with purchase order approval
  through the shared approval spine (Task 2).
- F3 Bills with three-way match (order, receipt, bill) and bill
  approval through the shared spine; idempotent posting of approved
  bills to the Plan 12 VAT ledger (Task 3).
- F4 Due-date calendar, payment run proposals and payment batches as
  export files only, with a bank file exporter interface (no bank
  format is sourced; no money moves) (Task 4).
- F5 Projects, clients, and time and expense capture against projects
  (Task 5).
- F6 Budgets by department, project and category with commitments
  versus actuals and over-budget alerts (Task 6).
- F7 Client invoices from time and expenses, with invoice documents,
  Plan 12 VAT fields and the e-invoicing hand-off interface (Tasks 7,
  8).
- F8 Business trips: travel requests, approval, per diem from the Plan
  6 policy, itinerary and ticket records, travel provider interface
  (records only; no booking) (Task 9).
- F9 Corporate card partner interface: issuer-neutral cards, limits,
  freeze and transaction feed through a port with a fake provider; no
  issuing, no funds held (Task 10).
- F10 Accounting export (Zoho Books, QuickBooks, Xero, Wafeq through an
  adapter interface) and spend reports (Tasks 11, 12).

Scope map (each requested item to its feature): supplier master data
F1; purchase orders, bills and three-way match F2, F3; bill approval
F3; due-date calendar and payment batches F4; payment run proposals and
bank file export interface F4; budgets with commitments, actuals and
alerts F6; project and client billing F5, F7; business trips and
tickets F8; corporate card partner interface F9; accounting export F10;
spend reports F10.

**Goal:** Give a UAE SME a payables, budgeting, project billing, trips
and card-data layer on the same records as HR, payroll and expenses,
where every money step stops at a file, a record or a partner port:
the product never moves money, never issues a card, never holds funds
and never books travel.

**Architecture:** API and contract only, as Plans 8 to 13 (no web
screens). Plan 16 extends Plan 3's `packages/contract` and
`packages/api`: a new `FINANCE_ROUTES` list in `routes-finance.ts`
joined through `ROUTE_GROUPS`, migrations `1601_` to `1610_`, services
under `packages/api/src/finance/`. Every computation that decides a
number (line net, three-way match, due dates, payment proposals, budget
commitments and actuals, invoice lines, per diem estimates, aging) is a
pure module with no db, clock or env. Money approvals reuse Plan 6's
approval spine through three new subject types. Outside systems sit
behind four ports, each shipped with a null implementation (refuses)
and a fake (tests): `BankFileExporter`, `TravelProvider`,
`CardIssuer`, `AccountingAdapter`. VAT comes from the Plan 12 engine
and ledger; e-invoices go through Plan 12's `createOutbound`.

**Tech Stack:** As Plan 3: Node 22, TypeScript 7.0.2, zod 4.6.7, Hono
4.13.17, @electric-sql/pglite 0.5.16 (tests), pg 8.23.1, node:crypto,
Vitest 5.1.2, fast-check 4.11.0, tsx 4.23.15. No new dependency.

**Spec:** `docs/superpowers/specs/2026-11-25-master-feature-list.md`
(principle 6 "one approval spine"; UQ8 cost and budget view, tags BET
and P (cards); UQ12 exit flow, cards flag-only; UQ31 trips and money,
tags BET, P, licensing; tag P "needs a licensed partner"),
`docs/superpowers/specs/2026-11-25-combined-feature-list.md` (section
H: accounts payable and spend, corporate cards, project operations and
billing "need licensed partners"),
`docs/superpowers/specs/2026-11-25-idea-pool.md` (T2 trip-to-payroll
split, T3 burn-down across pay and spend, T7 trip card reconcile),
`docs/research/2026-11-25-uae-spend-ap-specialists.md` (decision:
integrate, do not become, a card issuer or fund holder; accounting
connectors seen: Zoho Books, QuickBooks, Xero, Wafeq),
`docs/research/2026-11-26-vat-einvoicing-primary.md` (its gaps list is
binding: no Data Dictionary, no ASP list),
`LEDGER.md` sections 1 to 3 (owner put expense management, accounts
payable and spend, corporate cards and project billing in scope;
budgeting, business trips and flight tickets were requested ideas;
insurance out; "finance modules last ... need licensed partners"),
`docs/engineering-standards.md`. Extends
`docs/superpowers/plans/2026-11-26-plan-3-backend.md`; reuses
`docs/superpowers/plans/2026-11-26-plan-6-expenses.md` (approval spine,
expense categories, per diem rates, claims, `toCsv`, `binary` and
`text/csv-optional` responses),
`docs/superpowers/plans/2026-11-26-plan-7-documents.md` (`claimFile`,
`PdfRenderer`, `escapeHtml`, `CSP_META`, `contentDisposition`),
`docs/superpowers/plans/2026-11-26-plan-11-owner-view-evidence.md`
(`SignedMoney`, `toSignedMoney`, nullable `SubjectFacts
.claimantEmployeeId`), `docs/superpowers/plans/2026-11-26-plan-12-
vat-einvoicing.md` (`vatOnNet`, `TaxCategory`, `VatTreatment`,
`Emirate`, `Trn`, `insertVatDocument`, `EInvoiceDraft`,
`createOutbound`, `PROVIDER_NOT_CONFIGURED`).

**Prerequisites (per task).** As Plan 12: where this plan consumes a
function of another plan that its Interfaces blocks do not name
exactly, the executor exports it from the named file under the name
given here, renaming only at the export. Where a named item from Plans
6, 7, 10, 11 or 12 is not on the branch yet, the task that first needs
it creates it with exactly the signature given in that plan, and the
later-merged plan reuses it. Plans 14 and 15 are not on the branch;
nothing here depends on them.

| Task | Needs merged first |
|---|---|
| 1 | Plan 3 Tasks 1 to 8 |
| 2 | Task 1; Plan 6 Tasks 1, 2 and 4 (spine, categories) |
| 3 | Task 2; Plan 7 Task 3 (`claimFile`); Plan 12 Task 7 |
| 4 | Task 3 |
| 5 | Task 1; Plan 6 Task 5 (claims) |
| 6 | Tasks 2, 3 and 5 |
| 7 | Tasks 5 and 6; Plan 7 Task 6 (`PdfRenderer`); Plan 12 Task 3 |
| 8 | Task 7; Plan 12 Task 12 |
| 9 | Tasks 5 and 6; Plan 6 Task 5 |
| 10 | Tasks 5 and 6 |
| 11 | Tasks 3, 4, 7 and 10 |
| 12 | Tasks 1 to 11 |

Tasks run in order in one worktree. Tasks 9 and 10 touch disjoint
files and may run in parallel worktrees after Task 6.

## Global Constraints

- All of Plan 3's Global Constraints apply unchanged: 80-character
  lines, files under about 300 lines, functions under 30, `Fils`
  (bigint) inside, `Money` (`^\d{1,9}\.\d{2}$`) on the wire, RLS
  forced on every tenant table with `company_id`, all queries through
  `withTenant`, injected time, ids and randomness (`AppDeps`), `/v1`,
  `X-Company-Id`, offline tests, no `.transaction(` outside `src/db/`.
- Signed figures (budget remaining, variance) use `SignedMoney`
  (`^-?\d{1,9}\.\d{2}$`, never `"-0.00"`). Every other amount is
  `Money`.
- Quantities on the wire are `Qty` = `^\d{1,9}(\.\d{1,3})?$` (Plan 12
  `EInvoiceLine.quantity` shape); inside they are bigint thousandths.
  A line net is always `lineNet(qty, unitPrice)` (Task 1): quantity x
  unit price rounded HALF_UP to whole fils, the rule Plan 12
  `checkEinvoiceDraft` applies.
- AED only. A foreign amount is entered in AED with `originalCurrency`
  and `originalAmount` kept as information; no rate is applied.
- No statutory number in `packages/api` or `packages/contract`: no VAT
  rate, no "5%". VAT on a sale line comes only from Plan 12's engine
  `vatOnNet`; purchase VAT is entered by the company and checked only
  as `vat <= net` here (Plan 12 checks the rest when posting).
- Product defaults (match tolerances, aging buckets, alert thresholds,
  proposal horizon) live in `FINANCE_DEFAULTS` and are shown with
  `FINANCE_DEFAULTS_NOTE`, exact text: "Product defaults, not law or
  bank rules. Change them to match your company's practice."
- The product moves no money. No route sends a payment, a transfer, a
  direct debit or a card load. Payment batches end as files and a
  "marked paid" record typed in by a person. Every payable, batch and
  payment file response carries `PAYMENT_NOTE`, exact text: "This
  product does not send payments. Payment files are lists for your
  records or for your bank's own upload where your bank accepts them.
  No bank file format has been checked with a bank."
- The product issues no card and holds no funds. The `CardIssuer` port
  has no method that creates, issues, loads, tops up or pays; cards
  are created at the partner and only linked here. No card number
  (PAN), CVV or expiry is accepted, stored or logged: only the
  partner's card id and the last four digits. Every card response
  carries `CARD_NOTE`, exact text: "Cards are issued and funds are held
  by your card partner, not by this product. This product shows the
  partner's card data and passes your limit and freeze requests to
  it." No partner is named in code, tests or copy.
- The product books no travel. Every trip response carries
  `TRAVEL_NOTE`, exact text: "This product records trips, itineraries
  and tickets. It does not book, issue or pay for travel."
- Accounting exports use the product's own layout. Every export
  carries `ACCOUNTING_EXPORT_NOTE`, exact text: "Columns follow this
  product's own export layout, not the import format of any accounting
  product. Named targets are adapter slots that are not connected yet."
- Invoice documents are titled "Invoice" and carry
  `INVOICE_DOC_NOTE`, exact text: "VAT is worked from your tax
  category and the product's VAT rules. The content rules for tax
  invoices were not checked against FTA sources. Check the invoice
  before you send it."
- Never in contract or api source text: "compliant", "licensed",
  "licence holder", "issue a card", "issued by us", "payment sent",
  "paid by us", "booked", "booking confirmed", "FTA approved",
  "recoverable", "claimable", "5%". A copy-scan test enforces it
  (Task 1, extended in Task 12).
- Purchase VAT: the company enters `claimedVat` (`null` = not
  decided), as Plan 12 Ruling 6. Posting never decides input tax.
- Approvals: purchase orders, bills and trips use Plan 6's spine
  (`openRequest`, `decide`, `SubjectHandler`) with new `SubjectType`
  values `"purchase-order"`, `"bill"` and `"trip"`. None of them is
  added to Plan 13's `CHANNEL_APPROVABLE_SUBJECTS`.
- Supplier bank fields (IBAN, account name, bank name) are encrypted
  with the company DEK (AAD `"<companyId>:suppliers:bank:<id>"`),
  readable only through the MFA route and the payment file export,
  and never in list responses, audit rows, log lines or error bodies.
- Audit actions match `^[a-z]+(\.[a-z-]+)+$` and pass through
  `financeAudit` (Task 1), which refuses any key in
  `FINANCE_SENSITIVE_KEYS` at any depth.
- No DELETE route or grant; removal is a status (`void`, `cancelled`,
  `archived`).
- Roles use Plan 3 helpers: `PAYROLL` (owner, hr), `OWNER`,
  `ALL_ROLES`, and `MGR = ["owner","hr","manager"]` (Task 1).
- Migrations are numbered `1601_` to `1610_` (Plan 16's range; `1611`
  to `1619` stay free).
- Each task ends with `pnpm check` green and one commit. API tasks add
  one happy-path row per new route to `tests/conformance.test.ts` and
  their ids to the `tests/leak.test.ts` id map. Review: a fresh
  per-task review after Task 1 (bank secrets), Task 3 (money matching),
  Task 4 (payment files), Task 10 (partner port, card data); one
  whole-branch review at the end (speed ruling, 2026-11-26).

## Review Focus

1. Two bills against the same purchase order line submitted or
   approved at once, or a bill approved after another bill used the
   received quantity: billed quantity never exceeds received quantity
   without an exception on the later bill (Task 3
   `concurrent_bills_one_matches`).
2. One bill put into two batches, a batch exported twice, or a
   supplier's bank details changed after the batch was approved: a
   bill is in at most one live batch, a second export returns the same
   stored file, and a bank change after approval makes export refuse
   with 409 `SUPPLIER_BANK_CHANGED` (Task 4 `bill_in_one_live_batch`,
   `bank_change_after_approval_blocks_export`).
3. Two invoice drafts built from the same project at once, or a draft
   voided and rebuilt: each time entry and expense item is on at most
   one live invoice, and voiding a draft releases it (Task 7
   `concurrent_drafts_bill_once`).
4. The card feed delivers the same transaction twice, a pending
   transaction settles with a new amount, or a settled one is reversed:
   one row per partner transaction id, budgets count only the settled
   amount once, reversed transactions count zero (Task 10
   `card_feed_duplicate_and_reversal`).
5. An approved purchase order partly billed: its budget shows the open
   order amount as committed and the bill as actual, never both for the
   same fils, and crossing a threshold raises one alert, not one per
   request (Task 6 `po_bill_not_double_counted`,
   `alert_raised_once_per_threshold`).

## File Structure

```
packages/contract/src/routes-finance.ts      FINANCE_ROUTES
packages/contract/src/routes.ts              + ROUTE_GROUPS entry
packages/contract/src/finance/statements.ts  exact notes
packages/contract/src/finance/*.ts           schemas per area
packages/contract/src/approvals.ts           + 3 subject types
packages/contract/src/expenses.ts            + projectId, billable
packages/contract/src/tax/ledger.ts          + 2 VatDocumentSource
packages/api/migrations/1601_suppliers.sql ... 1610_accounting.sql
packages/api/src/finance/qty.ts              quantities, lineNet (pure)
packages/api/src/finance/audit.ts            financeAudit
packages/api/src/finance/suppliers/          F1
packages/api/src/finance/purchasing/         F2 orders, receipts
packages/api/src/finance/bills/              F3 match (pure), bills
packages/api/src/finance/payments/           F4 due, propose (pure),
                                             batches, exporter port
packages/api/src/finance/projects/           F5 clients, projects,
                                             rates, time
packages/api/src/finance/costs/              cost items, budgets (pure)
packages/api/src/finance/invoices/           F7 build (pure), html,
                                             issue, hand-off
packages/api/src/finance/trips/              F8 per diem (pure),
                                             trips, provider port
packages/api/src/finance/cards/              F9 issuer port, fake,
                                             sync, actions
packages/api/src/finance/accounting/         F10 model, adapter port
packages/api/src/finance/reports/            F10 spend reports
packages/api/src/routes/finance-*.ts         route files per area
HANDOVER.md, LEDGER.md                       updated in Task 12
```

---
### Task 1: Finance registry, settings, suppliers (F1)

Bank secrets task: fresh per-task review.

**Files:**
- Create: `packages/contract/src/routes-finance.ts`,
  `src/finance/statements.ts`, `src/finance/settings.ts`,
  `src/finance/suppliers.ts`, `src/finance/qty.ts`
- Modify: `packages/contract/src/routes.ts` (join `FINANCE_ROUTES`),
  `src/route-def.ts` (`binaryTypes`), `src/primitives.ts`
  (`SignedMoney` if absent), `src/approvals.ts` (three subject types),
  `src/errors.ts`, `src/examples.ts`, `src/openapi.ts`, `src/index.ts`,
  `tests/routes.test.ts`
- Create: `packages/api/migrations/1601_suppliers.sql`,
  `packages/api/src/finance/qty.ts` (pure), `src/finance/audit.ts`,
  `src/finance/settings.ts`, `src/finance/suppliers/suppliers.ts`,
  `src/finance/suppliers/bank.ts`, `src/routes/finance-setup.ts`
- Modify: `packages/api/src/db/migrate.ts` (only if it does not accept
  four-digit names yet), `src/app.ts`, `tests/helpers/seed.ts`
  (`seedFinance`), `tests/leak.test.ts`, `tests/conformance.test.ts`
- Test: `packages/contract/tests/routes-finance.test.ts`,
  `tests/finance-copy.test.ts`, `packages/api/tests/qty.test.ts`,
  `tests/finance-setup.test.ts`, `tests/suppliers.test.ts`

**Interfaces:**
- Consumes: Plan 3 `RouteDef`, `ten`, `PAYROLL`, `OWNER`,
  `ALL_ROLES`, `Id`, `IsoDate`, `Money`, `Timestamp`, `register`,
  `ReqCtx`, `ApiError`, `appendAudit`, `AuditInput`, `Keyring`,
  `parseAed`, `toMoney`, `seedCompany`, `call`; Plan 12 `Trn`,
  `Emirate`; Plan 2 IBAN check in `packages/wps/src/iban.ts` (export
  it as `isValidIban(s: string): boolean` if named otherwise).
- Produces (contract):
  - `routes.ts`: if `ROUTE_GROUPS` exists, append `FINANCE_ROUTES` as
    its last group; else create `ROUTE_GROUPS: readonly (readonly
    RouteDef[])[]` from the lists `ROUTES` spreads today, in that
    order, plus `FINANCE_ROUTES`, and set `ROUTES = ROUTE_GROUPS
    .flat()`. `MGR = ["owner","hr","manager"] as const` in
    `routes-finance.ts`.
  - `RouteDef.binaryTypes?: readonly string[]` (additive): the content
    types a `binary` route may return; OpenAPI lists them; absent means
    Plan 6's three receipt types.
  - `approvals.ts`: `SubjectType` gains `"purchase-order"`, `"bill"`,
    `"trip"` (append to whatever the enum holds).
  - `statements.ts`: `FINANCE_DEFAULTS_NOTE`, `PAYMENT_NOTE`,
    `CARD_NOTE`, `TRAVEL_NOTE`, `ACCOUNTING_EXPORT_NOTE`,
    `INVOICE_DOC_NOTE` (exact texts in Global Constraints) and
    `BANK_FORMAT_NOTE` = "No bank's upload format was read. A bank
    format can be added as an exporter once its specification is in
    hand." and `NOT_CONNECTED_NOTE` = "Not connected. This adapter slot
    has no partner connection yet."
  - `qty.ts`: `Qty = z.string().regex(/^\d{1,9}(\.\d{1,3})?$/)`.
  - `settings.ts`: `FINANCE_DEFAULTS = { priceToleranceBps: 0,
    priceToleranceFils: "0.00", qtyToleranceMilli: 0, agingBuckets:
    [30, 60, 90], budgetAlertBps: [8000, 10000], paymentHorizonDays:
    14, invoicePrefix: "INV-", poPrefix: "PO-" }`;
    `FinanceSettingsBody { priceToleranceBps: int 0..10000;
    priceToleranceFils: Money; qtyToleranceMilli: int 0..1000000;
    agingBuckets: int[] 1..6 strictly ascending 1..3650;
    budgetAlertBps: int[] 1..5 strictly ascending 1..20000;
    paymentHorizonDays: int 1..365; invoicePrefix:
    ^[A-Z0-9-]{1,10}$; poPrefix: ^[A-Z0-9-]{1,10}$ }`;
    `FinanceSettings = FinanceSettingsBody & { version: int >= 0;
    note: typeof FINANCE_DEFAULTS_NOTE }`; `FinanceSettingsUpdate =
    FinanceSettingsBody & { expectedVersion: int >= 0 }`.
  - `suppliers.ts`: `SupplierBody { name: 1..200; nameAr: 1..200 |
    null; trn: Trn | null; tradeLicenceNumber: 1..60 | null;
    paymentTermsDays: int 0..365; defaultCategoryId: Id | null;
    contactName: 1..120 | null; contactEmail: email | null;
    contactPhone: ^\+?[0-9 ]{6,20}$ | null; address: { line1: 1..200;
    city: 1..80; emirate: Emirate | null; country: ^[A-Z]{2}$ } |
    null }`; `SupplierUpdate` = partial plus `status?: "active" |
    "archived"`; `Supplier = SupplierBody & { id; status; hasBank:
    boolean; bankVersion: int >= 0; createdAt }` (no bank field);
    `SupplierBankBody { accountName: 1..120; bankName: 1..120; iban:
    ^AE\d{21}$ }`; `SupplierBank = SupplierBankBody & { version: int
    >= 1; updatedAt }`; `SupplierQuery { status?; q?: 1..60 }`.
  - Routes (8): `getFinanceSettings GET /v1/finance/settings`
    (PAYROLL), `putFinanceSettings PUT /v1/finance/settings` (OWNER,
    mfa), `listSuppliers GET /v1/suppliers` (MGR, `Supplier[]`),
    `createSupplier POST /v1/suppliers` (PAYROLL, 201), `getSupplier
    GET /v1/suppliers/{id}` (MGR), `updateSupplier PATCH
    /v1/suppliers/{id}` (PAYROLL), `putSupplierBank PUT
    /v1/suppliers/{id}/bank` (PAYROLL, mfa), `getSupplierBank GET
    /v1/suppliers/{id}/bank` (PAYROLL, mfa).
  - Error codes: `FINANCE_SETTINGS_VERSION_CONFLICT` 409,
    `SUPPLIER_DUPLICATE` 409, `SUPPLIER_ARCHIVED` 409,
    `IBAN_INVALID` 422, `NO_SUPPLIER_BANK` 404. `EXAMPLES` for
    `FinanceSettings`, `Supplier`, `SupplierBank`.
- Produces (api):
  - Migration 1601: `finance_settings(company_id pk, version, body
    jsonb, updated_by, updated_at)`; `suppliers(id, company_id, name,
    name_ar, trn, trade_licence_number, payment_terms_days,
    default_category_id, contact jsonb, address jsonb, status,
    bank_cipher text null, bank_version int default 0, created_by,
    created_at, updated_at)`; unique `(company_id, trn)` where `trn is
    not null and status = 'active'`; unique `(company_id, lower(name))`
    where `status = 'active'`. Grants select, insert, update.
  - `qty.ts` (pure): `parseQty(s: string): bigint` (thousandths;
    `"1.5"` gives `1500n`); `formatQty(milli: bigint): string` (no
    trailing zeros: `1500n` gives `"1.5"`, `2000n` gives `"2"`);
    `lineNet(qtyMilli: bigint, unitPrice: Fils): Fils` = HALF_UP of
    `qtyMilli * unitPrice / 1000n`; `minutesToQty(minutes: number):
    bigint` = HALF_UP of `minutes * 1000 / 60` (thousandths of an
    hour).
  - `audit.ts`: `FINANCE_SENSITIVE_KEYS = ["amount","net","vat",
    "total","iban","accountName","bankName","trn","name",
    "supplierName","clientName","merchant","last4","limit","rate",
    "note","description","fare","ticketNumber","reference"]`;
    `financeAudit(tx: Db, e: AuditInput): Promise<AuditEvent>` throws
    `ApiError(500, "AUDIT_SENSITIVE_DATA")` on any of them at any
    depth, then calls `appendAudit`.
  - `settings.ts`: `getFinanceSettings(tx, companyId):
    Promise<FinanceSettings>` (no row: version 0 and
    `FINANCE_DEFAULTS`); `putFinanceSettings(ctx, body)` (409
    `FINANCE_SETTINGS_VERSION_CONFLICT`; audit
    `finance-settings.updated` `data: { version }`);
    `settingsF(s): SettingsF` (the same with `Fils` and bigint).
  - `suppliers.ts`: list (`q` matches name, case-insensitive, prefix
    or contains), create, get, patch, `loadSupplier(tx, companyId,
    id): Promise<Supplier>` (404), `requireActiveSupplier` (409
    `SUPPLIER_ARCHIVED`). A unique violation gives 409
    `SUPPLIER_DUPLICATE` with `detail.field` `"trn"` or `"name"`.
    Audit `supplier.created`, `supplier.updated` (`changed` = field
    names).
  - `bank.ts`: `putSupplierBank(ctx, id, body)`: `isValidIban` false
    gives 422 `IBAN_INVALID`; stores `Keyring.encrypt(dek, aad,
    canonical JSON)`, increments `bank_version`; audit
    `supplier.bank-updated` `data: { supplierId, bankVersion }`.
    `getSupplierBank(ctx, id)` (404 `NO_SUPPLIER_BANK`; audit
    `supplier.bank-viewed`). `readSupplierBank(ctx, id):
    Promise<SupplierBankF & { version }>` for Task 4.

- [ ] **Step 1: Write the failing tests**

`routes-finance.test.ts`: `FINANCE_ROUTES.length === 8`; every id
unique across `ROUTES`; `ROUTES` deep-equals `ROUTE_GROUPS.flat()`;
`ROUTE_GROUPS` contains `FINANCE_ROUTES`; every finance path starts
with `/v1/`; `putFinanceSettings` has `mfa: true` and roles
`["owner"]`; both bank routes have `mfa: true`; no finance route has
`method` `"DELETE"`.

`finance-copy.test.ts`: each of the eight statements equals its exact
text; for every string reachable from the contract module namespace
(scan `Object.values`, recursing into arrays and plain objects) and
every `.ts` file under `packages/api/src/finance/` read as text, none
contains (case-insensitive) any banned phrase in Global Constraints;
no file under `src/finance/` contains `"5%"` or a decimal VAT literal
(`/0\.05\b/`).

`qty.test.ts`: `parseQty("1.5") === 1500n`; `parseQty("0.001") ===
1n`; `formatQty(1500n) === "1.5"`; `lineNet(1500n, 3333n) === 5000n`
(4999.5 rounds up); `lineNet(1n, 499n) === 0n` (0.499); `lineNet(1n,
500n) === 1n` (0.5); `minutesToQty(90) === 1500n`; `minutesToQty(1)
=== 17n` (16.67 rounds up); fast-check: `lineNet(q, p)` equals
`(q * p * 2n + 1000n) / 2000n` for q, p in `0n..10n**9n`.

`finance-setup.test.ts`: GET with no row gives version 0 and the
defaults with `note` equal to `FINANCE_DEFAULTS_NOTE`; PUT by hr gives
403 `FORBIDDEN`; owner without MFA 403 `MFA_REQUIRED`; owner with MFA
and `expectedVersion: 0` gives version 1; the same again 409
`FINANCE_SETTINGS_VERSION_CONFLICT`; `agingBuckets [60, 30]` gives
400 `VALIDATION_FAILED`.

`suppliers.test.ts`:
- `supplier_crud_and_duplicates`: create gives 201 with `hasBank:
  false`; a second active supplier with the same TRN gives 409
  `SUPPLIER_DUPLICATE` with `detail.field "trn"`; same name in other
  case gives `detail.field "name"`; after archiving the first, the
  same TRN is accepted.
- `bank_needs_mfa_and_valid_iban`: PUT bank without MFA 403; with an
  IBAN failing mod 97 gives 422 `IBAN_INVALID`; a valid one gives
  `version 1` and the supplier shows `hasBank: true`, `bankVersion 1`;
  GET bank returns the IBAN; the database column `bank_cipher` does
  not contain the IBAN digits.
- `bank_never_leaks` (manager role): `GET /v1/suppliers` and
  `GET /v1/suppliers/{id}` bodies contain neither the IBAN nor
  `"iban"`; `GET .../bank` gives 403; no audit row's `data` contains
  the IBAN; log lines captured by the test logger do not contain it.
- `finance_audit_refuses_sensitive`: `financeAudit` with `data: {
  iban: "x" }` and with `data: { nested: { amount: "1" } }` throws
  `AUDIT_SENSITIVE_DATA`.
- `other_company_cannot_read_supplier`: company B gets 404 for A's id.

- [ ] **Step 2: Run** `pnpm --filter @payroll/contract test` and
  `pnpm --filter @payroll/api test suppliers qty finance-setup`.
  Expected: FAIL, missing modules.
- [ ] **Step 3: Implement** the contract files, then `qty.ts`,
  `audit.ts`, settings, suppliers and bank, then the route file.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS (the RLS catalog
  test covers the two new tables).
- [ ] **Step 5: Commit** `feat(finance): registry, settings, suppliers`.

### Task 2: Purchase orders and goods receipts (F2)

**Files:**
- Create: `packages/contract/src/finance/purchasing.ts`,
  `packages/api/migrations/1602_purchasing.sql`,
  `packages/api/src/finance/purchasing/po-math.ts` (pure),
  `src/finance/purchasing/orders.ts`,
  `src/finance/purchasing/receipts.ts`,
  `src/finance/purchasing/subject.ts`,
  `src/routes/finance-purchasing.ts`
- Modify: contract `routes-finance.ts`, `errors.ts`, `examples.ts`,
  `index.ts`, `tests/routes-finance.test.ts`; api `src/app.ts` (add
  `purchaseOrderSubject` to the spine handlers),
  `tests/leak.test.ts`, `tests/conformance.test.ts`
- Test: `packages/api/tests/po-math.test.ts`,
  `tests/purchase-orders.test.ts`

**Interfaces:**
- Consumes: Task 1 `Qty`, `parseQty`, `formatQty`, `lineNet`,
  `loadSupplier`, `requireActiveSupplier`, `getFinanceSettings`,
  `financeAudit`, `MGR`; Plan 6 `openRequest`, `cancelRequest`,
  `viewFor`, `SubjectHandler`, `SubjectFacts` (with Plan 11's nullable
  `claimantEmployeeId`), expense categories (`expense_categories`);
  Plan 3 `loadEmployee`, `dubaiDate`. Task 6 adds the budget fact; in
  this task `overLimit` is `false`.
- Produces (contract):
  - `PoLineInput { description: 1..300; categoryId: Id; quantity: Qty
    (> 0, refined); unitPrice: Money; departmentId: Id | null;
    projectId: Id | null }`; `PoLine = PoLineInput & { id; lineNo: int
    >= 1; net: Money; receivedQty: Qty; billedQty: Qty }`.
  - `PoStatus = z.enum(["draft","submitted","returned","approved",
    "rejected","cancelled","closed"])`.
  - `PurchaseOrderCreate { supplierId: Id; requesterEmployeeId?: Id
    (PAYROLL only; others get their own employee); orderDate: IsoDate;
    expectedDate: IsoDate | null; vatEstimate: Money; note: max 500 |
    null; lines: PoLineInput[] 1..100 }`; `PurchaseOrderUpdate` =
    partial; `PurchaseOrder { id; number: string; supplierId;
    supplierName; requesterEmployeeId: Id | null; createdBy: Id;
    status: PoStatus; orderDate; expectedDate; vatEstimate; note;
    lines: PoLine[]; net: Money; openNet: Money; approval: ApprovalView
    | null; createdAt }`; `PoQuery { status?; supplierId?; from?;
    to? }`; `PoCancel { note: 3..500 }`.
  - `GoodsReceiptCreate { receivedDate: IsoDate; note: max 500 | null;
    lines: { poLineId: Id; quantity: Qty (> 0) }[] 1..100 }`;
    `GoodsReceipt { id; poId; receivedDate; receivedBy: Id; note;
    lines: { poLineId; quantity: Qty }[]; createdAt }`.
  - Routes (9): `listPurchaseOrders GET /v1/purchase-orders` (MGR),
    `createPurchaseOrder POST /v1/purchase-orders` (MGR, 201),
    `getPurchaseOrder GET /v1/purchase-orders/{id}` (MGR),
    `updatePurchaseOrder PATCH /v1/purchase-orders/{id}` (MGR),
    `submitPurchaseOrder POST /v1/purchase-orders/{id}/submit` (MGR),
    `cancelPurchaseOrder POST /v1/purchase-orders/{id}/cancel` (MGR),
    `closePurchaseOrder POST /v1/purchase-orders/{id}/close` (PAYROLL),
    `recordGoodsReceipt POST /v1/purchase-orders/{id}/receipts` (MGR,
    201), `listGoodsReceipts GET /v1/purchase-orders/{id}/receipts`
    (MGR).
  - Error codes: `PO_NOT_EDITABLE` 409, `PO_NOT_OPEN` 409,
    `PO_PROBLEMS` 422 (detail `problems`: `"lines.<n>:<CODE>"` with
    `CATEGORY_NOT_FOUND`, `CATEGORY_NOT_RECEIPT_KIND`,
    `DEPARTMENT_NOT_FOUND`, `PROJECT_NOT_FOUND`),
    `RECEIPT_OVER_ORDERED` 422 (detail `lines: int[]`),
    `PO_HAS_BILLS` 409.
- Produces (api):
  - Migration 1602: `purchase_orders(id, company_id, number, supplier_id,
    requester_employee_id, created_by, status, order_date,
    expected_date, vat_estimate bigint, note, approval_id, created_at,
    updated_at)`, unique `(company_id, number)`; `po_lines(id,
    company_id, po_id, line_no, description, category_id,
    quantity_milli bigint, unit_price bigint, net bigint,
    department_id, project_id)`; `goods_receipts(id, company_id, po_id,
    received_date, received_by, note, created_at)`;
    `goods_receipt_lines(company_id, receipt_id, po_line_id,
    quantity_milli bigint)`; `finance_sequences(company_id, kind,
    year int, next int, pk (company_id, kind, year))`. Grants select,
    insert, update. `project_id` has no foreign key until Task 5 adds
    it.
  - `po-math.ts` (pure): `poLineNet(l): Fils` = `lineNet`;
    `openNet(lines: { net: Fils; quantityMilli: bigint;
    billedMilli: bigint; unitPrice: Fils }[]): Fils` = sum over lines
    of `max(0, net - lineNet(billedMilli, unitPrice))`;
    `receiptProblems(lines: { poLineId; quantityMilli }[], ordered:
    ReadonlyMap<string, { orderedMilli: bigint; receivedMilli: bigint
    }>, toleranceMilli: bigint): number[]` (indexes where received +
    new > ordered + tolerance, or an unknown line).
  - `nextNumber(tx, companyId, kind: "po" | "invoice", year: number,
    prefix: string): Promise<string>`: `INSERT ... ON CONFLICT DO
    UPDATE SET next = next + 1 RETURNING`, formatted
    `<prefix><year>-<n padded to 5>` (`PO-2026-00001`); used by Task
    7 too.
  - `orders.ts`: create (a manager is the requester through the
    caller's linked employee; owner and hr may name one or leave it
    `null`; a manager naming another gives 403; number allocated at
    create; status `draft`; save-time checks give 422 `PO_PROBLEMS`),
    patch (creator or PAYROLL; status `draft` or `returned`, else 409
    `PO_NOT_EDITABLE`), `submitPurchaseOrder(ctx, handlers, id)` (same
    checks; `openRequest(ctx, handlers, "purchase-order", id, user)`;
    status `submitted`), cancel (creator or PAYROLL for `draft`,
    `returned`, `submitted`; PAYROLL for `approved` with no bill line
    on it, else 409 `PO_HAS_BILLS`), close (PAYROLL; `approved` only,
    else 409 `PO_NOT_OPEN`), list and get (managers see orders they
    created or requested; PAYROLL all; else 404). `toPoView(row,
    lines, receivedByLine, billedByLine, approval)` is the only
    serialiser; `billedQty` comes from bill lines of bills in
    `submitted`, `approved`, `scheduled`, `paid` (Task 3 table; zero
    until then). Audit `purchase-order.created`, `.updated`,
    `.submitted`, `.cancelled`, `.closed` (`data: { poId, lineCount
    }`).
  - `purchaseOrderSubject: SubjectHandler`: `facts`: claimant =
    requester (nullable), line manager of the requester, `total =
    net + vatEstimate`, `overLimit: false` (Task 6 replaces),
    summary title `"<number> <supplier>"` with `employeeName` the
    requester's name or `"-"`; `canView` as get; `onClosed` sets
    `approved`, `rejected` or `returned`. Audit
    `purchase-order.approved`, `.rejected`, `.returned`.
  - `receipts.ts`: `recordGoodsReceipt(ctx, poId, body)`: PO must be
    `approved` (409 `PO_NOT_OPEN`); locks the PO row `FOR UPDATE`;
    `receiptProblems` non-empty gives 422 `RECEIPT_OVER_ORDERED`;
    audit `goods-receipt.recorded` (`data: { poId, lineCount }`).

- [ ] **Step 1: Write the failing tests**

`po-math.test.ts`: two lines `qty 2 x 1000.00` and `qty 1.5 x
333.33`: nets `200000n` and `50000n` (49999.5 rounds up), total
`250000n`; `openNet` with `billedMilli 1000n` on line 1 is `150000n`;
billed beyond ordered never makes `openNet` negative;
`receiptProblems` ordered 2, received 1.5, new 0.5 gives `[]`; new
0.501 gives `[0]`; with tolerance 1 (milli) gives `[]`; an unknown
`poLineId` gives its index.

`purchase-orders.test.ts` (`seedCompany`, `seedFinance` with supplier
S, category C of kind `receipt`, manager M over employee E, owners O
and O2, hr H):
- `po_number_sequence`: two creates in 2026 give `PO-2026-00001` and
  `PO-2026-00002`; created concurrently with `Promise.all`, the two
  numbers differ.
- `po_problems_listed`: a line with a `mileage` category gives 422
  `PO_PROBLEMS` with `"lines.0:CATEGORY_NOT_RECEIPT_KIND"`; an unknown
  department gives `"lines.1:DEPARTMENT_NOT_FOUND"` in the same body.
- `po_approval_via_spine`: M (line manager O2) creates and submits a
  PO: `requesterEmployeeId` is M's employee; O2's inbox shows it with
  `subjectType "purchase-order"`; O2 approves; the PO is `approved`
  and `openNet` equals `net`.
- `po_requester_cannot_approve`: M creates and submits a PO for
  himself with chain `role owner`: M deciding gives 403
  `SOD_VIOLATION`.
- `receipt_over_ordered_refused`: ordered 2; receipt 1.5 then 0.6
  gives 422 `RECEIPT_OVER_ORDERED` with `lines [0]`; then 0.5 passes
  and `receivedQty` shows `"2"`.
- `receipt_needs_approved_po`: a receipt on a `draft` PO gives 409
  `PO_NOT_OPEN`.
- `manager_sees_own_orders_only`: a second manager gets 404 on M's PO
  and does not see it in the list.
- `employee_role_blocked`: an `employee` role gets 403 on
  `POST /v1/purchase-orders`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test po-math
  purchase-orders`. Expected: FAIL.
- [ ] **Step 3: Implement** `po-math.ts`, then `nextNumber`, orders,
  subject, receipts and routes.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS;
  `FINANCE_ROUTES.length === 17`.
- [ ] **Step 5: Commit** `feat(finance): purchase orders and receipts`.

### Task 3: Bills, three-way match, approval, VAT posting (F3)

Money task: fresh per-task review.

**Files:**
- Create: `packages/contract/src/finance/bills.ts`,
  `packages/api/migrations/1603_bills.sql`,
  `packages/api/src/finance/bills/match.ts` (pure),
  `src/finance/bills/due.ts` (pure), `src/finance/bills/bills.ts`,
  `src/finance/bills/submit.ts`, `src/finance/bills/subject.ts`,
  `src/finance/bills/vat-post.ts`, `src/routes/finance-bills.ts`
- Modify: contract `routes-finance.ts`, `src/tax/ledger.ts` (Plan 12:
  `VatDocumentSource` gains `"ap-bill"` and `"project-invoice"`),
  `errors.ts`, `examples.ts`, `index.ts`,
  `tests/routes-finance.test.ts`; api `src/app.ts` (add
  `billSubject`), `src/finance/purchasing/orders.ts` (`billedQty`,
  cancel check), `tests/leak.test.ts`, `tests/conformance.test.ts`
- Test: `packages/api/tests/bill-match.test.ts`, `tests/bills.test.ts`,
  `tests/bill-vat-post.test.ts`

**Interfaces:**
- Consumes: Task 1 `lineNet`, `parseQty`, `loadSupplier`,
  `requireActiveSupplier`, `getFinanceSettings`, `settingsF`,
  `financeAudit`; Task 2 PO tables, `toPoView`; Plan 6 `openRequest`,
  `cancelRequest`, `SubjectHandler`; Plan 7 `claimFile(ctx, fileId,
  attachTo)`; Plan 12 `Trn`, `Emirate`, `insertVatDocument`,
  `assertPeriodOpen`, `loadTaxCategory`.
- Produces (contract):
  - `BillLineInput { poLineId: Id | null; description: 1..300;
    categoryId: Id; quantity: Qty (> 0); unitPrice: Money;
    departmentId: Id | null; projectId: Id | null }`; `BillLine =
    BillLineInput & { id; lineNo; net: Money; matchCodes: MatchCode[]
    }`.
  - `MatchCode = z.enum(["NO_RECEIPT","QTY_OVER_RECEIVED",
    "PRICE_OVER_TOLERANCE","LINE_NOT_ON_PO","PO_LINE_OTHER_PO",
    "PO_NOT_OPEN","SUPPLIER_MISMATCH"])`; `MatchStatus =
    z.enum(["matched","exception","no-po"])`; `BillMatch { status:
    MatchStatus; codes: MatchCode[]; checkedAt: Timestamp | null }`.
  - `BillStatus = z.enum(["draft","submitted","returned","approved",
    "rejected","scheduled","paid","void"])`.
  - `BillCreate { supplierId: Id; poId: Id | null; billNumber: 1..60;
    billDate: IsoDate; taxDate?: IsoDate; dueDate?: IsoDate; vat:
    Money; claimedVat: Money | null; taxCategoryId: Id | null;
    emirate: Emirate | null; originalCurrency?: ^[A-Z]{3}$;
    originalAmount?: ^\d{1,12}(\.\d{1,3})?$; attachmentFileIds: Id[]
    0..10; lines: BillLineInput[] 1..100 }` refined: `claimedVat <=
    vat` (path `["claimedVat"]`); `dueDate >= billDate`.
  - `BillUpdate` = partial of `BillCreate` without `supplierId`;
    `BillVoid { note: 3..500 }`; `BillQuery { status?; supplierId?;
    dueFrom?; dueTo?; match?: MatchStatus }`.
  - `Bill { id; supplierId; supplierName; poId; poNumber: string |
    null; billNumber; billDate; taxDate; dueDate; lines: BillLine[];
    net: Money; vat: Money; total: Money; claimedVat; taxCategoryId;
    emirate; originalCurrency: string | null; originalAmount: string |
    null; attachmentFileIds; status: BillStatus; match: BillMatch;
    approval: ApprovalView | null; vatDocumentId: Id | null;
    paymentBatchId: Id | null; paidOn: IsoDate | null;
    paymentReference: string | null; createdAt; note: typeof
    PAYMENT_NOTE }`.
  - `BillVatPostRequest { from: IsoDate; to: IsoDate }` (at most 366
    days, refined); `BillVatPostResult { created: int; existing: int;
    skipped: { billId: Id; reason: "no-tax-category" |
    "period-filed" | "already-in-ledger" | "ledger-problems" }[] }`.
  - Routes (7): `listBills GET /v1/bills` (PAYROLL), `createBill POST
    /v1/bills` (PAYROLL, 201), `getBill GET /v1/bills/{id}`
    (PAYROLL), `updateBill PATCH /v1/bills/{id}` (PAYROLL),
    `submitBill POST /v1/bills/{id}/submit` (PAYROLL), `voidBill POST
    /v1/bills/{id}/void` (PAYROLL), `postBillsToVat POST
    /v1/bills/vat-post` (PAYROLL).
  - Error codes: `BILL_DUPLICATE` 409, `BILL_NOT_EDITABLE` 409,
    `BILL_NOT_VOIDABLE` 409, `BILL_IN_VAT_LEDGER` 409,
    `BILL_PROBLEMS` 422 (detail `problems`: `"bill:VAT_EXCEEDS_NET"`,
    `"bill:PO_REQUIRED_FOR_PO_LINES"`, `"lines.<n>:<CODE>"` with
    `CATEGORY_NOT_FOUND`, `CATEGORY_NOT_RECEIPT_KIND`,
    `DEPARTMENT_NOT_FOUND`, `PROJECT_NOT_FOUND`).
- Produces (api):
  - Migration 1603: `bills(id, company_id, supplier_id, po_id,
    bill_number, bill_date, tax_date, due_date, net bigint, vat bigint,
    claimed_vat bigint null, tax_category_id, emirate,
    original_currency, original_amount, status, match_status,
    match_codes text[], match_checked_at, approval_id,
    vat_document_id, payment_batch_id, paid_on, payment_reference,
    void_note, created_by, created_at, updated_at)`; unique
    `(company_id, supplier_id, lower(bill_number))` where `status <>
    'void'`; index `(company_id, status, due_date)`; `bill_lines(id,
    company_id, bill_id, line_no, po_line_id, description, category_id,
    quantity_milli bigint, unit_price bigint, net bigint,
    department_id, project_id, match_codes text[])`;
    `bill_attachments(company_id, bill_id, file_id)`. Grants select,
    insert, update.
  - `due.ts` (pure): `dueDateFor(billDate: string, termsDays: number):
    string` (calendar days, no weekend roll; Ruling 9).
  - `match.ts` (pure):

    ```ts
    interface MatchLine { index: number; poLineId: string | null;
      qtyMilli: bigint; unitPrice: Fils }
    interface PoLineFacts { poId: string; orderedMilli: bigint;
      unitPrice: Fils; receivedMilli: bigint;
      billedElsewhereMilli: bigint }
    interface MatchInput { billSupplierId: string;
      po: { id: string; supplierId: string; status: string } | null;
      lines: MatchLine[];
      poLines: ReadonlyMap<string, PoLineFacts>;
      tolerance: { priceBps: number; priceFils: Fils;
        qtyMilli: bigint } }
    matchBill(i: MatchInput): { status: MatchStatus;
      codes: MatchCode[]; lineCodes: MatchCode[][] }
    ```

    Rules: `po` null and every `poLineId` null gives `no-po` with no
    codes. With a PO: header codes `SUPPLIER_MISMATCH` (supplier
    differs) and `PO_NOT_OPEN` (status not `approved`). Per line, in
    order: `poLineId` null gives `LINE_NOT_ON_PO`; a line of another
    PO gives `PO_LINE_OTHER_PO`; `receivedMilli = 0` gives
    `NO_RECEIPT`; `qtyMilli > receivedMilli - billedElsewhereMilli +
    tolerance.qtyMilli` gives `QTY_OVER_RECEIVED`; `unitPrice >
    po.unitPrice + max(po.unitPrice * priceBps / 10000 rounded down,
    priceFils)` gives `PRICE_OVER_TOLERANCE` (a lower price never
    flags). `codes` is the de-duplicated union in enum order; status
    `exception` when `codes` is not empty, else `matched`.
  - `bills.ts`: create (supplier active; `dueDate` defaults to
    `dueDateFor(billDate, supplier.paymentTermsDays)`; `taxDate`
    defaults to `billDate`; nets by `lineNet`; problems give 422
    `BILL_PROBLEMS`; each attachment through `claimFile(ctx, fileId,
    "bill:<id>")`; a unique violation gives 409 `BILL_DUPLICATE`;
    status `draft`), patch (`draft` or `returned`, else 409
    `BILL_NOT_EDITABLE`), get, list, `toBillView` (the only
    serialiser). Void: `draft`, `returned`, `rejected`, `submitted`
    (closes the request with `cancelRequest`) or `approved` without a
    batch; a bill whose `vat_document_id` points at an active VAT
    document gives 409 `BILL_IN_VAT_LEDGER`; otherwise 409
    `BILL_NOT_VOIDABLE`. Audit `bill.created`, `bill.updated`
    (`changed`), `bill.voided` (`data: { billId }`).
  - `submit.ts`: `submitBill(ctx, handlers, id)`: locks the PO row
    `FOR UPDATE` when `po_id` is set (serialises every bill on one
    PO); builds `PoLineFacts` where `billedElsewhereMilli` sums lines
    of the company's other bills in `submitted`, `approved`,
    `scheduled`, `paid` on that PO line; `matchBill`; stores the match
    on the bill and lines; `openRequest(ctx, handlers, "bill", id,
    user)`; status `submitted`. Audit `bill.submitted` (`data: {
    billId, matchStatus, codeCount }`).
  - `billSubject: SubjectHandler`: claimant `null`, line manager
    `null`, `total = net + vat`, `overLimit = match_status ===
    "exception"` (adds the over-limit tier, Plan 6 rule 2; Task 6 adds
    the budget fact with OR), summary title `"<billNumber>
    <supplier>"`, `employeeName "-"`, `flagCodes` = match codes;
    `onClosed` sets `approved`, `rejected` or `returned`. Audit
    `bill.approved`, `.rejected`, `.returned`.
  - `vat-post.ts`: `postBillsToVat(ctx, req)`: bills in `approved`,
    `scheduled`, `paid` with `tax_date` in range and `vat_document_id`
    null, oldest first. Every skip is decided by a read before any
    insert, so no insert can fail a unique index inside the request
    transaction: no `tax_category_id` gives `no-tax-category`;
    `assertPeriodOpen` throwing `PERIOD_FILED` (caught; it is a read)
    gives `period-filed`; an active VAT document with source `ap-bill`
    and this `source_ref`, or an active purchase with the same
    lower-cased supplier name, TRN and number, gives
    `already-in-ledger` (and links the first case's id, counted in
    `existing`); `checkVatDocument` problems give `ledger-problems`.
    Else `insertVatDocument(ctx, { direction: "purchase", kind:
    "tax-invoice", documentNumber: billNumber, issueDate: billDate,
    taxDate, counterpartyName: supplier name, counterpartyTrn:
    supplier TRN, categoryId: taxCategoryId, emirate, net, vat,
    claimedVat, originalCurrency }, "ap-bill", billId)` and store the
    id. Audit `bill.vat-posted` (`data: { created, existing, skipped
    }`, counts only).

- [ ] **Step 1: Write the failing tests**

`bill-match.test.ts` (pure; PO line L1 ordered 10 at 100.00, PO
approved, same supplier, tolerance zero unless stated):
- `matched_when_received`: received 10, bill 4 at 100.00: `matched`.
- `qty_over_received`: received 3, bill 4: `QTY_OVER_RECEIVED`;
  received 10, billed elsewhere 7, bill 4: `QTY_OVER_RECEIVED`; bill
  3: `matched`.
- `no_receipt`: received 0: `["NO_RECEIPT"]` and not
  `QTY_OVER_RECEIVED` (first failing rule only per line).
- `price_tolerance`: bill price 101.00: `PRICE_OVER_TOLERANCE`; with
  `priceBps 100` (1%): `matched`; with `priceFils 50n` and bps 0:
  `PRICE_OVER_TOLERANCE`; price 99.00: `matched`.
- `header_codes`: supplier differs gives `SUPPLIER_MISMATCH`; PO
  `closed` gives `PO_NOT_OPEN`; both together list both in enum order.
- `no_po`: `po` null, lines without `poLineId`: `no-po`, no codes.
- fast-check: `codes` is always the sorted union of `lineCodes` plus
  header codes, and `status` is `exception` exactly when `codes` is
  non-empty.

`bills.test.ts` (seed as Task 2 plus an approved PO with L1 ordered 10
at 100.00 and a receipt of 10):
- `bill_default_due_date`: supplier terms 30, bill date 2026-11-26:
  `dueDate "2026-12-26"`.
- `bill_duplicate_number`: same supplier and `"inv-7"` vs `"INV-7"`
  gives 409 `BILL_DUPLICATE`; after voiding the first, accepted.
- `bill_vat_exceeds_net`: net 100.00, vat 100.01 gives 422
  `BILL_PROBLEMS` with `"bill:VAT_EXCEEDS_NET"`.
- `matched_bill_one_step`: a matched bill with chain `role owner`
  resolves one step; approved by O: status `approved`.
- `exception_bill_adds_owner_tier`: chain `role hr`, bill at 120.00
  unit price: match `exception` with `PRICE_OVER_TOLERANCE`; the
  approval has steps `[role hr, role owner]`.
- `concurrent_bills_one_matches` (Review Focus 1): two bills of qty 6
  each on L1 (received 10) submitted with `Promise.all`: exactly one
  is `matched` and the other `exception` with `QTY_OVER_RECEIVED`;
  voiding the matched one and resubmitting the other (after return)
  gives `matched`.
- `returned_bill_releases_reservation`: bill A qty 6 submitted then
  returned; bill B qty 6 submits as `matched`.
- `attachment_claimed_once`: one file id on two bills: the second
  gives 409 `FILE_NOT_AVAILABLE`.
- `bill_po_cancel_blocked`: cancelling a PO with a submitted bill
  gives 409 `PO_HAS_BILLS`.

`bill-vat-post.test.ts` (`seedVat` from Plan 12 with a purchase tax
category T):
- `post_creates_ledger_documents`: two approved bills with T: result
  `created 2`; each bill shows `vatDocumentId`; the VAT documents have
  `source "ap-bill"`, `claimedVat` equal to the bill's (or null).
- `post_twice_once` (idempotent): a second post gives `created 0`,
  `existing 0` and no new row (already linked bills are not
  selected); with a bill whose link was cleared by hand in the test,
  `existing 1` and the same document id.
- `post_skips_with_reasons`: a bill without a tax category gives
  `no-tax-category`; a bill dated in a period marked filed (Plan 12
  helper) gives `period-filed`; the other bills still post in the
  same call.
- `void_blocked_when_in_ledger`: voiding a posted bill gives 409
  `BILL_IN_VAT_LEDGER`; after voiding the VAT document in Plan 12,
  the bill voids.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test bill`.
  Expected: FAIL.
- [ ] **Step 3: Implement** `match.ts` and `due.ts` first, then bills,
  submit, subject, VAT posting and routes.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS;
  `FINANCE_ROUTES.length === 24`.
- [ ] **Step 5: Commit** `feat(finance): bills and three-way match`.

### Task 4: Due calendar, payment proposals, batches, export files (F4)

Payment files task: fresh per-task review.

**Files:**
- Create: `packages/contract/src/finance/payments.ts`,
  `packages/api/migrations/1604_payments.sql`,
  `packages/api/src/finance/payments/calendar.ts` (pure),
  `src/finance/payments/propose.ts` (pure),
  `src/finance/payments/exporter.ts` (port and the own-layout CSV
  exporter), `src/finance/payments/batches.ts`,
  `src/finance/payments/export.ts`, `src/routes/finance-payments.ts`
- Modify: `packages/api/src/deps.ts` (`bankExporters`), Plan 7
  `src/storage/fs-blob.ts` (key pattern adds `payment-files`),
  `src/finance/purchasing/orders.ts` (`nextNumber` kind `"batch"`),
  contract `routes-finance.ts`, `errors.ts`, `examples.ts`,
  `index.ts`, `tests/routes-finance.test.ts`; api `src/app.ts`,
  `tests/leak.test.ts`, `tests/conformance.test.ts`
- Test: `packages/api/tests/payables-calendar.test.ts`,
  `tests/payment-propose.test.ts`, `tests/payment-batches.test.ts`

**Interfaces:**
- Consumes: Task 1 `readSupplierBank`, `financeAudit`,
  `getFinanceSettings`; Task 2 `nextNumber`; Task 3 bill tables and
  `toBillView`; Plan 6 `toCsv` (with Plan 11's two additions),
  `BlobStore`; Plan 7 `Keyring.encryptBytes`, `decryptBytes`,
  `contentDisposition`; Plan 3 `dubaiDate`, company legal name.
- Produces (contract):
  - `CalendarQuery { from: IsoDate; to: IsoDate }` (at most 366 days);
    `CalendarDay { date; weekend: boolean; bills: { billId;
    supplierName; billNumber; total: Money; status: "approved" |
    "scheduled" }[]; total: Money }`; `PayablesCalendar { asOf:
    IsoDate; overdue: CalendarDay["bills"]; overdueTotal: Money; days:
    CalendarDay[]; pendingApprovalTotal: Money; note: typeof
    PAYMENT_NOTE }`.
  - `ProposalRequest { payOn: IsoDate; horizonDays?: int 1..365; cap:
    Money | null; supplierIds?: Id[] 0..200 }`; `Proposal { payOn;
    dueBy: IsoDate; billIds: Id[]; total: Money; skipped: { billId;
    reason: "no-bank" | "over-cap" }[]; note: typeof PAYMENT_NOTE }`.
  - `BatchStatus = z.enum(["draft","approved","exported","paid",
    "cancelled"])`; `PaymentBatchCreate { payOn: IsoDate; billIds:
    Id[] 1..500 (unique) }`; `PaymentBatch { id; number; payOn;
    status: BatchStatus; items: { billId; supplierId; supplierName;
    billNumber; amount: Money; outcome: "pending" | "paid" | "unpaid"
    }[]; total: Money; createdBy: Id; approvedBy: Id | null; files: {
    id; exporter: string; fileName; createdAt }[]; paidOn: IsoDate |
    null; note: typeof PAYMENT_NOTE }`; `BatchExportRequest {
    exporter: 1..60 }`; `BatchMarkPaid { paidOn: IsoDate; reference:
    1..100; unpaidBillIds: Id[] 0..500 }`; `BankExporterView { id;
    label; formatStatus: "own-layout" | "unsourced"; note: typeof
    BANK_FORMAT_NOTE }`.
  - Routes (11): `getPayablesCalendar GET /v1/payables/calendar`
    (PAYROLL), `proposePayments POST /v1/payment-batches/propose`
    (PAYROLL, 200, stores nothing), `createPaymentBatch POST
    /v1/payment-batches` (PAYROLL, 201), `listPaymentBatches GET
    /v1/payment-batches` (PAYROLL), `getPaymentBatch GET
    /v1/payment-batches/{id}` (PAYROLL), `approvePaymentBatch POST
    /v1/payment-batches/{id}/approve` (OWNER, mfa),
    `cancelPaymentBatch POST /v1/payment-batches/{id}/cancel`
    (PAYROLL), `exportPaymentBatch POST /v1/payment-batches/{id}/export`
    (PAYROLL, mfa), `downloadPaymentFile GET
    /v1/payment-files/{id}/download` (PAYROLL, mfa, `binary`,
    `binaryTypes ["text/csv"]`), `markBatchPaid POST
    /v1/payment-batches/{id}/mark-paid` (OWNER, mfa),
    `listBankExporters GET /v1/bank-exporters` (PAYROLL).
  - Error codes: `BATCH_PROBLEMS` 422 (detail `problems`:
    `"bills.<n>:<CODE>"` with `BILL_NOT_APPROVED`,
    `BILL_IN_OTHER_BATCH`, `SUPPLIER_NO_BANK`), `BATCH_NOT_DRAFT` 409,
    `BATCH_NOT_APPROVED` 409, `BATCH_NOT_EXPORTED` 409,
    `BATCH_NOT_CANCELLABLE` 409, `SUPPLIER_BANK_CHANGED` 409 (detail
    `supplierIds`), `EXPORTER_UNKNOWN` 422, `UNPAID_NOT_IN_BATCH` 422.
- Produces (api):
  - Migration 1604: `payment_batches(id, company_id, number, pay_on,
    status, total bigint, created_by, approved_by, approved_at,
    bank_versions jsonb, paid_on, created_at)`;
    `payment_batch_items(company_id, batch_id, bill_id, supplier_id,
    amount bigint, outcome, live boolean)`, unique `(company_id,
    bill_id)` where `live`; `payment_files(id, company_id, batch_id,
    exporter, file_name, content_type, sha256, blob_key, created_by,
    created_at)`, unique `(company_id, batch_id, exporter)`. Grants
    select, insert, update.
  - `calendar.ts` (pure): `payablesCalendar(bills: { id; supplierName;
    billNumber; total: Fils; dueDate: string; status: string }[],
    asOf: string, from: string, to: string): CalendarF` (`approved`
    and `scheduled` bills with `dueDate < asOf` go to `overdue`; the
    rest by date within `from..to`; `submitted` bills only add to
    `pendingApprovalTotal`; `weekend` true for Saturday and Sunday,
    computed from the ISO date without `Date` of the host zone, by
    Zeller's congruence or an epoch-day count).
  - `propose.ts` (pure): `proposePayments(bills: { id; supplierId;
    dueDate: string; total: Fils; hasBank: boolean }[], payOn: string,
    horizonDays: number, cap: Fils | null): ProposalF`: eligible =
    every given bill with `dueDate <= payOn + horizonDays`; order by
    `dueDate`, then `total` descending, then `id`; a bill without bank
    is skipped `no-bank`; with a cap, a bill that would take the
    running total above it is skipped `over-cap` and later smaller
    bills are still tried. The caller passes only `approved` bills
    with no batch.
  - `exporter.ts`:

    ```ts
    interface PaymentInstruction { billId: string; billNumber: string;
      supplierName: string; accountName: string; bankName: string;
      iban: string; amount: Fils }
    interface PaymentFileInput { batchNumber: string; payOn: string;
      payerName: string; instructions: PaymentInstruction[];
      total: Fils }
    interface BankFileExporter {
      readonly id: string;
      readonly label: string;
      readonly formatStatus: "own-layout" | "unsourced";
      export(i: PaymentFileInput): { fileName: string;
        contentType: string; bytes: Uint8Array };
    }
    ```

    `paymentListCsv: BankFileExporter` (id `"payment-list-csv"`,
    label "Payment list (CSV, this product's layout)", `own-layout`):
    `toCsv(PAYMENT_NOTE, ["pay_on","batch","supplier","account_name",
    "bank_name","iban","amount_aed","bill_number","bill_id"], rows)`
    encoded UTF-8, file name `<batchNumber>-payment-list.csv`. No
    bank-specific exporter ships (Ruling 10). `AppDeps.bankExporters:
    readonly BankFileExporter[]`, default `[paymentListCsv]`.
  - `batches.ts`: create (locks the bills `FOR UPDATE`; each must be
    `approved` with no live item and its supplier must have bank
    details, else 422 `BATCH_PROBLEMS`; amount = bill `net + vat`;
    bills become `scheduled` with `payment_batch_id`; number via
    `nextNumber(tx, companyId, "batch", year, "PAY-")`); approve
    (OWNER with MFA; `draft` only, else 409 `BATCH_NOT_DRAFT`; the
    approver must not be the creator, else 403 `SOD_VIOLATION`;
    stores each supplier's `bank_version` in `bank_versions`); cancel
    (`draft`, `approved` or `exported`, else 409
    `BATCH_NOT_CANCELLABLE`; items `live false`, bills back to
    `approved` with no batch); mark paid (OWNER with MFA; `exported`
    only, else 409 `BATCH_NOT_EXPORTED`; each id in `unpaidBillIds`
    must be in the batch, else 422 `UNPAID_NOT_IN_BATCH`; those items
    get outcome `unpaid`, `live false`, bills back to `approved`; the
    rest get `paid`, the bills `paid` with `paid_on` and
    `payment_reference`; batch `paid`). Audit `payment-batch.created`,
    `.approved`, `.cancelled`, `.marked-paid` (`data: { batchId,
    billCount, unpaidCount }`).
  - `export.ts`: `exportBatch(ctx, id, exporterId)`: status `approved`
    or `exported` (else 409 `BATCH_NOT_APPROVED`); unknown id 422
    `EXPORTER_UNKNOWN`; an existing file for `(batch, exporter)` is
    returned as it is (no new bytes); else every supplier's current
    `bank_version` must equal the stored one (else 409
    `SUPPLIER_BANK_CHANGED` with `detail.supplierIds`); reads bank
    details with `readSupplierBank`; calls `export`; stores the bytes
    encrypted under `"<companyId>/payment-files/<fileId>"` (AAD
    `"<companyId>:payment-files:content:<fileId>"`); batch `exported`.
    Download: decrypts, checks sha256, sends with
    `contentDisposition`. Audit `payment-file.created` and
    `payment-file.downloaded` (`data: { batchId, fileId, exporter }`).

- [ ] **Step 1: Write the failing tests**

`payables-calendar.test.ts` (pure): asOf `2026-11-26`; a bill due
`2026-11-20` approved goes to `overdue`; a bill due `2026-11-28`
lands on a day with `weekend: true` (a Saturday); `2026-11-30` has
`weekend: false`; a `submitted` bill adds to `pendingApprovalTotal`
only; `draft` and `paid` bills appear nowhere; totals equal the sum
of their bills.

`payment-propose.test.ts` (pure): bills A due 11-27 total 500.00, B
due 11-28 total 300.00, C due 12-30 total 100.00, D due 11-27 no
bank: payOn `2026-11-26`, horizon 14, no cap: `billIds [A, B]`,
skipped `[{ D, "no-bank" }]`, C not listed; cap 600.00: `[A]` and B
skipped `over-cap`; cap 800.00: `[A, B]`; with a bill E due 11-29 of
100.00 and cap 600.00: `[A, E]` (B skipped, E still fits).

`payment-batches.test.ts` (two approved bills X and Y from supplier
S with bank details; owners O and O2):
- `batch_lifecycle`: H creates (bills `scheduled`), O approves with
  MFA, H exports `payment-list-csv`: the batch is `exported`; the
  download's first line is `PAYMENT_NOTE`, the header line is
  `pay_on,batch,supplier,account_name,bank_name,iban,amount_aed,
  bill_number,bill_id` (one line in the file), the rows carry the IBAN
  and amounts; O marks paid with Y in `unpaidBillIds`: X is `paid`
  with the reference, Y is `approved` with no batch.
- `bill_in_one_live_batch` (Review Focus 2): creating a second batch
  with X gives 422 `BATCH_PROBLEMS` with `"bills.0:BILL_IN_OTHER_BATCH"`;
  two creates with X at once with `Promise.all`: one 201, one 422;
  after cancelling the first batch X goes into a new batch.
- `second_export_same_file`: exporting again returns the same file id
  and the download bytes are identical.
- `bank_change_after_approval_blocks_export`: after approval, PUT new
  bank details for S; export gives 409 `SUPPLIER_BANK_CHANGED` with
  `detail.supplierIds [S]`; cancel and recreate, approve, export
  succeeds with the new IBAN.
- `creator_cannot_approve`: O creates and approves: 403
  `SOD_VIOLATION`.
- `supplier_without_bank_refused`: a bill of a supplier with no bank
  gives `"bills.0:SUPPLIER_NO_BANK"`.
- `csv_neutralises_formulas`: a supplier named `=HYPERLINK("x")`
  appears in the CSV as `'=HYPERLINK(""x"")` inside quotes.
- `no_iban_outside_export`: the batch JSON, the audit rows and the
  logs contain no IBAN; `downloadPaymentFile` without MFA gives 403.
- `unknown_exporter`: exporter `"bank-x"` gives 422
  `EXPORTER_UNKNOWN`; `listBankExporters` lists exactly
  `payment-list-csv` with `formatStatus "own-layout"`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test payables
  payment`. Expected: FAIL.
- [ ] **Step 3: Implement** the two pure modules, then the exporter,
  batches, export and routes.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS;
  `FINANCE_ROUTES.length === 35`.
- [ ] **Step 5: Commit** `feat(finance): payment batches as files`.

### Task 5: Projects, clients, rates, time and expense capture (F5)

**Files:**
- Create: `packages/contract/src/finance/projects.ts`,
  `packages/api/migrations/1605_projects.sql`,
  `packages/api/src/finance/projects/rates.ts` (pure),
  `src/finance/projects/time-check.ts` (pure),
  `src/finance/projects/clients.ts`, `src/finance/projects/projects.ts`,
  `src/finance/projects/time.ts`, `src/routes/finance-projects.ts`
- Modify: Plan 6 contract `src/expenses.ts` (`ExpenseItemInput` and
  `ExpenseItem` gain `projectId` and `billable`;
  `CLAIM_PROBLEM_CODES` gains `PROJECT_NOT_FOUND`), Plan 6 api
  `src/expenses/claims.ts` (save-time project check, store the two
  fields), contract `routes-finance.ts`, `errors.ts`, `examples.ts`,
  `index.ts`, `tests/routes-finance.test.ts`; api `src/app.ts`,
  `tests/leak.test.ts`, `tests/conformance.test.ts`
- Test: `packages/api/tests/project-rates.test.ts`,
  `tests/time-check.test.ts`, `tests/projects.test.ts`,
  `tests/time-entries.test.ts`, `tests/expense-project-tag.test.ts`

**Interfaces:**
- Consumes: Task 1 `financeAudit`, `MGR`; Plan 12 `Trn`, `Emirate`,
  `loadTaxCategory`; Plan 6 claim save path; Plan 3 `loadEmployee`,
  `dubaiDate`, `viewerScope`.
- Produces (contract):
  - `ClientBody { name: 1..200; nameAr: 1..200 | null; trn: Trn |
    null; tradeLicenceNumber: 1..60 | null; address: { line1: 1..200;
    city: 1..80; emirate: Emirate | null; country: ^[A-Z]{2}$ };
    paymentTermsDays: int 0..365; contactEmail: email | null }`;
    `ClientUpdate` = partial plus `status?: "active" | "archived"`;
    `Client = ClientBody & { id; status; createdAt }`.
  - `ProjectBody { code: ^[A-Z0-9-]{2,20}$; name: 1..120; clientId: Id
    | null; managerUserId: Id | null; billing: "time-and-materials" |
    "non-billable"; startDate: IsoDate; endDate: IsoDate | null;
    invoiceTaxCategoryId: Id | null; emirate: Emirate | null }`
    refined: `time-and-materials` needs `clientId` (path
    `["clientId"]`); `endDate >= startDate`; `ProjectUpdate` = partial
    plus `status?: "active" | "closed" | "archived"`; `Project =
    ProjectBody & { id; status; createdAt }`; `ProjectSummary { id;
    code; name; status; billing }` (what roles outside PAYROLL and the
    manager see).
  - `ProjectRate { employeeId: Id | null; hourly: Money;
    effectiveFrom: IsoDate }`; `ProjectRatesPut { rates: ProjectRate[]
    0..500; expectedVersion: int >= 0 }`; `ProjectRates { projectId;
    version; rates }`.
  - `TimeStatus = z.enum(["draft","submitted","approved","rejected"])`;
    `TimeEntryCreate { employeeId?: Id; projectId: Id; date: IsoDate;
    minutes: int 1..1440; billable: boolean; note: max 300 | null }`;
    `TimeEntryUpdate` = partial without `employeeId`; `TimeEntry =
    TimeEntryCreate & { id; employeeId; status; invoiceId: Id | null;
    decidedBy: Id | null; rejectNote: string | null }`;
    `TimeEntryQuery { employeeId?; projectId?; status?; from?; to?;
    unbilled?: boolean }`; `TimeIds { ids: Id[] 1..500 }`;
    `TimeReject { ids: Id[] 1..500; note: 3..300 }`; `TimeBatchResult
    { updated: int }`.
  - Routes (15): `listClients GET /v1/clients`, `createClient POST
    /v1/clients` (201), `getClient GET /v1/clients/{id}`,
    `updateClient PATCH /v1/clients/{id}` (all PAYROLL);
    `listProjects GET /v1/projects` (ALL_ROLES, `ProjectSummary[]` for
    callers outside PAYROLL), `createProject POST /v1/projects`
    (PAYROLL, 201), `getProject GET /v1/projects/{id}` (ALL_ROLES,
    response `Project | ProjectSummary` as a union), `updateProject
    PATCH /v1/projects/{id}` (PAYROLL), `putProjectRates PUT
    /v1/projects/{id}/rates` (PAYROLL); `listTimeEntries GET
    /v1/time-entries` (ALL_ROLES), `createTimeEntry POST
    /v1/time-entries` (ALL_ROLES, 201), `updateTimeEntry PATCH
    /v1/time-entries/{id}` (ALL_ROLES), `submitTimeEntries POST
    /v1/time-entries/submit` (ALL_ROLES), `approveTimeEntries POST
    /v1/time-entries/approve` (MGR), `rejectTimeEntries POST
    /v1/time-entries/reject` (MGR).
  - Error codes: `CLIENT_DUPLICATE` 409, `PROJECT_CODE_TAKEN` 409,
    `PROJECT_NOT_ACTIVE` 409, `RATES_VERSION_CONFLICT` 409,
    `RATES_INVALID` 422 (two rows with one `(employeeId,
    effectiveFrom)`, or `"0.00"`), `TIME_PROBLEMS` 422 (detail
    `problems`: `DATE_IN_FUTURE`, `BEFORE_PROJECT_START`,
    `AFTER_PROJECT_END`, `DAY_OVER_24_HOURS`,
    `BILLABLE_ON_NON_BILLABLE`), `TIME_NOT_EDITABLE` 409,
    `TIME_NOT_PENDING` 409 (detail `ids`).
- Produces (api):
  - Migration 1605: `clients(id, company_id, name, name_ar, trn,
    trade_licence_number, address jsonb, payment_terms_days,
    contact_email, status, created_at)`, unique `(company_id,
    lower(name))` where `status = 'active'`; `projects(id, company_id,
    code, name, client_id, manager_user_id, billing, start_date,
    end_date, invoice_tax_category_id, emirate, status, created_at)`,
    unique `(company_id, code)`; `project_rates(company_id pk part,
    project_id pk part, version, rates jsonb)`; `time_entries(id,
    company_id, employee_id, project_id, date, minutes, billable,
    note, status, invoice_id, decided_by, decided_at, reject_note,
    created_by, created_at)`, index `(company_id, project_id, status,
    invoice_id)`; foreign keys from `po_lines.project_id` and
    `bill_lines.project_id` to `projects`; `alter table expense_items
    add column project_id uuid null references projects, add column
    billable boolean not null default false`. Grants select, insert,
    update.
  - `rates.ts` (pure): `pickProjectRate(rates: { employeeId: string |
    null; hourly: Fils; effectiveFrom: string }[], employeeId: string,
    date: string): Fils | null` (rows for the employee win over
    `null` rows; latest `effectiveFrom <= date` within the winning
    set; none gives `null`).
  - `time-check.ts` (pure): `checkTimeEntry(e: { date: string;
    minutes: number; billable: boolean }, p: { startDate: string;
    endDate: string | null; billing: string }, today: string,
    otherMinutesThatDay: number): string[]` (every problem, in the
    order of the codes above).
  - `projects.ts`: `loadProject(tx, companyId, id)`,
    `requireActiveProject` (409 `PROJECT_NOT_ACTIVE`), list, create
    (a set `invoiceTaxCategoryId` must be a `sale` or `both` category,
    else 422 `VALIDATION_FAILED` on that path), patch, rates put
    (version check). `projectVisibleFull(ctx, p)`: PAYROLL or the
    project's manager. Audit `client.*`, `project.created`,
    `project.updated`, `project.rates-updated` (`data: { projectId,
    version, rateCount }`).
  - `time.ts`: create (own entries; PAYROLL may name `employeeId`;
    project active; problems give 422 `TIME_PROBLEMS`; status
    `draft`), patch (own, `draft` or `rejected`, `invoiceId` null,
    else 409 `TIME_NOT_EDITABLE`), submit (own drafts and rejected
    entries to `submitted`), approve and reject (PAYROLL, or a manager
    who is `managerUserId` of every entry's project; an entry of the
    caller's own employee gives 403 `SOD_VIOLATION`; an entry not
    `submitted` gives 409 `TIME_NOT_PENDING` with `detail.ids`; all
    or none). List: own entries; PAYROLL all; a manager also the
    entries of projects they manage. Audit `time-entry.submitted`,
    `.approved`, `.rejected` (`data: { count }`).

- [ ] **Step 1: Write the failing tests**

`project-rates.test.ts` (pure): default `{ null, 200.00, 2026-01-01 }`
and E's `{ E, 250.00, 2026-06-01 }`: E on `2026-05-31` gives `20000n`
(no E row yet in effect, falls back to default), on `2026-06-01`
gives `25000n`; F on `2026-07-01` gives `20000n`; any employee on
`2025-12-31` gives `null`.

`time-check.test.ts` (pure): `minutes 600` with 900 already that day
gives `["DAY_OVER_24_HOURS"]`; a date before the project start gives
`BEFORE_PROJECT_START`; `billable: true` on a `non-billable` project
gives `BILLABLE_ON_NON_BILLABLE`; a future date gives
`DATE_IN_FUTURE`; several faults list all of them in code order.

`projects.test.ts`:
- `project_needs_client_when_billable`: `time-and-materials` without
  `clientId` gives 400 `VALIDATION_FAILED` at `clientId`.
- `project_code_taken`: a second `ALPHA` gives 409.
- `invoice_category_must_be_sale`: a `purchase` tax category gives 422
  at `invoiceTaxCategoryId`.
- `employee_sees_summary_only`: an employee's `GET /v1/projects/{id}`
  has no `clientId` and no `managerUserId` keys.
- `rates_version_conflict`: put with `expectedVersion 0` twice: the
  second gives 409 `RATES_VERSION_CONFLICT`.

`time-entries.test.ts` (project P managed by M; employee E; M's own
employee record M_E):
- `time_flow`: E creates 90 minutes billable, submits; M approves:
  status `approved`, `decidedBy` M.
- `manager_cannot_approve_own_time`: M_E's submitted entry on P
  approved by M gives 403 `SOD_VIOLATION`.
- `other_manager_cannot_approve`: a manager of another project gives
  403 `FORBIDDEN` and nothing changes.
- `approve_all_or_none`: ids of one submitted and one draft entry give
  409 `TIME_NOT_PENDING` with the draft's id, and the submitted one
  stays `submitted`.
- `approved_entry_locked`: PATCH an approved entry gives 409
  `TIME_NOT_EDITABLE`.
- `employee_sees_own_only`: another employee's entry id gives 404.

`expense-project-tag.test.ts`: a Plan 6 claim item with `projectId`
P and `billable: true` round-trips both fields; an unknown project
gives 422 `CLAIM_PROBLEMS` with `"items.0:PROJECT_NOT_FOUND"`; an item
without the fields reads back `projectId null`, `billable false`
(Plan 6 tests stay green).

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test project time
  expense-project`. Expected: FAIL.
- [ ] **Step 3: Implement** the pure modules, then clients, projects,
  time, the Plan 6 additions and routes.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS;
  `FINANCE_ROUTES.length === 50`.
- [ ] **Step 5: Commit** `feat(finance): projects, clients and time`.

