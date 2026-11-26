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
- **Plan 2 (WPS SIF generator and validator) is built**, one task at a
  time with a review after each. `packages/wps` writes a salary
  information file (SIF) from a batch and checks any SIF file, with a
  plain-English report. Format only: it pays nobody and claims no
  compliance.
- **Plan 3 (backend) is built** on a worktree branch (Tasks 1 to 8 plus
  the security review's fixes), not yet merged into
  `claude/quirky-wozniak-b7xkvr`. `packages/contract` (zod schemas, 50
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
test suite runs when `DATABASE_URL` points at a superuser (it creates
`plan3_owner` and `plan3_runtime` and a schema per case):

```bash
DATABASE_URL=postgres://postgres@127.0.0.1:55433/postgres \
  pnpm --filter @payroll/api exec vitest run tests/pg.integration.test.ts
```

`sif` reads a batch JSON (amounts as strings such as `"4000.00"`), writes
the `.SIF` file into `--out` (default `out/`, ignored by git) and prints
the report. It writes nothing when the batch is invalid, generation fails
or the generated file has an error. `sif:check` validates any SIF file.
Both exit 1 on any error and 0 otherwise (warnings alone give 0). `today`
for the future-date check is `--today`, else the machine's local date;
only the shell reads the clock. The sample reproduces the DIB guide
sample and gives one warning (its account fails the IBAN check).

## Engine layout (`packages/engine`)

| Area | Files |
|---|---|
| Money in integer fils | `src/money.ts` |
| Dates by calendar anniversary | `src/dates.ts`, `src/service.ts` |
| Rule-packs (versioned, sourced) | `src/rules/`, `src/sources.ts` |
| Gratuity and settlement | `src/gratuity*.ts`, `src/settlement.ts` |
| Rule-change preview | `src/preview.ts` |
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
| Database, migrations, tenancy | `src/db/`, `migrations/001` to `008` |
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
- The routing code table has six banks and is old (2016 era), so real
  files often get a `ROUTING_UNKNOWN` warning.
- Amounts are inputs: no monthly pay run exists yet. One currency, AED.
- "EVP parts add up to variable pay" is inferred, so it is a warning.
- The generator writes the SCR count as `1`; the DIB sample shows `01`.
- Finding codes added beyond the plan: `AMOUNT_FORMAT`, `COUNT_FORMAT`,
  `CURRENCY`, `PAY_START_TOO_EARLY`, `FIELD_TOO_LONG`, `ROUTING_UNKNOWN`.
- Deferred minors and the reviewer rulings are in `LEDGER.md` (section 3).

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

Review Plan 3 (whole branch, plus Tasks 5 and 7 for data protection and
money), merge it into `claude/quirky-wozniak-b7xkvr`, then finish Plan 4
(web app) against `packages/contract`. The owner wants no technical
questions: decide, record a ruling, continue.

## Tooling (25 Nov 2026)

Node 22, pnpm 10, TypeScript 7.0.2, Vitest 5.1.2, fast-check 4.11.0,
zod 4.6.7, tsx 4.23.15, `@types/node` 22.x. Versions are pinned exactly.
Plan 3 adds Hono 4.13.17, @hono/node-server 2.1.6, pg 8.23.1,
@types/pg 8.23.1 and @electric-sql/pglite 0.5.16 (tests).
