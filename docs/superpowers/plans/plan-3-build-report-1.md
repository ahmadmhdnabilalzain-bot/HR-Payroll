# Plan 3 build report 1 (Tasks 1 to 4)

Date: 2026-11-26. Branch `worktree-agent-aa6e9c5f918a01216` (not
pushed), based on `claude/quirky-wozniak-b7xkvr` at `5697439`.

## Status

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

## Decisions (Claude's calls; the owner can overrule)

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
   `confirmMfa` returns `Me` and marks the current session `mfa: true`;
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
   `INVITE_INVALID` 400 (unknown or malformed setup token),
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
12. **Grants.** `payroll_app` gets select, insert, update on the tenant
    tables and on the global `users` and `sessions` (sign-in needs
    them); no delete anywhere. Logout expires the session row.
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
    randomness. Production scrypt cost is N = 32768, r = 8, p = 1.
    Unknown emails are checked against a dummy hash at the same cost.
16. **DEK wrapping is bound to the company:** the DEK's AAD is
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

## Hand-off notes for Tasks 5 to 8

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

## Concerns for the reviewer

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
