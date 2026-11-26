# Plan 5: Monthly Payroll Computation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A pure, deterministic, traced monthly payslip computation in
`packages/engine` (proration, sick and maternity pay steps, overtime,
rest-day and holiday work, leave encashment, capped deductions and loans,
GPSSA contributions for UAE nationals) plus an adapter in `packages/wps`
that turns a payslip into a SIF employee (EDR and EVP).

**Architecture:** Two new frozen rule-packs (`ae-payroll`, `ae-gpssa`)
hold every statutory value with a per-article source id and a status.
Small pure modules under `src/payroll/` each compute one part and add
trace lines; `calculatePayslip` assembles them into a `Payslip` whose
every money field has a trace line with the same value. The WPS adapter
lives in `packages/wps` because `@payroll/wps` already depends on
`@payroll/engine` (the reverse would be a cycle).

**Tech Stack:** Node 22, pnpm 10, TypeScript 7.0.2, Vitest 5.1.2,
fast-check 4.11.0, zod 4.6.7 (shell files only), tsx 4.23.15. No new
dependencies.

**Spec:** `docs/superpowers/specs/2026-11-25-master-feature-list.md`
(pay run M1; UQ1 pay explained line by line; UQ5 rule-change preview
needs payslips later) and
`docs/superpowers/specs/2026-11-25-uae-sme-hr-payroll-design.md`
(section 2: "Any number on a payslip we cannot trace to inputs and a
rule version" is an anti-goal; section 6 rule-packs). Rule sources:
`docs/research/2026-11-26-labour-law-primary.md` (DL = Decree-Law
33/2021, ER = Cabinet Resolution 1/2022),
`docs/research/2026-11-26-gpssa-primary.md` (DL57 = Decree-Law 57/2023,
L7 = Law 7/1999), `docs/research/2026-11-25-wps-sif-layout.md`,
`docs/research/2026-11-25-wps-resolution-340.md`,
`docs/research/2026-11-25-gpssa-emiratisation-nafis.md`. Standards:
`docs/engineering-standards.md`. Engine style:
`docs/superpowers/plans/2026-11-25-plan-1-payroll-engine.md`.

## Global Constraints

- Line length: **80 characters maximum** in `.ts`, `.json`, `.mjs`, `.md`
  under `packages/` and `scripts/` (`pnpm check` enforces it).
- Files under about 300 lines; functions under about 30 lines.
- Money is integer fils as `Fils` (`bigint`). No floating point. Every
  rounding goes through `mulDiv` with a named mode from a pack param.
- Rates are whole **basis points** (`Bps`, 2.5% = 250) and durations are
  whole **minutes** or **days**, so every param passes `intParam`.
- The pure core reads no clock, file, network or environment. Files in
  `src/payroll/` and `src/rules/` are core; `src/cases/*` and the files
  already listed in `tests/purity.test.ts` are shell. zod only in shell.
- Statutory values live only in rule-pack params, each with a source id
  from `src/sources.ts` (one id per article, see Task 1) and a status:
  `official` (read in the primary text), `secondary`, `convention` (our
  reading or choice, even when it cites an article), `hypothetical`,
  `unsourced` (value `null`, source `null`; reading it throws
  `UNSOURCED_PARAM` unless an override is passed).
- Param keys are unique across `ae-payroll` and `ae-gpssa`, because one
  flat overrides map serves both (`requireParam` takes one map).
- Errors are `EngineError` with a stable `code` and a `detail` naming the
  field and value. No silent fallbacks.
- Trace line ids: a base id from the catalog, plus `#<code>` for one
  item of a list (`earn.allowance#housing`, `ded.loan#L1`). Codes and
  refs match `/^[A-Za-z0-9-]{1,20}$/`.
- Every payslip result lists `notComputed` (always, Task 7) and
  `notApplicable` (per worker class). Nothing unsourced is guessed.
- Arabic catalog text is marked `NEEDS NATIVE REVIEW` in a comment.
- Each task ends with `pnpm check` green and one commit. Review: one
  fresh reviewer after each of Tasks 3 to 7 and 9 (money and law), and
  one whole-branch review at the end (LEDGER speed ruling, 2026-11-26).

**Shared fixture (used in many tests; call it `FX`):** expat full-time,
joined 2020-03-01, no leaving date, no probation date, not a shift
worker, `normalHoursPerDay` 8, basic 1,000,000 fils (AED 10,000),
allowances `housing` (kind housing) 400,000 and `transport` (kind
conveyance) 100,000, so the contractual wage is 1,500,000 fils. Period
June 2026 (30 days) unless stated. No absences, overtime, rest-day work,
encashment, deductions or loans; both used-day counters 0. A test
helper `fx(patch)` in `packages/engine/tests/payroll-fixture.ts` builds
it with a shallow patch of `employee` and the top level.

## Review Focus

Inputs the spec implies but no task's main tests exercise; each line's
test is added to the owning task.

1. An absence, overtime or rest-day date before the joining date or
   after the leaving date inside the same month: refuse with
   `DATE_OUTSIDE_PAY_PERIOD`, never pay it (Task 2).
2. One date listed twice (sick and unpaid, or two overtime entries):
   refuse with `DUPLICATE_DATE` naming the date (Task 2).
3. Overtime or rest-day work on a date that is also an absence: refuse
   with `WORK_ON_ABSENCE_DATE` (Task 2).
4. A UAE national whose GPSSA fixing month is last year's January in a
   new year: refuse with `GPSSA_FIXING_MONTH` and say which month is
   expected (Task 5).
5. A loan whose balance is below its instalment, or zero: take only the
   balance (or 0), never drive the balance negative (Task 6).

## File Structure

```
packages/engine/src/sources.ts              + one source id per article
packages/engine/src/rules/payroll-pack.ts   ae-payroll pack (data)
packages/engine/src/rules/gpssa-pack.ts     ae-gpssa pack (data)
packages/engine/src/payroll/params.ts       typed param loaders
packages/engine/src/payroll/types.ts        PayslipInput, Payslip, lines
packages/engine/src/payroll/validate.ts     validatePayslipInput
packages/engine/src/payroll/days.ts         accountDays (period, leave)
packages/engine/src/payroll/earnings.ts     fixedEarnings (proration)
packages/engine/src/payroll/variable.ts     overtime, rest day, encash
packages/engine/src/payroll/gpssa.ts        computeGpssa
packages/engine/src/payroll/deductions.ts   applyDeductions
packages/engine/src/payroll/payslip.ts      calculatePayslip
packages/engine/src/payroll/not-computed.ts NOT_COMPUTED, notApplicable
packages/engine/src/explain/payroll-catalog.ts  en and ar messages
packages/engine/src/explain/catalog.ts      merge payroll messages
packages/engine/src/explain/explain.ts      "#code" suffix lookup
packages/engine/src/cases/payroll-schema.ts zod schema (shell)
packages/engine/src/cases/payroll-runner.ts runPayrollCases (shell)
packages/engine/src/index.ts, src/shell.ts  exports
packages/engine/cases/payroll/*.json        case library (10 cases)
packages/engine/tests/payroll-*.test.ts     one test file per module
packages/wps/src/from-payslip.ts            payslipToSifEmployee
packages/wps/tests/from-payslip.test.ts
HANDOVER.md, LEDGER.md                      updated in Task 9
```

---

### Task 1: Per-article sources, the two rule-packs and typed loaders

**Files:**
- Modify: `packages/engine/src/sources.ts` (add the ids below)
- Create: `packages/engine/src/rules/payroll-pack.ts`,
  `packages/engine/src/rules/gpssa-pack.ts`,
  `packages/engine/src/payroll/params.ts`
- Modify: `packages/engine/src/index.ts` (export the three new modules)
- Test: `packages/engine/tests/payroll-packs.test.ts`

**Interfaces:**
- Consumes: `RulePack`, `RuleParam`, `requireParam`, `selectPack`,
  `deepFreeze`, `sourceOf`; `intParam`, `boolParam`, `fixedParam`,
  `Typed<T>` from `src/gratuity-params.ts` (import, do not copy).
- Produces:
  - Source ids (url = the law's page, note names law and article):
    `DL33_ART1`, `DL33_ART17`, `DL33_ART19`, `DL33_ART25`, `DL33_ART28`,
    `DL33_ART30`, `DL33_ART31`, `DL33_ART39` (url
    `https://uaelegislation.gov.ae/en/legislations/1541`, note e.g.
    `"Federal Decree-Law 33 of 2021, Article 19(1)-(4)"`);
    `ER1_2022_ART19` (`.../legislations/1547`, "Cabinet Resolution 1 of
    2022 (Executive Regulation), Article 19(1)"); `DL57_ART4`,
    `DL57_ART5`, `DL57_ART10`, `DL57_ART11` (`.../legislations/2254`,
    "Federal Decree-Law 57 of 2023, Article 4(1)" etc.); `L7_ART1`,
    `L7_ART2`, `L7_ART10` (`.../legislations/1111`, "Federal Law 7 of
    1999, Article 2 (site English text; later amendments not read)").
  - `PAYROLL_PACKS: readonly RulePack[]` (one pack, id `ae-payroll`,
    version and effectiveFrom `2022-02-02`, effectiveTo `null`) and
    `GPSSA_PACKS: readonly RulePack[]` (id `ae-gpssa`, version and
    effectiveFrom `2023-10-31`), both `deepFreeze`d.
  - `type Overrides = Record<string, ParamValue> | undefined`
    (exported from `payroll/params.ts`, used by every later task).
  - `choiceParam<T extends string>(pack: RulePack, key: string,
    ov: Overrides, allowed: readonly T[]): Typed<T>` and
    `modeParam(pack: RulePack, key: string, ov: Overrides):
    Typed<RoundingMode>` (like `roundingParam` with any key); a value
    outside the list throws `INVALID_PARAM`.
  - `type RestDayPayMode = "extra-day-wage-plus-premium" |
    "premium-only"`; `type GpssaRegime = "dl57-2023" | "law7-1999"`.
  - `interface PayrollParams` with one `Typed` field per `ae-payroll`
    key in the table below (ints as `Typed<bigint>`, booleans as
    `Typed<boolean>`, strings as their literal union) and
    `loadPayrollParams(pack: RulePack, ov: Overrides): PayrollParams`.
  - `interface GpssaParams { regime: GpssaRegime; employeeBps;
    employerBps; govSupportBps: Typed<bigint>; govSupportBelow:
    Typed<bigint> | null; minSalary; maxSalary: Typed<bigint>;
    lastMonth: Typed<"full-month" | "none-if-partial">; fixingRule:
    Typed<"january-or-joining-month">; base: Typed<"basic" | "wage">;
    rounding: Typed<RoundingMode> }` and `loadGpssaParams(pack: RulePack,
    ov: Overrides, regime: GpssaRegime): GpssaParams` (reads the
    `gpssaDl57*` keys or the `gpssaL7*` keys; `govSupportBelow` is
    `null` for L7, whose text has no threshold).

`ae-payroll` params (B = basis points; S = status; o = official,
c = convention):

| key | value | S | source (article) |
|---|---|---|---|
| overtimeUpliftBps | 2500 | o | DL33_ART19 (19(2)) |
| nightOvertimeUpliftBps | 5000 | o | DL33_ART19 (19(3)) |
| nightWindow | "22:00-04:00" | o | DL33_ART19 (19(3)) |
| shiftWorkersNightExcluded | true | o | DL33_ART19 (19(3)) |
| overtimeMaxMinutesPerDay | 120 | o | DL33_ART19 (19(1)), flag only |
| maxHoursPer3Weeks | 144 | o | DL33_ART19 (19(1)), not checked |
| maxNormalHoursPerDay | 8 | o | DL33_ART17 (17(1)) |
| restDayUpliftBps | 5000 | o | DL33_ART19 (19(4)) |
| holidayUpliftBps | 5000 | o | DL33_ART28 (28(2)) |
| restDayPayMode | "extra-day-wage-plus-premium" | c | DL33_ART19 |
| restDayWageBase | "wage" | c | DL33_ART1 |
| dailyDivisor | 30 | c | ENGINE_CONVENTION |
| prorationBasis | "calendar-days" | c | ENGINE_CONVENTION |
| sickFullPayDays | 15 | o | DL33_ART31 (31(3)(a)) |
| sickHalfPayDays | 30 | o | DL33_ART31 (31(3)(b)) |
| sickMaxDays | 90 | o | DL33_ART31 (31(3)) |
| sickPaidInProbation | false | o | DL33_ART31 (31(2)) |
| paidLeaveBase | "wage" | c | DL33_ART1 ("full pay" read as wage) |
| maternityFullPayDays | 45 | o | DL33_ART30 (30(1)(a)) |
| maternityHalfPayDays | 15 | o | DL33_ART30 (30(1)(b)) |
| maternityUnpaidExtraDays | 45 | o | DL33_ART30 (30(2)) |
| encashInServiceBase | "wage" | o | ER1_2022_ART19 (19(1)) |
| deductionOverallCapBps | 5000 | o | DL33_ART25 (25(2)) |
| overpaymentCapBps | 2000 | o | DL33_ART25 (25(1)(b)) |
| violationCapBps | 500 | o | DL33_ART25 (25(1)(f)) |
| violationCapDays | 5 | o | DL33_ART39 (39(1)(c)) |
| violationCapRule | "stricter" | c | DL33_ART25 |
| damageCapDays | 5 | o | DL33_ART25 (25(1)(h)) |
| courtDebtCapBps | 2500 | o | DL33_ART25 (25(1)(g)) |
| loanConsentRequired | true | o | DL33_ART25 (25(1)(a)) |
| schemeConsentRequired | true | c | DL33_ART25 (25(1)(e)) |
| deductionCapBase | "earned-wage" | c | ENGINE_CONVENTION |
| deductionOrder | see below | c | ENGINE_CONVENTION |
| capRoundingMode | "DOWN" | c | ENGINE_CONVENTION |
| roundingMode | "HALF_UP" | c | ENGINE_CONVENTION |

`deductionOrder` is the string
`"gpssa,court-debt,overpayment,violation,damage,scheme,loan"`.

`ae-gpssa` params (all official unless marked):

| key | value | source (article) |
|---|---|---|
| gpssaDl57EmployeeBps | 1100 | DL57_ART4 (4(1)(a)) |
| gpssaDl57EmployerBps | 1500 | DL57_ART4 (4(1)(b)) |
| gpssaDl57GovSupportBps | 250 | DL57_ART4 (4(1)(b)) |
| gpssaDl57GovSupportBelowFils | 2000000 | DL57_ART4 ("less than 20,000") |
| gpssaDl57MinSalaryFils | 300000 | DL57_ART5 (5(2)) |
| gpssaDl57MaxSalaryFils | 7000000 | DL57_ART5 (5(2)) |
| gpssaDl57LastMonth | "full-month" | DL57_ART11 (11(3)) |
| gpssaL7EmployeeBps | 500 | L7_ART2 (2(1)) |
| gpssaL7EmployerBps | 1500 | L7_ART2 (2(2)) |
| gpssaL7GovSupportBps | 250 | L7_ART2 (2(2)), no threshold |
| gpssaL7MinSalaryFils | 100000 | L7_ART1 (1(d)) |
| gpssaL7MaxSalaryFils | 5000000 | L7_ART1 (1(d)) |
| gpssaL7LastMonth | "none-if-partial" | L7_ART10 |
| gpssaFixingRule | "january-or-joining-month" | DL57_ART10 (10(2)) |
| gpssaContributionSalaryBase | null, **unsourced** | none |
| gpssaGccNationalContribution | null, **unsourced** | none |
| gpssaRoundingMode | "HALF_UP", convention | ENGINE_CONVENTION |

- [ ] **Step 1: Write the failing tests** in `payroll-packs.test.ts`:
  - `freezes both packs`: `Object.isFrozen(PAYROLL_PACKS[0]!.params
    .overtimeUpliftBps)` and the same for `GPSSA_PACKS` are `true`.
  - `cites an article for every official param`: for every param of
    both packs with status `official`, `source.note` matches
    `/Article \d/` and `source.url` starts with
    `https://uaelegislation.gov.ae/en/legislations/`.
  - `keeps unsourced params empty`: `gpssaContributionSalaryBase` and
    `gpssaGccNationalContribution` have `value === null`,
    `source === null`, status `unsourced`.
  - `uses keys unique across the two packs`: the key sets do not
    intersect.
  - `loads the official overtime values`: `loadPayrollParams(pack,
    undefined)` gives `overtimeUpliftBps.v === 2500n`,
    `nightOvertimeUpliftBps.v === 5000n`, `rule.status === "official"`.
  - `refuses GPSSA without a salary base`: `loadGpssaParams(pack,
    undefined, "dl57-2023")` throws `UNSOURCED_PARAM` with
    `detail.key === "gpssaContributionSalaryBase"`.
  - `loads each regime with an override`: with
    `{ gpssaContributionSalaryBase: "basic" }`, DL57 gives
    `employeeBps.v === 1100n`, `govSupportBelow?.v === 2000000n`,
    `base.rule.overridden === true`; L7 gives `employeeBps.v === 500n`,
    `minSalary.v === 100000n`, `govSupportBelow === null`.
  - `refuses a choice outside the list`: override
    `{ restDayPayMode: "double" }` makes `loadPayrollParams` throw
    `INVALID_PARAM`; `{ gpssaContributionSalaryBase: "gross" }` makes
    `loadGpssaParams` throw `INVALID_PARAM`.
  - `has no GPSSA pack before Decree-Law 57`: `selectPack(GPSSA_PACKS,
    "2023-10-01")` throws `NO_PACK_FOR_DATE`.
  - `names the article in the source note`: `sourceOf("DL57_ART4").note`
    contains `"Article 4"`.
- [ ] **Step 2: Run** `pnpm --filter @payroll/engine test payroll-packs`;
  expect FAIL (modules missing).
- [ ] **Step 3: Implement** the source ids, the two packs (a local
  `param(value, status, sourceId)` helper as in `gratuity-pack.ts`; each
  param line keeps a short comment quoting the article clause), and
  `params.ts` with the signatures above.
- [ ] **Step 4: Run** `pnpm check`; expect PASS (existing
  `shared.test.ts` checks every source has a note).
- [ ] **Step 5: Commit** `feat(engine): payroll and GPSSA rule-packs`.

### Task 2: Payslip types and input validation

**Files:**
- Create: `packages/engine/src/payroll/types.ts`,
  `packages/engine/src/payroll/validate.ts`,
  `packages/engine/tests/payroll-fixture.ts`
- Test: `packages/engine/tests/payroll-validate.test.ts`

**Interfaces:**
- Consumes: `WorkerClass` from `src/gratuity.ts`; `PayrollParams`,
  `GpssaRegime` (Task 1); `parseIsoDate`, `daysInMonth`, `formatIsoDate`.
- Produces (`types.ts`, exact):

```ts
export type AllowanceKind =
  "housing" | "conveyance" | "medical" | "passage" | "other";
export interface Allowance { code: string; kind: AllowanceKind;
  monthly: Fils }
export type AbsenceKind = "unpaid" | "sick" | "maternity";
export interface Absence { date: string; kind: AbsenceKind }
export interface OvertimeEntry { date: string; minutes: number;
  nightMinutes: number }
export interface RestDayWork { date: string;
  kind: "rest-day" | "holiday"; compensation: "pay" | "day-off" }
export type DeductionKind =
  "overpayment" | "violation" | "damage" | "court-debt" | "scheme";
export interface DeductionRequest { ref: string; kind: DeductionKind;
  amount: Fils; consentOnFile: boolean }
export interface LoanInstalment { ref: string; instalment: Fils;
  balance: Fils; consentOnFile: boolean }
export interface GpssaInput { regime: GpssaRegime;
  fixingMonth: string; fixingBasic: Fils; fixingAllowances: Fils;
  arrears: Fils }
export interface PayEmployee { workerClass: WorkerClass;
  joiningDate: string; leavingDate: string | null;
  probationEndDate: string | null; shiftWorker: boolean;
  normalHoursPerDay: number; basicMonthly: Fils;
  allowances: Allowance[]; gpssa: GpssaInput | null }
export interface PayslipInput { year: number; month: number;
  employee: PayEmployee; absences: Absence[];
  sickDaysUsedBefore: number; maternityDaysUsedBefore: number;
  overtime: OvertimeEntry[]; restDayWork: RestDayWork[];
  encashLeaveDays: number; deductions: DeductionRequest[];
  loans: LoanInstalment[] }
export type EarningKind = "basic" | AllowanceKind | "overtime" |
  "rest-day" | "holiday" | "leave-encashment";
export type DeductionLineKind = "gpssa" | DeductionKind | "loan";
export interface PayslipLine<K extends string = string> {
  traceId: string; kind: K; label: string; amount: Fils }
export interface DeferredDeduction { ref: string;
  kind: DeductionLineKind; requested: Fils; taken: Fils;
  deferred: Fils; reason: "kind-cap" | "overall-cap" }
export interface LoanBalance { ref: string; before: Fils; after: Fils }
export interface PayslipFlag { code: string; message: string;
  detail: Record<string, string> }
export interface PayWindow { year: number; month: number;
  daysInMonth: number; monthStart: string; monthEnd: string;
  payStart: string; payEnd: string }
export interface Payslip { year: number; month: number;
  workerClass: WorkerClass; payStart: string; payEnd: string;
  daysInPeriod: number; unpaidDays: number;
  earnings: PayslipLine<EarningKind>[];
  deductions: PayslipLine<DeductionLineKind>[];
  employerCosts: PayslipLine<"gpssa-employer">[];
  gross: Fils; totalDeductions: Fils; net: Fils; employerCost: Fils;
  caps: { wageBase: Fils; overall: Fils };
  deferred: DeferredDeduction[]; loanBalances: LoanBalance[];
  flags: PayslipFlag[]; notComputed: string[];
  notApplicable: string[] }
```

  The GPSSA employee share uses `ref: "gpssa"`; `arrears` is employee
  share deferred in earlier months (Ruling 17), 0 when none;
  `encashLeaveDays` 0 means no encashment.
- Produces (`validate.ts`): `validatePayslipInput(input: PayslipInput,
  p: PayrollParams): PayWindow`. `payStart` = later of month start and
  joining date; `payEnd` = earlier of month end and leaving date.
- Produces (test helper): `fx(patch?: FxPatch): PayslipInput` building
  the shared fixture `FX`; `FxPatch` is `Partial<PayslipInput>` plus
  `employee?: Partial<PayEmployee>`.

Error codes (each test asserts code and the named `detail` field):
`INVALID_PERIOD` (month not 1..12 or year not 2000..9999),
`INVALID_DATE`, `INVALID_DATE_RANGE` (leaving or probation end before
joining), `NOT_EMPLOYED_IN_PERIOD`, `INVALID_AMOUNT` (basic <= 0,
allowance < 0, deduction amount <= 0, instalment <= 0, balance < 0,
fixing amounts or `arrears` < 0), `INVALID_CODE`, `DUPLICATE_CODE`
(allowance codes; deduction and loan refs share one namespace, and
`gpssa` is reserved),
`INVALID_HOURS` (`normalHoursPerDay` not a whole number in
1..`maxNormalHoursPerDay`), `INVALID_MINUTES` (minutes not 1..1440,
night not 0..minutes), `DATE_OUTSIDE_PAY_PERIOD`, `DUPLICATE_DATE`,
`WORK_ON_ABSENCE_DATE`, `INVALID_LEAVE_DAYS` (counters or
`encashLeaveDays` not whole and >= 0), `ENCASHMENT_AT_EXIT`,
`CONSENT_REQUIRED`, `GPSSA_INPUT_REQUIRED`, `GPSSA_INPUT_NOT_EXPECTED`,
`UNSUPPORTED_WORKER_CLASS`.

- [ ] **Step 1: Write the failing tests** in
  `payroll-validate.test.ts` (`P = loadPayrollParams(PAYROLL_PACKS[0]!,
  undefined)`):
  - `returns the full June window`: `validatePayslipInput(fx(), P)`
    equals `{ year: 2026, month: 6, daysInMonth: 30, monthStart:
    "2026-06-01", monthEnd: "2026-06-30", payStart: "2026-06-01",
    payEnd: "2026-06-30" }`.
  - `starts a joiner on the joining date`: joining `2026-06-11` gives
    `payStart "2026-06-11"`.
  - `ends a leaver on the leaving date`: March 2026, leaving
    `2026-03-15` gives `payEnd "2026-03-15"`, `daysInMonth 31`.
  - `refuses month 13` (`INVALID_PERIOD`), `refuses a joiner after the
    month` (joining `2026-07-01`, `NOT_EMPLOYED_IN_PERIOD`), `refuses a
    leaver before the month` (leaving `2026-05-31`, same code),
    `refuses leaving before joining` (`INVALID_DATE_RANGE`).
  - `refuses bad amounts`: basic `0n`, allowance `-1n`, overpayment
    amount `0n`, loan balance `-1n`: each `INVALID_AMOUNT`.
  - `refuses bad codes`: allowance code `"has space"` gives
    `INVALID_CODE`; two allowances coded `housing`, a deduction and a
    loan both `L1`, and a deduction ref `gpssa` each give
    `DUPLICATE_CODE`.
  - `refuses nine normal hours`: `normalHoursPerDay: 9` gives
    `INVALID_HOURS`; `0` and `7.5` too.
  - `refuses bad minutes`: minutes `0`, `1441`, and night 61 of 60 give
    `INVALID_MINUTES`.
  - Review Focus 1, `refuses dates outside the employed span`: joining
    `2026-06-11` with an unpaid absence on `2026-06-05` gives
    `DATE_OUTSIDE_PAY_PERIOD`, `detail.value === "2026-06-05"`; same for
    an overtime entry and a rest-day entry on that date.
  - Review Focus 2, `refuses a date listed twice`: sick and unpaid on
    `2026-06-03`; two overtime entries on `2026-06-04`: both
    `DUPLICATE_DATE` with that date.
  - Review Focus 3, `refuses work on an absence date`: overtime on an
    unpaid date and rest-day work on a sick date: `WORK_ON_ABSENCE_DATE`.
  - `refuses bad leave counters`: `sickDaysUsedBefore: -1`,
    `encashLeaveDays: 1.5`: `INVALID_LEAVE_DAYS`.
  - `sends exit encashment to the settlement`: leaving `2026-06-20`
    with `encashLeaveDays: 5` gives `ENCASHMENT_AT_EXIT`.
  - `requires consent for loans and schemes`: a loan and a `scheme`
    deduction with `consentOnFile: false` give `CONSENT_REQUIRED`; an
    `overpayment` without consent passes.
  - `matches GPSSA input to the worker class`: `uae-national` with
    `gpssa: null` gives `GPSSA_INPUT_REQUIRED`; an expat with a
    `GpssaInput` gives `GPSSA_INPUT_NOT_EXPECTED`; workerClass `"x"`
    gives `UNSUPPORTED_WORKER_CLASS`.
- [ ] **Step 2: Run** `pnpm --filter @payroll/engine test
  payroll-validate`; expect FAIL.
- [ ] **Step 3: Implement** `types.ts`, `validate.ts` (one small
  checker per input group) and `payroll-fixture.ts`.
- [ ] **Step 4: Run** `pnpm check`; expect PASS.
- [ ] **Step 5: Commit** `feat(engine): payslip types and validation`.

### Task 3: Day accounting, sick and maternity steps, prorated pay

**Files:**
- Create: `packages/engine/src/payroll/days.ts`,
  `packages/engine/src/payroll/earnings.ts`
- Test: `packages/engine/tests/payroll-days.test.ts`,
  `packages/engine/tests/payroll-earnings.test.ts`

**Interfaces:**
- Consumes: `PayslipInput`, `PayWindow`, `PayslipLine`, `PayslipFlag`
  (Task 2); `PayrollParams` (Task 1); `TraceBuilder`, `mulDiv`.
- Produces:

```ts
export interface LeaveSteps { fullPay: number; halfPay: number;
  unpaid: number; beyond: number; probation: number;
  usedAfter: number }
export interface DayAccount { employedDays: number;
  unpaidDays: number; halfPayDays: number; paidHalfDays: bigint;
  totalHalfDays: bigint; sick: LeaveSteps | null;
  maternity: LeaveSteps | null; flags: PayslipFlag[] }
export function accountDays(input: PayslipInput, w: PayWindow,
  p: PayrollParams, t: TraceBuilder): DayAccount
export function fixedEarnings(input: PayslipInput, d: DayAccount,
  p: PayrollParams, t: TraceBuilder): PayslipLine<EarningKind>[]
```

Rules (decided here; see Rulings 3 to 6):
- `employedDays` = `payEnd - payStart + 1`. `totalHalfDays` =
  `2 * daysInMonth` (calendar-day proration).
- Sick days are taken in date order. A sick day on or before
  `probationEndDate` is unpaid and not counted (`probation`). Otherwise
  the day's ordinal is `sickDaysUsedBefore + n`: up to 15 full pay, 16
  to 45 half pay, 46 to 90 unpaid, above 90 unpaid (`beyond`, flag
  `SICK_LEAVE_OVER_MAX`). `usedAfter` = before + counted days.
- Maternity ordinal = `maternityDaysUsedBefore + n`: up to 45 full, 46
  to 60 half, 61 to 105 unpaid (Art 30(2)), above 105 unpaid (`beyond`,
  flag `MATERNITY_LEAVE_OVER_MAX`).
- `unpaidDays` = unpaid absences + sick `unpaid + beyond + probation` +
  maternity `unpaid + beyond`. `halfPayDays` = both `halfPay`.
  `paidHalfDays` = `2*employedDays - 2*unpaidDays - halfPayDays`.
- Each component (basic, then allowances in input order) is
  `mulDiv(monthly, paidHalfDays, totalHalfDays, roundingMode)`, rounded
  once per line. Lines: `earn.basic` (kind `basic`) and
  `earn.allowance#<code>` (kind = allowance kind, input `code`).
- Trace lines: `payroll.period` (result `daysInPeriod`, inputs
  `payStart`, `payEnd`, `daysInMonth`), `payroll.days` (result
  `"<paidHalfDays>/<totalHalfDays>"`, inputs `employedDays`,
  `unpaidDays`, `halfPayDays`), and `leave.sick` / `leave.maternity`
  only when such absences exist (inputs `fullPay`, `halfPay`, `unpaid`,
  `beyond`, `probation`, `usedBefore`, `usedAfter`; result
  `usedAfter`).

- [ ] **Step 1: Write the failing tests.** Amounts are fils for basic,
  housing, transport, then the sum. Arithmetic: line =
  monthly * paidHalfDays / totalHalfDays, HALF_UP.
  - `pays a full June in full`: 60/60: 1000000, 400000, 100000;
    sum 1500000.
  - `prorates a joiner on 11 June`: 20 days, 40/60:
    1000000*40/60 = 666666.67 -> 666667; 400000*40/60 = 266666.67 ->
    266667; 100000*40/60 = 66666.67 -> 66667; sum 1000001.
  - `prorates a leaver on 15 March`: 15 of 31 days, 30/62: 483870.97 ->
    483871; 193548.39 -> 193548; 48387.10 -> 48387; sum 725806.
  - `handles joining and leaving in one February`: 2026-02-10 to
    2026-02-20, 11 of 28 days, 22/56: 392857, 157143, 39286; sum 589286.
  - `uses 29 days in a leap February`: February 2028, joining
    2028-02-15, 15 of 29 days, 30/58: 517241, 206897, 51724; sum 775862.
  - `takes out three unpaid days`: 06-02 to 06-04 unpaid, 54/60: 900000,
    360000, 90000; `unpaidDays` 3.
  - `pays nothing for a whole unpaid month`: 30 unpaid dates: 0, 0, 0;
    `unpaidDays` 30, `paidHalfDays` 0n.
  - `steps sick pay from full to half`: used 10, sick 06-01 to 06-10:
    fullPay 5, halfPay 5; 55/60: 916667, 366667, 91667; sum 1375001.
  - `crosses 15 sick days inside July`: used 10, sick 07-01 to 07-31:
    fullPay 5, halfPay 26; 62 - 26 = 36/62: 580645, 232258, 58065;
    sum 870968.
  - `crosses 45 sick days`: used 40, sick 06-01 to 06-20: halfPay 5,
    unpaid 15; 60 - 5 - 30 = 25/60: 416667, 166667, 41667; sum 625001;
    `usedAfter` 60.
  - `crosses 90 sick days and flags it`: used 80, sick 06-01 to 06-15:
    unpaid 10, beyond 5; 30/60: 500000, 200000, 50000; flag
    `SICK_LEAVE_OVER_MAX`; `unpaidDays` 15.
  - `ends probation mid-month`: probation end 2026-06-10, used 0, sick
    06-09 to 06-12: probation 2, fullPay 2, usedAfter 2; 56/60: 933333,
    373333, 93333; sum 1399999; `unpaidDays` 2.
  - `steps maternity from half to unpaid`: used 55, maternity 06-01 to
    06-10: halfPay 5, unpaid 5; 60 - 5 - 10 = 45/60: 750000, 300000,
    75000; sum 1125000; `unpaidDays` 5.
  - `flags maternity beyond 105 days`: used 100, 10 days: unpaid 5,
    beyond 5, flag `MATERNITY_LEAVE_OVER_MAX`.
  - `traces the day count`: sick case above: `payroll.period` result
    `"30"`, `payroll.days` result `"55/60"`, `leave.sick` inputs
    `fullPay "5"` and `halfPay "5"`, `earn.allowance#housing` result
    `"366667"` with rule keys including `prorationBasis` and
    `paidLeaveBase`.
- [ ] **Step 2: Run** `pnpm --filter @payroll/engine test payroll-days
  payroll-earnings`; expect FAIL.
- [ ] **Step 3: Implement** `accountDays` and `fixedEarnings` as above.
- [ ] **Step 4: Run** `pnpm check`; expect PASS.
- [ ] **Step 5: Commit** `feat(engine): payroll day accounting`.

### Task 4: Overtime, rest-day and holiday work, leave encashment

**Files:**
- Create: `packages/engine/src/payroll/variable.ts`
- Test: `packages/engine/tests/payroll-variable.test.ts`

**Interfaces:**
- Consumes: Task 1 to 3 types; `mulDiv`, `fils`, `TraceBuilder`.
- Produces:

```ts
export interface VariablePay { lines: PayslipLine<EarningKind>[];
  flags: PayslipFlag[] }
export function variableEarnings(input: PayslipInput,
  p: PayrollParams, t: TraceBuilder): VariablePay
```

Rules (Rulings 7 to 9):
- Rates use the **contractual** monthly amounts, not the prorated ones:
  `basic` = `basicMonthly`; `wage` = basic + every allowance's
  `monthly`.
- Night minutes for a shift worker are paid at `overtimeUpliftBps`
  (Art 19(3) excludes shift workers from the night rate) and flagged
  `SHIFT_WORKER_NIGHT_RATE` once.
- Normal overtime minutes = sum of `minutes - nightMinutes` (plus the
  night minutes of shift workers). Amount, rounded once:
  `mulDiv(basic, normalMinutes * (10000 + overtimeUpliftBps),
  dailyDivisor * normalHoursPerDay * 60 * 10000, roundingMode)`.
  Night: the same with `nightOvertimeUpliftBps` and night minutes.
  Lines `earn.overtime.normal` and `earn.overtime.night` (kind
  `overtime`), each only when its minutes exceed 0; inputs `minutes`
  (the minutes paid on that line), `upliftBps`, `hoursPerDay`.
- Any entry with `minutes > overtimeMaxMinutesPerDay` adds flag
  `OVERTIME_DAILY_CAP_EXCEEDED` (detail `date`, `minutes`). Pay is never
  reduced.
- Rest-day and holiday work: `n` = entries of that kind with
  `compensation: "pay"`. Mode `extra-day-wage-plus-premium`:
  `mulDiv(fils(wage * 10000n + basic * upliftBps), n, dailyDivisor *
  10000, roundingMode)`; mode `premium-only`: `mulDiv(basic, n *
  upliftBps, dailyDivisor * 10000, roundingMode)`. Lines `earn.rest-day`
  (kind `rest-day`, `restDayUpliftBps`) and `earn.holiday` (kind
  `holiday`, `holidayUpliftBps`), each when any entry of that kind
  exists; inputs `days` and `daysOff`.
- Encashment (in service only, ER Art 19(1)): when `encashLeaveDays > 0`,
  `mulDiv(wage, encashLeaveDays, dailyDivisor, roundingMode)`, line
  `earn.leave-encashment` (input `days`).

- [ ] **Step 1: Write the failing tests** (FX: basic 1000000, wage
  1500000, 8 hours; overtime denominator 30*8*60*10000 = 144000000):
  - `pays two hours of overtime at 125%`: 2026-06-10, 120 min, night 0:
    1000000*120*12500/144000000 = 10416.67 -> 10417; no flag.
  - `pays a night hour at 150%`: 60 min all night:
    1000000*60*15000/144000000 = 6250 exactly; line
    `earn.overtime.night`.
  - `splits a mixed day and flags the cap`: 180 min with 60 night:
    normal 120 min -> 10417, night -> 6250; flag
    `OVERTIME_DAILY_CAP_EXCEEDED` with `detail.minutes === "180"`.
  - `never cuts pay above the daily cap`: 180 normal min:
    1000000*180*12500/144000000 = 15625 exactly, flagged.
  - `pays shift workers 125% at night`: shift worker, 60 night min:
    1000000*60*12500/144000000 = 5208.33 -> 5208 on
    `earn.overtime.normal`; no night line; flag `SHIFT_WORKER_NIGHT_RATE`.
  - `uses the contract's daily hours`: `normalHoursPerDay` 7, 120 min:
    1000000*120*12500/(30*7*60*10000) = 11904.76 -> 11905.
  - `pays a worked rest day as an extra day plus half basic`: one rest
    day, pay: (1500000*10000 + 1000000*5000)/(30*10000) = 66666.67 ->
    66667.
  - `pays the premium only under the other reading`: override
    `restDayPayMode: "premium-only"`: 1000000*5000/300000 = 16666.67 ->
    16667.
  - `pays a worked holiday the same way`: one holiday, pay -> 66667 on
    `earn.holiday`.
  - `gives no pay for a day off in lieu`: one holiday, day-off: amount
    0, inputs `days "0"`, `daysOff "1"`.
  - `cashes five leave days at the wage`: 1500000*5/30 = 250000.
  - `emits no lines with no variable input`: FX gives `[]`.
- [ ] **Step 2: Run** `pnpm --filter @payroll/engine test
  payroll-variable`; expect FAIL.
- [ ] **Step 3: Implement** `variableEarnings` (one helper each for
  overtime, rest-day kinds and encashment).
- [ ] **Step 4: Run** `pnpm check`; expect PASS.
- [ ] **Step 5: Commit** `feat(engine): overtime, rest-day pay, encashment`.

### Task 5: GPSSA contributions for UAE nationals

**Files:**
- Create: `packages/engine/src/payroll/gpssa.ts`
- Test: `packages/engine/tests/payroll-gpssa.test.ts`

**Interfaces:**
- Consumes: `GpssaParams`, `loadGpssaParams`, `GPSSA_PACKS` (Task 1);
  `PayslipInput`, `PayWindow`, `PayslipLine` (Task 2).
- Produces:

```ts
export interface GpssaResult { salary: Fils; employeeShare: Fils;
  employerGross: Fils; govSupport: Fils; employerPayable: Fils;
  partialLastMonthExempt: boolean;
  employerLine: PayslipLine<"gpssa-employer"> }
export function expectedFixingMonth(joiningDate: string,
  year: number): string
export function computeGpssa(input: PayslipInput, w: PayWindow,
  g: GpssaParams, t: TraceBuilder): GpssaResult
export function refuseGccNational(pack: RulePack,
  ov: Overrides): never
```

Rules (Rulings 10 to 13):
- `expectedFixingMonth`: the joining month (`YYYY-MM`) when the joining
  date falls in `year` after January; else `"<year>-01"` (DL57 Art
  10(2), L7 Art 10). A different `gpssa.fixingMonth` throws
  `GPSSA_FIXING_MONTH` with `detail.expected` and `detail.value`.
- Raw salary: `fixingBasic` when `base` is `basic`; `fixingBasic +
  fixingAllowances` when `wage`. Clamp to `[minSalary, maxSalary]`.
- `employeeShare` = `mulDiv(salary, employeeBps, 10000, rounding)`;
  `employerGross` likewise with `employerBps`; `govSupport` =
  `mulDiv(salary, govSupportBps, 10000, rounding)` when
  `govSupportBelow` is `null` or `salary < govSupportBelow.v`, else 0;
  `employerPayable` = gross - support.
- Not prorated (DL57 Art 11(3): part of a month is a full month).
  Under L7 (`none-if-partial`), when `leavingDate` lies in this month
  and before `monthEnd`, every amount is 0 and
  `partialLastMonthExempt` is true.
- Trace lines: `gpssa.salary` (inputs `fixingMonth`, `raw`, `min`,
  `max`, `base`, `regime`), `gpssa.employer-gross`, `gpssa.gov-support`,
  `employer.gpssa` (the employer line, kind `gpssa-employer`). The
  employee share line `ded.gpssa` is written by Task 6.
- `refuseGccNational`: like `gratuity.ts`: without an override of
  `gpssaGccNationalContribution` it throws `UNSOURCED_PARAM`
  (message "GCC national pension contributions are not supported: no
  sourced rule exists"); with one it throws `UNSUPPORTED_WORKER_CLASS`.

- [ ] **Step 1: Write the failing tests** (`g(regime, base)` loads
  params with `{ gpssaContributionSalaryBase: base }`; national FX:
  `workerClass "uae-national"`, `gpssa: { regime, fixingMonth:
  "2026-01", fixingBasic: 1000000n, fixingAllowances: 500000n,
  arrears: 0n }`):
  - `charges 11% and 15% on the wage under DL57`: salary 1500000;
    employee 1500000*1100/10000 = 165000; gross 225000; support 37500
    (salary < 2000000); payable 187500.
  - `charges on basic only when told so`: salary 1000000; 110000,
    150000, 25000, 125000.
  - `gives no support at exactly 20,000`: fixingBasic 2000000, basic:
    220000, 300000, support 0, payable 300000.
  - `gives support just below 20,000`: 1999999: employee 219999.89 ->
    220000; gross 299999.85 -> 300000; support 49999.975 -> 50000;
    payable 250000.
  - `lifts a salary below 3,000 to the minimum`: 299999 and 300000 both
    give salary 300000 and employee 33000.
  - `caps a salary above 70,000`: 7000000 and 8000000 both give salary
    7000000; employee 770000; gross 1050000; support 0.
  - `charges 5% and 15% under Law 7`: basic 1000000: 50000, 150000,
    support 25000 (no threshold), payable 125000. Law 7 cap: 6000000 ->
    5000000: 250000, 750000, 125000, 625000. Law 7 floor: 50000 ->
    100000: employee 5000.
  - `skips a partial last month under Law 7`: leaving 2026-06-15: all
    0, `partialLastMonthExempt` true; leaving 2026-06-30: full 50000.
  - `charges a partial last month in full under DL57`: leaving
    2026-06-15, wage base: employee 165000.
  - `expects January for an earlier joiner`:
    `expectedFixingMonth("2020-03-01", 2026) === "2026-01"`; fixing
    `"2026-06"` throws `GPSSA_FIXING_MONTH`, `detail.expected
    "2026-01"`.
  - Review Focus 4, `refuses last year's January`: period 2026-02,
    fixing `"2025-01"` throws `GPSSA_FIXING_MONTH`, expected `"2026-01"`.
  - `expects the joining month for a mid-year joiner`: joining
    2026-06-30 gives `"2026-06"`; joining 2026-01-20 gives `"2026-01"`.
  - `refuses GCC nationals`: no override: `UNSOURCED_PARAM`,
    `detail.key "gpssaGccNationalContribution"`; with override `"x"`:
    `UNSUPPORTED_WORKER_CLASS`.
- [ ] **Step 2: Run** `pnpm --filter @payroll/engine test payroll-gpssa`;
  expect FAIL.
- [ ] **Step 3: Implement** `gpssa.ts` as above.
- [ ] **Step 4: Run** `pnpm check`; expect PASS.
- [ ] **Step 5: Commit** `feat(engine): GPSSA contributions`.

### Task 6: Deductions, caps and loans (Article 25)

**Files:**
- Create: `packages/engine/src/payroll/deductions.ts`
- Test: `packages/engine/tests/payroll-deductions.test.ts`

**Interfaces:**
- Consumes: Task 1 and 2 types.
- Produces:

```ts
export interface DeductionArgs { earnedWage: Fils;
  contractualWage: Fils; gpssaShare: Fils | null;
  requests: DeductionRequest[]; loans: LoanInstalment[] }
export interface DeductionResult {
  lines: PayslipLine<DeductionLineKind>[]; total: Fils;
  caps: { wageBase: Fils; overall: Fils };
  deferred: DeferredDeduction[]; loanBalances: LoanBalance[];
  flags: PayslipFlag[] }
export function applyDeductions(a: DeductionArgs, p: PayrollParams,
  t: TraceBuilder): DeductionResult
```

Rules (Rulings 14 to 18):
- `earnedWage` = sum of the fixed earnings lines (basic and
  allowances, after proration); overtime, rest-day, holiday and
  encashment are not "wage" for caps. Caps round with `capRoundingMode`
  (DOWN): overall = earned * 5000/10000; overpayment = earned *
  2000/10000; court-debt = earned * 2500/10000; violation = min(earned *
  500/10000, contractual * 5 / dailyDivisor); damage = contractual * 5 /
  dailyDivisor; scheme, loan and gpssa: overall cap only.
- Kind caps are per month across all requests of that kind.
- Order: `deductionOrder` split on commas; it must be a permutation of
  the seven names, else `INVALID_PARAM`. Within a kind, input order.
- Each item takes `min(requested, kindRemaining, overallRemaining)`.
  For a loan, `requested` = `min(instalment, balance)` and
  `after` = `balance - taken`. A remainder > 0 becomes a
  `DeferredDeduction` (`reason` `kind-cap` when the kind cap bound,
  else `overall-cap`) and a `DEDUCTION_DEFERRED` flag; the GPSSA share
  adds `GPSSA_SHARE_DEFERRED` ("the employer still remits the full
  employee share, DL57 Art 11(4)").
- Any violation request adds one `VIOLATION_CAP_CONFLICT` flag (detail
  `fivePercent`, `fiveDays`, `used`): Art 25(1)(f) says 5% of wage, Art
  39(1)(c) says five days' wage; the stricter is used.
- Every item gets a line even when it takes 0. Trace ids `ded.gpssa`,
  `ded.<kind>#<ref>`, `ded.loan#<ref>`; inputs `ref`, `requested`,
  `kindCap` (`"none"` when no kind cap), `taken`, `deferred`, and for
  loans `balanceBefore`, `balanceAfter`. Also `cap.base`,
  `cap.overall` and `ded.total`.

- [ ] **Step 1: Write the failing tests** (FX: earned and contractual
  wage 1500000, so overall cap 750000):
  - `sets the caps from the earned wage`: `caps` equal
    `{ wageBase: 1500000n, overall: 750000n }`.
  - `uses the stricter violation cap and flags it`: violation 100000:
    5% = 75000, five days = 1500000*5/30 = 250000; taken 75000,
    deferred 25000 `kind-cap`; flag detail `fivePercent "75000"`,
    `fiveDays "250000"`.
  - `shrinks the violation cap in a joiner month`: earned 1000001:
    1000001*500/10000 = 50000.05 -> 50000 (DOWN); taken 50000.
  - `caps overpayment recovery at 20%`: 400000 -> 300000, deferred
    100000.
  - `caps damage at five days' wage`: 300000 -> 250000, deferred 50000.
  - `shares a kind cap across requests`: overpayments 200000 and
    200000 -> 200000 and 100000; deferred 100000.
  - `stops at 50% in the stated order`: court-debt 375000, overpayment
    300000, damage 250000 -> 375000, 300000, 75000 (`overall-cap`,
    deferred 175000); total 750000.
  - `takes the GPSSA share first`: gpssa 165000, court-debt 375000,
    overpayment 300000 -> 165000, 375000, 210000 (750000 - 540000),
    deferred 90000; total 750000.
  - Review Focus 5, `takes only the loan balance`: instalment 200000,
    balance 150000 -> 150000, after 0, nothing deferred; balance 0 ->
    line 0, after 0, nothing deferred; instalment 100000, balance
    500000 -> 100000, after 400000.
  - `defers a loan when the cap is used`: court-debt 375000,
    overpayment 300000, loan 100000 of balance 500000 -> loan 75000,
    deferred 25000, after 425000.
  - `defers the GPSSA share beyond the cap`: earned 49999 (joiner on
    30 June): overall 24999; gpssa 165000 -> taken 24999, deferred
    140001, flag `GPSSA_SHARE_DEFERRED`.
  - `defers everything in a fully unpaid month`: earned 0: gpssa 165000
    taken 0, deferred 165000.
  - `follows an overridden order`: `deductionOrder` with `loan` first
    takes the loan before the court debt; `"gpssa"` alone throws
    `INVALID_PARAM`.
- [ ] **Step 2: Run** `pnpm --filter @payroll/engine test
  payroll-deductions`; expect FAIL.
- [ ] **Step 3: Implement** `applyDeductions` (a cap table, one loop
  over the order, one helper per item).
- [ ] **Step 4: Run** `pnpm check`; expect PASS.
- [ ] **Step 5: Commit** `feat(engine): capped deductions and loans`.

### Task 7: calculatePayslip, not-computed list and properties

**Files:**
- Create: `packages/engine/src/payroll/payslip.ts`,
  `packages/engine/src/payroll/not-computed.ts`
- Modify: `packages/engine/src/index.ts` (export `payroll/*`)
- Test: `packages/engine/tests/payroll-payslip.test.ts`,
  `packages/engine/tests/payroll-props.test.ts`

**Interfaces:**
- Consumes: every earlier task's exports.
- Produces:

```ts
export interface PayrollPacks { payroll: readonly RulePack[];
  gpssa: readonly RulePack[] }
export const DEFAULT_PAYROLL_PACKS: PayrollPacks
export function calculatePayslip(input: PayslipInput,
  packs: PayrollPacks, overrides?: Record<string, ParamValue>,
): Traced<Payslip>
export const NOT_COMPUTED: readonly string[]
export function notApplicableFor(c: WorkerClass): string[]
```

Order inside `calculatePayslip`: select the `ae-payroll` pack on the
month's first day; load params; validate; for `gcc-national` select
the GPSSA pack and `refuseGccNational`; `accountDays`;
`fixedEarnings`; `variableEarnings`; trace `earn.gross`; for
`uae-national` select the GPSSA pack on the same date and
`computeGpssa`; `applyDeductions` (gpssaShare = the employee share
plus `gpssa.arrears`, or `null`); trace `pay.net` (gross - total
deductions) and `employer.total` (sum of employer lines, 0 when
none). Flags are the
day, variable and deduction flags, plus `OVERRIDE_USED` (detail `keys`:
the sorted, comma-joined keys of every trace rule with `overridden`).

`NOT_COMPUTED` (exact text, in this order):
1. `"personal income tax: n/a (no rule in the rule packs)"`
2. `"ILOE unemployment insurance: not computed (no primary source read)"`
3. `"end-of-service gratuity, notice pay and exit leave pay: see"` +
   `" calculateSettlement"`
4. `"bonuses, commissions and benefits in kind: no input"`
5. `"GPSSA reduction for unpaid leave (Decree-Law 33/2021 Art 33):"` +
   `" not computed"`
6. `"GPSSA late-payment additions (Decree-Law 57/2023 Art 11(4)):"` +
   `" not computed"`
7. `"144 working hours per 3 weeks (Art 19(1)): not checked"`
8. `"Ramadan reduced hours (Executive Regulation Art 15(2)): not applied"`
9. `"alimony and the ranking of court debts (Art 25(1)(g)): not"` +
   `" computed"`
10. `"3-month limit on sanction deductions (Executive Regulation Art"` +
    `" 29(2)): not checked"`
11. `"WPS 85% paid test (Resolution 340/2026, text unread): not checked"`
12. `"other paid leave (parental, mourning, companion Art 30(4)):"` +
    `" treated as paid days"`

`notApplicableFor("expat-full-time")` returns
`["GPSSA pension contributions: not applicable, they cover UAE"` +
`" nationals only (Decree-Law 57/2023 Art 1)"]`; for `uae-national`
`[]`.

- [ ] **Step 1: Write the failing tests** in `payroll-payslip.test.ts`
  (`run(i, ov?) = calculatePayslip(i, DEFAULT_PAYROLL_PACKS, ov)`):
  - `pays FX in full`: gross 1500000n, totalDeductions 0n, net
    1500000n, employerCost 0n; earning kinds `["basic", "housing",
    "conveyance"]`; `notComputed` equals `NOT_COMPUTED`;
    `notApplicable` has the GPSSA line; `daysInPeriod` 30.
  - `pays a national under DL57`: national FX, override
    `gpssaContributionSalaryBase: "wage"`: gross 1500000, deductions
    165000, net 1335000, employerCost 187500; flag `OVERRIDE_USED`
    with `detail.keys === "gpssaContributionSalaryBase"`.
  - `refuses a national without a salary base`: `UNSOURCED_PARAM`.
  - `refuses a GCC national`: `UNSOURCED_PARAM`; with override
    `gpssaGccNationalContribution: "x"`: `UNSUPPORTED_WORKER_CLASS`.
  - `has no pack before March 2022`: 2022-01 throws `NO_PACK_FOR_DATE`;
    a national in 2023-10 throws `NO_PACK_FOR_DATE`.
  - `adds overtime to gross`: 120 min on 06-10 and 60 night min on
    06-11: gross 1500000 + 10417 + 6250 = 1516667.
  - `keeps net at zero or more for a last-day joiner`: national joining
    2026-06-30, fixing `"2026-06"`, wage base: gross 49999, deductions
    24999, net 25000, deferred
    `[{ ref: "gpssa", requested: 165000n, taken: 24999n,
    deferred: 140001n, reason: "overall-cap", kind: "gpssa" }]`,
    employerCost 187500.
  - `traces every line once`: for the overtime case, each payslip
    line's `traceId` occurs exactly once in the trace and its `result`
    equals `String(amount)`; `earn.gross`, `ded.total`, `pay.net`,
    `employer.total`, `cap.base`, `cap.overall` match `gross`,
    `totalDeductions`, `net`, `employerCost`, `caps.wageBase`,
    `caps.overall`.
  - `recovers GPSSA arrears`: national FX, wage base, `arrears:
    140001n`: deductions 165000 + 140001 = 305001, net 1194999, nothing
    deferred (305001 <= 750000).
  - `gives the same payslip twice`: two runs are `toEqual`.
- [ ] **Step 2: Write the failing properties** in `payroll-props.test.ts`
  (fast-check, 200 runs each; the arbitrary builds a valid expat or
  national-with-override input in 2026: basic 1 to 10^9 fils, 0 to 3
  allowances 0 to 10^9, joining and leaving dates in or around the
  month, a random subset of employed dates as unpaid, sick or
  maternity, counters 0 to 120, up to 3 overtime days, 0 to 5
  encashment days unless leaving, up to 4 deductions of any kind with
  consent, up to 2 loans; a national's `fixingMonth` is
  `expectedFixingMonth(joiningDate, 2026)` and its overrides carry
  `gpssaContributionSalaryBase`; absences, overtime and rest-day dates
  never share a date):
  - `net is never negative`.
  - `lines add up to the totals`: gross = sum earnings; totalDeductions
    = sum deductions; net = gross - totalDeductions; employerCost = sum
    employer lines.
  - `every money field has a matching trace line` (as the unit test,
    plus each `deferred` item matches its line's `inputs.deferred`, and
    each loan balance its line's `balanceBefore` and `balanceAfter`).
  - `deductions never exceed half the earned wage`: totalDeductions <=
    caps.overall and caps.overall * 2 <= caps.wageBase.
  - `an earlier joining date never lowers gross` (no absences or
    variable input; joining day d and d - k in the same month).
  - `one more unpaid day never raises gross`.
  - `the same input gives the same output`.
- [ ] **Step 3: Run** `pnpm --filter @payroll/engine test
  payroll-payslip payroll-props`; expect FAIL.
- [ ] **Step 4: Implement** `payslip.ts` and `not-computed.ts`.
- [ ] **Step 5: Run** `pnpm check`; expect PASS.
- [ ] **Step 6: Commit** `feat(engine): monthly payslip`.

### Task 8: Explanations in English and Arabic, and the case library

**Files:**
- Create: `packages/engine/src/explain/payroll-catalog.ts`,
  `packages/engine/src/cases/payroll-schema.ts`,
  `packages/engine/src/cases/payroll-runner.ts`,
  `packages/engine/cases/payroll/*.json` (10 files, table below)
- Modify: `packages/engine/src/explain/catalog.ts` (merge payroll
  messages and money ids), `packages/engine/src/explain/explain.ts`
  (`#` suffix lookup), `packages/engine/src/shell.ts` (export
  `runPayrollCases`, `PayrollCaseFileSchema`)
- Test: `packages/engine/tests/payroll-explain.test.ts`,
  `packages/engine/tests/payroll-cases.test.ts`

**Interfaces:**
- Consumes: `calculatePayslip`, `DEFAULT_PAYROLL_PACKS` (Task 7);
  `MESSAGES`, `MONEY_IDS`, `explainTrace` (existing).
- Produces: `PAYROLL_EN`, `PAYROLL_AR: Record<string, string>`,
  `PAYROLL_MONEY_IDS: readonly string[]`; `baseId(id: string): string`
  (text before `#`) in `explain.ts`, used for both the message key and
  the money check; `runPayrollCases(dir: string):
  Promise<PayrollCaseReport[]>` with `PayrollCaseReport { id: string;
  passed: boolean; expected: PayrollExpected; actual: PayrollExpected |
  string; trace: TraceLine[] }` and `PayrollExpected { gross: string;
  totalDeductions: string; net: string; employerCost: string }`.

Message text (`{result}` is formatted as AED for money ids; every
message ends with ` ({rules}).`, shown once here as `R`). Money ids:
all `earn.*`, `cap.*`, `ded.*`, `pay.net`, `gpssa.*`, `employer.*`.

```
payroll.period   EN Pay period {in.payStart} to {in.payEnd}: {result}
                    days R
                 AR فترة الراتب من {in.payStart} إلى {in.payEnd}:
                    {result} يومًا R
payroll.days     EN Paid share of the month in half-days: {result}
                    ({in.unpaidDays} unpaid days, {in.halfPayDays}
                    half-pay days) R
                 AR الحصة المدفوعة من الشهر بأنصاف الأيام: {result}
                    ({in.unpaidDays} أيام بدون أجر، {in.halfPayDays}
                    أيام بنصف أجر) R
leave.sick       EN Sick leave this month: {in.fullPay} days full pay,
                    {in.halfPay} half pay, {in.unpaid} unpaid R
                 AR الإجازة المرضية هذا الشهر: {in.fullPay} أيام بأجر
                    كامل، {in.halfPay} بنصف أجر، {in.unpaid} بدون أجر R
leave.maternity  EN Maternity leave this month: {in.fullPay} days full
                    pay, {in.halfPay} half pay, {in.unpaid} unpaid R
                 AR إجازة الوضع هذا الشهر: {in.fullPay} أيام بأجر كامل،
                    {in.halfPay} بنصف أجر، {in.unpaid} بدون أجر R
earn.basic       EN Basic salary for the period: {result} R
                 AR الراتب الأساسي عن الفترة: {result} R
earn.allowance   EN Allowance {in.code}: {result} R
                 AR البدل {in.code}: {result} R
earn.overtime.normal
                 EN Overtime pay, {in.minutes} minutes: {result} R
                 AR أجر العمل الإضافي، {in.minutes} دقيقة: {result} R
earn.overtime.night
                 EN Night overtime pay (22:00 to 04:00), {in.minutes}
                    minutes: {result} R
                 AR أجر العمل الإضافي الليلي (من 22:00 إلى 04:00)،
                    {in.minutes} دقيقة: {result} R
earn.rest-day    EN Pay for work on rest days ({in.days} paid,
                    {in.daysOff} days off in lieu): {result} R
                 AR أجر العمل في أيام الراحة ({in.days} مدفوعة،
                    {in.daysOff} أيام راحة بديلة): {result} R
earn.holiday     EN Pay for work on official holidays ({in.days} paid,
                    {in.daysOff} days off in lieu): {result} R
                 AR أجر العمل في العطلات الرسمية ({in.days} مدفوعة،
                    {in.daysOff} أيام راحة بديلة): {result} R
earn.leave-encashment
                 EN Annual leave paid in cash, {in.days} days: {result} R
                 AR بدل نقدي عن الإجازة السنوية، {in.days} أيام:
                    {result} R
earn.gross       EN Gross pay: {result} R
                 AR إجمالي الراتب: {result} R
gpssa.salary     EN Pension contribution salary (fixed in
                    {in.fixingMonth}): {result} R
                 AR راتب حساب الاشتراك (المحدد في {in.fixingMonth}):
                    {result} R
gpssa.employer-gross
                 EN Employer pension share before government support:
                    {result} R
                 AR حصة صاحب العمل في الاشتراك قبل دعم الحكومة:
                    {result} R
gpssa.gov-support
                 EN Part of the employer share paid by the government:
                    {result} R
                 AR الجزء الذي تتحمله الحكومة من حصة صاحب العمل:
                    {result} R
cap.base         EN Wage used for deduction limits: {result} R
                 AR الأجر المعتمد لحدود الخصم: {result} R
cap.overall      EN Most that may be deducted this month (half the
                    wage): {result} R
                 AR أقصى ما يجوز خصمه هذا الشهر (نصف الأجر): {result} R
ded.gpssa        EN Pension contribution, employee share: {result} R
                 AR اشتراك المعاش، حصة الموظف: {result} R
ded.overpayment  EN Recovery of an overpayment {in.ref}: {result} R
                 AR استرداد مبلغ مدفوع بالزيادة {in.ref}: {result} R
ded.violation    EN Deduction for violation {in.ref}: {result} R
                 AR خصم بسبب مخالفة {in.ref}: {result} R
ded.damage       EN Deduction for damage {in.ref}: {result} R
                 AR خصم بسبب إتلاف {in.ref}: {result} R
ded.court-debt   EN Court-ordered deduction {in.ref}: {result} R
                 AR خصم بموجب حكم قضائي {in.ref}: {result} R
ded.scheme       EN Deduction for an approved scheme {in.ref}: {result} R
                 AR خصم لصالح نظام معتمد {in.ref}: {result} R
ded.loan         EN Loan repayment {in.ref}: {result} R
                 AR سداد قرض {in.ref}: {result} R
ded.total        EN Total deductions: {result} R
                 AR مجموع الخصومات: {result} R
pay.net          EN Net pay: {result} R
                 AR صافي الراتب: {result} R
employer.gpssa   EN Employer pension contribution payable: {result} R
                 AR اشتراك المعاش المستحق على صاحب العمل: {result} R
employer.total   EN Employer cost on top of gross pay: {result} R
                 AR تكلفة صاحب العمل فوق إجمالي الراتب: {result} R
```

Case library (`cases/payroll/<id>.json`; June 2026 and FX unless
stated; amounts in fils; status = weakest status among the rules
used; every case uses the calendar-day proration convention, so all
are `convention`). Columns: gross, deductions, net, employer cost.

| id | input beyond FX | g / d / n / e |
|---|---|---|
| full-month-expat | none | 1500000 / 0 / 1500000 / 0 |
| joiner-june-11 | joining 2026-06-11 | 1000001 / 0 / 1000001 / 0 |
| leaver-march-15 | March, leaving 03-15 | 725806 / 0 / 725806 / 0 |
| february-join-leave | Feb, 02-10 to 02-20 | 589286 / 0 / 589286 / 0 |
| unpaid-three-days | unpaid 06-02 to 06-04 | 1350000 / 0 / 1350000 / 0 |
| sick-cross-15-july | July, used 10, all July | 870968 / 0 / 870968 / 0 |
| overtime-day-night | 120 min; 60 night min | 1516667 / 0 / 1516667 / 0 |
| deductions-over-cap | see note 1 | 1500000 / 750000 / 750000 / 0 |
| national-dl57-wage | see JSON below | 1500000 / 165000 / 1335000 / 187500 |
| national-last-day-joiner | see note 2 | 49999 / 24999 / 25000 / 187500 |

Note 1: court-debt 375000, overpayment 300000, damage 250000 (consent
true). Note 2: national, joining 2026-06-30, fixing month `2026-06`,
fixing amounts as FX, override wage base.

Case file shape (`PayrollCaseFileSchema`, zod, in shell; amounts are
digit strings, converted with `fils(BigInt(s))`):

```json
{
  "id": "national-dl57-wage",
  "title": "UAE national, DL57, contribution on the full wage",
  "input": {
    "year": 2026, "month": 6,
    "employee": {
      "workerClass": "uae-national", "joiningDate": "2020-03-01",
      "leavingDate": null, "probationEndDate": null,
      "shiftWorker": false, "normalHoursPerDay": 8,
      "basicMonthly": "1000000",
      "allowances": [
        { "code": "housing", "kind": "housing", "monthly": "400000" },
        { "code": "transport", "kind": "conveyance",
          "monthly": "100000" }
      ],
      "gpssa": { "regime": "dl57-2023", "fixingMonth": "2026-01",
        "fixingBasic": "1000000", "fixingAllowances": "500000",
        "arrears": "0" }
    },
    "absences": [], "sickDaysUsedBefore": 0,
    "maternityDaysUsedBefore": 0, "overtime": [], "restDayWork": [],
    "encashLeaveDays": 0, "deductions": [], "loans": []
  },
  "overrides": { "gpssaContributionSalaryBase": "wage" },
  "expected": { "gross": "1500000", "totalDeductions": "165000",
    "net": "1335000", "employerCost": "187500" },
  "sourceIds": ["DL57_ART4", "DL57_ART5", "DL57_ART10"],
  "status": "convention"
}
```

`status` is one of `official`, `secondary`, `convention`; every
`sourceIds` entry must resolve with `sourceOf`, else
`INVALID_CASE_FILE`. A case that throws reports `ERROR <code>`.

- [ ] **Step 1: Write the failing tests**:
  - `payroll-explain.test.ts`: `has both languages for every payroll
    id` (every key of `PAYROLL_EN` is in `PAYROLL_AR` and the reverse;
    every id emitted by the Task 7 national, overtime, sick, maternity,
    rest-day, encashment and all-deduction-kinds payslips has a message
    under `baseId`); `never prints [untranslated]` for those traces in
    `en` and `ar`; `fills every placeholder`: no rendered line in
    either language contains `"{in."`; `formats money as AED`: the FX
    English text contains `"Net pay: AED 15,000.00"`; `explains an item line`:
    `earn.allowance#housing` renders `"Allowance housing: AED
    4,000.00"`; `keeps amounts intact in Arabic`: the Arabic FX text
    contains `"15,000.00"` inside the isolate marks.
  - `payroll-cases.test.ts`: `has at least 10 cases and all pass`;
    `pins the DL57 case`: `national-dl57-wage` actual net `"1335000"`;
    `rejects an unknown source id` (temp dir, `INVALID_CASE_FILE`);
    `reports an engine error as ERROR <code>` (a national case without
    overrides gives `"ERROR UNSOURCED_PARAM"`).
- [ ] **Step 2: Run** `pnpm --filter @payroll/engine test
  payroll-explain payroll-cases`; expect FAIL.
- [ ] **Step 3: Implement** the catalog file (comment
  `// NEEDS NATIVE REVIEW` above `PAYROLL_AR`), the merge into
  `MESSAGES` and `MONEY_IDS`, `baseId`, the schema, the runner (same
  shape as `runCases`) and the ten JSON files.
- [ ] **Step 4: Run** `pnpm check`; expect PASS (the existing explain
  and cases tests still pass).
- [ ] **Step 5: Commit** `feat(engine): payslip explanations and cases`.

### Task 9: Payslip to WPS adapter, handover and ledger

**Files:**
- Create: `packages/wps/src/from-payslip.ts`
- Modify: `packages/wps/src/index.ts` (export it), `HANDOVER.md`,
  `LEDGER.md`
- Test: `packages/wps/tests/from-payslip.test.ts`

**Interfaces:**
- Consumes: `Payslip`, `EarningKind`, `calculatePayslip`,
  `DEFAULT_PAYROLL_PACKS` from `@payroll/engine`; `SifEmployee`,
  `EdrInput`, `EvpInput`, `generateSif`, `validateSif`.
- Produces:

```ts
export interface SifBankDetails { personId: string;
  routingCode: string; account: string }
export function payslipToSifEmployee(slip: Payslip,
  bank: SifBankDetails): SifEmployee
```

Mapping (Ruling 19):
- Buckets from earnings by kind: `basic` -> fixed; `housing` ->
  housing; `conveyance` -> conveyance; `medical` -> medical; `passage`
  -> passage; `other` -> otherAllowances; `overtime`, `rest-day`,
  `holiday` -> overtime; `leave-encashment` -> leaveEncashment.
- `slip.totalDeductions` is taken from the buckets in this order until
  used up: fixed, otherAllowances, overtime, leaveEncashment, passage,
  medical, conveyance, housing. It always fits, since deductions are at
  most half the earned wage.
- EDR: `payStart`, `payEnd`, `days = daysInPeriod`, `fixed`,
  `variable` = sum of the seven EVP buckets, `unpaidLeaveDays =
  slip.unpaidDays`. EVP only when `variable > 0`.
- If `fixed + variable !== slip.net`, throw `ADAPTER_MISMATCH`.

- [ ] **Step 1: Write the failing tests** (bank details `{ personId:
  "00915012345663", routingCode: "802420101", account:
  "AE400240043520123456701" }`, the clean fixture's account; payslips
  from `calculatePayslip` on the engine's FX values, rebuilt locally in
  the test since the engine's test helper is not exported):
  - `maps a full month`: fixed 1000000n, variable 500000n, EVP housing
    400000n, conveyance 100000n, others 0n; days 30; unpaid 0.
  - `takes deductions from basic first`: overpayment 300000: fixed
    700000n, variable 500000n.
  - `spills deductions into allowances`: basic 400000, housing 600000,
    court-debt 250000 (cap 25% of 1000000 = 250000), overpayment 200000
    (cap 200000); total 450000 <= 500000: fixed 0n, variable 550000n,
    EVP housing 550000n.
  - `puts overtime in the overtime field`: 120 min plus 60 night min:
    EVP overtime 16667n, variable 516667n.
  - `reports unpaid days`: three unpaid days: unpaidLeaveDays 3, fixed
    900000n.
  - `omits the EVP without variable pay`: no allowances: `evp`
    undefined, variable 0n.
  - `produces a file with no errors`: `generateSif` with employer
    `"0000000123456"`, bank `"802420101"`, created `2026-07-01`
    `"093000"`, month 2026-06, one adapted FX employee; `validateSif(
    text, undefined, "2026-07-01")` has no `error` findings.
  - Property (fast-check, 200 runs, payslips from the Task 7 style
    arbitrary rebuilt here): `fixed + variable equals net`, `EVP parts
    add up to variable`, `nothing is negative`, `EVP exists only with
    variable pay`.
- [ ] **Step 2: Run** `pnpm --filter @payroll/wps test from-payslip`;
  expect FAIL.
- [ ] **Step 3: Implement** `from-payslip.ts`.
- [ ] **Step 4: Update docs**: `HANDOVER.md` (current state: Plan 5
  built; engine layout row "Monthly payslip | `src/payroll/`";
  known limits: the Rulings below that move money, and that every
  national's payslip needs the `gpssaContributionSalaryBase`
  override); `LEDGER.md` section 3 or a new "Rulings made during the
  Plan 5 build" section: one line per Ruling below.
- [ ] **Step 5: Run** `pnpm check`; expect PASS.
- [ ] **Step 6: Commit** `feat(wps): payslip to SIF adapter`.

---

## Rulings

Claude's calls under the owner's "no technical questions" instruction.
The owner can overrule any. "Cost if wrong" is the work or the money at
risk.

1. **Two packs, unique keys.** `ae-payroll` (from 2022-02-02) and
   `ae-gpssa` (from 2023-10-31), selected on the month's first day, so
   the first payroll month is March 2022 and the first month for UAE
   nationals is November 2023. Cost if wrong: older months need an
   old-law pack; no money at risk now.
2. **One source id per article** (`DL33_ART19` and so on) instead of a
   new `article` field on `RuleSource`. Cost: a data migration if the
   type gains the field later.
3. **Calendar-day proration** (`convention`): a component is monthly
   times paid days over the days in the month, rounded HALF_UP per
   line. Cost if a 30-day basis is expected: up to 1/30 of a month's
   pay per joiner or leaver month (about AED 500 on AED 15,000).
4. **Sick and maternity pay reduce earnings, not deductions.** A
   half-pay day removes half a day of every wage component; it is not
   an Article 25 deduction, so it does not use the 50% cap. "Full pay"
   is read as the wage (`paidLeaveBase`, `convention`; not the gratuity
   pack's `leavePayBase`). Cost if pay means
   basic: allowances overpaid on sick days.
5. **Sick-leave year and counters are inputs.** Article 31 says "per
   year" without saying which year; the caller passes days already
   used. Probation sick days are unpaid and do not use up the 90.
   Cost: Plan 3 must decide the year; a wrong counter misprices sick
   days.
6. **Leave beyond the law is unpaid and flagged** (sick over 90,
   maternity over 105), never refused. Cost: none to pay.
7. **Overtime rate**: hourly = contractual basic / 30 / the contract's
   daily hours (input, at most 8, Art 17(1)). Minutes, not hours. Cost
   if a 26-day or annual basis is expected: about 15% (30/26) on
   overtime.
8. **Overtime caps flag, never cut pay** (Art 19(1) limits the employer,
   Art 19(2) pays every hour worked). The 144-hour three-week limit is
   a cited param (`maxHoursPer3Weeks`, official) but not checked: there
   is no daily schedule input. Cost: none to pay; a breach goes
   unflagged until rosters exist.
9. **Rest-day and holiday work** (Art 19(4), 28(2)): an extra day's
   wage (wage / 30) plus 50% of basic for the day, because the monthly
   salary already pays the rest day; the "premium only" reading is a
   supported override (`restDayPayMode`). Cost if premium only is right:
   AED 500 overpaid per day at a AED 15,000 wage (66,667 vs 16,667
   fils). Shift workers get 25%, not 50%, at night. Days off in lieu
   pay 0.
10. **GPSSA regime is an input** (`dl57-2023` or `law7-1999`), never
    inferred: the transition for staff employed on 31 Oct 2023 is NOT
    FOUND. Cost: wrong regime means 6% of salary wrong each month.
11. **Contribution salary base is unsourced** (`basic` or `wage`, DL57
    Art 5(2) says only "the wage determined by the employment
    contract"). No default: **every UAE national's payslip throws
    `UNSOURCED_PARAM` until the caller passes an override**, and the
    payslip flags `OVERRIDE_USED`. Cost: nationals cannot be run
    without a decision; that is the intent.
12. **GPSSA is not prorated** (DL57 Art 11(3)); Law 7 skips a partial
    last month (Art 10). Salary is fixed in January or the joining
    month and passed in; a wrong month is refused. Unpaid leave does
    not reduce it (DL33 Art 33 interplay listed as not computed). Cost:
    an overcharge in long unpaid months.
13. **GCC nationals are refused** (`UNSOURCED_PARAM`, or
    `UNSUPPORTED_WORKER_CLASS` with an override), as in the gratuity.
    Cost: no GCC payslips until a source is read.
14. **Cap base is the earned wage** (basic plus allowances after
    proration; not overtime or encashment); "five days' wage" uses the
    contractual wage / 30. Caps round DOWN. Cost if the contractual
    wage is the base: caps too low in part months (worker-favourable).
15. **Violation cap conflict**: Art 25(1)(f) 5% versus Art 39(1)(c) five
    days; the stricter (always 5% on a 30-day basis) is used and every
    payslip with a violation deduction is flagged. Cost if five days is
    right: recovery slower, never unlawful.
16. **Deduction order when 50% binds**: GPSSA, court debt, overpayment,
    violation, damage, scheme, loan (statutory first, consensual last;
    a param). Remainders are deferred and reported, never dropped. Cost:
    a different order changes who waits, not the total.
17. **GPSSA share counts towards the 50% cap and can be deferred**
    (Art 25(1)(c) and 25(2)); the caller resubmits it next month as
    `GpssaInput.arrears`; the flag says the employer still remits
    the full share. This keeps net pay at zero or more. Cost if the
    share must always be deducted in full: net pay can go negative in a
    last-day joiner month; the employer funds the gap either way.
18. **Consent**: loans need written consent (Art 25(1)(a)); "scheme"
    groups 25(1)(d) and (e) and always needs consent (stricter). No
    interest is computed. Cost: savings-fund deductions need a consent
    flag they do not strictly need.
19. **WPS split**: fixed = earned basic; variable = everything else,
    itemised in the EVP (rest-day and holiday pay in the overtime
    field). Deductions come off fixed first, then other allowances,
    overtime, encashment, passage, medical, conveyance, housing, so
    fixed + variable = net. The adapter lives in `packages/wps`
    (engine cannot depend on wps). Cost if banks expect gross fixed:
    adapter change only.
20. **Exit leave pay belongs to `calculateSettlement`** (basic, ER Art
    19(2)); the payslip refuses encashment in a leaving month
    (`ENCASHMENT_AT_EXIT`) and cashes in-service leave at the wage (ER
    Art 19(1)). Cost: none, double payment is impossible.
21. **ILOE and the WPS 85% test are not computed** (snippet-level
    sources only) and are listed on every payslip. No demo command in
    this plan. Cost: users compute ILOE outside the product for now.
22. **Law 7 rates and the 2.5% government support are `official`**:
    they were read in the official site's English text, although the
    three L7 amendments, the Arabic text and any Cabinet decision
    changing the support are unread (the 25 Nov note asked for
    `secondary`). Cost if a later decision changed them: wrong pension
    amounts for pre-2023 nationals until the pack is versioned.
