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
rule version" is a non-goal; section 6 rule-packs). Rule sources:
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
