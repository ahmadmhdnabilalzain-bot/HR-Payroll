# Handover

Read this first. Keep it current: update it in the same commit as any change
of state. Last updated: 2026-11-26 (Plan 3).

## What this project is

An HR and payroll product for UAE SMEs (about 10 to 250 employees, mainland
first), growing later into adjacent modules and finance modules. Insurance is
out of scope. The edge: payroll that is correct, explainable and
source-cited, with an open API and Arabic from the start.

## Current state

- Research, design v2 and the master feature list (38 unique items plus
  parity) are approved by the owner.
- **Plan 1 (payroll engine) is built, reviewed and pushed.** A pure
  TypeScript engine computes a UAE end-of-service settlement with a per-line
  trace and source-cited rule-packs. A whole-branch review found no
  calculation errors; one fix wave addressed its honesty and packaging
  findings.
- **Plan 2 (WPS SIF generator and validator) is built and its final
  review is done**, one task at a time. Tasks 1 to 5 each had a task
  review; Task 6 (the CLI) did not, by the speed ruling, and the
  whole-branch review covered it. `packages/wps` writes a salary
  information file (SIF) from a batch and checks any SIF file, with a
  plain-English report. Format only: it pays nobody and claims no
  compliance.
- **Plan 5 (monthly payroll) is built** on a worktree branch, test-first,
  one commit per task (`docs/superpowers/plans/plan-5-build-report.md`).
  `calculatePayslip` computes one month's payslip in the pure engine:
  calendar-day proration, sick and maternity pay steps, overtime,
  rest-day and holiday work, in-service leave encashment, Article 25
  deduction caps and loans, and GPSSA contributions for UAE nationals,
  every money field traced to a rule-pack param. `payslipToSifEmployee`
  in `packages/wps` turns a payslip into a SIF EDR and EVP. The plan's
  per-task reviews (Tasks 3 to 7 and 9) were not run by the builder. The
  whole-branch money and law review found nothing Critical (READY AFTER
  FIXES); its Important findings and most Minor ones are fixed (LEDGER
  section 10, Rulings B7 to B13). Open: review items M1, M5, M10, M11.
- **Plan 3 (backend) is built and merged** into
  `claude/quirky-wozniak-b7xkvr` (merge `08ec440`); the fixes for the
  money review (Task 7) and the data-protection review (Tasks 5 and 6)
  are on the worktree branch, not yet merged. `packages/contract` (zod schemas, 50
  routes, error codes, OpenAPI) and `packages/api` (Hono over
  PostgreSQL with row-level security, sealed salary and bank fields,
  hash-chained audit log, pay runs, payslips and SIF files).
  Build report: `docs/superpowers/plans/plan-3-build-report-1.md`.
- Branch: `claude/quirky-wozniak-b7xkvr`. No pull request.

## Run it

```bash
pnpm install
pnpm check          # line length, typecheck, tests
pnpm demo           # sample settlement, English
pnpm demo -- --lang ar
pnpm demo -- --change ae-gratuity:tier1DaysPerYear=22
```

The demo prints a computed total (gratuity plus unused leave pay), the
explained trace, and what is **not computed** (notice pay, deductions, other
dues: no sourced rule yet). The `--change` option shows a clearly labelled
HYPOTHETICAL before and after.

```bash
pnpm sif -- packages/wps/samples/batch.json --out out
pnpm sif:check -- out/0000000123456160126113000.SIF
pnpm sif:check -- <file.SIF> --today 2026-11-26
```

```bash
pnpm --filter @payroll/contract openapi    # writes dist/openapi.json
pnpm api:migrate                           # migrations only
pnpm api:dev                               # migrate, then serve
```

`api:dev` reads `DATABASE_URL` (the runtime role: no superuser, no
BYPASSRLS, owns no table, granted `payroll_app WITH INHERIT FALSE, SET
TRUE`), `MIGRATE_DATABASE_URL` (the role that owns the tables; defaults
to `DATABASE_URL`), `PAYROLL_MASTER_KEY` (32 bytes, base64) and `PORT`
(default 8787). It refuses to start with a bad key or an unsafe runtime
role. Checked on 2026-11-26 against a throwaway PostgreSQL 16 (health,
signup, the superuser and table-owner refusals). The real-PostgreSQL
test suite (it creates `plan3_owner` and `plan3_runtime` and a schema
per case) runs inside `pnpm check` whenever a PostgreSQL server binary
is installed under `/usr/lib/postgresql/<version>/bin`: a Vitest global
setup (`packages/api/tests/global-pg.ts`) starts a throwaway cluster in
a temp dir on a free port (as the `postgres` user when run as root),
points `DATABASE_URL` at it, and stops and deletes it afterwards. With
no binary it prints one line and skips. `PAYROLL_TEST_PG=0` turns it
off; an existing superuser URL can be given instead:

```bash
DATABASE_URL=postgres://postgres@127.0.0.1:55433/postgres \
  pnpm --filter @payroll/api exec vitest run tests/pg.integration.test.ts
```

`sif` reads a batch JSON (amounts as strings such as `"4000.00"`), writes
the `.SIF` file into `--out` (default `out/`, ignored by git) and prints
the report. It writes nothing when the batch is invalid, generation fails
or the generated file has an error. `sif:check` validates any SIF file.
Both exit 1 on any error and 0 otherwise (warnings alone give 0). Both
take `--today YYYY-MM-DD` for the future-date check; without it the shell
uses today's date in Dubai (Asia/Dubai), whatever the machine's time
zone. Only the shell reads the clock. The sample reproduces the DIB guide
sample and gives one warning (its account fails the IBAN check).

## Engine layout (`packages/engine`)

| Area | Files |
|---|---|
| Money in integer fils | `src/money.ts` |
| Dates by calendar anniversary | `src/dates.ts`, `src/service.ts` |
| Rule-packs (versioned, sourced) | `src/rules/`, `src/sources.ts` |
| Gratuity and settlement | `src/gratuity*.ts`, `src/settlement.ts` |
| Rule-change preview | `src/preview.ts` |
| Monthly payslip | `src/payroll/`, `src/rules/payroll-pack.ts`, `src/rules/gpssa-pack.ts` |
| Payslip case library (I/O shell) | `src/cases/payroll-*.ts`, `cases/payroll/*.json` |
| Explanation in English and Arabic | `src/explain/` |
| Case library and runner (I/O shell) | `src/cases/`, `cases/gratuity/*.json` |
| Demo command (I/O shell) | `src/cli.ts`, `src/main.ts` |

## WPS layout (`packages/wps`)

| Area | Files |
|---|---|
| Layout parameters (data only) | `src/layout.ts` |
| Field formats, EDR/EVP/SCR lines | `src/format.ts`, `src/records.ts` |
| Generator and file name | `src/generate.ts`, `src/filename.ts` |
| Parser and validator | `src/parse.ts`, `src/validate*.ts` |
| IBAN and routing codes | `src/iban.ts`, `src/routing-codes.ts` |
| Findings and report | `src/findings.ts`, `src/report.ts` |
| Demo command (I/O shell) | `src/cli*.ts`, `src/main.ts`, `src/shell.ts` |
| Batch file schema (zod, shell) | `src/batch-schema.ts` |
| Sample batch | `samples/batch.json` |
| Payslip to EDR and EVP | `src/from-payslip.ts` |

`@payroll/wps` is the pure barrel; `@payroll/wps/shell` holds the files,
clock and zod. A purity test keeps the core free of them, as in the
engine.

The pure engine core has no clock, file, network or environment access; a
test enforces it. Statutory values live only in rule-pack parameters, each
with a source id and a status: `official`, `secondary`, `convention`,
`hypothetical` or `unsourced`. An `unsourced` value has no default and the
engine refuses to run without an explicit value.

## Contract layout (`packages/contract`, zod only)

| Area | Files |
|---|---|
| Primitives, roles, errors | `src/primitives.ts`, `src/roles.ts`, `src/errors.ts` |
| Schemas by family | `src/company.ts`, `user.ts`, `department.ts`, `employee.ts`, `leave.ts`, `attendance.ts`, `trace.ts`, `payroll.ts`, `sif.ts`, `audit.ts`, `lists.ts` |
| Routes (50) | `src/route-def.ts`, `src/routes*.ts` |
| Registry, examples, OpenAPI | `src/registry.ts`, `src/examples*.ts`, `src/openapi.ts`, `src/write-openapi.ts` |

## API layout (`packages/api`)

| Area | Files |
|---|---|
| Database, migrations, tenancy | `src/db/`, `migrations/001` to `013` |
| HTTP plumbing (one transaction per request) | `src/app.ts`, `src/http/` |
| Sign-in, sessions, TOTP, guards | `src/auth/` |
| Field encryption | `src/crypto/keyring.ts` |
| Audit log (allowlisted data, hash chain) | `src/audit/` |
| People and redaction | `src/people/`, `src/routes/employees.ts`, `departments.ts` |
| Leave and attendance | `src/leave/`, `src/attendance/`, `src/time/dubai.ts` |
| Pay runs (pure compute), payslips, SIF | `src/payroll/` |
| Entry and config | `src/main.ts`, `src/config.ts`, `src/deps.ts` |

## Known limits and open questions

- Plan 3 limits: nothing on `NOT_COMPUTED_PAY` is computed (proration
  for partial months, overtime premiums, unpaid leave deductions,
  deductions and caps, GPSSA contributions, ILOE premiums, notice pay):
  partial months and unpaid leave need entered amounts. The final
  settlement is shown on the payslip but not paid through the SIF. No
  external pen test, no KMS or key rotation, no email verification
  (an invite can be accepted by whoever holds the token), anyone can
  lock an account for 15 minutes with five wrong passwords, no rate
  limiting, no pay-run corrections. Real payroll waits for the owner.
  The pay-run `input_hash` is an unkeyed hash over salary amounts and
  `pay_runs.gross` is in clear (make the hash an HMAC before real
  data). No warning yet when a leaver gets both a leave-encashment
  one-off and a settlement.

- The gratuity pack applies to leavers on or after 2022-02-02 (Decree-Law 33
  of 2021). Earlier leavers throw `NO_PACK_FOR_DATE` (old law not modelled).
  Open question for counsel: service accrued before that date for people
  leaving after it.
- Not computed: notice pay, deductions, other dues, GCC nationals
  (`UNSOURCED_PARAM`), UAE nationals (pension law: reported as not
  applicable).
- Part-year pro-rata and the 30-day daily-wage divisor are `secondary`;
  the one-day-early pro-rata in a 366-day anniversary span needs counsel.
- Arabic wording is marked `NEEDS NATIVE REVIEW`; plural forms are fixed.
  Nothing shows Arabic text to employees until a native speaker reviews it.
- The primary text of Ministerial Resolution 340 of 2026 (WPS) is unread.
  The SIF layout is sourced from two bank guides
  (`docs/research/2026-11-25-wps-sif-layout.md`), not the central bank spec.
- WPS limits: the layout is confirmed only by two bank guides (DIB,
  Emirates Islamic), not by MOHRE or a bank test upload. The Emirates
  Islamic test sample is reconstructed from the guide's description.
- Ids must be exactly 14 digits (person) and 13 (employer), zero-padded;
  the DIB guide allows 14 to 35 and 13 to 35. A layout can change this.
- The routing code table has six banks and is old (undated; the guide
  sample is from 2009), so real files often get a `ROUTING_UNKNOWN`
  warning.
- SIF batch amounts are inputs; `payslipToSifEmployee` can build one
  employee's EDR and EVP from a payslip, but no pay run stores or batches
  payslips yet. One currency, AED.
- "EVP parts add up to variable pay" is inferred, so it is a warning.
- The generator writes the SCR count as `1`; the DIB sample shows `01`
  and the Emirates Islamic sample `1`. Ruling: keep `1` (see `LEDGER.md`
  section 9). The first bank test upload should confirm it.
- The generator refuses variable pay without an EVP line (EVP_REQUIRED)
  and a pay end before pay start (PAY_END_BEFORE_START).
- Finding codes added beyond the plan: `AMOUNT_FORMAT`, `COUNT_FORMAT`,
  `CURRENCY`, `PAY_START_TOO_EARLY`, `FIELD_TOO_LONG`, `ROUTING_UNKNOWN`.
- Deferred minors and the reviewer rulings are in `LEDGER.md` (section 3).
- Payslip (Plan 5): **every UAE national's payslip throws
  `UNSOURCED_PARAM` until the caller passes the
  `gpssaContributionSalaryBase` override** (`basic` or `wage`); the
  payslip then flags `OVERRIDE_USED`. GCC nationals are refused. The
  GPSSA regime (DL57 or Law 7) is an input, never inferred.
- Payslip rulings that move money (`LEDGER.md`, "Rulings made during the
  Plan 5 build"): calendar-day proration; sick and maternity "full pay"
  read as the wage; overtime hourly rate = basic / 30 / contract hours;
  rest-day and holiday work paid as an extra day's wage plus 50% of
  basic (the premium-only reading is an override); GPSSA not prorated
  and Law 7 skips a partial last month; deduction caps on the earned
  wage, rounded down; violation cap is the stricter of 5% and five
  days; when the 50% cap binds the order is GPSSA, court debt,
  overpayment, violation, damage, scheme, loan, and the rest is
  deferred; the GPSSA share can be deferred; WPS fixed is the earned
  basic after deductions.
- Payslip not computed (listed on every payslip): income tax, ILOE,
  exit pay (see `calculateSettlement`), bonuses, GPSSA unpaid-leave
  reduction and late additions, the 144-hour three-week limit, Ramadan
  hours, alimony ranking, the 3-month sanction limit, the WPS 85% test,
  other paid leave. The first payroll month is March 2022 and the first
  month for nationals November 2023 (`NO_PACK_FOR_DATE` before).

## Where things are

| Need | File |
|---|---|
| Owner decisions, instructions, future plan | `LEDGER.md` |
| Master feature list (gate to every plan) | `docs/superpowers/specs/2026-11-25-master-feature-list.md` |
| Approved design | `docs/superpowers/specs/2026-11-25-uae-sme-hr-payroll-design.md` |
| Advisor's proof, unique-ideas pool, combined feature list | `docs/superpowers/specs/` |
| Market research and feasibility notes | `docs/research/` |
| Code and debugging standards | `docs/engineering-standards.md` |
| Implementation plans | `docs/superpowers/plans/` |

Feasibility notes in `docs/research/`: competitors, social media APIs,
website insights, documents module, VAT, corporate tax and e-invoicing,
in-app meetings, remote-work tracking. All research is snippet-level and
needs checking against official sources before anything is built on it.

## Next step

Plan 5: merge the review-fix commits of the worktree branch. Plan 3: data model, API, tenancy and
security baseline (`LEDGER.md` section 4). The Plan 2 whole-branch review and its fix round are done.
Write the plan, build it test-first, keep this handover current. Plan 3
gets one whole-branch review at the end, plus separate reviews of the
money, security and tenancy tasks (speed ruling, `LEDGER.md`). The owner
wants no technical questions: decide, record a ruling, continue.
Review Plan 3 (whole branch, plus Tasks 5 and 7 for data protection and
money), merge it into `claude/quirky-wozniak-b7xkvr`, then finish Plan 4
(web app) against `packages/contract`. The owner wants no technical
questions: decide, record a ruling, continue.

## Tooling (25 Nov 2026)

Node 22, pnpm 10, TypeScript 7.0.2, Vitest 5.1.2, fast-check 4.11.0,
zod 4.6.7, tsx 4.23.15, `@types/node` 22.x. Versions are pinned exactly.
Plan 3 adds Hono 4.13.17, @hono/node-server 2.1.6, pg 8.23.1,
@types/pg 8.23.1 and @electric-sql/pglite 0.5.16 (tests).
