# Web App (Arabic and English, RTL) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A bilingual (Arabic and English, real RTL), light and dark,
accessible M1 web app for UAE SME owners and HR staff that runs offline
against a typed mock API and switches to the real API with one setting.

**Architecture:** New workspace package `apps/web` (`@payroll/web`),
React 19 and Vite 8, built in its own git worktree in parallel with
Plan 3 (backend), starting from Plan 3 Task 1's commit (the
`packages/contract` package). Every server call goes through one
`ApiClient` interface with two adapters: an in-memory mock (default)
and an HTTP adapter over the contract's `ROUTES`. Only
`src/api/contract.ts` imports `@payroll/contract`; it converts wire
money to `Fils` and back, so the rest of the app never sees a money
string. The pure `@payroll/engine` runs in the browser for money
formatting, trace explanation and the end-of-service calculator; the
mock alone uses `@payroll/wps` to build realistic SIF files.

**Tech Stack:** React 19.3.1, react-dom 19.3.1, Vite 8.3.8 (already in
the lockfile), `@vitejs/plugin-react` 6.3.0, react-router 7.18.7
(library mode), `@tanstack/react-query` 5.108.4, zod 4.6.7, CSS Modules
with CSS custom properties (no CSS framework), self-hosted fonts
`@fontsource/ibm-plex-sans` 5.3.0 and `@fontsource/ibm-plex-sans-arabic`
5.3.0, Vitest 5.1.2 with jsdom 31.0.1, `@testing-library/react` 16.3.3,
`@testing-library/dom` 10.4.2, `@testing-library/user-event` 14.6.13,
axe-core 4.14.1, `@playwright/test` 1.63.0 (matches the preinstalled
Chromium 1243; browser downloads are disabled), `@axe-core/playwright`
4.14.1, `@types/react` 19.3.3, `@types/react-dom` 19.3.0, TypeScript
7.0.2. All versions pinned exactly, as in the engine.

**Spec:** `docs/superpowers/specs/2026-11-25-uae-sme-hr-payroll-design.md`
(sections 2, 5 rows 6 and 8, 6 "Arabic" and "Security", 7),
`docs/superpowers/specs/2026-11-25-master-feature-list.md` (UQ1, UQ6,
UQ9, UQ12), `docs/superpowers/plans/2026-11-26-plan-3-backend.md`
(Task 1: the contract this app consumes; its rulings on tenancy,
sessions, MFA and separation of duties), `docs/engineering-standards.md`,
`LEDGER.md` section 3 (speed ruling), `packages/engine/src/explain/`
(wording reused).

## Global Constraints

- 80-character lines in every file, `.tsx` and `.css` included; files
  under about 300 lines; functions under 30 lines.
- Money is `Fils` (bigint) from `@payroll/engine` everywhere in the app.
  The wire string `^\d{1,9}\.\d{2}$` exists only inside
  `src/api/contract.ts`. Never a JS `number` for money; never `Fils` in
  query keys, JSON or browser storage. Amounts print through
  `formatAed` ("AED 38,333.33"), Western digits.
- Amounts, IBANs, ids, file names, rule ids and times inside Arabic text
  sit in left-to-right isolates (`<bdi dir="ltr">` in markup; the
  engine's `LTR_ISOLATE` in plain strings).
- Dates are Gregorian with Western digits in both languages (locale
  `ar-AE-u-ca-gregory-nu-latn`). Timestamps display in Asia/Dubai.
  "Today" and "now" are read once in `src/main.tsx` and passed down;
  nothing else reads the clock.
- Every Arabic catalog file starts with the two lines
  `// NEEDS NATIVE REVIEW: authored by Claude, not yet confirmed by a`
  `// native speaker.` In Arabic mode the app shows the banner
  "Arabic text awaiting native review". No Arabic is labelled final.
- Never "compliant", "verified" or "approved by MOHRE" about a WPS file
  in either language. The WPS screen shows the contract's
  `SIF_STATEMENT`: "Layout matches two bank guides. Not confirmed by
  MOHRE or a bank test."
- The calculator total is labelled exactly "Computed total (excludes
  notice pay, deductions and other dues):" and lists "Not computed:
  notice pay, deductions, other dues". Pay runs and payslips list the
  contract's `notComputed` strings and never hide them.
- Every traced number shows its rule status in words (engine
  `STATUS_WORDS`): official, secondary, convention, hypothetical,
  unsourced.
- Separation of duties: the user who created a pay run cannot approve
  it (`SOD_VIOLATION`); only an owner approves. MFA-guarded actions
  (approve, bank reveal, SIF download) handle `MFA_REQUIRED` by asking
  the user to sign in again with their authenticator code.
- Mock data is obviously fake: company "Sample Trading LLC (demo)",
  emails at `demo.test`, the IBAN registry example
  `AE070331234567890123456`, and a "Sample data" badge in the top bar.
- The app computes no pay. Amounts shown are contract amounts or sums
  of them; anything needing an unsourced rule is a problem or a
  `notComputed` item, never a number.
- No physical direction in styles (`left`, `right`, `margin-left`,
  `padding-right`, `text-align: left`, `border-left`, `float: right`
  and the like); logical properties only. No hex, `rgb(` or `hsl(`
  colour outside `src/theme/tokens.css`.
- The product name lives only in `src/brand.ts` (`PRODUCT_NAME`); the
  placeholder is "HR and Payroll" / "الموارد البشرية والرواتب"
  (NEEDS NATIVE REVIEW).
- Visible keyboard focus, 44 by 44 pixel targets, no horizontal page
  scroll at 360, 768 and 1280 pixels, `prefers-reduced-motion`
  respected, loading, empty and error states on every data screen;
  error states show the server's `requestId` as "Reference".
- Shared root files (`package.json`, `pnpm-workspace.yaml`,
  `pnpm-lock.yaml`, `scripts/check-line-length.mjs` and its test)
  change only in Task 1; `HANDOVER.md` and `LEDGER.md` only in Task 9.
  A lockfile merge conflict is resolved by `pnpm install`, never by
  hand. Nothing under `packages/` is edited by this plan.

## Review Focus

- Mixed direction: in Arabic, a Latin name, an IBAN, an amount or the
  file name `0000000123456260401103000.SIF` reads in its own order, not
  reversed. Tests `ltr-isolation` (Task 2) and `wps-file-name-rtl`
  (Task 7).
- An owner who created a pay run tries to approve it: the mock API
  refuses with `SOD_VIOLATION` and the button is disabled with the
  reason. Tests `approve-refused-same-user` (API) and
  `approve-disabled-for-creator` (UI), Task 5.
- The session expires (8-hour limit) in the middle of the pay run
  wizard: the next call returns `UNAUTHENTICATED`; the app goes to
  sign-in and returns to the same step with the typed inputs kept.
  Tests `expired-session-returns-to-step` (Task 2) and
  `inputs-survive-reauth` (Task 5).
- An amount typed with Arabic-Indic digits ("١٠٠٠٠٫٥٠"), thousands
  commas ("10,000.50"), three decimals or a minus sign: the first two
  are accepted and normalised, the rest refused with a field error.
  Test `amount-input-normalises-digits` (Task 5; reused in Task 7).
- Long content at 360 pixels: a 60-character name, a salary of
  AED 9,999,999.99 and 250 employees (`?mock-seed=large`) cause no
  horizontal scroll on any route in either language. Test
  `no-horizontal-scroll` (Task 9).

---

## Design direction (decided once; every UI task uses it)

The subject is pay that people must be able to trust and check. The
look is calm, exact and quietly futuristic: cool paper and deep ink, one
Gulf-teal accent for action, and one indigo "trace" colour used only
where a number is explained. Boldness is spent in one place: the trace
view, where an expanded number shows a thin indigo thread along its
inline-start edge from amount to rule to source. No gradient washes,
no identical shadowed cards, no all-caps eyebrows, no monospace labels,
no decorative numbering. The dashboard leads with the pay run status
rail (Inputs, Draft, Approved, Salary file) and its next action, not a
big-number hero.

Tokens (`src/theme/tokens.css`; values may be tuned only to pass the
contrast test in Task 1):

| Token | Light | Dark |
|---|---|---|
| `--color-bg` | `#F5F7FA` | `#0E1726` |
| `--color-surface` | `#FFFFFF` | `#152033` |
| `--color-surface-2` | `#EDF1F6` | `#1C2A40` |
| `--color-border` | `#8A99AD` | `#5C6E8A` |
| `--color-divider` | `#D5DCE5` | `#2C3B54` |
| `--color-text` | `#0F1B2D` | `#E6EDF5` |
| `--color-text-muted` | `#4A5868` | `#A3B1C2` |
| `--color-accent` | `#0B6E78` | `#3FC1C9` |
| `--color-on-accent` | `#FFFFFF` | `#06222A` |
| `--color-trace` | `#4B4FC4` | `#A5A8FF` |
| `--color-danger` | `#B42318` | `#FF8A80` |
| `--color-warning` | `#8A5A00` | `#F2C14E` |
| `--color-warning-bg` | `#FFF4D6` | `#3A2E10` |
| `--color-success` | `#13795B` | `#5DD3A6` |
| `--color-focus` | `#2F6FEB` | `#8AB4FF` |

Spacing base 4: `--space-1` to `--space-8` = 4, 8, 12, 16, 24, 32, 48,
64 px. Type scale ratio 1.2: `--text-xs` 12, `--text-sm` 14,
`--text-md` 16, `--text-lg` 19, `--text-xl` 23, `--text-2xl` 28,
`--text-3xl` 33 px. Line height 1.5; 1.7 under `:lang(ar)`. Radius:
`--radius-control` 6px, `--radius-panel` 10px, `--radius-pill` 999px.
Font stack `"IBM Plex Sans", "IBM Plex Sans Arabic", system-ui,
sans-serif`; amounts use `font-variant-numeric: tabular-nums`. Sentence
case; buttons are verbs and the toast repeats the verb ("Approve pay
run" then "Pay run approved").

## UI consistency method (applies to Tasks 2 to 8)

The repository has no UI, so no family or majority exists. Per
`ui-consistency:decisions` ("nothing at all is written"), each role is
first written as the element whose meaning it has. Task 2 builds the
shared pieces; Tasks 2 and 3 build one reference page per kind:

- list: `src/features/employees/EmployeesPage.tsx` (Task 3)
- detail: `src/features/employees/EmployeeProfilePage.tsx` (Task 3)
- form and flow: `src/features/auth/SignInPage.tsx` (Task 2)

Later checklist lines are settled by "the shared piece (Task 2)", "as
the reference" or "this plan". Every UI task carries its checklists
and these three steps:

1. Re-read the checklists before writing; do not work from memory.
2. Report the pages ready for their check. The checker of the kind (one
   agent with `ui-consistency:verifying` per kind, calibrated once on a
   scratch copy of the reference with one planted difference outside
   the repository, never the author and never the planter) checks
   them; fix what it reports.
3. Report the status in this plan: `done` once the check passes, or
   `parked — <why>`.

Per the speed ruling the checkers run inside the whole-branch review
(Task 9 Step 8); Tasks 5 and 6 also get a per-task review because they
show money and enforce separation of duties (Rulings W19, W20).

---

### Task 1: Scaffold, design tokens, i18n and the mock API layer

Mergeable alone: after this task `pnpm check` passes, `pnpm web`
serves a page with the product name, a language switch and a theme
switch, and the mock answers every `ApiClient` method. Precondition:
the worktree branch contains Plan 3 Task 1 (`packages/contract`); if
not, merge that commit first.

**Files** (paths under `apps/web/` unless rooted):
- Modify: `pnpm-workspace.yaml` (add `"apps/*"`), root `package.json`
  (scripts `web`, `web:build`, `e2e`), `scripts/check-line-length.mjs`
  (roots add `apps`; extensions add `.tsx`, `.css`, `.html`; skip dirs
  add `test-results`, `playwright-report`) and its test (one case per
  new extension).
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`,
  `vitest.config.ts` (jsdom; `include: ["tests/**/*.test.ts?(x)"]`, so
  Playwright specs are never picked up), `playwright.config.ts`,
  `index.html`, `.env.example` (`VITE_API_MODE=mock`, `VITE_API_BASE=`)
- Create: `src/main.tsx`, `src/App.tsx`, `src/brand.ts`, `src/config.ts`,
  `src/theme/tokens.css`, `src/theme/base.css`,
  `src/theme/ThemeProvider.tsx`, `src/lib/prefs.ts`, `src/lib/today.ts`
- Create: `src/i18n/types.ts`, `src/i18n/t.ts`, `src/i18n/format.ts`,
  `src/i18n/amount-input.ts`, `src/i18n/LocaleProvider.tsx`,
  `src/i18n/en/common.ts`, `src/i18n/en/errors.ts`,
  `src/i18n/en/index.ts`, and the same three under `src/i18n/ar/`
- Create: `src/api/client.ts`, `src/api/errors.ts`,
  `src/api/contract.ts`, `src/api/routes-map.ts`, `src/api/select.ts`,
  `src/api/http/http-client.ts`, `src/api/mock/mock-client.ts`,
  `src/api/mock/handlers-*.ts` (one per area: auth, people, leave,
  payroll, sif, audit), `src/api/mock/seed.ts`,
  `src/api/mock/seed-large.ts`, `src/api/mock/pay.ts`,
  `src/api/mock/sif.ts`, `src/api/mock/audit.ts`,
  `src/api/mock/options.ts`
- Test: `tests/unit/tokens.test.ts`, `tests/unit/style-rules.test.ts`,
  `tests/unit/boundaries.test.ts`, `tests/unit/i18n.test.ts`,
  `tests/unit/format.test.ts`, `tests/unit/contract-map.test.ts`,
  `tests/unit/routes-map.test.ts`, `tests/unit/mock-client.test.ts`,
  `tests/unit/brand.test.ts`, `e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: `@payroll/contract` (names from Plan 3 Task 1: `Company`,
  `CompanyUpdate`, `User`, `Membership`, `LoginRequest`,
  `LoginResponse`, `Me`, `InviteRequest`, `InviteResponse`,
  `MfaEnrolResponse`, `Department`, `EmployeeView`, `SalaryComponent`,
  `BankDetails`, `BankMasked`, `LeaveType`, `LeaveRequest`,
  `LeaveRequestCreate`, `LeaveDecision`, `LeaveBalance`,
  `AttendanceRecord`, `AttendanceQuery`, `TraceLine`, `PayRunEntry`,
  `PayRunCreate`, `PayRunProblem`, `PayRun`, `PayslipLine`,
  `Settlement`, `Payslip`, `Finding`, `SifFile`, `SIF_STATEMENT`,
  `NOT_COMPUTED_PAY`, `AuditEvent`, `AuditVerifyResult`, `Role`,
  `ERROR_CODES`, `ApiErrorBody`, `ROUTES`, `EXAMPLES`), in
  `src/api/contract.ts` only.
- Consumes: `@payroll/engine` (`Fils`, `fils`, `formatAed`, `parseAed`,
  `add`, `LTR_ISOLATE`, `STATUS_WORDS`, `MESSAGES`, `explainTrace`,
  `MONEY_IDS`); `@payroll/wps` (`generateSif`, `validateSif`) in
  `src/api/mock/` only.
- Produces `src/api/contract.ts`: app-side types with `Fils` amounts,
  named `App<Name>` where the wire type carries money
  (`AppSalaryComponent`, `AppEmployee`, `AppPayRun`, `AppPayRunCreate`,
  `AppPayslipLine`, `AppPayslip`, `AppSettlement`, `AppSifFile`); the
  rest re-exported unchanged; `fromWire<Name>(w): App<Name>`,
  `toWire<Name>(a)` where the app sends money, and `toWireMoney(f:
  Fils): string` (two decimals; negative throws `NEGATIVE_AMOUNT`).
  Also `type Permission` and `can(role: Role, p: Permission): boolean`
  with this table (from Plan 3 `ROUTES`): `employees.read` owner, hr,
  manager; `employees.bank` owner, hr; `leave.decide` owner, hr,
  manager; `payroll.prepare` owner, hr; `payroll.approve` owner;
  `wps.generate` owner, hr; `company.edit` owner; `users.manage` owner;
  `audit.read` owner, hr. The `employee` role has no app access in M1.
- Produces `src/api/client.ts` (every method maps to one `ROUTES`
  entry through `src/api/routes-map.ts`):

```ts
export interface ApiClient {
  login(r: LoginRequest): Promise<LoginResponse>;
  logout(): Promise<void>;
  me(): Promise<Me>;
  mfaEnrol(): Promise<MfaEnrolResponse>;
  mfaConfirm(code: string): Promise<Me>;
  getCompany(): Promise<Company>;
  updateCompany(u: CompanyUpdate): Promise<Company>;
  listDepartments(): Promise<Department[]>;
  listEmployees(): Promise<AppEmployee[]>;
  getEmployee(id: string): Promise<AppEmployee>;
  revealBank(id: string): Promise<BankDetails>;
  listLeaveTypes(): Promise<LeaveType[]>;
  listLeaveRequests(q?: LeaveListQuery): Promise<LeaveRequest[]>;
  createLeaveRequest(r: LeaveRequestCreate): Promise<LeaveRequest>;
  approveLeave(id: string, d: LeaveDecision): Promise<LeaveRequest>;
  rejectLeave(id: string, d: LeaveDecision): Promise<LeaveRequest>;
  cancelLeave(id: string): Promise<LeaveRequest>;
  listLeaveBalances(employeeId: string, year: number):
    Promise<LeaveBalance[]>;
  listAttendance(q: AttendanceQuery): Promise<AttendanceRecord[]>;
  listPayRuns(): Promise<AppPayRun[]>;
  getPayRun(id: string): Promise<AppPayRun>;
  createPayRun(body: AppPayRunCreate, idempotencyKey: string):
    Promise<AppPayRun>;
  approvePayRun(id: string): Promise<AppPayRun>;
  voidPayRun(id: string): Promise<AppPayRun>;
  listPayslips(runId: string): Promise<AppPayslip[]>;
  getPayslip(id: string): Promise<AppPayslip>;
  createSif(runId: string): Promise<AppSifFile>;
  getSifFile(id: string): Promise<AppSifFile>;
  downloadSif(id: string): Promise<string>;
  listAuditEvents(q?: { before?: number; limit?: number }):
    Promise<{ events: AuditEvent[]; nextBefore: number | null }>;
  verifyAudit(): Promise<AuditVerifyResult>;
  listUsers(): Promise<UserRow[]>;
  inviteUser(r: InviteRequest): Promise<InviteResponse>;
}
```

  `LeaveListQuery = { employeeId?: string; status?:
  LeaveRequest["status"]; year?: number }`; `UserRow = User & { role:
  Role }` (Plan 3's users list).
- Produces `src/api/errors.ts`: `class ApiError extends Error { code:
  string; status: number; requestId: string | null; detail:
  Record<string, string | string[]> }`; client-only codes `NETWORK` and
  `CONTRACT_MISMATCH` (response failed its schema; detail names the
  path).
- Produces `src/api/select.ts`: `createApi(cfg: AppConfig, auth:
  AuthSource, mock: MockOptions, clock: () => string): ApiClient` (the
  one switch), where `AuthSource = { token(): string | null;
  companyId(): string | null }` and `clock` returns "now" as ISO
  (`main.tsx` passes `() => new Date().toISOString()`).
- Produces `src/api/http/http-client.ts`: `createHttpApi(base: string,
  auth: AuthSource, fetchFn: typeof fetch): ApiClient`. It sends
  `Authorization: Bearer` and `X-Company-Id` as Plan 3 specifies; auth
  transport lives only in this file.
- Produces `src/api/mock/options.ts`: `interface MockOptions { today:
  string; latencyMs: number; seed: "demo" | "empty" | "large";
  failures: ReadonlySet<keyof ApiClient>; signInAs: string | null;
  seedPatch?: (s: MockSeed) => MockSeed }` (`seedPatch` for tests
  only: a tampered audit event, a SIF with a `TOTAL_MISMATCH` error,
  employees without bank details in a run);
  `mockOptionsFromUrl(search: string, today: string): MockOptions`
  (`?mock-fail=listEmployees,getCompany`, `?mock-seed=empty|large`,
  `?mock-latency=0`, `?mock-as=hr@demo.test` signs that user in with
  `mfa: true`, for Playwright).
- Mock sessions: the token is `mock:<userId>:<mfa>:<expiresAt>`, so a
  reload in mock mode keeps the user signed in while the mock re-seeds
  (data created before the reload is gone; the "Sample data" badge
  tooltip says so).
- Produces `src/api/mock/mock-client.ts`: `createMockApi(o:
  MockOptions, auth: AuthSource, clock: () => string): ApiClient`
  (`clock` returns "now" as ISO; tests advance it). It follows Plan 3's
  rules and codes: roles per route; `MFA_REQUIRED` on approve, bank
  reveal and SIF download when the session has `mfa: false`;
  `SOD_VIOLATION` (approving one's own pay run or leave),
  `RUN_NOT_DRAFT`, `RUN_NOT_APPROVED`,
  `LEAVE_NOT_PENDING`, `LEAVE_OVERLAP`, `INSUFFICIENT_BALANCE`,
  `LEAVE_CROSSES_YEAR`, `PAY_RUN_PROBLEMS` (`detail.problems`),
  `RUN_EXISTS_FOR_PERIOD`, `IDEMPOTENCY_KEY_REUSED`,
  `EMPLOYEE_BANK_MISSING`, `COMPANY_WPS_SETTINGS_MISSING`,
  `INVALID_CREDENTIALS`, `FORBIDDEN`, `NOT_FOUND`, and
  `UNAUTHENTICATED` once `clock()` passes `expiresAt`.
- Produces `src/config.ts`: `type ApiMode = "mock" | "http"`;
  `readConfig(env: Record<string, string | undefined>): AppConfig`
  (`{ apiMode; apiBase }`; unknown mode throws `CONFIG_API_MODE`).
- Produces `src/i18n/types.ts`: `type Lang = "en" | "ar"`;
  `EnPlural { one; other }`; `ArPlural { zero; one; two; few; many;
  other }`; the Arabic catalog type is derived from the English one
  (same keys; plural values become `ArPlural`), so a missing key fails
  typecheck.
- Produces `src/i18n/t.ts`: `type MessageKey`; `createT(lang: Lang):
  (key: MessageKey, vars?: Record<string, string | number>) => string`
  (`{name}` placeholders; a plural value needs `vars.count` and is
  chosen with `Intl.PluralRules`); `errorText(e: ApiError, t): string`
  (`errors.<code>`, else the generic message).
- Produces `src/i18n/format.ts`: `formatMoney(f: Fils, lang: Lang):
  string`; `formatDate(iso: string, lang: Lang): string`;
  `formatTime(isoTimestamp: string, lang: Lang): string` (Asia/Dubai,
  `HH:MM`); `formatNumber(n: number, lang: Lang): string`;
  `dirOf(lang: Lang): "ltr" | "rtl"`.
- Produces `src/i18n/amount-input.ts`: `parseAmountInput(text: string):
  Fils` (body and tests in Task 5; a stub that throws until then).
- Produces `src/i18n/LocaleProvider.tsx`: `useLocale(): { lang; dir; t;
  setLang }`; sets `<html lang dir>`.
- Produces `src/theme/ThemeProvider.tsx`: `type ThemePref = "light" |
  "dark" | "system"`; `useTheme(): { pref; resolved; setPref }`; sets
  `<html data-theme>`.
- Produces `src/lib/today.ts`: `todayInDubai(now: Date): string`.
- Produces `src/brand.ts`: `PRODUCT_NAME: Readonly<Record<Lang,
  string>>`.

- [ ] **Step 1: Prove the toolchain.** Create `package.json` (name
  `@payroll/web`, `type: module`, scripts `dev`, `build`, `preview`,
  `typecheck` = `tsc --noEmit`, `test` = `vitest run`, `e2e` =
  `playwright test`; workspace dependencies `@payroll/contract`,
  `@payroll/engine`, `@payroll/wps`), `tsconfig.json` (extends the
  base; `jsx: react-jsx`; `lib` ES2022, DOM, DOM.Iterable; `types:
  ["vite/client"]`), `index.html` and a one-component `src/App.tsx`.
  Run `pnpm install`, then `pnpm --filter @payroll/web typecheck` and
  `pnpm --filter @payroll/web build`. Expected: both exit 0 (TS 7 with
  JSX, and Vite bundling the engine's `.ts` exports). If either fails,
  stop and record the error; do not change TypeScript or Vite versions
  without a ruling.
- [ ] **Step 2: Write the failing unit tests.**
  - `tokens.test.ts` › `contrast-pairs-pass`: parse `tokens.css` for
    both themes; WCAG ratio at least 4.5 for text, text-muted, accent,
    trace, danger and success on surface and on bg, warning on
    warning-bg, on-accent on accent; at least 3 for focus and border on
    surface.
  - `style-rules.test.ts` › `no-physical-direction` (no `.css` or
    `.tsx` under `src` matches `(margin|padding|border)-(left|right)`,
    `\b(left|right)\s*:`, `text-align:\s*(left|right)` or
    `float:\s*(left|right)`); › `no-colour-literals` (no `#hex`,
    `rgb(` or `hsl(` outside `tokens.css`).
  - `boundaries.test.ts` › `contract-imported-once` (only
    `src/api/contract.ts` imports `@payroll/contract`);
    › `wps-only-in-mock`; › `no-other-workspace-imports` (only engine,
    wps and contract); › `money-wire-only-in-contract` (no file but
    `contract.ts` calls `parseAed` or `toWireMoney`); › `clock-only-in-
    main` (no zero-argument `new Date()` and no `Date.now(` outside
    `src/main.tsx`; other code builds dates from ISO strings with
    `Date.UTC` or `new Date(iso)`).
  - `i18n.test.ts` › `ar-has-every-en-key`, › `same-placeholders`
    (equal `{name}` sets per key), › `no-empty-strings`,
    › `ar-files-flagged` (each `src/i18n/ar/*.ts` starts with the
    NEEDS NATIVE REVIEW lines), › `plurals-en-ar` (`common.employees`:
    en "0 employees", "1 employee", "3 employees"; ar uses forms zero,
    one, two, few, many, other at counts 0, 1, 2, 3, 11, 100).
  - `format.test.ts` › `money-ltr-isolated` (`formatMoney(fils(
    3833333n), "ar")` is `"⁦AED 38,333.33⁩"`; en has no
    isolate); › `date-latin-gregorian` (`formatDate("2026-11-26",
    "ar")` contains `2026` and no character in U+0660 to U+0669);
    › `time-in-dubai` (`formatTime("2026-11-26T05:15:00Z", "en")` is
    `"09:15"`); › `today-dubai` (`todayInDubai(new Date(
    "2026-11-25T21:30:00Z"))` is `"2026-11-26"`).
  - `contract-map.test.ts` › `money-round-trip` (wire `"1234.00"` to
    `fils(123400n)` and back); › `negative-refused`;
    › `examples-map` (every money-bearing entry of `EXAMPLES` maps
    with `fromWire*` without throwing); › `permissions-match-routes`
    (for each permission, the roles `can` grants equal the roles of its
    representative route in `ROUTES` minus `employee`, since the
    employee role has no app access: `employees.bank` and
    `GET /v1/employees/{id}/bank`, `payroll.approve` and
    `POST /v1/pay-runs/{id}/approve`, and so on for all nine).
  - `routes-map.test.ts` › `every-method-has-a-route` (each `ApiClient`
    key maps to a `METHOD path` present in `ROUTES`);
    › `no-route-mapped-twice`.
  - `mock-client.test.ts` › `login-without-totp-mfa-false` (owner signs
    in without a code: `me().session.mfa` is false);
    › `login-with-totp` (code `123456` gives `mfa: true`; `000000`
    throws `INVALID_CREDENTIALS`); › `mfa-required-on-approve`;
    › `role-forbidden` (manager `listPayRuns` throws `FORBIDDEN`);
    › `failure-injection` (`listEmployees` in `failures` rejects with
    `NETWORK`); › `empty-seed`; › `large-seed` (250 employees, one name
    of 60 characters, one salary of AED 9,999,999.99);
    › `pay-is-sums` (each payslip `gross` and `net` equal the sum of
    its lines; no deduction line exists); › `partial-month-problem` (a
    joiner on the 10th without overrides gives `PAY_RUN_PROBLEMS` with
    `ENTERED_AMOUNTS_REQUIRED` and the missing codes);
    › `idempotent-create` (same key and body twice returns one run;
    same key, other body throws `IDEMPOTENCY_KEY_REUSED`);
    › `session-expires` (advancing `clock` past `expiresAt` makes the
    next call throw `UNAUTHENTICATED`); › `sif-from-wps` (`createSif`
    on an approved run returns findings with no errors and
    `SIF_STATEMENT`; `downloadSif` text passes `validateSif` and has
    CRLF line ends); › `audit-chain` (each write appends an event whose
    `prevHash` equals the previous `hash`; `verifyAudit()` is `ok`).
  - `brand.test.ts` › `name-defined-once` (the `PRODUCT_NAME` strings
    appear in no other file under `src`, `e2e` or `index.html`; the
    document title is set from `PRODUCT_NAME`).
- [ ] **Step 3: Run them.** `pnpm --filter @payroll/web test`.
  Expected: all fail (modules missing).
- [ ] **Step 4: Implement theme, i18n and brand.** Fonts are imported in
  `main.tsx` (Latin and Arabic, weights 400, 500, 600). `prefs.ts`
  wraps every `localStorage` access in try and catch and stores only
  `lang` and `theme`. `base.css` sets body background and colour from
  tokens, focus ring `2px solid var(--color-focus)` with offset 2px,
  and a reduced-motion block (durations 0.01ms).
- [ ] **Step 5: Implement the API layer.** The mock keeps state per
  instance in memory, waits `latencyMs` per call, validates request
  bodies with the contract schemas, and throws `ApiError` with Plan 3's
  codes and statuses. Seed (`seed.ts`, deterministic from `today`): 12
  employees in 3 departments with English and Arabic names (NEEDS
  NATIVE REVIEW), one joiner this month (bank details set), one
  future joiner starting next month without bank details (shows in
  lists and the missing-bank alert but is in no run, so a new run's
  salary file can be prepared); leave types annual (30 days), sick
  and unpaid (no balance); requests in each status; attendance for
  the current month (weekdays, 09:00 to 17:30 Dubai); one approved
  run for last month with its SIF (built by the mock's own rules from
  the employees in scope then);
  company WPS settings set; users `owner@demo.test` (owner, MFA
  enrolled), `owner2@demo.test` (owner, MFA enrolled), `hr@demo.test`
  (hr), `manager@demo.test` (manager of 3 employees),
  `employee@demo.test` (employee), all with password `demo-password`;
  the mock's TOTP code is `123456`. Pay (`pay.ts`) follows Plan 3
  Task 7 rules 1 to 4 and 6: lines from components or overrides plus
  one-offs, `gross = net = sum`, one trace line per payslip line (`id`
  `pay.<code>`, `rules: []`, linked by `traceId`), `notComputed =
  NOT_COMPUTED_PAY`. The mock computes no settlement: a leaver needs
  `unusedLeaveDays` and `serviceUnpaidLeaveDays` (else
  `SETTLEMENT_INPUT_REQUIRED` naming the missing one), then gets a
  `refused` settlement with code `MOCK_NOT_COMPUTED` (Ruling W25). The
  HTTP adapter builds the URL from the route path, sends JSON, parses
  each 2xx body with the route's `response` schema (failure:
  `CONTRACT_MISMATCH`), and maps `ApiErrorBody` and network failures to
  `ApiError`.
- [ ] **Step 6: Implement `App.tsx`** as a minimal shell: `<header>`
  with `PRODUCT_NAME[lang]`, the "Sample data" badge in mock mode, a
  language switch and a theme switch (`<button aria-pressed>`), and a
  `<main>` saying the app is being built.
- [ ] **Step 7: Run unit tests and `pnpm check`.** Expected: PASS, and
  `pnpm lines` now reports on `apps`.
- [ ] **Step 8: Playwright smoke.** `playwright.config.ts`: Chromium
  only; `webServer` runs `vite build && vite preview --port 4173`;
  projects `desktop` (1280x800) and `phone` (360x740 Chromium
  viewport, not a WebKit device preset). `smoke.spec.ts`
  › `loads-in-english` (`html[lang=en][dir=ltr]`, product name
  visible); › `switches-to-arabic` (Arabic switch sets
  `html[lang=ar][dir=rtl]`, shows the review banner, survives reload);
  › `dark-theme` (`data-theme=dark`; body background equals the dark
  `--color-bg`). Run `pnpm --filter @payroll/web e2e`. Expected: PASS.
- [ ] **Step 9: Commit.**
  `git commit -m "feat(web): scaffold, tokens, i18n and mock API"`

### Task 2: UI kit, app shell, routing and sign-in

**Files** (under `apps/web/`):
- Create in `src/ui/` (component plus `.module.css`): `Button`,
  `Field`, `TextField`, `Select`, `Checkbox`, `Page`, `PageHeader`,
  `BackLink`, `Section`, `DescriptionList`, `DataTable`, `FilterBar`,
  `StatusPill`, `Money`, `DateText`, `Ltr`, `Alert`, `Toast`
  (provider and `useToast`), `Dialog`, `Skeleton`, `EmptyState`,
  `ErrorState`, `QueryState`, `Stepper`, `FormErrorSummary`,
  `VisuallyHidden`, `icons.tsx`
- Create: `src/app/Shell.tsx`, `src/app/Nav.tsx`, `src/app/routes.tsx`,
  `src/app/RequireAuth.tsx`, `src/app/session.tsx`, `src/app/query.ts`,
  `src/app/mfa.tsx`, `src/app/NotFound.tsx`, `src/app/NoAccess.tsx`,
  `src/features/auth/SignInPage.tsx`, `src/i18n/{en,ar}/ui.ts`,
  `src/i18n/{en,ar}/auth.ts`
- Modify: `src/App.tsx` (providers and router), `src/main.tsx`
- Test: `tests/ui/*.test.tsx` (one per component group),
  `tests/helpers/axe.ts`, `tests/helpers/render-app.tsx`,
  `tests/app/session.test.tsx`, `e2e/sign-in.spec.ts`

**Interfaces:**
- Consumes: Task 1 (`ApiClient`, `ApiError`, `can`, `useLocale`,
  `useTheme`, `formatMoney`, `formatDate`, `errorText`).
- Produces `src/app/session.tsx`: `SessionProvider`; `useSession():
  { me: Me | null; role: Role | null; companyId: string | null;
  signIn(email, password, totp?): Promise<void>; signOut();
  switchCompany(id) }`. The token and company id live in
  `sessionStorage` (strings only, try and catch); the first membership
  is the default company; a company switcher appears with two or more
  memberships.
- Produces `src/app/query.ts`: `useApi(): ApiClient`; `qk` (query key
  factory; keys hold strings and numbers only).
- Produces `src/app/mfa.tsx`: `useMfaGuard(): (e: unknown) => boolean`
  (true when it handled `MFA_REQUIRED` by opening a dialog "Sign in
  again with your authenticator code to continue" whose button goes to
  `/sign-in?mfa=1&returnTo=<current>`; `MFA_ENROLMENT_REQUIRED` links
  to `/settings/security`).
- Produces `src/ui/QueryState.tsx`: `<QueryState query={q}
  skeleton={node} isEmpty={(d) => boolean} empty={node}>{(data) =>
  node}</QueryState>`; its wrapper carries `data-state="loading" |
  "empty" | "error" | "ready"`; error shows `ErrorState` (message,
  "Reference: <requestId>", "Try again" calling `q.refetch`).
- Produces `src/ui/DataTable.tsx`: `DataTable<T>({ rows; columns:
  Column<T>[]; rowKey(r): string; caption: string; footer?: ReactNode
  })`, `Column<T> = { id; header: string; cell(r: T): ReactNode;
  align?: "start" | "end" }`; a real `<table>` with a visually hidden
  `<caption>`; below 640px rows stack as labelled blocks (CSS only,
  `data-label`).
- Produces `src/ui/Money.tsx` (`<Money value={Fils} />`, a `<bdi
  dir="ltr">` with tabular figures) and `src/ui/Ltr.tsx` (`<Ltr>` for
  IBANs, ids, file names, times).
- Produces `src/ui/StatusPill.tsx`: `<StatusPill tone="neutral" |
  "info" | "success" | "warning" | "danger">{label}</StatusPill>`
  (text always present).
- Produces `src/ui/Stepper.tsx`: `<Stepper steps={{ id; label;
  href?: string }[]} current={id} />` as `<ol>`, `aria-current="step"`.
- Produces routes (each page lazy-loaded): `/sign-in`, `/`,
  `/employees`, `/employees/:id`, `/leave`, `/attendance`,
  `/pay-runs`, `/pay-runs/new`, `/pay-runs/:runId`,
  `/pay-runs/:runId/payslips/:payslipId`, `/pay-runs/:runId/wps`,
  `/tools/end-of-service`, `/settings/company`, `/settings/users`,
  `/settings/security`, `/settings/activity`, `*`.

Shell: top bar (product name, "Sample data" badge, language switch,
theme menu, company switcher when needed, user menu with "Sign out");
`<nav aria-label="Main">` as a side rail at 1024px and up, a menu
`Dialog` below. Directional icons (back, chevron) mirror under
`[dir=rtl]` with `transform: scaleX(-1)`. Nav items are hidden when
`can()` is false; a direct visit shows `NoAccess`; the employee role
lands on `NoAccess` after sign-in.

**Checklist: SignInPage against form and flow** (the reference for the
kind; no UI existed, so each role is the element whose meaning it has,
settled by this plan, read 2026-11-26):

- [ ] page holder — `Page` as `<main>`, centred column at most 28rem —
      this plan
- [ ] title — `PageHeader` h1 "Sign in", product name above it — this
      plan
- [ ] form — `<form noValidate>`, zod on submit, first invalid field
      focused — this plan
- [ ] fields — `Field` (label tied by `htmlFor`, hint, error below with
      `aria-describedby`, `aria-invalid`); email `autocomplete=email`,
      password `current-password`, code `one-time-code` with
      `inputmode=numeric` and the hint "Needed to approve pay runs and
      download salary files" — this plan
- [ ] error summary — `FormErrorSummary` (`role=alert`, links to fields)
      when two or more fields fail — this plan
- [ ] submit — primary `Button` "Sign in", full width at phone width,
      `aria-busy` while pending, never disabled for invalid input —
      this plan
- [ ] server error — `Alert` with `errorText` ("Email, password or code
      is not correct" for `INVALID_CREDENTIALS`) — this plan
- [ ] demo hint — `<details>` listing demo accounts, mock mode only —
      this plan
- [ ] values — tokens only, spacing on the base 4, logical properties —
      Task 1 tests
- [ ] not copied by later forms: the demo hint, the code hint text,
      the centred narrow column

Steps 1 to 3 from "UI consistency method" apply (re-read the
checklist; the kind's checker checks, never the author; report `done`
or `parked — <why>` here).

- [ ] **Step 1: Write failing component tests** (`tests/ui/`):
  - `button.test.tsx` › `pending-keeps-label` (`aria-busy="true"`,
    text kept, clicks ignored).
  - `field.test.tsx` › `label-and-error-wired` (accessible name from
    the label; with `error`, `aria-invalid="true"` and
    `aria-describedby` pointing at the error).
  - `data-table.test.tsx` › `caption-and-headers` (`getByRole("table",
    { name })`, one `columnheader` per column; `align: "end"` cells
    carry the end class).
  - `money.test.tsx` › `ltr-isolation` (in Arabic, `<Money>` renders
    `bdi[dir=ltr]` with text `AED 9,999,999.99`; `<Ltr>` does the same
    for `AE070331234567890123456`).
  - `query-state.test.tsx` › `loading-empty-error-data` (pending shows
    the skeleton and `data-state=loading`; empty shows the empty node;
    error shows "Try again" and "Reference: req-1"; clicking retry
    calls `refetch`; data renders children).
  - `stepper.test.tsx` › `current-step-marked`.
  - `dialog.test.tsx` › `focus-trap-and-return` (focus moves in, Tab
    cycles inside, Escape closes, focus returns to the opener).
  - `axe.test.tsx` › `kit-has-no-axe-violations` (every component in
    both languages; the colour-contrast rule is off in jsdom because
    Task 1 tests contrast).
- [ ] **Step 2: Write failing app tests** (`tests/app/session.test.tsx`,
  mock at latency 0 with a controllable clock):
  - › `redirects-to-sign-in` (`/employees` while signed out lands on
    `/sign-in?returnTo=%2Femployees`).
  - › `sign-in-with-code` (owner with `123456` lands on `/`;
    `me.session.mfa` true).
  - › `wrong-credentials-message`.
  - › `expired-session-returns-to-step` (signed in at
    `/pay-runs/new?step=entries`; the clock passes `expiresAt`; the
    next call gives `UNAUTHENTICATED`; the app shows sign-in with
    `returnTo=%2Fpay-runs%2Fnew%3Fstep%3Dentries`; after signing in it
    returns there).
  - › `mfa-required-dialog` (a call failing with `MFA_REQUIRED` opens
    the dialog; its button goes to `/sign-in?mfa=1&returnTo=...` where
    the code field is required).
  - › `nav-respects-role` (manager sees no Pay runs link; `/pay-runs`
    shows `NoAccess`); › `employee-role-no-access`.
- [ ] **Step 3: Run.** `pnpm --filter @payroll/web test`. Expected:
  the new tests fail.
- [ ] **Step 4: Implement** the kit, shell, routes, session and
  sign-in against the checklist. Later pages are placeholders
  (`PageHeader` and an `EmptyState` "This screen is not built yet").
- [ ] **Step 5: Run unit tests and `pnpm check`.** Expected: PASS.
- [ ] **Step 6: E2E** `e2e/sign-in.spec.ts` › `sign-in-each-role`
  (owner with code, hr, manager) and › `rtl-shell` (in Arabic at
  1280px the nav's bounding box is in the right half; the back icon
  has a negative x scale). Run `pnpm --filter @payroll/web e2e`.
  Expected: PASS.
- [ ] **Step 7: Commit.**
  `git commit -m "feat(web): UI kit, shell, routing and sign-in"`

### Task 3: Dashboard, employees list and employee profile

**Files** (under `apps/web/src/` unless rooted):
- Create: `features/dashboard/DashboardPage.tsx`,
  `features/dashboard/summary.ts`, `features/dashboard/RunRail.tsx`,
  `features/employees/EmployeesPage.tsx`,
  `features/employees/EmployeeProfilePage.tsx`,
  `features/employees/columns.tsx`, `features/employees/csv.ts`,
  `features/employees/BankReveal.tsx`, `i18n/{en,ar}/dashboard.ts`,
  `i18n/{en,ar}/employees.ts` (plus `.module.css` where a page needs
  layout)
- Test: `apps/web/tests/features/summary.test.ts`,
  `tests/features/dashboard.test.tsx`,
  `tests/features/employees.test.tsx`, `e2e/employees.spec.ts`

**Interfaces:**
- Consumes: Task 2 kit, `useApi`, `qk`, `useMfaGuard`; `listPayRuns`,
  `listLeaveRequests`, `listEmployees`, `getEmployee`, `getCompany`,
  `listDepartments`, `listLeaveBalances`, `revealBank`.
- Produces `summary.ts`: `buildDashboard(input: { today: string; role:
  Role; company: Company; runs: AppPayRun[]; leave: LeaveRequest[];
  employees: AppEmployee[] }): DashboardSummary` with `period: { year;
  month }` (the month of `today`), `currentRun: AppPayRun | null` (that
  period, not void), `nextAction: "create" | "approve" |
  "await-approval" | "salary-file" | null` (no run: `create` for owner
  and hr; draft: `approve` for an owner, `await-approval` for hr;
  approved: `salary-file`), `onLeaveToday: LeaveRequest[]` (approved,
  start at or before today, end at or after), `alerts: DashAlert[]`
  with `DashAlert = { kind: "pending-leave" | "missing-bank" |
  "missing-wps-settings"; count: number; href: string }`.
- Produces `csv.ts`: `employeesCsv(rows: AppEmployee[], lang: Lang):
  string` (number, name, department, job title, joining date; no
  salary, no bank, no ids).

Dashboard tree: `Page`; `PageHeader` (h1 "Overview", company name as
description); `RunRail` (a `Stepper` Inputs, Draft, Approved, Salary
file, plus one primary `Button` for `nextAction`); `Section` "On leave
today" (short `DataTable`); `Section` "Needs attention" (a `<ul>` of
alerts, each a link to its fix); each section in its own `QueryState`.

**Checklist: EmployeesPage against list page** (the reference for the
kind; settled by this plan and the Task 2 kit, read 2026-11-26):

- [ ] page holder — `Page` as `<main>`, one `<h1>` — the shared piece
- [ ] header — `PageHeader`: h1, one-line description, the page action
      ("Export CSV") at inline end — the shared piece
- [ ] filters — `FilterBar` with `TextField` search and `Select`s; state
      in URL params (`?q=&dept=&status=`) — W14
- [ ] rows — `DataTable`; the first cell is a `<Link>` to the detail,
      so Enter and middle-click work; no click handler on `<tr>` — the
      shared piece
- [ ] dates and amounts — `<DateText>` and `<Money>` only, amounts
      end-aligned — the shared piece
- [ ] status — `StatusPill` with a tone map in the feature (active
      success, left neutral) — the shared piece
- [ ] states — `QueryState` with skeleton rows, `EmptyState` with one
      action, `ErrorState` with retry; "no results for these filters"
      is its own empty state with "Clear filters" — the shared piece
- [ ] words — `t()` in the feature namespace, sentence case, verbs on
      buttons — Global Constraints
- [ ] values — tokens only, base 4, logical properties — Task 1 tests
- [ ] not copied by later list pages: the employee columns, the
      department filter, "Export CSV"

**Checklist: EmployeeProfilePage against detail page** (the reference
for the kind, same basis):

- [ ] page holder — `Page`; `BackLink` to the list keeping its filters
      (mirrored arrow) above the h1 — the shared piece
- [ ] title — h1 is `fullNameAr` in Arabic when present, else
      `fullName` — this plan
- [ ] summary — `DescriptionList` (`<dl>`); ids and IBAN digits in
      `<Ltr>` — the shared piece
- [ ] sections — `Section` with `<h2>`, in order: Pay, Bank, Leave
      balances — this plan
- [ ] amounts — salary components in a `DataTable` with the total in
      `<tfoot>`; `salary: null` shows "Not visible to your role" — the
      shared piece and this plan
- [ ] protected action — "Show IBAN" `Button`; `MFA_REQUIRED` goes
      through `useMfaGuard` — this plan
- [ ] states — `QueryState`; `NOT_FOUND` shows a not-found state with a
      link back — the shared piece
- [ ] values — tokens only, base 4 — Task 1 tests
- [ ] not copied by later detail pages: the bank section, the salary
      table

Steps 1 to 3 from "UI consistency method" apply.

- [ ] **Step 1: Write failing tests.**
  - `summary.test.ts` › `next-action-per-state` (no run: owner and hr
    `create`, manager `null`; draft: owner `approve`, hr
    `await-approval`; approved: `salary-file`; a void run counts as no
    run); › `on-leave-today-inclusive` (ending today counts, ending
    yesterday does not, pending does not); › `alerts` (demo seed: one
    pending-leave alert with the right count, one missing-bank alert
    with count 1; a company with `wps.employerId: null` adds
    `missing-wps-settings`).
  - `dashboard.test.tsx` › `rail-shows-next-action` (hr on the demo
    seed: "Create pay run"); › `empty-company` (empty seed: the rail
    offers "Create pay run"; both sections show their empty text);
    › `section-error-isolated` (`listLeaveRequests` fails: only that
    section shows "Try again").
  - `employees.test.tsx` › `filters-in-url` (typing "Sara" sets
    `?q=Sara` and leaves only matching rows); › `clear-filters`;
    › `row-link-opens-profile`; › `profile-arabic-name`;
    › `profile-not-found`; › `salary-total` (`<tfoot>` total equals
    the sum of components as `formatAed`); › `salary-hidden-for-
    manager` (manager on a report sees "Not visible to your role");
    › `bank-reveal-needs-mfa` (owner signed in without a code clicks
    "Show IBAN": the MFA dialog opens; with a code the IBAN shows in
    `<Ltr>`); › `csv-has-no-salary` (`employeesCsv` output contains no
    salary amount and no `AE07`).
- [ ] **Step 2: Run.** Expected: fail.
- [ ] **Step 3: Implement** against the checklists. Adding and editing
  employees is out of scope (Ruling W16).
- [ ] **Step 4: Run tests and `pnpm check`.** Expected: PASS.
- [ ] **Step 5: E2E** `e2e/employees.spec.ts` › `list-to-profile-and-
  back` (filter kept) and › `error-state-retry`
  (`?mock-fail=listEmployees` shows "Try again"). Expected: PASS.
- [ ] **Step 6: Commit.**
  `git commit -m "feat(web): dashboard, employees list and profile"`

### Task 4: Leave requests, balances and attendance

**Files** (under `apps/web/src/` unless rooted):
- Create: `features/leave/LeavePage.tsx`,
  `features/leave/NewLeaveDialog.tsx`,
  `features/leave/DecisionDialog.tsx`,
  `features/leave/BalancesView.tsx`, `features/leave/leave-days.ts`,
  `features/attendance/AttendancePage.tsx`,
  `features/attendance/month.ts`, `i18n/{en,ar}/leave.ts`,
  `i18n/{en,ar}/attendance.ts`
- Test: `apps/web/tests/features/leave-days.test.ts`,
  `tests/features/leave.test.tsx`, `tests/features/month.test.ts`,
  `tests/features/attendance.test.tsx`, `e2e/leave.spec.ts`

**Interfaces:**
- Consumes: Task 2 kit; leave and attendance methods of `ApiClient`;
  `listEmployees`.
- Produces `leave-days.ts`: `calendarDays(start: string, end: string):
  number` (inclusive; end before start throws `INVALID_RANGE`), shown
  as "calendar days" to match the contract's `dayCountRule:
  "calendar-days-inclusive"` (Ruling W17).
- Produces `month.ts`: `monthRange(month: string): { from; to }` (ISO
  dates of the month) and `summariseMonth(records: AttendanceRecord[]):
  { daysWithRecord: number; openRecords: number; minutes: number }`.

Leave page: `?view=requests|balances` as a `role="tablist"` of two
links. Requests: status, employee and year filters passed to
`listLeaveRequests`; each pending row has Approve and Reject for users
with `leave.decide`; both open `DecisionDialog` (optional note). "New
request" opens `NewLeaveDialog` (employee, type, start, end; days shown
live; `LEAVE_OVERLAP`, `INSUFFICIENT_BALANCE` and `LEAVE_CROSSES_YEAR`
shown on the matching field). Balances: employee and year `Select`s,
then entitled, adjustments, taken, pending and remaining per type.
Attendance: month in `?month=YYYY-MM`, employee filter, a `DataTable`
(date, employee, clock in, clock out, minutes, source), times in Dubai
inside `<Ltr>`; an open record shows "Still clocked in"; a summary
`DescriptionList`.

**Checklist: LeavePage and AttendancePage against list page** (from
`EmployeesPage`, the reference, Task 3; 1 member so far, read
2026-11-26):

- [ ] page holder — `Page`, one `<h1>` — as the reference
- [ ] header — `PageHeader`, page action at inline end ("New request";
      attendance has none) — as the reference
- [ ] filters — `FilterBar`, state in URL params — as the reference
- [ ] rows — `DataTable`; the first cell is the employee name linking
      to the profile — as the reference
- [ ] row actions — small `Button`s in the last column, named with the
      employee via `aria-label` ("Approve leave for Sara Ali") — this
      plan
- [ ] dates and times — `<DateText>`, times in `<Ltr>` — the shared
      piece
- [ ] status — `StatusPill`, tone map in the feature (pending warning,
      approved success, rejected danger, cancelled neutral) — as the
      reference
- [ ] states — `QueryState`, filtered-empty with "Clear filters" — as
      the reference
- [ ] dialogs — `Dialog` for new request and decisions — the shared
      piece
- [ ] values — tokens only, base 4, logical properties — Task 1 tests
- [ ] not copied from the reference: its columns, department filter,
      "Export CSV"

Steps 1 to 3 from "UI consistency method" apply.

- [ ] **Step 1: Write failing tests.**
  - `leave-days.test.ts` › `inclusive-count` (`2026-11-01` to
    `2026-11-01` is 1; to `2026-11-30` is 30; `2028-02-28` to
    `2028-03-01` is 3); › `end-before-start-throws`.
  - `leave.test.tsx` › `approve-updates-row` (pill becomes "Approved",
    toast "Leave approved"); › `reject-with-note`;
    › `decided-elsewhere-conflict` (`LEAVE_NOT_PENDING` shows "This
    request was already decided" and the list refetches);
    › `manager-sees-reports-only`; › `new-request-validation` (end
    before start: field error on the end date, focused);
    › `insufficient-balance-on-field`; › `balances-view` (plural "1
    day" and "3 days").
  - `month.test.ts` › `range-february-leap` (`2028-02` gives
    `2028-02-01` to `2028-02-29`); › `summary-counts`.
  - `attendance.test.tsx` › `month-in-url`; › `times-in-dubai` (a
    record clocked in at `05:00Z` shows `09:00`); › `open-record`
    (shows "Still clocked in"); › `empty-month`.
- [ ] **Step 2: Run.** Expected: fail.
- [ ] **Step 3: Implement** against the checklist. Clock-in and
  clock-out (self-service) are not in this plan.
- [ ] **Step 4: Run tests and `pnpm check`.** Expected: PASS.
- [ ] **Step 5: E2E** `e2e/leave.spec.ts` › `request-then-approve` (hr
  creates a request covering today and approves it; the dashboard "On
  leave today" lists it) in English and in Arabic. Expected: PASS.
- [ ] **Step 6: Commit.**
  `git commit -m "feat(web): leave requests, balances and attendance"`

### Task 5: Pay run wizard (per-task review)

**Files** (under `apps/web/src/` unless rooted):
- Create: `features/payroll/PayRunsPage.tsx`,
  `features/payroll/NewPayRunPage.tsx`,
  `features/payroll/PayRunPage.tsx`,
  `features/payroll/steps/PeriodStep.tsx`,
  `features/payroll/steps/EntriesStep.tsx`,
  `features/payroll/steps/ProblemsList.tsx`,
  `features/payroll/ApproveDialog.tsx`,
  `features/payroll/draft-store.ts`, `features/payroll/run-state.ts`,
  `features/payroll/problems.ts`, `i18n/{en,ar}/payroll.ts`
- Modify: `i18n/amount-input.ts` (body)
- Test: `apps/web/tests/unit/amount-input.test.ts`,
  `tests/features/run-state.test.ts`,
  `tests/features/draft-store.test.ts`,
  `tests/unit/mock-separation.test.ts`,
  `tests/features/pay-run.test.tsx`, `e2e/pay-run.spec.ts`

**Interfaces:**
- Consumes: `listPayRuns`, `getPayRun`, `createPayRun`,
  `approvePayRun`, `voidPayRun`, `listPayslips`, `listEmployees`,
  `listLeaveRequests`; `can`, `useMfaGuard`; kit.
- Produces `amount-input.ts`: `parseAmountInput(text: string): Fils`:
  trim; map U+0660 to U+0669 and U+06F0 to U+06F9 to ASCII digits;
  U+066B to "."; remove "," and U+066C; then exactly
  `^\d{1,9}(\.\d{1,2})?$`, converted without floating point; anything
  else throws `INVALID_AMOUNT`.
- Produces `draft-store.ts`: `type RunDraft = { period: { year; month };
  entries: Record<string, { overrides: Record<string, string>;
  oneOffs: { code; label; amount: string; sifBucket }[];
  unusedLeaveDays: string; serviceUnpaidLeaveDays: string }>;
  idempotencyKey: string; bodyHash: string }` (amounts as typed text,
  never `Fils`); `saveDraft`, `loadDraft`, `clearDraft` in
  `sessionStorage` (try and catch); `keyFor(draft, newKey: () =>
  string): string` keeps the key while the body is unchanged and takes
  a new one when it changes. The key generator is injected
  (`crypto.randomUUID` passed in from `main.tsx`).
- Produces `run-state.ts`: `type NewRunStep = "period" | "entries"`;
  `approveBlock(run: AppPayRun, me: Me, role: Role): null |
  "not-owner" | "own-run" | "not-draft"`.
- Produces `problems.ts`: `problemText(p: PayRunProblem, t, names):
  string` (`ENTERED_AMOUNTS_REQUIRED`: "Enter this month's amounts for
  {codes}: this person joined, left or had unpaid leave this month";
  `SETTLEMENT_INPUT_REQUIRED`: "Enter {missing} for this leaver";
  `EMPLOYEE_NOT_IN_PERIOD`; unknown codes show the code).

Flow: `/pay-runs/new?step=period|entries`. Period: month and year
(`Select`s); `RUN_EXISTS_FOR_PERIOD` links to the existing run.
Entries: every in-scope employee; employees named in the last
attempt's problems come first, each with fields for the missing
component codes (`parseAmountInput`), optional one-offs, and for
leavers unused leave days and unpaid leave days over service; approved
unpaid leave in the month is shown read-only so the preparer knows
why. "Create draft" posts `PayRunCreate` with the draft's idempotency
key; `PAY_RUN_PROBLEMS` returns to Entries with `ProblemsList` at the
top. Success clears the draft and goes to `/pay-runs/:runId`: summary,
payslips `DataTable` linking to Task 6, the `notComputed` list under
"Not computed in this run", "Void draft" and "Approve pay run".
Approve opens `ApproveDialog` restating period, employee count and
gross; otherwise the button is disabled with the visible `approveBlock`
reason.

**Checklist: PayRunsPage against list page** (from `EmployeesPage`,
Task 3):

- [ ] holder, header, filters, rows, states — as the reference; the
      first cell links to the run ("November 2026")
- [ ] status — `StatusPill`: draft warning, approved success, void
      neutral — this plan
- [ ] amounts — `<Money>` end-aligned for gross — the shared piece
- [ ] not copied from the reference: its columns, filters, export

**Checklist: NewPayRunPage against form and flow** (from `SignInPage`,
Task 2; 1 member so far, read 2026-11-26):

- [ ] page holder — `Page`; `BackLink` to pay runs; h1 "New pay run" —
      the shared piece
- [ ] progress — `Stepper` as `<ol>`, `aria-current="step"`; earlier
      steps are links — the shared piece
- [ ] fields — `Field`, `Select`, amount fields with
      `inputmode=decimal` and the hint "AED, for example 4000.00" — as
      the reference
- [ ] validation — zod on submit, first invalid field focused,
      `FormErrorSummary` for two or more — as the reference
- [ ] server problems — `ProblemsList` (`role=alert`) with a link per
      problem to that employee's fields — this plan
- [ ] primary action — one primary `Button` per step at its end,
      `aria-busy` while pending — as the reference
- [ ] success — toast "Draft pay run created" — Global Constraints
- [ ] values — tokens only, base 4 — Task 1 tests
- [ ] not copied from the reference: the code hint, the demo hint, the
      narrow column

**Checklist: PayRunPage against detail page** (from
`EmployeeProfilePage`, Task 3):

- [ ] holder, back link, h1 "Pay run November 2026" — as the reference
- [ ] summary — `DescriptionList`: status, created by, approved by,
      employee count, gross — as the reference
- [ ] sections — "Payslips" (`DataTable`), "Not computed in this run"
      (`<ul>`) — this plan
- [ ] protected action — "Approve pay run" disabled with a visible
      reason when blocked; confirm `Dialog`; `useMfaGuard` — this plan
- [ ] success — toast "Pay run approved" — Global Constraints
- [ ] not copied from the reference: bank section, salary table

Steps 1 to 3 from "UI consistency method" apply.

- [ ] **Step 1: Write failing tests.**
  - `amount-input.test.ts` › `amount-input-normalises-digits`
    (`"١٠٠٠٠٫٥٠"` gives 1000050n; `"10,000.50"` gives 1000050n;
    `" 10000 "` gives 1000000n; `"10.505"`, `"-5"`, `"1e4"`, `""`,
    `"1234567890.00"` throw `INVALID_AMOUNT`).
  - `draft-store.test.ts` › `key-stable-while-body-same`;
    › `key-renewed-when-body-changes`; › `no-bigint-stored` (the stored
    JSON parses and holds string amounts); › `storage-throws-safely`
    (a throwing `sessionStorage` leaves the wizard working).
  - `run-state.test.ts` › `approve-block-reasons` (owner2 on owner's
    draft: null; owner on own draft: `own-run`; hr: `not-owner`;
    owner2 on an approved run: `not-draft`).
  - `mock-separation.test.ts` › `approve-refused-same-user` (owner
    creates, then approves with MFA: `SOD_VIOLATION`; owner2 with MFA
    succeeds, `approvedBy` is owner2, an audit event
    `pay-run.approved` is appended); › `approve-needs-mfa` (owner2
    without a code: `MFA_REQUIRED`).
  - `pay-run.test.tsx` › `problems-return-to-entries` (the seed
    joiner: "Create draft" shows the problem and focuses the first
    missing field); › `fix-and-create` (entering basic and housing
    creates the draft; its gross equals the sum of the payslip lines
    shown); › `approve-disabled-for-creator` (owner on their own draft:
    the button is disabled and "You created this pay run, so another
    owner must approve it" is visible); › `confirm-restates-totals`;
    › `not-computed-listed` (the seven `NOT_COMPUTED_PAY` strings
    appear on the run page); › `inputs-survive-reauth` (typed amounts
    are still there after the expired-session sign-in);
    › `period-exists-links` (`RUN_EXISTS_FOR_PERIOD` links to the
    existing run).
- [ ] **Step 2: Run.** Expected: fail.
- [ ] **Step 3: Implement** against the checklists.
- [ ] **Step 4: Run tests and `pnpm check`.** Expected: PASS.
- [ ] **Step 5: E2E** `e2e/pay-run.spec.ts` › `prepare-then-approve`
  (hr creates this month's run, fixes the joiner's problem, creates
  the draft, signs out; owner2 signs in with the code and approves;
  the run shows "Approved"). Expected: PASS.
- [ ] **Step 6: Commit.**
  `git commit -m "feat(web): pay run wizard with separation of duties"`
- [ ] **Step 7: Per-task review** (money shown to people, separation of
  duties): a fresh reviewer reads this task's diff against this task
  and the Global Constraints before Task 6 starts; fix and commit.

### Task 6: Explainable payslip trace view (per-task review)

**Files** (under `apps/web/src/` unless rooted):
- Create: `features/trace/TraceView.tsx`,
  `features/trace/TraceLineRow.tsx`,
  `features/trace/TraceView.module.css`,
  `features/trace/view-lines.ts`, `features/trace/explain-line.ts`,
  `features/trace/sources.ts`, `features/payroll/PayslipPage.tsx`,
  `i18n/{en,ar}/trace.ts`
- Test: `apps/web/tests/features/view-lines.test.ts`,
  `tests/features/explain-line.test.ts`,
  `tests/features/sources.test.ts`,
  `tests/features/trace-view.test.tsx`, `e2e/payslip.spec.ts`

**Interfaces:**
- Consumes: engine `explainTrace`, `MESSAGES`, `MONEY_IDS`,
  `STATUS_WORDS`, `GRATUITY_PACKS`, `calculateSettlement`, `formatAed`,
  `fils`, `TraceLine`, `TraceRule`, `RuleSource`, `RulePack`;
  `AppPayslip`, `AppSettlement`.
- Produces `view-lines.ts`: `type ViewLine = TraceLine & { money: Fils
  | null }`; `payslipViewLines(p: AppPayslip): ViewLine[]` (a trace
  line whose id is referenced by a payslip line's `traceId` takes that
  line's `amount`; others `null`); `engineViewLines(trace:
  TraceLine[]): ViewLine[]` (ids in `MONEY_IDS` with an integer result
  become `fils(BigInt(result))`). Money is decided here and nowhere
  else; a `pay.*` line's raw `result` text is never displayed.
- Produces `explain-line.ts`: `explainLine(line: ViewLine, lang:
  Lang): { sentence: string; translated: boolean }`. Order: (1) the
  engine catalog when `MESSAGES[lang]` has the id (via
  `explainTrace([line], lang)`); (2) the web catalog for `pay.*` ids
  ("{label}: {amount}, the {formula}", the formula words "entered
  monthly amount", "entered amount for this run", "entered one-off
  amount" translated); (3) otherwise `label` and the formatted value
  with `translated: false`. With `money` set, the amount is always
  `formatMoney(money)`.
- Produces `sources.ts`: `type SourceView = { kind: "source"; source:
  RuleSource } | { kind: "overridden" } | { kind: "none" }`;
  `resolveSource(rule: TraceRule, packs: readonly RulePack[]):
  SourceView` (pack by `packId` and `packVersion`, then
  `params[key].source`; `overridden: true` gives `overridden`, never
  the pack's source; no pack or no source gives `none`).
- Produces `TraceView.tsx`: `<TraceView lines={ViewLine[]}
  title={string} />`.

Trace view (the signature element): an `<ol>`; each row shows the
sentence and, end-aligned, the `<Money>` value or the plain result.
Each row has a disclosure `<button aria-expanded aria-controls>`;
expanded, it shows a 2px `--color-trace` thread on the inline-start
edge and three parts: Formula (`line.formula`), Inputs (a `<dl>`),
Rules (each: key, value, status word in a `StatusPill`, `packId` and
`packVersion` in `<Ltr>`, and the source: a link named by its note with
`target=_blank rel="noopener noreferrer"` and visually hidden "(opens
in a new tab)"; a source without a URL shows its note only, e.g.
"engine convention, not law"; `overridden` shows "Changed for this
calculation: no source"). A line with no rules shows "From your
records: no rule applies". "Expand all" and "Collapse all" buttons. An
untranslated line carries the pill "Not yet translated". Expanding is
a 150ms height and opacity change, none under reduced motion.

Payslip page: h1 "Payslip", employee name and period; summary (gross,
net, employee number); `Section` "How this was calculated" with
`TraceView` over `payslipViewLines`; when `settlement` is `computed`,
`Section` "End-of-service settlement" with the exact total label, its
`notComputed` list and `TraceView` over `engineViewLines`; `refused`
shows the code and message in an `Alert`; then "Not computed" with the
payslip's list.

**Checklist: PayslipPage against detail page** (from
`EmployeeProfilePage`, Task 3; read 2026-11-26):

- [ ] holder and back — `Page`, `BackLink` to the pay run — as the
      reference
- [ ] title — h1 "Payslip" with the employee name and period — as the
      reference
- [ ] summary — `DescriptionList`: gross, net, employee number — as the
      reference
- [ ] sections — `Section` h2 "How this was calculated" holding
      `TraceView`; settlement and not-computed sections after it —
      this plan
- [ ] disclosure — real `<button>` with `aria-expanded`; expanded
      content follows its button in reading and Tab order — this plan
- [ ] sources — external links named by their note — this plan
- [ ] states — `QueryState`, not-found state — as the reference
- [ ] values — `--color-trace` only inside the trace view; tokens only;
      base 4 — this plan and Task 1 tests
- [ ] not copied from the reference: bank section, salary table

Steps 1 to 3 from "UI consistency method" apply.

- [ ] **Step 1: Write failing tests.**
  - `view-lines.test.ts` › `payslip-money-from-lines` (a `pay.basic`
    trace line linked by `traceId` gets the line's amount);
    › `engine-money-ids` (`gratuity.total` with result `"3500000"`
    gets `fils(3500000n)`; `service.days` gets `null`).
  - `explain-line.test.ts` › `engine-catalog-first` (the gratuity line
    of the engine's sample settlement, built with
    `calculateSettlement`, reads "End-of-service gratuity: AED
    35,000.00 (secondary, convention)." in English and contains
    `"⁦AED 35,000.00⁩"` in Arabic); › `pay-line-wording`
    (`pay.basic` with money 400000n contains "AED 4,000.00");
    › `unknown-money-id-never-raw` (an unknown id with money 1250000n
    and result `"1250000"` gives a sentence with "AED 12,500.00", not
    `1250000`, and `translated: false`); › `status-words-ar` (status
    `convention` reads "اختيار النظام").
  - `sources.test.ts` › `pack-source-found` (a gratuity rule resolves
    to a source whose URL starts with `https://`);
    › `overridden-has-no-source`; › `unknown-pack-none`.
  - `trace-view.test.tsx` › `expand-shows-rule-and-source`;
    › `input-line-no-rules`; › `expand-all`; › `keyboard-disclosure`
    (Tab to the button, Enter toggles `aria-expanded`);
    › `settlement-refused-alert`; › `settlement-computed-section` (a
    fixture `AppPayslip` whose settlement is `computed` from
    `calculateSettlement` on the engine sample: the section shows the
    exact total label, "AED 38,333.33", its `notComputed` list and an
    expandable gratuity line); › `axe-clean` (both languages).
- [ ] **Step 2: Run.** Expected: fail.
- [ ] **Step 3: Implement** against the checklist. Payslip line wording
  lives in `src/i18n/{en,ar}/trace.ts` until a monthly engine exists
  (Ruling W9).
- [ ] **Step 4: Run tests and `pnpm check`.** Expected: PASS.
- [ ] **Step 5: E2E** `e2e/payslip.spec.ts` › `trace-en-ar` (open a
  payslip of the approved seed run, expand the basic line, see "From
  your records: no rule applies"; switch to Arabic; the amount sits in
  `bdi[dir=ltr]` and starts with `AED`). Expected: PASS.
- [ ] **Step 6: Commit.**
  `git commit -m "feat(web): explainable payslip trace view"`
- [ ] **Step 7: Per-task review** as in Task 5.

### Task 7: WPS file screen and end-of-service calculator

**Files** (under `apps/web/src/` unless rooted):
- Create: `features/wps/WpsPage.tsx`, `features/wps/download.ts`,
  `features/wps/finding-text.ts`, `features/eos/EndOfServicePage.tsx`,
  `features/eos/eos-form.ts`, `features/eos/engine-errors.ts`,
  `i18n/{en,ar}/wps.ts`, `i18n/{en,ar}/eos.ts`
- Test: `apps/web/tests/features/finding-text.test.ts`,
  `tests/features/download.test.ts`, `tests/features/wps.test.tsx`,
  `tests/features/eos.test.tsx`, `e2e/wps.spec.ts`, `e2e/eos.spec.ts`

**Interfaces:**
- Consumes: `createSif`, `getSifFile`, `downloadSif`, `getPayRun`;
  `AppSifFile`, `Finding`, `SIF_STATEMENT`; engine
  `calculateSettlement`, `GRATUITY_PACKS`, `EngineError`; Task 5
  `parseAmountInput`; Task 6 `TraceView`, `engineViewLines`.
- Produces `download.ts`: `sifBlob(text: string): Blob` (type
  `text/plain`, bytes exactly as given, CRLF kept; any character at or
  above 128 throws `SIF_NOT_ASCII`) and `downloadFile(blob: Blob,
  fileName: string): void` (an anchor with `download`).
- Produces `finding-text.ts`: `WPS_CODES` (the 29 validator codes:
  ACCOUNT_LENGTH, AMOUNT_FORMAT, COUNT_FORMAT, CURRENCY, DATE_FORMAT,
  DAYS_MISMATCH, DUPLICATE_EMPLOYEE, EDR_COUNT_MISMATCH, EVP_MISSING,
  EVP_SUM_MISMATCH, EVP_WITHOUT_EDR, FIELD_COUNT, FIELD_HAS_SPACES,
  FIELD_TOO_LONG, FUTURE_CREATION_DATE, IBAN_CHECKSUM, ID_FORMAT,
  MONTH_MISMATCH, NEGATIVE_AMOUNT, NON_ASCII, NO_SCR,
  PAY_START_TOO_EARLY, RECORD_TYPE, ROUTING_FORMAT,
  ROUTING_IBAN_BANK_MISMATCH, ROUTING_UNKNOWN, SCR_NOT_LAST,
  TOTAL_MISMATCH, ZERO_PAY); `wpsFindingText(f: Finding, lang: Lang):
  string` (`wps.codes.<CODE>`; an unknown code falls back to the
  finding's English `message`). The file's own `value` is shown quoted
  inside `<Ltr>` as text, never as markup.
- Produces `eos-form.ts`: `EosFormSchema` (zod: `joiningDate`,
  `lastWorkingDate`, `unpaidLeaveDays`, `basicMonthly` (text),
  `workerClass`, `unusedLeaveDays`) and `toSettlementInput(v):
  SettlementInput` (amount through `parseAmountInput`).
- Produces `engine-errors.ts`: `engineErrorText(e: EngineError, t):
  string` (`NO_PACK_FOR_DATE`: "Leavers before 2 February 2022 are not
  modelled (old law)"; `UNSUPPORTED_WORKER_CLASS`: "GCC nationals are
  not modelled yet"; any other code: the code and the message).

WPS page (`/pay-runs/:runId/wps`, detail kind): the run must be
approved. `PayRun` carries no SIF id (an ask to Plan 3), so the page
offers "Prepare salary file", which calls `createSif` (Plan 3: a second
call returns the stored file); the result is cached by run id. Then: a
`DescriptionList` (file name in `<Ltr>`, created at, total),
"Download .SIF" (calls `downloadSif`, guarded by `useMfaGuard`), error
and warning counts, findings by severity in a `DataTable` (line,
field, text, value), and last `SIF_STATEMENT` as given (in Arabic its
translation, NEEDS NATIVE REVIEW, with the English sentence kept
beneath). With errors, an `Alert`: "Fix the errors before sending this
file to your bank". `EMPLOYEE_BANK_MISSING` lists every employee with a
link to the profile; `COMPANY_WPS_SETTINGS_MISSING` links to company
settings.

Calculator (`/tools/end-of-service`, form kind; owner, hr, manager):
the form, then the computed total with the exact label, the
not-computed list, and `TraceView` over `engineViewLines`. The
settlement code loads in this route's lazy chunk only. The page states
"A calculator, not a pay run: nothing is saved".

**Checklist: WpsPage against detail page** (from
`EmployeeProfilePage`, Task 3):

- [ ] holder, back link to the run, h1 "Salary file (WPS)" — as the
      reference
- [ ] summary — `DescriptionList`, file name in `<Ltr>` — as the
      reference
- [ ] findings — `DataTable` with a caption, errors first — the shared
      piece
- [ ] statement — `SIF_STATEMENT` in a plain `<p>` at the end, never in
      a success colour — this plan
- [ ] protected action — "Download .SIF" through `useMfaGuard` — this
      plan
- [ ] states — `QueryState`; "no file yet" is an empty state with the
      prepare action — the shared piece
- [ ] not copied from the reference: bank section, salary table

**Checklist: EndOfServicePage against form and flow** (from
`SignInPage`, Task 2):

- [ ] fields — `Field` with label, hint, error; dates as
      `<input type=date>`; amount `inputmode=decimal` — as the
      reference
- [ ] validation — zod on submit, first invalid field focused,
      `FormErrorSummary` for two or more — as the reference
- [ ] engine refusals — `Alert` with `engineErrorText`, never a stack —
      this plan
- [ ] result — exact total label, not-computed list, `TraceView` — this
      plan and Task 6
- [ ] submit — primary `Button` "Calculate" — as the reference
- [ ] values — tokens only, base 4 — Task 1 tests
- [ ] not copied from the reference: code hint, demo hint, narrow
      column

Steps 1 to 3 from "UI consistency method" apply.

- [ ] **Step 1: Write failing tests.**
  - `finding-text.test.ts` › `every-code-translated` (each `WPS_CODES`
    entry has en and ar text); › `unknown-code-fallback`;
    › `never-claims-compliance` (no en catalog value under `wps` or
    `payroll` matches `/compliant|verified|approved by MOHRE/i`; no ar
    value under `wps` contains "مطابق" or "معتمد" (NEEDS NATIVE
    REVIEW: the words for "compliant" and "certified"; `payroll` is not
    scanned in Arabic because "معتمد" also means an approved run)).
  - `download.test.ts` › `download-bytes` (`sifBlob` of the mock file:
    decoded text equals the input, contains `"\r\n"`, every byte below
    128); › `non-ascii-refused`.
  - `wps.test.tsx` › `prepare-then-summary`; › `statement-shown`
    (exact `SIF_STATEMENT` text present); › `wps-file-name-rtl` (in
    Arabic the file name sits in `bdi[dir=ltr]`, unchanged);
    › `errors-alert` (a mock file with a `TOTAL_MISMATCH` error shows
    the alert and the row with line and field); › `bank-missing-lists-
    all` (two employees without bank details are both listed);
    › `draft-run-no-prepare` (`RUN_NOT_APPROVED` state);
    › `download-needs-mfa`; › `page-never-claims-compliance` (the
    rendered WPS page text in both languages contains none of the
    words above).
  - `eos.test.tsx` › `sample-settlement` (joining 2019-01-01, last day
    2023-12-31, unpaid 0, basic "10000.00", expat-full-time, unused
    leave 10: total "AED 38,333.33", gratuity "AED 35,000.00", leave
    pay "AED 3,333.33", the exact total label and "Not computed:
    notice pay, deductions, other dues"); › `arabic-digits-basic`
    (basic "١٠٠٠٠" gives the same total); › `pre-2022-leaver-refused`
    (last day 2021-06-30 shows the not-modelled message);
    › `gcc-refused`; › `uae-national-not-applicable`; › `bad-dates`.
- [ ] **Step 2: Run.** Expected: fail.
- [ ] **Step 3: Implement** against the checklists.
- [ ] **Step 4: Run tests, `pnpm check` and
  `pnpm --filter @payroll/web build`.** Confirm the gratuity code is in
  the calculator's chunk, not the entry chunk (the entry chunk does not
  contain the string `tier1DaysPerYear`). Expected: PASS.
- [ ] **Step 5: E2E** `e2e/wps.spec.ts` › `download-sif` (owner2 with
  the code on the approved seed run: prepare, download; the download's
  suggested name matches `/^\d{25}\.SIF$/` and its content has CRLF)
  and `e2e/eos.spec.ts` › `calculate-en-ar`. Expected: PASS.
- [ ] **Step 6: Commit.**
  `git commit -m "feat(web): WPS file screen and gratuity calculator"`

### Task 8: Settings: company, users, security, activity

**Files** (under `apps/web/src/` unless rooted):
- Create: `features/settings/SettingsLayout.tsx`,
  `features/settings/CompanyPage.tsx`,
  `features/settings/company-form.ts`,
  `features/settings/UsersPage.tsx`,
  `features/settings/InviteDialog.tsx`,
  `features/settings/role-matrix.ts`,
  `features/settings/SecurityPage.tsx`,
  `features/settings/ActivityPage.tsx`, `i18n/{en,ar}/settings.ts`
- Test: `apps/web/tests/features/company.test.tsx`,
  `tests/features/role-matrix.test.ts`,
  `tests/features/users.test.tsx`, `tests/features/security.test.tsx`,
  `tests/features/activity.test.tsx`, `e2e/settings.spec.ts`

**Interfaces:**
- Consumes: `getCompany`, `updateCompany`, `listUsers`, `inviteUser`,
  `mfaEnrol`, `mfaConfirm`, `listAuditEvents`, `verifyAudit`; `can`.
- Produces `company-form.ts`: `CompanyFormSchema` (zod: `name`
  required, `nameAr` optional, `wps.employerId` exactly 13 digits,
  `wps.bankRoutingCode` exactly 9 digits; Arabic-Indic digits mapped
  as in `parseAmountInput`).
- Produces `role-matrix.ts`: `roleMatrix(): { permission: Permission;
  roles: Role[] }[]` built from `can` (which Task 1 tests against
  `ROUTES`), shown on the Users page as "What each role can do".

Settings pages share `SettingsLayout` (`<nav aria-label="Settings">`,
`aria-current="page"` on the active link). Company: owner edits, others
read. Users (owner): users with role pills; "Invite user" opens
`InviteDialog` (email, role, linked employee); the result shows the
setup token as text to copy, with "Share this with the person; it
expires in 72 hours". Security: MFA enrolment for the signed-in user
(the secret and the `otpauth` URL as text to paste into an
authenticator app, then a code field calling `mfaConfirm`; no QR
library, Ruling W23). Activity (owner, hr): a `DataTable` of audit
events (seq, time in Dubai, actor, action, entity), action filter in
the URL, "Show older events" using `nextBefore`, and the server's
`verifyAudit` result in the header as text: "Chain checked: 120
events, no break" (success) or "Chain break at event 57" (danger).

**Checklist: CompanyPage and SecurityPage against form and flow** (from
`SignInPage`):

- [ ] fields, validation, submit, server error — as the reference
- [ ] layout — `SettingsLayout` nav — this plan
- [ ] read-only — users without `company.edit` see a
      `DescriptionList`, not disabled fields — this plan
- [ ] success — toasts "Company details saved", "Authenticator app
      added" — Global Constraints
- [ ] values — tokens only, base 4 — Task 1 tests
- [ ] not copied from the reference: code hint, demo hint, narrow
      column

**Checklist: UsersPage and ActivityPage against list page** (from
`EmployeesPage`):

- [ ] holder, header, rows, states — as the reference
- [ ] filters — Activity: action in URL params — as the reference
- [ ] roles — `StatusPill` neutral per role — the shared piece
- [ ] invite — `Dialog`; role as a radio group in `<fieldset>` with
      `<legend>` — the shared piece and this plan
- [ ] chain status — text plus tone, hashes shortened in `<Ltr>` — this
      plan
- [ ] paging — "Show older events" button after the table — this plan
- [ ] not copied from the reference: columns, department filter,
      export

Steps 1 to 3 from "UI consistency method" apply.

- [ ] **Step 1: Write failing tests.**
  - `company.test.tsx` › `employer-id-13-digits` (12 digits: field
    error); › `saves-and-toasts`; › `arabic-digits-accepted`
    (`"١٢٣٤٥٦٧٨٩٠١٢٣"` saves as `1234567890123`);
    › `hr-read-only`.
  - `role-matrix.test.ts` › `owner-only-approve` (`payroll.approve`
    lists only owner); › `every-permission-listed`.
  - `users.test.tsx` › `invite-shows-token`; › `hr-no-access` (hr on
    `/settings/users` sees `NoAccess`).
  - `security.test.tsx` › `enrol-then-confirm` (secret shown in
    `<Ltr>`; code `123456` confirms; toast).
  - `activity.test.tsx` › `filters-in-url`; › `chain-ok-text`;
    › `chain-break-text` (a mock with a tampered event: "Chain break at
    event 3"); › `older-events-paging`.
- [ ] **Step 2: Run.** Expected: fail.
- [ ] **Step 3: Implement** against the checklists.
- [ ] **Step 4: Run tests and `pnpm check`.** Expected: PASS.
- [ ] **Step 5: E2E** `e2e/settings.spec.ts` › `edit-company-then-see-
  activity` (owner saves the company; Activity shows the update event
  and the chain still checks). Expected: PASS.
- [ ] **Step 6: Commit.**
  `git commit -m "feat(web): settings, users, security and activity"`

### Task 9: A11y and viewport matrix, HTTP check, handover

**Files** (under `apps/web/` unless rooted):
- Create: `e2e/routes.ts` (every route with a role that may see it and
  its list method for failure injection), `e2e/matrix.spec.ts`,
  `tests/unit/http-client.test.ts`
- Modify: `HANDOVER.md`, `LEDGER.md` (root)

**Interfaces:**
- Consumes: every route from Task 2; `createHttpApi(base: string,
  auth: AuthSource, fetchFn: typeof fetch): ApiClient` (Task 1).

- [ ] **Step 1: Write the failing matrix.** `matrix.spec.ts` loops over
  each route in `routes.ts`, `en` and `ar`, `light` and `dark`, and
  widths 360, 768 and 1280:
  - › `axe-clean` (`@axe-core/playwright`: no violations of impact
    serious or critical, colour contrast included).
  - › `no-horizontal-scroll` (with `?mock-seed=large`,
    `document.documentElement.scrollWidth` is at most `clientWidth`).
  - › `states` (with `?mock-seed=empty` each data route shows
    `[data-state=empty]`; with `?mock-fail=<its list method>`
    `[data-state=error]` and "Try again"; with `?mock-latency=1500`
    `[data-state=loading]` before the data).
  - › `targets-44` (each visible button and link in `<main>` is at
    least 44 by 44, unless it is inline text inside a paragraph).
  - › `keyboard-only` (on `/pay-runs/new`, Tab reaches the primary
    action; the focused element's outline is at least 2px).
  - Each case signs in through `?mock-as=` with a role that may see
    the route (from `routes.ts`).
- [ ] **Step 2: Run** `pnpm --filter @payroll/web e2e -- matrix`.
  Expected: failures listing routes; fix each in its feature files and
  rerun until PASS.
- [ ] **Step 3: HTTP adapter tests** (`http-client.test.ts`, stubbed
  `fetchFn`): › `sends-auth-headers` (`Authorization: Bearer t1` and
  `X-Company-Id: c1` on tenant routes, neither on `login`);
  › `money-to-fils` (an `EmployeeView` example with `"1234.00"` gives
  `fils(123400n)`); › `error-envelope` (409 with `{ error: { code:
  "RUN_NOT_DRAFT", requestId: "r1" } }` gives `ApiError` code
  `RUN_NOT_DRAFT`, `requestId` `r1`); › `network-failure` (`NETWORK`);
  › `schema-mismatch-loud` (a body missing `number` gives
  `CONTRACT_MISMATCH` naming the path); › `idempotency-header`
  (`createPayRun` sends `Idempotency-Key`); › `download-text`
  (`downloadSif` returns the `text/plain` body unchanged, CRLF kept).
  Run; expected: PASS after any fix.
- [ ] **Step 4: Live check, when Plan 3's API runs** (`pnpm api:dev`
  exists): start it, run `pnpm web` with `VITE_API_MODE=http`, sign up
  a company and walk sign-in, employees, leave and a pay run by hand;
  record each difference from the mock in the ledger entry. If the API
  is not built yet, record that instead.
- [ ] **Step 5: Run everything.** `pnpm check`, `pnpm web:build`,
  `pnpm e2e`. Expected: PASS.
- [ ] **Step 6: Update `HANDOVER.md`** (state; `pnpm web`, demo
  accounts and code; `?mock-*` switches; `VITE_API_MODE`; `apps/web`
  layout; limits: Arabic awaiting native review, the app computes no
  pay, leave days are calendar days, no employee create, edit or
  import, no self-service) and `LEDGER.md` section 3 (Plan 4 built;
  Rulings W1 to W27).
- [ ] **Step 7: Commit.**
  `git commit -m "test(web): a11y and viewport matrix; handover"`
- [ ] **Step 8: Whole-branch review** (speed ruling) with the
  ui-consistency check: for each kind (list, detail, form and flow)
  calibrate one checker on a scratch copy of the reference with one
  planted difference, kept outside the repository and planted by
  another agent; that checker walks every page of its kind against
  the checklists in Tasks 2 to 8, then compares the whole set. Fix,
  rerun Step 5, commit.

---

## Not in this plan (M1 items left for later plans)

- Excel import and parallel-run comparison; adding and editing
  employees, salary and bank details (the API has the routes; the
  screens come with import).
- GPSSA, salary revisions, arrears, loss of pay, reversal and
  corrections (no sourced rules or bank answer yet).
- Payslip PDF, employee self-service (own payslips, clock-in), signup
  and invite-acceptance screens (Plan 3 has the routes).
- Any pay computation in the browser beyond the gratuity calculator.

## Asks to Plan 3 (the contract owner)

- State the wire encoding of `TraceLine.result` for `pay.*` lines
  (Money string or integer fils). The app does not depend on it
  (`payslipViewLines` takes amounts from payslip lines), but the
  contract should say.
- Add `sifFileId: Id | null` to `PayRun`, so the WPS screen can read a
  stored file without calling `POST /v1/pay-runs/{id}/sif`.
- Add a route to change a member's role (for example `PATCH
  /v1/users/{id}` with `{ role }`, owner only, audited); until then the
  Users page can invite but not change roles (Ruling W27).

## Rulings (Claude's calls; the owner can overrule)

- W1. React 19 with Vite 8 (already in the lockfile), single-page app,
  no server rendering. Cost if wrong: moving to a server-rendered
  framework rewrites routing and data loading, keeps components.
- W2. CSS Modules with CSS custom properties, no Tailwind: logical
  properties stay readable, the 80-character rule holds in `.tsx`, no
  extra build plugin. Cost: slower styling; switching later touches
  every `.module.css`.
- W3. Own typed i18n catalog (`Intl.PluralRules`,
  `Intl.DateTimeFormat`) instead of i18next: a missing Arabic key
  fails typecheck. Cost: no ICU messages or translation-platform
  plugins; migrating is about a day of key mapping.
- W4. In-memory mock adapter behind `ApiClient`, not MSW: identical in
  Vitest and Playwright, no service worker, failure and seed switches
  in the URL. Cost: HTTP serialisation is covered only by Task 9's
  adapter tests and live check.
- W5. react-router 7.18.7 (library mode, a known API) rather than the
  newer 8.x; TanStack Query 5. Cost: a later upgrade to 8 is a routing
  file change.
- W6. `@playwright/test` 1.63.0 to match the preinstalled Chromium
  1243; Chromium only; phone width as a Chromium viewport. Cost:
  Safari-only bugs (RTL, date inputs) are missed until a WebKit run
  exists.
- W7. `@payroll/engine` runs in the browser: it bundles to 33 kB with
  no Node imports (esbuild, 2026-11-26), lazy-loaded with the
  calculator; `@payroll/wps` (32 kB) only in the mock. Cost: if the
  engine gains Node imports, the calculator must call the API.
- W8. Plan 4 starts from Plan 3 Task 1's commit and consumes
  `@payroll/contract` directly; only `src/api/contract.ts` imports it
  and converts money to `Fils`. Cost: if Plan 3 Task 1 changes after
  Plan 4 starts, only `contract.ts`, `routes-map.ts` and the mock
  change.
- W9. Payslip line wording (en, ar) lives in the web catalog until a
  monthly engine exists; gratuity lines reuse the engine catalog. Cost:
  a small catalog move later.
- W10. Money on a trace line is decided in one place: payslip lines by
  `traceId`, engine lines by `MONEY_IDS`; a `pay.*` result string is
  never shown. Cost: an engine money id missing from `MONEY_IDS` shows
  as plain text.
- W11. Rule sources come from the engine's packs by `packId`,
  `packVersion` and `key`; an overridden rule shows no source; an input
  line says "From your records: no rule applies". Cost: rules from a
  pack not shipped in the browser show "no source" until the contract
  carries sources.
- W12. WPS findings are translated by code in the web (29 codes, a test
  enumerates them); unknown codes fall back to English. Cost: a new
  validator code shows English until added.
- W13. Arabic is visible to admins with an "awaiting native review"
  banner; Western digits and Gregorian dates. Cost: a native review may
  change many strings or prefer Arabic-Indic digits (a format switch,
  not a rewrite).
- W14. List filters live in the URL, so links and Back work. Cost:
  none found.
- W15. Fonts self-hosted (IBM Plex Sans and IBM Plex Sans Arabic), so
  the app works offline. Cost: about 200 kB of fonts; another typeface
  is a token change.
- W16. Employees are read-only in this plan. Cost: the demo cannot add
  people; the API routes stay unused until the import plan.
- W17. Leave days are calendar days, matching the contract's
  `dayCountRule`. Cost: differs from company practice until a sourced
  working-day rule exists.
- W18. Audit chain status comes from the server's `verifyAudit`; the
  app does not recompute hashes. Cost: none for correctness.
- W19. The ui-consistency checklists live in this plan (the dispatch
  asked for a plan in the repository), against the skill's "write
  nothing into the repository". Cost: checklists can go stale; the
  code wins.
- W20. No stop for a person's yes and no per-page checker: per the
  speed ruling, checklists go to the whole-branch review with one
  calibrated checker per kind; Tasks 5 and 6 keep a per-task review.
  Cost: consistency drift is found late and fixed in one wave.
- W21. Product name placeholder "HR and Payroll" in `src/brand.ts`;
  renaming is one change. Cost: none.
- W22. Built in a separate worktree on branch `plan-4-web-app` from
  the commit holding Plan 3 Task 1, merged into
  `claude/quirky-wozniak-b7xkvr` after the review; shared root files
  change only in Tasks 1 and 9. Cost: merge conflicts with Plan 3 in
  root files and the lockfile, resolved by `pnpm install`.
- W23. MFA follows Plan 3 (code at sign-in, enforced at approve, bank
  reveal and SIF download; re-sign-in when missing); enrolment shows
  the secret and URL as text, no QR library. Cost: weaker than the
  design's mandatory MFA for payroll roles until M2; typing a secret
  is clumsier than scanning a QR code.
- W24. The `employee` role has no access to this app in M1; managers
  see employees (their reports), leave, attendance and the calculator.
  Cost: none until self-service.
- W25. The mock never computes a settlement (it returns `refused` with
  `MOCK_NOT_COMPUTED`), so the only gratuity numbers in the app come
  from the real engine (calculator) or the real API. Cost: the offline
  demo cannot show a leaver's settlement on a payslip.
- W26. The bearer token, the company id and typed (not yet submitted)
  pay run amounts live in `sessionStorage`, as strings, cleared at sign
  out and when the tab closes. Cost: script injection could read them
  (an XSS hole would expose the token anyway); an HttpOnly cookie with
  CSRF protection is an additive change on both sides later.
- W27. Settings "roles" means: a read-only matrix of what each role can
  do (from `ROUTES`), each user's role, and invites with a role. Roles
  cannot be changed after invite because the contract has no route for
  it (asked of Plan 3). Cost: a wrong role means a new invite until the
  route exists.
