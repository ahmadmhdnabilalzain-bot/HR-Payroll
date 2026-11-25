# Plan 1: Payroll Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** A pure, deterministic TypeScript engine that computes a UAE
end-of-service settlement with a per-line trace and source-cited rule-packs,
plus a case library, and one command that prints the traced result.

**Architecture:** A dependency-free engine package. Money is integer fils
(`bigint`). Statutory values live in versioned, effective-dated rule-packs;
each value carries a source and a status, and unsourced values refuse to run.
Every calculation returns a value plus a trace. No clock, database or network
access inside the engine.

**Tech Stack:** Node 22, pnpm 10, TypeScript, Vitest, fast-check, zod, tsx.
Pin exact versions from `npm view` at scaffold time (seen 25 Nov 2026:
typescript 7.0.2, vitest 5.1.2, fast-check 4.11.0, zod 4.6.7, tsx 4.23.15).

**Spec:** `docs/superpowers/specs/2026-11-25-master-feature-list.md`
(UQ1, UQ4, UQ5, UQ6, UQ12 gratuity part), and
`docs/superpowers/specs/2026-11-25-uae-sme-hr-payroll-design.md` section 6.
Standards: `docs/engineering-standards.md`.

## Global Constraints

- Line length: **80 characters maximum** in `.ts`, `.json`, `.mjs` and
  `.md` under `packages/` and `scripts/` (enforced by `pnpm check`).
- Files under about 300 lines; functions under about 30 lines.
- Money: integer fils as `bigint`. No floating point anywhere in the engine.
- The engine never reads the clock, files, environment or network. Dates are
  ISO strings (`YYYY-MM-DD`) passed in. **Purity covers every file except
  the I/O shell**: `src/cases/runner.ts` and `src/cli.ts` (they read
  files). `zod` is imported only by `src/cases/schema.ts`; the engine core
  has no runtime dependencies.
- Rules and cases cite sources by id from `src/sources.ts` (long URLs live
  there, so the 80-character check passes).
- Rule parameter statuses: `official` (fetched official text), `secondary`
  (credible secondary source), `convention` (our documented choice, not
  law), `hypothetical` (used only by the rule-change preview),
  `unsourced` (no source: no default, the engine throws
  `UNSOURCED_PARAM`).
- Every statutory value used in a test cites a fetched source URL.
- Errors carry a stable `code`, the offending value and where it came from.
- Each task ends with `pnpm check` green and one commit.

**Sourced facts available now (fetched 25 Nov 2026):**
- Foreign full-time worker, one or more years of continuous service: gratuity
  on basic wage: 21 days' wage per year for the first five years, 30 days per
  year beyond, total not above two years' wage. UAE nationals follow
  pension legislation instead. Source (official):
  `https://uaelegislation.gov.ae/en/legislations/1541/download`
  (Federal Decree-Law 33 of 2021, Article 51).
- Days of unpaid absence are not counted in service; gratuity uses basic
  salary only. Source (official): `https://u.ae/en/information-and-services/`
  `jobs/Sector-of-employment/employment-in-the-private-sector/`
  `end-of-service-benefits-for-employees-in-the-private-sector`
- A worker leaving before using annual leave is paid for any unused
  days and for the fraction of the last year, **calculated on basic
  salary**. Source (official): the u.ae "Types of leaves" page, id
  `UAE_GOV_LEAVES`. Article 51 sets the gratuity base as the last basic
  wage received (official, `LAW_33_2021`, uaelegislation.gov.ae/en/
  legislations/1541).
- Worked example: basic AED 10,000, five years: AED 35,000 (30-day divisor).
  Source (secondary, press summary of a MOHRE post):
  `https://www.arabianbusiness.com/business/uae-gratuity-rules-how-to-`
  `calculate-end-of-service-pay`
- Not sourced: partial-year proportion, the daily-wage divisor, notice pay,
  deduction limits. They are `secondary` or `convention` or `unsourced` as
  stated in Task 5.

## Review Focus

Inputs that the spec implies but no task exercises by default (each gets a
test in the owning task):
1. Last working date before joining date: error `INVALID_DATE_RANGE`
   (Task 5).
2. Joining and last working date the same day: zero service, not eligible,
   no crash (Task 5).
3. Unpaid leave days exceeding total days: error `INVALID_UNPAID_DAYS`
   (Task 5).
4. Impossible dates (`2024-02-30`) and non-ISO text: error `INVALID_DATE`
   (Task 5).
5. UAE national or GCC national: result "not applicable, pension
   legislation", never a silent zero (Task 5).
6. Service of exactly one year (the 365-day boundary), leap years (Task 5).
7. Zero or negative basic salary: error `INVALID_AMOUNT` (Task 5).
8. Very large amounts: bigint arithmetic does not overflow or lose
   precision (Task 2).

## File Structure

```
package.json                      workspace root scripts
pnpm-workspace.yaml
tsconfig.base.json
.gitignore
scripts/check-line-length.mjs     fails on lines over 80 chars
scripts/check-line-length.test.mjs
packages/engine/package.json
packages/engine/tsconfig.json
packages/engine/src/errors.ts          EngineError with stable codes
packages/engine/src/sources.ts         source registry keyed by short id
packages/engine/src/trace-types.ts     TraceRule, TraceLine, Traced
packages/engine/src/money.ts           Fils, rounding, parse, format
packages/engine/src/dates.ts           strict ISO dates, day arithmetic
packages/engine/src/rules/types.ts     RulePack, RuleParam, statuses
packages/engine/src/rules/select.ts    selectPack, requireParam
packages/engine/src/rules/gratuity-pack.ts  the 2022 gratuity pack (data)
packages/engine/src/trace.ts           TraceLine, TraceBuilder, Traced
packages/engine/src/gratuity.ts        calculateGratuity
packages/engine/src/settlement.ts      calculateSettlement
packages/engine/src/preview.ts         previewRuleChange
packages/engine/src/explain/catalog.ts message catalog en and ar
packages/engine/src/explain/explain.ts explainTrace
packages/engine/src/cases/schema.ts    zod schema for case files
packages/engine/src/cases/runner.ts    runCases
packages/engine/src/cli.ts             demo command
packages/engine/src/index.ts           public exports
packages/engine/cases/gratuity/*.json  case library
packages/engine/samples/settlement.json
packages/engine/tests/*.test.ts        one test file per source file
```

---

### Task 1: Scaffold, shared types and the line-length check

**Files:**
- Create: root `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`,
  `.gitignore`, `scripts/check-line-length.mjs`,
  `scripts/check-line-length.test.mjs`, `packages/engine/package.json`,
  `packages/engine/tsconfig.json`, `packages/engine/src/errors.ts`,
  `packages/engine/src/rules/types.ts`,
  `packages/engine/src/trace-types.ts`, `packages/engine/src/sources.ts`
- Test: `packages/engine/tests/shared.test.ts`

**Interfaces:**
- Produces: root scripts `pnpm check` (line check, `tsc --noEmit`,
  `vitest run`), `pnpm test`, `pnpm demo`;
  `findLongLines(text: string, max: number): number[]` (1-based line numbers)
  in `scripts/check-line-length.mjs`, also a CLI over `packages/` and
  `scripts/`;
  `class EngineError extends Error` with `code: string` and
  `detail: Record<string, string>`;
  `type RuleStatus = "official" | "secondary" | "convention" |
  "hypothetical" | "unsourced"`; `type ParamValue = number | boolean |
  string`; `interface RuleSource { url: string; note: string }`;
  `interface RuleParam { value: ParamValue | null; status: RuleStatus;
  source: RuleSource | null }`; `interface RulePack { id: string;
  version: string; effectiveFrom: string; effectiveTo: string | null;
  params: Record<string, RuleParam> }`; `interface ResolvedParam { key:
  string; value: ParamValue; status: RuleStatus; source: RuleSource | null;
  packId: string; packVersion: string; overridden: boolean }`;
  `interface TraceRule { key: string; value: string; status: RuleStatus;
  packId: string; packVersion: string; overridden: boolean }`;
  `interface TraceLine { id: string; label: string; formula: string;
  inputs: Record<string, string>; result: string; rules: TraceRule[] }`;
  `interface Traced<T> { value: T; trace: TraceLine[] }`;
  `SOURCES: Record<string, RuleSource>` and `sourceOf(id: string):
  RuleSource` (unknown id throws `UNKNOWN_SOURCE`). Source ids:
  `LAW_33_2021` (uaelegislation.gov.ae/en/legislations/1541, Articles 29
  and 51), `UAE_GOV_EOSB` (u.ae end-of-service page), `UAE_GOV_LEAVES`
  (u.ae types-of-leaves page), `ARABIAN_BUSINESS_EOSB` (secondary press
  summary of a MOHRE post), `X0PA_EOSB_CALC` (secondary vendor calculator),
  `ENGINE_CONVENTION` (note "engine convention, not law"), `HYPOTHETICAL`
  (note "hypothetical change, not law").

- [ ] **Step 1: Write failing tests:** in `check-line-length.test.mjs`
  (`node:test`), `findLongLines("a\n" + "x".repeat(81) + "\n", 80)` equals
  `[2]` and 80-character lines return `[]`; in `shared.test.ts`,
  `new EngineError("X", "m", { k: "v" })` keeps `code` and `detail`;
  `sourceOf("NOPE")` throws `UNKNOWN_SOURCE`; every `SOURCES` entry has a
  non-empty note; `sourceOf("LAW_33_2021").url` starts with
  `https://uaelegislation.gov.ae`.
- [ ] **Step 2: Run** `node --test scripts/` and `pnpm test` and expect FAIL.
- [ ] **Step 3: Implement** the script, the shared files and the workspace
  (ESM, strict TypeScript with `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`, exact dependency versions from
  `npm view`; Vitest `passWithNoTests`).
- [ ] **Step 4: Run** `node --test scripts/` and `pnpm check`; expect PASS.
- [ ] **Step 5: Commit** `chore: scaffold workspace and shared types`.

### Task 2: Money (integer fils)

**Files:**
- Create: `packages/engine/src/money.ts`
- Test: `packages/engine/tests/money.test.ts`

**Interfaces:**
- Consumes: `EngineError` (Task 1).
- Produces (exact):
  `type Fils = bigint & { readonly __brand: "Fils" }`;
  `type RoundingMode = "HALF_UP" | "HALF_EVEN" | "DOWN" | "UP"`;
  `fils(value: bigint): Fils`;
  `parseAed(text: string): Fils` (digits with optional `.` and at most two
  decimals; else `INVALID_AMOUNT`);
  `formatAed(amount: Fils): string` (`"AED 10,000.00"`, `"-AED 5.50"`);
  `add(a: Fils, b: Fils): Fils`, `sub(a: Fils, b: Fils): Fils`;
  `mulDiv(amount: Fils, num: bigint, den: bigint, mode: RoundingMode): Fils`
  (denominator must be positive, else `DIVIDE_BY_ZERO`; HALF_UP rounds
  halves away from zero).

- [ ] **Step 1: Write failing tests:** `parseAed("10000.5")` is `1000050n`;
  `formatAed(fils(1000050n))` is `"AED 10,000.50"`;
  `mulDiv(fils(1000000n), 105n, 30n, "HALF_UP")` is `3500000n`;
  `mulDiv(fils(1n), 1n, 2n, "HALF_UP")` is `1n`, `"HALF_EVEN"` `0n`,
  `"DOWN"` `0n`, `"UP"` `1n`; negative halves round away from zero under
  HALF_UP; `parseAed("1.234")` and `parseAed("abc")` throw `INVALID_AMOUNT`;
  `mulDiv(x, 1n, 0n, "DOWN")` throws `DIVIDE_BY_ZERO`; Review Focus 8:
  `mulDiv(fils(10n ** 30n), 3n, 2n, "HALF_UP")` equals
  `fils(15n * 10n ** 29n)`. Property test (fast-check):
  `sub(add(a, b), b) === a`.
- [ ] **Step 2: Run** `pnpm test money` and expect FAIL.
- [ ] **Step 3: Implement** with pure `bigint` arithmetic (round by comparing
  twice the remainder with the denominator).
- [ ] **Step 4: Run** `pnpm test money` and `pnpm check`; expect PASS.
- [ ] **Step 5: Commit** `feat(engine): integer-fils money with rounding`.

### Task 3: Pack selection and unsourced refusal

**Files:**
- Create: `packages/engine/src/rules/select.ts`
- Test: `packages/engine/tests/rules.test.ts`

**Interfaces:**
- Consumes: `EngineError`, `RulePack`, `RuleParam`, `ResolvedParam`,
  `ParamValue` (Task 1).
- Produces (exact):
  `selectPack(packs: RulePack[], onDate: string): RulePack` (inclusive start,
  exclusive end; none: `NO_PACK_FOR_DATE`; overlap: `OVERLAPPING_PACKS`);
  `requireParam(pack: RulePack, key: string,
  overrides?: Record<string, ParamValue>): ResolvedParam` (missing key:
  `MISSING_PARAM`; `unsourced` or null value without an override:
  `UNSOURCED_PARAM` with `detail.key`; an override is allowed for any status
  and sets `overridden: true`).

- [ ] **Step 1: Write failing tests:** two packs, `selectPack` picks by date
  including the boundary day; no pack: `NO_PACK_FOR_DATE`; an `official`
  param resolves with its source; an `unsourced` param throws
  `UNSOURCED_PARAM`; the same param with an override resolves with
  `overridden: true`; unknown key: `MISSING_PARAM`.
- [ ] **Step 2: Run** `pnpm test rules` and expect FAIL.
- [ ] **Step 3: Implement** both functions.
- [ ] **Step 4: Run** `pnpm test rules` and `pnpm check`; expect PASS.
- [ ] **Step 5: Commit** `feat(engine): rule-pack selection and refusal`.

### Task 4: Trace builder

**Files:**
- Create: `packages/engine/src/trace.ts`
- Test: `packages/engine/tests/trace.test.ts`

**Interfaces:**
- Consumes: `TraceLine`, `TraceRule`, `ResolvedParam`, `EngineError`
  (Task 1).
- Produces (exact):
  `class TraceBuilder { add(line: TraceLine): void; lines(): TraceLine[] }`;
  `traceRule(param: ResolvedParam): TraceRule`.

- [ ] **Step 1: Write failing tests:** `lines()` returns insertion order and
  a copy; a duplicate id throws `DUPLICATE_TRACE_ID`; `traceRule`
  stringifies the value and keeps status, pack version and `overridden`.
- [ ] **Step 2: Run** `pnpm test trace` and expect FAIL.
- [ ] **Step 3: Implement** the builder and `traceRule`.
- [ ] **Step 4: Run** `pnpm test trace` and `pnpm check`; expect PASS.
- [ ] **Step 5: Commit** `feat(engine): per-line calculation trace`.

### Task 5: Dates and the gratuity calculation

**Files:**
- Create: `packages/engine/src/dates.ts`,
  `packages/engine/src/rules/gratuity-pack.ts`,
  `packages/engine/src/gratuity.ts`
- Test: `packages/engine/tests/dates.test.ts`,
  `packages/engine/tests/gratuity.test.ts`

**Interfaces:**
- Consumes: `Fils`, `mulDiv` (Task 2); `selectPack`, `requireParam`
  (Task 3); `TraceBuilder`, `traceRule` (Task 4); shared types and
  `sourceOf` (Task 1).
- Produces (exact):
  `parseIsoDate(text: string): { y: number; m: number; d: number }`
  (strict; `INVALID_DATE`);
  `addDays(date: string, days: number): string`;
  `daysBetween(from: string, to: string): number`;
  `anniversary(joining: string, years: number): string` (29 February in a
  non-leap year becomes 28 February);
  `GRATUITY_PACKS: RulePack[]` (pack id `ae-gratuity`, version
  `2022-02-02`, effective from `2022-02-02`);
  `type WorkerClass = "expat-full-time" | "uae-national" | "gcc-national"`;
  `interface GratuityInput { joiningDate: string; lastWorkingDate: string;
  unpaidLeaveDays: number; lastBasicMonthly: Fils; workerClass: WorkerClass }`;
  `interface GratuityResult { amount: Fils; eligible: boolean;
  reason: string; completedYears: number; leftoverDays: number }`;
  `calculateGratuity(input: GratuityInput, packs: RulePack[],
  overrides?: Record<string, ParamValue>): Traced<GratuityResult>`.

Pack parameters (key: value, status, source id):
`minServiceYears: 1 official LAW_33_2021`;
`tier1DaysPerYear: 21 official LAW_33_2021`; `tier1Years: 5 official
LAW_33_2021`; `tier2DaysPerYear: 30 official LAW_33_2021`;
`capYearsOfWage: 2 official LAW_33_2021`;
`capBase: "basic" secondary X0PA_EOSB_CALC` (the law says "two years' wage";
whether that is basic or total wage is not settled in the fetched text);
`unpaidDaysExcluded: true official UAE_GOV_EOSB`;
`basicWageOnly: true official LAW_33_2021` (Article 51: last basic wage);
`leavePayBase: "basic" official UAE_GOV_LEAVES`;
`dailyWageDivisor: 30 secondary ARABIAN_BUSINESS_EOSB`;
`partYearProRata: true secondary ARABIAN_BUSINESS_EOSB`;
`monthsPerYear: 12 convention ENGINE_CONVENTION`;
`yearDayCount: 365 convention ENGINE_CONVENTION` (denominator for the
leftover days of a part year);
`endDateInclusive: true convention ENGINE_CONVENTION`;
`roundingMode: "HALF_UP" convention ENGINE_CONVENTION`;
`gccNationalGratuity: null unsourced` (no fetched source for GCC nationals).

Calculation (by calendar anniversary, not by dividing days): the exclusive
end is `lastWorkingDate` plus one day when `endDateInclusive`, then moved
back by `unpaidLeaveDays`. Completed years are the most whole anniversaries
of `joiningDate` that are not after the exclusive end. Leftover days are the
exclusive end minus the last anniversary. Eligible when completed years are
at least `minServiceYears`. Years owed as a fraction: completed years plus
leftover days over `yearDayCount` when `partYearProRata`, else completed
years. Days owed: `tier1DaysPerYear` times years up to `tier1Years`, plus
`tier2DaysPerYear` times years beyond. Amount: basic monthly over
`dailyWageDivisor` times days owed, kept as one fraction and rounded once at
the end. Cap: basic monthly times `monthsPerYear` times `capYearsOfWage`.
`uae-national` returns `eligible: false`, zero and a reason naming the
pension legislation. `gcc-national` throws `UNSOURCED_PARAM` for key
`gccNationalGratuity`. Trace line ids: `service.days`, `service.years`,
`gratuity.tier1`, `gratuity.tier2`, `gratuity.cap`, `gratuity.total`.

- [ ] **Step 1: Write failing tests (dates):** `parseIsoDate("2024-02-29")`
  ok; `"2023-02-29"`, `"2024-02-30"`, `"2024-2-3"`, `""` throw
  `INVALID_DATE`; `daysBetween("2024-02-28", "2024-03-01")` is `2`;
  `anniversary("2024-02-29", 1)` is `"2025-02-28"`; `anniversary(
  "2024-02-29", 4)` is `"2028-02-29"`.
- [ ] **Step 2: Write failing tests (gratuity)**, basic AED 10,000 unless
  stated, `expat-full-time`, no unpaid days unless stated:
  joining `2019-01-01`, last `2023-12-31`: five years, amount `3500000n`
  (AED 35,000, the sourced example, with the 2020 leap day); joining
  `2017-01-01`, last `2023-12-31`: seven years, `5500000n`; boundary:
  joining `2023-03-01`, last `2024-02-29` is eligible with `700000n`, last
  `2024-02-28` is not eligible with `0n`; leap-day joiner: joining
  `2024-02-29`, last `2025-02-27` is eligible (convention, trace shows it);
  part year (secondary): joining `2022-01-01`, last `2024-07-01` gives
  `1750959n` (two years plus 183 of 365 days); cap: joining `1990-01-01`,
  last `2019-12-31` gives `24000000n` and trace `gratuity.cap` states the
  cap applied; unpaid leave crossing the threshold: joining `2023-03-01`,
  last `2024-03-10`, 20 unpaid days is not eligible; `uae-national` is
  not eligible with a pension reason and a trace; `gcc-national` throws
  `UNSOURCED_PARAM` (`detail.key` `gccNationalGratuity`); Review Focus 1 to
  4 and 7: last before joining throws `INVALID_DATE_RANGE`; same day is not
  eligible with `0n` and no crash; unpaid days greater than total days throw
  `INVALID_UNPAID_DAYS`; `"2024-02-30"` throws `INVALID_DATE`; basic `0` or
  negative throws `INVALID_AMOUNT`; `overrides` `{ dailyWageDivisor: 365 }`
  changes the amount and the trace rule shows `overridden: true`; the same
  input twice returns deep-equal results. Property tests: for a fixed basic
  and unpaid days, amount never decreases as `lastWorkingDate` moves later,
  and never exceeds the cap.
- [ ] **Step 3: Run** `pnpm test dates gratuity` and expect FAIL.
- [ ] **Step 4: Implement** `dates.ts`, the pack as data (each param with its
  `sourceOf(id)`), and `calculateGratuity` with one rounding at the end.
- [ ] **Step 5: Run** `pnpm test dates gratuity` and `pnpm check`; expect
  PASS.
- [ ] **Step 6: Commit** `feat(engine): gratuity rule-pack and calculation`.

### Task 6: Settlement (demo item 1)

**Files:**
- Create: `packages/engine/src/settlement.ts`
- Test: `packages/engine/tests/settlement.test.ts`

**Interfaces:**
- Consumes: `calculateGratuity`, `GratuityInput` (Task 5); `Fils`, `mulDiv`,
  `add` (Task 2); `TraceBuilder` (Task 4); `requireParam`, `selectPack`,
  `GRATUITY_PACKS`.
- Produces (exact):
  `interface SettlementInput { gratuity: GratuityInput;
  unusedLeaveDays: number }`;
  `interface SettlementResult { gratuity: Fils; leavePay: Fils; total: Fils;
  notComputed: string[] }`;
  `calculateSettlement(input: SettlementInput, packs: RulePack[],
  overrides?: Record<string, ParamValue>): Traced<SettlementResult>`.

Leave pay = `gratuity.lastBasicMonthly` over `dailyWageDivisor` times
`unusedLeaveDays`, rounded once; the base is basic salary (`leavePayBase`,
official, u.ae). `notComputed` always lists `"notice pay"`, `"deductions"`,
`"other dues"` because they have no sourced rule yet; they are never guessed.

- [ ] **Step 1: Write failing tests:** the Task 5 five-year case (basic
  AED 10,000) with 10 unused days gives `leavePay` `333333n` and `total`
  `3833333n`; `notComputed` equals the three strings; negative unused days
  throw `INVALID_LEAVE_DAYS`; the trace contains `gratuity.total`,
  `leave.pay` and `settlement.total` in that order; for a national, gratuity
  is zero but leave pay is still computed.
- [ ] **Step 2: Run** `pnpm test settlement` and expect FAIL.
- [ ] **Step 3: Implement** `calculateSettlement`, merging the gratuity trace.
- [ ] **Step 4: Run** `pnpm test settlement` and `pnpm check`; expect PASS.
- [ ] **Step 5: Commit** `feat(engine): final settlement with leave pay`.

### Task 7: Rule-change preview (demo item 2)

**Files:**
- Create: `packages/engine/src/preview.ts`
- Test: `packages/engine/tests/preview.test.ts`

**Interfaces:**
- Consumes: `calculateSettlement`, `SettlementInput`, `SettlementResult`
  (Task 6); `RulePack`, `ParamValue` (Task 1); `Traced`, `Fils`.
- Produces (exact):
  `interface RuleChange { packId: string; key: string; newValue: ParamValue }`;
  `interface RulePreview { hypothetical: true; before: Traced<SettlementResult>;
  after: Traced<SettlementResult>; delta: Fils }`;
  `previewRuleChange(input: SettlementInput, packs: RulePack[],
  change: RuleChange): RulePreview`.

The change is applied to a deep copy of the pack with status `hypothetical`
and source `HYPOTHETICAL`; the original packs are never mutated.

- [ ] **Step 1: Write failing tests:** changing `tier1DaysPerYear` from 21
  to 22 on the five-year AED 10,000 case gives `delta` `166667n`
  (10,000 over 30 times 5 days, rounded); `hypothetical` is `true`; the
  original `GRATUITY_PACKS` still holds 21 afterwards; an unknown pack id
  throws `MISSING_PACK`; an unknown key throws `MISSING_PARAM`; the
  after-trace rule shows `status: "hypothetical"`.
- [ ] **Step 2: Run** `pnpm test preview` and expect FAIL.
- [ ] **Step 3: Implement** `previewRuleChange`.
- [ ] **Step 4: Run** `pnpm test preview` and `pnpm check`; expect PASS.
- [ ] **Step 5: Commit** `feat(engine): hypothetical rule-change preview`.

### Task 8: Explanation in English and Arabic (demo item 3)

**Files:**
- Create: `packages/engine/src/explain/catalog.ts`,
  `packages/engine/src/explain/explain.ts`
- Test: `packages/engine/tests/explain.test.ts`

**Interfaces:**
- Consumes: `TraceLine` (Task 4).
- Produces (exact): `type Lang = "en" | "ar"`;
  `MESSAGES: Record<Lang, Record<string, string>>` keyed by trace line id
  (`service.days`, `service.years`, `gratuity.tier1`, `gratuity.tier2`,
  `gratuity.cap`, `gratuity.total`, `leave.pay`, `settlement.total`) with
  `{result}` and `{rules}` placeholders;
  `explainTrace(trace: TraceLine[], lang: Lang): string` (one line per trace
  line; an id with no message falls back to the line's own `label` and a
  marker `[untranslated]`; every line ends with the rule status words, for
  example `official`, `secondary`, `convention`).

Arabic strings are authored by Claude and must carry a code comment
`NEEDS NATIVE REVIEW` until a native speaker confirms them.

- [ ] **Step 1: Write failing tests:** for a trace from the five-year case,
  `explainTrace(trace, "en")` contains `35,000` and the word `official`;
  `explainTrace(trace, "ar")` contains the same digits and is not equal to
  the English output; every id produced by Tasks 5 and 6 has a message in
  both languages (iterate the ids and assert); an unknown id yields
  `[untranslated]`.
- [ ] **Step 2: Run** `pnpm test explain` and expect FAIL.
- [ ] **Step 3: Implement** the catalog and `explainTrace`.
- [ ] **Step 4: Run** `pnpm test explain` and `pnpm check`; expect PASS.
- [ ] **Step 5: Commit** `feat(engine): payslip explanation en and ar`.

### Task 9: Case library and runner (UQ4 seed)

**Files:**
- Create: `packages/engine/src/cases/schema.ts`,
  `packages/engine/src/cases/runner.ts`,
  `packages/engine/cases/gratuity/*.json` (at least 8 case files)
- Test: `packages/engine/tests/cases.test.ts`

**Interfaces:**
- Consumes: `calculateGratuity`, `GratuityInput` (Task 5), `Fils`.
- Produces (exact):
  `CaseFileSchema` (zod) for
  `{ id: string; title: string; input: { joiningDate: string;
  lastWorkingDate: string; unpaidLeaveDays: number;
  lastBasicMonthly: string; workerClass: string };
  expectedFils: string; sourceId: string;
  status: "official" | "secondary" }`;
  `interface CaseReport { id: string; passed: boolean; expected: string;
  actual: string; trace: TraceLine[] }`;
  `runCases(dir: string): Promise<CaseReport[]>` (reads every `*.json` under
  `dir`, validates with zod, runs `calculateGratuity`, never throws for a
  failing case, throws `INVALID_CASE_FILE` for a malformed file).

Cases (each cites a source id from the registry): five years
(AED 35,000, `secondary` with the Arabian Business source), seven years
(AED 55,000), exactly one year, 364 days (zero), unpaid leave crossing the
one-year threshold, the two-year cap, a national (not applicable), a
leap-year boundary. Where a value is derived by arithmetic from the official
rule, `status` is `official`; where it comes from the press example, it is
`secondary`.

- [ ] **Step 1: Write failing tests:** `runCases` over the library returns
  all `passed: true`; a temporary malformed file makes it throw
  `INVALID_CASE_FILE`; a temporary case with a wrong `expectedFils` returns
  `passed: false` with a non-empty `trace`.
- [ ] **Step 2: Run** `pnpm test cases` and expect FAIL.
- [ ] **Step 3: Implement** the schema, runner and the case files.
- [ ] **Step 4: Run** `pnpm test cases` and `pnpm check`; expect PASS.
- [ ] **Step 5: Commit** `feat(engine): sourced case library and runner`.

### Task 10: Demo command and handover

**Files:**
- Create: `packages/engine/src/cli.ts`, `packages/engine/src/index.ts`,
  `packages/engine/samples/settlement.json`
- Modify: root `package.json` (script `demo`), `HANDOVER.md`, `LEDGER.md`
- Test: `packages/engine/tests/cli.test.ts`

**Interfaces:**
- Consumes: everything above.
- Produces: `pnpm demo` runs
  `tsx packages/engine/src/cli.ts packages/engine/samples/settlement.json`
  with a sample that includes `unusedLeaveDays` and options `--lang en|ar` (default `en`) and
  `--change <packId>:<key>=<value>` (optional). Output: the settlement
  total, the explained trace in the chosen language, the list of
  `notComputed` items, and when `--change` is given, a clearly labelled
  `HYPOTHETICAL` before and after and the delta. Exit code 1 and a stable
  error code on bad input.

- [ ] **Step 1: Write failing tests:** run the CLI function (exported as
  `runCli(args: string[]): { code: number; out: string }`) with the sample:
  output contains `AED 35,000.00` and `notice pay`; with `--lang ar` it
  differs; with `--change ae-gratuity:tier1DaysPerYear=22` the output
  contains `HYPOTHETICAL` and the delta; a missing file returns code 1 with
  `INVALID_INPUT_FILE`.
- [ ] **Step 2: Run** `pnpm test cli` and expect FAIL.
- [ ] **Step 3: Implement** `cli.ts`, the sample file and `index.ts`.
- [ ] **Step 4: Run** `pnpm check` and `pnpm demo`; expect green and printed
  output. Run `pnpm demo -- --lang ar`.
- [ ] **Step 5: Update** `HANDOVER.md` (state, how to run, what is not
  computed) and add a `LEDGER.md` entry for Plan 1 completion; commit
  `feat(engine): demo command and handover`.

---

## Execution notes

- Parallel groups: Tasks 2, 3, 4 (after Task 1); then Task 5; then Tasks 6
  and 9; then Tasks 7 and 8; then Task 10.
- **Each parallel task runs in its own git worktree** on its own branch and
  is merged into the working branch one at a time, running `pnpm check`
  after each merge. A shared tree lets one task's half-written file break
  another's checks.
- Stop at the demo; report the test and demo output exactly as printed.

## Self-review notes

- Spec coverage: UQ1 (Task 8), UQ4 seed (Task 9), UQ5 (Task 7), UQ6
  settlement (Task 6), UQ12 gratuity part (Task 5). Not in Plan 1: payroll
  run, WPS file, anything needing data storage.
- Types: shared types and the source registry are defined once (Task 1) and
  reused unchanged.
- Service length is counted by calendar anniversary so the sourced example
  (five years across a leap day) yields exactly AED 35,000.
