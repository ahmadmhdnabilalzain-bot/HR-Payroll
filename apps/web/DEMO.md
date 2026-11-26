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

## Look and shell (ink and grey)

- **Palette** (`src/theme/tokens.css`, the only place colours are
  written; `tests/unit/tokens.test.ts` checks every pair): ink and
  paper with one cool grey family (`--color-grey-100..700`). There is
  no accent hue: actions, the current state and the focus ring are
  near-black ink in light and near-white in dark. Colour is for state
  only and always with a word: red stops pay, amber is a check, muted
  green is done. Charts draw the month in focus in ink and the rest in
  grey (`--color-bar-1..4`). Light and dark are designed as equals.
- **Type:** nothing the templates draw is smaller than 13 (column
  headers, the sources line and calendar day letters included). Body 15 (17
  on phones), page title `--text-title` 34/40
  (28/34 on phones), a report's lead figure `--text-figure` 48/52
  (40/44), the Home figure `--text-hero` 56 (48). All in tokens.css.
- **Avatars** (`src/ui/Avatar.tsx`): initials on one of eight neutral
  tints (`--color-avatar-1..8`), picked by a hash of the person's id,
  so a rename keeps the face. Decorative: the name is always beside
  it. `?avatars=colour` shows the restrained colour set for comparison.
  Every face in the product, templates included, is this component.
- **Top bar** (`shell/TopBar.tsx`): wordmark, the role's section words
  (from the registry, `barFor`), search (Cmd+K and /), the bell (an
  ink dot when there is something unread), hide amounts, theme and the
  role menu. Home is a link; any other word opens its **section
  panel**.
- **Section panel** (`shell/SectionPanel.tsx`): a sheet under the bar.
  Left, **Waiting**: the section's areas whose count means a decision
  waits (the one that stops pay first, in red). Totals and open work
  in progress (documents running out, open incidents, punches to
  match, draft roster weeks, holds, help desk tickets, ...) are left
  out (`NOT_A_DECISION` in `nav/short.ts`); their own pages keep the
  count. Right, **Go to**: one row per group, opening its first area.
  Esc, a click outside or a pick closes it; arrow keys move.
- **Group tabs** (`shell/GroupTabs.tsx`): on an area's own page, the
  other areas of its group are tabs under the bar (not on records,
  not on the pay run's own steps).
- **Panels** (`reports/dash`): a dashboard is tiles (`Tiles`, a
  figure, its change against last month and a sparkline), then
  `Panel`s (one titled block with a quiet note: `TrendChart` from
  zero with September and October marked, `HBars`, `SplitBar`), then
  the details table. The owner brief and the board report open with
  `Summary` (three columns: what changed, needs a decision, at risk).
- **Home hero** (`home/PayRunHero.tsx`): one sentence, the net figure
  rolling from the last true total (`RollDigits`, never a count-up),
  its make-up, the step tracker and four cards (`PeopleStrip`: UAE
  nationals, who is off this week, documents expiring, who waits),
  each a link with its own picture. IT, the manager and the employee
  have their own Home.
- **Bank moment** (`ui/flight.ts`): one flight helper for the demo.
  When an IBAN passes, the held amount leaves its row as a clone in a
  fixed layer (420 ms on a spring, then a 160 ms fade) and lands on
  the salary-file total, which then rolls; Home and the Fix step use
  the same call. Reduced motion: no travel, a 120 ms fade.
- **Sign-off** (`ui/SignStamp.tsx`): one stamp for every signature
  (name, role, when, a check seal), shared by the pay run's Approve
  step and the e-signature sheet (which adds the drawn or typed
  signature, the reference and the fingerprint as extra lines). A
  fresh signature lands (1.06 to 1 over 240 ms, a ring settles out);
  a declined one is dashed and has no seal.
- **List to record** (`ui/templates/listMotion.ts`): opening a row
  sends its face and name into the record's head (a view transition,
  280 ms); Back returns to the same row, scroll, search and filter.
  Without the API, or with reduced motion, a 120 ms dissolve.
- **Decisions on a row** (`ui/templates/RowDecision.tsx`): a list's
  `rowActions` show Agree / Decline only to the person who may decide
  (the record's own rule); everyone else reads who it waits for; the
  decider gets a quiet Undo. The toast carries the same undo.
- **Command palette** (Cmd+K and /, `shell/commands.ts`): areas, people
  and actions (enter bank details, sign off the run, decide a
  request, open a payslip), each offered only where the role may.
- **Phone:** its own Home, four tabs at the bottom (Home and the next
  three words, "More" holds the rest) and one overflow menu on the
  role avatar for notifications, hide amounts and the theme. Sheets
  rise from the bottom; targets are 44 px.
- **One footnote a page:** `PageFoot` (templates) writes the sources
  line "Fictional demo data. Rules as we read them." Pages not built
  on a template use `Footnote` (`components/explain`), which renders
  the same `PageFoot`. Provenance never goes in body copy, letters or
  anything a third party gets: no "(demo)", "(sample)" or
  "(fictional)" tags. Rule statuses live in the explain drawer.
- **Print:** a report (`ReportPage`), a letter (`Paper`) and the
  payslip print alone, black on white; the rules apply only while
  one is on the page (`body:has(...)`), so every other page prints as
  it is.

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
- `state: DemoState`: `role` ("hr" | "gm" | "manager" | "employee" |
  "it"), `hideAmounts`, `ibans`, `tasksDone`, `notesRead`,
  `resolved` (issue id to "reviewed" | "renewal"), `decided`
  (approval id to "approve" | "decline"), `focusIssue`, `sourcesOpen`.
- `dispatch(action)`: `role`, `toggle-amounts`, `iban` / `unset-iban`,
  `resolve` / `reopen`, `decide` / `undecide`, `focus-issue`,
  `sources`. Add new actions here (append only; do not rename).

**Shared rules** (`src/demo/derive.ts`, `src/demo/actions.ts`):
`openIssues`, `confirmations`, `notes`, `personOf(role)`,
`approvalBlockedBy`, `steps`, `runPhase` ("bank-details" | "approve" |
"declined" | "file"), and `useRunApproval()`.

**One source for live figures and approvals.** `figures(data, state)`
(`src/demo/figures.ts`) gives held net pay, what stops pay, what is
left to check, people on the run month's payroll and people active on
the report date; Home, the pay run, the dashboards, the owner brief
and the board report read it, and `beforeApproval()` in
`reports/dash/model.ts` (the "N stop pay, N to check" phrase, Fix's
own count included) is built on it. Approvals come from
`src/demo/approvals.ts`: `openApprovals` (all undecided),
`decisionsFor` (this role's own, sent), `approvalsShown` (a role's
list) and `mayDecide` (the checker, never the maker).
`tests/unit/figures.test.ts` holds every surface to the same figure
before and after both IBANs are fixed.
The pay run's Approve on Home and on the Pay run page must both use
`useRunApproval()`: it is disabled while any payslip has no bank
account or an IBAN that fails its check digits (the real API refuses
a whole run; the bank would reject a mistyped one; never a partial
run), and `blockedBy` names who holds it back.

**Explain any figure** ("why this number") with
`<Explainable explanation={...}>` from
`src/components/explain` and `useRunDetail()` (`src/demo/
useRunDetail.ts`, a lazy chunk: wrap its user in `<Suspense>` with
the plain figure as fallback, as the Home net figure does). On a
report, pass `figure.explanation` and `explain(row, col)` to
`ReportPage` (the total row is row `rows.length`); the page's one
note then says once that dotted figures open their working. A sum's
parts must add up to its result (`sumExplain`, checked by
`tests/unit/explain-figures.test.ts` against the figure on screen).

Role switches go through `useSwitchRole()`
(a quiet crossfade).

**Show money** only with `<Money value={fils} />` (`src/ui/Money.tsx`):
one formatter, tabular figures, eased on change, masked when amounts
are hidden. Never type a figure in a component. A change is
`<Money value={d} signed />`: "+AED 5.00" on a rise, "−AED 5.00" (the
true minus, U+2212, before the currency) on a fall, never a hand-set
sign beside it. Text is `formatMoney(f, lang)` or
`formatSignedMoney(f, lang)` (`src/i18n/format.ts`); CSV files keep a
plain hyphen (`lib/csv`).

**Copy.** Strings go in `src/i18n/en/*` with the Arabic twin in
`src/i18n/ar/*` (NEEDS NATIVE REVIEW). Data text comes from the
package. Never write "compliant", "approved", "certified" or
"guaranteed" (`tests/unit/demo-copy.test.ts`).

## For builders of area packages (WP2 to WP10)

The shell follows `docs/design/2026-11-26-navigation-map.md`. Each
package owns one folder under `src/` and one registry file
`src/nav/areas/<package>.ts` (already created, exporting an empty
`AREAS`). Never edit shared files: `nav/registry.ts`, `nav/groups.ts`,
`nav/areas/index.ts`, `views.tsx`, `shell/*`, `ui/templates/*`. Ask WP1
for a new group, route or template change.

**1. Register an area** (`nav/types.ts`, `Area`). Panels, the phone
section pages and search list only areas whose `status` is `"live"`,
whose role is allowed and whose route has a view: no dead ends.

```ts
// src/nav/areas/pay.ts (WP6)
import type { Area } from "../types";
export const AREAS: readonly Area[] = [
  { id: "pay.loans", section: "pay", group: "owed",
    label: { en: "Loans and advances", ar: "القروض والسلف" },
    status: "live", archetype: "LF", roles: ["hr", "gm"],
    route: { section: "pay-run", rest: ["loans"] },
    count: (c) => loansWaiting(c.data, c.state),  // things waiting
    keywords: "loan advance instalment" },
];
```

- `section`: people, time, pay, reports, setup, requests, me.
  `group`: an id from `nav/groups.ts` (map section 2).
- `route`: a hash route. Hash ids stay `pay-run` and `time-off`.
  Today the views are home, pay-run, people, time-off, reports and s
  (section pages). A package that needs a new top-level route asks
  WP1; otherwise it routes under an existing one and reads `rest`
  (for example `#/people/team/org`, handled inside People).
- `route` may be a function of `{ data, state }` (for example the
  viewer's own payslip).
- `count`: things waiting (map section 2), not totals; 0 or null
  shows nothing. `stopsPay: true` makes it red (one per panel at most).
- Bar words per role are fixed in the registry: HR and GM see Home,
  People, Time, Pay, Reports, Setup; manager and employee see Home,
  Pay, Time, Requests, Me. A word with no live area is not shown.

**2. Build the screen from a template** (`src/ui/templates`). Strings
the template shows itself come from the `tpl` catalogue; your own
labels go in your package's catalogue file or as `Localized` values.
Money is always `<Money/>` or `formatMoney`; dates via `formatDate`.

Every template opens with **`PageHead`** and ends with **`PageFoot`**;
use them directly on a page of your own. `PageHead` props: `title`,
`lede?` (17/24, 72ch), `crumbs?: { label, href }[]` or `back?`,
`badge?` (a status pill beside the title), `actions?` (at most one
filled button a page), `meta?` (a line under the lede, such as a
period stepper). The title sits at one y on every page, 96 px under
the bar: without group tabs the breadcrumb row is reserved above it;
under group tabs there is no breadcrumb (the tabs say where you are)
and the title sits 56 px under the tabs (`useGroupTabs` in
`shell/GroupTabs.tsx`). Content placed above `PageHead` breaks this.
`StatusPill { tone: ok|warn|stop|neutral|done, pill? }` is a dot and
a word; the word stays ink. `MoreMenu { items: { label, onSelect,
disabled?, hint? }[] }` holds secondary actions.

**LF, `FilterList`**: lists, queues, ledgers, boards.
Props: `title`, `lede?`, `columns: { key, label, end?, render(row) }[]`
(column 0 is the row's name), `rows`, `rowKey(row)`, `searchText?(row)`
(enables search), `searchPlaceholder?`, `filters?` (more controls
beside the search), `segments?: { id, label, match(row) }[]` (the
first is selected; each shows its count; past four they scroll
sideways), `rowHref?(row)`, `avatar?(row): { id, name }` (the
person's face beside column 0), `rowActions?(row)` (secondary buttons
in a column of their own), `summary?` (five rows or fewer get a band
of counts above the table, by default the segments'), `empty`,
`emptyAction?`, `actions?`, `meta?` (under the lede: a page's one
figure, a status line or its controls, so nothing sits above the
h1), `crumbs?` / `back?`. Column headers are sticky, rows 56 px; on
phones each row is two lines.

```tsx
<FilterList title="Loans and advances" rows={loans}
  rowKey={(l) => l.id} searchText={(l) => l.name}
  rowHref={(l) => hrefOf("pay-run", "loans", l.id)}
  segments={[{ id: "all", label: "All", match: () => true },
    { id: "due", label: "Due this month", match: (l) => l.due }]}
  columns={[{ key: "n", label: "Person", render: (l) => l.name },
    { key: "b", label: "Balance", end: true,
      render: (l) => <Money value={l.balance} size="sm" /> }]}
  empty="No loans." />
```

**RT, `RecordTabs`** (+ `KeyValues`): one record with a summary strip
of at most three figures, then tabs. Props: `title`, `lede?`, `back?`
or `crumbs?`, `stats: { label, value }[]`, `tabs: { id, label,
render() }[]`, `tab?` and `onTab?` (drive the tab from the route),
`actions?`, `status?: { word, tone }` (a pill beside the title),
`next?` (what happens next, one sentence above the actions),
`history?: { when, what }[]` (newest last; after the tabs on
phones).

```tsx
<RecordTabs title={p.name} back={{ label: "Loans", href: hrefOf(
  "pay-run", "loans") }} stats={[{ label: "Balance",
  value: <Money value={l.balance} /> }]}
  tabs={[{ id: "terms", label: "Terms", render: () => (
    <KeyValues items={[{ label: "Instalment",
      value: <Money value={l.instalment} /> }]} />) }]} />
```

**FA, `ApprovalForm`**: a side sheet; submit sends a request to the
approvals inbox with maker and checker named. Props: `open`, `title`,
`fields: { key, label, kind: text|number|date|select|textarea,
required?, options?, help?, initial? }[]`, `maker`, `checker`,
`submitLabel`, `onSubmit(values)` returning an error sentence or null,
`onClose`. Record the request in the store with your own appended
action (state.tsx, append only) and add its approval to the inbox the
way `time-off.ts` does (`sessionApprovals`).

```tsx
<ApprovalForm open={open} title="Give a loan" maker={hr} checker={gm}
  submitLabel="Send for approval" onClose={() => setOpen(false)}
  fields={[{ key: "amount", label: "Amount (AED)", kind: "number",
    required: true }, { key: "months", label: "Months", kind: "number" }]}
  onSubmit={(v) => { dispatch({ type: "loan-request", values: v });
    return null; }} />
```

**CA, `MonthCalendar`**: people as rows, days as columns, weekends
shaded. Props: `title`, `lede?`, `month` (`YYYY-MM`), `monthLabel`,
`rows: { id, label }[]`, `events: { rowId, start, end, tone:
booked|waiting|holiday|shift, label }[]`, `onMonth?(step)`,
`agenda?` (false when the page lists the month itself), `legend?`
(what each tone means here), `children?` (the page's own list under
the grid). The grid draws bars only: labels are never squeezed into
a day column, they are the month's list under the grid (day, what,
whose, the tone's word), which replaces the grid on phones. Row names
wrap and stay put while the days scroll; the month stepper is the
head's meta line.

```tsx
<MonthCalendar title="Rosters" month="2026-10" monthLabel="October 2026"
  rows={staff.map((x) => ({ id: x.id, label: x.name }))}
  events={shifts.map((s) => ({ rowId: s.who, start: s.from, end: s.to,
    tone: "shift", label: s.name }))} />
```

**RP, `ReportPage`**: title, period, one figure (`--text-figure`),
an optional chart, one table with optional bars (per mille of the
largest), CSV (formula-safe, BOM) and print. Props: `title`,
`period`, `figure?`, `chart?` (`BarChart { data: { label, value,
focus? }[], label }` or `Waterfall { steps: { label, kind:
total|change, value }[], label }`), `columns: { label, end? }[]`,
`rows: Cell[][]` (a `Cell` is text, a number, or `{ fils, signed? }`,
drawn through `<Money/>` and written to CSV as a plain number),
`total?` (bold under a 2 px rule), `bars?`, `note?`, `meta?`,
`crumbs?`, `foot?` (before the sources line), `explain?(row, col)`
(a cell's working), `csvName`. Amounts written in `note` are masked
with the rest when amounts are hidden or the viewer is IT.

```tsx
<ReportPage title="Loans report" period="October 2026"
  figure={{ label: "Outstanding", value: <Money value={total} /> }}
  columns={[{ label: "Person" }, { label: "Balance", end: true }]}
  rows={loans.map((l) => [l.name, formatMoney(l.balance, lang)])}
  csvName="loans-2026-10.csv" />
```

**ST, `SettingsPage`**: grouped settings with an edit sheet and a
change log. Props: `title`, `lede?`, `groups: { title, items: { key,
label, value, help?, editable? }[] }[]`, `log: { when, who, what }[]`,
`onSave?(key, value)` returning an error sentence or null.

```tsx
<SettingsPage title="Overtime policy"
  groups={[{ title: "Rates", items: [{ key: "day", label: "Weekday rate",
    value: "125%", help: "Of the hourly basic wage", editable: true }] }]}
  log={changes} onSave={(k, v) => { dispatch({ type: "set-rule",
    key: k, value: v }); return null; }} />
```

**Letters, `Paper` and `PaperLine`**: a letter as a page (letterhead,
reference, date, signature, a readable measure) that prints alone.
Props: `company`, `title`, `label`, `reference?`, `date?`, `sign?`,
`children`; `PaperLine { label, value, total? }` for figures. The
letter's own text never carries a caveat.

**SF** (step flow) is the Pay run stepper; reuse it through WP6. The
pay run has its own head (the month, the run's state and its one
action in a sticky bar, `payrun/RunBar.tsx`); exactly one step is
current (Fix while bank details hold the file, then Approve, then
Pay), and the open step keeps its ring.

**3. Words.** Never "compliant", "approved", "certified" or
"guaranteed" on screen (tests enforce it). The verb is "sign off", the
noun "sign-off", the past "Signed off". The product is MubinFlow. A
figure not worked out reads "Not computed". No provenance in body
copy ("in this demo", "demo date", "sample"): the date is "the report
date", and the one footnote says the data is fictional. No "engine"
or "fils" on screen. Source statuses stay inside the explain panel.
Severity words: "Stops pay" and "Check". The rules and their findings
are in `docs/demo/copy-audit.md`.

## Decisions (Claude's calls)

- **Shell:** no sidebar. Slim top bar, section panels and group tabs
  (see "Look and shell" above).
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
  - Colour is for state only, so calendar bars and status words are
    neutral (ink and grey).
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
- **Phones:** People becomes rows (face, name and status, role,
  branch), not a squeezed table. Who is off becomes a list. Sheets
  come up from the bottom (dvh, safe-area padding). Targets are 44 px
  and inputs 17 px. Verified in Chromium emulation of iPhone 13, 15
  and 15 Pro sizes.
  WebKit is not installed.

## The route guard (integration)

- One guard in the shell, `mayOpen` in `nav/registry.ts`, read by
  `App.tsx` before any view: the live area whose static route is the
  longest prefix of the path decides, from its `roles` (a record
  follows its list). A path no area names under Pay run, Reports,
  Setup or Me is judged by that section's front area; People, Time
  and Home check the person in the view. A refused deep link shows
  "This page is outside your view." and a link back to Home
  (`shell/Outside.tsx`). Package guards stay as a second line.

## Home inbox, Me and the IT manager (WP10, Claude's calls)

- **IT manager** (`role: "it"`): bar Home, People, Time, Reports,
  Setup (map section 1). Time holds Leave requests (their own only,
  `leaveIds` in `demo/time-off.ts`) and
  attendance as the clocks record it: Attendance today and the
  register (`WATCH` in `time/routes.ts`); no overtime, no pay.
  Sees the directory but no one's pay (`canSeePay`); a typed
  `#/pay-run` is outside the view, but Setup > Pay groups and Pay
  elements (`#/pay-run/groups|elements`) open. Every Setup area HR
  reaches is IT's too (`roleAllows` in `nav/registry.ts`), except one
  marked `notForIt` (the parallel run, approval cover); People and
  Reports areas must
  list "it" themselves. IT Home: connections, access review, import,
  and the audit chain checked on demand (the one action).
- **Data:** `data.home` (`demo/data/home.ts`) wraps the package's
  wp10, wp9 and wp7 selectors. Package text with "approved" is
  reworded to "signed off" there (`clean`).
- **Inbox** (`home/inbox/model.ts`): tasks and notifications with the
  demo's actions laid over them. Decisions and bank details keep their
  own rows, so the to-do list leaves them out. Pay-run notes wait while
  bank details hold the run back ("not sent yet"). A target opens only
  when the registry says its area is reachable for the role; otherwise
  the row has no link. Mark done and Mark all as read have an undo.
- **Me** (`#/me/payslips|documents|leave|requests|profile`) and
  Requests (Waiting for you, My requests) for the manager and the
  employee. Past months come from the package's payroll history (net
  only); October opens the full payslip.

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
