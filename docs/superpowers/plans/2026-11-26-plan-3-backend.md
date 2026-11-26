# Backend (Data Model, API, Tenancy, Security Baseline) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An M1 backend that stores companies, people, leave, attendance
and pay runs per tenant, produces traced payslips and WPS files through
`@payroll/engine` and `@payroll/wps`, and is fully testable without a
hosted database or a UI.

**Architecture:** `packages/contract` (zod schemas, route table, error
codes, OpenAPI builder) is the single source of truth and depends on zod
only, so the web app (Plan 4) builds against it in parallel.
`packages/api` is a Hono app over a small `Db` interface: PostgreSQL in
production (`pg`), embedded PostgreSQL (pglite, WASM) in tests. Tenant
isolation is PostgreSQL row-level security, entered only through
`withTenant()`; salary and bank fields are encrypted per tenant and
redacted per role in one serializer; the audit log is append-only and
hash-chained. Pay arithmetic stays in a pure module that takes entered
pay components as inputs and computes only what a sourced rule-pack
covers.

**Tech Stack:** Node 22, TypeScript 7.0.2, zod 4.6.7, Hono 4.13.17,
@hono/node-server 2.1.6, @electric-sql/pglite 0.5.16 (tests), pg 8.23.1
and @types/pg 8.23.1 (production driver), node:crypto (scrypt,
AES-256-GCM, HMAC-SHA1 TOTP, SHA-256), Vitest 5.1.2, fast-check 4.11.0,
tsx 4.23.15. All pinned exactly.

**Spec:** `docs/superpowers/specs/2026-11-25-uae-sme-hr-payroll-design.md`
(sections 4 to 7), `docs/superpowers/specs/2026-11-25-master-feature-list.md`,
`docs/research/2026-11-25-wps-sif-layout.md` (EDR, EVP and SCR fields),
`docs/engineering-standards.md`, `LEDGER.md` sections 3, 6 and 8.

## Global Constraints

- 80-character lines; files under about 300 lines; functions under 30.
- Money is integer fils (`Fils`, bigint) inside; on the wire it is the
  string `^\d{1,9}\.\d{2}$` ("4000.00"), never negative, never a float.
  Convert only with `parseAed` and `toMoney` (Task 2).
- Statutory values live only in engine rule-packs with a status
  (`official`, `secondary`, `convention`, `hypothetical`, `unsourced`).
  No statutory number appears in `packages/api` or `packages/contract`.
- Pay runs compute nothing that needs an unsourced rule. These are never
  computed and are listed on every pay run and payslip as `notComputed`:
  "proration for partial months", "overtime premiums", "unpaid leave
  deductions", "deductions and deduction caps", "GPSSA pension
  contributions", "ILOE premiums", "notice pay".
- Never say "WPS compliant". SIF records carry the statement: "Layout
  matches two bank guides. Not confirmed by MOHRE or a bank test."
- `packages/contract` imports zod only: no `node:` modules, no
  `@payroll/*`, no Hono.
- Every tenant table has a `company_id` column (or is `companies`), RLS
  enabled and forced, and a policy on `app.company_id`. All app queries
  run as role `payroll_app` (no BYPASSRLS, not table owner).
- Time, ids, keys and logging are injected (`AppDeps`); no `new Date()`,
  `randomUUID()` or `process.env` outside `src/main.ts` and `src/deps.ts`.
- Salary amounts, IBANs, labour person ids and Emirates ID numbers never
  appear in audit rows, log lines or error bodies.
- Dates are ISO `YYYY-MM-DD`; timestamps ISO 8601 UTC with `Z`; the
  company's civil date and SIF creation time use `Asia/Dubai`.
- API base path `/v1`; tenant routes need header `X-Company-Id`;
  authentication is `Authorization: Bearer <session token>`.
- Tests run with `pnpm check` and no network, Docker or hosted database.

## Review Focus

- A Manager or Employee calling list endpoints, payslips, audit events or
  SIF routes: no salary amount or IBAN of anyone they may not see appears
  in any response body (Task 5 `leak.test.ts`, extended in Task 8).
- The same `Idempotency-Key` sent twice at once after a network retry:
  exactly one pay run exists and both callers get its id (Task 7
  `pay-run-idempotency.test.ts`).
- A mid-month joiner or leaver, or approved unpaid leave in the month:
  the run is refused until amounts are entered, never paid a full month
  silently (Task 7 `compute.test.ts`).
- A leaver the engine refuses (left before 2022-02-02, GCC national):
  the run is still created and the payslip shows the refusal code, not a
  500 (Task 7 `compute.test.ts`).
- A request or job with no tenant set (missing `X-Company-Id`, or a
  query outside `withTenant`): zero rows, never every company's rows
  (Task 2 `tenancy.test.ts`, Task 4 `auth.test.ts`).

---

### Task 1: `packages/contract` (schemas, routes, errors, OpenAPI)

Mergeable on its own; Plan 4 starts from this task's commit.

**Files:**
- Create: `packages/contract/package.json` (`@payroll/contract`, exports
  `.` to `./src/index.ts`, dependency `zod` 4.6.7, script `openapi`
  = `tsx src/write-openapi.ts` writing `dist/openapi.json`),
  `packages/contract/tsconfig.json` (engine's, but `types: []`)
- Create in `packages/contract/src/`: `primitives.ts`, `roles.ts`,
  `errors.ts`, `company.ts`, `user.ts`, `department.ts`, `employee.ts`,
  `leave.ts`, `attendance.ts`, `trace.ts`, `payroll.ts`, `sif.ts`,
  `audit.ts`, `routes.ts`, `openapi.ts`, `examples.ts`,
  `write-openapi.ts`, `index.ts`
- Test: `packages/contract/tests/schemas.test.ts`,
  `tests/routes.test.ts`, `tests/openapi.test.ts`, `tests/purity.test.ts`

**Interfaces (Produces; every name is exported from `index.ts`):**
- `primitives.ts`: `Id` (uuid), `IsoDate` (valid calendar date),
  `Timestamp` (ISO with `Z`), `Money` (`^\d{1,9}\.\d{2}$`), `PersonId`
  (`^\d{14}$`), `RoutingCode` (`^\d{9}$`), `Iban` (`^AE\d{21}$`),
  `EmployerId` (`^\d{13}$`), `Lang` (`"en" | "ar"`), `Period`
  (`{ year: int 2000..2100, month: int 1..12 }`).
- `roles.ts`: `Role = z.enum(["owner","hr","manager","employee"])`.
- `errors.ts`: `ERROR_CODES` (readonly tuple of every code used in
  Tasks 2 to 8; listed under each task), `ErrorCode`, `ApiErrorBody =
  { error: { code: ErrorCode; message: string; requestId: string;
  detail?: Record<string, string | string[]> } }`.
- `company.ts`: `Company { id; name; nameAr: string | null; wps: {
  employerId: EmployerId | null; bankRoutingCode: RoutingCode | null } }`,
  `CompanyUpdate` (partial of name, nameAr, wps), `SignupRequest {
  companyName; email; password (min 12); displayName }`.
- `user.ts`: `User { id; email; displayName; mfaEnrolled: boolean }`,
  `Membership { companyId; companyName; role: Role; employeeId: Id |
  null }`, `LoginRequest { email; password; totp?: ^\d{6}$ }`,
  `LoginResponse { token; expiresAt; user; memberships }`, `Me { user;
  memberships; session: { mfa: boolean; expiresAt } }`, `InviteRequest {
  email; role; employeeId?: Id }`, `InviteResponse { setupToken }`,
  `AcceptInviteRequest { setupToken; password; displayName }`,
  `MfaEnrolResponse { secret; otpauthUrl }`, `MfaConfirmRequest { code }`.
- `department.ts`: `Department { id; name; nameAr: string | null;
  headEmployeeId: Id | null }`, `DepartmentCreate`, `DepartmentUpdate`.
- `employee.ts`: `WorkerClass = z.enum(["expat-full-time",
  "uae-national","gcc-national"])`; `SifBucket = z.enum(["fixed",
  "housing","conveyance","medical","passage","overtime",
  "otherAllowances","leaveEncashment"])`; `SalaryComponent { code:
  ^[a-z][a-z0-9-]{0,31}$; label; labelAr: string | null; amount: Money;
  sifBucket: SifBucket }`; `SalaryUpdate { components:
  SalaryComponent[] (1..30) }`; `BankDetails { routingCode; iban }`;
  `BankMasked { routingCode; ibanLast4: ^\d{4}$ }`; `EmployeeCreate {
  number; fullName; fullNameAr?; email?; departmentId?; managerId?;
  jobTitle; nationality: ^[A-Z]{2}$; workerClass; joiningDate;
  lastWorkingDate?; labourPersonId?: PersonId; emiratesIdNumber?:
  ^784\d{12}$ }`; `EmployeeUpdate` (partial of create); `EmployeeView =
  EmployeeCreate-fields + { id; status: "active" | "left"; salary:
  SalaryComponent[] | null; bank: BankMasked | null; labourPersonId:
  PersonId | null; emiratesIdNumber: string | null }` where `null` on a
  protected field means "not visible to you or not set".
- `leave.ts`: `LeaveType { id; name; nameAr; paid: boolean; annualDays:
  int 0..366 | null }` (null: no balance kept), `LeaveTypeCreate`,
  `LeaveRequest { id; employeeId; leaveTypeId; startDate; endDate; days;
  status: "pending"|"approved"|"rejected"|"cancelled"; reason: string |
  null; decidedBy: Id | null; decidedAt: Timestamp | null }`,
  `LeaveRequestCreate { employeeId?; leaveTypeId; startDate; endDate;
  reason? }`, `LeaveDecision { note? }`, `LeaveAdjustmentCreate {
  employeeId; leaveTypeId; year; days: int -366..366; reason (min 3) }`,
  `LeaveBalance { leaveTypeId; year; entitledDays; adjustmentDays;
  takenDays; pendingDays; remainingDays; dayCountRule:
  "calendar-days-inclusive" }`.
- `attendance.ts`: `AttendanceRecord { id; employeeId; date: IsoDate;
  clockIn: Timestamp; clockOut: Timestamp | null; minutes: int | null;
  source: "self" | "hr"; note: string | null }`, `AttendanceCorrection {
  clockIn; clockOut: Timestamp | null; note (min 3) }`,
  `AttendanceQuery { employeeId?; from: IsoDate; to: IsoDate }`.
- `trace.ts`: `RuleStatus = z.enum(["official","secondary","convention",
  "hypothetical","unsourced"])`, `TraceRule`, `TraceLine` (same fields
  as `packages/engine/src/trace-types.ts`).
- `payroll.ts`: `NOT_COMPUTED_PAY` (the seven strings in Global
  Constraints, in that order), `PayRunEntry { employeeId;
  componentOverrides?: { code; amount: Money }[]; oneOffs?: { code;
  label; amount: Money; sifBucket: SifBucket excluding "fixed" }[];
  unusedLeaveDays?: int >= 0 }`, `PayRunCreate { period: Period;
  entries: PayRunEntry[] }`, `PayRunProblem { employeeId; code: ErrorCode;
  missing: string[] }`, `PayRun { id; period; status: "draft" |
  "approved" | "void"; createdBy; approvedBy: Id | null; createdAt;
  approvedAt: Timestamp | null; inputHash: ^[0-9a-f]{64}$; employeeCount;
  gross: Money; notComputed: string[] }`, `PayslipLine { code; label;
  amount: Money; sifBucket; kind: "recurring" | "override" | "one-off";
  traceId }`, `Settlement` = discriminated union on `status`:
  `"computed" { gratuity; leavePay; total: Money; outcome: "paid" |
  "not-eligible" | "not-applicable"; reason; notComputed: string[];
  trace: TraceLine[]; explanation: { en; ar; arReviewed: false };
  includedInSif: false }` or `"refused" { code: string; message }`;
  `Payslip { id; payRunId; employeeId; employeeName; period; lines;
  gross: Money; net: Money; notComputed: string[]; settlement:
  Settlement | null; trace: TraceLine[] }`.
- `sif.ts`: `SIF_STATEMENT` (exact text in Global Constraints),
  `Finding { code; severity: "error" | "warning"; line: int; field: int |
  null; message; value }`, `SifFile { id; payRunId; fileName; total:
  Money; createdAt; findings: Finding[]; errorCount; warningCount;
  statement: typeof SIF_STATEMENT }`.
- `audit.ts`: `AuditEvent { id; seq: int >= 1; at; actorUserId: Id |
  null; action: ^[a-z]+(\.[a-z-]+)+$; entityType; entityId: Id | null;
  data: Record<string, string | number | boolean | string[]>; prevHash;
  hash }`, `AuditVerifyResult { ok; checked; firstBadSeq: int | null }`.
- `routes.ts`: `RouteDef { id; method: "GET"|"POST"|"PUT"|"PATCH";
  path; auth: "public" | "user" | "tenant"; roles: readonly Role[];
  mfa: boolean; params?; query?; body?; headers?; response: ZodType;
  status: 200 | 201 | 204; contentType?: "text/plain" }` and `ROUTES:
  readonly RouteDef[]` with exactly these entries (path, roles; mfa
  true where marked):
  - public: `POST /v1/signup` (`signup`), `POST /v1/auth/login`
    (`login`), `POST /v1/auth/accept-invite` (`acceptInvite`),
    `GET /v1/health` (`health`).
  - user: `POST /v1/auth/logout`, `GET /v1/me`, `POST
    /v1/auth/mfa/enrol`, `POST /v1/auth/mfa/confirm`.
  - tenant, all roles: `GET /v1/company`, `GET /v1/employees`,
    `GET /v1/employees/{id}`, `GET /v1/departments`,
    `GET /v1/leave-types`, `GET /v1/leave-requests`,
    `POST /v1/leave-requests`, `POST /v1/leave-requests/{id}/cancel`,
    `GET /v1/employees/{id}/leave-balances`,
    `POST /v1/attendance/clock-in`, `POST /v1/attendance/clock-out`,
    `GET /v1/attendance`, `GET /v1/me/payslips`,
    `GET /v1/payslips/{id}`.
  - owner, hr, manager: `POST /v1/leave-requests/{id}/approve`,
    `POST /v1/leave-requests/{id}/reject`.
  - owner, hr: `POST /v1/employees`, `PATCH /v1/employees/{id}`,
    `PUT /v1/employees/{id}/salary`, `PUT /v1/employees/{id}/bank`,
    `GET /v1/employees/{id}/bank` (mfa), `POST /v1/departments`,
    `PATCH /v1/departments/{id}`, `POST /v1/leave-types`,
    `PATCH /v1/leave-types/{id}`, `POST /v1/leave-adjustments`,
    `PUT /v1/attendance/{id}`, `POST /v1/pay-runs` (header
    `Idempotency-Key`, 1..100 chars), `GET /v1/pay-runs`,
    `GET /v1/pay-runs/{id}`, `GET /v1/pay-runs/{id}/payslips`,
    `POST /v1/pay-runs/{id}/void`, `POST /v1/pay-runs/{id}/sif`,
    `GET /v1/sif-files/{id}`, `GET /v1/sif-files/{id}/download` (mfa,
    `text/plain`), `GET /v1/audit-events`,
    `GET /v1/audit-events/verify`.
  - owner only: `PATCH /v1/company`, `GET /v1/users`,
    `POST /v1/users/invite`, `POST /v1/pay-runs/{id}/approve` (mfa).
- `openapi.ts`: `buildOpenApi(): OpenApiDocument` (OpenAPI 3.1.0 built
  from `ROUTES` with `z.toJSONSchema`, draft 2020-12; `operationId` =
  route `id`; bearer security on non-public routes; `X-Company-Id`
  header parameter on tenant routes; every error status refers to
  `ApiErrorBody`).
- `examples.ts`: `EXAMPLES: Record<string, unknown>` keyed by schema
  name, one valid example per response schema (Plan 4 uses them as
  mocks); salary amount examples use `"7777.77"` and IBAN examples use
  `"AE070331234567890123456"`, the sentinels Task 5's leak test greps.

- [ ] **Step 1: Write the failing tests**

`schemas.test.ts`: `Money` accepts `"0.00"`, `"4000.00"`,
`"999999999.99"` and rejects `"4000"`, `"4000.5"`, `"-1.00"`,
`"1,000.00"`, `4000`; `IsoDate` rejects `"2026-02-30"`; `Iban` rejects
22 characters; `SalaryUpdate` rejects an empty list; `Settlement` parses
both variants and rejects `includedInSif: true`; every value in
`EXAMPLES` parses against its schema; `NOT_COMPUTED_PAY` deep-equals the
seven strings; `WorkerClass.options` equals the engine's three strings
(literal copy in the test, so contract keeps no engine import).

`routes.test.ts`: route ids are unique; `(method, path)` pairs are
unique; every path starts with `/v1/`; every `{param}` in a path has a
`params` schema key; every `mfa: true` route has `auth: "tenant"`;
public routes are exactly the four listed; `POST /v1/pay-runs` declares
the `Idempotency-Key` header; count of routes equals 49.

`openapi.test.ts`: `buildOpenApi().openapi === "3.1.0"`; operation count
equals `ROUTES.length`; every operation has `operationId`; public
operations have `security: []`; `GET /v1/sif-files/{id}/download` has a
`text/plain` 200 response; `JSON.stringify` of the document succeeds and
contains no `"$ref"` to a missing component.

`purity.test.ts`: no file under `packages/contract/src` except
`write-openapi.ts` imports `node:`, `@payroll/`, `hono` or `pg`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/contract test`. Expected:
  FAIL, modules not found.
- [ ] **Step 3: Implement** the files above; one schema family per file;
  `index.ts` re-exports all; `ERROR_CODES` lists every code an HTTP
  response can carry in Tasks 4 to 8 (each is given with its status),
  plus `ENGINE_REFUSED`; internal codes (`MIGRATION_NAME`,
  `AUDIT_SENSITIVE_DATA`, `CANONICAL_NUMBER`) are not API codes.
- [ ] **Step 4: Run** `pnpm --filter @payroll/contract test`,
  `pnpm --filter @payroll/contract openapi`, then `pnpm check`.
  Expected: PASS; `packages/contract/dist/openapi.json` exists (not
  committed: `dist` is skipped by the line check and git-ignored).
- [ ] **Step 5: Commit** `feat(contract): schemas, routes and OpenAPI`
  (include `pnpm-lock.yaml` and a root `.gitignore` entry for `dist/`).

### Task 2: API package, database adapter, migrations and tenancy

**Files:**
- Create: `packages/api/package.json` (`@payroll/api`; dependencies
  `@payroll/contract`, `@payroll/engine`, `@payroll/wps` (workspace),
  `hono`, `@hono/node-server`, `pg`, `zod`; dev `@electric-sql/pglite`,
  `@types/pg`, `@types/node` 22.20.7), `packages/api/tsconfig.json`
- Create: `packages/api/src/db/db.ts`, `src/db/pglite.ts`,
  `src/db/pg.ts`, `src/db/migrate.ts`, `src/db/tenant.ts`,
  `src/db/money.ts`, `packages/api/migrations/001_tenancy.sql`
- Test: `packages/api/tests/helpers/test-db.ts`,
  `tests/migrate.test.ts`, `tests/tenancy.test.ts`,
  `tests/rls-catalog.test.ts`, `tests/one-place.test.ts`,
  `tests/pg.integration.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 at runtime yet (types only).
- Produces:
  - `interface Db { query<T>(sql: string, params?: unknown[]):
    Promise<T[]>; transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
    close(): Promise<void> }`. Both adapters return `int8` as `bigint`,
    `date` as `"YYYY-MM-DD"` string and `timestamptz` as an ISO string
    with `Z` (pglite `parsers` option; `pg` type parsers 20, 1082, 1184).
  - `openPglite(): Promise<Db>`, `openPg(url: string): Promise<Db>`.
  - `migrate(db: Db, dir: string): Promise<string[]>` applies
    `NNN_*.sql` files in order once each, records them in
    `schema_migrations(name, applied_at)`, returns names applied now.
  - `interface TenantCtx { companyId: string | null; userId: string |
    null }`; `withTenant<T>(db: Db, ctx: TenantCtx, fn: (tx: Db) =>
    Promise<T>): Promise<T>`: one transaction, `SET LOCAL ROLE
    payroll_app`, `set_config('app.company_id', ..., true)` and
    `set_config('app.user_id', ..., true)` (empty string for null).
  - `toMoney(f: Fils): string` (always two decimals, throws
    `NEGATIVE_AMOUNT` below zero) and re-export of `parseAed`.
  - `createTestDb(): Promise<Db>` (fresh pglite, all migrations).
- Migration 001 creates role `payroll_app` (NOLOGIN, NOBYPASSRLS) when
  missing; tables `companies(id, name, name_ar, wps_employer_id,
  wps_bank_routing, dek_wrapped, created_at)`, `users(id, email unique
  citext-like lower index, display_name, password_hash, mfa_secret_enc,
  mfa_enrolled, failed_logins, locked_until)`, `sessions(token_hash pk,
  user_id, mfa, expires_at)`, `memberships(company_id, user_id, role,
  employee_id, pk(company_id, user_id))`, `invites(company_id,
  token_hash, email, role, employee_id, expires_at, used_at)`.
  Policies: tenant tables `company_id = nullif(current_setting(
  'app.company_id', true), '')::uuid`; `companies` on `id` (or id in the
  current user's memberships, select only); `memberships` also visible
  where `user_id = app.user_id`. Global tables (no RLS, allowlisted):
  `schema_migrations`, `users`, `sessions`. Grants to `payroll_app`:
  select, insert, update on tenant tables; no delete anywhere.

- [ ] **Step 1: Write the failing tests**

`migrate.test.ts`: `migrate` on a fresh db returns `["001_tenancy.sql"]`;
second call returns `[]`; a file named `002-bad.sql` (no underscore
pattern) throws `MIGRATION_NAME`.

`tenancy.test.ts` (two companies A and B, rows inserted as owner):
`withTenant({companyId: A})` sees only A's memberships; insert of a
B-owned row under A throws (RLS `WITH CHECK`) and the transaction rolls
back; `withTenant({companyId: null, userId: null})` returns zero rows
from every tenant table (Review Focus 5); a raw `db.query` as the
superuser after `withTenant` returns sees no leftover `app.company_id`
(`current_setting('app.company_id', true)` is `''` or null);
`payroll_app` cannot `DELETE` from `memberships` (permission denied).

`rls-catalog.test.ts`: from `pg_class` and `information_schema.columns`,
every table in `public` with a `company_id` column, plus `companies`, has
`relrowsecurity` and `relforcerowsecurity` true and at least one row in
`pg_policies`; every other table is in `GLOBAL_TABLES =
["schema_migrations","users","sessions"]`; `payroll_app` has
`rolbypassrls = false`. Later tasks' tables are checked automatically.

`one-place.test.ts`: scanning `packages/api/src`, the strings
`.transaction(` and `SET LOCAL ROLE` appear only in `src/db/`; no file
outside `src/db/` imports `src/db/pglite` or `src/db/pg`, except
`src/main.ts` importing `src/db/pg` (allowlisted by name).

`pg.integration.test.ts`: `describe.skipIf(!process.env.DATABASE_URL)`;
runs the `tenancy.test.ts` cases against `openPg(DATABASE_URL)` in a
fresh schema.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above. `withTenant` is the only
  function that opens a transaction for application code.
- [ ] **Step 4: Run** `pnpm --filter @payroll/api test` and `pnpm check`.
  Expected: PASS, integration test skipped.
- [ ] **Step 5: Commit** `feat(api): database adapter, migrations, RLS`.

### Task 3: Append-only, hash-chained audit log

**Files:**
- Create: `packages/api/src/audit/canonical.ts`,
  `src/audit/audit.ts`, `migrations/002_audit.sql`
- Test: `packages/api/tests/audit.test.ts`

**Interfaces:**
- Consumes: `Db`, `withTenant`, `createTestDb` (Task 2).
- Produces:
  - `canonicalJson(v: unknown): string`: object keys sorted by code
    unit, no whitespace, arrays in order, `bigint` as a decimal string,
    `undefined` properties dropped, non-finite numbers throw
    `CANONICAL_NUMBER`.
  - `sha256Hex(s: string): string`.
  - `GENESIS_HASH = "0".repeat(64)`.
  - `eventHash(prevHash: string, e: { seq; companyId; at; actorUserId;
    action; entityType; entityId; data }): string` =
    `sha256Hex(prevHash + "\n" + canonicalJson(e))`.
  - `appendAudit(tx: Db, e: AuditInput): Promise<AuditEvent>` where
    `AuditInput { companyId; at: string; actorUserId: string | null;
    action; entityType; entityId: string | null; data:
    Record<string, string | number | boolean | string[]> }`. Locks the
    company's `audit_heads` row `FOR UPDATE`, takes `seq + 1`, writes the
    event and the new head in the caller's transaction.
  - `verifyChain(tx: Db, companyId: string): Promise<AuditVerifyResult>`.
  - `assertNoSensitive(data)`: throws `AUDIT_SENSITIVE_DATA` when any
    key is in `SENSITIVE_KEYS = ["amount","salary","components","iban",
    "labourPersonId","emiratesIdNumber","password","totp","token"]`
    (callers record changed field names, never values).
- Migration 002: `audit_events(id, company_id, seq, at, actor_user_id,
  action, entity_type, entity_id, data jsonb, prev_hash, hash,
  unique(company_id, seq))`, `audit_heads(company_id pk, seq, hash)`;
  trigger raising `audit_events is append-only` on UPDATE and DELETE;
  `payroll_app` gets insert and select only on `audit_events`.

- [ ] **Step 1: Write the failing tests** in `audit.test.ts`:
  `canonicalJson({b: 1, a: [2, {d: 1n, c: undefined}]})` is
  `'{"a":[2,{"d":"1"}],"b":1}'`; three appends give seq 1, 2, 3 and
  event 1's `prevHash` is `GENESIS_HASH`; `verifyChain` returns
  `{ ok: true, checked: 3, firstBadSeq: null }`; an `UPDATE` of an event
  as `payroll_app` fails and, as owner, fails with "append-only"; after
  the owner disables the trigger and edits event 2's `data`,
  `verifyChain` returns `ok: false, firstBadSeq: 2`; two concurrent
  `withTenant` appends for one company produce seq 1 and 2 with no
  gap; company B's chain starts at seq 1 independently; data
  `{ amount: "1.00" }` throws `AUDIT_SENSITIVE_DATA`; a fast-check
  property: `canonicalJson` of an object equals that of the same object
  with keys inserted in reverse order.
- [ ] **Step 2: Run** `pnpm --filter @payroll/api test audit`. Expected:
  FAIL.
- [ ] **Step 3: Implement** `canonical.ts`, `audit.ts` and migration 002.
- [ ] **Step 4: Run** `pnpm --filter @payroll/api test`. Expected: PASS
  (the RLS catalog test now also covers `audit_events`, `audit_heads`).
- [ ] **Step 5: Commit** `feat(api): hash-chained audit log`.

### Task 4: HTTP app, auth, sessions, roles, MFA, company and users

**Files:**
- Create: `packages/api/src/deps.ts`, `src/app.ts`, `src/http/errors.ts`,
  `src/http/context.ts`, `src/http/validate.ts`, `src/http/log.ts`,
  `src/auth/password.ts`, `src/auth/session.ts`, `src/auth/totp.ts`,
  `src/auth/guard.ts`, `src/crypto/keyring.ts`, `src/routes/auth.ts`,
  `src/routes/company.ts`, `src/routes/users.ts`
- Test: `packages/api/tests/helpers/test-app.ts`,
  `tests/totp.test.ts`, `tests/keyring.test.ts`, `tests/auth.test.ts`,
  `tests/company-users.test.ts`

**Interfaces:**
- Consumes: Task 1 `ROUTES`, schemas, `ApiErrorBody`; Task 2 `Db`,
  `withTenant`; Task 3 `appendAudit`.
- Produces:
  - `AppDeps { db: Db; now: () => Date; newId: () => string;
    randomBytes: (n: number) => Uint8Array; keyring: Keyring; log:
    Logger; passwordCost: { N: number } }`; `Logger = (line:
    Record<string, unknown>) => void`.
  - `createApp(deps: AppDeps): Hono` registers handlers by route id:
    `register(app, routeId, handler)` looks up the `RouteDef`, applies
    in order: request id, auth (`public` / `user` / `tenant`), role check
    from `def.roles`, MFA check from `def.mfa`, zod validation of
    params, query, headers and body, then the handler; the handler
    receives `ReqCtx { deps; user; session; tenant: { companyId; role;
    employeeId } | null; params; query; body; headers }`.
  - `class ApiError { status; code: ErrorCode; detail? }`; error
    mapping: `ZodError` to 400 `VALIDATION_FAILED` with field paths
    (never values), `EngineError` to 422 `ENGINE_REFUSED` with only
    `detail.engineCode`, anything else to 500 `INTERNAL` with the
    request id only.
  - `Keyring { wrapNewDek(companyId): { dekWrapped: string };
    encrypt(dekWrapped, aad: string, plain: string): string;
    decrypt(dekWrapped, aad, cipher): string; encryptGlobal(aad,
    plain); decryptGlobal(aad, cipher) }` over AES-256-GCM; cipher text
    format `v1.<base64url iv|tag|ct>`; AAD is
    `"<companyId>:<table>:<column>:<rowId>"`; `keyringFromKey(kek:
    Uint8Array)` (32 bytes).
  - `hashPassword(pw, cost)`, `verifyPassword(pw, stored)` (scrypt,
    `scrypt$N$r$p$salt$hash`, constant-time compare).
  - `totpCode(secret: Uint8Array, unixSeconds: number, digits = 6)`
    (RFC 6238, HMAC-SHA1, 30 s step), `verifyTotp(secret, code,
    unixSeconds)` accepts steps -1, 0, +1.
  - Sessions: token is 32 random bytes base64url; only its SHA-256 is
    stored; absolute expiry 8 hours from login; `mfa` true when login
    carried a valid TOTP.
- Behaviour pinned here:
  - `POST /v1/signup` creates user, company (with wrapped DEK) and
    `owner` membership in one `withTenant` call whose `companyId` is
    the new id; audit `company.created`. Duplicate email: 409
    `EMAIL_TAKEN`.
  - Login: unknown email and wrong password both give 401
    `INVALID_CREDENTIALS` with the same body; 5 failures lock the user
    for 15 minutes (423 `ACCOUNT_LOCKED`); an enrolled user who sends no
    TOTP still logs in with `mfa: false`; a wrong TOTP gives 401
    `INVALID_CREDENTIALS`.
  - Tenant routes: missing `X-Company-Id` gives 400
    `COMPANY_HEADER_REQUIRED`; a company without the caller's
    membership gives 403 `TENANT_FORBIDDEN`; a role not in `def.roles`
    gives 403 `FORBIDDEN`; MFA routes with `session.mfa = false` give
    403 `MFA_REQUIRED`, or `MFA_ENROLMENT_REQUIRED` when not enrolled;
    no or expired token gives 401 `UNAUTHENTICATED`.
  - Invites: `POST /v1/users/invite` returns a setup token valid 72
    hours (shown once, stored hashed); accept creates or links the user
    and the membership; reuse gives 410 `INVITE_USED`.
  - Every response carries `X-Request-Id`; `log` gets one line per
    request with `requestId, method, routeId, status, ms, companyId,
    userId` and never a body.

- [ ] **Step 1: Write the failing tests**

`totp.test.ts`: with the RFC 6238 SHA-1 seed `"12345678901234567890"`,
`totpCode(seed, 59, 8)` is `"94287082"`, `totpCode(seed, 1111111109, 8)`
is `"07081804"`; `verifyTotp` accepts the code of `t - 30` and rejects
`t - 90`.

`keyring.test.ts`: encrypt then decrypt round-trips; decrypt with a
different AAD throws; decrypt with another company's DEK throws; two
encryptions of one plaintext differ.

`auth.test.ts`: `auth_signup_then_me` (200, one `owner` membership);
`auth_login_same_error_for_unknown_and_wrong`; `auth_lockout_after_5`;
`auth_logout_kills_token` (later `GET /v1/me` is 401);
`auth_expired_session` (advance `now` by 8 h + 1 s, 401);
`auth_missing_company_header` (400 `COMPANY_HEADER_REQUIRED`, Review
Focus 5); `auth_other_company_forbidden` (403 `TENANT_FORBIDDEN`);
`auth_mfa_enrol_confirm_then_login_with_totp` (`session.mfa` true);
`auth_role_forbidden` (employee calling `PATCH /v1/company` gets 403
`FORBIDDEN`); `auth_validation_error_has_paths_not_values` (bad email
gives 400 whose body does not contain the submitted password);
`auth_log_has_no_body` (no log line contains the password).

`company-users.test.ts`: owner sets WPS employer id `"0000000123456"`
and routing `"802420101"`, `GET /v1/company` returns them, an audit
`company.updated` event has `data.changed` `["wps"]`; invite as `hr`,
accept, the new user lists the company with role `hr`; reused invite
gives 410; `GET /v1/users` as `hr` is 403.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above. `test-app.ts` exports
  `makeApp(opts?)` returning `{ app, deps, clock, logs }` with a fixed
  test KEK, sequential ids, `passwordCost.N = 1024`, and helpers
  `signup(app, name)`, `login(app, email, pw, totp?)`,
  `call(app, token, companyId, method, path, body?, headers?)`.
- [ ] **Step 4: Run** `pnpm --filter @payroll/api test` and `pnpm check`.
  Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): auth, sessions, roles, MFA`.

### Task 5: Employees, departments and field-level protection

**Files:**
- Create: `packages/api/src/people/employees.ts`,
  `src/people/redact.ts`, `src/people/departments.ts`,
  `src/routes/employees.ts`, `src/routes/departments.ts`,
  `migrations/003_people.sql`
- Test: `packages/api/tests/employees.test.ts`,
  `tests/redact.test.ts`, `tests/leak.test.ts`,
  `tests/helpers/seed.ts`

**Interfaces:**
- Consumes: Tasks 1 to 4.
- Produces:
  - Migration 003: `departments`, `employees(..., manager_id,
    labour_person_id_enc, emirates_id_enc, salary_enc, salary_version,
    bank_routing, iban_enc, iban_last4, unique(company_id, number))`.
    Encrypted columns use the company DEK with AAD
    `"<companyId>:employees:<column>:<employeeId>"`.
  - `loadEmployee(tx, deps, companyId, id): Promise<EmployeeRow>`
    (decrypted, internal only, `amount` as `Fils`), `listEmployees`.
  - `viewerScope(ctx): { kind: "all" } | { kind: "reports"; managerId }
    | { kind: "self"; employeeId }` (owner/hr all; manager self plus
    direct reports; employee self).
  - `toEmployeeView(row, viewer: { role; employeeId }): EmployeeView`,
    the only function that serialises employees. Salary: owner, hr,
    self. `BankMasked`: owner, hr, self. `labourPersonId`,
    `emiratesIdNumber`: owner, hr. Otherwise `null`.
  - Salary rules: exactly one component with code `basic` and bucket
    `fixed` (422 `BASIC_COMPONENT_REQUIRED`); codes unique (422
    `DUPLICATE_COMPONENT`); each `PUT` increments `salary_version`.
  - Out-of-scope reads return 404 `NOT_FOUND`, not 403.
  - `GET /v1/employees/{id}/bank` returns the full `BankDetails` and
    writes audit `employee.bank.revealed`.
  - Audit actions: `employee.created`, `employee.updated` (data
    `changed: string[]` of field names), `employee.salary.updated`
    (`data: { version }`), `employee.bank.updated`,
    `department.created`, `department.updated`.
  - `seed.ts`: `seedCompany(app, name)` returns tokens for an owner,
    hr, manager and employee user, the manager's direct report (the
    employee), one more employee outside the manager's team, salaries
    with amount `"7777.77"` and IBAN `"AE070331234567890123456"`.

- [ ] **Step 1: Write the failing tests**

`redact.test.ts`: a table test over 4 roles x {self, report, other}
asserting which of `salary`, `bank`, `labourPersonId` is null, exactly
per the rules above.

`employees.test.ts`: create, patch, list by `hr`; manager list contains
self and the report only; employee list contains only self; employee
GET of another employee is 404; salary without `basic` is 422
`BASIC_COMPONENT_REQUIRED`; salary update audit row's `data` JSON text
does not contain `"7777.77"`; the `employees` row's `salary_enc` and
`iban_enc` columns do not contain `7777.77` or `AE0703`; bank reveal
without an MFA session is 403 `MFA_REQUIRED`, with one returns the IBAN
and writes `employee.bank.revealed`; duplicate employee number is 409
`EMPLOYEE_NUMBER_TAKEN`; company B's owner fetching A's employee id
with B's header gets 404.

`leak.test.ts` (Review Focus 1): for every `GET` route in `ROUTES` with
`auth: "tenant"` and every role of `seedCompany`, call it (fill `{id}`
with seeded ids of the right type; query defaults per route); for
pairs not in `MAY_SEE_SENSITIVE` (a table in the test: owner and hr on
employee routes, self on own employee and own payslips), the body text
contains neither `"7777.77"` nor `"AE070331234567890123456"`. Also for
company B's owner, every `{id}` route given company A's ids returns 404.
Routes added by later tasks join this test automatically.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `pnpm --filter @payroll/api test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): employees, departments, redaction`.

### Task 6: Leave types, requests, balances and attendance

**Files:**
- Create: `packages/api/src/leave/days.ts`, `src/leave/balances.ts`,
  `src/leave/requests.ts`, `src/attendance/attendance.ts`,
  `src/time/dubai.ts`, `src/routes/leave.ts`, `src/routes/attendance.ts`,
  `migrations/004_leave_attendance.sql`
- Test: `packages/api/tests/leave-days.test.ts`, `tests/leave.test.ts`,
  `tests/attendance.test.ts`

**Interfaces:**
- Consumes: Tasks 1 to 5 (`viewerScope`, `appendAudit`, `seedCompany`).
- Produces:
  - `leaveDays(start: string, end: string): number`: calendar days
    inclusive (weekends and public holidays are not modelled).
  - `daysInPeriod(start, end, period: Period): number`: the part of a
    request inside the month.
  - `balanceFor(tx, companyId, employeeId, leaveTypeId, year):
    Promise<LeaveBalance>`: `entitledDays` = the type's `annualDays`
    (company-entered, no accrual and no first-six-months rule),
    `remainingDays = entitled + adjustments - taken - pending`.
  - `unpaidLeaveDaysIn(tx, companyId, employeeId, period):
    Promise<number>`: approved requests of types with `paid = false`.
  - `dubaiDate(at: Date): string` and `dubaiTime(at: Date): { hhmmss }`
    (fixed UTC+4; the UAE has no daylight saving).
  - Leave rules: `endDate < startDate` 400 `VALIDATION_FAILED`;
    crossing 31 December 422 `LEAVE_CROSSES_YEAR`; overlap with a
    pending or approved request 409 `LEAVE_OVERLAP`; a balance-kept
    type with `remainingDays < days` 422 `INSUFFICIENT_BALANCE`;
    approve or reject only when pending (409 `LEAVE_NOT_PENDING`);
    a manager decides only for direct reports (else 404) and never their
    own request (403 `SOD_VIOLATION`); an employee creates only for
    self (`employeeId` omitted or equal); cancel: own pending, or hr
    and owner any non-cancelled.
  - Attendance: `clock-in` makes an open record dated `dubaiDate(now)`
    (409 `ALREADY_CLOCKED_IN` when one is open); `clock-out` closes it
    and sets whole `minutes` rounded down (409 `NOT_CLOCKED_IN`);
    clock routes need a membership linked to an employee (422
    `NO_EMPLOYEE_LINK`); hr `PUT` correction requires `clockOut >=
    clockIn` and writes audit `attendance.corrected` with old and new
    times; overtime is not computed.
  - Audit actions: `leave-type.created`, `leave-type.updated`,
    `leave.requested`, `leave.approved`, `leave.rejected`,
    `leave.cancelled`, `leave.adjusted`, `attendance.corrected`.

- [ ] **Step 1: Write the failing tests**

`leave-days.test.ts`: `leaveDays("2026-03-01","2026-03-01")` is 1;
`("2026-02-27","2026-03-02")` is 4; `daysInPeriod("2026-01-30",
"2026-02-02", {year: 2026, month: 2})` is 2; fast-check: for any valid
range, the sum of `daysInPeriod` over its months equals `leaveDays`.

`leave.test.ts`: type with `annualDays` 30 and an adjustment of 2 gives
`entitledDays` 30, `remainingDays` 32; a 5-day pending request lowers
`remainingDays` to 27 and `pendingDays` 5; approval moves it to
`takenDays`; overlapping request 409; request for 40 days 422
`INSUFFICIENT_BALANCE`; manager approves report's request, gets 404 for
a non-report and 403 `SOD_VIOLATION` on their own; employee creating
for another employee 403 `FORBIDDEN`; unpaid type: approved
`2026-01-30..2026-02-02` gives `unpaidLeaveDaysIn` 2 for February;
balance response has `dayCountRule: "calendar-days-inclusive"`.

`attendance.test.ts`: clock-in at `2026-03-01T20:30:00Z` is dated
`2026-03-02` (Dubai); clock-out 90 min 59 s later gives `minutes` 90;
second clock-in 409; clock-out with none open 409; owner without an
employee link 422 `NO_EMPLOYEE_LINK`; manager `GET /v1/attendance` sees
self and report only; hr correction audit row has `action`
`attendance.corrected`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `pnpm --filter @payroll/api test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): leave and attendance`.

### Task 7: Pay runs and payslips (idempotent, traced, approved)

High risk (money): this task keeps per-task review.

**Files:**
- Create: `packages/api/src/payroll/compute.ts` (pure),
  `src/payroll/snapshot.ts`, `src/payroll/pay-runs.ts`,
  `src/payroll/payslips.ts`, `src/routes/pay-runs.ts`,
  `migrations/005_payroll.sql`
- Test: `packages/api/tests/compute.test.ts`,
  `tests/pay-run-idempotency.test.ts`, `tests/pay-runs.test.ts`,
  `tests/compute-purity.test.ts`

**Interfaces:**
- Consumes: `calculateSettlement`, `GRATUITY_PACKS`, `explainTrace`,
  `EngineError`, `Fils`, `add`, `fils` from `@payroll/engine`; Tasks 1
  to 6 (`loadEmployee`, `unpaidLeaveDaysIn`, `appendAudit`).
- Produces:
  - `SnapshotEmployee { employeeId; name; joiningDate; lastWorkingDate:
    string | null; workerClass; salaryVersion; components: {code; label;
    amount: Fils; sifBucket}[]; unpaidLeaveDays: number }`;
    `RunSnapshot { period; employees: SnapshotEmployee[]; entries:
    PayRunEntry[] }`; `snapshotHash(s): string` = `sha256Hex(
    canonicalJson(s))` (bigint as string).
  - `computePayRun(s: RunSnapshot): { problems: PayRunProblem[];
    payslips: ComputedPayslip[]; gross: Fils }` where `ComputedPayslip`
    is `Payslip` without ids and with `Fils` amounts. Pure: no db,
    clock, env or random.
  - Rules inside `computePayRun`:
    1. In scope: `joiningDate <= last day` and (`lastWorkingDate` null
       or `>= first day`). An entry for anyone else: problem
       `EMPLOYEE_NOT_IN_PERIOD`.
    2. Partial: joined after the 1st, left before the last day, or
       `unpaidLeaveDays > 0`. A partial employee must have a
       `componentOverrides` entry for every recurring component code,
       else problem `ENTERED_AMOUNTS_REQUIRED` with `missing` = the
       absent codes. Overrides on a non-partial employee replace those
       components too (kind `override`).
    3. Lines: each recurring or overridden component, then one-offs;
       `gross = net = sum of lines`; no deduction lines.
    4. Trace: one line per payslip line, `id` `pay.<code>`, `formula`
       `"entered monthly amount"` / `"entered amount for this run"` /
       `"entered one-off amount"`, `inputs` `{ salaryVersion }` or
       `{ entry: "pay run input" }`, `result` the amount, `rules: []`.
    5. Leaver in the period (`lastWorkingDate` inside it): needs
       `unusedLeaveDays` in its entry, else problem
       `SETTLEMENT_INPUT_REQUIRED`. Calls `calculateSettlement({
       gratuity: { joiningDate, lastWorkingDate, unpaidLeaveDays: 0,
       lastBasicMonthly: <basic component>, workerClass },
       unusedLeaveDays }, GRATUITY_PACKS)`. Success gives `Settlement`
       `computed` with `explanation.en/ar` from `explainTrace` and
       `includedInSif: false`; an `EngineError` gives `refused` with its
       code and message (Review Focus 4). Settlement is not added to
       `gross`. (Unpaid leave across the whole service is not stored
       in M1; `unpaidLeaveDays: 0` is recorded in `notComputed` of the
       settlement as "unpaid leave over service (not recorded yet)".)
    6. `notComputed` on each payslip and the run = `NOT_COMPUTED_PAY`.
  - `createPayRun(ctx, key, body): Promise<{ status: 200 | 201; run:
    PayRun }>`: builds the snapshot in the tenant transaction, computes,
    on any problem returns 422 `PAY_RUN_PROBLEMS` with `detail.problems`
    (codes and employee ids only); else
    `INSERT ... ON CONFLICT DO NOTHING RETURNING id` (no conflict
    target; unique `(company_id, idempotency_key)` and partial unique
    `(company_id, year, month) WHERE status <> 'void'`). When no row
    returns: the run with this key and the same request hash gives 200;
    same key, other hash: 409 `IDEMPOTENCY_KEY_REUSED`; otherwise 409
    `RUN_EXISTS_FOR_PERIOD`. Never catch a SQL error inside the
    transaction. Missing header: 400 `IDEMPOTENCY_KEY_REQUIRED`.
  - Request hash = `sha256Hex(canonicalJson(body))`. Snapshot and
    payslip amounts are stored encrypted (`snapshot_enc`,
    `payslips.body_enc`); `gross` and `input_hash` in clear.
  - Approve: owner, MFA, run `draft` (409 `RUN_NOT_DRAFT`), approver not
    the creator (403 `SOD_VIOLATION`). Void: draft only. Approved runs
    are immutable (no route changes them; corrections are out of
    scope).
  - Payslip reads: owner and hr any; others own payslips of approved
    runs only (`GET /v1/me/payslips`, `GET /v1/payslips/{id}` else 404).
  - Audit: `pay-run.created` (`data: { period, employeeCount,
    inputHash }`), `pay-run.approved`, `pay-run.voided`.

- [ ] **Step 1: Write the failing tests**

`compute.test.ts` (pure, builders in the test file):
- `compute_full_month`: basic 4000.00 + housing 1500.00, gross
  `550000n`, two lines, two trace lines with `rules: []`, `notComputed`
  equals `NOT_COMPUTED_PAY`.
- `compute_joiner_needs_amounts` (Review Focus 3): joined
  `2026-03-10` for March with no overrides gives problem
  `ENTERED_AMOUNTS_REQUIRED`, `missing` `["basic","housing"]`; with
  both overrides gross equals their sum and lines have kind `override`.
- `compute_unpaid_leave_needs_amounts`: `unpaidLeaveDays: 3` and no
  overrides gives `ENTERED_AMOUNTS_REQUIRED`.
- `compute_leaver_settlement`: expat, joined `2019-01-01`, left
  `2026-03-31`, basic 4000.00, `unusedLeaveDays: 0`: `settlement.status`
  `computed`, `total` equals `calculateSettlement(...)` called directly
  with the same input, `includedInSif` false, gross unchanged.
- `compute_leaver_refused` (Review Focus 4): `workerClass
  "gcc-national"` gives `settlement.status "refused"`, code
  `UNSUPPORTED_WORKER_CLASS` (or the code the engine throws, asserted
  by calling the engine in the test) and the payslip still exists.
- `compute_leaver_needs_leave_days`: no `unusedLeaveDays` gives
  `SETTLEMENT_INPUT_REQUIRED`.
- `compute_uae_national_not_applicable`: `outcome "not-applicable"`,
  reason equals the engine's `UAE_NATIONAL_REASON`.
- `compute_deterministic` (fast-check, 100 runs over 1 to 50 random
  employees with amounts up to 10,000,000 fils): the same snapshot
  computed twice is deep-equal and `gross` equals the bigint sum of all
  line amounts.

`compute-purity.test.ts`: `src/payroll/compute.ts` contains none of
`Date`, `process`, `fetch`, `node:`, `randomUUID`, `./db`.

`pay-run-idempotency.test.ts` (Review Focus 2): two `POST
/v1/pay-runs` with one key sent with `Promise.all` give statuses
`{201, 200}` and the same `id`; `SELECT count(*)` is 1; the same key
with another body gives 409 `IDEMPOTENCY_KEY_REUSED`; a new key for the
same period gives 409 `RUN_EXISTS_FOR_PERIOD`; after `void`, a new key
for the period gives 201; no header gives 400.

`pay-runs.test.ts`: hr creates, hr approve gives 403 `FORBIDDEN`;
the owner who created approves gives 403 `SOD_VIOLATION` (owner B is
a second owner invited in the test); approve without MFA gives 403
`MFA_REQUIRED`; approve twice gives 409 `RUN_NOT_DRAFT`; employee sees
own payslip only after approval and 404 for a colleague's; payslip
amounts equal `toMoney` of the computed lines; `pay-run.created` audit
`data` JSON has no amount; the `payslips` table text has no
`"7777.77"`; a 422 `PAY_RUN_PROBLEMS` body lists employee ids and codes
and no amounts.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test`. Expected: FAIL.
- [ ] **Step 3: Implement** `compute.ts` first (pure), then the rest;
  add `seedPayroll` to `tests/helpers/seed.ts` and extend the leak
  test's `mayView` for payslip and pay-run routes.
- [ ] **Step 4: Run** `pnpm --filter @payroll/api test` and `pnpm check`.
  Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): pay runs and traced payslips`.

### Task 8: SIF files, whole-API conformance, server entry, handover

**Files:**
- Create: `packages/api/src/payroll/sif.ts`, `src/routes/sif.ts`,
  `src/routes/audit.ts`, `src/main.ts`, `migrations/006_sif.sql`
- Modify: root `package.json` (scripts `api:dev` = `tsx
  packages/api/src/main.ts`, `api:migrate`), `HANDOVER.md`, `LEDGER.md`
- Test: `packages/api/tests/sif.test.ts`,
  `tests/conformance.test.ts`, `tests/audit-routes.test.ts`,
  `tests/main.test.ts`

**Interfaces:**
- Consumes: `generateSif`, `validateSif`, `SifBatch`, `EdrInput`,
  `EvpInput`, `defaultLayout` from `@payroll/wps`; Task 7 payslips and
  snapshot; Task 6 `dubaiDate`, `dubaiTime`.
- Produces:
  - `buildSifBatch(company, run, payslips, employees, at: Date):
    SifBatch`: `employerId` and `bankRoutingCode` from company WPS
    settings (missing: 422 `COMPANY_WPS_SETTINGS_MISSING`); per
    employee `payStart = max(joiningDate, 1st)`, `payEnd =
    min(lastWorkingDate, last day)`, `days = end - start + 1`,
    `unpaidLeaveDays` from the snapshot, `fixed` = sum of lines with
    bucket `fixed`, `variable` = sum of the other lines, EVP from the
    seven non-fixed buckets when `variable > 0`; settlement amounts are
    not included; `createdDate = dubaiDate(at)`, `createdTime =
    dubaiTime(at).hhmmss`. Employees missing `labourPersonId`,
    routing or IBAN: 422 `EMPLOYEE_BANK_MISSING` with
    `detail.employeeIds` (all of them, not the first).
  - `POST /v1/pay-runs/{id}/sif`: run must be `approved` (409
    `RUN_NOT_APPROVED`); one SIF per run (a second call returns the
    stored file, 200); `generateSif` `EngineError` gives 422
    `SIF_GENERATION_FAILED` with only `detail.engineCode`; stores
    `fileName`, `total`, `findings` from `validateSif(text,
    defaultLayout, dubaiDate(at))`, the text encrypted; returns
    `SifFile` with `SIF_STATEMENT`. Audit `sif.generated` (`data: {
    fileName, errorCount, warningCount }`).
  - `GET /v1/sif-files/{id}/download`: `text/plain`, header
    `Content-Disposition: attachment; filename="<fileName>"`, audit
    `sif.downloaded`.
  - `GET /v1/audit-events?before&limit` (newest first, limit 1..200,
    default 50) and `GET /v1/audit-events/verify`.
  - `main.ts`: reads `DATABASE_URL`, `PAYROLL_MASTER_KEY` (base64, 32
    bytes; refuse to start with exit code 1 and message
    `PAYROLL_MASTER_KEY must be 32 bytes base64` otherwise), `PORT`
    (default 8787); runs migrations as the connecting owner role, then
    serves with `@hono/node-server`. No other file reads
    `process.env`.

- [ ] **Step 1: Write the failing tests**

`sif.test.ts`: a seeded approved run for March 2026 with basic 4000.00,
housing 1500.00 (bucket `housing`) gives an EDR line with `4000.00` fixed
and `1500.00` variable and an EVP line with `1500.00` housing; the
stored findings have zero errors; `fileName` starts with the 13-digit
employer id and the Dubai date of `at = 2026-03-31T21:00:00Z` (that
is `260401`); a draft run gives 409 `RUN_NOT_APPROVED`; no company WPS
settings gives 422 `COMPANY_WPS_SETTINGS_MISSING`; two employees
without IBAN give 422 with both ids; a second POST returns the same
`id`; the response contains `SIF_STATEMENT` and not the word
"compliant"; a leaver's computed settlement is absent from the SIF
total; download without MFA gives 403 `MFA_REQUIRED`, with MFA returns
text equal to `generateSif` output for the same batch.

`conformance.test.ts`: every `ROUTES` id is registered exactly once in
`createApp` and no Hono route exists outside `ROUTES` (compare the
app's route list with `ROUTES`); for one happy-path call per route
(table in the test), the response body parses with `def.response`;
every error body in the suite's recorded responses parses with
`ApiErrorBody`; every `code` sent is in `ERROR_CODES`.

`audit-routes.test.ts`: after the Task 7 flow, `GET
/v1/audit-events/verify` returns `ok: true`; manager gets 403; events
list for company A never shows company B's events; no event `data`
contains `"7777.77"` or `"AE0703"`.

`main.test.ts`: `loadConfig({})` throws with the master-key message;
`loadConfig` with a 16-byte key throws; a valid env returns
`port: 8787` by default and `migrateUrl` from `MIGRATE_DATABASE_URL`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above; extend `seed.ts` with
  `seedSif` and the leak test's `mayView` with owner and hr on SIF
  routes (nobody else).
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS. Then
  `PAYROLL_MASTER_KEY=$(node -e "console.log(require('crypto')
  .randomBytes(32).toString('base64'))") DATABASE_URL=<local> pnpm
  api:dev` only if a local PostgreSQL exists; otherwise record "not
  run" in the handover.
- [ ] **Step 5: Update `HANDOVER.md`** (state, `pnpm` commands, package
  layout table for `contract` and `api`, limits: the `notComputed` list,
  pen test not done, KMS not used, real payroll waits for the owner) and
  **append to `LEDGER.md`** section 3 every ruling below with today's
  date.
- [ ] **Step 6: Commit** `feat(api): SIF files, conformance, handover`.

---

## Rulings

Claude's calls under the owner's "decide, don't ask" instruction. Each
says what it costs if wrong. The executor appends them to `LEDGER.md`.

1. **Hono over Fastify.** Hono's `app.request()` tests without a socket,
   is small, and runs on Node and edge runtimes. Cost if wrong: route
   files are rewritten for another router; handlers and services stay.
2. **pglite for tests, `pg` in production, no testcontainers.** pglite
   is real PostgreSQL in WASM, installs from npm and runs offline; a
   spike on 2026-11-26 confirmed RLS, `SET LOCAL ROLE` and fail-closed
   policies. Testcontainers needs Docker and image pulls. The `pg` path
   is tested only when `DATABASE_URL` is set. Cost: a pg-only behaviour
   difference (pooling, concurrency) can slip until a CI job with a
   real database exists.
3. **Plain SQL behind a five-method `Db` interface, own migration
   runner, no ORM.** Cost: hand-written queries; an ORM later means
   rewriting the data layer, not the API.
4. **Tenancy = PostgreSQL RLS on `app.company_id`, entered only via
   `withTenant`, app role `payroll_app`.** Tests prove it with a
   catalog test and a source scan. Cost: every query pays a
   transaction; a pool needs `SET LOCAL` discipline (already enforced).
5. **Tenant chosen per request by `X-Company-Id`.** Supports one user in
   several companies (accountants, UQ23). Cost: the web app sends one
   more header.
6. **Opaque bearer sessions (hashed, 8-hour absolute expiry), not JWT,
   no cookie yet.** Revocable at logout. Cost: Plan 4 may want an
   HttpOnly cookie with CSRF protection; that is an additive change.
7. **scrypt (node:crypto) for passwords, own RFC 6238 TOTP.** No native
   dependency. Cost: switching to argon2 needs re-hash on login.
8. **MFA enforced at three actions (pay-run approve, bank reveal, SIF
   download), not at every login of payroll roles** as design section 6
   says. Cost: weaker than the design until M2 makes MFA mandatory at
   login for owner and hr.
9. **Field protection = per-company AES-256-GCM data key wrapped by one
   master key from the environment, plus one redaction function.** No
   KMS and no key rotation yet. Cost: a leaked master key exposes all
   tenants; KMS and rotation are required before real data.
10. **Separation of duties only where M1 needs it:** pay-run creator
    cannot approve; a manager cannot decide own leave. The approval
    spine (UQ18) is M2. Cost: small companies with one owner need a
    second owner to approve a run.
11. **Pay runs take components as entered inputs.** Partial months and
    unpaid leave are refused until amounts are entered; nothing in
    `NOT_COMPUTED_PAY` is computed; no deduction lines. Cost: more data
    entry for HR until those rules are sourced.
12. **Final settlement is shown on the leaver's payslip, not added to
    gross and not put in the SIF.** Whether gratuity travels through
    WPS is unsourced. Cost: HR pays settlement separately for now.
13. **Unpaid leave over the whole service is not recorded in M1**; the
    settlement passes 0 and says so. Cost: gratuity is overstated for
    leavers with unpaid leave until leave history is imported.
14. **SIF buckets:** each salary component carries `sifBucket`; `fixed`
    goes to EDR fixed, the seven EVP categories to variable and EVP
    (field order from the bank guides in the WPS layout note). Cost: a
    bank reading "fixed" differently means a data change per component.
15. **Leave days are calendar days inclusive; leave years are calendar
    years; entitlement is company-entered with no accrual.** Labelled
    `dayCountRule` in every balance. Cost: balances differ from a
    working-day policy; a later rule-pack replaces the function.
16. **Asia/Dubai, fixed UTC+4,** for attendance dates and SIF creation
    date and time. Cost: none while the UAE keeps no daylight saving.
17. **Money on the wire is a two-decimal string up to 999,999,999.99.**
    Cost: a higher cap is a regex change.
18. **Audit log per company, hash = SHA-256 of previous hash, newline
    and canonical JSON; values never stored, only changed field names;
    login failures go to the log and lockout counter, not the audit
    log.** Cost: an auditor wanting old and new salary values needs an
    encrypted diff store later.
19. **No build step:** packages export `.ts` and run under tsx and
    Vitest (ledger section 7 note). Cost: a deploy needs a bundle step.
20. **OpenAPI is generated (`pnpm --filter @payroll/contract openapi`
    into `dist/`), not committed,** because the 80-character line check
    covers committed JSON. Cost: none; Plan 4 imports the schemas.
21. **Leave and attendance are in M1 here** although design section 7
    puts them in M2: the owner's brief for Plan 3 asks for them. Cost:
    one extra task of build time (Task 6); nothing else depends on it.
22. **Deferred, each with its cost:** external pen test (required before
    any real employee data, M1 exit); KMS, key rotation and UAE-region
    hosting; GPSSA contributions (unsourced; design says M1); salary
    revisions, arrears and LOP reversal; pay-run corrections (waits for
    the bank answer); Excel import and parallel-run; document and visa
    expiry alerts; SSO, webhooks and rate limiting beyond login lockout;
    Arabic payslip rendering; PDPL retention. Cost: each is an M1 or M2
    gap the owner sees in the handover's limits list.
23. **Parallel build with Plan 4:** Plan 3 owns `packages/contract` and
    `packages/api`; Plan 4 owns `packages/web`. On a `pnpm-lock.yaml`
    conflict, take either side and run `pnpm install`. Contract changes
    after Task 1 are additive only. Cost: one lockfile merge.
24. **Review:** per the speed ruling, one whole-branch review at the
    end, plus a per-task review of Task 7 (money) and Tasks 2 and 5
    (tenancy and data protection). No pause for plan review (ledger,
    2026-11-25). Cost: a slipped bug in Tasks 3, 4, 6 or 8 is caught
    later.
25. **Dependency versions** are the latest releases at least two weeks
    old on 2026-11-26 (pglite 0.5.16, Hono 4.13.17, node-server 2.1.6);
    the RLS spike ran on pglite 0.6.0, so Task 2's tenancy test is the
    proof on 0.5.16. Cost: a one-line pin change if a test fails.
