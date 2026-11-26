# Client demo (apps/web)

A browser-only demo of the product for a client showing: fictional
data from `@payroll/demo-data`, no backend, no network calls, nothing
saved (a reload starts the story again).

## Run and host

```bash
pnpm --filter @payroll/web dev      # http://localhost:5173
pnpm --filter @payroll/web build    # static site in apps/web/dist
pnpm --filter @payroll/web preview  # serve dist on :4173
pnpm --filter @payroll/web build:offline
# one self-contained file: dist-offline/mubinflow-demo.html, opens by
# double click (file://), no network, no server
```

- Hash routing (`#/section/rest`): every visit loads `index.html`, so
  a static host needs no rewrite rule, and the offline file works on
  `file://`.
- `?ar=1` shows the Arabic switch; `?ar=0` hides it. By default Arabic
  follows `DEMO_AR_REVIEWED` from the data package (false today).

## For builders of other sections (stable API)

**Add a view.** One line in `src/views.tsx`:
`VIEWS["people"] = People` (a component taking `{ rest: string[] }`,
the path after the section: `#/people/emp-001` gives `["emp-001"]`).
A section appears in the top bar, the phone bar and the palette only
once it has a view, so there are no dead links. Link with
`hrefOf("people", id)` or move with `navigate("people", id)`
(`src/demo/route.ts`).

**Read and change demo state.** `useDemo()` (`src/demo/state.tsx`)
returns:

- `data: DemoData`: the company as the current state makes it
  (`src/demo/data/types.ts`). IBANs entered re-run the real salary
  file check through the package's `applyIbanFix`, so totals, held
  pay, issues and the pay-run amount all follow.
- `source: DemoSource`: `tryIban(ibans, employeeId, iban)` (would it
  pass, with the plain reason if not), `bankLetterIban(employeeId)`.
- `state: DemoState`: `role` ("hr" | "gm"), `hideAmounts`, `ibans`,
  `resolved` (issue id to "reviewed" | "renewal"), `decided`
  (approval id to "approve" | "decline"), `focusIssue`, `sourcesOpen`.
- `dispatch(action)`: `role`, `toggle-amounts`, `iban` / `unset-iban`,
  `resolve` / `reopen`, `decide` / `undecide`, `focus-issue`,
  `sources`. Add new actions here (append only; do not rename).

**Shared rules** (`src/demo/derive.ts`, `src/demo/actions.ts`):
`openIssues`, `confirmations`, `notes`, `pendingApprovals`,
`personOf(role)`, `approvalBlockedBy`, `steps`, `runPhase` ("bank-
details" | "approve" | "declined" | "file"), and `useRunApproval()`.
The pay run's Approve on Home and on the Pay run page must both use
`useRunApproval()`: it is disabled while any payslip has no bank
account or an IBAN that fails its check digits (the real API refuses
a whole run; the bank would reject a mistyped one; never a partial
run), and `blockedBy` names who holds it back.

**Explain any figure** with `<Explainable explanation={...}>` from
`src/components/explain` and `useRunDetail()` (`src/demo/
useRunDetail.ts`, a lazy chunk: wrap its user in `<Suspense>` with
the plain figure as fallback, as the Home net figure does).

Role switches go through `useSwitchRole()`
(a quiet crossfade).

**Show money** only with `<Money value={fils} />` (`src/ui/Money.tsx`):
one formatter, tabular figures, eased on change, masked when amounts
are hidden. Never type a figure in a component.

**Copy.** Strings go in `src/i18n/en/*` with the Arabic twin in
`src/i18n/ar/*` (NEEDS NATIVE REVIEW). Data text comes from the
package. Never write "compliant", "approved", "certified" or
"guaranteed" (`tests/unit/demo-copy.test.ts`).

## Decisions (Claude's calls)

- **Shell:** no sidebar. Slim top bar: wordmark, sections with a
  view, search (Cmd+K and /), hide amounts, theme, language (only
  when Arabic is shown) and role. On a phone: a bottom bar of at most
  four sections plus Search (Reports lives in search).
- **Home:** the first screenful answers "can October be paid, and what
  is my next step": one status sentence with one primary action, the
  net figure with its make-up and the salary-file split, the progress
  steps, at most three issues ("N more to review" expands), and
  approvals. Setup to confirm, expiries and departments sit below.
- **Signature moment:** entering an IBAN re-runs the real file check
  (both blockers: Priya Nair's missing IBAN, Juma Al Zaabi's typo);
  the held amount rolls into the file total, the issue count drops, the
  steps advance and the sentence changes. "Fill from bank letter" types
  the fictional letter's IBAN for the presenter.
- **Theme:** light by default on wide screens (projectors), the
  system's choice on phones; dark one click away.
- **Data:** one adapter (`src/demo/data/adapter.ts`) is the only file
  importing the package, loaded as a lazy chunk so the engine's
  gratuity code stays out of the entry chunk.
- **Money:** integer fils; tweens step in whole per mille (bigint).
- **Motion:** CSS and small hand-written code (no GSAP or Motion).
  150 to 250 ms ease-out, numbers ease on change only, FLIP reorder,
  rows stagger 90 ms when revealed, crossfade on theme and role
  switches. `prefers-reduced-motion` turns all of it off.
- **Lint:** the repo has no linter: `pnpm typecheck`, `pnpm lines` and
  the style tests are the checks.

## Decisions: People and Time off (Claude's calls)

- **Roles:** the switcher has four views. HR manager and General
  manager see everyone and everyone's pay. Team manager is Arjun Menon
  and sees himself and the people whose time off he decides. Employee
  is Jose Reyes and sees only himself. People opens straight on his
  profile. All four people come from the data: HR and the GM are the
  run's maker and checker, the employee is the overtime case, and the
  manager is his approver. Visibility is checked on every People path,
  so a deep link or a role switch falls back to "outside your view".
- **Pay visibility:** the person, HR and the GM. A manager sees the
  team's profiles without pay.
- **Approver rule:** the same as the package's (the most senior person
  in the department, same location first). Where that would be the
  person themself (the GM), the HR manager decides instead, so maker
  and checker always differ. A test checks the rule against the
  package's own leave approvals.
- **Data:** `src/demo/data/people.ts` is the adapter's People and Time
  off half. Only adapter.ts imports it, so it stays in the lazy chunk
  (the boundaries test lists it). `people-explain.ts` maps a payslip
  line to the shared explain contract. Amounts are money values,
  inputs read as plain steps ("Days paid: 31 of 31"), and raw fils,
  rule ids and codes are never shown.
- **Requests in the store:** a new request is `request-leave` (ids made
  in the reducer). It carries its own approval id, so Home's inbox,
  the Time off list and undo all read the one `decided` map. Package
  requests that are still pending follow the same map. Withdraw (with
  undo) removes a waiting request from the inbox.
- **Balances:** annual leave re-runs the engine's `balanceHalves` with
  every booked and waiting request. A leaver (no balance figure)
  shows the package's `availableDays` and its basis note. Sick and
  unpaid leave are shown as days used this year. Neither has a balance,
  and both say how the days are paid.
- **Day count:** the engine's `countLeaveHalves` on the working basis,
  with the demo's Saturday and Sunday weekend. There is no
  public-holiday calendar in the data, and the sheet says so. Requests
  are whole days only, with no half days.
- **Words:** booked, waiting, declined, withdrawn. "Approved" is never
  shown. A decision made in the demo names the person, the role and
  the date ("Booked by Arjun Menon, Operations manager, 27 October").
  Package requests booked before the demo show only "Booked", because
  the data has no decision record. Dates are written out ("2 to 6
  November"), with the year only outside 2026.
- **Motion:** one moment per flow. Rows in the People list stagger in
  at 90 ms (the first six). A sent request arrives at the top of the
  list with a short accent wash. Sheets slide 250 ms in and 200 ms
  out. Reduced motion turns all of it off.
- **Critique pass:**
  - The lists are inset grouped lists: radius 12, separators inset
    16 px, no bordered cards.
  - Severity is an 8 px dot beside a neutral word. Open items say
    "Stops pay" (no IBAN, or an IBAN that fails its check) or "Check".
  - Teal is for actions only, so calendar bars and status words are
    neutral.
  - People has segments: all, needs attention (open items) and
    leavers. Its department picker is our own listbox, not a native
    select.
  - The profile opens with three facts: net pay, annual leave left and
    years of service. Expiring papers appear once, under Documents.
  - The payslip has an employer header, unpaid days, a print button
    and dotted rules on worked-out figures only. Every figure still
    opens its working.
  - Days left roll with GSAP, power3.out over 600 ms (`useRoll`, whole
    half-days, tabular figures).
  - The sheet's scrim is a box shadow, because `::backdrop` does not
    read custom properties in older Safari.
  - A request must fall inside 2026 and may not overlap time off
    already booked or waiting.
  - Type sizes follow the new scale: body 15, secondary 13.
- **Phones:** People becomes rows (name and status, role, branch), not
  a squeezed table. Who is off becomes a list. Sheets come up from the
  bottom (dvh, safe-area padding). Targets are 44 px and inputs 17 px.
  Verified in Chromium emulation of iPhone 13, 15 and 15 Pro sizes.
  WebKit is not installed.

## Pay run, explain panel and reports (Claude's calls)

- **Pay run:** four labelled steps at `#/pay-run/review|fix|approve|
  pay`. Every step opens at any time (the owner browses freely); the
  stepper shows progress only. Content swaps fade 200 ms out and
  250 ms in; the track fills as Fix and Approve finish.
- **Detail chunk:** `src/demo/data/run-detail.ts` and `run-explain.ts`
  import the package beside adapter.ts (the boundaries test lists
  them). They load lazily (`useRunDetail`) and build from the same
  `state.ibans` as the shared store (`withIbans`), so the figures
  agree with Home.
- **Last month:** the package has no September run, so September is
  computed by the same engine from the same records (`slipOf`, with
  emp-012 on the old basic as in the package's back-pay derivation).
  The reasons beside each change come from the inputs (joined, left,
  unpaid days, overtime, back pay, new basic).
- **Fix:** IBANs go through the shared `iban` action. "Fill from bank
  letter" types the fictional letter's IBAN. A wrong IBAN is refused
  in the validator's plain words. The salary-file total stays pinned
  at the top while fixing, so the held amount is seen folding in.
  The other checks do not block; each can be marked reviewed.
- **Approve:** only through `useRunApproval` (missing and mistyped
  IBANs block: never a partial run). HR sees "View as General
  Manager" (`useSwitchRole`). The time of a decision is the real Dubai
  clock time on the demo's date, kept for the visit only.
- **Pay:** "Salary file for N people, AED x, to Zarqan Demo Bank,
  dated 27 October 2026". Download is enabled only after approval.
  The file check's findings are shown in the package's plain words.
  The page never says the file is accepted or compliant; it says the
  bank checks it again on upload.
- **Explain panel** (`src/components/explain`): plain-data contract,
  no provider. A figure becomes a button (`Explainable`) or a text
  link (`ExplainLink`). The panel is a side panel on wide screens and
  a sheet on phones. Gratuity steps reconcile to the fils (tier 2 is
  the total less tier 1, both from the engine). Notice pay, deductions
  and other dues are listed as not worked out. Rule status comes from
  the engine, or from the package's `PRESENTED_STATUS` where it
  differs (the 50% deduction limit reads "secondary-sourced, as we
  read it"). Citations name Decree-Law 33/2021 articles only where
  the primary text was read (Art 51 for gratuity).
- **Reports** (`#/reports/<id>`): payroll summary, cost by department
  (the department bars), headcount by nationality (headcount only,
  "sample data, regime for banks to be confirmed"), documents
  expiring, salary file register (the one October file; no invented
  history). CSV is made in the browser: text starting with = + - @
  (or tab or CR) gets an apostrophe, numbers stay plain numbers, with
  a BOM and CRLF. CSV is disabled while amounts are hidden. Print
  shows the report alone.
- **Phones:** checked with Chromium emulation of iPhone 13, 15 and 16
  Pro sizes (WebKit is not installed). Steps become a vertical list,
  tables become rows, touch targets are at least 44 px.

## Checks

`pnpm --filter @payroll/web test` and `pnpm --filter @payroll/web
e2e`. Screenshot, axe and recording scripts live outside the repo.
