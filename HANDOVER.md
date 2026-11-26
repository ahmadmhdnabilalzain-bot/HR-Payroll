# Handover

Read this first. Keep it current: update it in the same commit as any change
of state. Last updated: 2026-11-26 (overnight autonomous build).

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
- **Plan 3 (backend) is built and merged** into this branch:
  `packages/contract` (zod schemas, 50 routes, error codes, OpenAPI) and
  `packages/api` (Hono over PostgreSQL with row-level security, sealed
  salary and bank fields, hash-chained audit log, pay runs, payslips and
  SIF files). Two independent reviews (security, money) found no Critical
  items; their fixes are being applied (see the table below).
  Report: `docs/superpowers/plans/plan-3-build-report-1.md`.
- **Engine parts of Plans 7, 8, 9, 11 and 12 are built and merged**
  (employment and Emiratisation packs, time and leave logic, deadlines
  and payslip preview, VAT, corporate tax and e-invoicing packs).
- **The web app is paused on purpose.** The owner wants an advanced,
  non-standard interface (no sidebar, motion, light and dark). Three
  concepts are published as artifacts for the owner to pick:
  A Command, B Orbit, C Pipeline (links in the owner's chat; sources in
  the session scratchpad, not in the repo). The web groundwork
  (`apps/web`: contract adapter, mock API, typed Arabic and English text)
  is merged; no screens yet.
- All 17 plans are written (`docs/superpowers/plans/`).
- **Plan 3 (backend) is built and merged** into
  `claude/quirky-wozniak-b7xkvr` (merge `08ec440`); the fixes for the
  money review (Task 7) and the data-protection review (Tasks 5 and 6)
  are on the worktree branch, not yet merged. `packages/contract` (zod schemas, 50
  routes, error codes, OpenAPI) and `packages/api` (Hono over
  PostgreSQL with row-level security, sealed salary and bank fields,
  hash-chained audit log, pay runs, payslips and SIF files).
  Build report: `docs/superpowers/plans/plan-3-build-report-1.md`.
- **Plan 9 API (time, attendance, leave policies, work-from-home) is
  built and merged** (commit a038a5e; review fixes C1, I1-I5 applied;
  a scoped re-review is running; minors M4-M13 are listed in
  `plan-9-build-report.md`; engine parts merged earlier). 66 routes
  in `TIME_ROUTES`, migrations 901 to 908, the `@payroll/time-client`
  package (sampler, indicator model, desktop agent interface).
  Work-from-home tracking is exactly the owner's decision: no
  screenshots, no keystroke logging (no route, column, setting or
  capability), location once an hour, category-level activity, the
  employee sees and pauses own data, consent after notice. Build
  report: `docs/superpowers/plans/plan-9-build-report.md`. The
  per-task reviews of Tasks 6, 9 and 10 and the whole-branch review
  have not been run yet.
- **Plan 8 (hiring, onboarding, task manager, the one exit flow) is
  built** on worktree branch `api-plan-8`, not merged (Task 1, the
  engine `ae-employment` pack, was already merged). 45 HR routes in
  `HR_ROUTES` (95 in all): task manager, requisitions, candidates,
  applications, scorecards, interviews, offers with owner MFA
  approval, offer to hire with onboarding tasks and engine probation
  dates, the exit flow (engine notice, clearance tasks, final
  settlement from `calculateSettlement` with its not-computed list and a
  flag-only list that is never deducted, document and access hooks,
  close) and goals. Build report:
  `docs/superpowers/plans/plan-8-build-report.md`.
- **Plan 6 (expenses and claims) is built** on worktree branch
  `api-plan-6` (not pushed, not merged), extending `packages/contract`
  (now 75 routes) and `packages/api`: a shared approval spine (chains
  of amount tiers, maker-checker, distinct approvers per tier),
  receipts (sniffed, encrypted, attachment-only downloads, OCR port),
  expense categories and a versioned policy (limits per role, dated
  mileage and per diem rates with no defaults), claims with revisions,
  reimbursement of approved claims through the next pay run (outside
  gross and the SIF, inside net), and owner/hr reports with CSV.
  Build report: `docs/superpowers/plans/plan-6-build-report.md`.
  Tasks 2, 3 and 6 (approvals, untrusted files, money) await their
  security review.
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
to `DATABASE_URL`), `PAYROLL_MASTER_KEY` (32 bytes, base64), `PORT`
(default 8787) and `RECEIPTS_DIR` (required: the directory for
encrypted receipt files; Plan 6). It refuses to start with a bad key or an unsafe runtime
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
| Routes (50 core + 45 HR) | `src/route-def.ts`, `src/routes*.ts` (`routes-hr.ts` joins Plan 8's) |
| Plan 8 schemas | `src/tasks.ts`, `hiring.ts`, `offers.ts`, `onboarding.ts`, `exits.ts`, `goals.ts`, `errors-hr.ts`, `registry-hr.ts`, `examples-hr.ts` |
| Routes (75; Plan 6's 25 in `routes-expenses.ts`) | `src/route-def.ts`, `src/routes*.ts` |
| Plan 6 schemas | `src/approvals.ts`, `receipts.ts`, `expense-policy.ts`, `expenses.ts`, `expense-reports.ts`, `registry-expenses.ts`, `examples-expenses.ts` |
| Registry, examples, OpenAPI | `src/registry.ts`, `src/examples*.ts`, `src/openapi.ts`, `src/write-openapi.ts` |

## API layout (`packages/api`)

| Area | Files |
|---|---|
| Database, migrations, tenancy | `src/db/`, `migrations/001` to `013`, `601` to `604` (Plan 6) |
| HTTP plumbing (one transaction per request) | `src/app.ts`, `src/http/` |
| Sign-in, sessions, TOTP, guards | `src/auth/` |
| Field encryption | `src/crypto/keyring.ts` |
| Audit log (allowlisted data, hash chain) | `src/audit/` |
| People and redaction | `src/people/`, `src/routes/employees.ts`, `departments.ts` |
| Leave and attendance | `src/leave/`, `src/attendance/`, `src/time/dubai.ts` |
| Pay runs (pure compute), payslips, SIF | `src/payroll/` |
| Entry and config | `src/main.ts`, `src/config.ts`, `src/deps.ts` |
| Plan 9 time: settings, calendar, rosters, swaps, clock, corrections, timesheets, pay inputs, calendar, flags | `src/time/`, `src/routes/time-*.ts`, `migrations/901` to `906` |
| Plan 9 leave policies, half days, blackouts, carry-over | `src/leave/policy*.ts`, `preview.ts`, `carry-over.ts` |
| Plan 9 work-from-home (consent, pause, uploads, views, retention) | `src/wfh/`, `src/routes/wfh*.ts`, `src/db/wfh-purge-all.ts`, `migrations/907`, `908` |
| Phone and browser tracking client (pure, ports) | `packages/time-client` |
| Plan 8: tasks, approvals, ports | `src/tasks/`, `src/approvals/decide.ts`, `src/ports/` (calendar, documents, access), `migrations/801` to `807` |
| Plan 8: hiring, onboarding, exits, goals | `src/hiring/`, `src/onboarding/`, `src/exits/`, `src/goals/`, `src/routes/hr.ts` |
| Plan 8 audit keys | `src/audit/hr-allowlist.ts`, `src/audit/hr-audit.ts` |
| Engine employment pack (Plan 8 Task 1) | `packages/engine/src/employment/`, `src/rules/employment-pack.ts` |
| Plan 6 wiring (one call from `app.ts`) | `src/expense-app.ts` |
| Approval spine (pure resolution, chains, requests, decisions) | `src/approvals/`, `src/routes/approvals.ts` |
| Receipt storage port (memory, local disk) | `src/storage/` |
| Receipts (sniffing, base64, OCR port, service) | `src/receipts/`, `src/routes/receipts.ts` |
| Expenses (pure policy, checks and reimbursement; claims, submit, reports) | `src/expenses/`, `src/routes/expense-*.ts`, `src/http/csv.ts` |
| Plan 13 channel platform, notifications, outbox | `src/channels/`, `src/channel-app.ts`, `migrations/1301` to `1303` |
| Plan 13 WhatsApp opt-in and approvals | `src/whatsapp/`, `migrations/1304` |
| Plan 13 email-in review inbox | `src/inbound/`, `migrations/1305` |
| Plan 13 calendar feeds | `src/calendar/`, `src/export/ics.ts`, `migrations/1306` |
| Plan 13 SSO (OIDC) | `src/sso/`, `migrations/1307` |
| Plan 13 webhooks | `src/webhooks/`, `migrations/1308` |
| Plan 13 API keys | `src/apikeys/`, `migrations/1309` |
| Background jobs (`tsx src/main.ts jobs`) | `src/jobs/jobs.ts` |
| Plan 7 files (encrypted, sniffed) | `src/files/`, `src/routes/files.ts`, `migrations/070` |
| Employee documents, alerts, retention | `src/documents/`, `migrations/071` |
| Company library and receipts | `src/library/`, `migrations/072` |
| Letter templates, merge, letters | `src/letters/`, `migrations/073`, `074` |
| PDF rendering (Chrome port) | `src/pdf/` (`pnpm letters:sample` writes `out/letters/`) |
| Emiratisation report | `src/emiratisation/`, `migrations/075` |

## Known limits and open questions

- Plan 13 (channels, branch `api-plan-13`): the ten features are
  notifications (in-app, email, WhatsApp), preferences and quiet
  hours, templates (Arabic NEEDS NATIVE REVIEW, never sent), WhatsApp
  approvals, email-in, calendar feeds, SSO (Google, Entra), webhooks,
  API keys and the developer surface (`/v1/openapi.json`,
  `/v1/developer/guide`). Every provider is `not-configured` until its
  environment group is complete: `POSTMARK_SERVER_TOKEN`, `EMAIL_FROM`;
  `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`,
  `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`,
  `WHATSAPP_GRAPH_VERSION`; `INBOUND_EMAIL_DOMAIN`,
  `INBOUND_EMAIL_BASIC_AUTH`; `GOOGLE_OIDC_CLIENT_ID`,
  `GOOGLE_OIDC_CLIENT_SECRET`; `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET`;
  plus `PUBLIC_API_BASE_URL` and `PUBLIC_APP_BASE_URL` (https).
  Limits: no scheduler runs `main.ts jobs`; no Meta business
  verification started; WhatsApp UAE prices and verification lead time
  unknown; Postmark inbound needs a paid plan; where inbound mail is
  stored was not verified; no malware scan; SAML and Okta not built;
  no TDRA position; provider wire formats are UNVERIFIED (one adapter
  file each). See `docs/superpowers/plans/plan-13-build-report.md`.

- Plan 6 limits: reimbursements are paid with the run but are **not in
  the WPS salary file** (whether they must be is not sourced; HR pays
  them by separate transfer from the payouts report). Input VAT is
  captured as entered and **recovery is never assessed** (FTA Decision
  17 of 2026 is known only from secondary summaries). OCR is an
  interface only (the default reader suggests nothing). No web screens
  yet (Plan 4 follow-up). The approval spine serves expense claims
  only; leave and pay runs keep Plan 3's own checks. A receipt blob is
  written before the transaction commits, so a failed request can
  leave an orphan encrypted file (never served).

- Plan 7 limits: no virus scan on uploads (type allowlist, attachment
  downloads, `nosniff` and a sandbox CSP only); letters need
  `CHROME_PATH` (else 503; as root also `CHROME_NO_SANDBOX=1`); no
  expiry or library notifications are sent; Arabic letters cannot be
  issued until an owner records a native review of each version (the
  starter Arabic copy is unreviewed); Emiratisation figures are
  secondary and the 2026 fine is unresolved; retention has no default
  and deletes nothing; unclaimed uploads and orphan blobs are not
  cleaned up; no web screens yet.

- Plan 9 limits: no web or phone screen shows the tracking indicator
  yet, so tracking cannot honestly run in production before a screen
  renders it; the desktop agent is an interface only; there is no
  scheduler (WFH retention runs on every `/v1/wfh/` call and by
  `pnpm api:purge-wfh`, which operations should run daily); the
  geofence and the indicator flag are evidence for review, not
  enforcement (the client supplies both); holidays and Ramadan dates are company
  entered (no built-in list); the PDPL executive regulations appear
  unissued; the notice wording needs counsel and Arabic needs a native
  review; background location on phones is an app-store review risk.
  The engine day-sheet fix in progress (break double-count, 8-hour
  limit on shift days) will change timesheet overtime numbers; the
  API consumes whatever the engine returns. `apps/web` typecheck was
  already red against the merged Plan 3 contract and is not fixed here.

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

- Plan 8 limits: no web screens; the calendar, document and external
  access ports are "not configured"; no scheduler (reminders and
  deadlines are dated tasks, overdue computed on read). The exit
  settlement never deducts loans, tickets, bonds, claims, cards or
  other deductions (flag-only list). Conventions, not law: notice runs
  from the day after notice; probation end = joining date + months,
  clamped, minus one day; the settlement due date counts 14 days from
  the last working date; exits without notice give zero days with a
  counsel flag (Articles 44 and 45 not modelled); agreed reductions
  only for resignation and termination. Joiners before 2022-02-02 can
  only get zero-month terms. Exit revocation finds logins linked to
  the employee record or with the employee's email; a login with
  another email and no link is not found (owners can link logins with
  `PATCH /v1/users/{id}/employee`). Rehiring creates a new employee
  record. Ruled out (Plan 8 Ruling 32): cost-of-hire, referral and
  agency ledgers, permit and visa deadlines, ticket, loan, bond and card
  balances, exit interview forms, candidate data retention, job posts,
  resume parsing, email resignations, notice during leave, job-search
  day tracking, the probation-once check, part-time workers.
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

## Program status (plans)

| Plan | Subject | State |
|---|---|---|
| 1, 2 | End-of-service engine; WPS SIF file | built, reviewed |
| 3 | Backend: contract, database, audit, auth, employees, leave, pay runs, SIF | built, merged; review fixes in progress |
| 4 | Web app | groundwork merged; screens wait for the design pick |
| 5 | Monthly payroll engine | built, reviewed, fixed, merged |
| 6 | Expenses and claims (approval spine, receipts) | API build running |
| 7 | Documents, letters, Emiratisation | merged to main with review fixes R1-R6; scoped re-review running |
| 8 | Hiring, tasks, exit flow | engine part merged; API build running |
| 9 | Time, attendance, leave policies, WFH | merged to main with review fixes N1-N8; scoped re-review running |
| 10 | Performance, learning, surveys | API build running (branch `api-plan-10`) |
| 11 | Owner view, pre-pay gate, evidence | API build running (branch `api-plan-11`; engine part merged) |
| 12 | VAT, corporate tax, e-invoicing | built on `api-plan-12`; two review rounds, fixes N1-N11 in progress; not merged |
| 13 | Channels and integrations | merged to main with security fixes I1-I5; scoped re-review running |
| 14 | Meetings | planned; blocked until a telecom position is confirmed |
| 15 | Social and website insights | planned; waits for 8, 11, 13 |
| 16 | Finance modules | planned; waits for 6, 7, 12 |
| 17 | Governed assistant, import, intranet, chat | planned; waits for 6, 13 |

Also in the repo: the Arabic native-review pack (`docs/review/`) and the
deployment and CI kit (`deploy/`: Docker, compose, role setup, env check;
`.github/workflows/ci.yml`; `docs/ops/runbook.md` and
`docs/ops/security-checklist.md`). The CI workflow has never run on GitHub;
the images and compose stack were tested locally. Known gaps: no rate
limiting, the API image runs TypeScript through tsx (no compile step),
backups are not encrypted or copied off the host.

## Next step

Keep building in parallel (the owner allows up to 10 agents): merge each
finished worktree branch, run `pnpm install`, typecheck and per-package
tests, push; start the next plan whose prerequisites are merged; send
money, security and tenancy tasks to a read-only reviewer and forward the
findings to the builder. When the owner has chosen a design concept,
re-plan the web app and build the screens in parallel against
`packages/contract` and the mock API. The owner wants no technical
questions: decide, record a ruling, continue.
Plan 6 (branch `api-plan-6`): run the security reviews of Tasks 2, 3
and 6 and one whole-branch review, then merge (migrations 601 to 604,
`RECEIPTS_DIR` in every environment). Expense and approval screens are
a Plan 4 follow-up.

Plan 8: review Task 6 (exit and settlement) and Task 7 (revocation),
then the whole branch, then merge `api-plan-8` after Plan 3.

Plan 13 (branch `api-plan-13`, main merged in): a fresh security
review of Tasks 4, 5, 7, 8 and 9 (self-reviewed only), then merge.
Migrations 1301 to 1309 run after 908 (the runner sorts numerically).
The API now needs `RECEIPTS_DIR` in every environment, also in the
serve-only container (`deploy/serve.ts`, compose `receipts` volume).

## Tooling (25 Nov 2026)

Node 22, pnpm 10, TypeScript 7.0.2, Vitest 5.1.2, fast-check 4.11.0,
zod 4.6.7, tsx 4.23.15, `@types/node` 22.x. Versions are pinned exactly.
Plan 3 adds Hono 4.13.17, @hono/node-server 2.1.6, pg 8.23.1,
@types/pg 8.23.1 and @electric-sql/pglite 0.5.16 (tests).
