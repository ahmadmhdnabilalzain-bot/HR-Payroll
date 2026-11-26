# Plan 12: VAT Returns, Corporate Tax Pack and E-invoicing Integration
# Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Features delivered (10; count progress by these names):**

- F1 VAT rate and tax category parameters with statuses: the engine
  packs shown with value, status and source; zero-rated, exempt,
  out-of-scope and reverse-charge as company-tagged categories
  (Tasks 1, 6).
- F2 VAT ledger of sales and purchase documents with TRN checks and
  idempotent import of expense-claim VAT (Task 7).
- F3 Decision 17 employee-expense input tax conditions: a pure
  rule-pack of the six cases, company attestations, documented-policy
  flags (Tasks 2, 8).
- F4 VAT 201 return computation with the box mapping of the 2021 FTA
  guide, flagged as possibly outdated (Tasks 4, 9).
- F5 VAT return period calendar with due dates (28 days, weekend and
  company holiday roll, flagged parameters) (Tasks 3, 9).
- F6 Filing-ready export (JSON and CSV of the boxes and the supporting
  document register) and a manual-upload checklist; no submission
  (Task 9).
- F7 Corporate tax worksheet: 0% band and 9% rate as sourced params,
  small business relief flagged, from company-entered accounting
  figures (Tasks 5, 10).
- F8 E-invoicing readiness tracker: provider appointment, deadlines per
  revenue band and fine exposure as sourced params (Tasks 5, 11).
- F9 E-invoice data model and provider adapter: send and receive
  through an accredited service provider port, with a fake provider
  for tests; mandatory fields flagged as unsourced (Task 12).
- F10 Received e-invoice matching to purchase documents (Task 13).

**Goal:** Give an SME a VAT ledger, a worked VAT 201 return it can type
into EmaraTax, a corporate tax worksheet and an e-invoicing readiness
and exchange layer, every figure traced to a rule-pack parameter whose
status says how well it is sourced, with no tax advice and no claim of
compliance or submission.

**Architecture:** Statutory values live in four new engine rule-packs
(`ae-vat`, `ae-vat-employee-expense`, `ae-ct`, `ae-einvoicing`) and
pure engine functions under `packages/engine/src/tax/` (Decision 17
conditions, VAT periods and due dates, VAT 201 boxes, corporate tax,
e-invoicing deadlines and fine exposure). Plan 12 then extends Plan 3's
`packages/contract` and `packages/api`: a new `VAT_ROUTES` list in
`routes-vat.ts` joined through `ROUTE_GROUPS`, migrations `1201_` to
`1208_`, services under `packages/api/src/tax/`. The API loads rows,
calls the engine and stores snapshots; it holds no tax number. Sending
and receiving e-invoices go through an `EInvoiceProvider` port; the
only implementations are a null provider (refuses) and a fake provider
(tests). The product never builds PINT AE XML and never talks to the
FTA.

**Tech Stack:** As Plan 3: Node 22, TypeScript 7.0.2, zod 4.6.7, Hono
4.13.17, @electric-sql/pglite 0.5.16 (tests), pg 8.23.1, Vitest 5.1.2,
fast-check 4.11.0, tsx 4.23.15. No new dependency.

**Spec:** `docs/superpowers/specs/2026-11-25-master-feature-list.md`
(UQ35 VAT and corporate tax formats, UQ36 FTA-ready filing and
e-invoicing; tags SR and P),
`docs/research/2026-11-26-vat-einvoicing-primary.md` (primary sources:
VAT 201 guide 2021, Decision 17 of 2026, MD 243/244 of 2025, MD 66,
168 and 197 of 2026, Cabinet Decision 106 of 2025, corporate tax
extracts; its "NOT FOUND" list is binding),
`docs/research/2026-11-25-vat-corporate-tax-einvoicing.md` (snippet
level; used only where the primary note is silent, and then
`secondary`), `docs/engineering-standards.md`, `LEDGER.md` sections 1
to 3 (speed ruling, autonomous mode). Extends
`docs/superpowers/plans/2026-11-26-plan-3-backend.md` (contract, API,
tenancy, audit, roles); reuses
`docs/superpowers/plans/2026-11-26-plan-6-expenses.md` (expense item
VAT capture fields `amount`, `vatAmount`, `supplierName`,
`supplierTrn`; `text/csv-optional` responses from its Task 7),
`docs/superpowers/plans/2026-11-26-plan-10-performance-learning.md`
Task 1 (`ROUTE_GROUPS`, numeric migration order) and
`docs/superpowers/plans/2026-11-26-plan-11-owner-view-evidence.md`
Tasks 1 and 5 (`SignedMoney`, `toSignedMoney`, `toCsv`, `Exposure`).

**Prerequisites (per task).** Where this plan consumes a function of
another plan that its Interfaces blocks do not name exactly, the
executor exports it from the named file under the name given here,
renaming only at the export. Where a named item from Plans 6, 10 or 11
is not on the branch yet, the task that first needs it creates it with
exactly the signature given in that plan (stated per item below), and
the later-merged plan reuses it instead of adding a second copy.

| Task | Needs merged first |
|---|---|
| 1 to 5 | nothing beyond today's `packages/engine` |
| 6 | Plan 3 Tasks 1 to 8; Tasks 1 to 5 |
| 7 | Task 6; Plan 6 Tasks 1 to 5 (expense claims) |
| 8 | Tasks 2 and 7 |
| 9 | Tasks 3, 4, 7 and 8 |
| 10 | Tasks 5 and 6 |
| 11 | Tasks 5 and 6 |
| 12 | Tasks 7 and 11 |
| 13 | Task 12 |

Tasks 1 to 5 (engine only) can run beside Plan 3 work in a separate
worktree; Tasks 6 to 13 run in order in one worktree.

## Global Constraints

- All of Plan 3's Global Constraints apply unchanged: 80-character
  lines, files under about 300 lines, functions under 30, `Fils`
  inside, `Money` (`^\d{1,9}\.\d{2}$`) on the wire, RLS forced on every
  tenant table, all queries through `withTenant`, injected time, ids
  and randomness (`AppDeps`), `/v1`, `X-Company-Id`, offline tests.
- Signed figures (VAT 201 boxes, adjustments, corrections, accounting
  profit) use `SignedMoney` (`^-?\d{1,9}\.\d{2}$`, never `"-0.00"`).
  Every other amount stays `Money`.
- No statutory number in `packages/api` or `packages/contract`: no VAT
  rate, no 28 days, no AED 10,000, no AED 375,000, no 9%, no AED 3
  million, no AED 50 million, no e-invoicing date, no fine. They live
  only in the engine packs of Task 1, each with a status (`official`,
  `secondary`, `convention`, `unsourced`) and a source. An `unsourced`
  param has value `null` and no default.
- Status mapping from the research, applied to every param: text READ
  in a primary source = `official`; a primary source read only as an
  extract or snippet, an unsigned working copy, or the 2021 VAT guide
  (possibly outdated) = `secondary`; our own choice = `convention`;
  "NOT FOUND" = `unsourced`.
- Never "compliant", "FTA approved", "certified", "submitted to the
  FTA", "filed with the FTA", "recoverable", "claimable", "5%" or
  "9%" in contract or api source text. (The VAT 201 box labels quoted
  from the FTA guide live in the engine and reach responses as quoted
  FTA labels; contract examples carry none of them.) A return the
  company has filed by hand is `marked-filed`, never "submitted".
  The words "tax advice" appear only inside "not tax advice".
- Every VAT, corporate tax and e-invoicing response carries `note:
  typeof TAX_NOT_ADVICE` plus its own statement (exact texts in Task
  6). Unsourced or not-entered values are `null` with a reason, never
  `"0.00"`.
- The product decides no input tax deduction. Purchase documents carry
  `claimedVat` entered by the company (`null` = not decided). Decision
  17 results are `conditions-met`, `condition-not-met` or
  `not-assessed`, shown beside the document; they never change
  `claimedVat`.
- Plan 6's expense contract is untouched: `ExpenseClaim.
  vatRecoverability` stays `"not-assessed"` and `VAT_STATEMENT` keeps
  its text. Decision 17 results live only in Plan 12 records.
- AED only. A document in another currency is entered in AED with
  `originalCurrency` and `exchangeRate` kept as information; no rate is
  applied.
- E-invoicing: no real provider integration, no PINT AE XML, no Peppol
  transport, no direct FTA reporting. The provider port receives the
  canonical JSON model; the provider maps and validates it.
- Received e-invoice content is untrusted: parsed with zod at the port,
  size-capped, stored as data, never rendered as HTML and never
  applied to a purchase without a person's action.
- Roles: every VAT route is owner or hr (`PAYROLL`). Owner only, with
  MFA: changing the tax profile, marking a return filed, finalising a
  corporate tax worksheet. Exports need owner or hr with MFA.
- Audit actions match `^[a-z]+(\.[a-z-]+)+$`; audit data never holds
  amounts, VAT, TRNs, counterparty names, profit, revenue, invoice
  lines or attestations (`vatAudit`, Task 6).
- No DELETE route or grant; removal is a status (`voided`, `retired`).
- Migrations are numbered `1201_` to `1208_` (Plan 12's range; `1209`
  is kept free).
- Each task ends with `pnpm check` green and one commit. API tasks add
  one happy-path row per new route to `tests/conformance.test.ts` and
  their ids to the `tests/leak.test.ts` id map. Review: a fresh
  per-task review after Tasks 1, 2, 4 and 5 (law and money) and Task
  12 (untrusted input); one whole-branch review at the end (speed
  ruling, 2026-11-26).

## Review Focus

1. An expense claim imported into the VAT ledger twice, or two imports
   for overlapping ranges at once: exactly one purchase document per
   claim item, and the second import reports it as `existing` (Task 7
   `import_expenses_idempotent`, `import_expenses_concurrent_once`).
2. The provider delivers the same received e-invoice twice, or a send
   is retried after a timeout: one inbound row per provider message id
   and one provider send per invoice revision (Task 12
   `inbound_duplicate_stored_once`, `send_retry_reuses_key`).
3. A document added, edited or voided with a tax date inside a period
   already marked filed: refused with 409 `PERIOD_FILED`; the fix is a
   correction document in an open period, and corrections above the
   threshold for one past period raise
   `VOLUNTARY_DISCLOSURE_MAY_BE_NEEDED` (Task 9
   `filed_period_locked`, Task 4 `correction_over_threshold_flags`).
4. A period where credit notes exceed sales or input tax exceeds output
   tax: Box 14 is negative on the wire and in the export, Box 15 is
   asked, and nothing is clamped to zero (Task 4
   `net_refund_period_signed`, Task 9 `export_keeps_negative_box14`).
5. A value that is unsourced (VAT late fines, small business relief end
   date, FTA reporting timeline) or an FTA-populated box (2, 6, 7) not
   yet entered: shown as `null` with a reason or `not-assessed`, never
   as `"0.00"` (Task 4 `fta_box_not_entered_incomplete`, Task 5
   `sbr_end_unsourced_not_assessed`, Task 11
   `vat_late_fines_shown_unsourced`).

## File Structure

```
packages/engine/src/sources.ts               + tax source ids (Task 1)
packages/engine/src/rules/vat-pack.ts        ae-vat (data)
packages/engine/src/rules/employee-expense-vat-pack.ts
                                             ae-vat-employee-expense
packages/engine/src/rules/ct-pack.ts         ae-ct (data)
packages/engine/src/rules/einvoicing-pack.ts ae-einvoicing (data)
packages/engine/src/tax/params-view.ts       pack params for display
packages/engine/src/tax/employee-expense.ts  Decision 17 cases (pure)
packages/engine/src/tax/calendar.ts          months, weekdays, roll
packages/engine/src/tax/vat-line.ts          VAT on a net, VAT checks
packages/engine/src/tax/vat-periods.ts       periods and due dates
packages/engine/src/tax/vat201.ts            VAT 201 boxes
packages/engine/src/tax/vat201-layout.ts     box ids and guide labels
packages/engine/src/tax/corporate-tax.ts     CT worksheet
packages/engine/src/tax/einvoicing.ts        deadlines, fines, ids
packages/contract/src/tax/*.ts               schemas per area
packages/contract/src/routes-vat.ts          VAT_ROUTES
packages/contract/src/routes.ts              + ROUTE_GROUPS entry
packages/api/migrations/1201_tax_profile.sql ... 1208_einvoice_match.sql
packages/api/src/tax/                        services and pure helpers
packages/api/src/einvoicing/                 provider port, fake, sync
packages/api/src/routes/vat-*.ts             route files per task
HANDOVER.md, LEDGER.md                       updated in Task 13
```

---

### Task 1: Engine tax packs and sources (F1)

Law task: fresh per-task review.

**Files:**
- Modify: `packages/engine/src/sources.ts`, `src/index.ts`
- Create: `packages/engine/src/rules/vat-pack.ts`,
  `src/rules/employee-expense-vat-pack.ts`, `src/rules/ct-pack.ts`,
  `src/rules/einvoicing-pack.ts`, `src/tax/params-view.ts`
- Test: `packages/engine/tests/tax-packs.test.ts`,
  `tests/no-tax-figures.test.ts`

**Interfaces:**
- Consumes: `RulePack`, `RuleParam`, `RuleSource`, `selectPack`,
  `requireParam`, `deepFreeze`, `sourceOf`, `SOURCES`,
  `ENGINE_CONVENTION`.
- Produces:
  - Source ids in `sources.ts`. Each `url` is the URL printed in
    `docs/research/2026-11-26-vat-einvoicing-primary.md` at the named
    section, joined into one string with no spaces, split across
    string literals to keep 80 columns. Where the note gives no URL,
    the url is `https://tax.gov.ae` and the note says "exact page URL
    not recorded".

    Ids, then research section, then the note text:
    - `FTA_VAT_GUIDE21` (1): "FTA VAT Returns User Guide V4.0, August
      2021; possibly outdated".
    - `FTA_DEC17_2026_ART1` (2): "FTA Decision 17 of 2026, Article 1
      (unofficial translation)"; `FTA_DEC17_2026_ART2_1` to `_ART2_6`
      (2): the same with "Article 2, case N".
    - `MD243_2025` (3.1): "Ministerial Decision 243 of 2025".
    - `MD244_2025_ART5` (3.1): "Ministerial Decision 244 of 2025,
      Article 5"; `MD244_2025_ART3_4` (3.3): the same with "Articles 3
      and 4 (pilot and voluntary start)".
    - `MD66_2026` (3.1): "MD 66 of 2026; MoF copy unsigned".
    - `MD197_2026` (3.1): "MD 197 of 2026; MoF copy unsigned".
    - `FTA_NEWS_2026_10_25` (3.3): "FTA news 25 Oct 2026; exact page
      URL not recorded".
    - `FTA_EINV_FAQ` (3.1): "FTA e-invoicing page and FAQ, updated 17
      Nov 2026".
    - `MOF_EINV_GUIDELINES` (3.1): "MoF E-invoicing Guidelines V2.1,
      glossary only (V1.1 path; link serves V2.1)".
    - `RESEARCH_CT_ZERO_RATE` (25 Nov note, corporate tax): url `""`,
      note naming `docs/research/2026-11-25-vat-corporate-tax-
      einvoicing.md` and its words "0% on taxable income up to AED
      375,000", snippet level (review fix I2: the bulletin snippet
      cut off the 0% word, so it cannot be the 0% band's source).
    - `CD106_2025` (3.6): "Cabinet Decision 106 of 2025, table rows 1
      to 3 (search extract)".
    - `FTA_CT_SB_BULLETIN` (4): "FTA Basic Tax Information Bulletin:
      Small Business (snippet)".
    - `FTA_CT_SBR_TOPIC` (4): "FTA corporate tax topics page
      (extract); exact page URL not recorded".
    - `FTA_CT_FILING_NEWS` (4): "FTA news 24 Sep 2025 (extract); exact
      page URL not recorded".

  - `VAT_PACKS: readonly RulePack[]`: one pack `ae-vat`, version
    `2026-11-26`, effectiveFrom `2018-01-01`, effectiveTo `null`,
    frozen, exactly these params:

    | key | value | status | source |
    |---|---|---|---|
    | standardRateBps | 500 | secondary | FTA_VAT_GUIDE21 |
    | vatRounding | "HALF_UP" | convention | ENGINE_CONVENTION |
    | vatMismatchToleranceFils | 1 | convention | ENGINE_CONVENTION |
    | returnDueDaysAfterPeriodEnd | 28 | secondary | FTA_VAT_GUIDE21 |
    | returnDueRollsToNextBusinessDay | true | secondary | FTA_VAT_GUIDE21 |
    | weekendDays | "SAT,SUN" | convention | ENGINE_CONVENTION |
    | nilReturnRequired | true | secondary | FTA_VAT_GUIDE21 |
    | errorCorrectionThresholdFils | 1000000 | secondary | FTA_VAT_GUIDE21 |
    | box201Layout | "guide-2021-v4.0" | secondary | FTA_VAT_GUIDE21 |
    | lateFilingFineFils | null | unsourced | none |
    | lateFilingRepeatFineFils | null | unsourced | none |
    | latePaymentFirstBps | null | unsourced | none |
    | latePaymentMonthlyBps | null | unsourced | none |
    | latePaymentCapBps | null | unsourced | none |

    (`standardRateBps` is read only from the guide's worked example "AED
    100 under Amount and AED 5 under VAT Amount" and a 2018 snippet;
    Decree-Law 8 of 2017 is unread. The late fines of the 2021 guide
    may have changed under Cabinet Decision 129 of 2025, in force 14
    Apr 2026, hence `unsourced`.)
  - `EMPLOYEE_EXPENSE_VAT_PACKS`: one pack `ae-vat-employee-expense`,
    version and effectiveFrom `2026-10-01`, effectiveTo `null`, one
    param `newEmployeeAccommodationMaxDays` 30 `official`
    `FTA_DEC17_2026_ART2_4`.
  - `CT_PACKS`: one pack `ae-ct`, version `2026-11-26`, effectiveFrom
    `2026-01-01` (selected on the tax period's end date), params:

    | key | value | status | source |
    |---|---|---|---|
    | zeroBandUpperFils | 37500000 | secondary | FTA_CT_SB_BULLETIN |
    | zeroBandRateBps | 0 | secondary | RESEARCH_CT_ZERO_RATE |
    | mainRateBps | 900 | secondary | FTA_CT_SB_BULLETIN |
    | taxRounding | "HALF_UP" | convention | ENGINE_CONVENTION |
    | sbrRevenueThresholdFils | 300000000 | secondary | FTA_CT_SBR_TOPIC |
    | sbrLastPeriodEnd | null | unsourced | none |
    | returnDueMonthsAfterPeriodEnd | 9 | secondary | FTA_CT_FILING_NEWS |
    | lateFilingFineFils | null | unsourced | none |

  - `EINVOICING_PACKS`: one pack `ae-einvoicing`, version `2026-11-26`,
    effectiveFrom `2026-07-01`, params:

    | key | value | status | source |
    |---|---|---|---|
    | largeRevenueThresholdFils | 5000000000 | official | MD244_2025_ART5 |
    | largeAppointBy | "2026-10-30" | official | FTA_NEWS_2026_10_25 |
    | largeGoLive | "2027-01-01" | official | MD244_2025_ART5 |
    | smallAppointBy | "2027-03-31" | official | MD244_2025_ART5 |
    | smallGoLive | "2027-07-01" | official | MD244_2025_ART5 |
    | voluntaryFrom | "2026-07-01" | official | MD244_2025_ART3_4 |
    | b2cInScope | false | official | MD244_2025_ART5 |
    | issueWindowBusinessDays | 14 | secondary | MD197_2026 |
    | weekendDays | "SAT,SUN" | convention | ENGINE_CONVENTION |
    | participantScheme | "0235" | secondary | MOF_EINV_GUIDELINES |
    | tinDigits | 10 | secondary | MOF_EINV_GUIDELINES |
    | notImplementedFinePerMonthFils | 500000 | secondary | CD106_2025 |
    | missingInvoiceFineFils | 10000 | secondary | CD106_2025 |
    | missingInvoiceMonthlyCapFils | 500000 | secondary | CD106_2025 |
    | missingCreditNoteFineFils | 10000 | secondary | CD106_2025 |
    | missingCreditNoteMonthlyCapFils | 500000 | secondary | CD106_2025 |
    | ftaReportingDeadline | null | unsourced | none |

  - `ParamView { packId; packVersion; key; value: string | null;
    status: RuleStatus; sourceNote: string | null; sourceUrl: string |
    null }`; `packParamsView(packs: readonly RulePack[], onDate:
    string): ParamView[]`: the pack selected on `onDate`, params in
    key order, numbers as decimal strings, `null` kept.

- [ ] **Step 1: Write the failing tests**

`tax-packs.test.ts`:
- `vat_pack_table`: every row of the `ae-vat` table above deep-equals
  `{ value, status }` and names the listed source id's object; no other
  key exists.
- `ct_pack_table`, `einvoicing_pack_table`,
  `employee_expense_pack_table`: the same for the other three tables.
- `unsourced_params_are_null`: every param with status `unsourced` in
  the four packs has `value: null` and `source: null`; `requireParam`
  on `lateFilingFineFils` without an override throws
  `UNSOURCED_PARAM`.
- `weekend_days_agree`: `ae-vat.weekendDays` equals
  `ae-einvoicing.weekendDays`.
- `packs_frozen`: `Object.isFrozen` is true for each pack and one
  param of each.
- `selection_dates`: `selectPack(VAT_PACKS, "2017-12-31")` throws
  `NO_PACK_FOR_DATE`; `selectPack(EMPLOYEE_EXPENSE_VAT_PACKS,
  "2026-09-30")` throws it; `"2026-10-01"` returns the pack.
- `params_view`: `packParamsView(VAT_PACKS, "2026-11-26")` has 14
  rows, `standardRateBps` value `"500"` status `secondary`,
  `lateFilingFineFils` value `null` status `unsourced` and
  `sourceUrl null`.

`no-tax-figures.test.ts`: the files under `packages/engine/src/tax/`
and (from Task 6, skipped while absent) `packages/api/src/tax/`,
`packages/api/src/einvoicing/` and `packages/contract/src/tax/`
contain none of `37500000`,
`300000000`, `5000000000`, `"2026-10-30"`, `"2027-03-31"`,
`"2027-07-01"`, `"0235"`; the contract and api files also contain
none of the banned words of the Global Constraints (case-insensitive;
`"not tax advice"` is removed before the scan).

- [ ] **Step 2: Run** `pnpm --filter @payroll/engine test tax-packs
  no-tax-figures`. Expected: FAIL (modules not found).
- [ ] **Step 3: Implement** the four packs, the source ids and
  `packParamsView`; export them from `index.ts`.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(engine): VAT, CT and e-invoicing packs`.

### Task 2: Engine Decision 17 conditions rule-pack (F3)

Law task: fresh per-task review.

**Files:**
- Create: `packages/engine/src/tax/employee-expense.ts`
- Modify: `packages/engine/src/index.ts`, `tests/purity.test.ts`
  (scan `src/tax/`)
- Test: `packages/engine/tests/employee-expense.test.ts`

**Interfaces:**
- Consumes: Task 1 `EMPLOYEE_EXPENSE_VAT_PACKS`, source ids
  `FTA_DEC17_2026_*`; `selectPack`, `requireParam`, `Traced`,
  `EngineError`, `isValidIsoDate`.
- Produces:
  - `EmployeeExpenseCase = "transport" | "food-remote" |
    "accommodation" | "new-employee-accommodation" | "phone-internet"
    | "parking"`.
  - `ConditionId` (string union) and `EMPLOYEE_EXPENSE_CASES:
    readonly CaseDef[]` with `CaseDef { case; sourceId; conditions:
    readonly ConditionDef[]; needsDocumentedPolicy: boolean }` and
    `ConditionDef { id: ConditionId; text: string; policy: boolean;
    computed: boolean }`. Exactly these conditions, in this order
    (texts are short paraphrases of the article; `policy` true marks a
    condition met only by a documented policy):

    - every case (Article 1): `free-to-employee`,
      `contract-or-documented-policy` (policy).
    - `transport`: `business-journeys-only`, `no-cash-alternative`.
    - `food-remote`: `remote-or-isolated-area`,
      `no-food-facilities-nearby`, `linked-to-work-or-residence-period`,
      `no-cash-alternative`.
    - `accommodation`: `no-cash-alternative`, `operational-not-benefit`,
      `near-site-required`, `employee-only-or-required-family`,
      `commensurate-no-recreation`.
    - `new-employee-accommodation`: `within-max-days` (computed),
      `commensurate-with-job`.
    - `phone-internet`: `necessary-for-duties`,
      `personal-use-incidental`, `documented-internal-policy` (policy),
      `monitoring-records-kept`.
    - `parking`: `business-purposes-only`, `documented-parking-policy`
      (policy), `receipt-date-time-amount-tax`.

    `needsDocumentedPolicy` is true for `phone-internet` and `parking`
    only (Article 2 itself); the Article 1 `contract-or-documented-
    policy` condition applies to all six.
  - `EmployeeExpenseInput { case: EmployeeExpenseCase; expenseDate:
    string; attestations: Partial<Record<ConditionId, boolean |
    null>>; stayDays?: number }`.
  - `EmployeeExpenseOutcome = "conditions-met" | "condition-not-met" |
    "not-assessed"`.
  - `EmployeeExpenseAssessment { case; outcome; met: ConditionId[];
    unmet: ConditionId[]; unknown: ConditionId[]; policyConditions:
    ConditionId[]; packVersion: string | null; reason: string | null
    }`.
  - `assessEmployeeExpense(input: EmployeeExpenseInput, packs?:
    readonly RulePack[]): Traced<EmployeeExpenseAssessment>`. Rules:
    the pack is selected on `expenseDate`; `NO_PACK_FOR_DATE` is
    caught and returns `not-assessed` with reason `"before 2026-10-01:
    Decision 17 not in force"` and `packVersion null` (never a throw,
    never `conditions-met`); the case's conditions are the two Article
    1 ones followed by the case's own; an attestation key that is not a
    condition of the case throws `UNKNOWN_CONDITION`; `within-max-days`
    is computed (`stayDays` a whole number 1 or more, else
    `INVALID_COUNT`; met when `stayDays <=
    newEmployeeAccommodationMaxDays`; missing `stayDays` is unknown)
    and an attestation for it throws `UNKNOWN_CONDITION`; outcome is
    `condition-not-met` when any condition is false, else
    `not-assessed` when any is missing or null, else
    `conditions-met`; one trace line `vat.employee-expense` with the
    case's source note and (case 4) the max-days rule.

- [ ] **Step 1: Write the failing tests** in `employee-expense.test.ts`:
- `six_cases_listed`: `EMPLOYEE_EXPENSE_CASES.map((c) => c.case)`
  deep-equals the six names in order; condition ids per case equal the
  table; `needsDocumentedPolicy` true only for `phone-internet` and
  `parking`.
- `all_true_conditions_met`: transport on `2026-10-15` with every
  condition true gives `conditions-met`, `unmet []`, `unknown []`.
- `one_false_not_met`: transport with `no-cash-alternative: false`
  gives `condition-not-met`, `unmet ["no-cash-alternative"]`.
- `false_beats_unknown`: one false and one null gives
  `condition-not-met`; only nulls gives `not-assessed`.
- `before_effective_date_not_assessed`: `expenseDate "2026-09-30"`
  gives `not-assessed`, reason mentions `2026-10-01`, `packVersion
  null`.
- `new_employee_days`: `stayDays 30` with the other conditions true
  gives `conditions-met`; `31` gives `unmet ["within-max-days"]`;
  `0` throws `INVALID_COUNT`; no `stayDays` gives `unknown`
  containing `within-max-days`.
- `computed_condition_not_attestable`: attesting `within-max-days`
  throws `UNKNOWN_CONDITION`; attesting `remote-or-isolated-area` on
  `parking` throws it.
- `policy_conditions_named`: `parking` result `policyConditions`
  deep-equals `["contract-or-documented-policy",
  "documented-parking-policy"]`.
- `no_recover_word`: no `text` in `EMPLOYEE_EXPENSE_CASES` matches
  `/recoverable|claimable/i`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/engine test
  employee-expense`. Expected: FAIL.
- [ ] **Step 3: Implement** `employee-expense.ts`.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS (purity scan covers
  `src/tax/`).
- [ ] **Step 5: Commit** `feat(engine): Decision 17 conditions`.

### Task 3: Engine VAT line checks, periods and due dates (F1, F5)

**Files:**
- Create: `packages/engine/src/tax/calendar.ts`, `src/tax/vat-line.ts`,
  `src/tax/vat-periods.ts`
- Modify: `packages/engine/src/index.ts`
- Test: `packages/engine/tests/vat-line.test.ts`,
  `tests/vat-periods.test.ts`

**Interfaces:**
- Consumes: Task 1 `VAT_PACKS`; `mulDiv`, `Fils`, `RoundingMode`,
  `addDays`, `toDayNumber`, `parseIsoDate`, `formatIsoDate`,
  `daysInMonth`, `isValidIsoDate`, `selectPack`, `requireParam`,
  `Traced`, `EngineError`.
- Produces:
  - `calendar.ts`: `addMonthsClamped(date: string, months: number):
    string` (day clamped to the target month's last day; months a whole
    number, may be 0); `weekday(date: string): 0..6` (0 Sunday, from
    `toDayNumber`; 1970-01-01 was a Thursday); `parseWeekend(text:
    string): Set<number>` (`"SAT,SUN"` to `{6, 0}`; unknown token
    throws `INVALID_PARAM`); `rollToBusinessDay(date: string, weekend:
    Set<number>, holidays: readonly string[]): string` (moves forward
    while the date is a weekend day or in `holidays`; every holiday
    must be an ISO date, else `INVALID_DATE`); `addBusinessDays(date:
    string, n: number, weekend, holidays): string` (counts n business
    days after `date`).
  - `VatTreatment = "standard" | "zero-rated" | "exempt" |
    "out-of-scope" | "reverse-charge"`.
  - `vatOnNet(net: Fils, onDate: string, packs?: readonly RulePack[]):
    Traced<Fils>`: `mulDiv(net, standardRateBps, 10000n, vatRounding)`;
    trace id `vat.line`.
  - `VatFinding { code: "VAT_NOT_AT_STANDARD_RATE" |
    "VAT_ON_NON_STANDARD"; severity: "warning" | "error"; expected:
    Fils | null }`; `checkDocumentVat(doc: { treatment: VatTreatment;
    net: Fils; vat: Fils }, onDate: string, packs?): VatFinding[]`:
    `standard` and `reverse-charge` give a warning when `|vat -
    vatOnNet(net)| > vatMismatchToleranceFils` (credit notes pass
    positive values); `zero-rated`, `exempt` and `out-of-scope` give
    an error when `vat > 0`.
  - `VatPeriod { start: string; end: string }`;
    `vatPeriods(firstPeriodStart: string, periodMonths: 1 | 3, from:
    string, to: string): VatPeriod[]`: `firstPeriodStart` must be day
    1 (else `INVALID_DATE`); periods follow on back to back; returns
    those that overlap `[from, to]`, at most 120 (else
    `RANGE_TOO_LONG`); `end = addDays(addMonthsClamped(start, n), -1)`.
  - `vatReturnDue(periodEnd: string, holidays: readonly string[],
    packs?: readonly RulePack[]): Traced<{ dueDate: string;
    unrolledDate: string; rolled: boolean }>`: pack selected on
    `periodEnd`; `unrolledDate = addDays(periodEnd,
    returnDueDaysAfterPeriodEnd)`; when
    `returnDueRollsToNextBusinessDay` it rolls past `weekendDays` and
    `holidays`; trace id `vat.return.due` with the three rules.

- [ ] **Step 1: Write the failing tests**

`vat-line.test.ts`:
- `vat_on_net_rounds_half_up`: `vatOnNet(10000n, "2026-11-26")` is
  `500n`; `vatOnNet(10n, ...)` is `1n` (0.5 rounds up); trace rule
  `standardRateBps` status `secondary`.
- `mismatch_warning`: standard net `10000n` VAT `502n` gives one
  warning with `expected 500n`; VAT `501n` gives none.
- `vat_on_zero_rated_error`: zero-rated with VAT `1n` gives
  `VAT_ON_NON_STANDARD` error; with `0n` none.
- `vat_check_property`: fast-check over net 0..10^9 fils: VAT equal
  to `vatOnNet(net)` never gives a finding.

`vat-periods.test.ts`:
- `quarterly_periods`: first `2026-01-01`, 3 months, range
  `2026-01-01` to `2026-12-31` gives four periods, the second
  `{ start: "2026-04-01", end: "2026-06-30" }`.
- `monthly_february`: first `2028-01-01`, 1 month: February ends
  `2028-02-29`.
- `first_period_day_1_only`: `2026-01-15` throws `INVALID_DATE`.
- `due_rolls_from_saturday`: `vatReturnDue("2026-10-31", [])` gives
  `unrolledDate "2026-11-28"`, `dueDate "2026-11-30"`, `rolled true`
  (matches the FTA site banner "30-11-2026 Final deadline").
- `due_rolls_past_holiday`: `vatReturnDue("2026-10-31",
  ["2026-11-30"])` gives `"2026-12-01"`.
- `due_weekday_unrolled`: a period end whose +28 day is a Wednesday
  keeps that date with `rolled false`.
- `add_months_clamped`: `("2027-03-31", 1)` is `"2027-04-30"`;
  `("2026-12-31", 9)` is `"2027-09-30"`.
- `add_business_days`: from Thursday `2026-11-26`, 2 business days
  with weekend `SAT,SUN` is `"2026-11-30"`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/engine test vat-line
  vat-periods`. Expected: FAIL.
- [ ] **Step 3: Implement** the three files.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(engine): VAT line checks and periods`.

### Task 4: Engine VAT 201 box computation (F4)

Money and law task: fresh per-task review.

**Files:**
- Create: `packages/engine/src/tax/vat201-layout.ts`,
  `src/tax/vat201.ts`
- Modify: `packages/engine/src/index.ts`
- Test: `packages/engine/tests/vat201.test.ts`,
  `tests/vat201-props.test.ts`

**Interfaces:**
- Consumes: Task 1 `VAT_PACKS`; Task 3 `VatTreatment`; `Fils`,
  `Traced`, `selectPack`, `requireParam`, `EngineError`.
- Produces:
  - `Emirate = "AZ" | "DU" | "SH" | "AJ" | "UQ" | "RK" | "FU"`
    (product codes for Abu Dhabi, Dubai, Sharjah, Ajman, Umm Al Quwain,
    Ras Al Khaimah, Fujairah; `EMIRATES` lists them in this order).
  - `vat201-layout.ts`: `VAT201_BOXES: readonly BoxDef[]`, `BoxDef {
    box: "1" | ... | "15"; section: "outputs" | "inputs" | "totals";
    guideLabel: string; columns: ("amount" | "vat" | "adjustment")[];
    ftaPopulated: boolean; labelSource: "research-note" | "guide-pdf"
    }`. Labels are the short names in research note section 1.1, not
    quotes of the form: 1 "Standard rated supplies", 2 "Tax refunds to
    tourists", 3 "Reverse charge supplies received", 4 "Zero-rated
    supplies", 5 "Exempt supplies", 6 "Goods imported into the UAE",
    7 "Adjustments to goods imported", 8 "Totals (outputs)", 9
    "Standard rated expenses", 10 "Reverse charge supplies (inputs)",
    11 "Totals (inputs)", 12 "Total value of due tax for the period",
    13 "Total value of recoverable tax", 14 "Payable tax", 15 "Refund
    request", all with `labelSource "research-note"`. When the
    executor reads the guide PDF, a box may take the PDF's exact
    wording with `labelSource "guide-pdf"`. Boxes 2, 6 and 7 have
    `ftaPopulated: true`. Columns: boxes 4 and 5 amount
    only; 9 to 11 amount, VAT, adjustment; 12 to 14 one figure (vat);
    15 none.
  - `Vat201Doc { id: string; direction: "sale" | "purchase"; kind:
    "tax-invoice" | "simplified-invoice" | "credit-note"; treatment:
    VatTreatment; emirate: Emirate | null; net: Fils; vat: Fils;
    claimedVat: Fils | null; correctsPeriodStart: string | null }`
    (all amounts 0 or more; credit notes are subtracted here).
  - `FtaBoxInput = { kind: "not-entered" } | { kind: "none" } | {
    kind: "entered"; amount: Fils; vat: Fils }` (signed allowed).
  - `AdjustmentKey = "1:AZ" | ... | "1:FU" | "3" | "9" | "10"`.
  - `Vat201Input { periodStart: string; periodEnd: string; documents:
    Vat201Doc[]; box2: FtaBoxInput; box6: FtaBoxInput; box7:
    FtaBoxInput; adjustments: Partial<Record<AdjustmentKey, Fils>>;
    refundRequested: boolean }`.
  - `BoxFigure { amount: Fils | null; vat: Fils | null; adjustment:
    Fils | null }`; `Vat201Problem { code: "EMIRATE_REQUIRED" |
    "INPUT_TAX_UNDECIDED" | "CLAIMED_EXCEEDS_VAT" |
    "CLAIMED_ON_UNTAXED" | "VAT_ON_NON_STANDARD" |
    "TREATMENT_DIRECTION_INVALID" | "FTA_BOX_NOT_ENTERED"; docIds: string[]; box: string | null }`;
    `Vat201Warning { code: "LAYOUT_FROM_2021_GUIDE" | "NEGATIVE_BOX" |
    "REFUND_NOT_APPLICABLE" | "VOLUNTARY_DISCLOSURE_MAY_BE_NEEDED" |
    "NIL_RETURN"; box: string | null; periodStart: string | null }`.
  - `Vat201 { status: "complete" | "incomplete"; box1: Record<Emirate,
    BoxFigure>; boxes: Record<"2" | "3" | ... | "11", BoxFigure>;
    box12: Fils | null; box13: Fils | null; box14: Fils | null;
    box15: boolean | null; corrections: { periodStart: string;
    netVatEffect: Fils; overThreshold: boolean }[]; problems:
    Vat201Problem[]; warnings: Vat201Warning[]; excludedDocIds:
    string[]; notComputed: string[] }`.
  - `computeVat201(input: Vat201Input, packs?: readonly RulePack[]):
    Traced<Vat201>` (pack selected on `periodEnd`). Mapping (credit
    notes subtract their net, VAT and
    claimed VAT; out-of-scope documents and purchases that are
    zero-rated or exempt go to `excludedDocIds`):

    ```
    sale standard            -> box1[emirate] amount += net, vat += vat
                                (emirate null: EMIRATE_REQUIRED)
    sale zero-rated          -> box4 amount += net
    sale exempt              -> box5 amount += net
    sale reverse-charge      -> TREATMENT_DIRECTION_INVALID
    purchase standard        -> box9 amount += net, vat += claimedVat
    purchase reverse-charge  -> box3 amount += net, vat += vat
                                box10 amount += net, vat += claimedVat
    claimedVat null (box 9 or 10 doc) -> INPUT_TAX_UNDECIDED
    claimedVat > vat         -> CLAIMED_EXCEEDS_VAT
    vat > 0 on zero-rated, exempt or out-of-scope -> VAT_ON_NON_STANDARD
    claimedVat > 0 on an excluded purchase -> CLAIMED_ON_UNTAXED
    box2, box6, box7: "entered" -> its amount and vat; "none" -> 0;
                      "not-entered" -> figure null, FTA_BOX_NOT_ENTERED
    adjustments -> the adjustment column of their box (0 when absent)
    box8  = sums over box1 (all emirates) and boxes 2 to 7, per column
    box11 = box9 + box10, per column
    box12 = box8.vat + box8.adjustment
    box13 = box11.vat + box11.adjustment
    box14 = box12 - box13
    box15 = refundRequested when box14 < 0, else null
            (refundRequested with box14 >= 0: REFUND_NOT_APPLICABLE)
    any problem -> status "incomplete" and box8, 11, 12, 13, 14, 15 null
    ```

    Corrections: documents with `correctsPeriodStart` are counted in
    this return as normal and also grouped by that period; their net
    VAT effect is each document's Box 14 effect, as the mapping places
    it (credit notes negative): standard sale `+vat`; standard
    purchase `-claimedVat`; reverse-charge purchase `vat -
    claimedVat`; anything else `0` (review fix I1, 2026-11-26: the
    earlier "sale VAT minus claimed VAT" left out Box 3 and counted
    documents in no box); `overThreshold` when the
    absolute effect for one period is more than
    `errorCorrectionThresholdFils`, which adds the warning
    `VOLUNTARY_DISCLOSURE_MAY_BE_NEEDED` for that period. Always the
    warning `LAYOUT_FROM_2021_GUIDE`; `NEGATIVE_BOX` for each box
    figure below zero; `NIL_RETURN` when no document and every FTA box
    is `none`. `notComputed` = `["Additional Reporting Requirements
    section (not read)", "Tax refunds to tourists and imported goods
    figures come from the FTA; they are entered, not computed"]`.
    Trace: one line per box, id `vat201.box.<n>`, inputs naming the
    document count, rule `box201Layout`.

- [ ] **Step 1: Write the failing tests**

`vat201.test.ts` (documents built with a local `doc()` helper):
- `standard_sale_by_emirate`: two DU sales net `10000n` VAT `500n`
  and one AZ sale net `20000n` VAT `1000n`, FTA boxes `none`, one
  purchase standard net `4000n` VAT `200n` claimed `200n`: box1 DU
  `{ 20000n, 1000n, 0n }`, box1 AZ `{ 20000n, 1000n, 0n }`, box9
  `{ 4000n, 200n, 0n }`, box12 `2000n`, box13 `200n`, box14 `1800n`,
  status `complete`.
- `credit_note_subtracts`: a DU credit note net `5000n` VAT `250n`
  reduces box1 DU to `{ 15000n, 750n }`.
- `reverse_charge_both_sides`: purchase reverse-charge net `10000n`
  VAT `500n` claimed `500n`: box3 `{ 10000n, 500n }`, box10
  `{ 10000n, 500n }`, box14 `0n`.
- `zero_and_exempt_amount_only`: zero-rated sale net `7000n` gives
  box4 amount `7000n`, VAT `null`; exempt `3000n` gives box5.
- `input_tax_undecided_incomplete`: a standard purchase with
  `claimedVat null` gives status `incomplete`, problem
  `INPUT_TAX_UNDECIDED` naming its id, box14 `null`, box9 amount
  still shown.
- `fta_box_not_entered_incomplete` (Review Focus 5): box6
  `not-entered` gives `boxes["6"]` all `null`, problem
  `FTA_BOX_NOT_ENTERED` box `"6"`, box12 `null`; never `0n`.
- `net_refund_period_signed` (Review Focus 4): sales VAT `100n`,
  claimed VAT `900n`: box14 `-800n`, `NEGATIVE_BOX` for box 14,
  `box15` equals `refundRequested`; with `refundRequested true` and
  box14 positive, `REFUND_NOT_APPLICABLE` and box15 `null`.
- `credit_notes_exceed_sales`: one DU sale VAT `100n` and a DU
  credit note VAT `300n`: box1 DU VAT `-200n`, `NEGATIVE_BOX` box
  `"1"`.
- `correction_over_threshold_flags` (Review Focus 3): purchase
  credit notes correcting `2026-01-01` with claimed VAT totalling
  `1000001n` give `corrections[0]` `{ "2026-01-01", 1000001n, true
  }` and the warning; `1000000n` gives `overThreshold false`.
- `correction_effect_formula_as_written`: a sale VAT `100n` and a
  reverse-charge purchase VAT `500n` claimed `0n` correcting
  `2026-01-01` give `600n`; a standard purchase claimed `50n`
  correcting `2025-10-01` gives `-50n`.
- `reverse_charge_correction_over_threshold_warns` (VAT `1500000n`,
  claimed `0n`: effect `1500000n`, warning),
  `reverse_charge_fully_claimed_correction_no_warning` (VAT and
  claimed `2000000n`: effect `0n`, no warning),
  `excluded_purchase_correction_has_no_effect` (zero-rated, claimed
  `2000000n`: effect `0n`), `claimed_on_untaxed_purchase_problem`.
- `sale_reverse_charge_invalid`, `claimed_exceeds_vat`,
  `vat_on_exempt_problem`, `emirate_required`: each gives its code.
- `nil_return`: no documents, FTA boxes `none`: status `complete`,
  box14 `0n`, warning `NIL_RETURN`.
- `layout_labels`: `VAT201_BOXES` has 15 rows; boxes 2, 6, 7 are
  `ftaPopulated`; every result carries `LAYOUT_FROM_2021_GUIDE`.

`vat201-props.test.ts` (fast-check, 0 to 30 random complete
documents including credit notes and corrections, random entered or
`none` FTA boxes, random signed adjustments): box8 VAT equals box1
VAT over emirates plus boxes 2, 3, 6 and 7 VAT; box14 equals box12
minus box13; adding a document and its reverse leaves every box
unchanged; the corrections total equals the Box 14 change the
correcting documents cause; computing twice gives deep-equal output.

- [ ] **Step 2: Run** `pnpm --filter @payroll/engine test vat201`.
  Expected: FAIL.
- [ ] **Step 3: Implement** `vat201-layout.ts` then `vat201.ts`
  (aggregation, totals and corrections as separate functions under 30
  lines each).
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(engine): VAT 201 box computation`.

### Task 5: Engine corporate tax worksheet and e-invoicing rules (F7, F8)

Money and law task: fresh per-task review.

**Files:**
- Create: `packages/engine/src/tax/corporate-tax.ts`,
  `src/tax/einvoicing.ts`
- Modify: `packages/engine/src/index.ts`
- Test: `packages/engine/tests/corporate-tax.test.ts`,
  `tests/einvoicing.test.ts`

**Interfaces:**
- Consumes: Task 1 `CT_PACKS`, `EINVOICING_PACKS`; Task 3
  `addMonthsClamped`, `addBusinessDays`, `parseWeekend`; `mulDiv`,
  `Fils`, `ParamValue`, `Traced`, `selectPack`, `requireParam`,
  `EngineError`.
- Produces (`corporate-tax.ts`):
  - `CtAdjustment { label: string; amount: Fils; effect: "add" |
    "deduct" }` (amount 0 or more, else `INVALID_AMOUNT`).
  - `CtInput { periodStart: string; periodEnd: string;
    accountingProfit: Fils (signed); adjustments: CtAdjustment[];
    revenue: Fils; sbr: { elected: boolean; revenueWithinThresholdIn
    PriorPeriods: boolean | null; qualifyingFreeZoneOrMneMember:
    boolean | null }; overrides?: Record<string, ParamValue> }`.
  - `SbrStatus = "not-elected" | "conditions-met" |
    "condition-not-met" | "not-assessed"`.
  - `CtResult { taxableIncome: Fils; periodLoss: Fils; zeroBandPortion:
    Fils; mainBandPortion: Fils; taxBeforeRelief: Fils; sbr: { status:
    SbrStatus; reasons: string[] }; taxAfterRelief: Fils | null;
    dueDate: string; notComputed: string[] }`.
  - `computeCorporateTax(input: CtInput, packs?: readonly RulePack[]):
    Traced<CtResult>`: pack selected on `periodEnd` (before
    2026-01-01: `NO_PACK_FOR_DATE`); `periodEnd` after `periodStart`
    and at most 18 months later (else `INVALID_PERIOD`); `pre = profit
    + adds - deducts`; `taxableIncome = max(pre, 0)`; `periodLoss =
    max(-pre, 0)` (shown, not carried); zero band portion =
    `min(taxable, zeroBandUpperFils)` taxed at `zeroBandRateBps`; the
    rest at `mainRateBps`, each with `mulDiv(..., 10000n,
    taxRounding)`. SBR, in this order: not elected gives
    `not-elected` and `taxAfterRelief = taxBeforeRelief`; `revenue >
    sbrRevenueThresholdFils`, `revenueWithinThresholdInPriorPeriods
    false` or `qualifyingFreeZoneOrMneMember true` gives
    `condition-not-met` (reasons name each) and `taxAfterRelief =
    taxBeforeRelief`; a `null` attestation, or `sbrLastPeriodEnd`
    unsourced with no override, gives `not-assessed` (reason
    `"SBR_END_DATE_UNSOURCED"` for the latter) and `taxAfterRelief
    null`; an override `sbrLastPeriodEnd` earlier than `periodEnd`
    gives `condition-not-met`; otherwise `conditions-met` and
    `taxAfterRelief 0n` ("treated as not having derived any Taxable
    Income"). `dueDate = addMonthsClamped(periodEnd,
    returnDueMonthsAfterPeriodEnd)`. `notComputed` = `["tax loss
    relief and carry-forward", "qualifying free zone person rates",
    "tax group consolidation", "late filing and payment penalties"]`.
    Trace ids `ct.taxable-income`, `ct.zero-band`, `ct.main-band`,
    `ct.sbr`, `ct.due-date`; an override shows `overridden: true`.
- Produces (`einvoicing.ts`):
  - `RevenueBand = "large" | "small" | "unknown"`;
    `einvoicingDeadlines(revenue: Fils | null, asOf: string, packs?):
    Traced<{ band: RevenueBand; appointBy: string | null; goLive:
    string | null }>`: `revenue >= largeRevenueThresholdFils` is
    `large`; below is `small`; `null` is `unknown` with both dates
    `null`; trace id `einv.deadlines`.
  - `appointmentFineExposure(appointBy: string, appointedOn: string |
    null, asOf: string, packs?): Traced<{ monthsLate: number; amount:
    Fils }>`: `end = appointedOn ?? asOf`; `end <= appointBy` gives 0
    months; else `monthsLate` = the smallest k >= 1 with
    `addMonthsClamped(appointBy, k) >= end` ("each month or part
    thereof"); `amount = monthsLate * notImplementedFinePerMonthFils`;
    trace id `einv.fine.appointment`.
  - `missingDocumentFineExposure(counts: { month: string (YYYY-MM);
    invoices: number; creditNotes: number }[], packs?): Traced<{
    amount: Fils; byMonth: { month: string; amount: Fils }[] }>`: per
    month `min(invoices * missingInvoiceFineFils,
    missingInvoiceMonthlyCapFils) + min(creditNotes *
    missingCreditNoteFineFils, missingCreditNoteMonthlyCapFils)`;
    counts whole numbers 0 or more (else `INVALID_COUNT`); duplicate
    month throws `INVALID_PERIOD`; trace id `einv.fine.missing`.
  - `einvoiceIssueBy(transactionDate: string, holidays: readonly
    string[], packs?): Traced<string>` = `addBusinessDays(
    transactionDate, issueWindowBusinessDays, weekend, holidays)`;
    trace id `einv.issue-by`.
  - `tinFromTrn(trn: string, packs?): string` (first `tinDigits`
    digits; a TRN that is not all digits or shorter than `tinDigits`
    throws `INVALID_TRN`); `participantIdFor(trn, packs?): { scheme:
    string; id: string }` = `{ scheme: participantScheme, id:
    tinFromTrn(trn) }` (no separator is guessed).

- [ ] **Step 1: Write the failing tests**

`corporate-tax.test.ts` (period `2026-01-01` to `2026-12-31`):
- `below_band_zero_tax`: profit `30000000n` (AED 300,000), no
  adjustments: taxable `30000000n`, `taxBeforeRelief 0n`.
- `above_band_nine_hundred_bps`: profit `47500000n` (AED 475,000):
  `mainBandPortion 10000000n`, `taxBeforeRelief 900000n`.
- `adjustments_apply`: profit `40000000n`, add `5000000n`, deduct
  `2500000n`: taxable `42500000n`.
- `loss_period`: profit `-1000000n`: taxable `0n`, `periodLoss
  1000000n`, tax `0n`.
- `sbr_end_unsourced_not_assessed` (Review Focus 5): elected, revenue
  `200000000n`, attestations true and false: `not-assessed`, reason
  `SBR_END_DATE_UNSOURCED`, `taxAfterRelief null`.
- `sbr_with_override_met`: same with override `sbrLastPeriodEnd
  "2029-12-31"`: `conditions-met`, `taxAfterRelief 0n`, trace
  `ct.sbr` has a rule with `overridden true`.
- `sbr_revenue_over_threshold`: revenue `300000001n`:
  `condition-not-met`, `taxAfterRelief` equals `taxBeforeRelief`.
- `sbr_mne_member_not_met`, `sbr_null_attestation_not_assessed`.
- `due_date_nine_months`: `dueDate "2027-09-30"`.
- `pack_before_2026_refused`: period ending `2025-12-31` throws
  `NO_PACK_FOR_DATE`.
- `rates_secondary_in_trace`: rules `zeroBandUpperFils` and
  `mainRateBps` show status `secondary`.

`einvoicing.test.ts`:
- `bands`: revenue `5000000000n` is `large` with `appointBy
  "2026-10-30"`, `goLive "2027-01-01"`; `4999999999n` is `small` with
  `"2027-03-31"` and `"2027-07-01"`; `null` is `unknown`.
- `appointment_fine_part_month`: appointBy `2027-03-31`, not
  appointed, asOf `2027-04-01`: 1 month, `500000n`; asOf
  `2027-04-30`: 1; asOf `2027-05-01`: 2, `1000000n`; appointed on
  `2027-03-31`: 0.
- `appointment_fine_stops_at_appointment`: appointed `2027-04-15`,
  asOf `2027-09-01`: 1 month.
- `missing_documents_capped`: month `2027-08` with 60 invoices and 2
  credit notes: `500000n + 20000n`.
- `issue_by_business_days`: transaction `2027-07-01` (Thursday), no
  holidays: 14 business days later is `"2027-07-21"`.
- `participant_id`: TRN `"100123456700003"` gives `{ scheme: "0235",
  id: "1001234567" }`; `"12345"` throws `INVALID_TRN`.
- `fines_secondary`: trace rule `notImplementedFinePerMonthFils` has
  status `secondary`; `ftaReportingDeadline` is `null`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/engine test
  corporate-tax einvoicing`. Expected: FAIL.
- [ ] **Step 3: Implement** both files.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(engine): corporate tax and e-invoicing`.

### Task 6: VAT route registry, tax profile, categories, parameters (F1)

**Files:**
- Create: `packages/contract/src/routes-vat.ts`,
  `src/tax/statements.ts`, `src/tax/profile.ts`,
  `src/tax/categories.ts`, `src/tax/parameters.ts`
- Modify: `packages/contract/src/routes.ts` (join `VAT_ROUTES`),
  `src/primitives.ts` (`SignedMoney` if absent), `src/route-def.ts`
  (`"text/csv-optional"` if absent), `src/errors.ts`,
  `src/examples.ts`, `src/index.ts`, `tests/routes.test.ts`
- Create: `packages/api/migrations/1201_tax_profile.sql`,
  `packages/api/src/tax/audit.ts`, `src/tax/profile.ts`,
  `src/tax/categories.ts`, `src/tax/parameters.ts`,
  `src/routes/vat-setup.ts`
- Modify: `packages/api/src/db/migrate.ts` (only if it does not
  accept four-digit names yet), `src/db/money.ts`
  (`toSignedMoney`, `parseSignedMoney` if absent), `src/app.ts`,
  `tests/helpers/seed.ts` (`seedVat`), `tests/leak.test.ts`,
  `tests/conformance.test.ts`
- Test: `packages/contract/tests/routes-vat.test.ts`,
  `tests/tax-copy.test.ts`, `packages/api/tests/vat-setup.test.ts`

**Interfaces:**
- Consumes: Plan 3 `RouteDef`, `ten`, `PAYROLL`, `OWNER`, `Id`,
  `IsoDate`, `Money`, `Timestamp`, `register`, `ReqCtx`, `ApiError`,
  `appendAudit`, `AuditInput`, `assertNoSensitive`, `dubaiDate`,
  `seedCompany`, `call`; Task 1 `packParamsView`, `VAT_PACKS`,
  `EMPLOYEE_EXPENSE_VAT_PACKS`, `CT_PACKS`, `EINVOICING_PACKS`.
- Produces (contract):
  - `routes.ts`: if `ROUTE_GROUPS` exists (Plan 10 Task 1), append
    `VAT_ROUTES` as its last group; else create `ROUTE_GROUPS:
    readonly (readonly RouteDef[])[]` from the lists `ROUTES` spreads
    today, in that order, plus `VAT_ROUTES`, and set `ROUTES =
    ROUTE_GROUPS.flat()`.
  - `SignedMoney` (Plan 11 Task 1 definition: `^-?\d{1,9}\.\d{2}$`,
    refusing `"-0.00"`) if absent. `RouteDef.contentType` gains
    `"text/csv-optional"` (Plan 6 Task 1 meaning: JSON by default, CSV
    when the query has `format=csv`) if absent.
  - `statements.ts`, exact texts:
    - `TAX_NOT_ADVICE` = "Figures are worked from what your company
      entered and from rules as read by the product team. This is not
      tax advice and not a filing with the Federal Tax Authority. Check
      every figure before you file."
    - `VAT201_LAYOUT_NOTE` = "Box layout follows the FTA VAT Returns
      User Guide of August 2021 (V4.0). The current EmaraTax form may
      differ. Check the boxes on EmaraTax before you file."
    - `VAT_EXPORT_NOTE` = "For your records and for typing figures into
      EmaraTax by hand. No FTA upload format was found, so this product
      does not send returns to the FTA."
    - `TRN_FORMAT_NOTE` = "TRN checked as 15 digits. This format is a
      product assumption; no FTA rule for the format or a check digit
      was read."
    - `DEC17_NOTE` = "Conditions as read from FTA Decision No. 17 of
      2026 (unofficial English translation), in force from 1 October
      2026. Your company confirms each condition. The product does not
      decide whether input tax may be deducted."
    - `CT_NOTE` = "Worksheet from accounting figures your company
      entered. Not a corporate tax return. Each rate and relief shows
      how well it is sourced."
    - `EINVOICE_FIELD_NOTE` = "Working field set. The UAE e-invoicing
      Data Dictionary and its mandatory field list were not read; only
      IBT-030 and BTAE-15 are named in the FTA FAQ. Your accredited
      service provider checks every invoice."
    - `EINVOICE_PROVIDER_NOTE` = "Invoices are sent and received
      through your accredited service provider. This product is not an
      accredited service provider and does not report to the FTA."
    - `FINE_EXPOSURE_NOTE` = "Possible fines as read from Cabinet
      Decision No. 106 of 2025 (search extract; entry into force not
      read). An estimate, not an assessment."
  - `profile.ts`: `PeriodMonths = z.union([z.literal(1),
    z.literal(3)])`; `Trn = z.string().regex(/^\d{15}$/)`;
    `Emirate = z.enum(["AZ","DU","SH","AJ","UQ","RK","FU"])`;
    `TaxProfileBody { legalName: 1..200; legalNameAr: string 1..200 |
    null; trn: Trn | null; vatRegisteredFrom: IsoDate | null;
    firstPeriodStart: IsoDate | null (day 01, refined, path
    ["firstPeriodStart"]); periodMonths: PeriodMonths | null;
    defaultEmirate: Emirate | null; taxGroupMember: boolean;
    tradeLicenceNumber: string 1..60 | null; einvoicingTin:
    ^\d{10}$ | null (the member's own TIN when `taxGroupMember`);
    lastAccountingPeriodEnd:
    IsoDate | null; lastAccountingPeriodRevenue: Money | null;
    holidays: IsoDate[] (0..60, unique); expenseCategoryMap: {
    expenseCategoryId: Id; taxCategoryId: Id }[] (0..200) }`;
    `TaxProfile = TaxProfileBody & { version: int >= 0; tin: string |
    null; trnNote: typeof TRN_FORMAT_NOTE; note: typeof
    TAX_NOT_ADVICE }`; `TaxProfileUpdate = TaxProfileBody & {
    expectedVersion: int >= 0 }`.
  - `categories.ts`: `VatTreatment = z.enum(["standard","zero-rated",
    "exempt","out-of-scope","reverse-charge"])`; `TaxCategoryCreate {
    code: ^[a-z][a-z0-9-]{0,31}$; name: 1..80; nameAr: 1..80 | null;
    treatment: VatTreatment; direction: "sale" | "purchase" | "both"
    }` refined: `reverse-charge` needs `direction "purchase"` (path
    `["direction"]`); `TaxCategoryUpdate { name?; nameAr?; status?:
    "active" | "retired" }` (treatment is fixed once created);
    `TaxCategory { id; code; name; nameAr; treatment; direction;
    status; inUse: boolean }`.
  - `parameters.ts`: `ParamView` (Task 1 fields, `status` as
    `z.enum(["official","secondary","convention","hypothetical",
    "unsourced"])`); `TaxParameters { asOf: IsoDate; params:
    ParamView[]; note: typeof TAX_NOT_ADVICE }`.
  - `VAT_ROUTES` (this task's six, all `ten(...)`): `getVatParameters
    GET /v1/vat/parameters` (PAYROLL), `getTaxProfile GET
    /v1/tax-profile` (PAYROLL), `putTaxProfile PUT /v1/tax-profile`
    (OWNER, mfa), `listTaxCategories GET /v1/tax-categories`
    (PAYROLL, `TaxCategory[]`), `createTaxCategory POST
    /v1/tax-categories` (PAYROLL, 201), `updateTaxCategory PATCH
    /v1/tax-categories/{id}` (PAYROLL).
  - Error codes: `TAX_PROFILE_VERSION_CONFLICT` 409,
    `TAX_CATEGORY_CODE_TAKEN` 409, `TAX_CATEGORY_NOT_FOUND` 404,
    `TAX_PROFILE_INCOMPLETE` 422 (used from Task 7). `EXAMPLES` for
    `TaxProfile`, `TaxCategory`, `TaxParameters`.
- Produces (api):
  - Migration 1201: `tax_profiles(company_id pk, version int, body
    jsonb, updated_by, updated_at)`, `tax_categories(id, company_id,
    code, name, name_ar, treatment, direction, status, created_by,
    created_at, unique(company_id, code))`; RLS as Plan 3; grants
    select, insert, update.
  - `audit.ts`: `VAT_SENSITIVE_KEYS = ["amount","net","vat",
    "claimedVat","trn","counterpartyTrn","counterpartyName",
    "legalName","accountingProfit","revenue","taxableIncome","tax",
    "lines","attestations","payload"]`; `vatAudit(tx: Db, e:
    AuditInput): Promise<AuditEvent>` throws `AUDIT_SENSITIVE_DATA` on
    any of these keys at any depth, then calls `assertNoSensitive` and
    `appendAudit`. Every Plan 12 service audits through it.
  - `profile.ts`: `getTaxProfile(tx: Db, companyId: string):
    Promise<TaxProfile>` (no row: version 0, every nullable field
    `null`, `taxGroupMember false`, empty lists, `legalName` from the
    company name); `putTaxProfile(ctx: ReqCtx, body:
    TaxProfileUpdate): Promise<TaxProfile>` (version mismatch 409;
    every mapped id must exist, a mapped tax category must be active
    with direction `purchase` or `both`, else 422
    `TAX_CATEGORY_NOT_FOUND`; `tin` = `tinFromTrn(trn)` or `null`);
    audit `vat.profile.updated` (`data: { changed: string[] }`);
    `requireVatProfile(tx, companyId): Promise<TaxProfile & { trn:
    string; firstPeriodStart: string; periodMonths: 1 | 3 }>` throws
    422 `TAX_PROFILE_INCOMPLETE` (detail `missing: string[]`).
  - `categories.ts`: list, create, update, `loadTaxCategory(tx,
    companyId, id): Promise<TaxCategory>` (404
    `TAX_CATEGORY_NOT_FOUND`); `inUse` true once a VAT document names
    it (Task 7). Audit `vat.category.created`, `vat.category.updated`.
  - `parameters.ts`: `taxParameters(asOf: string): TaxParameters`
    concatenates `packParamsView` of the four packs on `asOf` (a pack
    not yet in force is skipped); the route uses
    `dubaiDate(deps.now())`.
  - `seed.ts`: `seedVat(app, seeded)` sets the profile (legal name
    "Sample Trading LLC", TRN `"100000000000003"`, registered
    `2025-01-01`, first period `2026-01-01`, quarterly, emirate `DU`,
    revenue `"2000000.00"`), creates one category per treatment
    (`std-sales`, `zero-sales`, `exempt-sales`, `std-purchases`,
    `rc-services`) and returns their ids.

- [ ] **Step 1: Write the failing tests**

`routes-vat.test.ts`: `VAT_ROUTES.map((r) => r.id)` deep-equals the
literal `VAT_ROUTE_IDS` in the test (this task: the six ids above;
each later task appends its ids in the order listed there); every VAT
route has `auth: "tenant"` and roles a subset of `["owner","hr"]`;
none is `DELETE`; every `VAT_ROUTES` entry is in `ROUTES`; `ROUTES`
deep-equals `ROUTE_GROUPS.flat()` and ends with `VAT_ROUTES`; no
`(method, path)` pair repeats; `putTaxProfile` has `mfa: true` and
roles `["owner"]`; `TaxProfileBody` rejects `firstPeriodStart
"2026-01-15"` with path `["firstPeriodStart"]` and `trn "12345"`;
`TaxCategoryCreate` rejects `reverse-charge` with direction `sale`.

`tax-copy.test.ts`: the nine statement constants equal the texts above
character for character; scanning every exported string of
`packages/contract/src/tax/*.ts` and `routes-vat.ts` (module
namespaces, recursively through `EXAMPLES`) finds none of the banned
words of the Global Constraints.

`vat-setup.test.ts`:
- `profile_defaults_version_0`: hr GET gives version 0, `trn null`,
  `tin null`, the two notes.
- `profile_owner_mfa_only`: hr PUT gives 403 `FORBIDDEN`; owner
  without MFA 403 `MFA_REQUIRED`; owner with MFA and version 0 gives
  version 1 and `tin "1000000000"`; again with version 0 gives 409.
- `profile_audit_names_fields_only`: the audit `data` deep-equals
  `{ changed: [...] }` and its text contains no TRN or legal name;
  `vatAudit` with `data: { trn: "1" }` throws
  `AUDIT_SENSITIVE_DATA`.
- `category_create_list_retire`: hr creates `std-sales`; the same
  code again gives 409; retiring it hides nothing from the list
  (status shown).
- `parameters_route`: GET `/v1/vat/parameters` gives rows from all
  four packs; `lateFilingFineFils` has `value null` and status
  `unsourced`; the body contains no `"5%"`.
- `vat_routes_payroll_roles_only`: manager and employee get 403 on
  every Task 6 GET.

- [ ] **Step 2: Run** `pnpm --filter @payroll/contract test` and
  `pnpm --filter @payroll/api test vat-setup`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS, including
  conformance, leak and the RLS catalog test over the new tables.
- [ ] **Step 5: Commit** `feat(api): VAT registry, profile, categories`.

### Task 7: VAT ledger, TRN checks and expense import (F2)

**Files:**
- Create: `packages/contract/src/tax/ledger.ts`,
  `packages/api/migrations/1202_vat_ledger.sql`,
  `packages/api/src/tax/trn.ts` (pure), `src/tax/document-check.ts`
  (pure), `src/tax/periods-lock.ts`, `src/tax/ledger.ts`,
  `src/tax/expense-import.ts`, `src/routes/vat-ledger.ts`
- Modify: contract `routes-vat.ts`, `errors.ts`, `examples.ts`,
  `index.ts`, `tests/routes-vat.test.ts`; api `src/app.ts`,
  `tests/helpers/seed.ts`, `tests/leak.test.ts`,
  `tests/conformance.test.ts`
- Test: `packages/api/tests/trn.test.ts`, `tests/vat-ledger.test.ts`,
  `tests/vat-import.test.ts`

**Interfaces:**
- Consumes: Task 6 `vatAudit`, `requireVatProfile`, `loadTaxCategory`,
  `Trn`, `Emirate`, `VatTreatment`, `TRN_FORMAT_NOTE`; Task 3
  `checkDocumentVat`; Task 5 `tinFromTrn`, `participantIdFor`; Plan 6
  expense tables (`expense_claims`, `expense_items`: `status`,
  `amount`, `vat_amount`, `supplier_name`, `supplier_trn`, `date`,
  `category_id`); Plan 3 `parseAed`, `toMoney`, `toSignedMoney`.
- Produces (contract):
  - `VatDocumentKind = z.enum(["tax-invoice","simplified-invoice",
    "credit-note"])`; `VatDocumentSource = z.enum(["manual",
    "expense-claim","einvoice-sent","einvoice-received"])`.
  - `VatDocumentInput { direction: "sale" | "purchase"; kind;
    documentNumber: 1..60; issueDate: IsoDate; taxDate?: IsoDate
    (defaults to issueDate); counterpartyName: 1..200;
    counterpartyTrn: Trn | null; categoryId: Id; emirate: Emirate |
    null; net: Money; vat: Money; claimedVat: Money | null;
    originalDocumentNumber?: 1..60; creditReason?: 3..300;
    correctsPeriodStart?: IsoDate; originalCurrency?: ^[A-Z]{3}$;
    exchangeRate?: ^\d{1,6}(\.\d{1,6})?$; description?: max 300 }`
    refined: a credit note needs `originalDocumentNumber` and
    `creditReason` (paths); `claimedVat` only on purchases (path
    `["claimedVat"]`); `claimedVat <= vat`.
  - `DocumentFinding { code: "VAT_NOT_AT_STANDARD_RATE" |
    "VAT_WITHOUT_TRN" | "COUNTERPARTY_TRN_IS_OWN" |
    "FOREIGN_CURRENCY" | "SOURCE_NO_LONGER_APPROVED" |
    "SIMPLIFIED_INVOICE"; severity: "warning"; message }`.
  - `VatDocument = VatDocumentInput & { id; taxDate: IsoDate;
    treatment: VatTreatment; source: VatDocumentSource; sourceRef:
    string | null; status: "active" | "voided"; findings:
    DocumentFinding[]; counterpartyTin: string | null; createdAt;
    voidNote: string | null }`.
  - `VatDocumentUpdate` (partial of the input); `VatDocumentVoid {
    note: 3..300 }`; `VatDocumentQuery { direction?; from?: IsoDate;
    to?: IsoDate; status?; source?; claimedVat?: "decided" |
    "undecided" }`.
  - `ExpenseImportRequest { from: IsoDate; to: IsoDate }` (at most 366
    days apart, refined); `ExpenseImportResult { created: int;
    existing: int; skipped: { claimId: Id; itemId: Id; reason:
    "category-not-mapped" | "period-filed" }[]; flagged: int }`.
  - `TrnCheckRequest { trn: string 1..40 }`; `TrnCheck { valid:
    boolean; problems: ("NOT_15_DIGITS")[]; tin: string | null;
    participantId: { scheme: string; id: string } | null; note: typeof
    TRN_FORMAT_NOTE }`.
  - Routes appended (all PAYROLL): `listVatDocuments GET
    /v1/vat/documents` (query `VatDocumentQuery`, `VatDocument[]`),
    `createVatDocument POST /v1/vat/documents` (201),
    `getVatDocument GET /v1/vat/documents/{id}`, `updateVatDocument
    PATCH /v1/vat/documents/{id}`, `voidVatDocument POST
    /v1/vat/documents/{id}/void`, `importExpenseVat POST
    /v1/vat/documents/import-expenses` (`ExpenseImportResult`),
    `checkTrn POST /v1/vat/trn-check` (`TrnCheck`).
  - Error codes: `VAT_DOCUMENT_DUPLICATE` 409, `VAT_DOCUMENT_INVALID`
    422 (detail `problems: string[]` with `VAT_ON_NON_STANDARD`,
    `CATEGORY_DIRECTION_MISMATCH`, `CATEGORY_RETIRED`,
    `EMIRATE_REQUIRED`, `CORRECTS_OPEN_PERIOD`), `VAT_DOCUMENT_VOIDED`
    409, `VAT_DOCUMENT_LINKED` 409, `PERIOD_FILED` 409 (detail
    `periodStart`).
- Produces (api):
  - Migration 1202: `vat_documents(id, company_id, direction, kind,
    document_number, issue_date, tax_date, counterparty_name,
    counterparty_trn, category_id, treatment, emirate, net bigint, vat
    bigint, claimed_vat bigint null, original_document_number,
    credit_reason, corrects_period_start, original_currency,
    exchange_rate, description, source, source_ref, status, findings
    jsonb, void_note, created_by, created_at, updated_at)`; unique
    `(company_id, source, source_ref)` where `source_ref is not null`;
    unique `(company_id, document_number)` where `direction = 'sale'
    and status = 'active'`; unique `(company_id, lower(
    counterparty_name), coalesce(counterparty_trn, ''),
    document_number)` where `direction = 'purchase' and status =
    'active'`; index `(company_id, tax_date)`. Grants select, insert,
    update. Amounts in clear (Ruling 14).
  - `trn.ts`: `checkTrn(text: string): TrnCheck` (15 digits; `tin` and
    `participantId` from Task 5 when valid).
  - `document-check.ts`: `checkVatDocument(input: VatDocumentInput &
    { taxDate: string }, category: TaxCategory, ownTrn: string):
    { problems: string[]; findings: DocumentFinding[] }`: category
    retired or direction not matching gives a problem; sale with
    treatment `standard` and `emirate null` gives `EMIRATE_REQUIRED`;
    Task 3 `checkDocumentVat` errors become problems and warnings
    become findings; `vat > 0` with no counterparty TRN gives
    `VAT_WITHOUT_TRN`; counterparty TRN equal to `ownTrn` gives
    `COUNTERPARTY_TRN_IS_OWN`; `originalCurrency` other than `AED`
    gives `FOREIGN_CURRENCY`; kind `simplified-invoice` gives
    `SIMPLIFIED_INVOICE` ("check the simplified invoice conditions").
  - `periods-lock.ts`: `assertPeriodOpen(tx: Db, companyId: string,
    taxDate: string): Promise<void>` and `assertCorrectsFiled(tx,
    companyId, periodStart: string): Promise<void>`. Task 7 ships both
    as functions that return at once (no return table exists yet) and
    calls them from every write; Task 9 gives them their bodies (409
    `PERIOD_FILED`; 422 `VAT_DOCUMENT_INVALID` with
    `CORRECTS_OPEN_PERIOD`) and owns their tests.
  - `ledger.ts`: `insertVatDocument(ctx: ReqCtx, input:
    VatDocumentInput, source: VatDocumentSource, sourceRef: string |
    null): Promise<VatDocument>` (all the checks below; used by the
    routes with `"manual"`, `null` and by Tasks 7, 12 and 13),
    `createVatDocument(ctx, input)`,
    `updateVatDocument(ctx, id, patch)`, `voidVatDocument(ctx, id,
    note)`, `listVatDocuments(ctx, q)`, `loadVatDocument(tx,
    companyId, id): Promise<VatDocument>` (404). Create and update
    call `requireVatProfile`, `assertPeriodOpen` on the tax date (old
    and new on update), `checkVatDocument`; treatment is copied from
    the category; problems give 422 `VAT_DOCUMENT_INVALID`; a unique
    violation gives 409 `VAT_DOCUMENT_DUPLICATE`; a voided document
    cannot change (409 `VAT_DOCUMENT_VOIDED`); a document linked to an
    e-invoice cannot change amounts or be voided (409
    `VAT_DOCUMENT_LINKED`; the `einvoices` lookup is added in Task
    12). Audit `vat.document.created`,
    `vat.document.updated` (`changed`), `vat.document.voided`.
  - `expense-import.ts`: `importExpenseVat(ctx, req):
    Promise<ExpenseImportResult>`: reads expense items of claims in
    status `approved` or `reimbursed` with item date in range and
    (`vat_amount > 0` or a supplier TRN); `net = amount - vatAmount`,
    `vat = vatAmount`, `claimedVat null`, `counterpartyName =
    supplierName ?? "Unknown supplier"`, category from
    `expenseCategoryMap` (unmapped: skipped), `source
    "expense-claim"`, `sourceRef "<claimId>:<itemId>"`, document
    number `"EXP-<claimId first 8>-<item index>"`, kind
    `tax-invoice`; inserts with `on conflict (company_id, source,
    source_ref) do nothing` and counts `existing`; items whose
    period is filed are skipped with reason `"period-filed"`; existing
    documents whose claim is no longer `approved` or `reimbursed` get
    the finding `SOURCE_NO_LONGER_APPROVED` (never voided
    automatically) and are counted in `flagged`. Audit
    `vat.documents.imported` (`data: { created, existing, skipped,
    flagged }`).
  - `seed.ts`: `seedVat` adds one approved expense claim item (meals,
    dated `2026-10-15`, `"105.00"` with VAT `"5.00"`, TRN
    `"100000000000011"`) mapped to `std-purchases`.

- [ ] **Step 1: Write the failing tests**

`trn.test.ts`: `"100000000000003"` is valid with `tin "1000000000"`
and participant scheme `"0235"`; `"10000000000000"` (14 digits) and
`"1000000000000AB"` give `NOT_15_DIGITS`; the response `note` equals
`TRN_FORMAT_NOTE`.

`vat-ledger.test.ts`:
- `create_sale_and_purchase`: hr creates a DU standard sale net
  `"1000.00"` VAT `"50.00"`; findings `[]`; treatment `standard`.
- `rate_mismatch_is_warning`: VAT `"51.00"` saves with finding
  `VAT_NOT_AT_STANDARD_RATE`.
- `zero_rated_with_vat_refused`: 422 with `VAT_ON_NON_STANDARD`.
- `sale_needs_emirate`: standard sale with `emirate null` gives 422
  `EMIRATE_REQUIRED`.
- `credit_note_needs_original`: missing `originalDocumentNumber`
  gives 400 validation error naming the path.
- `claimed_vat_on_sale_rejected`, `claimed_vat_over_vat_rejected`.
- `duplicate_sale_number_409`; `duplicate_purchase_same_supplier_409`;
  the same purchase number from another supplier saves.
- `void_then_edit_409`; `void_needs_note`.
- `no_profile_422`: before `seedVat`, create gives 422
  `TAX_PROFILE_INCOMPLETE` with `missing` containing `"trn"`.
- `audit_has_no_amounts`: the audit rows' `data` text contains no
  `"1000.00"`, no TRN and no counterparty name.
- `ledger_roles`: manager and employee get 403 on every ledger route.

`vat-import.test.ts`:
- `import_creates_purchase`: one document with net `"100.00"`, VAT
  `"5.00"`, `claimedVat null`, source `expense-claim`, category
  `std-purchases`.
- `import_expenses_idempotent` (Review Focus 1): a second import of
  the same range gives `created 0`, `existing 1`; one row in
  `vat_documents`.
- `import_expenses_concurrent_once` (Review Focus 1): two imports
  started together with `Promise.all` give `created` 1 and 0 between
  them and one row.
- `import_skips_unmapped`: a claim item whose expense category is not
  mapped is in `skipped` with `category-not-mapped`.
- `import_skips_draft_and_rejected`: claims in other statuses are not
  read.
- `import_range_limit`: 400 for a 367-day range.
- `import_flags_source_no_longer_approved`: after an import, the
  test sets the claim's status to `rejected` directly in the database
  (as table owner); a re-import gives `flagged 1` and the document
  carries `SOURCE_NO_LONGER_APPROVED`, still `active`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test trn vat-ledger
  vat-import`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above (pure modules first).
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): VAT ledger and expense import`.

### Task 8: Decision 17 assessments on purchase documents (F3)

**Files:**
- Create: `packages/contract/src/tax/employee-expense.ts`,
  `packages/api/migrations/1203_employee_expense_vat.sql`,
  `packages/api/src/tax/employee-expense.ts`,
  `src/routes/vat-employee-expense.ts`
- Modify: contract `routes-vat.ts`, `errors.ts`, `examples.ts`,
  `index.ts`, `tests/routes-vat.test.ts`; api `src/app.ts`,
  `tests/leak.test.ts`, `tests/conformance.test.ts`
- Test: `packages/api/tests/vat-employee-expense.test.ts`

**Interfaces:**
- Consumes: Task 2 `assessEmployeeExpense`, `EMPLOYEE_EXPENSE_CASES`;
  Task 7 `loadVatDocument`; Task 6 `vatAudit`, `DEC17_NOTE`.
- Produces (contract):
  - `EmployeeExpenseCase` and `Decision17Outcome` as zod enums with the
    Task 2 values; `ConditionView { id: string; text: string; policy:
    boolean; computed: boolean }`; `CaseView { case; conditions:
    ConditionView[]; needsDocumentedPolicy: boolean; sourceNote:
    string }`; `EmployeeExpenseCatalogue { cases: CaseView[]; note:
    typeof DEC17_NOTE }`.
  - `EmployeeExpenseAssessmentPut { case; attestations:
    Record<string, boolean | null>; stayDays?: int 1..3650;
    policyReference?: 1..200; expenseDate?: IsoDate (defaults to the
    document's tax date) }`.
  - `EmployeeExpenseAssessmentView { documentId; case; outcome;
    met: string[]; unmet: string[]; unknown: string[];
    policyConditions: string[]; policyReference: string | null;
    packVersion: string | null; reason: string | null; claimedVat:
    Money | null; mismatch: boolean; assessedBy: Id; assessedAt;
    note: typeof DEC17_NOTE }` (`mismatch` true when the outcome is
    `condition-not-met` and `claimedVat` is above `"0.00"`).
  - Routes appended (PAYROLL): `listEmployeeExpenseCases GET
    /v1/vat/employee-expense-cases`, `getEmployeeExpenseAssessment GET
    /v1/vat/documents/{id}/employee-expense`,
    `putEmployeeExpenseAssessment PUT
    /v1/vat/documents/{id}/employee-expense`.
  - Error codes: `ASSESSMENT_NOT_PURCHASE` 422,
    `POLICY_REFERENCE_REQUIRED` 422, `UNKNOWN_CONDITION` 422.
- Produces (api):
  - Migration 1203: `employee_expense_vat(company_id, document_id pk
    references vat_documents, case_code, attestations jsonb,
    stay_days, policy_reference, outcome, result jsonb, assessed_by,
    assessed_at)`; select, insert, update.
  - `employee-expense.ts`: `putAssessment(ctx, documentId, body)`:
    the document must be an active purchase (else 422
    `ASSESSMENT_NOT_PURCHASE`); when any `policy` condition is
    attested `true` and `policyReference` is absent, 422
    `POLICY_REFERENCE_REQUIRED` (detail names the condition ids);
    engine `UNKNOWN_CONDITION` and `INVALID_COUNT` become 422; stores
    the result and returns the view; never writes `claimedVat`. Audit
    `vat.assessment.updated` (`data: { documentId, outcome }`).
    `getAssessment` gives 404 when none. `catalogue()` maps
    `EMPLOYEE_EXPENSE_CASES` (with each case's source note).

- [ ] **Step 1: Write the failing tests** in
  `vat-employee-expense.test.ts` (on the Task 7 seeded imported
  purchase, tax date in October 2026):
- `catalogue_six_cases`: GET catalogue lists six cases; `parking`
  `needsDocumentedPolicy true`; `note` equals `DEC17_NOTE`.
- `assessment_conditions_met`: transport with all four conditions
  true gives `conditions-met`; the document's `claimedVat` is still
  `null` afterwards.
- `policy_reference_required`: parking with
  `documented-parking-policy: true` and no `policyReference` gives
  422 `POLICY_REFERENCE_REQUIRED`; with `"HR-POL-7 v2"` it saves.
- `mismatch_flagged`: after setting `claimedVat "5.00"` on the
  document, a `condition-not-met` assessment shows `mismatch true`.
- `before_october_not_assessed`: `expenseDate "2026-09-15"` gives
  `not-assessed` with `packVersion null`.
- `sale_document_refused`: 422 `ASSESSMENT_NOT_PURCHASE`.
- `unknown_condition_422`.
- `audit_has_no_attestations`: audit data text has no
  `"no-cash-alternative"`.
- `assessment_roles`: manager and employee 403.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test
  vat-employee-expense`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): Decision 17 assessments`.

### Task 9: VAT periods, returns, export, upload checklist (F4 to F6)

**Files:**
- Create: `packages/contract/src/tax/returns.ts`,
  `packages/api/migrations/1204_vat_returns.sql`,
  `packages/api/src/tax/to-engine.ts` (pure), `src/tax/periods.ts`,
  `src/tax/returns.ts`, `src/tax/return-export.ts` (pure),
  `src/tax/checklist.ts` (pure), `src/routes/vat-returns.ts`
- Modify: `packages/api/src/tax/periods-lock.ts` (real lock checks),
  `packages/api/src/app.ts` (csv-optional responses, only if Plan 6
  Task 7 has not added them: with `format=csv` the handler returns
  `{ csv: string; fileName: string }`, served as `text/csv;
  charset=utf-8` with `Content-Disposition: attachment`),
  contract `routes-vat.ts`, `errors.ts`, `examples.ts`, `index.ts`,
  `tests/routes-vat.test.ts`; api `src/app.ts`, `tests/leak.test.ts`,
  `tests/conformance.test.ts`
- Test: `packages/api/tests/vat-returns.test.ts`,
  `tests/vat-export.test.ts`

**Interfaces:**
- Consumes: Task 3 `vatPeriods`, `vatReturnDue`; Task 4
  `computeVat201`, `VAT201_BOXES`, `EMIRATES`; Task 6
  `requireVatProfile`, `vatAudit`, statements; Task 7 documents and
  `periods-lock.ts`; Task 8 assessments (for warnings); Plan 3
  `canonicalJson`, `sha256Hex`, `dubaiDate`; the CSV writer `toCsv`
  (Plan 11 Task 1, `src/export/csv.ts`; if absent, create it there
  with Plan 11's exact contract: RFC 4180, CRLF, quoted cells, null
  empty, formula-start cells prefixed with `'` unless they match
  `SignedMoney`).
- Produces (contract):
  - `FtaBoxPut = { kind: "not-entered" } | { kind: "none" } | { kind:
    "entered"; amount: SignedMoney; vat: SignedMoney }`.
  - `VatReturnInputs { box2: FtaBoxPut; box6: FtaBoxPut; box7:
    FtaBoxPut; adjustments: Partial<Record<"1:AZ" | ... | "1:FU" |
    "3" | "9" | "10", SignedMoney>>; refundRequested: boolean }`.
  - `BoxView { box: string; emirate: Emirate | null; guideLabel:
    string; amount: SignedMoney | null; vat: SignedMoney | null;
    adjustment: SignedMoney | null }`.
  - `VatPeriodView { start: IsoDate; end: IsoDate; dueDate: IsoDate;
    rolled: boolean; returnId: Id | null; status: "open" | "draft" |
    "marked-filed"; dueRule: { status; sourceNote } }`;
    `VatPeriodQuery { from: IsoDate; to: IsoDate }`.
  - `VatReturnStatus = z.enum(["draft","marked-filed"])`;
    `VatReturn { id; periodStart; periodEnd; dueDate; status;
    completeness: "complete" | "incomplete"; version: int >= 1;
    inputs: VatReturnInputs; boxes: BoxView[]; box12: SignedMoney |
    null; box13: SignedMoney | null; box14: SignedMoney | null; box15:
    boolean | null; problems: { code; docIds: Id[]; box: string | null
    }[]; warnings: { code; box: string | null; periodStart: IsoDate |
    null }[]; decision17Mismatches: Id[]; documentCount: int;
    snapshotHash: ^[0-9a-f]{64}$; notComputed: string[]; filed: {
    filedOn: IsoDate; ftaReference: string; markedBy: Id } | null;
    layoutNote: typeof VAT201_LAYOUT_NOTE; note: typeof TAX_NOT_ADVICE
    }`.
  - `VatReturnCompute { periodStart: IsoDate }`; `MarkFiled { filedOn:
    IsoDate; ftaReference: 1..60; checklistConfirmed: z.literal(true)
    }`; `ExportQuery { format?: "json" | "csv" }`.
  - `Vat201Export { schema: z.literal("payroll.vat201.v1"); trn;
    legalName; periodStart; periodEnd; dueDate; boxes: BoxView[];
    box12; box13; box14; box15; documentCount; snapshotHash;
    completeness; layout: typeof VAT201_LAYOUT_NOTE; note: typeof
    VAT_EXPORT_NOTE }`; `DocumentRegister { periodStart; rows: {
    documentId; direction; kind; documentNumber; taxDate;
    counterpartyName; counterpartyTrn; treatment; emirate; net; vat;
    claimedVat: Money | null; box: string | null }[]; note: typeof
    VAT_EXPORT_NOTE }`.
  - `ChecklistItem { id: string; text: string; done: boolean | null
    }`; `UploadChecklist { returnId; items: ChecklistItem[]; note:
    typeof VAT_EXPORT_NOTE }`.
  - Routes appended: `listVatPeriods GET /v1/vat/periods` (PAYROLL,
    query `VatPeriodQuery`), `computeVatReturn POST /v1/vat/returns`
    (PAYROLL; 200, creates or recomputes the draft),
    `getVatReturn GET /v1/vat/returns/{id}` (PAYROLL),
    `putVatReturnInputs PUT /v1/vat/returns/{id}/inputs` (PAYROLL),
    `getVatReturnChecklist GET /v1/vat/returns/{id}/checklist`
    (PAYROLL), `markVatReturnFiled POST
    /v1/vat/returns/{id}/mark-filed` (OWNER, mfa), `exportVatReturn
    GET /v1/vat/returns/{id}/export` (PAYROLL, mfa, csv-optional),
    `exportVatReturnDocuments GET /v1/vat/returns/{id}/documents`
    (PAYROLL, mfa, csv-optional).
  - `EXAMPLES` for `VatReturn` and `Vat201Export` list only the seven
    Box 1 rows and Box 4, so no FTA label with a banned word enters the
    contract.
  - Error codes: `PERIOD_NOT_FOUND` 422 (not a period of the
    profile's calendar), `PERIOD_IN_FUTURE` 422 (period end after
    today), `RETURN_FILED` 409, `RETURN_INCOMPLETE` 422,
    `RETURN_STALE` 409 (documents changed since the last compute).
- Produces (api):
  - Migration 1204: `vat_returns(id, company_id, period_start,
    period_end, due_date, status, version int, inputs jsonb, result
    jsonb, document_ids jsonb, snapshot_hash, filed_on, fta_reference,
    marked_by, marked_at, created_at, updated_at,
    unique(company_id, period_start))`; select, insert, update;
    trigger refusing any UPDATE of a row whose old status is
    `marked-filed`.
  - `to-engine.ts`: `toVat201Input(docs: VatDocument[], inputs:
    VatReturnInputs, period: VatPeriod): Vat201Input` (only `active`
    documents; `parseAed` for amounts, `parseSignedMoney` for signed
    inputs); `toReturnView(...)` maps `Vat201` to `BoxView[]` in
    `VAT201_BOXES` order (box 1 as seven rows, one per emirate).
  - `periods.ts`: `listPeriods(ctx, q): Promise<VatPeriodView[]>`
    (profile calendar from `requireVatProfile`; due dates with the
    profile holidays; status from `vat_returns`).
  - `returns.ts`: `computeReturn(ctx, periodStart)`: the start must be
    a calendar period (422 `PERIOD_NOT_FOUND`) ending before today's
    Dubai date (422 `PERIOD_IN_FUTURE`); a `marked-filed` row gives
    409 `RETURN_FILED`; loads active documents with tax date in the
    period, computes, stores `document_ids`, `snapshot_hash =
    sha256Hex(canonicalJson({ docs, inputs }))` over the documents'
    ids, amounts, treatments and `updated_at`, version + 1;
    `decision17Mismatches` = document ids whose assessment view has
    `mismatch true`. `putInputs` stores inputs and recomputes.
    `markFiled(ctx, id, body)`: recomputes the hash first; a
    different hash gives 409 `RETURN_STALE`; `incomplete` gives 422
    `RETURN_INCOMPLETE`; else status `marked-filed`. Audit
    `vat.return.computed` (`data: { periodStart, version, documentCount
    }`), `vat.return.filed`, `vat.return.exported` (`data: { format,
    kind }`).
  - `periods-lock.ts` now queries `vat_returns`: `assertPeriodOpen`
    gives 409 `PERIOD_FILED` when a `marked-filed` row covers the tax
    date; `assertCorrectsFiled` requires one.
  - `return-export.ts`: `vat201Json(ret, profile): Vat201Export`;
    `vat201Csv(ret, profile): string` = first line the
    `VAT_EXPORT_NOTE`, second the layout note, then `toCsv(["box",
    "emirate","label","amount","vat","adjustment"], rows)` with boxes
    12 to 15 as final rows; `documentRegisterCsv(reg): string`.
  - `checklist.ts`: `uploadChecklist(ret: VatReturn): ChecklistItem[]`,
    in order: `check-layout` ("Compare the boxes with the VAT 201 form
    on EmaraTax; this layout is from the 2021 guide"), `box1-emirates`
    ("Enter Box 1 for each emirate shown"), `fta-boxes` ("Check that
    Boxes 2, 6 and 7 match the values EmaraTax shows"),
    `input-tax-decided` (`done` = no `INPUT_TAX_UNDECIDED`),
    `decision17-review` (`done` = no mismatches),
    `corrections` (present only with a
    `VOLUNTARY_DISCLOSURE_MAY_BE_NEEDED` warning: "Check whether a
    voluntary disclosure is needed for the period named"),
    `refund-choice` (present only when box14 is negative), `pay-by-due`
    ("Pay any tax due by <dueDate>"), `record-reference` (`done` =
    `filed !== null`). `done` is `null` where the product cannot tell.

- [ ] **Step 1: Write the failing tests**

`vat-returns.test.ts` (clock 2026-11-26; each test first creates a DU
standard sale net `"1000.00"` VAT `"50.00"` dated `2026-08-10` and a
standard purchase net `"100.00"` VAT `"5.00"` dated `2026-08-12`):
- `periods_listed_with_due`: GET periods for 2026 gives four rows; Q3
  due `"2026-10-28"`; Q4 status `open`; `dueRule.status` is
  `secondary`.
- `compute_q3_complete`: with inputs box2, box6, box7 `none` and the
  purchase `claimedVat` set, compute gives `completeness complete`,
  box14 `"45.00"` (sale VAT 50 minus claimed 5), seven box-1 rows.
- `compute_defaults_incomplete`: a fresh compute (FTA boxes
  `not-entered`) gives `incomplete` and `box14 null`.
- `future_period_refused`: Q4 2026 gives 422 `PERIOD_IN_FUTURE`.
- `filed_period_locked` (Review Focus 3): after marking Q3 filed
  (owner, MFA, reference `"FTA-REF-1"`), creating, editing or voiding
  a document dated `2026-08-10` each gives 409 `PERIOD_FILED`; a
  purchase credit note dated in October with
  `correctsPeriodStart "2026-07-01"` saves; compute on Q3 gives 409
  `RETURN_FILED`.
- `correction_into_open_period_refused`: `correctsPeriodStart
  "2026-10-01"` (not filed) gives 422 `CORRECTS_OPEN_PERIOD`.
- `stale_return_refused`: compute, then add a document, then mark
  filed gives 409 `RETURN_STALE`.
- `incomplete_cannot_be_filed`: 422 `RETURN_INCOMPLETE`.
- `mark_filed_owner_mfa`: hr gets 403; owner without MFA 403
  `MFA_REQUIRED`.
- `decision17_mismatch_listed`: a `condition-not-met` assessment on a
  document with `claimedVat "5.00"` appears in
  `decision17Mismatches`.
- `filed_row_immutable`: a direct `UPDATE vat_returns` of a
  `marked-filed` row as `payroll_app` fails.

`vat-export.test.ts`:
- `export_json_shape`: `format=json` parses with `Vat201Export`,
  `schema "payroll.vat201.v1"`, `note` equals `VAT_EXPORT_NOTE`.
- `export_csv_header`: CSV line 1 equals `VAT_EXPORT_NOTE`, line 3 is
  `box,emirate,label,amount,vat,adjustment`.
- `export_keeps_negative_box14` (Review Focus 4): a period with
  claimed VAT above sales VAT exports box14 as `"-...."` in JSON and
  as an unquoted `-` value in CSV (not prefixed with `'`).
- `register_neutralises_formulas`: a counterparty name
  `"=HYPERLINK(1)"` is written as `'=HYPERLINK(1)` in the documents
  CSV.
- `export_needs_mfa`: hr without MFA gets 403 `MFA_REQUIRED`.
- `checklist_items`: for the complete Q3 return the ids are
  `check-layout, box1-emirates, fta-boxes, input-tax-decided,
  decision17-review, pay-by-due, record-reference`; `pay-by-due`
  text contains `2026-10-28`; `check-layout.done` is `null`.
- `no_submission_words`: no export or checklist body contains
  `"submitted"` or `"compliant"`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test vat-returns
  vat-export`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above (pure modules first).
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): VAT returns, export, checklist`.

### Task 10: Corporate tax worksheet API (F7)

**Files:**
- Create: `packages/contract/src/tax/corporate-tax.ts`,
  `packages/api/migrations/1205_corporate_tax.sql`,
  `packages/api/src/tax/corporate-tax.ts`, `src/routes/vat-ct.ts`
- Modify: contract `routes-vat.ts`, `errors.ts`, `examples.ts`,
  `index.ts`, `tests/routes-vat.test.ts`; api `src/app.ts`,
  `tests/leak.test.ts`, `tests/conformance.test.ts`
- Test: `packages/api/tests/vat-ct.test.ts`

**Interfaces:**
- Consumes: Task 5 `computeCorporateTax`; Task 6 `vatAudit`,
  `CT_NOTE`, `TAX_NOT_ADVICE`; Plan 3 `Keyring` (company DEK); Plan 10
  Task 1 `sealJson`, `openJson` (if absent, create them at Plan 10's
  path `packages/api/src/talent/seal.ts` with Plan 10's exact
  signatures and AAD `"<companyId>:<table>:<column>:<rowId>"`).
- Produces (contract):
  - `CtWorksheetInputs { accountingProfit: SignedMoney; adjustments: {
    label: 1..120; amount: Money; effect: "add" | "deduct" }[]
    (0..50); revenue: Money; sbr: { elected: boolean;
    revenueWithinThresholdInPriorPeriods: boolean | null;
    qualifyingFreeZoneOrMneMember: boolean | null };
    sbrLastPeriodEndOverride: IsoDate | null }`.
  - `CtWorksheetCreate { periodStart: IsoDate; periodEnd: IsoDate }`.
  - `CtWorksheet { id; periodStart; periodEnd; status: "draft" |
    "final"; version: int; inputs: CtWorksheetInputs | null; result: {
    taxableIncome: Money; periodLoss: Money; zeroBandPortion: Money;
    mainBandPortion: Money; taxBeforeRelief: Money; sbrStatus;
    sbrReasons: string[]; taxAfterRelief: Money | null; dueDate:
    IsoDate; notComputed: string[]; rules: { key; value: string |
    null; status; overridden: boolean }[] } | null; note: typeof
    CT_NOTE; disclaimer: typeof TAX_NOT_ADVICE }`.
  - `CtWorksheetUpdate { inputs: CtWorksheetInputs; expectedVersion:
    int }`.
  - Routes appended: `listCtWorksheets GET
    /v1/corporate-tax/worksheets`, `createCtWorksheet POST
    /v1/corporate-tax/worksheets` (201), `getCtWorksheet GET
    /v1/corporate-tax/worksheets/{id}`, `updateCtWorksheet PUT
    /v1/corporate-tax/worksheets/{id}` (all PAYROLL),
    `finaliseCtWorksheet POST
    /v1/corporate-tax/worksheets/{id}/finalise` (OWNER, mfa).
  - Error codes: `CT_PERIOD_INVALID` 422, `CT_PERIOD_TAKEN` 409,
    `CT_VERSION_CONFLICT` 409, `CT_FINAL` 409, `CT_NO_INPUTS` 422.
- Produces (api):
  - Migration 1205: `ct_worksheets(id, company_id, period_start,
    period_end, status, version, inputs_enc text null, created_by,
    created_at, updated_at, unique(company_id, period_start))`;
    select, insert, update.
  - `corporate-tax.ts`: create (engine `INVALID_PERIOD` and
    `NO_PACK_FOR_DATE` become 422 `CT_PERIOD_INVALID`), update
    (inputs sealed in `inputs_enc`; version check; `final` gives 409
    `CT_FINAL`), get (opens inputs and computes on read; the override
    is passed as `overrides.sbrLastPeriodEnd`), finalise (needs
    inputs, else 422 `CT_NO_INPUTS`). Audit `ct.worksheet.created`,
    `ct.worksheet.updated` (`data: { version, changed }`),
    `ct.worksheet.finalised`.

- [ ] **Step 1: Write the failing tests** in `vat-ct.test.ts`:
- `worksheet_compute`: create 2026; put profit `"475000.00"`, revenue
  `"2500000.00"`, SBR not elected: `taxBeforeRelief "9000.00"`,
  `taxAfterRelief "9000.00"`, `dueDate "2027-09-30"`; rules show
  `mainRateBps` status `secondary`.
- `sbr_not_assessed_by_default`: elected with true and false
  attestations and no override: `sbrStatus "not-assessed"`,
  `taxAfterRelief null` (not `"0.00"`).
- `sbr_override_marked`: with override `"2029-12-31"`:
  `conditions-met`, `taxAfterRelief "0.00"`, a rule `overridden
  true`.
- `negative_profit_allowed`: profit `"-1000.00"` gives `periodLoss
  "1000.00"`, taxable `"0.00"`.
- `inputs_encrypted`: the `ct_worksheets` row text contains no
  `"475000"`.
- `period_2025_refused`: 422 `CT_PERIOD_INVALID`.
- `final_locks`: owner with MFA finalises; a later PUT gives 409
  `CT_FINAL`; hr finalise 403.
- `ct_audit_no_profit`: audit data text has no profit or revenue.
- `ct_roles`: manager and employee 403.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test vat-ct`.
  Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): corporate tax worksheet`.

### Task 11: E-invoicing readiness tracker and fine exposure (F8)

**Files:**
- Create: `packages/contract/src/tax/einvoicing-readiness.ts`,
  `packages/api/migrations/1206_einvoicing_readiness.sql`,
  `packages/api/src/einvoicing/readiness.ts`,
  `src/einvoicing/readiness-view.ts` (pure),
  `src/routes/vat-einvoicing-readiness.ts`
- Modify: contract `routes-vat.ts`, `errors.ts`, `examples.ts`,
  `index.ts`, `tests/routes-vat.test.ts`; api `src/app.ts`,
  `tests/leak.test.ts`, `tests/conformance.test.ts`
- Test: `packages/api/tests/einvoicing-readiness.test.ts`,
  `tests/readiness-view.test.ts`

**Interfaces:**
- Consumes: Task 5 `einvoicingDeadlines`, `appointmentFineExposure`,
  `participantIdFor`; Task 1 `packParamsView`; Task 6
  `getTaxProfile`, `vatAudit`, `FINE_EXPOSURE_NOTE`,
  `EINVOICE_PROVIDER_NOTE`; Plan 11 Task 5 `Exposure` (if absent,
  create it at Plan 11's path `packages/contract/src/owner/deadlines.ts`
  with Plan 11's
  exact union: `{ status: "computed"; amount: Money; trace:
  TraceLine[] } | { status: "not-assessed"; reason: string } | {
  status: "none" }`); Plan 3 `dubaiDate`, `TraceLine`.
- Produces (contract):
  - `ReadinessStepId = z.enum(["revenue-band-confirmed",
    "provider-shortlisted","provider-appointed",
    "endpoints-registered","test-exchange-done","staff-briefed",
    "live"])`.
  - `ReadinessPut { providerName: 1..120 | null; appointedOn: IsoDate
    | null; contractReference: 1..120 | null; testExchangeOn: IsoDate
    | null; liveOn: IsoDate | null; steps: Partial<Record<
    ReadinessStepId, boolean>>; expectedVersion: int }` refined:
    `appointedOn` needs `providerName`; `liveOn` needs `appointedOn`.
  - `EinvoicingReadiness { version; band: "large" | "small" |
    "unknown"; bandBasis: { revenue: Money | null; periodEnd: IsoDate
    | null }; appointBy: IsoDate | null; goLive: IsoDate | null;
    daysToAppointBy: int | null; daysToGoLive: int | null; provider:
    { name; appointedOn; contractReference } | null; participantId: {
    scheme; id } | null; steps: { id; done: boolean }[]; warnings: (
    "TAX_GROUP_TIN_NOT_USABLE" | "NO_TRN_FOR_PARTICIPANT_ID" |
    "BAND_UNKNOWN" | "APPOINTMENT_OVERDUE" |
    "COUNTS_ONLY_PRODUCT_INVOICES")[]; exposure: {
    appointment: Exposure; missingDocuments: Exposure;
    ftaReporting: Exposure }; deadlineRules: ParamView[];
    exposureNote: typeof FINE_EXPOSURE_NOTE; providerNote: typeof
    EINVOICE_PROVIDER_NOTE; note: typeof TAX_NOT_ADVICE }`.
  - Routes appended: `getEinvoicingReadiness GET
    /v1/einvoicing/readiness` (PAYROLL), `putEinvoicingReadiness PUT
    /v1/einvoicing/readiness` (OWNER).
  - Error code: `READINESS_VERSION_CONFLICT` 409.
- Produces (api):
  - Migration 1206: `einvoicing_readiness(company_id pk, version,
    body jsonb, updated_by, updated_at)`; select, insert, update.
  - `readiness-view.ts`: `buildReadiness(profile: TaxProfile, body:
    ReadinessBody, asOf: string): Omit<EinvoicingReadiness, "version">`:
    band from `lastAccountingPeriodRevenue` (`null` gives `unknown`
    and `BAND_UNKNOWN`); days are `daysBetween(asOf, date)` (negative
    when past); appointment exposure: band `unknown` gives
    `not-assessed` ("revenue band unknown"), else
    `appointmentFineExposure(appointBy, appointedOn, asOf)` with 0
    months giving `none` and more giving `computed` with the trace
    (`APPOINTMENT_OVERDUE` when not appointed and past); missing
    documents exposure: `none` before `goLive`, else `computed` from
    Task 12's overdue counts (this task passes zero counts and Task 12
    wires the real ones); FTA reporting exposure always `not-assessed`
    ("reporting timeline not found"); `taxGroupMember true` gives
    `TAX_GROUP_TIN_NOT_USABLE`; no TRN gives
    `NO_TRN_FOR_PARTICIPANT_ID` and `participantId null`;
    `deadlineRules` = the `ae-einvoicing` rows of `packParamsView`.
  - `readiness.ts`: get (no row: version 0, all steps false), put
    (version check, audit `einvoice.readiness.updated` with `data: {
    changed }`).

- [ ] **Step 1: Write the failing tests**

`readiness-view.test.ts` (pure):
- `small_band_deadlines`: revenue `"2000000.00"`, asOf
  `2026-11-26`: band `small`, `appointBy "2027-03-31"`, `goLive
  "2027-07-01"`, `daysToAppointBy 125`, appointment exposure `none`.
- `large_band_overdue_exposure`: revenue `"60000000.00"`, not
  appointed, asOf `2026-11-26`: `appointBy "2026-10-30"`,
  `APPOINTMENT_OVERDUE`, exposure `computed` with amount
  `"5000.00"` (one month or part), trace rule status `secondary`.
- `band_unknown_not_assessed`: revenue `null` gives `BAND_UNKNOWN`
  and appointment exposure `not-assessed`.
- `fta_reporting_not_assessed`: always `not-assessed`.
- `tax_group_warning`, `participant_id_from_trn` (`{ "0235",
  "1000000000" }` for the seeded TRN).
`einvoicing-readiness.test.ts`:
- `vat_late_fines_shown_unsourced` (Review Focus 5): in the readiness
  response every `Exposure` that has an `amount` has `status
  "computed"`, and `ftaReporting` is `not-assessed` (never `"0.00"`);
  `GET /v1/vat/parameters` shows `lateFilingFineFils` and
  `latePaymentFirstBps` as `null` and `unsourced`.
- `readiness_defaults`: hr GET gives version 0, seven steps false,
  `providerNote` and `exposureNote` texts.
- `readiness_owner_put`: hr PUT 403; owner PUT with `providerName`
  and `appointedOn "2027-02-01"` gives version 1 and appointment
  exposure `none`.
- `appointed_needs_provider`: `appointedOn` without `providerName`
  gives 400 with that path.
- `readiness_roles`: manager and employee 403.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test readiness`.
  Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): e-invoicing readiness tracker`.

### Task 12: E-invoice data model, provider port, fake provider (F9)

Untrusted input task: fresh per-task review.

**Files:**
- Create: `packages/contract/src/tax/einvoice.ts`,
  `packages/api/migrations/1207_einvoices.sql`,
  `packages/api/src/einvoicing/provider.ts` (port and null provider),
  `src/einvoicing/fake-provider.ts`, `src/einvoicing/check.ts`
  (pure), `src/einvoicing/outbound.ts`, `src/einvoicing/inbound.ts`,
  `src/einvoicing/overdue.ts` (pure), `src/routes/vat-einvoices.ts`
- Modify: `packages/api/src/deps.ts` (`einvoiceProvider` in
  `AppDeps`, default `nullProvider`), `src/einvoicing/readiness-view.ts`
  (real overdue counts), contract `routes-vat.ts`, `errors.ts`,
  `examples.ts`, `index.ts`, `tests/routes-vat.test.ts`; api
  `src/app.ts`, `tests/helpers/test-app.ts` (inject a
  `FakeEInvoiceProvider`), `tests/leak.test.ts`,
  `tests/conformance.test.ts`
- Test: `packages/api/tests/einvoice-check.test.ts`,
  `tests/einvoice-outbound.test.ts`, `tests/einvoice-inbound.test.ts`

**Interfaces:**
- Consumes: Task 3 `checkDocumentVat`; Task 5 `einvoiceIssueBy`,
  `missingDocumentFineExposure`, `participantIdFor`; Task 6
  `vatAudit`, `requireVatProfile`, `EINVOICE_FIELD_NOTE`,
  `EINVOICE_PROVIDER_NOTE`; Task 7 `insertVatDocument`,
  `loadVatDocument`, `loadTaxCategory`, `assertPeriodOpen`; Plan 3
  `Idempotency-Key` header handling (as `createPayRun`).
- Produces (contract):
  - `KNOWN_EINVOICE_FIELDS = [{ id: "IBT-030", meaning: "Seller legal
    registration identifier (registrant ID)", source: "FTA e-invoicing
    FAQ" }, { id: "BTAE-15", meaning: "Trade licence number, for
    branches", source: "FTA e-invoicing FAQ" }] as const`.
  - `EInvoiceParty { name: 1..200; trn: Trn | null; tradeLicenceNumber:
    1..60 | null; address: { line1: 1..200; city: 1..80; emirate:
    Emirate | null; country: ^[A-Z]{2}$ } }`.
  - `EInvoiceLine { description: 1..300; quantity: ^\d{1,9}(\.\d{1,3})?
    $; unitPrice: Money; net: Money; treatment: VatTreatment; vat:
    Money }` (1..500 lines).
  - `EInvoiceDraft { type: "invoice" | "credit-note"; number: 1..60;
    issueDate: IsoDate; transactionDate: IsoDate; buyer:
    EInvoiceParty; lines: EInvoiceLine[]; precedingInvoiceNumber?:
    1..60; creditReason?: 3..300; categoryId: Id; emirate: Emirate |
    null }` refined: a credit note needs `precedingInvoiceNumber` and
    `creditReason`; currency is always AED (no field).
  - `EInvoiceCanonical { type; number; issueDate; transactionDate;
    currency: z.literal("AED"); supplier: EInvoiceParty; buyer:
    EInvoiceParty; lines: EInvoiceLine[]; totals: { net; vat; gross:
    Money }; precedingInvoiceNumber: string | null; creditReason:
    string | null }` (what the provider port sends and receives).
  - `EInvoiceStatus = z.enum(["draft","accepted","rejected",
    "failed","received","unreadable"])`; `MatchStatus =
    z.enum(["unmatched","suggested","matched","created"])` (inbound
    only; used in Task 13).
  - `EInvoice { id; direction: "outbound" | "inbound"; type; number;
    issueDate; transactionDate; supplier: EInvoiceParty; buyer:
    EInvoiceParty; lines; totals: { net: Money; vat: Money; gross:
    Money }; precedingInvoiceNumber: string | null; creditReason:
    string | null; status; revision: int; issueBy: IsoDate | null;
    providerMessageId: string | null; taxDataReported: boolean | null;
    providerErrors: { code: string; message: string }[];
    vatDocumentId: Id | null; matchStatus: MatchStatus | null;
    fieldNote: typeof EINVOICE_FIELD_NOTE; providerNote: typeof
    EINVOICE_PROVIDER_NOTE }`.
  - `EInvoiceQuery { direction?; status?; matchStatus? }`;
    `SyncResult { received: int; duplicates: int; unreadable: int;
    foreign: int; statusUpdates: int }`.
  - Routes appended (PAYROLL): `listEinvoices GET /v1/einvoices`,
    `createOutboundEinvoice POST /v1/einvoices` (201),
    `getEinvoice GET /v1/einvoices/{id}`, `sendEinvoice POST
    /v1/einvoices/{id}/send` (header `Idempotency-Key` 1..100),
    `syncEinvoices POST /v1/einvoices/sync`.
  - Error codes: `PROVIDER_NOT_CONFIGURED` 409, `EINVOICE_INVALID` 422
    (detail `problems`), `EINVOICE_NOT_DRAFT` 409,
    `EINVOICE_NUMBER_TAKEN` 409, `EINVOICE_BUYER_NO_PARTICIPANT` 422,
    `TAX_GROUP_TIN_NOT_USABLE` 422.
- Produces (api):
  - `provider.ts`:

    ```ts
    interface OutboundEnvelope {
      idempotencyKey: string;          // "<einvoiceId>:<revision>"
      sender: ParticipantRef;
      receiver: ParticipantRef;
      document: EInvoiceCanonical;     // contract schema
    }
    type SendResult =
      | { kind: "accepted"; messageId: string;
          taxDataReported: boolean | null }
      | { kind: "rejected"; errors: { code: string; message: string }[] }
      | { kind: "unavailable" };
    interface ParticipantRef { scheme: string; id: string }
    interface InboundMessage { messageId: string; receivedAt: string;
      payload: unknown }
    interface EInvoiceProvider {
      readonly name: string;
      send(e: OutboundEnvelope): Promise<SendResult>;
      fetchInbound(receiver: ParticipantRef, cursor: string | null):
        Promise<{ messages: InboundMessage[]; cursor: string | null }>;
      status(sender: ParticipantRef, messageId: string):
        Promise<{ taxDataReported: boolean | null }>;
    }
    ```

    `nullProvider`: every method throws `ApiError(409,
    "PROVIDER_NOT_CONFIGURED")`. `INBOUND_MAX_BYTES = 1_048_576`
    (product default, not law).
  - `fake-provider.ts`: `class FakeEInvoiceProvider implements
    EInvoiceProvider` with `sent: OutboundEnvelope[]` (every call
    recorded), `script: SendResult[]` (consumed in order, default
    accepted with `messageId "fake-<n>"`), `inbox: Map<string,
    InboundMessage[]>` keyed by `"<scheme>:<id>"` of the receiver
    (`fetchInbound` returns that receiver's list from an index
    cursor), `deliver(receiver, m)` and `deliverTwice(receiver, m)`
    helpers; same key twice returns the first result without a new
    message id (like a real idempotent provider).
  - `check.ts`: `checkEinvoiceDraft(d: EInvoiceDraft, onDate: string):
    string[]` (problems): each line `net = quantity x unitPrice`
    rounded half up to fils (`LINE_NET_MISMATCH:<i>`); Task 3
    `checkDocumentVat` errors per line (`LINE_VAT:<i>`); every line's
    treatment equals the category's (`LINE_TREATMENT_MISMATCH:<i>`;
    one invoice is one ledger document in one VAT 201 box, so mixed
    treatments are split into separate invoices); buyer TRN
    required for a buyer in the UAE (`country "AE"`):
    `BUYER_TRN_REQUIRED` (product rule, see Ruling 26); totals are
    computed, never entered. `parseInbound(payload: unknown, maxBytes:
    number, ownTin: string): { ok: true; doc: EInvoiceCanonical } | {
    ok: false; codes: string[] } | { ok: "foreign" }` (zod,
    `canonicalJson` length check first: `INBOUND_TOO_LARGE`; strings
    stored as data only; a buyer TRN whose TIN is not `ownTin` gives
    `foreign`).
  - Migration 1207: `einvoices(id, company_id, direction, type,
    number, issue_date, transaction_date, supplier jsonb, buyer jsonb,
    lines jsonb, net bigint, vat bigint, gross bigint,
    preceding_number, credit_reason, category_id, emirate, status,
    revision int, issue_by, provider_message_id, tax_data_reported,
    provider_errors jsonb, vat_document_id, match_status, raw_errors
    jsonb, created_by, created_at, updated_at)`; unique `(company_id,
    number)` where `direction = 'outbound'`; unique `(company_id,
    provider_message_id)` where `direction = 'inbound'`;
    `einvoice_sends(company_id, idempotency_key pk, einvoice_id,
    request_key, result jsonb, created_at)`; `einvoice_cursor(
    company_id pk, cursor)`. Grants select, insert, update.
  - `outbound.ts`: `createOutbound(ctx, draft)`: problems give 422
    `EINVOICE_INVALID`; supplier from the profile (`legalName`, TRN,
    `tradeLicenceNumber`); `issueBy = einvoiceIssueBy(
    transactionDate, profile.holidays)`; status `draft`.
    `sendOutbound(ctx, id, idempotencyKey)`: the same
    `Idempotency-Key` returns the stored result (Plan 3 pattern via
    `einvoice_sends`); status must be `draft`, `rejected` or `failed`
    (else 409 `EINVOICE_NOT_DRAFT`). Every refusal runs before
    `provider.send`, because the handler's single `withTenant`
    transaction rolls back on a thrown `ApiError`: buyer without TRN
    (422 `EINVOICE_BUYER_NO_PARTICIPANT`); tax group member without
    `einvoicingTin` (422 `TAX_GROUP_TIN_NOT_USABLE`); then a dry run
    of the ledger checks for the sale document it will create
    (`assertPeriodOpen` on the transaction date, category active and
    a sale category, sale number free; the Task 7 codes). A resend
    after `rejected` or `failed` bumps `revision`. It calls
    `provider.send` with key `"<id>:<revision>"` and the sender
    `participantIdFor(trn)` (or `{ scheme, id: einvoicingTin }` for a
    tax group member). No outcome throws after the call: `accepted`
    sets status, message id and `taxDataReported`, then
    `insertVatDocument` with source `einvoice-sent`, `sourceRef` the
    e-invoice id, net and VAT summed over lines, `claimedVat null`,
    tax date the transaction date, category and emirate from the
    draft, and for a credit note kind `credit-note` with
    `originalDocumentNumber` = `precedingInvoiceNumber` and the credit
    reason; `rejected` stores the errors; `unavailable` sets `failed`
    with `providerErrors [{ code: "PROVIDER_UNAVAILABLE" }]`; all
    three return 200 with the `EInvoice`. There is no edit after a
    send (no PATCH route); corrections are credit notes. Audit
    `einvoice.created`, `einvoice.sent` (`data: { status, revision
    }`).
  - `inbound.ts`: `syncInbound(ctx): Promise<SyncResult>`: the
    receiver is the company's own participant id (TRN, or
    `einvoicingTin` for a tax group member; neither gives 422
    `TAX_PROFILE_INCOMPLETE`); pulls that receiver's messages from the
    stored cursor; each message: `parseInbound`; `foreign` is not
    stored and is counted in `foreign`; invalid gives a
    row with status `unreadable` and `raw_errors` (payload not
    stored); valid gives status `received`, `matchStatus
    "unmatched"`; insert `on conflict (company_id,
    provider_message_id) do nothing` counts `duplicates`; the cursor
    is saved in the same transaction; then refreshes
    `taxDataReported` of outbound rows with `accepted` status and
    `null` reporting (`status(sender, messageId)`). Audit
    `einvoice.received` (`data: { received,
    duplicates, unreadable }`).
  - `overdue.ts`: `overdueCounts(rows: { type; transactionDate;
    issueBy; status }[], asOf: string): { month; invoices;
    creditNotes }[]`: outbound rows only, not `accepted`, with
    `issueBy < asOf`,
    grouped by the month of `issueBy`; readiness passes these to
    `missingDocumentFineExposure`; readiness then always carries the
    warning `COUNTS_ONLY_PRODUCT_INVOICES` once past `goLive`.

- [ ] **Step 1: Write the failing tests**

`einvoice-check.test.ts` (pure):
- `line_net_checked`: quantity `"2"` unit `"10.00"` net `"20.01"`
  gives `LINE_NET_MISMATCH:0`.
- `line_vat_checked`: zero-rated line with VAT `"1.00"` gives
  `LINE_VAT:0`.
- `credit_note_fields`: the zod draft refuses a credit note with no
  `precedingInvoiceNumber`.
- `inbound_parse_rejects_extra_and_large`: a payload with a 2 MB
  description gives `INBOUND_TOO_LARGE`; a payload missing `lines`
  gives a zod code; a valid one parses.
- `known_fields_only_two`: `KNOWN_EINVOICE_FIELDS` has ids
  `["IBT-030","BTAE-15"]`.

`einvoice-outbound.test.ts` (fake provider):
- `send_accepted_creates_sale`: create and send; status `accepted`,
  `providerMessageId "fake-1"`, `vatDocumentId` set; the VAT document
  has source `einvoice-sent` and the summed amounts.
- `send_retry_reuses_key` (Review Focus 2): two sends with the same
  `Idempotency-Key` give the same body; `fake.sent.length` is 1; two
  concurrent sends with one key give one send.
- `rejected_then_resend_bumps_revision`: script `rejected`, then
  `accepted`: the second envelope key ends `:2`.
- `unavailable_is_failed_and_kept`: script `unavailable`: 200 with
  status `failed` and `providerErrors[0].code "PROVIDER_UNAVAILABLE"`;
  a GET afterwards still shows `failed` (nothing rolled back).
- `send_prechecks_before_provider`: with the transaction date in a
  period marked filed (Task 9 helper), send gives 409 `PERIOD_FILED`
  and `fake.sent.length` is 0; a tax group member without
  `einvoicingTin` gives 422 `TAX_GROUP_TIN_NOT_USABLE` and no send.
- `mixed_treatment_refused`: a standard line and a zero-rated line
  give 422 `EINVOICE_INVALID` with `LINE_TREATMENT_MISMATCH:1`.
- `credit_note_becomes_ledger_credit_note`: an accepted credit note
  creates a `credit-note` sale document whose
  `originalDocumentNumber` is the preceding invoice number.
- `null_provider_409`: an app without the fake gives 409
  `PROVIDER_NOT_CONFIGURED` on send and sync.
- `sent_invoice_cannot_resend`: a second send with a new key gives
  409 `EINVOICE_NOT_DRAFT`.
- `linked_document_frozen`: voiding the linked VAT document gives 409
  `VAT_DOCUMENT_LINKED`.
- `issue_by_set`: `issueBy` equals Task 5 `einvoiceIssueBy` of the
  transaction date.
- `notes_present`: `fieldNote` and `providerNote` equal the
  statements.

`einvoice-inbound.test.ts`:
- `inbound_received_unmatched`: one inbox message gives `received 1`
  and a row with `matchStatus "unmatched"`.
- `inbound_duplicate_stored_once` (Review Focus 2): the same message
  delivered twice (and a second sync) gives one row and `duplicates
  1`.
- `inbound_other_company_not_stored`: messages delivered to company
  A's participant are not returned by company B's sync; a message in
  B's inbox whose buyer TRN belongs to A gives `foreign 1` and no
  row.
- `inbound_unreadable_kept_without_payload`: an invalid payload gives
  status `unreadable`, `raw_errors` set and no payload text in the
  row.
- `inbound_html_is_data`: a supplier name `"<script>x</script>"` is
  returned as the same JSON string, and the response `content-type`
  is `application/json`.
- `overdue_feeds_exposure`: a draft invoice with `issueBy` before the
  clock and a company past `goLive` (clock set to `2027-08-01`)
  gives readiness `missingDocuments` exposure `computed` with
  `"100.00"`.
- `einvoice_roles`: manager and employee 403.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test einvoice`.
  Expected: FAIL.
- [ ] **Step 3: Implement** the files above (pure modules first).
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): e-invoice model and provider port`.

### Task 13: Received e-invoice matching, handover (F10)

**Files:**
- Create: `packages/contract/src/tax/einvoice-match.ts`,
  `packages/api/migrations/1208_einvoice_match.sql`,
  `packages/api/src/einvoicing/match.ts` (pure),
  `src/einvoicing/matching.ts`, `src/routes/vat-einvoice-match.ts`
- Modify: `packages/api/src/einvoicing/inbound.ts` (set
  `suggested`), contract `routes-vat.ts`, `errors.ts`, `examples.ts`,
  `index.ts`, `tests/routes-vat.test.ts`; api `src/app.ts`,
  `tests/leak.test.ts`, `tests/conformance.test.ts`; `HANDOVER.md`,
  `LEDGER.md`
- Test: `packages/api/tests/einvoice-match.test.ts`,
  `tests/einvoice-matching.test.ts`

**Interfaces:**
- Consumes: Task 12 `EInvoice`, inbound rows; Task 7
  `insertVatDocument`, `loadVatDocument`; Task 6
  `vatAudit`.
- Produces (contract):
  - `MatchDifference = z.enum(["NET_DIFFERS","VAT_DIFFERS",
    "DATE_DIFFERS","TRN_DIFFERS"])`; `MatchSuggestion { vatDocumentId;
    documentNumber; counterpartyName; net: Money; vat: Money;
    taxDate; rank: "exact" | "likely"; differences: MatchDifference[]
    }`; `MatchSuggestions { einvoiceId; suggestions: MatchSuggestion[]
    }`.
  - `MatchRequest { vatDocumentId: Id }`; `CreatePurchaseRequest {
    categoryId: Id; taxDate?: IsoDate }`.
  - Routes appended (PAYROLL): `getEinvoiceMatchSuggestions GET
    /v1/einvoices/{id}/match-suggestions`, `matchEinvoice POST
    /v1/einvoices/{id}/match`, `unmatchEinvoice POST
    /v1/einvoices/{id}/unmatch`, `createPurchaseFromEinvoice POST
    /v1/einvoices/{id}/create-purchase` (all to `EInvoice`).
  - Error codes: `EINVOICE_NOT_INBOUND` 422, `MATCH_TAKEN` 409,
    `ALREADY_MATCHED` 409, `NOT_MATCHED` 409.
- Produces (api):
  - Migration 1208: unique index on `einvoices(company_id,
    vat_document_id)` where `direction = 'inbound' and match_status in
    ('matched','created')`.
  - `match.ts`: `suggestMatches(inv: { supplierTrn: string | null;
    supplierName: string; number: string; net: Fils; vat: Fils;
    issueDate: string }, docs: { id; counterpartyTrn; counterpartyName;
    documentNumber; net; vat; taxDate; status; direction }[]):
    MatchSuggestion[]`: only active purchases; `exact` when the TRN
    (or, with no TRN on either side, the lower-cased name) and the
    document number are equal; `likely` when the TRN or name is equal
    and gross differs by at most 100 fils and the dates are at most 7
    days apart (product defaults, not law, named
    `MATCH_GROSS_TOLERANCE_FILS` and `MATCH_DATE_WINDOW_DAYS`);
    differences listed for both ranks; sorted exact first, then by
    date distance, then id; at most 10.
  - `matching.ts`: `matchSuggestionsFor(ctx, id)` (inbound only, else
    422 `EINVOICE_NOT_INBOUND`), `match(ctx, id, docId)`: the
    document must be an active purchase not linked to another inbound
    invoice (409 `MATCH_TAKEN`, also from the unique index); the
    invoice must not be `matched` or `created` (409
    `ALREADY_MATCHED`); sets `matchStatus "matched"` and
    `vatDocumentId`; the document gains no amount change (differences
    stay visible). `unmatch` (409 `NOT_MATCHED` unless `matched`;
    `created` cannot be unmatched, the document is voided instead).
    `createPurchase(ctx, id, body)`: makes a purchase document from
    the invoice (source `einvoice-received`, `sourceRef` the invoice
    id, `claimedVat null`, credit notes as `credit-note` with the
    preceding number) and sets `matchStatus "created"`; Task 7's
    period lock applies. The list route's `matchStatus` filter and a
    `suggested` status set by `syncInbound` when an `exact`
    suggestion exists (Task 12 `inbound.ts` calls `suggestMatches`
    after insert). Audit `einvoice.matched`, `einvoice.unmatched`,
    `einvoice.purchase-created`.
  - `HANDOVER.md`: current state (Plan 12 built), commands, limits
    (VAT 201 layout from the 2021 guide; no FTA upload format; late
    fines and SBR end date unsourced; e-invoicing mandatory fields
    and Data Dictionary unread; no real provider; MD 66 and 197 seen
    as unsigned copies; Decision 17 from an unofficial translation).
    `LEDGER.md`: append this plan's Rulings to a new section "Rulings
    made during the Plan 12 build", each with its cost.

- [ ] **Step 1: Write the failing tests**

`einvoice-match.test.ts` (pure):
- `exact_by_trn_and_number`: same TRN and number gives one `exact`
  with no differences.
- `likely_within_tolerance`: same TRN, other number, gross 100 fils
  apart, 7 days apart gives `likely` with `NET_DIFFERS` or
  `VAT_DIFFERS` as the amounts say; 101 fils gives none; 8 days
  gives none.
- `name_fallback_without_trn`: no TRN on either side, names equal
  ignoring case, same number: `exact`.
- `voided_and_sales_ignored`.
- `suggestions_sorted_and_capped`: 15 likely documents give 10,
  nearest date first.

`einvoice-matching.test.ts`:
- `sync_marks_suggested`: an inbound invoice whose TRN and number
  equal a seeded purchase shows `matchStatus "suggested"`.
- `match_then_unmatch`: match gives `matched` and the link; unmatch
  gives `unmatched`.
- `match_taken_409`: a second inbound invoice matched to the same
  document gives 409 `MATCH_TAKEN`.
- `create_purchase_from_invoice`: gives a purchase with
  `claimedVat null`, source `einvoice-received`, and `matchStatus
  "created"`; creating again gives 409 `ALREADY_MATCHED`.
- `create_purchase_in_filed_period_409`: with Q3 marked filed and an
  invoice dated in Q3, 409 `PERIOD_FILED`.
- `outbound_not_matchable`: 422 `EINVOICE_NOT_INBOUND`.
- `match_roles`: manager and employee 403.

`routes-vat.test.ts` (final): `VAT_ROUTES.length` is 40 and the id
list equals `VAT_ROUTE_IDS`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test einvoice-match
  einvoice-matching` and `pnpm --filter @payroll/contract test`.
  Expected: FAIL.
- [ ] **Step 3: Implement** the files above; update `HANDOVER.md` and
  `LEDGER.md`.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS (whole repository,
  including the line-length check over the two markdown files).
- [ ] **Step 5: Commit** `feat(api): e-invoice matching, handover`.

---

## Rulings

Claude's calls under the owner's "decide, don't ask" instruction
(ledger, autonomous mode, 2026-11-26). Each says what it costs if
wrong. Task 13 appends them to `LEDGER.md`.

1. **Statutory values only in four engine packs, statuses by the
   research mapping** (READ `official`; extract, snippet, unsigned
   copy or the 2021 guide `secondary`; NOT FOUND `unsourced`). Cost if
   a status is too generous: one table row; the trace already names
   the source, so no figure changes.
2. **The 5% rate is `secondary`, and `ae-vat` starts 2018-01-01 as a
   convention.** The rate is read only from a worked example in the
   2021 FTA guide and a 2018 snippet; the VAT Decree-Law was not read,
   and neither research note gives the date VAT began. Cost: none in
   figures; the label is weaker than it may deserve, and a document
   dated before 2018 is refused (`NO_PACK_FOR_DATE`).
3. **Zero-rated, exempt, out-of-scope and reverse-charge are
   company-tagged categories, not rates.** The product never decides
   which supply is zero-rated; it refuses VAT on non-standard
   treatments and puts each treatment in the guide's box. No rate
   other than the standard rate exists. Cost: a company that tags a
   category wrongly gets a wrong box; the document register shows the
   box per document for review.
4. **VAT 201 layout from the August 2021 guide, labelled on every
   return and export.** Box 1 is split by our own seven emirate codes
   (the guide's sub-box labels were not confirmed). The "Additional
   Reporting Requirements" section is not computed. Box labels are
   the research note's short names of the guide's boxes (Box 13
   names "recoverable tax"), marked with their label source; the
   product's own text never calls an amount recoverable. Cost if EmaraTax
   changed the form: a new layout table and mapping in
   `vat201-layout.ts` and `vat201.ts`; stored returns keep their
   snapshot.
5. **Boxes 2, 6 and 7 are entered from EmaraTax, never computed**, and
   a return with any of them `not-entered` is `incomplete` with null
   totals. Cost: one more step for the company each period.
6. **The product decides no input tax.** `claimedVat` is the
   company's figure; `null` makes the return incomplete. Decision 17
   results are shown next to the document and as checklist items,
   never applied. Cost: the company enters `claimedVat` for each
   purchase (Plan 4 can offer "claim full VAT" as a bulk action).
7. **Decision 17 is a pure rule-pack of six cases with company
   attestations.** Read from the unofficial English translation;
   Article 1's "contract or documented policy" applies to every case,
   and only phone and internet and parking need a documented policy
   in Article 2 itself; a `true` attestation of a policy condition
   needs a policy reference. Expenses dated before 1 October 2026 are
   `not-assessed`. Cost: if the Arabic text differs, condition texts
   and ids change in one file.
8. **Plan 6's expense contract stays as it is** (`vatRecoverability:
   "not-assessed"`, `VAT_STATEMENT` text) because contract changes are
   additive (Plan 3 Ruling 23). Plan 6's statement that Decision 17 is
   known "only from secondary summaries" is now out of date. Cost: one
   stale sentence on expense screens until a later plan replaces the
   constant with a pointer to the Plan 12 assessment.
9. **TRN format `^\d{15}$` is an assumption** (Plan 6 Ruling 5), with
   no check digit; TIN = the first 10 digits and the participant id
   `{ scheme: "0235", id: TIN }` are `secondary` (MoF guidelines
   glossary, partial). The separator between scheme and id is not
   guessed. Cost: a TRN of another shape is refused; one regex.
10. **Tax date = the date the company enters, defaulting to the issue
    date.** Tax point rules were not read. Cost: a document in the
    wrong period if the company leaves the default where the tax
    point differs; the register shows the tax date per document.
11. **Due date = period end + 28 days, rolled past Saturday, Sunday
    and company-entered holidays** (all from the 2021 guide, except
    the weekend days, which are a `convention` that the FTA banner's
    30 November 2026 date supports). Cost if wrong: a due date one or
    more days off; one param or one holiday entry.
12. **Periods come from the company's own first period start (day 1)
    and length (1 or 3 months)**, not from the FTA stagger table.
    Cost: a company with an odd first period types its start date.
13. **Filed returns lock their period; corrections go in an open
    period with `correctsPeriodStart`, and a correction effect above
    the guide's AED 10,000 for one past period raises "voluntary
    disclosure may be needed"** (a warning, never a filing). Cost: a
    company that files a voluntary disclosure records it outside the
    product.
14. **VAT document amounts are stored in clear** (bigint fils) so
    periods sum in SQL, as Plan 6 Ruling 15; audit rows never hold
    them. Corporate tax inputs are sealed with the company key. Cost:
    a database reader sees VAT document amounts (not salary data).
15. **"Filing-ready" means a JSON and CSV export of the box values
    and a supporting document register, plus a manual-upload
    checklist.** No FTA upload or API format was found; nothing is
    sent to the FTA. A return is `marked-filed` by the owner with
    MFA and the FTA reference. Cost: the company types the figures
    into EmaraTax; if an upload format is found, an exporter is added
    beside the JSON one.
16. **VAT late filing and late payment fines are `unsourced`** (the
    2021 figures may have changed under Cabinet Decision 129 of 2025).
    No VAT fine exposure is shown. Cost: the owner view shows no VAT
    fine figure until the decision is read.
17. **Corporate tax pack `ae-ct` starts 2026-01-01 on the period end
    date** (the earliest period the read evidence covers); earlier
    periods are refused. Cost: worksheets for 2023 to 2025 periods
    need a back-dated pack.
18. **Small business relief: the AED 3 million test is `secondary`
    and the last eligible period is `unsourced`**, so an elected
    relief is `not-assessed` unless the company enters the end date as
    an override, which the worksheet marks as overridden. Cost: one
    more input for companies that rely on the relief.
19. **The corporate tax worksheet computes from company-entered
    accounting profit and adjustments only**; losses, free zone
    rates, groups and penalties are listed as not computed. Cost: a
    company with those items uses its adviser's figures.
20. **E-invoicing deadlines: 30 October 2026 for the large band is
    `official`** because the FTA news of 25 October 2026 (read) states
    it, although the MoF copy of MD 66 of 2026 is unsigned and the
    tax.gov.ae MD 244 PDF still shows 31 July 2026. The 14 Business
    Day window is `secondary` (unsigned MD 197 copy). Government
    entities are out of scope. Cost: if MD 66 is not signed as seen,
    one date param.
21. **The revenue band comes from the company's entered revenue for
    its last accounting period** (MD 244's definition), never from
    the VAT ledger. Cost: a stale entry gives the wrong band; the
    readiness view shows the basis.
22. **E-invoicing fine exposure is computed from the three Cabinet
    Decision 106 rows read (search extract), labelled an estimate;**
    the FTA reporting exposure is `not-assessed`; missing-invoice
    counts cover only invoices made in this product. Cost: the
    figure can be wrong if the decision's entry into force or other
    rows change it; the note says so.
23. **Integration with an accredited service provider through a port,
    never becoming one** (MD 168 of 2026 needs Peppol certification,
    ISO 27001 and 22301, AED 12.5 million insurance and two years of
    operation). Only a null provider and a fake provider ship. Cost:
    no live exchange until a provider is chosen and an adapter is
    written against its API (about one task).
24. **The provider receives our canonical JSON, not PINT AE XML.** The
    Data Dictionary was not read, so mapping and field validation are
    the provider's job; the field set is labelled unverified, with
    only IBT-030 and BTAE-15 named. Cost: an adapter does the mapping;
    fields the dictionary needs and we lack are added to the model.
25. **No edit and no cancel after sending; corrections are credit
    notes** (FTA FAQ: no cancellation concept). A rejected invoice can
    be fixed and resent as a new revision. One invoice has one
    treatment (its category's), so it maps to one ledger document and
    one VAT 201 box. The provider call runs inside the request
    transaction, every refusal is checked before it, and no outcome
    after it throws. Cost: a mixed-rate sale needs two invoices; a
    slow provider holds one database transaction open for the call.
26. **A UAE buyer must have a TRN before sending** (a participant id
    needs a TIN, and in-scope persons without registration must get
    one, FAQ). Cost: an invoice to a buyer still registering waits.
27. **Sync is pull-based (`POST /v1/einvoices/sync`)**, with no
    scheduler and no webhook. Cost: received invoices appear only when
    someone syncs, until a job runner exists (Plan 11 Ruling 15
    pattern).
28. **Received invoices are never applied automatically**: matched or
    turned into a purchase by a person; an exact match is only
    marked `suggested`. Match tolerances (100 fils, 7 days) are
    product defaults, not law. Cost: one click per invoice.
29. **Owner and hr hold every tax route; no accountant role yet.**
    Cost: an outside accountant needs an hr seat until the bureau
    console (UQ23) adds a role.
30. **`VAT_ROUTES` joins through `ROUTE_GROUPS` as the last group;
    migrations 1201 to 1208** (1209 free). Shared items from Plans 6,
    10 and 11 (`SignedMoney`, `toCsv`, `Exposure`, `sealJson`, the
    numeric migration runner, `text/csv-optional`) are created by the
    first plan to need them with the owning plan's exact signature.
    Cost: one merge of `routes.ts` and `primitives.ts` per plan.
31. **Review and execution:** per-task review after Tasks 1, 2, 4, 5
    (law and money) and 12 (untrusted input), one whole-branch review
    at the end (speed ruling). Execution is subagent-driven, chosen
    without asking (owner: no technical questions), because Tasks 6
    to 13 depend on each other's interfaces and the law tasks need
    fresh reviewers. Tasks 1 to 5 can run in a separate worktree
    beside other plans. Cost: a slipped bug in Tasks 3, 6 to 11 or 13
    is caught at the final review.
