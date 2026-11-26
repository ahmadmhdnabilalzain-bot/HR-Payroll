# Plan 4 build report (web app)

Date: 2026-11-26. Branch `plan-4-web-app`, worktree
`.claude/worktrees/agent-a547533b6da99f6d3`. It starts from 7ddbda2
(Plan 3 Task 1, `packages/contract`) and merges
`claude/quirky-wozniak-b7xkvr`. Nothing is pushed.

## Status

Task 1 is done. **Tasks 2 to 9 are stopped on the owner's decision.** The
look and the navigation will be redesigned: no standard sidebar shell,
more motion. The UI kit, shell, routing, screens and screenshots wait
for a new plan once the owner picks a design concept. Task 1 is the
non-visual base that the redesign keeps:

- the contract adapter
- the mock API and the HTTP adapter
- the i18n catalogs and formatting
- the amount parser
- the theme tokens

The visual parts of Task 1 are deliberately bare: `App.tsx` with a
language switch and a theme switch.

Two small non-visual pieces were pulled forward from later tasks
because they belong to this base and are fully specified:

- `parseAmountInput` with its test (Task 5)
- the HTTP adapter tests (Task 9 Step 3)

## Commits

1. `chore(lines): check apps and tsx, css, html files`. The repo line
   checker now covers `apps/`, the `.tsx`, `.css` and `.html`
   extensions, and skips `test-results` and `playwright-report`. Each
   new case has a test.
2. `feat(web): scaffold, tokens, i18n and mock API`. Plan 4 Task 1.

## Tests

- `pnpm check` passes. The line-length check, typecheck and tests all
  pass for engine, contract, wps and the 88 web unit tests.
- The Playwright smoke passes 8 of 8: Chromium, desktop at 1280 and
  phone at 360. It runs with `pnpm --filter @payroll/web e2e` and
  `--trace off`.
- Web unit tests (Vitest with jsdom):
  - tokens contrast
  - style rules: logical properties only, colours only in `tokens.css`
  - boundaries: contract imported once, wps only in the mock, money
    wire format only in `contract.ts`, clock only in `main.tsx`
  - i18n: every key present, placeholders, plurals, NEEDS NATIVE
    REVIEW headers, every contract error code has text
  - formatting: money with LTR isolates, Gregorian dates with Western
    digits, Dubai time, today in Dubai
  - contract mapping: money round trip, examples, the permissions
    table against `ROUTES`
  - routes map
  - mock client: sessions, MFA, roles, failure injection, empty and
    large seeds, pay equals the sum of lines, partial-month problems,
    idempotency, session expiry, SIF via `@payroll/wps` with no errors
    and CRLF, audit chain and tamper detection
  - mock rules: separation of duties on approval, leave rules, bank
    and WPS settings missing, invite, MFA enrolment, audit paging
  - HTTP adapter: auth headers, money to Fils, error envelope, network
    failure, schema mismatch naming the path, idempotency header, text
    download, query string, decoding of pay-run problems
  - SHA-256 against `node:crypto`
  - config and URL mock switches, prefs
  - bundle: the engine builds as a browser bundle with no Node imports
    and computes AED 38,333.33; the gratuity code is not in the entry
    chunk

## Contract changes needed (for the owner of `packages/contract`)

`packages/contract` was not edited. Each gap is handled in `apps/web`
and listed here:

1. **`PayRun.sifFileId: Id | null`.** Without it, the WPS screen has to
   call `POST /v1/pay-runs/{id}/sif` (which returns the stored file) to
   find a run's file.
2. **A route to change a member's role**, for example `PATCH
   /v1/users/{id}` with `{ role }`, owner only and audited. Until then,
   roles can only be set when inviting (Ruling W27).
3. **The wire encoding of `TraceLine.result` for `pay.*` lines.** The
   contract example uses `"777777"`, which is integer fils, and the
   mock follows it. The app never displays that field: it takes amounts
   from the payslip lines (W10). The contract should still say which
   encoding it uses.
4. **Pay-run problems in the error body.** `ApiErrorBody.detail` holds
   only `string | string[]`, but `PAY_RUN_PROBLEMS` has to carry
   `PayRunProblem` objects. The app's interim encoding is
   `detail.problems` as an array of JSON strings, one per problem
   (`src/api/errors.ts`, `encodeProblems` and `decodeProblems`). The
   ask: allow `PayRunProblem[]` in the detail, or give it a dedicated
   field.
5. **`PayRunEntry.serviceUnpaidLeaveDays`.** Plan 4 wants unpaid leave
   days over the whole service for a leaver's gratuity, and the entry
   has no field for it. Until it exists:
   - the app does not collect it;
   - the mock asks a leaver only for `unusedLeaveDays`
     (`SETTLEMENT_INPUT_REQUIRED`).
6. **`LeaveRequestQuery.year`.** The query has no year filter, so the
   client filters by start-date year after fetching (`build-client.ts`).
7. **Plan 3 conflicts with its own contract on audit actions.** The
   `AuditEvent.action` regex `^[a-z]+(\.[a-z-]+)+$` forbids a hyphen in
   the first segment, so Plan 3's `pay-run.created`, `pay-run.approved`
   and `pay-run.voided` would fail the contract's response schema. The
   mock uses Plan 3's names wherever they are valid:
   - `employee.bank.revealed`
   - `leave.requested`, `leave.approved`, `leave.rejected`,
     `leave.cancelled`
   - `sif.generated`, with `{ fileName, errorCount, warningCount }`
   - `sif.downloaded`
   - `company.updated`, with `{ changed }`

   For pay runs it uses `payroll.run-created`, `payroll.run-approved`
   and `payroll.run-voided`. `user.invited` and `user.mfa-enrolled` are
   inferred, not from Plan 3, which names no action for them. The ask:
   either allow a hyphen in the first segment of the regex, or rename
   Plan 3's pay-run actions.
8. **`INVITE_NOT_FOUND`.** Plan 3 uses this error code, but it is not in
   `ERROR_STATUS`. The app falls back to the generic message for it.
9. **Shapes that differ from Plan 4's assumptions.** No change is
   needed, but the plan should note them:
   - The users list is `CompanyUser` (`userId`), not `User & { role }`.
     `UserRow` is an alias for it.
   - The audit page field is `items`; the client renames it to
     `events` as in the plan's interface.

## Decisions (recorded here; the owner can overrule)

- **D1. One transport for both adapters.** The mock and the HTTP
  adapter are both a `Transport` (`src/api/transport.ts`). Each returns
  the response body after it passes the route's response schema, and
  one `buildClient` decodes both. The mock's handlers produce wire
  JSON. The mock also:
  - validates params, query, body and headers with the route schemas;
  - applies auth, role and MFA rules from the route definitions in
    `ROUTES`, so new contract rules reach the mock automatically;
  - turns refusals into contract `ApiErrorBody` values, decoded by the
    same `errorFromBody` as server errors.

  A mock bug therefore shows up as `CONTRACT_MISMATCH` in tests rather
  than drifting from the contract.
- **D2. `can()` and `PERMISSIONS` live in `src/api/permissions.ts`,**
  not in `contract.ts`, to keep `contract.ts` small. The test still
  compares each row with its route in `ROUTES`.
- **D3. Checks and rules in the mock, checked against Plan 3
  (`2026-11-26-plan-3-backend.md`).**
  - Order, as in Plan 3 Task 4: session (`UNAUTHENTICATED`), company
    header (`COMPANY_HEADER_REQUIRED`), membership
    (`TENANT_FORBIDDEN`), role (`FORBIDDEN`), then MFA.
  - MFA, as in Plan 3: `MFA_ENROLMENT_REQUIRED` when the user is not
    enrolled; `MFA_REQUIRED` when they are enrolled but signed in
    without a code. A wrong code gives `INVALID_CREDENTIALS`.
  - Inferred, not from Plan 3: a code sent by a user who is not
    enrolled is refused as `INVALID_CREDENTIALS`.
  - Pay rules follow Plan 3 Task 7 rules 1 to 6, including trace inputs
    `{ salaryVersion }` and `{ entry: "pay run input" }`. One exception:
    the mock returns a `refused` settlement (`MOCK_NOT_COMPUTED`, Ruling
    W25).
  - Payslip reads, as in Plan 3: owner and hr can read any payslip.
    Others can read only their own, and only once its run is approved;
    anything else is `NOT_FOUND`.
  - `SIF_GENERATION_FAILED` carries only `detail.engineCode`, as in
    Plan 3.
  - `EMPLOYEE_BANK_MISSING` lists every employee in
    `detail.employeeIds`, not only the first.

  Demo accounts:
  - `owner@demo.test` and `owner2@demo.test` are enrolled;
  - `hr@demo.test`, `manager@demo.test` and `employee@demo.test` are
    not;
  - all use the password `demo-password` and the code `123456`.
- **D4. `?mock-as=`.** It acts as that user with `mfa: true` while no
  token is set, because `AuthSource` is read-only. Signing out
  therefore does not end it, which suits Playwright.
- **D5. Seed.** It is deterministic from `today`:
  - 12 employees: a joiner on the 10th of this month with exactly basic
    and housing, and a future joiner without bank details;
  - a manager, Omar Haddad, with 3 reports;
  - last month's run, created by `owner` and approved by `owner2`, with
    its SIF;
  - one person on approved leave today and two pending requests;
  - attendance on workdays (Monday to Friday) of this month, with
    today's records still open.

  The IBAN is the registry example `AE070331234567890123456` with
  Mashreq's routing code `203320101`, whose bank id (033) matches the
  IBAN's. The validator reports no errors and no warnings; both SIF
  tests assert `errorCount` 0 and `warningCount` 0.
- **D6. The mock's SHA-256 is synchronous and in-house**
  (`src/api/mock/sha256.ts`, tested against `node:crypto`), because
  jsdom lacks `crypto.subtle`. It is used only for the audit chain and
  input hashes, never for a secret.
- **D7. Tree-shaking in `vite.config.ts`.** The config marks the
  engine, wps and contract packages free of side effects. Their
  top-level `deepFreeze` calls would otherwise pull the gratuity pack
  into every chunk. A test guards this.
- **D8. Light `--color-border` changed from `#8A99AD` to `#7D8EA4`**,
  because the old value gave only 2.90:1 on white. The plan allows this
  tuning; the test needs at least 3:1.
- **D9. Dark mode.** `ThemeProvider` always writes the resolved
  `data-theme` (light or dark), so `tokens.css` needs only `:root` and
  `:root[data-theme="dark"]`, with no media-query duplicate.
- **D10. Pay-run inputs the mock refuses.** An override for a
  component the employee does not have is refused as
  `VALIDATION_FAILED`, and a line code that appears twice as
  `DUPLICATE_COMPONENT`. Neither is silently ignored. This is inferred:
  Plan 3 does not say.
- **D11. Every write appends an audit event, including bank reveals
  and SIF downloads.**
- **D12. Commit trailers follow the dispatch: "Claude Sonnet 5.5".**
  The session's system reminder names Opus 5.5 instead, but the
  dispatch said "exactly", so its text was used.
- **D13. Two tsconfigs.** `tsconfig.json` covers `src` with only
  `vite/client` types, so browser code cannot use Node APIs.
  `tsconfig.node.json` adds `node` for tests, e2e specs and config
  files. `typecheck` runs both.

## Concerns

- Arabic text in `src` is marked NEEDS NATIVE REVIEW: the catalogs, the
  names in the seed, the company and leave-type names, the product name
  and the language's own name. A scan found no file with Arabic script
  and no marker.
- Test-first was not followed everywhere. The required red run is
  missing for these:
  - the line checker's first red run failed on a path error, not on the
    missing export;
  - `amount-input` was never run against its stub;
  - `mock-rules.test.ts`, `sha256.test.ts`, `bundle.test.ts` and the
    payslip-access and audit-name tests were written after the code
    they test.

  All of them pass now, and each asserts a specific behaviour.
- The entry bundle is 388 kB (122 kB gzip). It includes the mock, the
  wps package and zod. Loading the mock lazily once the HTTP mode is in
  use is left to the redesign plan.
- The plan's checker, review and live-API steps were not run because
  Tasks 2 to 9 are parked: the ui-consistency checkers, the per-task
  reviews for Tasks 5 and 6, and Task 9's live check against Plan 3's
  API. No fresh reviewer has read this diff.
- A few object-literal factory functions in `src/api/build-client.ts`
  run slightly over 30 lines. Each is a flat list of one-line methods.
- `HANDOVER.md` and `LEDGER.md` are not updated: the plan reserves that
  for Task 9, and the coordinator owns the merge.
