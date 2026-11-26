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

## Checks

`pnpm --filter @payroll/web test` and `pnpm --filter @payroll/web
e2e`. Screenshot, axe and recording scripts live outside the repo.
