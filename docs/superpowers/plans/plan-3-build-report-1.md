# Plan 3 build report 1 (Tasks 1 to 8)

Date: 2026-11-26. Branch `worktree-agent-aa6e9c5f918a01216` (not
pushed), based on `claude/quirky-wozniak-b7xkvr` at `5697439`.

## Status (Tasks 1 to 4; superseded by "Tasks 5 to 8" below)

Tasks 1 to 4 done. Each task's planned tests were written first and
run red, then green; `tests/errors.test.ts` (error mapping and the
injected-time source scan) was added after the code it covers.
`pnpm check` passes: contract 72 tests, engine 154, wps 153, api 68
passed and 7 skipped (the real-PostgreSQL suite, skipped with no
`DATABASE_URL`).

**The contract changed after the Task 1 commit**, inside the Task 4
commit: the `AuditEvent.action` pattern was widened (decision 22). It
only accepts more strings; no field or route changed.

| Task | Commit message |
|---|---|
| 1 | `feat(contract): schemas, routes and OpenAPI` |
| 2 | `feat(api): database adapter, migrations, RLS` |
| 3 | `feat(api): hash-chained audit log` |
| 4 | `feat(api): auth, sessions, roles, MFA` (this report) |

All pins installed as the plan lists them (zod 4.6.7, Hono 4.13.17,
@hono/node-server 2.1.6, pglite 0.5.16, pg 8.23.1, @types/pg 8.23.1,
@types/node 22.20.7). `@hono/node-server` is installed but not used yet
(Task 8's `main.ts`). The pglite spike passed on 0.5.16: `SET LOCAL
ROLE` plus forced RLS fails closed, `DO $$` and trigger bodies run
through `exec`, and concurrent transactions queue rather than hang.

## Decisions for Tasks 1 to 4 (Claude's calls; the owner can overrule)

Items marked **(superseded)** changed later; see "Tasks 5 to 8" below.

1. **Commit trailer.** The harness reminder says `Co-Authored-By:
   Claude Opus 5.5`; the launching agent asked for `Claude Sonnet 5.5`.
   The reminder says only the user's own instructions outrank it, so
   the commits use the Opus line (the session line is identical). Not
   pushed, so an amend is cheap if overruled.
2. **Contract tsconfig.** `types: []` cannot typecheck
   `write-openapi.ts` or the tests (they need `node:fs`). `tsconfig.json`
   checks pure `src` with `types: []` (excluding `write-openapi.ts`);
   `tsconfig.node.json` checks `src` and `tests` with node types. The
   `typecheck` script runs both. `@types/node` is a dev dependency.
3. **Extra contract files.** Routes are split by family
   (`route-def.ts`, `routes-account.ts`, `routes-people.ts`,
   `routes-time.ts`, `routes-pay.ts`, aggregated by `routes.ts`) and
   examples into `examples-people.ts` and `examples-pay.ts`, to keep
   files under 300 lines. `lists.ts` names the list responses and
   `registry.ts` holds `SCHEMAS` (name to schema) and `schemaName()`, so
   `EXAMPLES` is testable and OpenAPI components use `$ref`.
4. **List envelope.** Every list response is `{ items: T[] }`
   (`EmployeeList`, `PayRunList`, ...). Audit events use
   `AuditEventPage { items, nextBefore }` (newest first, `before` is a
   `seq`).
5. **Route schemas for Tasks 5 to 8** (fixed now, additive only later):
   signup returns `LoginResponse` with 201 (signs the owner in);
   accept-invite returns `LoginResponse`; logout is 204 with no body;
   `confirmMfa` returns `Me` and marks the current session `mfa: true` **(superseded: confirm no longer upgrades the session)**;
   `getLeaveBalances` takes `?year`; `listLeaveRequests` takes
   `?employeeId&status`; `createLeaveAdjustment` returns a new
   `LeaveAdjustment` schema; clock-in returns 201, clock-out 200;
   `generateSif` returns 201 (`Reply` lets a handler send 200 for the
   stored file, as for a pay-run replay); download returns `SifText`.
6. **Extra contract types:** `CompanyUser` (for `GET /v1/users`),
   `LeaveTypeUpdate`, `LeaveRequestQuery`, `LeaveBalanceQuery`,
   `AuditEventQuery`, `PayRunCreateHeaders` (lower-case
   `idempotency-key`, as Hono reports headers), `SifText`, `Health`,
   `NoContent`, `IdParams`, `Email`, `Name`, `ERROR_STATUS`
   (code to HTTP status) and `InviteResponse.expiresAt`. Example
   sentinels `SALARY_SENTINEL` and `IBAN_SENTINEL` are exported.
7. **Error codes added beyond the plan** (gaps it leaves):
   `INVITE_INVALID` 400 (unknown or malformed setup token; **superseded: an unknown well-formed token now gives `INVITE_NOT_FOUND` 404**),
   `INVITE_EXPIRED` 410, `MFA_CODE_INVALID` 400, `MFA_ALREADY_ENROLLED`
   409, `MFA_NOT_STARTED` 409 (confirm before enrol), `ALREADY_MEMBER`
   409, `LEAVE_NOT_CANCELLABLE` 409 (reserved for Task 6). Problem codes
   `EMPLOYEE_NOT_IN_PERIOD`, `ENTERED_AMOUNTS_REQUIRED` and
   `SETTLEMENT_INPUT_REQUIRED` are in `ERROR_CODES` because
   `PayRunProblem.code` is an `ErrorCode`.
8. **`Id` is `z.uuid()`** (RFC 9562, version and variant bits checked).
   Test ids are RFC-shaped: `00000000-0000-4000-8000-<12 hex>`.
9. **`Db` has four methods** (`query`, `exec`, `transaction`, `close`):
   `exec` runs multi-statement migration scripts (pglite's `query`
   cannot). Inside a transaction, `tx.transaction(fn)` runs `fn` in the
   same transaction. Timestamps are normalised to exactly millisecond
   precision with `Z` (so audit hashes round-trip byte for byte); the
   `pg` adapter converts any session time zone offset.
10. **Test speed:** `createTestDb()` migrates one pglite template per
    test file and returns `clone()`s of it.
11. **Policy helpers** `app_company_id()` and `app_user_id()` (SQL,
    `STABLE`) wrap `nullif(current_setting(...), '')::uuid`; every
    policy uses them. `withTenant` also refuses a non-uuid company or
    user id (`TENANT_ID`), and the HTTP layer answers a non-uuid
    `X-Company-Id` with 400 `VALIDATION_FAILED` before any query.
12. **(superseded in part: schema usage goes to `payroll_app` only, and production uses a separate runtime role)** **Grants.** `payroll_app` gets select, insert, update on the tenant
    tables and on the global `users` and `sessions` (sign-in needs
    them); no delete anywhere. Logout expires the session row. **(Migration numbers in this report are superseded: see Tasks 5 to 8, decision 2.)**
13. **Invites carry the company id:** the setup token is
    `<companyId>.<32 random bytes base64url>`; only its SHA-256 is
    stored. Accept-invite is public, so it reads the company id from the
    token to set the tenant; `invites` keeps a plain tenant policy and
    the zero-rows test holds. An existing user accepts with their own
    password, checked by the same `verifyCredentials` as sign-in: lock
    check first, wrong guesses counted and committed before the 401, so
    accept-invite cannot be used to guess a locked or unlocked
    account's password (tested: five wrong accepts, then accept and
    login both answer 423).
14. **Audit ids** come from the database (`gen_random_uuid()` default),
    since `AuditInput` has no id. `seq` is `bigint` in SQL and a
    number in the hash and API. `verifyChain` also checks the head row
    against the last event (a missing tail is reported as
    `firstBadSeq = last + 1`). The sensitive-key check is
    case-insensitive.
15. **Password and key randomness is injected:** `hashPassword(pw,
    cost, salt)` takes the salt and `keyringFromKey(kek, random)` takes
    the random source, so only `deps.ts` touches `node:crypto`
    randomness. Production scrypt cost is N = 32768, r = 8, p = 1 **(superseded: N = 65536)**.
    Unknown emails are checked against a dummy hash at the same cost.
16. **(superseded: HKDF subkeys, cipher `v1.<keyId>.<data>`)** **DEK wrapping is bound to the company:** the DEK's AAD is
    `<companyId>:dek`, and `encrypt`/`decrypt` read the company id from
    the first segment of the data AAD. Global values (the TOTP secret)
    use AAD `global:<aad>` under the master key.
17. **Lockout:** the 5th wrong attempt still answers 401; later
    attempts answer 423 until 15 minutes pass. The counter commits in
    its own transaction before the error is thrown. A wrong TOTP counts
    as a failure.
18. **Session expiry:** a session is valid while `now < expires_at`
    (8 hours after sign-in); logout sets `expires_at = now`.
19. **Zod 4's `ZodError` is not an `Error`**, and Hono's `onError` only
    sees `Error`s; `register()` converts throws with `asError()` first.
    Validation details are `{ fields, issues }` (paths and zod issue
    codes, never messages or values).
20. **Audit actions added:** `user.invited` (`data: { role }`) and
    `invite.accepted` (`data: { role }`). The company audit for MFA
    enrolment is not written (it is a user event, not a company one).
21. **Request log** has exactly `requestId, method, routeId, status,
    ms, companyId, userId`; a 500 adds one line with the error name and
    code only. A test scans `src` for `new Date()`, `Date.now(`,
    `randomUUID(`, `process.env` and `Math.random(` outside `main.ts`
    and `deps.ts`.

22. **Audit action pattern widened** from `^[a-z]+(\.[a-z-]+)+$` to
    `^[a-z]+(-[a-z]+)*(\.[a-z]+(-[a-z]+)*)+$`: the plan's own actions
    `pay-run.created` and `leave-type.created` failed the first.
    A contract test parses every action name the plan lists.

## Hand-off notes for Tasks 5 to 8 (written after Task 4; all were handled, see below)

- A missing `Idempotency-Key` currently fails route validation with
  400 `VALIDATION_FAILED`; Task 7 must check the header in the handler
  path (or before `validate`) to answer `IDEMPOTENCY_KEY_REQUIRED`.
- `ApiErrorBody.detail` values are `string | string[]`, so
  `PAY_RUN_PROBLEMS` cannot put problem objects in `detail.problems`;
  use parallel string lists (for example `employeeIds` and `codes`, or
  `"<employeeId>:<code>"` strings).
- `AuditData` values are `string | number | boolean | string[]`, so
  `pay-run.created` must flatten `period` (for example
  `period: "2026-03"`).
- With `userId` set in `withTenant`, the `memberships` and `companies`
  policies also show the caller's other companies. Queries on those two
  tables must filter by company explicitly (current ones do).
- Handlers must use only the `tx` they are given inside a transaction:
  pglite serialises, so a `deps.db.query` inside `withTenant` would
  wait on itself.

## Concerns for the reviewer (after Task 4; see the later Concerns)

- Real PostgreSQL: `SET LOCAL ROLE payroll_app` needs the connecting
  role to be a member of `payroll_app` (or a superuser). pglite runs as
  superuser, so this is unproven here; Task 8's `main.ts` and the
  deploy notes must `GRANT payroll_app TO <app login role>`.

- `.sql` files are not covered by `scripts/check-line-length.mjs`
  (extensions `.ts .json .mjs .md`); the migrations were kept to 80
  characters by hand.
- TOTP codes can be replayed within their 90-second window (no
  last-used-step record). Add one before MFA guards real data.
- A concurrent duplicate signup is caught as a unique violation
  (`23505`) and mapped to `EMAIL_TAKEN`; the pre-check covers the
  normal case.
- `invites.employee_id` and `memberships.employee_id` have no foreign
  key yet (the `employees` table arrives in Task 5).
- The `pg` path (`openPg`, the integration suite) is typechecked but
  not run here: no PostgreSQL in this environment.
- pglite serialises transactions, so the concurrent-append test cannot
  prove `FOR UPDATE` behaviour on a real server; the head row lock is
  there for that case.


## Tasks 5 to 8

Date: 2026-11-26. Same worktree and branch. All four tasks are built,
with the security review of Tasks 2 to 4 fixed first.

### Commits after Task 4

| Commit | Message |
|---|---|
| `786d295` | feat(contract): role change route, sifFileId, nested detail |
| `5eb061f` | feat(api): single-use TOTP codes and role changes |
| `7e3703c` | fix(api): one transaction per request; atomic lockout, TOTP, MFA |
| `ae7f7ba` | feat(contract): serviceUnpaidLeaveDays, leave year filter, codes |
| `99460d1` | fix(api): audit data is an allowlist of keys and safe shapes |
| `dcac897` | fix(api): role separation, tenant-only policies, real-PG tests |
| `019fec3` | fix(api): last-owner race test accepts the 403 outcome |
| `6dd1cd5` | feat(api): employees, departments, redaction (Task 5) |
| `2ef3738` | fix(api): audit uuid keys are checked by shape only |
| `75cbcde` | feat(api): leave and attendance (Task 6) |
| `f1a8f63` | feat(contract): pay-run codes and the settlement note constant |
| `c4b5e5a` | feat(api): pay runs and traced payslips (Task 7) |
| `05fd215` | feat(api): SIF files, conformance, handover (Task 8) |
| `afb5911` | fix(api): repeated codes in a pay-run entry; enrolment check on lock |
| `cb17dfd` | test(api): whole-API flow on real PostgreSQL; report |

### Tests

`pnpm check` passes: contract 81, engine 154, wps 153, api 179 passed
and 18 skipped (the real-PostgreSQL suite). With `DATABASE_URL` set to a
throwaway PostgreSQL 16.15 superuser, the real-PostgreSQL suite passes
18 of 18, run as the non-superuser runtime role, including the whole-API
flow (one successful call to each of the 50 routes, no 5xx). `pnpm api:dev` was run
against that server: health and signup worked, and startup refused a
superuser and a table-owner runtime role.

Test order, honestly: the compute tests (Task 7) and the Task 5 and 6
tests were written first and seen red. Task 8's `sif.test.ts` and
`main.test.ts` were written first but first run after their code;
`audit-routes.test.ts` and `conformance.test.ts` came after their code.
The repeated-code pay-run test (`afb5911`) was seen red. The Task 7 route tests
(`pay-runs`, `pay-run-idempotency`), the contract edits in `786d295`,
the `.sql` line check and the real-PostgreSQL race tests were written
after their code. The race tests were never seen red against the old
code.

### Security review fixes (`review-t2-4.md`)

- **I-1 lockout race:** sign-in locks the user row (`FOR UPDATE`) and
  counts failures in one UPDATE; accept-invite and the MFA password
  checks use the same path. Real PostgreSQL: 20 parallel wrong
  passwords give exactly 5 x 401 and 15 x 423.
- **I-2 roles:** migration 004 gives schema usage to `payroll_app` only.
  The runtime role cannot see a table outside `SET ROLE`, so `RESET
  ROLE` is harmless (tested). `assertRuntimeRole` refuses a superuser,
  BYPASSRLS or table-owning runtime role at startup. A statement
  trigger blocks `TRUNCATE audit_events`. The real-PostgreSQL suite
  runs as `plan3_runtime`, migrates as `plan3_owner` and seeds as a
  superuser. The operator must run `GRANT payroll_app TO <runtime>
  WITH INHERIT FALSE, SET TRUE` (in `main.ts` and the handover).
- **I-3 one transaction:** `register()` runs membership, role, MFA,
  validation and the handler in one `withTenant`. Handlers get
  `ctx.tx` (or `ctx.enter` on public routes) and a `deps` without `db`.
  A source scan fails on `deps.db`, `.db.query(` or `withTenant(`
  outside the plumbing.
- **I-4 MFA:** enrol and confirm need the password, which counts toward
  lockout through a `Refuse` result that commits the counter. Confirm
  does not upgrade the session, and the user's other sessions are
  revoked on enrol and confirm. TOTP steps are claimed by one
  conditional UPDATE (real PostgreSQL: one code sent twice at once
  signs in once).
- **I-5 audit allowlist:** each key has a shape check (`changed`
  field names, role words, integers, `period`, hash, SIF file name,
  uuids, timestamps). Other keys are refused, and money-like,
  IBAN-like or 12-plus-digit strings fail even in allowed string keys.
- **I-6 policies:** the "my companies" arm applies only with no tenant
  set (tested with a user in two companies).
- **Minors:** invite rows are locked (parallel accepts give 200, 410,
  410 on real PostgreSQL); `search_path` is pinned on the policy and
  trigger functions; the keyring uses HKDF subkeys and cipher text names
  the master key; scrypt N = 2^16; a pg `ROLLBACK` failure no longer
  hides the original error and drops the client; the body limit is
  1 MiB (413 `PAYLOAD_TOO_LARGE`). Tests are stronger: every tenant
  table is seeded for both companies, tenant A sees exactly its own
  rows, the RLS catalog test checks policy expressions, and the "no
  setting left behind" test runs on a one-connection pool.
- **Last owner:** owner rows are locked for the check. When two owners
  demote each other at once, the loser gets 409 or, if the winner
  committed first, 403. Either way exactly one owner remains.

### Contract changes for the web app

All are in `packages/contract`. Breaking ones are marked.

1. `PATCH /v1/users/{id}` (`changeUserRole`, owner, MFA): body
   `RoleChange { role }`, response `CompanyUser`, error `LAST_OWNER`
   409. The route count is now 50.
2. `PayRun.sifFileId: Id | null` (required field on the response).
3. `ApiErrorBody.detail` values may be a string, a string list, or a
   list of flat objects of strings and string lists.
   `PAY_RUN_PROBLEMS` sends `detail.problems: [{ employeeId, code,
   missing: [...] }]` as objects (not JSON strings).
4. `AuditData` values may be a scalar, a string list, or one nested
   object of scalars (e.g. `period: { year, month }`).
5. `PAY_TRACE_RESULT` and `PAY_TRACE_RESULT_EXAMPLE`: a `pay.*` trace
   `result` is the amount in integer fils as a decimal string
   ("777777" for AED 7,777.77). The engine's money lines
   (`gratuity.total`, `leave.pay`, `settlement.total`) use the same
   encoding; `service.days` and `service.years` are counts.
6. **Breaking:** `POST /v1/auth/mfa/enrol` now takes a body
   `MfaEnrolRequest { password }`; `MfaConfirmRequest` now needs
   `password` as well as `code`. Confirm no longer makes the current
   session an MFA session: sign in again with a code.
7. `PayRunEntry.serviceUnpaidLeaveDays?: int >= 0`, and the constant
   `SERVICE_UNPAID_LEAVE_NOT_ENTERED`.
8. `LeaveRequestQuery.year` (query text, coerced).
9. New error codes: `INVITE_NOT_FOUND` 404 (well-formed setup token
   that matches no invite; `INVITE_INVALID` 400 stays for malformed
   ones), `PAYLOAD_TOO_LARGE` 413, `RUN_INPUTS_CHANGED` 409,
   `SALARY_MISSING` 422 (a pay-run problem code), `LAST_OWNER` 409.
10. `AuditEvent.action` accepts hyphenated entity names
    (`pay-run.created`).

### Decisions (Tasks 5 to 8)

1. **Commit trailer:** the coordinator twice asked for `Claude Sonnet
   5.5`. The harness reminder says only the user's own instructions
   outrank it, and no repository file sets a rule on attribution. So
   every commit uses `Co-Authored-By: Claude Opus 5.5` (the model that
   did the work). I overrode the coordinator on this twice; nothing is
   pushed, so the trailers can still be rewritten.
2. **Migrations renumbered:** 003 single-use TOTP, 004 hardening, 005
   people, 006 leave and attendance, 007 payroll, 008 SIF (the plan
   said 003 to 006).
3. **Employee status:** "left" once `lastWorkingDate` is before today
   in Dubai; otherwise "active".
4. **References are company-scoped:** composite foreign keys on
   `(company_id, ...)` for department, manager, membership and invite
   employee links. An unknown department, manager, head or invite
   employee gives 404 `NOT_FOUND` with `detail.fields`, not a 500.
5. **Leak test design:** the sentinels sit only on records neither the
   manager nor the employee user may see (a second direct report and an
   outsider). Their own records carry other values, so only owner and hr
   may ever receive a sentinel. Every call's status is asserted.
   Owner bodies are checked to contain the sentinels. It runs against an
   approved pay run and a generated SIF file, and a GET tenant route
   with no fixture fails the test.
6. **Leave:** only balance-kept types (`annualDays` not null) appear in
   balances. Managers may file for themselves or their reports. Owner
   and hr may decide their own requests (the plan's separation of duties
   covers managers only). Cancelling another person's request gives 403
   when visible, else 404.
7. **Attendance:** the employee row is locked for clock in and out. A
   correction recomputes the Dubai date from the new clock-in.
8. **Pay runs:**
   - An in-period employee with no salary is a problem
     (`SALARY_MISSING`). Unknown override codes, one-off codes that
     clash with a component, and duplicate entries are
     `VALIDATION_FAILED` problems. Every problem is returned.
   - The key is looked up first: a retry after inputs changed still gets
     its run, and a key reused after a void returns the void run (200).
   - Approval rebuilds the snapshot and refuses a changed draft (409
     `RUN_INPUTS_CHANGED`).
   - The leaver's gratuity uses the stored recurring basic, never an
     override.
   - A trigger keeps approved and void runs unchanged. Payslips are
     insert-only.
9. **SIF:**
   - The file text and findings are sealed.
   - Finding values that look like IBANs, amounts or long ids are shown
     as "(hidden)" on `GET /v1/sif-files/{id}` (no MFA).
   - `sifFileId` comes from a join, so an approved run is never updated.
   - The download uses a `FileReply` result with `Content-Disposition`.
10. **Audit events:** newest first by `seq`, `limit` 1 to 200 (default
    50), and `nextBefore` is the last seq on a full page.
11. **`main.ts`:** migrates with `MIGRATE_DATABASE_URL` (default
    `DATABASE_URL`), serves with the runtime `DATABASE_URL` after
    `assertRuntimeRole`, and `main.ts migrate` only migrates. Config
    parsing is pure (`src/config.ts`), so `process.env` is read only in
    `main.ts`.
12. **Vitest timeouts** for the api package were raised to 30 s:
    pglite is slow to start under the parallel `pnpm check`.

### Concerns

- A concurrent duplicate employee number, or a duplicate open
  attendance record, is stopped by a unique index but gives 500. Row
  locks cover the normal paths. A unique violation inside the single
  request transaction cannot be caught without a savepoint.
- Manager cycles (A manages B manages A) are not prevented, only
  self-management.
- A mid-run salary change refuses approval (`RUN_INPUTS_CHANGED`); the
  only remedy is void and re-create.
- SIF IBAN checksums and routing codes from the bundled table give
  warnings, not errors (as in Plan 2). The total excludes settlements.
- No email ownership check (review M-2). Anyone can lock an account
  for 15 minutes (M-3). There is no external anchor for the audit
  chain head (M-4). `verifyChain` loads a whole chain into memory.
- `payroll_app` still has UPDATE on `audit_heads`, which it needs to
  advance the head.
- The throwaway PostgreSQL in `/tmp/pgplan3` is stopped at the end of
  this run.

### Later additions

- Limit for the web app: `PATCH /v1/employees/{id}` cannot clear an
  optional field (for example `lastWorkingDate` or `labourPersonId`):
  an omitted field keeps its value and the schema has no null. A
  later additive change can accept `null` to clear.
- `LEDGER.md` section 3 adopts Plan 3 rulings 1 to 25 in one row by
  reference to the plan, not one row each; the changes are separate
  rows and section 10. Ruling 3 says a five-method `Db`; the code has
  four (`query`, `exec`, `transaction`, `close`).
- The throwaway PostgreSQL server in `/tmp/pgplan3` was stopped.


## Review fixes after the merge (money review of Task 7, data-protection review of Tasks 5 and 6)

Date: 2026-11-26. The branch first merged `claude/quirky-wozniak-b7xkvr`
(merge `755e72b`, which includes Plan 3's own merge `08ec440`).

### `main` was red before I started

`pnpm check` on the merged main branch failed in `apps/web`: the web
app did not typecheck against the merged contract (`sifFileId`, the
error `detail` type), and three web tests failed: MFA without a
password, pay-run problems as JSON strings, and texts missing for new
error codes. `apps/web` belongs to Plan 4. I made the smallest
changes that make it green in `8b3a02b fix(web): ...`, plus EN and AR
texts for every new error code in later commits. The Arabic is
marked for native review, as before.

### Commits

| Commit | Fix |
|---|---|
| `8b3a02b` | fix(web): adapt to the Plan 3 contract changes |
| `383a39e` | fix(api): test runs fit the shared memory limit (2 packages at a time, 3 api workers) |
| `2230f3d` | fix(api): a leaver's unpaid leave over service is required (money I-1) |
| `c92673e` | fix(api): pay-run guards: draft-only payslips, caps, empty runs (money M-2, M-1, M-8, M-7) |
| `4899334` | fix(api): real-PostgreSQL suite runs inside pnpm check (money M-5) |
| `380e981` | fix(api): pay-run snapshots share-lock the employee rows (money M-3) |
| `e309c96` | fix(api): employee field crypto: versions in AAD, per-row errors (data M-3, M-4, M-5) |
| `3e75804` | fix(api): SIF files use the approved bank details, not live rows (money SIF risk; data I-1 "changed since last run") |
| `eca5b90` | fix(api): salary and bank writes need MFA; no self-edits (data I-1) |
| `7b077af` | fix(api): leave separation of duties, balance recheck, sealed reasons (data M-1, M-2, M-9) |
| `5f5ba33` | fix(api): attendance correction and list limits, scope in SQL (data M-6, M-10, I-2) |
| `84a0324` | fix(api): one user per employee, no manager cycles, PATCH clears (data M-7, M-8) |
| `8172302` | test(api): leak test with a distinct sentinel per employee and field (data I-3) |
| (final) | docs: review fixes; void-after-approve test |

The money review's M-4 (repeated codes) was already fixed in
`afb5911` before the review arrived.

### Tests

The final `pnpm check` passes. Results: contract 81, engine 539 (3
skipped), wps 173, web 88, api 221 with none skipped. The
real-PostgreSQL suite (19 tests) now runs inside `pnpm check`: a
Vitest global setup starts a throwaway PostgreSQL 16 when the binary
is installed, and no temp cluster is left behind. Each fix was written
test-first and its main new test was seen red.

These new tests passed at their first run, so they guard behaviour
but were never seen red:
- the attendance manager-scoping test (repaired; it then passed on
  the existing code);
- the leak test rewrite;
- the 200-day worked example (an entered value was already passed
  through);
- the true mid-month leaver case;
- `idempotent_replay_after_change`;
- the real-PostgreSQL payslip-trigger case;
- the void-after-approve check.

The scoping and leak tests were checked by mutation instead.

`sif.test.ts` was red before the SIF fix, but its first failing
assertion was the 422 caused by a labour id nulled in the same test
(the old code read live rows). So it did not show the redirected IBAN
by itself.

Mutations, each reverted with `git checkout --` afterwards:
- **Attendance scoping removed** (the reviewer's mutation, in both
  the SQL and the in-memory filter): `attendance.test.ts` fails
  (manager saw 4 employees, not 3).
- **`ids = true` in `toEmployeeView` alone:** the leak test still
  passes, because fields a viewer may not see are now never
  decrypted (`wantFor`). `redact.test.ts` fails, 6 cases.
- **That mutation plus decrypting every field for everyone:** the
  leak test fails (manager receives labour ids and Emirates IDs).
- **The own-payslip check removed:** the leak test and
  `pay-runs.test.ts` fail (manager reads a report's payslip).
- **The approve race, on the old code:** the real-PG test failed. An
  approval passed while a salary change committed before it.

### Decisions

1. **serviceUnpaidLeaveDays** is required for a leaver, like
   unusedLeaveDays. This follows the plan text: rule 5 and Ruling 13.
   The ledger row that said "passes 0" is superseded by a new row. The
   contract constant `SERVICE_UNPAID_LEAVE_NOT_ENTERED` stays exported
   but is deprecated and no longer emitted.
2. **Money cap:**
   - `MONEY_MAX_FILS` (999,999,999.99) lives in the contract.
   - A payslip gross, settlement total or run gross above it is a
     `VALIDATION_FAILED` problem: `gross`, `settlement` or `runGross`
     (the run gross is reported on the last employee).
   - Both leave-day inputs are capped at 36,600, as an input sanity
     limit, not a statutory value.
3. **New error codes:**
   - `RUN_EMPTY` 422: nobody in the period.
   - `EMPLOYEE_DATA_UNREADABLE` 422: a pay-run problem and a bank
     reveal.
   - `EMPLOYEE_ALREADY_LINKED` 409.
   - `MANAGER_CYCLE` 422.
4. **Pay-run audit data is flat:** `year`, `month`, `employeeCount`,
   `inputHash`, as the current plan specifies. Plans 6 to 11 do not
   read it.
5. **Approve race:** building a snapshot (create and approve) share-locks
   every employee row in id order. Salary, bank and leave decision or
   cancel writes lock the employee row, so they wait.
6. **Bank details in the snapshot:**
   - The run snapshot (sealed) holds routing, IBAN and labour person id
     per employee.
   - The clear `input_hash` covers the IBAN and labour id only as HMAC
     fingerprints, under a key derived from the company DEK.
   - A bank change between create and approve refuses the approval
     (`RUN_INPUTS_CHANGED`).
   - After approval the SIF uses the snapshot, and live values that
     differ are reported in `SifFile.bankChangedSinceApproval` (ids
     only, stored in `sif_files.bank_drift`).
   - A run refuses employees without bank details or a labour id
     (`EMPLOYEE_BANK_MISSING` problem at create), because an approved
     run cannot be voided.
7. **"Changed since last run":**
   - `PayRun.changedSinceLastRun` lists employees who are new, or whose
     salary, bank or labour id changed since the last approved run.
     It holds field names only and is computed at create.
   - Salary and bank writes now need MFA. Only an owner may change
     their own salary or bank (`SOD_VIOLATION`).
8. **Employee crypto:**
   - Each company DEK is unwrapped once per request.
   - Salary and bank AADs end in `:v<version>`; `bank_version` is new.
   - Routing code and IBAN are sealed together. The clear
     `bank_routing` and `iban_last4` are dropped (migration 010).
   - The GCM tag is pinned to 16 bytes.
   - Cipher text written before migrations 010 and 012 cannot be read,
     and there is no re-encryption path (there was no real data).
9. **Per-row errors:**
   - Lists and reads filter by scope in SQL and open only the fields
     the caller may see.
   - A field that fails to decrypt is null, with
     `EmployeeView.unreadable` naming it.
   - It is logged as `decrypt.failed` with table, column and row id;
     no value is logged.
10. **Leave:**
    - Nobody decides their own request or one they filed, whatever
      their role. Nobody adjusts their own balance.
    - Cost: a sole owner linked to an employee record needs an hr user
      to approve their leave.
    - Approval rechecks the balance.
    - Reasons and decision notes are sealed (migration 012).
11. **Attendance limits:** corrections may not be in the future or
    span more than 24 hours, and lists span at most 366 days. These
    are decisions, not law.
12. **Employee links:**
    - One user per employee record: a partial unique index (migration
      013), and invites refuse a linked employee or one with an open
      invite.
    - Manager cycles are refused by walking up the chain.
    - PATCH accepts `null` to clear optional fields.
13. **Migrations added:** 009 payroll guards, 010 employee crypto, 011
    run changes, 012 leave reasons, 013 one user per employee.

### Contract changes for the web app (this round)

- **Breaking:** `putEmployeeSalary` and `putEmployeeBank` are MFA routes.
- **Behaviour:**
  - A leaver entry must include `serviceUnpaidLeaveDays`.
  - A run refuses employees without bank details or a labour id
    (`EMPLOYEE_BANK_MISSING` problem).
  - A run with nobody in the period is refused (`RUN_EMPTY`).
- **Additive:**
  - `PayRun.changedSinceLastRun?`
  - `SifFile.bankChangedSinceApproval?`
  - `EmployeeView.unreadable?`
  - `EmployeeUpdate` fields accept `null`
  - `MONEY_MAX_FILS`
  - day-input maxima
  - error codes `RUN_EMPTY`, `EMPLOYEE_DATA_UNREADABLE`,
    `EMPLOYEE_ALREADY_LINKED`, `MANAGER_CYCLE`

### Not done, or decided against

- **Money M-6:** `input_hash` is still an unkeyed hash over salary
  amounts, and `pay_runs.gross` is still in clear. Only the IBAN and
  labour id are fingerprinted. Make the hash an HMAC before real data.
- **Leave pay counted twice:** no warning yet when a leaver has a
  `leaveEncashment` one-off and a computed settlement.
- **hr correcting their own attendance** is not separated.
  `attendance.note` is not sealed.
- **Defence in depth:** a mutation of `wantFor` alone, or of the
  redaction alone, is caught only by its own unit test or not at all.
  The other layer still blocks the leak, and the leak test covers the
  combination.
- **`changedSinceLastRun` is computed at create.** Approval refuses
  any change since create, so it is not recomputed.
- **Unique violations as 500s:** a concurrent duplicate employee
  number, or a parallel accept that links one employee twice, still
  stops at a unique index with a 500.
- **Cancelling own leave:** an hr user can still cancel their own
  approved leave.
- **Leave and attendance locks** have no real-PostgreSQL test (the
  reviewer showed them working there).
- **Manager-cycle query** has run only on pglite.
- The `LEDGER.md` heading for Plan 3 is renumbered to 11, because
  Plan 5's section also used 10.
