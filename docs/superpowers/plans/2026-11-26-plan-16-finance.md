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
later-merged plan reuses it. Nothing here depends on Plans 14
(meetings, migrations 14xx) or 15 (insights, 15xx); their route groups
may sit before or after `FINANCE_ROUTES` in `ROUTE_GROUPS`.

| Task | Needs merged first |
|---|---|
| 1 | Plan 3 Tasks 1 to 8 |
| 2 | Task 1; Plan 6 Tasks 1, 2 and 4 (spine, categories) |
| 3 | Task 2; Plan 7 Task 3 (`claimFile`); Plan 12 Task 7 |
| 4 | Task 3 |
| 5 | Task 1; Plan 6 Task 5 (claims) |
| 6 | Tasks 2, 3 and 5 |
| 7 | Tasks 5 and 6; Plan 7 Task 7 (`PdfRenderer`); Plan 12 Task 3 |
| 8 | Task 7; Plan 12 Task 12 |
| 9 | Tasks 5 and 6; Plan 6 Task 5 |
| 10 | Tasks 5 and 6 |
| 11 | Tasks 3, 4, 7 and 10 |
| 12 | Tasks 1 to 11 |

Tasks run in order in one worktree: each appends to
`routes-finance.ts`, `errors.ts` and the conformance and leak tests,
and Tasks 9 and 10 both append a cost loader.

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
- Audit actions follow the form Plan 3 shipped (hyphenated first
  segments such as `pay-run.created`, as Plan 6 notes): whatever
  regex Plan 3 ships, every finance action (`purchase-order.*`,
  `payment-batch.*`, `time-entry.*` and the rest) must pass it, and a
  Task 1 test checks the full list against `AuditEvent.action`. All
  go through `financeAudit` (Task 1), which refuses any key in
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
  `tests/routes.test.ts`, and every earlier route test that asserts
  its group is last (`ROUTE_GROUPS.at(-1)` or "ends with"; Plans 12
  to 15, found with `grep -rn "at(-1)" packages/contract/tests`):
  relax each to "`ROUTE_GROUPS` contains the group"
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
text; for every string reachable from the exports of
`routes-finance.ts` and `src/finance/*.ts` (scan `Object.values`,
recursing into arrays and plain objects; other plans' strings are out
of scope) and
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
  `src/finance/sequences.ts`, `src/finance/purchasing/orders.ts`,
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
  - `sequences.ts`: `nextNumber(tx, companyId, kind: "po" |
    "invoice", year: number, prefix: string): Promise<string>`:
    `INSERT ... ON CONFLICT DO UPDATE SET next = next + 1 RETURNING`,
    formatted
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
    "PO_NOT_OPEN","SUPPLIER_MISMATCH"])`; `BillMatchStatus =
    z.enum(["matched","exception","no-po"])`; `BillMatch { status:
    BillMatchStatus; codes: MatchCode[]; checkedAt: Timestamp | null
    }` (named `BillMatchStatus` because Plan 12 exports a
    `MatchStatus` for e-invoices).
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
    dueFrom?; dueTo?; match?: BillMatchStatus }`.
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
    matchBill(i: MatchInput): { status: BillMatchStatus;
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
- `matched_bill_one_step`: H submits a matched bill, chain `role
  owner`, members O, O2, H: one step with eligible `[O, O2]`;
  approved by O: status `approved`.
- `exception_bill_adds_owner_tier`: O submits a bill at 120.00 unit
  price, chain `role hr`, members O, O2, H: match `exception` with
  `PRICE_OVER_TOLERANCE`; the approval has steps `[role hr]`
  (eligible `[H]`) and `[role owner]` (eligible `[O2]`, the submitter
  O excluded).
- `audit_actions_pass_regex` (Task 1 constraint, placed here once
  the names exist): every finance audit action named in this plan
  parses with the shipped `AuditEvent.action` schema.
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
  `src/finance/sequences.ts` (`nextNumber` kind `"batch"`),
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
    (PAYROLL; body `BatchCancel { note: 3..500 }`),
    `exportPaymentBatch POST /v1/payment-batches/{id}/export`
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
    (`draft` or `approved` by PAYROLL; `exported` only by an owner
    with an MFA session, else 403 `FORBIDDEN` or `MFA_REQUIRED`,
    because the file may already be at a bank (Ruling 33); else 409
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
- `exported_cancel_needs_owner_mfa`: after export, hr cancelling gives
  403 `FORBIDDEN`; an owner without MFA 403 `MFA_REQUIRED`; an owner
  with MFA and a note cancels, and the bills are `approved` again.
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

### Task 6: Cost items, budgets, commitments, alerts (F6)

**Files:**
- Create: `packages/contract/src/finance/budgets.ts`,
  `packages/api/migrations/1606_budgets.sql`,
  `packages/api/src/finance/costs/cost-item.ts` (type and pure
  helpers), `src/finance/costs/loaders.ts`,
  `src/finance/costs/budget-math.ts` (pure),
  `src/finance/costs/budgets.ts`, `src/finance/costs/alerts.ts`,
  `src/finance/costs/impact.ts`, `src/routes/finance-budgets.ts`
- Modify: `src/finance/purchasing/subject.ts` and
  `src/finance/bills/subject.ts` (budget fact), contract
  `routes-finance.ts`, `errors.ts`, `examples.ts`, `index.ts`,
  `tests/routes-finance.test.ts`; api `src/app.ts`,
  `tests/leak.test.ts`, `tests/conformance.test.ts`
- Test: `packages/api/tests/budget-math.test.ts`,
  `tests/cost-loaders.test.ts`, `tests/budgets.test.ts`

**Interfaces:**
- Consumes: Task 1 `lineNet`, `getFinanceSettings`, `financeAudit`;
  Task 2 PO tables; Task 3 bill tables; Task 5 projects; Plan 6
  `expense_claims`, `expense_items` (with Task 5's `project_id`);
  Plan 3 employees (`department_id`), departments; Plan 11
  `toSignedMoney`.
- Produces (contract):
  - `BudgetScope { departmentId: Id | null; projectId: Id | null;
    categoryId: Id | null }` refined: at least one set (path
    `["scope"]`).
  - `BudgetBody { name: 1..120; scope: BudgetScope; periodStart:
    IsoDate; periodEnd: IsoDate; amount: Money }` refined: `periodEnd
    >= periodStart`, at most 366 days, `amount > "0.00"`;
    `BudgetUpdate { name?; amount?; status?: "active" | "archived" }`
    (scope and period are fixed once created).
  - `BudgetStatus { committed: Money; actual: Money; used: Money;
    remaining: SignedMoney; usedBps: int >= 0; over: boolean;
    bySource: { source: CostSource; committed: Money; actual: Money
    }[] }`; `Budget = BudgetBody & { id; status; createdAt; current:
    BudgetStatus }`; `BudgetQuery { status?; departmentId?;
    projectId?; categoryId?; activeOn?: IsoDate }`.
  - `CostSource = z.enum(["po","bill","claim","trip","card"])`.
  - `BudgetAlert { id; budgetId; budgetName; thresholdBps: int;
    usedBps: int; raisedAt: Timestamp }`; `AlertQuery { since?:
    Timestamp }`.
  - Routes (5): `listBudgets GET /v1/budgets`, `createBudget POST
    /v1/budgets` (201), `getBudget GET /v1/budgets/{id}`,
    `updateBudget PATCH /v1/budgets/{id}`, `listBudgetAlerts GET
    /v1/budgets/alerts` (all PAYROLL). Register `listBudgetAlerts`
    before `getBudget` so `alerts` is not read as an id (or give
    `{id}` a uuid pattern, which Plan 3 `Id` already is).
  - Error codes: `BUDGET_SCOPE_INVALID` 422 (an id in the scope that
    does not exist; detail `paths`), `BUDGET_ARCHIVED` 409.
- Produces (api):
  - Migration 1606: `budgets(id, company_id, name, department_id,
    project_id, category_id, period_start, period_end, amount bigint,
    status, created_by, created_at)`; `budget_alerts(id, company_id,
    budget_id, threshold_bps int, used_bps int, raised_at)`, unique
    `(company_id, budget_id, threshold_bps)`. Grants select, insert,
    update.
  - `cost-item.ts`: `interface CostItem { source: CostSource; stage:
    "committed" | "actual"; refId: string; date: string; amount: Fils;
    departmentId: string | null; projectId: string | null;
    categoryId: string | null; supplierId: string | null; cardId:
    string | null; employeeId: string | null }`.
  - `loaders.ts`: `type CostLoader = (tx: Db, companyId: string, from:
    string, to: string) => Promise<CostItem[]>`; `COST_LOADERS:
    CostLoader[]` (Tasks 9 and 10 append theirs); `loadCostItems(tx,
    companyId, from, to): Promise<CostItem[]>` concatenates them.
    Loaders here:
    - `po`: per line of POs in `approved` (not `closed`, not
      `cancelled`), stage `committed`, date `order_date`, amount =
      `max(0, line.net - lineNet(billedMilli, line.unitPrice))`
      where `billedMilli` sums lines of bills in `approved`,
      `scheduled`, `paid` on that PO line; zero amounts are dropped.
    - `bill`: per line of bills in `approved`, `scheduled`, `paid`,
      stage `actual`, date `bill_date`, amount `line.net` (net of
      VAT), scope fields from the line, `supplierId`.
    - `claim`: per item of Plan 6 claims in `approved` or
      `reimbursed`, stage `actual`, date the item date, amount
      `amount - vat_amount`, department the claimant's, project and
      category from the item, `employeeId`.
  - `budget-math.ts` (pure): `matches(b: { scope; periodStart;
    periodEnd }, i: CostItem): boolean` (every set scope field equal,
    date within the period inclusive); `budgetStatus(b: BudgetF,
    items: CostItem[], alertBps: number[]): BudgetStatusF & {
    crossed: number[] }` (`usedBps = used * 10000 / amount` rounded
    down; `crossed` = thresholds `<= usedBps`; `remaining = amount -
    used`, signed); `wouldExceed(b: BudgetF, current: BudgetStatusF,
    extra: CostItem[]): boolean` (`used + sum of matching extra >
    amount`).
  - `budgets.ts`: create (scope ids must exist in the company, else 422
    `BUDGET_SCOPE_INVALID`), patch (archived budgets refuse amount
    changes: 409 `BUDGET_ARCHIVED`), get and list with `current`
    computed from `loadCostItems` over the budget's period. Audit
    `budget.created`, `budget.updated` (`changed`).
  - `alerts.ts`: `refreshBudgetAlerts(ctx): Promise<number>` computes
    every active budget's status and inserts one row per crossed
    threshold with `ON CONFLICT DO NOTHING` (so each threshold is
    raised once per budget); returns rows inserted. Called by
    `listBudgets`, `getBudget`, `listBudgetAlerts` and after a PO,
    bill or trip approval closes (`onClosed` with `approved`). Audit
    `budget.alert-raised` (`data: { budgetId, thresholdBps }`).
  - `impact.ts`: `budgetFact(tx, companyId, extra: CostItem[]):
    Promise<{ over: boolean; budgetIds: string[] }>` (active budgets
    whose period holds an extra item's date and `wouldExceed`).
    `purchaseOrderSubject.facts` and `billSubject.facts` now set
    `overLimit = <previous rule> || over` and add `"OVER_BUDGET"` to
    `summary.flagCodes` when over. For a PO the extra items are its
    lines as `committed`; for a bill, each line adds `line.net -
    release`, where `release = min(open commitment of its PO line,
    lineNet(qtyMilli, poLine.unitPrice))` for a line on a PO line and
    `0` otherwise (so a bill at the PO price within the order adds
    zero, and a dearer bill adds only the difference).

- [ ] **Step 1: Write the failing tests**

`budget-math.test.ts` (pure):
- `scope_and_period_match`: budget `{ dept D, category C }` matches an
  item with D and C dated inside, not one with D only, not one dated
  the day after `periodEnd`.
- `status_sums_and_bps`: amount 1000.00, committed 300.00, actual
  550.00: `used 85000n`, `usedBps 8500`, `remaining 15000n`,
  `crossed [8000]` with thresholds `[8000, 10000]`.
- `over_budget_signed`: actual 1200.00: `remaining -20000n`, `over
  true`, `crossed [8000, 10000]`, `usedBps 12000`.
- `would_exceed`: used 900.00 of 1000.00 and an extra matching 100.01
  gives true; 100.00 gives false; a non-matching extra gives false.
- fast-check: `used === committed + actual` and `remaining === amount
  - used` for any item list.

`cost-loaders.test.ts`:
- `po_bill_not_double_counted` (Review Focus 5): approved PO line qty
  10 at 100.00 with department D; a bill of qty 4 at 100.00 approved:
  items are PO committed `60000n` and bill actual `40000n`; the
  budget for D shows `committed "600.00"`, `actual "400.00"`, `used
  "1000.00"`; closing the PO drops the commitment to zero.
- `bill_price_above_po`: the bill at 110.00 x 4 gives actual
  `44000n` and commitment `60000n` (released at the PO price).
- `bill_within_po_adds_no_budget_impact`: a department budget at
  exactly the PO's 1000.00 (used 100%): a bill of qty 4 at 100.00 on
  that PO gets no `OVER_BUDGET` flag (extra 0); the same bill at
  110.00 gets it (extra 40.00).
- `claim_net_of_vat`: an approved claim item 105.00 with VAT 5.00 and
  project P gives actual `10000n` with `projectId` P and the
  claimant's department.
- `draft_and_rejected_ignored`: a draft PO, a rejected bill and a
  submitted claim add nothing.

`budgets.test.ts`:
- `budget_scope_must_exist`: an unknown project id gives 422
  `BUDGET_SCOPE_INVALID` with `paths ["scope.projectId"]`.
- `alert_raised_once_per_threshold` (Review Focus 5): spending moves
  a budget to 85%: `listBudgetAlerts` shows one alert at 8000; three
  more reads add none; spending to 101% adds exactly one at 10000.
- `over_budget_po_adds_owner_tier`: chain line-manager only; a PO
  that takes the department budget over gives an approval with steps
  `[line-manager, role owner]` and `flagCodes` holding
  `"OVER_BUDGET"`; the same PO under budget has one step.
- `archived_budget_amount_locked`: PATCH amount on an archived budget
  gives 409 `BUDGET_ARCHIVED`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test budget
  cost-loaders`. Expected: FAIL.
- [ ] **Step 3: Implement** `cost-item.ts`, `budget-math.ts`,
  loaders, budgets, alerts, impact and the subject changes.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS;
  `FINANCE_ROUTES.length === 55`.
- [ ] **Step 5: Commit** `feat(finance): budgets with commitments`.

### Task 7: Client invoices from time and expenses, documents (F7)

**Files:**
- Create: `packages/contract/src/finance/invoices.ts`,
  `packages/api/migrations/1607_invoices.sql`,
  `packages/api/src/finance/invoices/build.ts` (pure),
  `src/finance/invoices/vat-lines.ts` (pure),
  `src/finance/invoices/html.ts` (pure),
  `src/finance/invoices/labels.ts` (data),
  `src/finance/invoices/invoices.ts`, `src/finance/invoices/draft.ts`,
  `src/finance/invoices/issue.ts`, `src/routes/finance-invoices.ts`
- Modify: Plan 7 `src/pdf/renderer.ts` (`PdfRenderer.renderHtml`),
  `tests/helpers/text-pdf.ts`, contract `routes-finance.ts`,
  `errors.ts`, `examples.ts`, `index.ts`,
  `tests/routes-finance.test.ts`; api `src/app.ts`,
  `tests/leak.test.ts`, `tests/conformance.test.ts`
- Test: `packages/api/tests/invoice-build.test.ts`,
  `tests/invoice-html.test.ts`, `tests/invoices.test.ts`

**Interfaces:**
- Consumes: Task 1 `Qty`, `parseQty`, `formatQty`, `lineNet`,
  `minutesToQty`, `financeAudit`, `getFinanceSettings`; Task 2
  `nextNumber`; Task 5 `loadProject`, `pickProjectRate`, clients,
  `time_entries`, `expense_items.project_id` and `billable`; Plan 12
  engine `vatOnNet(net, onDate): Traced<Fils>`, `loadTaxCategory`,
  `VatTreatment`, `Emirate`; Plan 7 `PdfRenderer`, `escapeHtml`,
  `CSP_META`, `contentDisposition`; Plan 3 `dubaiDate`.
- Produces (contract):
  - `InvoiceLineKind = z.enum(["time","expense","manual"])`;
    `ManualLineInput { description: 1..300; quantity: Qty (> 0);
    unitPrice: Money }`; `InvoiceLine { id; lineNo; kind;
    description; quantity: Qty; unitPrice: Money; net: Money; vat:
    Money; timeEntryIds: Id[]; expenseItemIds: Id[] }`.
  - `InvoiceStatus = z.enum(["draft","issued","void"])`;
    `InvoiceCreate { clientId: Id; projectId: Id | null;
    taxCategoryId: Id; emirate: Emirate | null; lines:
    ManualLineInput[] 0..200 }`; `InvoiceFromProject { projectId: Id;
    to: IsoDate; groupTime: "employee" | "entry" }`; `InvoiceUpdate {
    taxCategoryId?; emirate?; addLines?: ManualLineInput[] 0..200;
    removeLineIds?: Id[] 0..500 }`; `InvoiceIssue { issueDate?:
    IsoDate }`; `InvoiceVoid { note: 3..500 }`.
  - `Invoice { id; number: string | null; clientId; clientName;
    projectId; status; issueDate: IsoDate | null; dueDate: IsoDate |
    null; taxCategoryId; treatment: VatTreatment; emirate; lines:
    InvoiceLine[]; net: Money; vat: Money; total: Money; vatDocumentId:
    Id | null; einvoiceId: Id | null; createdAt; note: typeof
    INVOICE_DOC_NOTE }`; `InvoiceQuery { status?; clientId?;
    projectId?; from?; to? }`; `DocumentQuery { lang: "en" | "ar" }`.
  - Routes (8, all PAYROLL): `listInvoices GET /v1/invoices`,
    `createInvoice POST /v1/invoices` (201),
    `draftInvoiceFromProject POST /v1/invoices/from-project` (201),
    `getInvoice GET /v1/invoices/{id}`, `updateInvoice PATCH
    /v1/invoices/{id}`, `issueInvoice POST /v1/invoices/{id}/issue`,
    `voidInvoice POST /v1/invoices/{id}/void`, `getInvoiceDocument
    GET /v1/invoices/{id}/document` (`binary`, `binaryTypes
    ["application/pdf"]`).
  - Error codes: `NOTHING_TO_BILL` 422, `INVOICE_PROBLEMS` 422 (detail
    `problems`: `RATE_NOT_FOUND:<timeEntryId>`,
    `CATEGORY_NOT_FOR_SALES`, `CATEGORY_RETIRED`, `CLIENT_ARCHIVED`,
    `PROJECT_NOT_BILLABLE`, `PROJECT_NO_TAX_CATEGORY`, `NO_LINES`,
    `EMIRATE_REQUIRED`),
    `INVOICE_NOT_DRAFT` 409, `INVOICE_NOT_VOIDABLE` 409,
    `ARABIC_NOT_REVIEWED` 422.
- Produces (api):
  - Migration 1607: `invoices(id, company_id, number, client_id,
    project_id, status, issue_date, due_date, tax_category_id,
    treatment, emirate, net bigint, vat bigint, vat_document_id,
    einvoice_id, void_note, created_by, created_at, updated_at)`,
    unique `(company_id, number)` where `number is not null`;
    `invoice_lines(id, company_id, invoice_id, line_no, kind,
    description, quantity_milli bigint, unit_price bigint, net bigint,
    vat bigint, live boolean)`; `invoice_line_sources(company_id,
    line_id, time_entry_id null, expense_item_id null, live
    boolean)`, unique `(company_id, expense_item_id)` where `live and
    expense_item_id is not null`, unique `(company_id, time_entry_id)`
    where `live and time_entry_id is not null`. Grants select, insert,
    update.
  - `build.ts` (pure): `buildTimeLines(entries: { id; employeeId;
    employeeName; minutes: number; rate: Fils | null }[], group:
    "employee" | "entry"): { lines: BuiltLine[]; problems: string[] }`
    (`BuiltLine { kind; description; qtyMilli: bigint; unitPrice:
    Fils; net: Fils; timeEntryIds: string[]; expenseItemIds: string[]
    }`): a null rate gives `RATE_NOT_FOUND:<id>`; group `employee`
    sums minutes per `(employeeId, rate)` then `qtyMilli =
    minutesToQty(sum)`, description `"<employeeName>, <qty> h"`;
    group `entry` makes one line per entry; `net = lineNet(qtyMilli,
    rate)` always (so Plan 12 `checkEinvoiceDraft` passes);
    `buildExpenseLines(items: { id; description; amount: Fils; vat:
    Fils }[]): BuiltLine[]` (quantity 1, `unitPrice = net = amount -
    vat`, re-billed net of the supplier's VAT; Ruling 18).
  - `vat-lines.ts` (pure): `lineVat(net: Fils, treatment:
    VatTreatment, onDate: string): Fils` = `vatOnNet(net,
    onDate).value` for `standard`, else `0n`; `invoiceTotals(lines)`
    sums net and VAT per line (VAT per line, then summed; the same
    order Plan 12's e-invoice lines use).
  - `labels.ts`: `INVOICE_LABELS = { en: { title: "Invoice", ... },
    ar: { ... } }` and `INVOICE_LABELS_AR_STATUS = "NEEDS NATIVE
    REVIEW"`.
  - `html.ts` (pure): `invoiceHtml(v: InvoiceDocView, lang: "en" |
    "ar"): string`: `<!doctype html>`, `lang` and `dir`, `<meta
    charset="utf-8">`, `CSP_META`, one `<style>`, a header with the
    company's legal name and TRN (from the Plan 12 tax profile, or
    blank), the client block, number, dates, a table of lines
    (description, quantity, unit price, net, VAT), totals, a
    `DRAFT` or `VOID` watermark when not `issued`, and
    `INVOICE_DOC_NOTE` in the footer; every value through
    `escapeHtml`; no `<script>`, `<img>` or external URL.
  - Plan 7 `PdfRenderer` gains `renderHtml(html: string):
    Promise<Uint8Array>` (additive): `chromeRenderer` applies the same
    lockdown as `render` (JavaScript off, every non-`data:` request
    aborted, A4); `unavailableRenderer` throws 503
    `PDF_RENDERER_UNAVAILABLE`; `textPdfRenderer` returns
    `"%PDF-1.4\n% " + JSON.stringify({ html })` plus `"\n%%EOF\n"`.
  - `draft.ts`: `draftFromProject(ctx, body)`: project `time-and-
    materials` and active (else problem `PROJECT_NOT_BILLABLE`);
    selects approved billable time entries of the project with `date
    <= to` and `invoice_id` null, and billable items of `approved`
    or `reimbursed` claims with that `project_id` and no live source
    row, each `FOR UPDATE`; none gives 422 `NOTHING_TO_BILL`; rates
    from `pickProjectRate`; a project with no
    `invoiceTaxCategoryId` gives problem `PROJECT_NO_TAX_CATEGORY`, a
    `standard` category with no project emirate gives
    `EMIRATE_REQUIRED`; problems give 422 `INVOICE_PROBLEMS`;
    inserts the invoice (client, category and emirate from the
    project),
    lines, live source rows, and sets `time_entries.invoice_id`.
  - `invoices.ts`: manual create (client active; category a `sale`
    or `both` category and active; `standard` treatment with
    `emirate` null gives `EMIRATE_REQUIRED`), patch (`draft` only,
    else 409 `INVOICE_NOT_DRAFT`; removing a built line sets its
    source rows `live false` and clears `time_entries.invoice_id`),
    get, list, `toInvoiceView` (draft VAT computed on today's Dubai
    date). Void: a `draft`, or an `issued` invoice with
    `vat_document_id` and `einvoice_id` null; releases every source
    (the number is never reused); else 409 `INVOICE_NOT_VOIDABLE`
    (corrections of a ledgered or e-invoiced invoice are Plan 12
    credit notes). Audit `invoice.created`, `.updated`, `.voided`
    (`data: { invoiceId, lineCount }`).
  - `issue.ts`: `issueInvoice(ctx, id, body)`: `draft` only; at least
    one line (`NO_LINES`); `issueDate` defaults to today (Dubai);
    number `nextNumber(tx, companyId, "invoice", year of issueDate,
    settings.invoicePrefix)`; `dueDate = issueDate + client terms`;
    VAT recomputed per line on `issueDate` and stored; status
    `issued`. Audit `invoice.issued` (`data: { invoiceId, lineCount
    }`). Document: `getInvoiceDocument(ctx, id, lang)`: `ar` gives
    422 `ARABIC_NOT_REVIEWED` while `INVOICE_LABELS_AR_STATUS` is
    `"NEEDS NATIVE REVIEW"`; else `renderHtml(invoiceHtml(...))`,
    sent with `contentDisposition("<number or draft-id>.pdf")`.

- [ ] **Step 1: Write the failing tests**

`invoice-build.test.ts` (pure):
- `time_grouped_by_employee`: E with 90 and 45 minutes at 200.00 and
  F with 60 minutes at 250.00: two lines; E `qtyMilli 2250n`, net
  `45000n`; F `1000n`, net `25000n`.
- `time_per_entry`: group `entry` gives three lines with nets
  `30000n`, `15000n`, `25000n`.
- `odd_minutes_round_consistently`: 50 minutes at 199.99: `qtyMilli
  833n`; net equals `lineNet(833n, 19999n)`.
- `missing_rate_problem`: a null rate gives
  `["RATE_NOT_FOUND:<id>"]`.
- `expense_rebilled_net`: item 105.00 with VAT 5.00 gives quantity
  1000n and net `10000n`.
- `line_vat`: `lineVat(10000n, "standard", "2026-11-26")` equals
  `vatOnNet(10000n, "2026-11-26").value` imported from the engine;
  `zero-rated`, `exempt`, `out-of-scope` give `0n`.
- fast-check: for any minutes 1..100000 and rate 1..10^7 fils, a
  built line's net equals `lineNet(qtyMilli, unitPrice)` (Plan 12's
  hand-off check).

`invoice-html.test.ts` (pure):
- `html_escapes_values`: a client named `<script>alert(1)</script>`
  and a line `"a & b"` appear as `&lt;script&gt;` and `a &amp; b`; the
  output has no `<script` and no `http`.
- `draft_watermark`: a draft has `DRAFT`; an issued invoice has none.
- `note_in_footer`: the HTML contains `INVOICE_DOC_NOTE` (escaped).
- `title_is_invoice`: the English title is `Invoice`; the HTML never
  contains `Tax Invoice` (case-sensitive; the note's lower-case "tax
  invoices" is allowed).

`invoices.test.ts` (project P, client K, sale tax category T with
`standard` treatment, emirate `DU`; approved billable time and one
billable approved claim item on P):
- `draft_from_project_collects_unbilled`: lines for time and the
  expense; every source time entry shows `invoiceId`; `NOTHING_TO_BILL`
  on a second draft for the same range.
- `concurrent_drafts_bill_once` (Review Focus 3): two drafts with
  `Promise.all`: one 201, the other 422 `NOTHING_TO_BILL`, or both 201
  with disjoint sources; no time entry or expense item is on two live
  invoices (checked in SQL).
- `void_draft_releases`: voiding the draft clears `invoiceId`; a new
  draft picks the same entries.
- `remove_line_releases`: removing the expense line releases the item
  for another draft.
- `issue_numbers_and_due`: issue on `2026-11-26` with client terms 30:
  number `INV-2026-00001`, `dueDate "2026-12-26"`, VAT per line equals
  `lineVat`; PATCH after issue gives 409 `INVOICE_NOT_DRAFT`.
- `void_issued_without_ledger`: an issued invoice with no VAT document
  and no e-invoice voids; the next issue gets `INV-2026-00002` (no
  reuse).
- `purchase_category_refused`: a `purchase` category gives 422
  `INVOICE_PROBLEMS` with `CATEGORY_NOT_FOR_SALES`.
- `document_pdf`: with `textPdfRenderer`, the document starts with
  `%PDF-` and its embedded HTML holds the invoice number; `lang=ar`
  gives 422 `ARABIC_NOT_REVIEWED`; with `unavailableRenderer` 503
  `PDF_RENDERER_UNAVAILABLE`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test invoice`.
  Expected: FAIL.
- [ ] **Step 3: Implement** the pure modules, the renderer addition,
  then draft, invoices, issue and routes.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS;
  `FINANCE_ROUTES.length === 63`.
- [ ] **Step 5: Commit** `feat(finance): client invoices and documents`.

### Task 8: E-invoicing hand-off and VAT ledger record (F7)

**Files:**
- Create: `packages/api/src/finance/invoices/to-einvoice.ts` (pure),
  `src/finance/invoices/handoff.ts`
- Modify: `src/finance/invoices/invoices.ts` (`vatDocumentId` read
  through the e-invoice when handed off), contract
  `src/finance/invoices.ts`, `routes-finance.ts`, `errors.ts`,
  `examples.ts`, `index.ts`, `tests/routes-finance.test.ts`; api
  `src/routes/finance-invoices.ts`, `tests/leak.test.ts`,
  `tests/conformance.test.ts`
- Test: `packages/api/tests/to-einvoice.test.ts`,
  `tests/invoice-handoff.test.ts`

**Interfaces:**
- Consumes: Task 7 invoice tables, `toInvoiceView`, `formatQty`;
  Task 5 clients; Plan 12 `EInvoiceDraft`, `createOutbound(ctx,
  draft): Promise<EInvoice>`, `checkEinvoiceDraft`,
  `insertVatDocument`, `FakeEInvoiceProvider`, `sendOutbound`.
- Produces (contract):
  - Routes (2, PAYROLL): `handOffInvoice POST
    /v1/invoices/{id}/einvoice` (to `Invoice`), `recordInvoiceVat
    POST /v1/invoices/{id}/record-vat` (to `Invoice`).
  - Error codes: `INVOICE_NOT_ISSUED` 409, `INVOICE_IN_VAT_LEDGER`
    409, `INVOICE_HANDED_OFF` 409.
- Produces (api):
  - `to-einvoice.ts` (pure): `toEInvoiceDraft(inv: InvoiceF, client:
    ClientF): EInvoiceDraft` = `{ type: "invoice", number,
    issueDate, transactionDate: issueDate, buyer: { name, trn,
    tradeLicenceNumber, address }, lines: each line as {
    description, quantity: formatQty(qtyMilli), unitPrice, net,
    treatment: inv.treatment, vat }, categoryId: taxCategoryId,
    emirate }` (amounts as `Money` strings).
  - `handoff.ts`: both actions lock the invoice row `FOR UPDATE` and
    need status `issued` (409 `INVOICE_NOT_ISSUED`).
    `handOffInvoice(ctx, id)`: `vat_document_id` pointing at an
    `active` VAT document gives 409 `INVOICE_IN_VAT_LEDGER` (a voided
    one does not block, Ruling 15); `einvoice_id` set returns the invoice as
    it is (idempotent); else `createOutbound(ctx,
    toEInvoiceDraft(...))` (its 422 `EINVOICE_INVALID` and 409
    `EINVOICE_NUMBER_TAKEN` pass through unchanged), stores
    `einvoice_id`. Sending stays Plan 12's `sendEinvoice` route, and
    Plan 12 writes the sale VAT document when the provider accepts
    (source `einvoice-sent`). `recordInvoiceVat(ctx, id)`:
    `einvoice_id` set gives 409 `INVOICE_HANDED_OFF`;
    `vat_document_id` set returns the invoice as it is; else
    `insertVatDocument(ctx, { direction: "sale", kind:
    "tax-invoice", documentNumber: number, issueDate, taxDate:
    issueDate, counterpartyName: client name, counterpartyTrn: client
    TRN, categoryId: taxCategoryId, emirate, net, vat, claimedVat:
    null }, "project-invoice", invoiceId)` (its `PERIOD_FILED` and
    `VAT_DOCUMENT_INVALID` pass through) and stores the id. Audit
    `invoice.handed-off`, `invoice.vat-recorded` (`data: { invoiceId
    }`).
  - `toInvoiceView`: when `einvoice_id` is set, `vatDocumentId` is
    the e-invoice's `vat_document_id` (null until accepted).

- [ ] **Step 1: Write the failing tests**

`to-einvoice.test.ts` (pure): an invoice with a time line (qty
`2250n`, unit 200.00, net 450.00) and an expense line maps to a draft
whose lines have quantity `"2.25"` and `"1"`; Plan 12
`checkEinvoiceDraft(draft, issueDate)` returns `[]` for it; a client
with `country "AE"` and no TRN gives a draft that the check refuses
with `BUYER_TRN_REQUIRED` (the product passes that refusal through).

`invoice-handoff.test.ts` (issued invoice I with client K holding a
TRN; `FakeEInvoiceProvider` in the test app):
- `invoice_reaches_ledger_once`:
  - record then hand-off: `recordInvoiceVat` creates one sale document
    with `source "project-invoice"`; `handOffInvoice` gives 409
    `INVOICE_IN_VAT_LEDGER`.
  - hand-off then record (fresh invoice J): `handOffInvoice` stores
    `einvoiceId`; `recordInvoiceVat` gives 409 `INVOICE_HANDED_OFF`;
    after Plan 12 `sendEinvoice` with an accepting fake, exactly one
    active sale document exists with J's number, and J's view shows
    its id as `vatDocumentId`.
  - repeat: `recordInvoiceVat` twice on I and `handOffInvoice` twice
    on J each leave one document and one e-invoice.
- `draft_invoice_refused`: both actions on a draft give 409
  `INVOICE_NOT_ISSUED`.
- `voided_vat_document_allows_handoff`: after `recordInvoiceVat` on
  I, voiding that VAT document in Plan 12 lets `handOffInvoice`
  succeed; after an accepting send, exactly one active sale document
  holds I's number.
- `period_filed_passes_through`: record on an invoice dated in a
  period marked filed gives 409 `PERIOD_FILED` and nothing is stored.
- `void_after_handoff_refused`: `voidInvoice` on J gives 409
  `INVOICE_NOT_VOIDABLE`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test to-einvoice
  invoice-handoff`. Expected: FAIL.
- [ ] **Step 3: Implement** `to-einvoice.ts`, then `handoff.ts` and
  the routes.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS;
  `FINANCE_ROUTES.length === 65`.
- [ ] **Step 5: Commit** `feat(finance): e-invoicing hand-off`.

### Task 9: Business trips, per diem, itinerary and tickets (F8)

**Files:**
- Create: `packages/contract/src/finance/trips.ts`,
  `packages/api/migrations/1608_trips.sql`,
  `packages/api/src/finance/trips/per-diem.ts` (pure),
  `src/finance/trips/provider.ts` (port, null provider, payload
  parser), `src/finance/trips/trips.ts`,
  `src/finance/trips/subject.ts`, `src/finance/trips/itinerary.ts`,
  `src/finance/trips/tickets.ts`, `src/finance/trips/claim.ts`,
  `src/routes/finance-trips.ts`, `tests/helpers/fake-travel.ts`
- Modify: `packages/api/src/deps.ts` (`travelProvider`, default
  `nullTravelProvider`), `src/finance/costs/loaders.ts` (append the
  `trip` loader), `src/app.ts` (add `tripSubject`), contract
  `routes-finance.ts`, `errors.ts`, `examples.ts`, `index.ts`,
  `tests/routes-finance.test.ts`; api `tests/helpers/test-app.ts`
  (inject `FakeTravelProvider`), `tests/leak.test.ts`,
  `tests/conformance.test.ts`
- Test: `packages/api/tests/per-diem.test.ts`, `tests/trips.test.ts`,
  `tests/trip-itinerary.test.ts`

**Interfaces:**
- Consumes: Task 1 `financeAudit`; Task 5 `requireActiveProject`;
  Task 6 `CostItem`, `COST_LOADERS`, `budgetFact`,
  `refreshBudgetAlerts`; Plan 6 `getPolicy`, `pickRate`,
  `openRequest`, `cancelRequest`, `SubjectHandler`, claim create
  (export it as `createClaim(ctx, body: ExpenseClaimCreate):
  Promise<ExpenseClaim>`); Plan 3 `loadEmployee`, `viewerScope`,
  `dubaiDate`; Plan 12 error code `PROVIDER_NOT_CONFIGURED`.
- Produces (contract):
  - `TripStatus = z.enum(["draft","submitted","returned","approved",
    "rejected","cancelled","completed"])`; `CostKind =
    z.enum(["flight","hotel","ground","other"])`.
  - `TripBody { purpose: 3..300; destinations: { city: 1..80;
    country: ^[A-Z]{2}$ }[] 1..10; startDate: IsoDate; endDate:
    IsoDate; projectId: Id | null; perDiemCategoryId: Id | null;
    perDiemRateCode: ^[a-z][a-z0-9-]{0,31}$ | null; estimatedCosts: {
    kind: CostKind; amount: Money; note: max 200 | null }[] 0..20 }`
    refined: `endDate >= startDate`, at most 90 days; `TripCreate =
    TripBody & { employeeId?: Id }`; `TripUpdate` = partial of
    `TripBody`; `TripCancel { note: 3..500 }`.
  - `PerDiemEstimate { days: int >= 1; daily: Money | null; total:
    Money | null; reason: "no-rate-code" | "no-rate" | null }`.
  - `SegmentKind = z.enum(["flight","hotel","rail","car","other"])`;
    `TripSegmentInput { kind; carrier: 1..80 | null; reference: 1..40
    | null; from: 1..80; to: 1..80 | null; departAt: Timestamp | null;
    arriveAt: Timestamp | null; cost: Money | null }`; `TripSegment =
    TripSegmentInput & { index: int >= 0; source: "manual" |
    "provider" }`; `SegmentsPut { segments: TripSegmentInput[] 0..50
    }` (replaces the manual segments; provider segments stay).
  - `ImportBooking { reference: 1..40 }`.
  - `TicketStatus = z.enum(["recorded","used","refund-recorded",
    "void"])`; `TicketCreate { ticketNumber: ^[A-Z0-9-]{3,20}$;
    passengerEmployeeId?: Id; segmentIndexes: int[] 0..20; fare:
    Money; issuedBy: 1..120; issuedOn: IsoDate }`; `TicketUpdate {
    status?: TicketStatus; note?: 3..300 }`; `TripTicket =
    TicketCreate & { id; tripId; passengerEmployeeId; status }`.
  - `Trip = TripBody & { id; employeeId; employeeName; status;
    perDiem: PerDiemEstimate; estimateTotal: Money; segments:
    TripSegment[]; tickets: TripTicket[]; claimId: Id | null;
    approval: ApprovalView | null; createdAt; note: typeof
    TRAVEL_NOTE }`; `TripQuery { employeeId?; status?; from?; to? }`.
  - Routes (12): `listTrips GET /v1/trips`, `createTrip POST
    /v1/trips` (201), `getTrip GET /v1/trips/{id}`, `updateTrip PATCH
    /v1/trips/{id}`, `submitTrip POST /v1/trips/{id}/submit`,
    `cancelTrip POST /v1/trips/{id}/cancel`, `completeTrip POST
    /v1/trips/{id}/complete`, `putTripSegments PUT
    /v1/trips/{id}/segments`, `importTripBooking POST
    /v1/trips/{id}/import-booking`, `createTripClaim POST
    /v1/trips/{id}/claim` (all ALL_ROLES with the visibility below);
    `addTripTicket POST /v1/trips/{id}/tickets` (PAYROLL, 201),
    `updateTripTicket PATCH /v1/trip-tickets/{id}` (PAYROLL).
  - Error codes: `TRIP_NOT_EDITABLE` 409, `TRIP_NOT_CANCELLABLE` 409,
    `TRIP_NOT_APPROVED` 409, `TRIP_NOT_ENDED` 409,
    `TRIP_PER_DIEM_NOT_PRICED` 422, `TRIP_PROBLEMS` 422 (detail
    `problems`: `PROJECT_NOT_FOUND`, `CATEGORY_NOT_PER_DIEM`,
    `SEGMENT_INDEX_UNKNOWN`), `TICKET_NUMBER_TAKEN` 409,
    `PROVIDER_DATA_INVALID` 422, `BOOKING_NOT_FOUND` 404.
- Produces (api):
  - Migration 1608: `trips(id, company_id, employee_id, purpose,
    destinations jsonb, start_date, end_date, project_id,
    per_diem_category_id, per_diem_rate_code, estimated_costs jsonb,
    status, approval_id, claim_id, cancel_note, created_by,
    created_at)`; `trip_segments(company_id, trip_id, idx, kind,
    carrier, reference, from_place, to_place, depart_at, arrive_at,
    cost bigint null, source, live boolean)`; `trip_tickets(id,
    company_id, trip_id, ticket_number, passenger_employee_id,
    segment_indexes int[], fare bigint, issued_by, issued_on, status,
    note, created_at)`, unique `(company_id, ticket_number)` where
    `status <> 'void'`. Grants select, insert, update.
  - `per-diem.ts` (pure): `tripDays(start: string, end: string):
    number` (calendar days inclusive; Ruling 20);
    `perDiemEstimate(t: { startDate; endDate; perDiemRateCode: string
    | null }, rates: { code; daily: Fils; effectiveFrom }[]):
    PerDiemEstimateF` (no code: `daily null`, `total null`, reason
    `no-rate-code`; Plan 6 `pickRate(rates, code, startDate)` null:
    reason `no-rate`; else `total = BigInt(days) * daily`). Never a
    zero in place of a missing rate.
  - `provider.ts`:

    ```ts
    interface TravelProvider {
      readonly name: string;
      fetchBooking(reference: string):
        Promise<{ kind: "found"; payload: unknown }
          | { kind: "not-found" }>;
    }
    ```

    `nullTravelProvider`: throws `ApiError(409,
    "PROVIDER_NOT_CONFIGURED")`. `parseBooking(payload: unknown):
    TripSegmentInput[]` (zod: `{ segments: TripSegmentInput[] 1..50
    }`, unknown keys stripped; JSON text over 262144 bytes or a
    failed parse gives `ApiError(422, "PROVIDER_DATA_INVALID")`).
    The port reads bookings made elsewhere; it has no method that
    books, holds, issues or pays (Ruling 21).
  - `fake-travel.ts`: `class FakeTravelProvider implements
    TravelProvider` with `bookings: Map<string, unknown>`.
  - `trips.ts`: create (an employee for self; PAYROLL for anyone;
    project active; a per diem category must be a Plan 6 category of
    kind `per-diem`), patch (traveller or creator; `draft` or
    `returned`), `submitTrip(ctx, handlers, id)` (`openRequest(ctx,
    handlers, "trip", id, user)`), cancel (traveller or PAYROLL for
    `draft`, `returned`, `submitted`; PAYROLL for `approved`; else
    409 `TRIP_NOT_CANCELLABLE`), complete (traveller or PAYROLL;
    `approved` only, else 409 `TRIP_NOT_APPROVED`; `endDate <=`
    today, else 409 `TRIP_NOT_ENDED`). Visibility: traveller,
    creator, PAYROLL, the traveller's line manager, approvers (as Plan
    6 `claimVisible`). `toTripView` computes `perDiem` from the
    current Plan 6 policy and `estimateTotal` = sum of estimates plus
    the per diem total when priced. Audit `trip.created`, `.updated`,
    `.submitted`, `.cancelled`, `.completed` (`data: { tripId }`).
  - `tripSubject: SubjectHandler`: claimant = traveller, line manager
    of the traveller, `total = estimateTotal`, `overLimit` =
    `budgetFact(...)` over the trip's committed items, `flagCodes`
    with `"PER_DIEM_NOT_PRICED"` when `perDiem.total` is null and
    `"OVER_BUDGET"` when over; `onClosed` sets the status and calls
    `refreshBudgetAlerts` on `approved`.
  - `trip` cost loader: trips in `approved`, stage `committed`, date
    `start_date`, one item per estimate (category null) and one for a
    priced per diem (category `per_diem_category_id`), department the
    traveller's, project the trip's. `completed` and `cancelled` trips
    add nothing (actuals arrive through claims, bills and cards).
  - `itinerary.ts`: put segments (traveller or PAYROLL; not
    `cancelled`), `importTripBooking(ctx, id, ref)`
    (`deps.travelProvider.fetchBooking`; `not-found` gives 404
    `BOOKING_NOT_FOUND`; `parseBooking`; appends segments with source
    `provider`). Audit `trip.segments-updated`, `trip.booking-imported`
    (`data: { tripId, segmentCount }`).
  - `tickets.ts`: add (segment indexes must exist: problem
    `SEGMENT_INDEX_UNKNOWN`; duplicate number 409
    `TICKET_NUMBER_TAKEN`), update. Audit `trip-ticket.recorded`,
    `trip-ticket.updated` (`data: { tripId, status }`).
  - `claim.ts`: `createTripClaim(ctx, id)`: trip `approved` or
    `completed` (else 409 `TRIP_NOT_APPROVED`); `claim_id` set returns
    the trip as it is (idempotent); per diem not priced or no
    category gives 422 `TRIP_PER_DIEM_NOT_PRICED`; else Plan 6
    `createClaim` for the traveller with one `per-diem` item (`date:
    startDate`, `days: tripDays`, `rateCode`, `categoryId`,
    `projectId`, `description "Per diem: <first city>"`) and stores
    `claim_id`. The claim is a Plan 6 draft; the traveller submits it
    through Plan 6. Audit `trip.claim-created` (`data: { tripId,
    claimId }`).

- [ ] **Step 1: Write the failing tests**

`per-diem.test.ts` (pure): `tripDays("2026-12-01","2026-12-03") ===
3`; same day is 1; across 2028-02-28 to 2028-03-01 is 3; rate `dxb`
daily 300.00 from 2026-01-01: estimate 3 days gives `total 90000n`;
code `null` gives reason `no-rate-code` and `total null`; code
`"xyz"` gives `no-rate`; a trip starting before the rate's
`effectiveFrom` gives `no-rate`.

`trips.test.ts` (Plan 6 policy with per diem rate `dxb`, per diem
category PD; employee E with line manager M):
- `trip_flow`: E creates (3 days, flight estimate 1500.00, rate
  `dxb`), submits; M approves: status `approved`, `estimateTotal
  "2400.00"`, `note` equals `TRAVEL_NOTE`.
- `unpriced_per_diem_flagged_not_zero`: no rate code: `perDiem.total
  null`, `estimateTotal "1500.00"`, the approval task's `flagCodes`
  holds `"PER_DIEM_NOT_PRICED"`.
- `traveller_cannot_approve`: E deciding gives 403 `SOD_VIOLATION`.
- `trip_commitment_in_budget`: E's department budget shows
  `committed "2400.00"` after approval and `"0.00"` after
  `completeTrip` (once `endDate` has passed with an injected clock).
- `trip_claim_once`: `createTripClaim` twice gives one Plan 6 draft
  claim with one `per-diem` item of 3 days and `rateCode "dxb"`; the
  trip shows its `claimId`.
- `claim_needs_priced_per_diem`: a trip without a rate code gives 422
  `TRIP_PER_DIEM_NOT_PRICED`.
- `other_employee_404`: another employee gets 404 on E's trip.

`trip-itinerary.test.ts`:
- `import_booking_with_fake`: `FakeTravelProvider` booking `ABC123`
  with two flight segments: import appends two `provider` segments;
  a later `putTripSegments` replaces only manual ones.
- `null_provider_refuses`: with `nullTravelProvider`, import gives 409
  `PROVIDER_NOT_CONFIGURED`.
- `bad_payload_refused`: a payload `{ segments: [{ kind: "rocket" }] }`
  gives 422 `PROVIDER_DATA_INVALID`; a segment with
  `carrier: "<b>x</b>"` is stored as that text and returned as data.
- `ticket_number_unique`: a second active `176-1234567890` gives 409
  `TICKET_NUMBER_TAKEN`; after voiding the first it is accepted.
- `ticket_segment_check`: `segmentIndexes [9]` on a two-segment trip
  gives 422 `TRIP_PROBLEMS` with `SEGMENT_INDEX_UNKNOWN`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test per-diem trip`.
  Expected: FAIL.
- [ ] **Step 3: Implement** `per-diem.ts` and `provider.ts`, then
  trips, subject, loader, itinerary, tickets, claim and routes.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS;
  `FINANCE_ROUTES.length === 77`.
- [ ] **Step 5: Commit** `feat(finance): business trips and tickets`.

### Task 10: Corporate card partner interface (F9)

Partner port and card data task: fresh per-task review.

**Files:**
- Create: `packages/contract/src/finance/cards.ts`,
  `packages/api/migrations/1609_cards.sql`,
  `packages/api/src/finance/cards/issuer.ts` (port, null issuer,
  payload parsers), `src/finance/cards/feed.ts` (pure),
  `src/finance/cards/sync.ts`, `src/finance/cards/cards.ts`,
  `src/finance/cards/actions.ts`, `src/finance/cards/transactions.ts`,
  `src/routes/finance-cards.ts`, `tests/helpers/fake-issuer.ts`
- Modify: `packages/api/src/deps.ts` (`cardIssuer`, default
  `nullCardIssuer`), `src/finance/costs/loaders.ts` (append the
  `card` loader), contract `routes-finance.ts`, `errors.ts`,
  `examples.ts`, `index.ts`, `tests/routes-finance.test.ts`; api
  `src/app.ts`, `tests/helpers/test-app.ts` (inject
  `FakeCardIssuer`), `tests/leak.test.ts`, `tests/conformance.test.ts`
- Test: `packages/api/tests/card-feed.test.ts`, `tests/cards.test.ts`,
  `tests/card-transactions.test.ts`

**Interfaces:**
- Consumes: Task 1 `financeAudit`; Task 5 `requireActiveProject`;
  Task 6 `CostItem`, `COST_LOADERS`; Plan 6 receipts (`receiptVisible`,
  receipt owner); Plan 3 `loadEmployee`, `dubaiDate`,
  `Idempotency-Key` handling (as `createPayRun`).
- Produces (contract):
  - `CardStatus = z.enum(["active","frozen","closed"])`; `CardLimit {
    amount: Money; period: "monthly" | "per-transaction" }`.
  - `Card { id; issuerCardId: string; last4: ^\d{4}$; holderName;
    employeeId: Id | null; departmentId: Id | null; status:
    CardStatus; limit: CardLimit | null; lastSyncedAt: Timestamp;
    note: typeof CARD_NOTE }` (no PAN, CVV or expiry field exists).
  - `CardLink { employeeId: Id | null; departmentId: Id | null }`;
    `CardLimitRequest = CardLimit`; `CardActionResult { outcome:
    "done" | "refused" | "unavailable"; issuerCode: string | null;
    card: Card }`.
  - `TxnStatus = z.enum(["pending","settled","reversed"])`;
    `CardTransaction { id; cardId; last4; employeeId: Id | null;
    occurredAt: Timestamp; merchant: string; mcc: ^\d{4}$ | null;
    amount: Money; originalCurrency: string | null; originalAmount:
    string | null; status: TxnStatus; categoryId: Id | null;
    projectId: Id | null; receiptId: Id | null; note: string | null;
    missingReceipt: boolean }`; `CardTxnUpdate { categoryId?: Id |
    null; projectId?: Id | null; receiptId?: Id | null; note?: max
    300 | null }`; `CardTxnQuery { cardId?; status?; from?; to?;
    missingReceipt?: boolean }`.
  - `CardSyncResult { cards: { created: int; updated: int };
    transactions: { created: int; updated: int; duplicates: int;
    unknownCard: int; unreadable: int } }`.
  - Routes (10): `listCards GET /v1/cards` (PAYROLL), `getCard GET
    /v1/cards/{id}` (ALL_ROLES; holder or PAYROLL), `syncCards POST
    /v1/cards/sync` (PAYROLL), `linkCard POST /v1/cards/{id}/link`
    (PAYROLL), `setCardLimit POST /v1/cards/{id}/limit` (OWNER, mfa,
    header `Idempotency-Key`), `freezeCard POST
    /v1/cards/{id}/freeze` (ALL_ROLES; holder or PAYROLL; header
    `Idempotency-Key`), `unfreezeCard POST /v1/cards/{id}/unfreeze`
    (OWNER, mfa, header `Idempotency-Key`), `listMyCards GET
    /v1/me/cards` (ALL_ROLES), `listCardTransactions GET
    /v1/card-transactions` (ALL_ROLES; own cards unless PAYROLL),
    `updateCardTransaction PATCH /v1/card-transactions/{id}`
    (ALL_ROLES; holder or PAYROLL).
  - Error codes: reuse Plan 12 `PROVIDER_NOT_CONFIGURED` 409; new
    `CARD_CLOSED` 409, `CARD_NOT_LINKED` 409, `RECEIPT_NOT_HOLDERS`
    422.
- Produces (api):
  - Migration 1609: `cards(id, company_id, issuer_card_id, last4,
    holder_name, employee_id, department_id, status, limit_amount
    bigint null, limit_period, last_synced_at)`, unique `(company_id,
    issuer_card_id)`; `card_transactions(id, company_id, card_id,
    issuer_txn_id, occurred_at, merchant, mcc, amount bigint,
    original_currency, original_amount, status, category_id,
    project_id, receipt_id, note, created_at, updated_at)`, unique
    `(company_id, issuer_txn_id)`; `card_cursor(company_id pk,
    cards_cursor, txn_cursor)`; `card_actions(company_id,
    idempotency_key, card_id, action, request_hash, result jsonb,
    created_at, pk (company_id, idempotency_key))`. Grants select,
    insert, update. No column for a card number.
  - `issuer.ts`:

    ```ts
    type IssuerActionResult =
      | { kind: "done"; card: unknown }
      | { kind: "refused"; code: string }
      | { kind: "unavailable" };
    interface CardIssuer {
      readonly name: string;
      listCards(cursor: string | null):
        Promise<{ cards: unknown[]; cursor: string | null }>;
      fetchTransactions(cursor: string | null):
        Promise<{ transactions: unknown[]; cursor: string | null }>;
      setLimit(issuerCardId: string, limit: { amount: string;
        period: "monthly" | "per-transaction" }, key: string):
        Promise<IssuerActionResult>;
      freeze(issuerCardId: string, key: string):
        Promise<IssuerActionResult>;
      unfreeze(issuerCardId: string, key: string):
        Promise<IssuerActionResult>;
    }
    ```

    No method creates, issues, loads, tops up, pays or moves funds
    (Ruling 22). `nullCardIssuer`: every method throws `ApiError(409,
    "PROVIDER_NOT_CONFIGURED")`. `parseIssuerCard(x: unknown):
    IssuerCardF | null` and `parseIssuerTxn(x: unknown): IssuerTxnF |
    null` (zod with unknown keys stripped, so a `pan`, `cvv` or
    `expiry` key is dropped before anything is stored; `last4`
    `^\d{4}$`; amounts `Money` in AED; merchant cut to 120 characters;
    status one of `TxnStatus`; `null` when unreadable).
  - `fake-issuer.ts`: `class FakeCardIssuer implements CardIssuer`
    with `cards`, `transactions` (arrays served from an index cursor),
    `script: IssuerActionResult[]` (consumed in order, default `done`
    with the card updated), `calls: { method; key }[]`; the same key
    twice returns the first result.
  - `feed.ts` (pure): `nextTxnState(current: { status: TxnStatus;
    amount: Fils } | null, incoming: { status: TxnStatus; amount: Fils
    }): { action: "insert" | "update" | "duplicate" | "ignore";
    status: TxnStatus; amount: Fils }`: no current gives `insert`;
    the same status and amount gives `duplicate`; `pending` to
    `settled` or `reversed`, and `settled` to `reversed`, give
    `update` with the incoming amount (a settled amount may differ
    from the pending one); any move back (`settled` to `pending`,
    `reversed` to anything) gives `ignore`; a new amount on a settled
    transaction gives `ignore` (Ruling 23).
  - `sync.ts`: `syncCards(ctx): Promise<CardSyncResult>`: pulls cards
    from the stored cursor (upsert on `issuer_card_id`; status, limit,
    holder name and last4 from the partner; new cards are unlinked),
    then transactions (`parseIssuerTxn`; unknown card counted
    `unknownCard`, unreadable counted, neither stored; else
    `nextTxnState` against the row on `issuer_txn_id`); stores both
    cursors. Audit `card.synced` (`data: counts only`).
  - `cards.ts`: list, get, `listMyCards`, link (employee and
    department must exist). Audit `card.linked` (`data: { cardId }`).
  - `actions.ts`: `cardAction(ctx, id, action: "limit" | "freeze" |
    "unfreeze", key, body?)`: the same key returns the stored result
    (Plan 3 pattern via `card_actions`); a `closed` card gives 409
    `CARD_CLOSED`; freeze by a non-PAYROLL caller needs the card
    linked to the caller's employee (else 404). Every refusal runs
    before the issuer call, and no outcome throws after it: `done`
    updates the local card from `parseIssuerCard`, `refused` returns
    `outcome "refused"` with `issuerCode`, `unavailable` returns
    `outcome "unavailable"`; each stores its result and returns 200.
    The local status and limit change only from the partner's `done`
    reply, never from the request alone. Audit `card.limit-requested`,
    `card.freeze-requested`, `card.unfreeze-requested` (`data: {
    cardId, outcome }`).
  - `transactions.ts`: list (holder sees transactions of cards linked
    to their employee; PAYROLL all), update (holder or PAYROLL; a
    receipt must be a Plan 6 receipt of the holder, else 422
    `RECEIPT_NOT_HOLDERS`; project active); `missingReceipt` = settled,
    no `receiptId`. Audit `card-transaction.updated` (`changed`).
  - `card` cost loader: `settled` transactions only, stage `actual`,
    date the Dubai date of `occurred_at`, amount, department = the
    card's `department_id` or the linked employee's, project and
    category from the transaction, `cardId`, `employeeId`. Pending and
    reversed add nothing.

- [ ] **Step 1: Write the failing tests**

`card-feed.test.ts` (pure): null current gives `insert`; pending 100
to pending 100 gives `duplicate`; pending 100 to settled 98 gives
`update` with 98; settled 98 to reversed gives `update`; settled to
pending gives `ignore`; reversed to settled gives `ignore`; settled 98
to settled 99 gives `ignore`.

`cards.test.ts` (`FakeCardIssuer` with card C, last4 `"4242"`, and a
payload field `pan: "4111111111111111"` plus `cvv: "123"`):
- `sync_links_and_no_pan`: sync creates C unlinked with `last4
  "4242"`; no column of any table in the database holds
  `4111111111111111` or `"123"` as a cvv (scan with a query over
  `information_schema.columns` text columns of finance tables); no
  response body or audit row holds them.
- `null_issuer_refuses`: with `nullCardIssuer`, sync gives 409
  `PROVIDER_NOT_CONFIGURED`.
- `limit_needs_owner_mfa`: hr gets 403; owner without MFA 403; owner
  with MFA and key `k1`: `outcome "done"`, the fake recorded one
  `setLimit` call; the same key again returns the same result and the
  fake has still one call.
- `refused_and_unavailable_do_not_change_card`: scripted `refused`
  gives 200 `outcome "refused"` and `issuerCode`, the local limit is
  unchanged; scripted `unavailable` gives `outcome "unavailable"`.
- `holder_can_freeze_not_unfreeze`: the linked employee freezes C:
  `done`, status `frozen`; the same employee calling unfreeze gives
  403; another employee freezing C gives 404.
- `card_note_on_every_card`: `listCards`, `getCard` and `listMyCards`
  items carry `note` equal to `CARD_NOTE`.

`card-transactions.test.ts`:
- `card_feed_duplicate_and_reversal` (Review Focus 4): the fake
  serves T1 pending 100.00, then T1 again, then T1 settled 98.00, then
  T2 settled 50.00 and T2 reversed: rows T1 settled `"98.00"` and T2
  reversed; sync results count one `duplicates`; the budget for the
  card's department shows `actual "98.00"`.
- `unknown_card_not_stored`: a transaction for an unknown card id is
  counted `unknownCard` and not stored.
- `holder_sees_own_only`: the holder lists only C's transactions;
  another employee gets an empty list and 404 on T1.
- `receipt_must_be_holders`: attaching another employee's receipt
  gives 422 `RECEIPT_NOT_HOLDERS`; the holder's own receipt clears
  `missingReceipt`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test card`.
  Expected: FAIL.
- [ ] **Step 3: Implement** `feed.ts` and `issuer.ts`, then sync,
  cards, actions, transactions, the loader and routes.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS;
  `FINANCE_ROUTES.length === 87`.
- [ ] **Step 5: Commit** `feat(finance): card partner interface`.

### Task 11: Accounting export and adapter interface (F10)

**Files:**
- Create: `packages/contract/src/finance/accounting.ts`,
  `packages/api/migrations/1610_accounting.sql`,
  `packages/api/src/finance/accounting/records.ts` (pure builder),
  `src/finance/accounting/csv.ts` (pure),
  `src/finance/accounting/adapter.ts` (port),
  `src/finance/accounting/mappings.ts`,
  `src/finance/accounting/exports.ts`,
  `src/routes/finance-accounting.ts`,
  `tests/helpers/fake-accounting.ts`
- Modify: `packages/api/src/deps.ts` (`accountingAdapters`, default
  `{}`), Plan 7 `src/storage/fs-blob.ts` (key pattern adds
  `accounting-exports`), contract `routes-finance.ts`, `errors.ts`,
  `examples.ts`, `index.ts`, `tests/routes-finance.test.ts`; api
  `src/app.ts`, `tests/leak.test.ts`, `tests/conformance.test.ts`
- Test: `packages/api/tests/accounting-records.test.ts`,
  `tests/accounting-exports.test.ts`

**Interfaces:**
- Consumes: Task 1 `financeAudit`, `formatQty`; Tasks 3, 4, 7, 10
  tables (bills, paid bills, issued invoices, settled card
  transactions); Plan 6 reimbursed claims; Plan 12 tax categories;
  Plan 6 `toCsv`; Plan 7 `encryptBytes`, `decryptBytes`,
  `contentDisposition`.
- Produces (contract):
  - `AccountingTarget = z.enum(["zoho-books","quickbooks","xero",
    "wafeq","generic-file"])`; `ACCOUNTING_TARGET_LABELS = {
    "zoho-books": "Zoho Books", quickbooks: "QuickBooks", xero:
    "Xero", wafeq: "Wafeq", "generic-file": "File only" }`.
  - `MappingKind = z.enum(["expense-category","tax-category",
    "payable-control","receivable-control","vat-input","vat-output",
    "card-clearing","bank"])`; `AccountMapping { kind: MappingKind;
    refId: Id | null; accountCode: ^[A-Za-z0-9.-]{1,30}$ }` refined:
    `refId` set exactly for `expense-category` and `tax-category`;
    `AccountMappingsPut { mappings: AccountMapping[] 0..1000;
    expectedVersion: int >= 0 }`; `AccountMappings { version;
    mappings }`.
  - `RecordType = z.enum(["bill","bill-payment","invoice",
    "expense-claim","card-transaction"])`; `AccountingLine {
    accountCode: string | null; description; net: Money; vat: Money;
    taxCategoryCode: string | null; projectCode: string | null;
    departmentName: string | null }`; `AccountingRecord { recordType;
    recordId: Id; date: IsoDate; reference: string; counterparty:
    string | null; controlAccountCode: string | null; lines:
    AccountingLine[]; total: Money }`.
  - `ExportCreate { target: AccountingTarget; from: IsoDate; to:
    IsoDate; include: RecordType[] 1..5; includeExported: boolean }`
    (at most 366 days); `AccountingExport { id; target; from; to;
    recordCount: int; unmappedLineCount: int; skippedExported: int;
    status: "created" | "pushed" | "push-rejected" | "push-failed";
    pushErrors: { code: string; message: string }[]; createdAt;
    note: typeof ACCOUNTING_EXPORT_NOTE }`; `ExportDownloadQuery {
    format: "json" | "csv" }`; `AccountingTargetView { target; label;
    connected: boolean; note: typeof NOT_CONNECTED_NOTE | null }`.
  - Routes (8): `getAccountMappings GET /v1/accounting/mappings`
    (PAYROLL), `putAccountMappings PUT /v1/accounting/mappings`
    (PAYROLL), `createAccountingExport POST /v1/accounting/exports`
    (PAYROLL, mfa, 201), `listAccountingExports GET
    /v1/accounting/exports` (PAYROLL), `getAccountingExport GET
    /v1/accounting/exports/{id}` (PAYROLL),
    `downloadAccountingExport GET /v1/accounting/exports/{id}/download`
    (PAYROLL, mfa, `binary`, `binaryTypes ["application/json",
    "text/csv"]`), `pushAccountingExport POST
    /v1/accounting/exports/{id}/push` (PAYROLL, mfa, header
    `Idempotency-Key`), `listAccountingTargets GET
    /v1/accounting/targets` (PAYROLL).
  - Error codes: `MAPPINGS_VERSION_CONFLICT` 409, `MAPPINGS_INVALID`
    422 (detail `paths`; duplicate `(kind, refId)` or an unknown
    `refId`), `NOTHING_TO_EXPORT` 422; reuse
    `PROVIDER_NOT_CONFIGURED` 409.
- Produces (api):
  - Migration 1610: `account_mappings(company_id pk, version,
    mappings jsonb, updated_by, updated_at)`; `accounting_exports(id,
    company_id, target, from_date, to_date, record_count,
    unmapped_line_count, skipped_exported, status, push_errors jsonb,
    blob_key, sha256, created_by, created_at)`;
    `accounting_export_items(company_id, export_id, target,
    record_type, record_id)`, index `(company_id, target,
    record_type, record_id)`; `accounting_pushes(company_id,
    idempotency_key, export_id, result jsonb, pk (company_id,
    idempotency_key))`. Grants select, insert, update.
  - `records.ts` (pure): `buildRecords(src: RecordSources, map:
    MappingLookup): { records: AccountingRecordF[]; unmapped: number
    }` where `MappingLookup = (kind: MappingKind, refId: string |
    null) => string | null`. Per type: `bill` (date `billDate`, one
    line per bill line with the expense category's account, the
    bill's VAT on the first line, control `payable-control`);
    `bill-payment` (date `paidOn`, one line to `payable-control`,
    control `bank`, reference the payment reference); `invoice` (date
    `issueDate`, one line per invoice line with the tax category's
    account, control `receivable-control`); `expense-claim`
    (reimbursed claims, date the decision's Dubai date, one line per
    item, control `payable-control`); `card-transaction` (settled,
    one line with the category's account, control `card-clearing`).
    A missing mapping leaves `accountCode null` and counts in
    `unmapped`; the export is still produced (Ruling 26). `total` =
    sum of net plus VAT.
  - `csv.ts` (pure): `recordsCsv(records): string` = `toCsv(
    ACCOUNTING_EXPORT_NOTE, ["record_type","record_id","date",
    "reference","counterparty","control_account","account",
    "description","net_aed","vat_aed","tax_category","project",
    "department"], one row per line)`.
  - `adapter.ts`:

    ```ts
    type PushResult =
      | { kind: "accepted"; externalIds: Record<string, string> }
      | { kind: "rejected"; errors: { code: string;
          message: string }[] }
      | { kind: "unavailable" };
    interface AccountingAdapter {
      readonly target: AccountingTarget;
      push(records: AccountingRecord[], key: string):
        Promise<PushResult>;
    }
    ```

    No adapter for a named target ships (Ruling 25);
    `AppDeps.accountingAdapters: Partial<Record<AccountingTarget,
    AccountingAdapter>>`. `fake-accounting.ts`: `FakeAccountingAdapter`
    with `pushed` and a `script`.
  - `mappings.ts`: get (no row: version 0, empty), put (version
    check; validation as the error codes say). Audit
    `account-mappings.updated` (`data: { version, count }`).
  - `exports.ts`: create (loads sources in range for the included
    types; without `includeExported`, records with an item row for
    the same target are skipped and counted; nothing left gives 422
    `NOTHING_TO_EXPORT`; builds records; stores canonical JSON
    encrypted under `"<companyId>/accounting-exports/<id>"`; inserts
    item rows); download (`json` gives the canonical JSON with `note`
    first, `csv` gives `recordsCsv`; sha256 checked); push (the same
    key returns the stored result; no adapter for the target gives
    409 `PROVIDER_NOT_CONFIGURED`; the adapter call is the last step
    and no outcome throws after it; status from the result). Audit
    `accounting-export.created`, `.downloaded`, `.pushed` (`data: {
    exportId, target, recordCount }`).

- [ ] **Step 1: Write the failing tests**

`accounting-records.test.ts` (pure):
- `bill_record_lines`: a bill with two lines (categories C1 mapped to
  `6100`, C2 unmapped) and VAT 15.00 gives one record with lines
  `6100` and `null`, VAT on the first line, `controlAccountCode`
  from `payable-control`, `unmapped 1`, `total` equal to net plus VAT.
- `payment_record`: a paid bill gives a `bill-payment` record dated
  `paidOn` with control `bank`.
- `invoice_record`: an issued invoice gives lines with the tax
  category's account and control `receivable-control`.
- `card_record_settled_only`: a reversed transaction gives no record.

`accounting-exports.test.ts`:
- `export_and_skip_exported`: an export to `xero` of bills gives
  `recordCount 2`; a second export to `xero` gives 422
  `NOTHING_TO_EXPORT`; with `includeExported` it gives 2 again; an
  export to `wafeq` gives 2 (per-target tracking).
- `csv_has_note_and_layout`: the CSV's first line is
  `ACCOUNTING_EXPORT_NOTE` and the header is the column list above;
  a description starting with `+` is written with a leading `'`.
- `push_not_connected`: push to `quickbooks` with no adapter gives 409
  `PROVIDER_NOT_CONFIGURED`; with `FakeAccountingAdapter` for
  `zoho-books` scripted `accepted`, status `pushed`; the same key
  again returns the stored result and the fake saw one call; scripted
  `rejected` gives status `push-rejected` with the errors.
- `targets_listed_not_connected`: `listAccountingTargets` gives five
  targets, each `connected false` and `note` equal to
  `NOT_CONNECTED_NOTE` when no adapter is injected.
- `mappings_validation`: two rows for one `(expense-category, C1)`
  give 422 `MAPPINGS_INVALID`; a stale version gives 409.
- `export_needs_mfa`: create and download without MFA give 403.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test accounting`.
  Expected: FAIL.
- [ ] **Step 3: Implement** `records.ts` and `csv.ts`, then the
  adapter port, mappings, exports and routes.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS;
  `FINANCE_ROUTES.length === 95`.
- [ ] **Step 5: Commit** `feat(finance): accounting export interface`.

### Task 12: Spend reports, leak and copy checks, handover (F10)

**Files:**
- Create: `packages/contract/src/finance/reports.ts`,
  `packages/api/src/finance/reports/aging.ts` (pure),
  `src/finance/reports/group.ts` (pure),
  `src/finance/reports/reports.ts`, `src/routes/finance-reports.ts`
- Modify: contract `routes-finance.ts`, `examples.ts`, `index.ts`,
  `tests/routes-finance.test.ts`, `tests/finance-copy.test.ts`; api
  `src/app.ts`, `tests/leak.test.ts`, `tests/conformance.test.ts`;
  `HANDOVER.md`, `LEDGER.md`
- Test: `packages/api/tests/finance-aging.test.ts`,
  `tests/finance-reports.test.ts`, `tests/finance-leak.test.ts`

**Interfaces:**
- Consumes: Task 6 `loadCostItems`, `budgetStatus`; Task 3 bills;
  Task 10 cards; Task 1 `getFinanceSettings`; Plan 6 `toCsv`,
  `text/csv-optional`; Plan 8 employee exit fields (`status`,
  `lastWorkingDate`; read as columns of `employees`, or Plan 3's
  `status` when Plan 8 is absent).
- Produces (contract):
  - `SpendQuery { from: IsoDate; to: IsoDate; groupBy: "supplier" |
    "category" | "department" | "project" | "card" | "month" |
    "source"; stage: "actual" | "committed" | "both"; format?:
    "json" | "csv" }` (at most 366 days); `SpendRow { key: string |
    null; label: string; committed: Money; actual: Money; count: int
    }`; `SpendReport { rows; committed: Money; actual: Money }`.
  - `AgingQuery { asOf: IsoDate; format? }`; `AgingRow { supplierId;
    supplierName; notDue: Money; buckets: Money[]; total: Money }`;
    `AgingReport { asOf; bucketLabels: string[]; rows; totals: Money[]
    ; note: typeof PAYMENT_NOTE }` (labels from settings, e.g. `"1-30"`,
    `"31-60"`, `"61-90"`, `"91+"`).
  - `BudgetReportQuery { activeOn: IsoDate; format? }`;
    `BudgetReportRow { budgetId; name; amount: Money; committed;
    actual; remaining: SignedMoney; usedBps: int; over: boolean }`.
  - `LeaverCardRow { cardId; last4; employeeId; employeeName;
    lastWorkingDate: IsoDate | null; cardStatus: CardStatus }`;
    `LeaverCards { rows; note: typeof CARD_NOTE }`.
  - Routes (4, PAYROLL, the first three `text/csv-optional`):
    `spendReport GET /v1/finance-reports/spend`, `apAgingReport GET
    /v1/finance-reports/ap-aging`, `budgetReport GET
    /v1/finance-reports/budgets`, `leaverCardsReport GET
    /v1/finance-reports/leaver-cards`.
- Produces (api):
  - `aging.ts` (pure): `agingFor(bills: { supplierId; supplierName;
    dueDate: string; total: Fils }[], asOf: string, buckets: number[]):
    AgingF` (days overdue = `asOf - dueDate`; `<= 0` is `notDue`;
    bucket i holds days in `(buckets[i-1], buckets[i]]`, the last
    bucket everything above the last bound). Callers pass bills in
    `approved` and `scheduled` only.
  - `group.ts` (pure): `groupSpend(items: CostItem[], groupBy, stage,
    labels: ReadonlyMap<string, string>): SpendRowF[]` (null keys
    group as `"(none)"`; rows ordered by actual plus committed,
    descending, then label).
  - `reports.ts`: the four reports. `leaverCardsReport` lists cards in
    `active` or `frozen` linked to employees whose employment has
    ended or whose last working date is on or before today plus 7
    days; it only lists, it never freezes (Ruling 24).
  - Handover: `HANDOVER.md` gains a "Finance modules (Plan 16)"
    section (what is built, the four ports with no live partner, the
    notes, where the code lives) and its next step; `LEDGER.md`
    gets appended, dated entries only (the ledger is append-only):
    section 4 a line that Plan 16 is built, and a new section listing
    Rulings 1 to 33 below by number and title.

- [ ] **Step 1: Write the failing tests**

`finance-aging.test.ts` (pure, buckets `[30, 60, 90]`, asOf
2026-11-26): due 2026-11-30 is `notDue`; due 2026-11-26 is `notDue`;
due 2026-11-25 is bucket 0; due 2026-10-27 (30 days) is bucket 0;
due 2026-10-26 (31 days) is bucket 1; due 2026-08-01 is bucket 3;
row totals equal `notDue` plus the buckets.

`finance-reports.test.ts`:
- `spend_by_supplier`: two approved bills of S (100.00 and 50.00 net)
  and one of S2: rows S `actual "150.00"`, `count 2`, then S2; the CSV
  form starts with the header `key,label,committed,actual,count`.
- `spend_by_source_both`: with an open PO and a settled card
  transaction, `groupBy source` and `stage both` give rows `po`
  (committed) and `card` and `bill` (actual).
- `aging_report`: buckets match `agingFor`; `note` is `PAYMENT_NOTE`;
  paid bills are absent.
- `budget_report_signed`: an over-spent budget shows a negative
  `remaining` such as `"-200.00"`.
- `leaver_cards_listed_not_frozen`: a card linked to an employee with
  last working date yesterday is listed; after the call the fake
  issuer recorded no freeze.

`finance-leak.test.ts` (extends `tests/leak.test.ts` for every finance
route id; Review Focus classes as a whole):
- as a manager and an employee, no response body of any finance route
  they may call contains a supplier IBAN, a bank name, another
  employee's card transaction merchant, or `"iban"`;
- as an employee, every PAYROLL-only finance route gives 403;
- no audit row written during the whole finance test suite holds a
  key in `FINANCE_SENSITIVE_KEYS` (scan `audit_events.data`);
- the copy scan of Task 1 runs over every finance file and statement
  again and finds none of the banned phrases.

`routes-finance.test.ts`: `FINANCE_ROUTES.length === 99`; every route
id appears in `tests/conformance.test.ts`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test finance`.
  Expected: FAIL.
- [ ] **Step 3: Implement** the pure modules, the reports and routes,
  then update `HANDOVER.md` and `LEDGER.md`.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(finance): spend reports and handover`.

---

## Rulings

Claude's calls under the owner's standing instruction ("Don't ask me
technical stuff"); the owner can overrule any of them. Each gives the
cost if it is wrong.

1. **Integrate, never become.** The product moves no money, issues no
   card, holds no funds and books no travel; payments end as files and
   a typed "marked paid" record, cards and travel are partner ports
   (research: "integrate, do not become, a card issuer or fund
   holder"; master list tag P). Which partner and which licence route
   is a later owner business decision (tag O), not code. Cost: no
   live payments, cards or bookings until a partner is chosen and an
   adapter is written (about one task per port).
2. **`FINANCE_ROUTES` joins through `ROUTE_GROUPS`; migrations 1601 to
   1610** (1611 to 1619 free). Shared items of Plans 6, 7, 11 and 12
   are created by the first plan that needs them with the owning
   plan's exact signature. Cost: one merge of `routes.ts` and
   `primitives.ts` per plan.
3. **API and contract only.** Screens wait for the web plan after the
   owner picks a UI concept. Cost: none for correctness; demos use the
   API.
4. **One approval spine.** Purchase orders, bills and trips are new
   Plan 6 subject types with its separation-of-duty rules; none is
   WhatsApp-approvable (Plan 13 list unchanged). Payment batches use a
   simpler owner-with-MFA maker-checker (Ruling 12) because they are
   one step by design. Cost: a company that wants a chain on batches
   gets one subject type more later.
5. **One category list.** Purchase order and bill lines use Plan 6
   expense categories of kind `receipt`, so budgets and reports group
   claims, bills and cards the same way. Cost: a company with a
   separate purchasing chart adds categories it does not use for
   claims.
6. **Quantities are thousandths; a line net is quantity x unit price
   rounded HALF_UP** (`lineNet`), the rule Plan 12's e-invoice check
   applies, and minutes become hours with the same rounding. Cost: a
   0.001-hour rounding on odd minutes, shown on the line.
7. **Match tolerances default to zero** (product default, editable);
   a lower bill price never flags. An exception never blocks a bill:
   it adds the spine's over-limit owner tier and shows the codes.
   Cost: more owner approvals until the company sets tolerances.
8. **Submitted bills reserve received quantity**, and the purchase
   order row lock serialises submits, so there is no re-match at
   approval; returned, rejected and void bills release it. Receipts
   cannot be reversed in Plan 16. Cost: a receipt entered in error
   needs a correcting process later (PO cancel and re-raise today).
9. **Due date = bill date + supplier terms, in calendar days, with no
   weekend roll;** weekend due dates are only flagged in the calendar.
   No contract or law on due dates was read. Cost: a bill due on a
   Saturday shows as due that day; the calendar flags it.
10. **No bank-specific file ships.** No bank's upload format was read
    (WPS SIF is a salary file, not a supplier payment file), so the
    only exporter is this product's own CSV, clearly labelled, behind
    a `BankFileExporter` port. Cost: the company keys payments into
    its bank by hand or uploads the list where its bank accepts CSV,
    until a sourced format is added (one exporter file).
11. **Full payment per bill; no partial payments and no supplier
    credit notes in Plan 16.** Cost: a part-paid bill is tracked
    outside the product; credit notes come in a later plan.
12. **Batches need an owner with MFA who did not create the batch,**
    and the supplier bank versions are frozen at approval; a later
    bank change blocks export. Cost: a one-owner company with no
    second owner cannot approve its own batch; it adds an owner seat
    or exports nothing (safer than self-approval).
13. **"Marked paid" is a person's record** (date and reference) by an
    owner with MFA; there is no bank statement matching. Cost: a
    wrongly marked bill is fixed by a later correction feature, not by
    edit.
14. **Bills reach the VAT ledger by a separate, idempotent posting
    action,** never inside the approval, because Plan 12's
    `PERIOD_FILED` would roll an approval back; every skip is decided
    by reads before any insert. `claimedVat` stays company-entered.
    Cost: one more click per period ("post approved bills").
15. **An invoice reaches the VAT ledger by exactly one route:** either
    "record in VAT ledger" (source `project-invoice`) or the
    e-invoicing hand-off, where Plan 12 writes the sale document when
    the provider accepts; each action refuses when the other was used.
    Cost: a company that records first and later must e-invoice voids
    the VAT document in Plan 12 and hands off again.
16. **Invoice documents are titled "Invoice", not "Tax Invoice",** and
    carry `INVOICE_DOC_NOTE`, because the FTA content rules for tax
    invoices were not read; English only until the Arabic labels pass
    a native review (handover rule). Cost: a company that must issue
    a tax invoice checks the content itself; Arabic invoices wait.
17. **Plan 7's `PdfRenderer` gains `renderHtml`** with the same
    lockdown, instead of forcing an invoice table into a letter page.
    Cost: one method more on an interface Plan 7 owns.
18. **Expenses are re-billed at their net of the supplier's VAT, with
    no markup;** the invoice adds VAT from its own category. Cost: a
    company that marks up expenses adds a manual line.
19. **Budgets are on amounts net of VAT,** scoped by any combination
    of department, project and category, with commitments from open
    purchase order amounts and approved trips and actuals from bills,
    approved claims and settled card transactions. Payroll cost is not
    in Plan 16 budgets (salary data is encrypted and owned by the
    owner view, Plan 11). Cost: a department budget shows non-payroll
    spend only.
20. **Trip days are calendar days inclusive,** the per diem comes only
    from the Plan 6 policy rate in force on the start date, and a
    missing rate is `null` with a reason, never zero. The
    trip-to-payroll over-cap split (idea T2) is not computed: no rule
    is sourced. Cost: a company that pays per diem per night edits
    the claim.
21. **The travel port only reads bookings made elsewhere;** tickets are
    records typed or imported. This is not the leave-ticket liability
    ledger (UQ13), which is not delivered here. Cost: travel desks
    keep booking in their own tool.
22. **The card port has no method that creates, issues, loads or pays;
    cards are created at the partner and only linked here;** no card
    number, CVV or expiry is accepted or stored; no partner is named.
    The holder may freeze; only an owner with MFA may unfreeze or
    change a limit, and local state changes only on the partner's
    reply. Cost: requesting a new card is done in the partner's own
    console.
23. **Card feed states only move forward** (pending to settled or
    reversed, settled to reversed); a settled amount never changes;
    budgets count settled transactions only. Cost: a partner that
    re-prices a settled transaction needs a manual note until an
    adjustment record exists.
24. **Leaver cards are listed, never frozen automatically** (master
    list: exit items are flag-only). Cost: someone must click freeze;
    the report shows the gap.
25. **Accounting exports use this product's own layout;** Zoho Books,
    QuickBooks, Xero and Wafeq are adapter slots with no adapter
    shipped, because none of their import formats or APIs was read.
    Cost: the company maps the CSV in its accounting tool until an
    adapter is written (about one task per target).
26. **Unmapped accounts do not block an export;** they are blank and
    counted. Cost: an import may need the blanks filled by hand.
27. **Budget alerts are an in-app list,** refreshed on budget reads and
    after approvals, each threshold raised once per budget; no
    scheduler and no channel message (Plan 13 can subscribe later).
    Cost: an alert appears only when someone looks or approves.
28. **Supplier bank details: UAE IBANs only** (`AE` + 21 digits, mod
    97), encrypted with the company key, readable through one MFA
    route and the export. Cost: a foreign supplier is paid outside the
    product's list.
29. **Roles:** owner and hr hold finance; managers raise purchase
    orders, record receipts, see the supplier list (no bank) and
    approve time on projects they manage; employees file time and
    trips and see their own cards; no accountant role (Plan 12 Ruling
    29). Cost: an outside accountant needs an hr seat.
30. **AED only** across bills, invoices, cards and exports, with the
    original currency kept as information. Cost: foreign-currency
    bills are converted by the company before entry.
31. **Numbers are per company, per kind and per year:** purchase
    orders get theirs at create, invoices at issue (never reused after
    a void), batches at create. Cost: a voided issued invoice leaves a
    visible gap, which is the honest record.
32. **Review and execution:** per-task review after Tasks 1, 3, 4 and
    10; one whole-branch review at the end (speed ruling). Execution
    is subagent-driven, chosen without asking (owner: no technical
    questions), because every task appends to shared contract files
    and Tasks 3, 6 and 7 depend on earlier interfaces. Cost: a slipped
    bug in Tasks 2, 5 to 9, 11 or 12 is caught at the final review.
33. **An exported batch can be cancelled only by an owner with MFA and
    a note,** because its file may already be at a bank; cancelling
    frees the bills for a new batch. The product cannot know whether
    a bank acted on a file. Cost: if a bank did pay from a cancelled
    file, a second batch could pay the same bill twice; the note and
    the audit row are the trail, and the owner checks the bank first.
