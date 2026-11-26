# Web App (Arabic and English, RTL) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A bilingual (Arabic and English, real RTL), light and dark,
accessible M1 web app for UAE SME payroll admins that runs offline against
a typed mock API and switches to the real API with one setting.

**Architecture:** New workspace package `apps/web` (`@payroll/web`),
React 19 and Vite 8, built in its own git worktree in parallel with Plan 3
(backend). Every server call goes through one `ApiClient` interface with
two adapters: an in-memory mock (default) and an HTTP adapter. Only
`src/api/contract.ts` knows the shape of `packages/contract`; the rest of
the app imports types from there. The pure `@payroll/engine` runs in the
browser for the end-of-service calculator and money formatting; the mock
alone uses `@payroll/wps` to build realistic SIF files.

**Tech Stack:** React 19.3.1, react-dom 19.3.1, Vite 8.3.8 (already in
the lockfile), `@vitejs/plugin-react` 6.3.0, react-router 7.18.7
(library mode), `@tanstack/react-query` 5.108.4, zod 4.6.7, CSS Modules
with CSS custom properties (no CSS framework), self-hosted fonts
`@fontsource/ibm-plex-sans` 5.3.0 and `@fontsource/ibm-plex-sans-arabic`
5.3.0, Vitest 5.1.2 with jsdom 31.0.1, `@testing-library/react` 16.3.3,
`@testing-library/dom` 10.4.2, `@testing-library/user-event` 14.6.13,
axe-core 4.14.1, `@playwright/test` 1.63.0 (matches the preinstalled
Chromium 1243; downloads are disabled), `@axe-core/playwright` 4.14.1,
`@types/react` 19.3.3, `@types/react-dom` 19.3.0, TypeScript 7.0.2.
All versions pinned exactly, as in the engine.

**Spec:** `docs/superpowers/specs/2026-11-25-uae-sme-hr-payroll-design.md`
(sections 2, 5 rows 6 and 8, 6 "Arabic" and "Security", 7),
`docs/superpowers/specs/2026-11-25-master-feature-list.md` (UQ1, UQ6,
UQ9, UQ12), `docs/engineering-standards.md`, `LEDGER.md` section 3
(speed ruling), `packages/engine/src/explain/` (wording to reuse).

## Global Constraints

- 80-character lines in every file, `.tsx` and `.css` included; files
  under about 300 lines; functions under 30 lines.
- Money is integer fils (`Fils`, bigint) from `@payroll/engine`. Never a
  JS `number` for money, never in JSON, query keys or browser storage.
  Amounts print through `formatAed` ("AED 38,333.33"), Western digits.
- Amounts, IBANs, ids, file names and rule ids inside Arabic text are
  wrapped in left-to-right isolates (`<bdi dir="ltr">` in markup; the
  engine's `LTR_ISOLATE` in plain strings).
- Dates are Gregorian with Western digits in both languages
  (`ar-AE-u-ca-gregory-nu-latn`). "Today" is computed once in Asia/Dubai
  at the composition root (`src/main.tsx`) and passed down.
- Every Arabic catalog file starts with
  `// NEEDS NATIVE REVIEW: authored by Claude, not yet confirmed by a`
  `// native speaker.` In Arabic mode the app shows a visible banner
  "Arabic text awaiting native review". No Arabic text is labelled final.
- Never the words "compliant", "verified" or "approved by MOHRE" about a
  WPS file in either language. The WPS screen closes with the exact
  sentence: "Layout matches two bank guides. Not confirmed by MOHRE or a
  bank test."
- The calculator total is labelled exactly "Computed total (excludes
  notice pay, deductions and other dues):" and lists "Not computed:
  notice pay, deductions, other dues".
- Every traced number shows its rule status in words: official,
  secondary, convention, hypothetical, unsourced (engine `STATUS_WORDS`).
- Separation of duties: the user who prepared a pay run cannot approve
  it. MFA code step at sign-in for payroll roles.
- Mock data is obviously fake: company "Sample Trading LLC (demo)",
  emails at `demo.test`, IBANs from the IBAN registry example
  `AE070331234567890123456`, and a "Sample data" badge in the top bar.
- A mock amount is only a contract amount or a sum of them. Anything that
  needs an unsourced rule (proration, deductions) appears as a finding,
  never as a number.
- No physical direction in styles: no `left`, `right`, `margin-left`,
  `padding-right`, `text-align: left`, `border-left` and the like; logical
  properties only. No hex or rgb colour outside `src/theme/tokens.css`.
- The product name lives only in `src/brand.ts` (`PRODUCT_NAME`); the
  placeholder is "HR and Payroll" / "الموارد البشرية والرواتب"
  (NEEDS NATIVE REVIEW).
- Visible keyboard focus, 44 by 44 pixel touch targets, no horizontal
  page scroll at 360, 768 and 1280 pixel widths, `prefers-reduced-motion`
  respected, loading, empty and error states on every data screen.
- Shared root files (`package.json`, `pnpm-workspace.yaml`,
  `pnpm-lock.yaml`, `scripts/check-line-length.mjs`) change only in
  Task 1; `HANDOVER.md` and `LEDGER.md` only in Task 9. On merge, a
  lockfile conflict is resolved by `pnpm install`, never by hand.

## Review Focus

- Mixed direction: in Arabic, a Latin name, an IBAN, an amount or
  `0000000123456261126103000.SIF` must read in its own order, not
  reversed. Test `ltr-isolation` in Task 2 and `wps-file-name-rtl` in
  Task 7.
- One person with both preparer and approver roles (the owner) opens a
  run they prepared: Approve is refused by the mock API and the button is
  disabled with the reason. Tests `approve-refused-same-user` (API) and
  `approve-disabled-for-preparer` (UI) in Task 5.
- Session expiry in the middle of the pay run wizard: the next call
  returns `UNAUTHENTICATED`; the app goes to sign-in and returns to the
  same run and step. Test `expired-session-returns-to-step` in Task 2.
- Amount typed with Arabic-Indic digits ("١٠٠٠٠٫٥٠"), thousands commas
  ("10,000.50"), three decimals or a minus sign in the calculator: the
  first two are accepted and normalised, the rest are refused with a
  field error. Test `amount-input-normalises-digits` in Task 7.
- Long content at 360 pixels: a 60-character employee name, a salary of
  AED 9,999,999.99 and 250 employees (`?mock-seed=large`) cause no
  horizontal scroll on any route in either language. Test
  `no-horizontal-scroll` in Task 9.

---

## Design direction (decided once; every UI task uses it)

The product's subject is money that people must be able to trust and
check. The look is calm, exact and quietly futuristic: cool paper and
deep ink, one Gulf-teal accent for action, and one indigo "trace" colour
that appears only where a number is explained. Boldness is spent in one
place: the trace view, where an expanded number shows a thin indigo
thread along its inline-start edge from amount to rule to source. Avoid
gradient washes, identical shadowed cards, all-caps eyebrows, monospace
labels and decorative numbering. The dashboard leads with the pay run
status rail (Draft, Checked, In review, Approved, File ready) and its
next action, not a big-number hero.

Tokens (`src/theme/tokens.css`; values may be tuned only to pass the
contrast test in Task 1):

| Token | Light | Dark |
|---|---|---|
| `--color-bg` | `#F5F7FA` | `#0E1726` |
| `--color-surface` | `#FFFFFF` | `#152033` |
| `--color-surface-2` | `#EDF1F6` | `#1C2A40` |
| `--color-border` | `#C9D2DE` | `#33435E` |
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
64 px. Type scale ratio 1.2: `--text-xs` 12, `--text-sm` 14, `--text-md`
16, `--text-lg` 19, `--text-xl` 23, `--text-2xl` 28, `--text-3xl` 33 px.
Line height 1.5, and 1.7 under `:lang(ar)`. Radius: `--radius-control`
6px, `--radius-panel` 10px, `--radius-pill` 999px. Font stack
`"IBM Plex Sans", "IBM Plex Sans Arabic", system-ui, sans-serif`;
amounts use `font-variant-numeric: tabular-nums`. Sentence case
everywhere; buttons are verbs and the toast repeats the verb
("Approve" then "Approved").

## UI consistency method (applies to Tasks 2 to 8)

The repository has no UI yet, so no family or majority exists. Per
`ui-consistency:decisions` ("nothing at all is written"), each role is
first written as the element whose meaning it has; Task 2 then builds
the shared pieces and Task 3 builds the reference pages. From Task 3 on,
checklist lines are settled by "the shared piece (Task 2)" or by "the
reference (Task 3)". Three kinds of page, each with one reference:

- list: `src/features/employees/EmployeesPage.tsx`
- detail: `src/features/employees/EmployeeProfilePage.tsx`
- form and flow: `src/features/auth/SignInPage.tsx` (Task 2)

Checker: the whole-branch reviewer (speed ruling) runs
`ui-consistency:verifying` with one checker per kind, calibrated once per
kind on a scratch copy of the reference with one planted difference,
kept outside the repository; the planter is not the checker. Tasks 5
and 6 also get a per-task review (money shown to people, separation of
duties). These deviations from the skills are Rulings W19 and W20.

---

### Task 1: Scaffold, design tokens, i18n and the mock API layer

Mergeable alone: after this task `pnpm check` passes, `pnpm web` serves
a page with the product name, a language switch and a theme switch, and
the mock API answers every `ApiClient` method.

**Files:**
- Modify: `pnpm-workspace.yaml` (add `"apps/*"`), root `package.json`
  (scripts `web`, `web:build`, `e2e`), `scripts/check-line-length.mjs`
  (roots add `apps`; extensions add `.tsx`, `.css`, `.html`; skip dirs
  add `test-results`, `playwright-report`), its test file.
- Create: `apps/web/package.json`, `apps/web/tsconfig.json`,
  `apps/web/vite.config.ts`, `apps/web/vitest.config.ts`,
  `apps/web/playwright.config.ts`, `apps/web/index.html`,
  `apps/web/.env.example` (`VITE_API_MODE=mock`, `VITE_API_BASE=`)
- Create: `src/main.tsx`, `src/App.tsx`, `src/brand.ts`,
  `src/config.ts`, `src/theme/tokens.css`, `src/theme/base.css`,
  `src/theme/ThemeProvider.tsx`, `src/lib/prefs.ts`,
  `src/lib/today.ts`
- Create: `src/i18n/types.ts`, `src/i18n/en/common.ts`,
  `src/i18n/en/index.ts`, `src/i18n/ar/common.ts`,
  `src/i18n/ar/index.ts`, `src/i18n/t.ts`, `src/i18n/format.ts`,
  `src/i18n/LocaleProvider.tsx`
- Create: `src/api/client.ts`, `src/api/errors.ts`,
  `src/api/contract.ts`, `src/api/contract-standin.ts` (only if
  `packages/contract` is absent), `src/api/select.ts`,
  `src/api/http/http-client.ts`, `src/api/mock/mock-client.ts`,
  `src/api/mock/seed.ts`, `src/api/mock/seed-large.ts`,
  `src/api/mock/pay.ts`, `src/api/mock/sif.ts`,
  `src/api/mock/options.ts`
- Test: `tests/unit/tokens.test.ts`, `tests/unit/style-rules.test.ts`,
  `tests/unit/boundaries.test.ts`, `tests/unit/i18n.test.ts`,
  `tests/unit/format.test.ts`, `tests/unit/mock-client.test.ts`,
  `tests/unit/brand.test.ts`, `e2e/smoke.spec.ts`

(All `src`, `tests` and `e2e` paths are under `apps/web/`.)

**Interfaces:**
- Consumes: `@payroll/engine` (`Fils`, `fils`, `formatAed`, `parseAed`,
  `LTR_ISOLATE`, `STATUS_WORDS`, `TraceLine`, `TraceRule`, `RuleStatus`,
  `RuleSource`); `@payroll/wps` (`generateSif`, `validateSif`,
  `Finding`) in `src/api/mock/` only; `@payroll/contract` in
  `src/api/contract.ts` only.
- Produces `src/brand.ts`:
  `PRODUCT_NAME: Readonly<Record<Lang, string>>`.
- Produces `src/config.ts`: `type ApiMode = "mock" | "http"`;
  `readConfig(env: Record<string, string | undefined>): { apiMode:
  ApiMode; apiBase: string }` (unknown mode throws `CONFIG_API_MODE`).
- Produces `src/i18n/types.ts`: `type Lang = "en" | "ar"`;
  `interface EnPlural { one: string; other: string }`;
  `interface ArPlural { zero; one; two; few; many; other: string }`;
  `type Messages` = the English catalog's shape; Arabic is typed
  `ArMessages` (same keys; plural values are `ArPlural`).
- Produces `src/i18n/t.ts`: `type MessageKey`;
  `createT(lang: Lang): (key: MessageKey, vars?: Record<string,
  string | number>) => string` (`{name}` placeholders; a plural value
  needs `vars.count`, chosen with `Intl.PluralRules`).
- Produces `src/i18n/format.ts`: `formatMoney(f: Fils, lang: Lang):
  string` (engine `formatAed` inside `LTR_ISOLATE[lang]`);
  `formatDate(iso: string, lang: Lang): string`;
  `formatNumber(n: number, lang: Lang): string`;
  `dirOf(lang: Lang): "ltr" | "rtl"`;
  `parseAmountInput(text: string): Fils` (used in Task 7).
- Produces `src/i18n/LocaleProvider.tsx`: `useLocale(): { lang: Lang;
  dir; t; setLang(l: Lang): void }`; sets `<html lang dir>`.
- Produces `src/theme/ThemeProvider.tsx`: `type ThemePref = "light" |
  "dark" | "system"`; `useTheme(): { pref; resolved: "light" | "dark";
  setPref }`; sets `<html data-theme>`.
- Produces `src/lib/today.ts`: `todayInDubai(now: Date): string`
  (ISO date, `Intl.DateTimeFormat` with `timeZone: "Asia/Dubai"`).
- Produces `src/api/errors.ts`: `class ApiError extends Error { code:
  string; status: number; detail: Record<string, string> }`; codes used
  by the app: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`,
  `VALIDATION`, `SEPARATION_OF_DUTIES`, `MFA_INVALID`, `NETWORK`.
- Produces `src/api/client.ts` (the whole app talks to this):

```ts
export interface ApiClient {
  signIn(email: string, password: string): Promise<SignInResult>;
  verifyMfa(challengeId: string, code: string): Promise<Session>;
  signOut(): Promise<void>;
  getSession(): Promise<Session | null>;
  getCompany(): Promise<Company>;
  updateCompany(patch: CompanyPatch): Promise<Company>;
  listDepartments(): Promise<Department[]>;
  listEmployees(q?: EmployeeQuery): Promise<Employee[]>;
  getEmployee(id: string): Promise<Employee>;
  listLeaveTypes(): Promise<LeaveType[]>;
  listLeaveRequests(q?: LeaveQuery): Promise<LeaveRequest[]>;
  listLeaveBalances(employeeId?: string): Promise<LeaveBalance[]>;
  createLeaveRequest(input: NewLeaveRequest): Promise<LeaveRequest>;
  decideLeaveRequest(id: string, d: "approve" | "reject"):
    Promise<LeaveRequest>;
  listAttendance(q: AttendanceQuery): Promise<AttendanceRecord[]>;
  listPayrollRuns(): Promise<PayrollRun[]>;
  getPayrollRun(id: string): Promise<PayrollRun>;
  createPayrollRun(input: NewPayrollRun): Promise<PayrollRun>;
  checkPayrollRun(id: string): Promise<PayrollRun>;
  submitPayrollRun(id: string, ackWarnings: boolean):
    Promise<PayrollRun>;
  approvePayrollRun(id: string): Promise<PayrollRun>;
  listPayslips(runId: string): Promise<Payslip[]>;
  getPayslip(id: string): Promise<Payslip>;
  generateSif(runId: string): Promise<SifFile>;
  getSifFile(runId: string): Promise<SifFile | null>;
  listAuditEvents(q?: AuditQuery): Promise<AuditEvent[]>;
  listUsers(): Promise<User[]>;
  listRoles(): Promise<Role[]>;
  setUserRoles(userId: string, roleIds: RoleId[]): Promise<User>;
}
```

- Produces `src/api/select.ts`: `createApi(cfg: { apiMode; apiBase },
  mock: MockOptions): ApiClient` (the one switch).
- Produces `src/api/mock/options.ts`: `interface MockOptions { today:
  string; latencyMs: number; seed: "demo" | "empty" | "large";
  failures: ReadonlySet<keyof ApiClient> }`;
  `mockOptionsFromUrl(search: string, today: string): MockOptions`
  (`?mock-fail=listEmployees,getCompany`, `?mock-seed=empty|large`,
  `?mock-latency=0`).
- Produces `src/api/mock/mock-client.ts`:
  `createMockApi(o: MockOptions): ApiClient`.

**Expected contract surface** (`src/api/contract.ts` re-exports these
types and zod schemas; field names below are what the app reads; if
Plan 3 names differ, only `contract.ts` maps them):

| Type | Fields the app reads |
|---|---|
| `Company` | `id`, `legalName`, `legalNameAr` (nullable), `tradeLicenceNo`, `employerId` (13 digits), `bankRoutingCode` (9 digits) |
| `Department` | `id`, `name`, `nameAr` |
| `Employee` | `id`, `employeeNo`, `fullName`, `fullNameAr` (nullable), `departmentId`, `jobTitle`, `joiningDate`, `status` (`active`, `on_leave`, `left`), `workerClass`, `personId` (14 digits), `iban`, `routingCode`, `salary: SalaryComponent[]`, `visaExpiry`, `emiratesIdExpiry`, `labourCardExpiry` (ISO or null) |
| `SalaryComponent` | `id`, `kind` (`basic`, `housing`, `transport`, `other`), `label`, `amount` (fils), `effectiveFrom` |
| `LeaveType` | `id`, `code`, `name`, `nameAr`, `paid` |
| `LeaveRequest` | `id`, `employeeId`, `leaveTypeId`, `startDate`, `endDate`, `days`, `status` (`pending`, `approved`, `rejected`, `cancelled`), `requestedAt`, `decidedBy` (nullable) |
| `LeaveBalance` | `employeeId`, `leaveTypeId`, `entitledDays`, `takenDays`, `pendingDays`, `remainingDays` |
| `AttendanceRecord` | `id`, `employeeId`, `date`, `checkIn`, `checkOut` (`HH:MM` or null), `status` (`present`, `absent`, `leave`, `holiday`, `weekend`), `minutesWorked` |
| `PayrollRun` | `id`, `month` (`YYYY-MM`), `status` (`draft`, `checked`, `in_review`, `approved`, `file_ready`), `preparedBy`, `approvedBy` (nullable), `employeeIds`, `gross`, `net` (fils), `findings: RunFinding[]` |
| `RunFinding` | `code`, `severity` (`error`, `warning`), `employeeId` (nullable), `params: Record<string, string>` |
| `Payslip` | `id`, `runId`, `employeeId`, `gross`, `net` (fils), `lines: PayslipLine[]` |
| `PayslipLine` | engine `TraceLine` fields plus `kind` (`money`, `count`, `text`) and `rules[].source` (`{ url, note }` or null) |
| `SifFile` | `id`, `runId`, `fileName`, `createdAt`, `text`, `findings` (wps `Finding[]`) |
| `AuditEvent` | `id`, `at`, `actorId`, `action`, `entity`, `entityId`, `hash`, `prevHash` |
| `User` | `id`, `email`, `name`, `roleIds`, `mfaEnrolled` |
| `Role` | `id` (`owner`, `hr_admin`, `payroll_preparer`, `payroll_approver`, `employee`), `permissions: string[]` |
| `Session` | `user: User`, `permissions: string[]` |
| `SignInResult` | `{ kind: "ok"; session }` or `{ kind: "mfa"; challengeId }` |
| error envelope | `{ error: { code, message, detail } }` |

Wire encoding assumed: money is a decimal string of integer fils
("1000000"), mapped to `Fils` in `contract.ts`; dates ISO `YYYY-MM-DD`;
timestamps ISO 8601 UTC; ids opaque strings. Auth transport (cookie or
bearer) is unknown until Plan 3 and lives only in `http-client.ts`.

- [ ] **Step 1: Prove the toolchain.** Create `apps/web/package.json`
  (name `@payroll/web`, `type: module`, scripts `dev`, `build`,
  `preview`, `typecheck` = `tsc --noEmit`, `test` = `vitest run`, `e2e`
  = `playwright test`; dependencies `@payroll/engine`, `@payroll/wps`
  and, if it exists, `@payroll/contract`, all `workspace:*`),
  `tsconfig.json` (extends the base; `jsx: react-jsx`; `lib` ES2022,
  DOM, DOM.Iterable; `types: ["vite/client"]`), `index.html`, and a
  one-line `src/App.tsx`. Run `pnpm install` then
  `pnpm --filter @payroll/web typecheck`. Expected: exit 0 under TS 7.
  If TS 7 rejects the JSX setup, stop and record the failure; do not
  downgrade TypeScript without a ruling.
- [ ] **Step 2: Write the failing unit tests.**
  - `tokens.test.ts` › `contrast-pairs-pass`: parse `tokens.css` for
    both themes; WCAG ratio at least 4.5 for text, text-muted, accent,
    trace, danger, success on surface and bg, warning on warning-bg,
    on-accent on accent; at least 3 for focus and border on surface.
  - `style-rules.test.ts` › `no-physical-direction`: no file under `src`
    matches `/(margin|padding|border)-(left|right)|\b(left|right)\s*:|
    text-align:\s*(left|right)|float:\s*(left|right)/`;
    › `no-colour-literals`: no `#hex`, `rgb(` or `hsl(` outside
    `tokens.css`.
  - `boundaries.test.ts` › `contract-imported-once`: only
    `src/api/contract.ts` imports `@payroll/contract` or
    `contract-standin`; › `wps-only-in-mock`: only `src/api/mock/**`
    imports `@payroll/wps`; › `no-other-workspace-imports`: the only
    `@payroll/*` imports are engine, wps and contract.
  - `i18n.test.ts` › `ar-has-every-en-key`, › `same-placeholders`
    (every `{name}` set equal per key), › `no-empty-strings`,
    › `ar-files-flagged` (each `src/i18n/ar/*.ts` starts with the
    NEEDS NATIVE REVIEW line), › `plurals-en-ar`: for a plural key
    `common.employees`, en gives "0 employees", "1 employee",
    "3 employees"; ar picks forms zero, one, two, few, many, other at
    counts 0, 1, 2, 3, 11, 100.
  - `format.test.ts` › `money-ltr-isolated`: `formatMoney(fils(
    3833333n), "ar")` is `"⁦AED 38,333.33⁩"`, en has no
    isolate; › `date-latin-gregorian`: `formatDate("2026-11-26",
    "ar")` matches `/2026/` and contains no character in
    `٠-٩`; › `today-dubai`: `todayInDubai(new Date(
    "2026-11-25T21:30:00Z"))` is `"2026-11-26"`.
  - `mock-client.test.ts` › `sign-in-mfa-for-payroll-roles`
    (`preparer@demo.test` gives `kind: "mfa"`, code `123456` gives a
    session, `000000` throws `MFA_INVALID`); › `hr-admin-no-mfa`;
    › `failure-injection` (`failures` has `listEmployees` so it rejects
    with `ApiError` code `NETWORK`); › `empty-seed` (no employees,
    no runs); › `large-seed` (250 employees, one name of 60
    characters, one salary of AED 9,999,999.99); › `amounts-are-sums`
    (each mock payslip `gross` equals the sum of the employee's
    components and `net` equals `gross`); › `unpaid-leave-is-finding`
    (an employee with approved unpaid leave in the month yields a
    warning `UNPAID_LEAVE_NOT_DEDUCTED`, and their net is unchanged);
    › `sif-from-wps` (`generateSif` returns text whose `validateSif`
    has no error findings and a file name matching
    `/^\d{13}\d{12}\.SIF$/`); › `today-is-input` (no `Date` call under
    `src/api/mock/`, checked by reading the files).
  - `brand.test.ts` › `name-defined-once`: the strings in
    `PRODUCT_NAME` appear in no other file under `src`, `e2e` or
    `index.html`; the document title is set from `PRODUCT_NAME`.
- [ ] **Step 3: Run them.** `pnpm --filter @payroll/web test`.
  Expected: all fail (modules missing).
- [ ] **Step 4: Implement the theme, i18n and brand files.** Fonts are
  imported in `main.tsx` (Latin and Arabic, weights 400, 500, 600).
  `prefs.ts` wraps every `localStorage` read and write in try and catch
  and stores only `lang` and `theme`. `base.css` sets body background
  and colour from tokens, focus ring `2px solid var(--color-focus)` with
  offset 2px, and a reduced-motion block that sets transition and
  animation durations to 0.01ms.
- [ ] **Step 5: Implement the API layer.** The mock keeps state in
  memory per instance, waits `latencyMs` per call, and throws
  `ApiError` for unknown ids (`NOT_FOUND`) and wrong-state actions
  (`CONFLICT`). Seed: 12 employees in 3 departments, names in English
  and Arabic (NEEDS NATIVE REVIEW), leave types annual, sick and
  unpaid, leave requests in each status, attendance for the current
  month built from `today`, one run in `draft` for the previous month,
  five users (`owner`, `hr`, `preparer`, `approver`, `employee` at
  `demo.test`, password `demo-password`; payroll roles need MFA code
  `123456`; the owner holds both payroll roles). Payslip lines: one
  `money` line per salary component (`rules: []`, input from the
  employment contract), `pay.gross` and `pay.net` sums. `sif.ts` maps
  a run to a wps `SifBatch` and calls `generateSif` and `validateSif`.
  The HTTP adapter implements the interface with `fetch`, parses every
  response through the contract schema, and maps the error envelope and
  network failures to `ApiError`.
- [ ] **Step 6: Implement `App.tsx`** as a minimal shell: `<header>`
  with `PRODUCT_NAME[lang]`, the "Sample data" badge in mock mode, a
  language switch and a theme switch (real `<button>`s with
  `aria-pressed`), and a `<main>` stating the app is being built.
- [ ] **Step 7: Run unit tests and `pnpm check`.** Expected: PASS, and
  `pnpm lines` now scans `apps`.
- [ ] **Step 8: Playwright smoke.** `playwright.config.ts`: Chromium
  only, `webServer` runs `vite build && vite preview --port 4173`,
  projects `desktop` (1280x800) and `phone` (360x740, Chromium, not a
  WebKit device preset). `smoke.spec.ts` › `loads-in-english`:
  `html[lang=en][dir=ltr]` and the product name visible;
  › `switches-to-arabic`: clicking the Arabic switch sets
  `html[lang=ar][dir=rtl]`, shows the review banner, and persists on
  reload; › `dark-theme`: the theme switch sets `data-theme=dark` and
  body background equals `--color-bg` dark. Run
  `pnpm --filter @payroll/web e2e`. Expected: PASS.
- [ ] **Step 9: Commit.**
  `git commit -m "feat(web): scaffold, tokens, i18n and mock API"`

### Task 2: UI kit, app shell, routing and sign-in

**Files:**
- Create: `src/ui/` (one file plus one `.module.css` each): `Button`,
  `IconButton`, `Field`, `TextField`, `Select`, `Checkbox`, `Page`,
  `PageHeader`, `BackLink`, `Section`, `DescriptionList`, `DataTable`,
  `FilterBar`, `StatusPill`, `Money`, `DateText`, `Ltr`, `Alert`,
  `Toast` (provider and `useToast`), `Dialog`, `Skeleton`,
  `EmptyState`, `ErrorState`, `QueryState`, `Stepper`,
  `FormErrorSummary`, `icons.tsx`
- Create: `src/app/Shell.tsx`, `src/app/Nav.tsx`, `src/app/routes.tsx`,
  `src/app/RequireAuth.tsx`, `src/app/permissions.ts`,
  `src/app/session.tsx`, `src/app/query.ts`, `src/app/NotFound.tsx`,
  `src/app/NoAccess.tsx`, `src/features/auth/SignInPage.tsx`,
  `src/i18n/en/ui.ts`, `src/i18n/ar/ui.ts`, `src/i18n/en/auth.ts`,
  `src/i18n/ar/auth.ts`
- Modify: `src/App.tsx` (providers and router), `src/main.tsx`
- Test: `tests/ui/*.test.tsx` (one per component group),
  `tests/unit/a11y.ts` (helper), `tests/app/session.test.tsx`,
  `e2e/sign-in.spec.ts`

**Interfaces:**
- Consumes: Task 1 (`ApiClient`, `ApiError`, `useLocale`, `useTheme`,
  `formatMoney`, `formatDate`).
- Produces `src/app/permissions.ts`: `type Permission = "employees.read"
  | "leave.read" | "leave.decide" | "attendance.read" | "payroll.prepare"
  | "payroll.approve" | "wps.generate" | "settings.manage" |
  "audit.read"`; `can(session: Session, p: Permission): boolean`.
- Produces `src/app/session.tsx`: `SessionProvider`, `useSession():
  { session: Session | null; signIn; verifyMfa; signOut }`.
- Produces `src/app/query.ts`: `useApi(): ApiClient`;
  `qk` (query key factory; keys hold strings only, never `Fils`).
- Produces `src/ui/QueryState.tsx`: `<QueryState query={q}
  skeleton={node} isEmpty={(d) => boolean} empty={node}>{(data) =>
  node}</QueryState>`; error renders `ErrorState` with a retry button
  calling `q.refetch`; `UNAUTHENTICATED` is handled by `RequireAuth`.
- Produces `src/ui/DataTable.tsx`: `DataTable<T>({ rows: T[];
  columns: Column<T>[]; rowKey(r): string; caption: string })`,
  `Column<T> = { id; header: string; cell(r: T): ReactNode; align?:
  "start" | "end" }`; a real `<table>` with `<caption>` (visually
  hidden); below 640px rows stack as labelled blocks (CSS only,
  `data-label`).
- Produces `src/ui/Money.tsx`: `<Money value={Fils} />` renders
  `<bdi dir="ltr">` with tabular figures; `src/ui/Ltr.tsx`:
  `<Ltr>{text}</Ltr>` for IBANs, ids and file names.
- Produces `src/ui/StatusPill.tsx`: `<StatusPill tone="neutral" |
  "info" | "success" | "warning" | "danger">{label}</StatusPill>`
  (text always present; colour never the only signal).
- Produces `src/ui/Stepper.tsx`: `<Stepper steps={{ id; label }[]}
  current={id} />` as `<ol>` with `aria-current="step"`.
- Produces routes: `/sign-in`, `/`, `/employees`, `/employees/:id`,
  `/leave`, `/attendance`, `/pay-runs`, `/pay-runs/new`,
  `/pay-runs/:runId` (`?step=inputs|checks|review|approve`),
  `/pay-runs/:runId/payslips/:payslipId`, `/pay-runs/:runId/wps`,
  `/tools/end-of-service`, `/settings/company`, `/settings/users`,
  `/settings/activity`, `*`. Each page module is lazy-loaded.

Shell: top bar (product name, "Sample data" badge, language switch,
theme menu, user menu with sign out); `<nav aria-label>` side rail on
1024px and up, a menu `Dialog` below that. Directional icons (back,
chevron) mirror under `[dir=rtl]` with `transform: scaleX(-1)`. Nav
items hidden when `can()` is false; a direct visit shows `NoAccess`.
The `employee` role signs in to `NoAccess` (self-service is M2).

Sign-in is the form reference page. Element tree:

```
Page (main)                          as <main>
  PageHeader                         as <header>
    title                            as <h1>
  form                               as <form noValidate>
    FormErrorSummary                 as <div role=alert> (2+ errors)
    Field email, Field password      as <label>+<input>, error <p>
    Button "Sign in"                 as <button type=submit>
  (MFA step) Field code              as <input inputmode=numeric
                                        autocomplete=one-time-code>
  demo accounts hint (mock only)     as <details>
```

- [ ] **Step 1: Write failing component tests** (`tests/ui/`):
  - `button.test.tsx` › `pending-keeps-label`: `pending` sets
    `aria-busy="true"`, keeps the text, ignores clicks.
  - `field.test.tsx` › `label-and-error-wired`: the input has an
    accessible name from the label; with `error`, `aria-invalid="true"`
    and `aria-describedby` points at the error text.
  - `data-table.test.tsx` › `caption-and-headers`: `getByRole("table",
    { name })`, one `columnheader` per column; `align: "end"` cells get
    the end-aligned class.
  - `money.test.tsx` › `ltr-isolation`: in Arabic, `<Money>` renders a
    `bdi` with `dir="ltr"` and text `AED 9,999,999.99`; `<Ltr>` does
    the same for `AE070331234567890123456`.
  - `query-state.test.tsx` › `loading-empty-error-data`: pending shows
    the skeleton with `aria-busy`; empty shows the empty node; error
    shows "Try again", clicking it calls `refetch`; data renders
    children.
  - `stepper.test.tsx` › `current-step-marked`.
  - `axe.test.tsx` › `kit-has-no-axe-violations`: render each component
    in both languages and run axe-core (colour contrast rule disabled in
    jsdom; Task 1 tests contrast).
- [ ] **Step 2: Write failing app tests** (`tests/app/session.test.tsx`,
  with the mock API at latency 0):
  - › `redirects-to-sign-in`: `/employees` while signed out lands on
    `/sign-in?returnTo=%2Femployees`.
  - › `mfa-step-for-preparer`: sign in as preparer, enter `123456`,
    land on `/`.
  - › `wrong-code-message`: `000000` shows the `MFA_INVALID` message in
    the code field error and focuses the field.
  - › `expired-session-returns-to-step`: signed in at
    `/pay-runs/run-1?step=review`, the next call throws
    `UNAUTHENTICATED`; the app shows sign-in with
    `returnTo=%2Fpay-runs%2Frun-1%3Fstep%3Dreview`; after signing in it
    returns there.
  - › `nav-respects-permissions`: `hr@demo.test` sees no Pay runs link;
    visiting `/pay-runs` shows `NoAccess`.
  - › `employee-role-no-access`.
- [ ] **Step 3: Run.** `pnpm --filter @payroll/web test`. Expected:
  new tests fail.
- [ ] **Step 4: Implement the kit, shell, routes and sign-in.** Forms
  validate on submit with zod, focus the first invalid field, and show
  `FormErrorSummary` when two or more fields fail. The submit button is
  never disabled for invalid input, only while pending. Placeholder
  pages for later tasks render `PageHeader` and an `EmptyState` saying
  the screen is not built yet.
- [ ] **Step 5: Run unit tests and `pnpm check`.** Expected: PASS.
- [ ] **Step 6: E2E** `e2e/sign-in.spec.ts` › `sign-in-each-role` (hr,
  preparer with MFA, approver with MFA) and › `rtl-shell` (Arabic: nav
  on the inline-start side, i.e. its bounding box is on the right half
  at 1280px; back icon mirrored). Run `pnpm --filter @payroll/web e2e`.
  Expected: PASS.
- [ ] **Step 7: Commit.**
  `git commit -m "feat(web): UI kit, shell, routing and sign-in"`

### Task 3: Dashboard, employees list and employee profile

**Files:**
- Create: `src/features/dashboard/DashboardPage.tsx`,
  `src/features/dashboard/summary.ts`,
  `src/features/dashboard/RunRail.tsx`,
  `src/features/employees/EmployeesPage.tsx`,
  `src/features/employees/EmployeeProfilePage.tsx`,
  `src/features/employees/columns.tsx`,
  `src/features/employees/expiry.ts`, `src/i18n/{en,ar}/dashboard.ts`,
  `src/i18n/{en,ar}/employees.ts` (with matching `.module.css` where a
  page needs layout)
- Test: `tests/features/dashboard.test.tsx`,
  `tests/features/summary.test.ts`, `tests/features/employees.test.tsx`,
  `e2e/employees.spec.ts`

**Interfaces:**
- Consumes: Task 2 kit and `useApi`, `qk`; `ApiClient` list methods.
- Produces `summary.ts`: `buildDashboard(input: { today: string;
  runs: PayrollRun[]; leave: LeaveRequest[]; employees: Employee[] }):
  DashboardSummary` with `currentRun: PayrollRun | null` (latest month),
  `nextAction: "create" | "check" | "submit" | "approve" | "generate"
  | "download" | null`, `onLeaveToday: { employeeId; leaveTypeId;
  endDate }[]` (approved, start at or before today, end at or after),
  `alerts: Alert[]` where `Alert = { kind: "document-expiry" |
  "run-error" | "pending-leave"; employeeId: string | null; date:
  string | null; count: number }`.
- Produces `expiry.ts`: `expiringDocuments(e: Employee, today: string,
  withinDays: number): { doc: "visa" | "emirates-id" | "labour-card";
  date: string; expired: boolean }[]` (calendar days, no clock).

Dashboard tree: `Page`; `PageHeader` (h1 "Overview" with the company
name); `RunRail` (a `Stepper` of run states plus one primary `Button`
for `nextAction`); `Section` "On leave today" (a short `DataTable`);
`Section` "Needs attention" (a list of `Alert`s, each a link to its
fix); each section in its own `QueryState`.

**Checklist: EmployeesPage against list page** (the reference for the
kind; nothing earlier exists, settled by this plan and the Task 2 kit,
read 2026-11-26):

- [ ] page holder — `Page` as `<main>`, one `<h1>` — the shared piece
- [ ] header — `PageHeader`: h1, one-line description, the page's
      action at inline end — the shared piece
- [ ] filters — `FilterBar` with `TextField` search and `Select`s; the
      state lives in URL search params (`?q=&dept=&status=`) — W14
- [ ] rows — `DataTable`, first cell is a `<Link>` to the detail, so
      Enter and middle-click work; no click handler on `<tr>` — the
      shared piece
- [ ] money and dates — `<Money>` and `<DateText>` only, end-aligned
      columns for amounts — the shared piece
- [ ] status — `StatusPill` with a tone map in the feature — the shared
      piece
- [ ] states — `QueryState` with skeleton rows, `EmptyState` with one
      action, `ErrorState` with retry; "no results for these filters"
      is a separate empty state with "Clear filters" — the shared piece
- [ ] words — `t()` in the feature namespace, sentence case, verbs on
      buttons — Global Constraints
- [ ] values — tokens only, spacing on the base 4, logical properties —
      Task 1 tests
- [ ] not copied by later list pages: the employee columns, the
      department filter, the "Export CSV" action

**Checklist: EmployeeProfilePage against detail page** (reference for
the kind, same basis):

- [ ] page holder — `Page`; `BackLink` to the list keeping its filters
      (mirrored arrow) above the h1 — the shared piece
- [ ] title — h1 is `fullNameAr` in Arabic when present, else
      `fullName` — this plan
- [ ] summary — `DescriptionList` (`<dl>`) of key facts; IBAN and
      person id inside `<Ltr>` — the shared piece
- [ ] sections — `Section` with `<h2>`, in order: Pay, Documents, Leave
      balances — this plan
- [ ] money — salary components in a `DataTable` with a total row in
      `<tfoot>` — the shared piece
- [ ] states — `QueryState`; `NOT_FOUND` shows a not-found state with a
      link back — the shared piece
- [ ] values — tokens only, spacing on the base 4 — Task 1 tests
- [ ] not copied by later detail pages: the document expiry block, the
      salary table

Steps for the UI checks (every UI task carries them):
1. Re-read the checklists before writing; do not work from memory.
2. Report the pages ready for their check; the whole-branch reviewer's
   checker for each kind (calibrated once, never the author) checks
   them; fix what it reports.
3. Report the status in this plan: `done` once the check passes, or
   `parked — <why>`.

- [ ] **Step 1: Write failing tests.**
  - `summary.test.ts` › `next-action-per-status` (no run gives
    `create`; `draft` gives `check`; `checked` gives `submit`;
    `in_review` gives `approve`; `approved` gives `generate`;
    `file_ready` gives `download`); › `on-leave-today-inclusive`
    (a leave ending today counts, one ending yesterday does not, a
    pending one does not); › `expiry-alerts-30-days` (expiry in 30
    days alerts, in 31 does not, an expired document alerts with
    `expired: true`).
  - `dashboard.test.tsx` › `rail-shows-next-action` (seed demo: the
    button reads "Check pay run"); › `empty-company` (seed empty: the
    rail offers "Create pay run" and both sections show their empty
    text); › `section-error-isolated` (`listLeaveRequests` fails: only
    that section shows "Try again").
  - `employees.test.tsx` › `filters-in-url` (typing "Sara" sets
    `?q=Sara` and leaves only matching rows); › `clear-filters`;
    › `row-link-opens-profile`; › `profile-arabic-name` (Arabic shows
    `fullNameAr`); › `profile-not-found` (`/employees/nope` shows the
    not-found state); › `salary-total` (the `<tfoot>` total equals the
    sum of components as `formatAed`).
- [ ] **Step 2: Run.** Expected: fail.
- [ ] **Step 3: Implement** the files above against the checklists.
  "Export CSV" writes the visible rows (no amounts in the file name);
  adding and editing employees is out of scope (Ruling W16).
- [ ] **Step 4: Run tests and `pnpm check`.** Expected: PASS.
- [ ] **Step 5: E2E** `e2e/employees.spec.ts` › `list-to-profile-and-
  back` keeps the filter; › `error-state-retry` with
  `?mock-fail=listEmployees` shows "Try again". Expected: PASS.
- [ ] **Step 6: Commit.**
  `git commit -m "feat(web): dashboard, employees list and profile"`

### Task 4: Leave requests, balances and attendance

**Files:**
- Create: `src/features/leave/LeavePage.tsx`,
  `src/features/leave/NewLeaveDialog.tsx`,
  `src/features/leave/BalancesTable.tsx`,
  `src/features/leave/leave-days.ts`,
  `src/features/attendance/AttendancePage.tsx`,
  `src/features/attendance/month.ts`, `src/i18n/{en,ar}/leave.ts`,
  `src/i18n/{en,ar}/attendance.ts`
- Test: `tests/features/leave.test.tsx`,
  `tests/features/leave-days.test.ts`,
  `tests/features/attendance.test.tsx`, `e2e/leave.spec.ts`

**Interfaces:**
- Consumes: Task 2 kit; `listLeaveRequests`, `listLeaveBalances`,
  `listLeaveTypes`, `createLeaveRequest`, `decideLeaveRequest`,
  `listAttendance`, `listEmployees`.
- Produces `leave-days.ts`: `calendarDays(start: string, end: string):
  number` (inclusive; end before start throws `INVALID_RANGE`). The
  count is shown as "calendar days"; working-day rules are unsourced
  and not applied (Ruling W17).
- Produces `month.ts`: `monthGrid(month: string): string[]` (ISO dates
  of the month) and `summariseMonth(records: AttendanceRecord[]):
  { present; absent; leave; minutesWorked: number }`.

Leave page: tabs as a `role="tablist"` of two links
(`?view=requests|balances`); requests list with status filter; each
pending row has Approve and Reject buttons for users with
`leave.decide`; Reject opens a `Dialog` to confirm. "New request"
opens `NewLeaveDialog` (employee, type, start, end; days shown live).
Attendance page: month picker (`?month=YYYY-MM`), employee filter, a
`DataTable` per day with check-in, check-out and minutes, and a summary
`DescriptionList`; times inside `<Ltr>`.

**Checklist: LeavePage and AttendancePage against list page** (from
`EmployeesPage`, the reference, Task 3; 1 member so far, read
2026-11-26):

- [ ] page holder — `Page`, one `<h1>` — the shared piece, as the
      reference
- [ ] header — `PageHeader`, the page's action ("New request") at
      inline end — the shared piece, as the reference
- [ ] filters — `FilterBar`, state in URL params — as the reference
- [ ] rows — `DataTable`; leave rows have no detail page, so the first
      cell is the employee name linking to the profile — as the
      reference
- [ ] row actions — `Button` size small in the last column, labelled
      with the employee ("Approve leave for Sara Ali") via
      `aria-label` — this plan
- [ ] dates and times — `<DateText>`, times in `<Ltr>` — the shared
      piece
- [ ] status — `StatusPill`, tone map in the feature — as the reference
- [ ] states — `QueryState`, filtered-empty with "Clear filters" — as
      the reference
- [ ] dialog — `Dialog` (focus trapped, Escape closes, focus returns to
      the opener) for new request and reject — the shared piece
- [ ] values — tokens only, base 4, logical properties — Task 1 tests
- [ ] not copied from the reference: its columns, its department
      filter, "Export CSV"

Steps 1 to 3 for the UI checks as in Task 3: re-read the checklist;
the kind's checker (never the author) checks; report `done` or
`parked — <why>` here.

- [ ] **Step 1: Write failing tests.**
  - `leave-days.test.ts` › `inclusive-count` (`2026-11-01` to
    `2026-11-01` is 1; to `2026-11-30` is 30; across 2028-02-28 to
    2028-03-01 is 3); › `end-before-start-throws`.
  - `leave.test.tsx` › `approve-updates-row` (Approve turns the pill to
    "Approved" and shows the toast "Leave approved");
    › `reject-needs-confirm`; › `decided-elsewhere-conflict` (the mock
    already decided the request: `CONFLICT` shows "This request was
    already decided" and the list refetches);
    › `hr-only-actions` (preparer sees no Approve button);
    › `new-request-validation` (end before start shows a field error on
    the end date; submit focuses it); › `balances-view`
    (`?view=balances` shows entitled, taken, pending, remaining per
    type; plural "1 day" and "3 days").
  - `attendance.test.tsx` › `month-in-url`; › `summary-counts` (the seed
    month gives the expected present, absent and leave counts);
    › `empty-month` (a month with no records shows the empty state).
- [ ] **Step 2: Run.** Expected: fail.
- [ ] **Step 3: Implement** against the checklist.
- [ ] **Step 4: Run tests and `pnpm check`.** Expected: PASS.
- [ ] **Step 5: E2E** `e2e/leave.spec.ts` › `request-then-approve`
  (create a request as hr, approve it, the dashboard "On leave today"
  shows it when the dates cover today) in English and Arabic.
- [ ] **Step 6: Commit.**
  `git commit -m "feat(web): leave requests, balances and attendance"`

### Task 5: Pay run wizard (per-task review)

**Files:**
- Create: `src/features/payroll/PayRunsPage.tsx`,
  `src/features/payroll/NewPayRunPage.tsx`,
  `src/features/payroll/PayRunWizard.tsx`,
  `src/features/payroll/steps/InputsStep.tsx`,
  `src/features/payroll/steps/ChecksStep.tsx`,
  `src/features/payroll/steps/ReviewStep.tsx`,
  `src/features/payroll/steps/ApproveStep.tsx`,
  `src/features/payroll/run-state.ts`,
  `src/features/payroll/findings.ts`, `src/i18n/{en,ar}/payroll.ts`
- Modify: `src/api/mock/mock-client.ts` (only if a test below shows a
  gap)
- Test: `tests/features/run-state.test.ts`,
  `tests/features/pay-run.test.tsx`,
  `tests/unit/mock-separation.test.ts`, `e2e/pay-run.spec.ts`

**Interfaces:**
- Consumes: run, payslip and employee methods of `ApiClient`; `can()`;
  `Stepper`, `QueryState`, `DataTable`, `Money`.
- Produces `run-state.ts`: `type WizardStep = "inputs" | "checks" |
  "review" | "approve"`; `allowedStep(run: PayrollRun, wanted:
  WizardStep): WizardStep` (a step beyond the run's state falls back to
  the furthest allowed); `approveBlock(run: PayrollRun, session:
  Session): null | "not-approver" | "own-run" | "not-in-review"`.
- Produces `findings.ts`: `findingText(f: RunFinding, t): string`
  (message by `payroll.findings.<code>` with `params`; an unknown code
  shows the code and "No description yet").

Wizard: `/pay-runs/:runId?step=`. Inputs: month (read-only once
created), included employees (checkbox list, all active by default),
the run's leave and attendance figures read-only. Checks: "Run checks"
calls `checkPayrollRun`; findings grouped errors first, each naming the
employee and linking to the profile; errors block Continue; warnings
need the checkbox "I have read the warnings" before Submit for review.
Review: totals (`gross`, `net`, employee count) and a `DataTable` of
payslips, each row linking to the payslip trace (Task 6); Submit for
review calls `submitPayrollRun`. Approve: shows who prepared it; the
Approve button is disabled with the visible reason from `approveBlock`;
approval opens a confirm `Dialog` that restates the month, employee
count and net total. After approval: a link to the WPS screen.

**Checklist: PayRunsPage against list page** (from `EmployeesPage`,
Task 3):

- [ ] holder, header, filters, rows, states — as the reference; the
      first cell links to the run ("November 2026") — as the reference
- [ ] status — `StatusPill` with tones: draft neutral, checked info,
      in_review warning, approved and file_ready success — this plan
- [ ] money — `<Money>` end-aligned for gross and net — the shared piece
- [ ] not copied from the reference: its columns, filters, export

**Checklist: PayRunWizard against form and flow** (from `SignInPage`,
Task 2; 1 member so far, read 2026-11-26):

- [ ] page holder — `Page`; `BackLink` to pay runs; h1 "Pay run
      November 2026" — the shared piece
- [ ] progress — `Stepper` as `<ol>`, `aria-current="step"`, steps are
      links only up to the allowed step — the shared piece
- [ ] fields — `Field` and `Checkbox` with labels — as the reference
- [ ] validation and errors — `FormErrorSummary` for blocked submit;
      `ApiError` codes through `t("errors.<code>")` in an `Alert` — as
      the reference
- [ ] primary action — one primary `Button` per step at the end of the
      step, pending state, never disabled except with a visible reason
      (approve) — as the reference, plus this plan for the reason
- [ ] confirm — `Dialog` that restates what will happen — the shared
      piece
- [ ] success — toast repeats the verb ("Submitted for review",
      "Approved") — Global Constraints
- [ ] values — tokens only, base 4 — Task 1 tests
- [ ] not copied from the reference: the MFA step, the demo hint

Steps 1 to 3 for the UI checks as in Task 3: re-read the checklists;
the kind's checker (never the author) checks; report `done` or
`parked — <why>` here.

- [ ] **Step 1: Write failing tests.**
  - `run-state.test.ts` › `step-clamped-to-state` (draft allows
    inputs and checks, checked adds review, in_review and later add
    approve; a draft run asking for `approve` gets `checks`); › `approve-block-reasons` (approver on someone else's
    `in_review` run gives null; owner who prepared it gives `own-run`;
    hr gives `not-approver`; a `checked` run gives `not-in-review`).
  - `mock-separation.test.ts` › `approve-refused-same-user`: the owner
    prepares and submits, then `approvePayrollRun` rejects with
    `SEPARATION_OF_DUTIES`; the approver succeeds and the run's
    `approvedBy` is the approver; an audit event `payroll.approve` is
    recorded.
  - `pay-run.test.tsx` › `errors-block-continue` (a seed error finding
    shows in the list and Continue is absent);
    › `warnings-need-ack` (Submit without the checkbox shows the
    summary error and does not call the API);
    › `approve-disabled-for-preparer` (signed in as the owner on their
    own run: the button is disabled and the text "You prepared this
    run, so another approver must approve it" is visible);
    › `confirm-restates-totals` (the dialog shows month, count and net
    as `formatAed`); › `deep-link-step-clamped` (`?step=approve` on a
    draft run shows the checks step); › `approved-run-conflict` (the
    run was approved elsewhere: `CONFLICT` shows the message and the
    page refetches to the approved state).
- [ ] **Step 2: Run.** Expected: fail.
- [ ] **Step 3: Implement** against the checklists. Unpaid leave and
  any other unsourced rule appear only as findings (`payroll.findings.
  UNPAID_LEAVE_NOT_DEDUCTED`: "Unpaid leave not deducted: no sourced
  rule yet. Adjust manually outside the app if needed.").
- [ ] **Step 4: Run tests and `pnpm check`.** Expected: PASS.
- [ ] **Step 5: E2E** `e2e/pay-run.spec.ts` › `prepare-then-approve`:
  preparer creates the run for 2026-10, runs checks, acknowledges
  warnings, submits; signs out; approver approves; the run shows
  "Approved". Expected: PASS.
- [ ] **Step 6: Commit.**
  `git commit -m "feat(web): pay run wizard with separation of duties"`
- [ ] **Step 7: Per-task review** (money shown to people, separation of
  duties): a fresh reviewer reads this task's diff against this task
  and the Global Constraints before Task 6 starts.

### Task 6: Explainable payslip trace view (per-task review)

**Files:**
- Create: `src/features/trace/TraceView.tsx`,
  `src/features/trace/TraceLineRow.tsx`,
  `src/features/trace/explain-line.ts`,
  `src/features/trace/sources.ts`,
  `src/features/trace/TraceView.module.css`,
  `src/features/payroll/PayslipPage.tsx`,
  `src/i18n/{en,ar}/trace.ts`
- Test: `tests/features/explain-line.test.ts`,
  `tests/features/trace-view.test.tsx`, `e2e/payslip.spec.ts`

**Interfaces:**
- Consumes: engine `explainTrace`, `MESSAGES`, `STATUS_WORDS`,
  `TraceLine`, `TraceRule`, `RuleSource`, `RulePack`, `formatAed`,
  `fils`; `PayslipLine` from the contract.
- Produces `explain-line.ts`: `type ViewLine = TraceLine & { kind:
  "money" | "count" | "text" }`;
  `explainLine(line: ViewLine, lang: Lang): { sentence: string;
  translated: boolean }`. Order: (1) the engine catalog when
  `MESSAGES[lang]` has the line id (via `explainTrace([line], lang)`);
  (2) the web catalog `trace.lines.<id>` with `{result}` formatted by
  `kind` (money through `formatMoney`, never the raw integer); (3)
  otherwise the line's `label` with the formatted result and
  `translated: false`. Money is known by `kind`, never by an id list.
- Produces `sources.ts`: `type SourceResolver = (rule: TraceRule) =>
  RuleSource | null | "overridden"`;
  `packSourceResolver(packs: readonly RulePack[]): SourceResolver`
  (finds the pack by `packId` and `packVersion`, then `params[key]
  .source`; an `overridden` rule returns `"overridden"`, never the
  pack's source); `contractSourceResolver` reads `rule.source` from a
  `PayslipLine`.
- Produces `TraceView.tsx`: `<TraceView lines={ViewLine[]}
  resolveSource={SourceResolver} title={string} />`.

Trace view (the signature element): a list (`<ol>`) of lines; each row
shows the sentence and the formatted result (end-aligned, `<Money>` for
money). Each row has a disclosure `<button aria-expanded
aria-controls>`; expanded, it shows a thin `--color-trace` thread on
the inline-start edge and three parts: Formula (`line.formula` in
`<Ltr>`), Inputs (a `<dl>`, money inputs formatted when the key ends in
`Fils` or the value came from a money line), Rules (each: key, value,
status word as a `StatusPill`, `packId` and `packVersion` in `<Ltr>`,
and the source: a link with the note as text, `target=_blank
rel="noopener noreferrer"`; a rule with no URL shows the note only,
e.g. "engine convention, not law"; `"overridden"` shows "Changed for
this calculation: no source"). A line with no rules shows "From your
records: no rule applies" (input lines such as a salary component).
"Expand all" and "Collapse all" buttons. Untranslated lines carry a
small "Not yet translated" pill. The expand motion is a 150ms height
and opacity change, none under reduced motion.

**Checklist: PayslipPage against detail page** (from
`EmployeeProfilePage`, Task 3; 1 member so far, read 2026-11-26):

- [ ] holder and back — `Page`, `BackLink` to the run's review step —
      as the reference
- [ ] title — h1 "Payslip" with the employee name (Arabic name in
      Arabic) and month — as the reference
- [ ] summary — `DescriptionList`: gross, net, employee no., IBAN in
      `<Ltr>` — as the reference
- [ ] sections — `Section` h2 "How this was calculated" holding
      `TraceView` — this plan
- [ ] disclosure — real `<button>` with `aria-expanded`; content
      reachable by keyboard in reading order — this plan
- [ ] sources — external links named by their note, open in a new tab
      with "(opens in a new tab)" visually hidden text — this plan
- [ ] states — `QueryState`, not-found state — as the reference
- [ ] values — `--color-trace` used only inside the trace view; tokens
      only; base 4 — this plan and Task 1 tests
- [ ] not copied from the reference: the document expiry block, salary
      table

Steps 1 to 3 for the UI checks as in Task 3: re-read the checklist;
the kind's checker (never the author) checks; report `done` or
`parked — <why>` here.

- [ ] **Step 1: Write failing tests.**
  - `explain-line.test.ts` › `engine-catalog-first`: the gratuity line
    from the engine's sample settlement explains in English as
    "End-of-service gratuity: AED 35,000.00 (secondary, convention)."
    and in Arabic contains `"⁦AED 35,000.00⁩"`;
    › `web-catalog-for-payslip-ids`: a `pay.net` line of kind `money`
    with result `"1250000"` reads with "AED 12,500.00";
    › `unknown-money-id-never-raw`: an unknown id of kind `money` with
    result `"1250000"` gives a sentence containing "AED 12,500.00", not
    `"1250000"`, and `translated: false`;
    › `status-words-ar`: a rule with status `convention` shows
    "اختيار النظام" in Arabic.
  - `trace-view.test.tsx` › `expand-shows-rule-and-source` (the cap
    rule shows its status word, pack id and a link whose name is the
    source note); › `overridden-rule-no-source`;
    › `input-line-no-rules` (shows "From your records: no rule
    applies"); › `expand-all`; › `keyboard-disclosure` (Tab to the
    button, Enter toggles `aria-expanded`); › `axe-clean` in both
    languages.
- [ ] **Step 2: Run.** Expected: fail.
- [ ] **Step 3: Implement** against the checklist. Payslip line wording
  lives in `src/i18n/{en,ar}/trace.ts` until a monthly engine exists
  (Ruling W9).
- [ ] **Step 4: Run tests and `pnpm check`.** Expected: PASS.
- [ ] **Step 5: E2E** `e2e/payslip.spec.ts` › `trace-en-ar`: open a
  payslip from the review step, expand the net line, see the source
  text; switch to Arabic; the amount reads `AED` first inside an
  `bdi[dir=ltr]`. Expected: PASS.
- [ ] **Step 6: Commit.**
  `git commit -m "feat(web): explainable payslip trace view"`
- [ ] **Step 7: Per-task review** as in Task 5.

### Task 7: WPS file screen and end-of-service calculator

**Files:**
- Create: `src/features/wps/WpsPage.tsx`,
  `src/features/wps/download.ts`, `src/features/wps/finding-text.ts`,
  `src/features/eos/EndOfServicePage.tsx`,
  `src/features/eos/eos-form.ts`, `src/features/eos/engine-errors.ts`,
  `src/i18n/{en,ar}/wps.ts`, `src/i18n/{en,ar}/eos.ts`
- Modify: `src/i18n/format.ts` (`parseAmountInput` body, if Task 1 left
  a stub)
- Test: `tests/features/wps.test.tsx`,
  `tests/features/finding-text.test.ts`,
  `tests/features/eos.test.tsx`, `tests/unit/amount-input.test.ts`,
  `e2e/wps.spec.ts`, `e2e/eos.spec.ts`

**Interfaces:**
- Consumes: `generateSif`, `getSifFile`; wps `Finding` type via the
  contract's `SifFile`; engine `calculateSettlement`, `GRATUITY_PACKS`,
  `EngineError`, `parseAed`; Task 6 `TraceView` and
  `packSourceResolver`.
- Produces `download.ts`: `sifBlob(text: string): Blob` (type
  `text/plain`, bytes exactly as given: CRLF kept, ASCII only; a
  non-ASCII character throws `SIF_NOT_ASCII`) and
  `downloadFile(blob: Blob, fileName: string): void` (anchor with
  `download`).
- Produces `finding-text.ts`: `WPS_CODES` (the 29 validator codes:
  ACCOUNT_LENGTH, AMOUNT_FORMAT, COUNT_FORMAT, CURRENCY, DATE_FORMAT,
  DAYS_MISMATCH, DUPLICATE_EMPLOYEE, EDR_COUNT_MISMATCH, EVP_MISSING,
  EVP_SUM_MISMATCH, EVP_WITHOUT_EDR, FIELD_COUNT, FIELD_HAS_SPACES,
  FIELD_TOO_LONG, FUTURE_CREATION_DATE, IBAN_CHECKSUM, ID_FORMAT,
  MONTH_MISMATCH, NEGATIVE_AMOUNT, NON_ASCII, NO_SCR,
  PAY_START_TOO_EARLY, RECORD_TYPE, ROUTING_FORMAT,
  ROUTING_IBAN_BANK_MISMATCH, ROUTING_UNKNOWN, SCR_NOT_LAST,
  TOTAL_MISMATCH, ZERO_PAY); `wpsFindingText(f: Finding, lang: Lang):
  string` (catalog `wps.codes.<CODE>`; an unknown code falls back to
  the finding's English `message`). The file's own `value` is shown
  quoted, inside `<Ltr>`, never as markup.
- Produces `eos-form.ts`: `EosFormSchema` (zod: `joiningDate`,
  `lastWorkingDate`, `unpaidLeaveDays`, `basicMonthly` (text),
  `workerClass`, `unusedLeaveDays`) and `toSettlementInput(v):
  SettlementInput` (amount through `parseAmountInput`).
- Produces `engine-errors.ts`: `engineErrorText(e: EngineError, t):
  string` (e.g. `NO_PACK_FOR_DATE`: "Leavers before 2 February 2022
  are not modelled (old law)"; `UNSUPPORTED_WORKER_CLASS`: "GCC
  nationals are not modelled yet"; else the code and message).
- `parseAmountInput(text)`: trims; maps Arabic-Indic digits
  (U+0660 to U+0669) and Eastern digits (U+06F0 to U+06F9) to ASCII,
  the Arabic decimal separator U+066B to ".", removes "," and U+066C
  thousands separators, then `parseAed`; anything else throws
  `INVALID_AMOUNT`.

WPS page (`/pay-runs/:runId/wps`, detail kind): if no file, a primary
"Generate salary file" button (needs `wps.generate`, run `approved`);
then a `DescriptionList` (file name in `<Ltr>`, created at, employee
count, total), a "Download .SIF" button, error and warning counts, the
findings grouped by severity in a `DataTable` (line, field, text,
value), and last the exact closing sentence from Global Constraints
(translated in Arabic, NEEDS NATIVE REVIEW). Errors present: Download
stays available but an `Alert` says "Fix the errors before sending this
file to your bank".

Calculator page (`/tools/end-of-service`, form kind): the form, then
the result: the computed total with the exact label, the not-computed
list, and `TraceView` with `packSourceResolver(GRATUITY_PACKS)`. The
engine module is loaded in this route's lazy chunk only.

**Checklist: WpsPage against detail page** (from
`EmployeeProfilePage`, Task 3):

- [ ] holder, back link to the run, h1 "Salary file (WPS)" — as the
      reference
- [ ] summary — `DescriptionList`, file name and ids in `<Ltr>` — as
      the reference
- [ ] findings — `DataTable` with a caption, errors first — the shared
      piece
- [ ] closing sentence — a `<p>` at the end of the page, never inside a
      success colour — this plan
- [ ] states — `QueryState`; "no file yet" is an empty state with the
      generate action — the shared piece
- [ ] not copied from the reference: the document expiry block, salary
      table

**Checklist: EndOfServicePage against form and flow** (from
`SignInPage`, Task 2):

- [ ] fields — `Field` with label, hint and error; dates as `<input
      type=date>`; amount as `inputmode=decimal` text — as the
      reference
- [ ] validation — zod on submit, first invalid field focused,
      `FormErrorSummary` for two or more — as the reference
- [ ] engine refusals — `Alert` with `engineErrorText`, never a raw
      stack — this plan
- [ ] result — total label exact, not-computed list, `TraceView` — this
      plan and Task 6
- [ ] submit — primary `Button` "Calculate" — as the reference
- [ ] values — tokens only, base 4 — Task 1 tests
- [ ] not copied from the reference: MFA step, demo hint

Steps 1 to 3 for the UI checks as in Task 3: re-read the checklists;
the kind's checker (never the author) checks; report `done` or
`parked — <why>` here.

- [ ] **Step 1: Write failing tests.**
  - `amount-input.test.ts` › `amount-input-normalises-digits`:
    `"١٠٠٠٠٫٥٠"` gives 1000050n; `"10,000.50"` gives 1000050n;
    `" 10000 "` gives 1000000n; `"10.505"`, `"-5"`, `"1e4"`, `""`
    throw `INVALID_AMOUNT`.
  - `finding-text.test.ts` › `every-code-translated` (each of
    `WPS_CODES` has an en and an ar entry); › `unknown-code-fallback`;
    › `never-claims-compliance` (no catalog value in en or ar, and no
    rendered WPS page text, matches `/compliant|verified|approved by
    MOHRE|مطابق|معتمد/i`).
  - `wps.test.tsx` › `generate-then-summary`; › `closing-sentence`
    (exact English text present); › `download-bytes` (`sifBlob` of
    the mock file: decoded text equals the file text, contains
    `"\r\n"`, every char code below 128); › `wps-file-name-rtl` (in
    Arabic the file name sits in a `bdi[dir=ltr]` and reads
    unchanged); › `errors-alert` (a mock file with a `TOTAL_MISMATCH`
    error shows the alert and the finding row with line and field);
    › `not-approved-no-generate`.
  - `eos.test.tsx` › `sample-settlement` (joining 2019-01-01, last day
    2023-12-31, unpaid 0, basic "10000.00", expat-full-time, unused
    leave 10 gives the total "AED 38,333.33", gratuity line "AED
    35,000.00", leave pay "AED 3,333.33", the exact total label and
    "Not computed: notice pay, deductions, other dues");
    › `pre-2022-leaver-refused` (last day 2021-06-30 shows the
    not-modelled message); › `gcc-refused`; › `uae-national-zero`
    (shows the not-applicable sentence); › `bad-dates` (last day
    before joining is a field error).
- [ ] **Step 2: Run.** Expected: fail.
- [ ] **Step 3: Implement** against the checklists.
- [ ] **Step 4: Run tests and `pnpm check`.** Also run
  `pnpm --filter @payroll/web build` and confirm the engine code sits
  in the calculator's chunk, not the entry chunk (search the entry
  chunk for `GRATUITY`; expected: absent).
- [ ] **Step 5: E2E** `e2e/wps.spec.ts` › `download-sif` (after an
  approved run, generate and download; Playwright's download has the
  file name matching `/^\d{25}\.SIF$/` and CRLF content) and
  `e2e/eos.spec.ts` › `calculate-en-ar`. Expected: PASS.
- [ ] **Step 6: Commit.**
  `git commit -m "feat(web): WPS file screen and gratuity calculator"`

### Task 8: Settings: company, users and roles, activity log

**Files:**
- Create: `src/features/settings/SettingsLayout.tsx` (secondary nav),
  `src/features/settings/CompanyPage.tsx`,
  `src/features/settings/company-form.ts`,
  `src/features/settings/UsersPage.tsx`,
  `src/features/settings/RolesDialog.tsx`,
  `src/features/settings/ActivityPage.tsx`,
  `src/features/settings/chain.ts`, `src/i18n/{en,ar}/settings.ts`
- Test: `tests/features/company.test.tsx`,
  `tests/features/users.test.tsx`, `tests/features/chain.test.ts`,
  `tests/features/activity.test.tsx`, `e2e/settings.spec.ts`

**Interfaces:**
- Consumes: `getCompany`, `updateCompany`, `listUsers`, `listRoles`,
  `setUserRoles`, `listAuditEvents`.
- Produces `company-form.ts`: `CompanyFormSchema` (zod: `legalName`
  required, `legalNameAr` optional, `tradeLicenceNo` required,
  `employerId` exactly 13 digits, `bankRoutingCode` exactly 9 digits;
  Arabic-Indic digits normalised as in `parseAmountInput`).
- Produces `chain.ts`: `chainStatus(events: AuditEvent[]): { linked:
  boolean; firstBreakId: string | null }` (each event's `prevHash`
  equals the previous event's `hash` in time order). Display only: the
  server stays the authority (Ruling W18).
- Role rule: `payroll_preparer` and `payroll_approver` on one user
  shows a warning that separation of duties then rests on run
  ownership; it is allowed (the owner case).

**Checklist: CompanyPage against form and flow** (from `SignInPage`):

- [ ] fields, validation, submit, server error — as the reference
- [ ] layout — `SettingsLayout` with a `<nav aria-label="Settings">` of
      links, `aria-current="page"` on the active one — this plan
- [ ] success — toast "Company details saved" — Global Constraints
- [ ] values — tokens only, base 4 — Task 1 tests
- [ ] not copied from the reference: MFA step, demo hint

**Checklist: UsersPage and ActivityPage against list page** (from
`EmployeesPage`):

- [ ] holder, header, rows, states — as the reference
- [ ] filters — Activity: action and date range in URL params — as the
      reference
- [ ] roles — each role a `StatusPill` neutral; "Change roles" opens
      `RolesDialog` (checkbox group in a `<fieldset>` with `<legend>`)
      — the shared piece
- [ ] chain — Activity header shows "Chain linked" (success) or "Chain
      break at event …" (danger) with text, hashes shortened in
      `<Ltr>` — this plan
- [ ] not copied from the reference: columns, department filter, export

Steps 1 to 3 for the UI checks as in Task 3: re-read the checklists;
the kind's checker (never the author) checks; report `done` or
`parked — <why>` here.

- [ ] **Step 1: Write failing tests.**
  - `company.test.tsx` › `employer-id-13-digits` (12 digits shows the
    field error); › `saves-and-toasts`; › `arabic-digits-accepted`
    (`"١٢٣٤٥٦٧٨٩٠١٢٣"` saves as `1234567890123`); › `hr-read-only`
    (without `settings.manage` the fields are read-only text).
  - `users.test.tsx` › `change-roles` (give hr the approver role, the
    pill appears, an audit event is recorded);
    › `both-payroll-roles-warning`.
  - `chain.test.ts` › `linked-chain`; › `break-detected` (a changed
    `prevHash` on event 3 gives `firstBreakId` of event 3);
    › `empty-is-linked`.
  - `activity.test.tsx` › `filters-in-url`; › `shows-chain-status`.
- [ ] **Step 2: Run.** Expected: fail.
- [ ] **Step 3: Implement** against the checklists. The mock appends an
  `AuditEvent` with a hash chain (SHA-256 via `crypto.subtle` of
  `prevHash + JSON` of the event) for every write.
- [ ] **Step 4: Run tests and `pnpm check`.** Expected: PASS.
- [ ] **Step 5: E2E** `e2e/settings.spec.ts` › `edit-company-then-see-
  activity`. Expected: PASS.
- [ ] **Step 6: Commit.**
  `git commit -m "feat(web): settings, roles and activity log"`

### Task 9: A11y and viewport matrix, contract hand-off, handover

**Files:**
- Create: `e2e/matrix.spec.ts`, `e2e/routes.ts` (the route list with a
  role that may see each), `tests/unit/http-client.test.ts`
- Modify: `src/api/contract.ts` (reconciliation only), `HANDOVER.md`,
  `LEDGER.md`
- Delete: `src/api/contract-standin.ts` once `packages/contract` exists

**Interfaces:**
- Consumes: every route from Task 2; `createHttpApi(base: string,
  fetchFn: typeof fetch): ApiClient` from Task 1.

- [ ] **Step 1: Write the failing matrix.** `matrix.spec.ts` loops over
  every route in `routes.ts` times `en`, `ar` times `light`, `dark`
  times widths 360, 768, 1280:
  - › `axe-clean`: `@axe-core/playwright` reports no violations of
    impact serious or critical (contrast included).
  - › `no-horizontal-scroll`: with `?mock-seed=large`,
    `document.documentElement.scrollWidth` is at most `clientWidth`.
  - › `states`: with `?mock-seed=empty` each data route shows an empty
    state (`[data-state=empty]`); with `?mock-fail=<its list method>`
    it shows "Try again" (`[data-state=error]`); with
    `?mock-latency=1500` a skeleton (`[data-state=loading]`) is
    visible before data.
  - › `targets-44`: every visible button and link in the main content
    has a bounding box at least 44 by 44, or is inline text inside a
    paragraph.
  - › `keyboard-only`: on the pay run wizard, Tab order reaches the
    primary action, and focus is visible (outline width at least 2px).
- [ ] **Step 2: Run.** `pnpm --filter @payroll/web e2e -- matrix`.
  Expected: failures listing routes; fix each in its feature files,
  then rerun to PASS.
- [ ] **Step 3: HTTP adapter tests** (`http-client.test.ts`, a stubbed
  `fetchFn`): › `parses-money-to-fils` (`"1000000"` becomes
  `fils(1000000n)`); › `error-envelope-to-api-error`
  (`{ error: { code: "CONFLICT" } }` with 409 gives `ApiError` code
  `CONFLICT`); › `network-failure` (a rejected fetch gives `NETWORK`);
  › `schema-mismatch-loud` (a response missing `employeeNo` throws
  `ApiError` code `CONTRACT_MISMATCH` naming the path).
- [ ] **Step 4: Reconcile with `packages/contract`.** If it exists:
  point `contract.ts` at it, delete the stand-in, run
  `pnpm --filter @payroll/web typecheck` and fix differences inside
  `contract.ts` mappers only; list every name or encoding difference in
  the ledger entry. If it does not exist yet: keep the stand-in and say
  so in `HANDOVER.md` as the first next step.
- [ ] **Step 5: Run everything.** `pnpm check`, `pnpm web:build`,
  `pnpm e2e`. Expected: PASS.
- [ ] **Step 6: Update `HANDOVER.md`** (state; `pnpm web` and demo
  accounts; `?mock-*` switches; `VITE_API_MODE`; layout of `apps/web`;
  limits: Arabic awaiting native review, mock pay is sums only, leave
  days are calendar days, no employee create or import) and
  `LEDGER.md` section 3 (Plan 4 built; Rulings W1 to W22 below).
- [ ] **Step 7: Commit.**
  `git commit -m "test(web): a11y and viewport matrix; handover"`
- [ ] **Step 8: Whole-branch review** (speed ruling), with the
  ui-consistency check: for each kind (list, detail, form and flow),
  calibrate one checker on a scratch copy of the reference with one
  planted difference, outside the repository, planted by someone else;
  then that checker walks every page of the kind against the
  checklists in Tasks 3 to 8 and compares the whole set. Fix, rerun
  Step 5, commit.

---

## Not in this plan (M1 items left for later plans)

- Excel import and parallel-run comparison; adding and editing
  employees (they arrive with import).
- GPSSA contributions for UAE nationals; salary revisions, arrears,
  loss of pay and reversal; pay run corrections (need the bank answer).
- Payslip PDF and employee self-service (M2); MFA enrolment and SSO
  (only the code step at sign-in is here).
- Real monthly pay computation: the engine has no monthly calculation
  yet; the mock shows contract sums and flags the rest.

## Rulings (Claude's calls; the owner can overrule)

| # | Ruling | Cost if wrong |
|---|---|---|
| W1 | React 19 with Vite 8 (already in the lockfile), single-page app, no server rendering. | A move to a server-rendered framework later: routing and data loading rewritten, components kept. |
| W2 | CSS Modules with CSS custom properties, no Tailwind: logical properties stay readable, the 80-character rule holds on `.tsx`, and no extra build plugin. | Slower styling than utility classes; switching later touches every `.module.css`. |
| W3 | Own typed i18n catalog (`Intl.PluralRules`, `Intl.NumberFormat`) instead of i18next: missing Arabic keys fail typecheck. | No ICU features or translation-platform plugins; migrating means mapping keys, about a day. |
| W4 | In-memory mock adapter behind `ApiClient`, not MSW: identical in Vitest and Playwright, no service worker, failure and seed switches in the URL. | HTTP serialisation is only tested by Task 9's adapter tests until the real API exists. |
| W5 | react-router 7.18.7 (known library-mode API) rather than the newer 8.x; TanStack Query 5. | A later upgrade to 8 is a routing-file change. |
| W6 | `@playwright/test` pinned to 1.63.0 to match the preinstalled Chromium 1243; Chromium only; phone width as a Chromium viewport. | Safari-only bugs (RTL, date inputs) are missed until a WebKit run is added. |
| W7 | `@payroll/engine` runs in the browser (it bundles to 33 kB with no Node imports, checked 2026-11-26), lazy-loaded with the calculator. | If the engine gains Node imports, the calculator must call the API instead. |
| W8 | Only `src/api/contract.ts` knows `packages/contract`; until Plan 3 lands, a stand-in with the expected surface lives next to it and is deleted at reconciliation. | If Plan 3's shapes differ a lot, `contract.ts` mappers grow; no screen changes. |
| W9 | Payslip line wording (en, ar) lives in the web catalog until a monthly engine exists; gratuity lines reuse the engine catalog. | Wording moves into the engine later; a small catalog move. |
| W10 | Money on a trace line is known by a `kind` field asked of the contract, not by the engine's `MONEY_IDS` list. | If Plan 3 omits `kind`, `contract.ts` derives it, which is weaker. |
| W11 | Rule sources: for engine packs, by `packId`, `packVersion` and `key`; an overridden rule shows no source; for payslips, `rules[].source` from the contract. | If the contract carries no source, payslip rules show "source not supplied". |
| W12 | WPS findings are translated by code in the web (29 codes, a test enumerates them); unknown codes fall back to the English message. | A new validator code shows English until added. |
| W13 | Arabic in the app is visible to admins with an "awaiting native review" banner; nothing is marked final. Amounts keep Western digits and Gregorian dates. | A native review may change many strings and may prefer Arabic-Indic digits: a format switch, not a rewrite. |
| W14 | List filters live in the URL, so links and Back work. | None found. |
| W15 | Fonts self-hosted (IBM Plex Sans and IBM Plex Sans Arabic), so the app works offline and loads no third-party font host. | About 200 kB of fonts; a different typeface is a token change. |
| W16 | Employees are read-only in this plan; create, edit and import come with the import plan. | The demo cannot add people. |
| W17 | Leave days are shown as calendar days; working-day and weekend rules are unsourced and not applied. | Counts differ from company practice until a sourced rule exists. |
| W18 | The activity page checks the hash chain for display only; the server is the authority. | None for correctness; a misleading "linked" only if the server lies. |
| W19 | The ui-consistency checklists live in this plan (the dispatch asked for a plan in the repository), overriding the skill's "write nothing into the repository". | The checklists can go stale; the code wins, as the skill says. |
| W20 | No stop for a person's yes on the plan and no per-page checker: per the speed ruling, the checklists go to the whole-branch reviewer with one calibrated checker per kind; Tasks 5 and 6 also get a per-task review. | Consistency drift is found late and fixed in one wave. |
| W21 | The product name is the neutral placeholder "HR and Payroll" in `src/brand.ts`; renaming is one change. | None. |
| W22 | Built in a separate worktree on branch `plan-4-web-app` from `claude/quirky-wozniak-b7xkvr`, merged back after the review; shared root files change only in Tasks 1 and 9. | Merge conflicts with Plan 3 in root files and the lockfile; resolved by `pnpm install`. |
