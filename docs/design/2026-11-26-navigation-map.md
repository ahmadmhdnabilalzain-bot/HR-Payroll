# Mubinflow navigation map: a short bar, every feature behind it

Date: 2026-11-26. Author: Advocate (user experience). No code was edited. Read
only: Manar One's source at `/home/user/erp` and its live demo.

The owner's rule is no long side menu, and no feature is cancelled because of
it. This map does that with six words in a top bar that never grows, one panel
per word, short groups with live counts, the person record and the pay run as
hubs, and Cmd K for everything. It also holds the full inventory (Manar One's HR
and payroll areas merged with the market list), the coverage count against the
owner's 80% target, and ten work packages that can be built in parallel.

Sources

- Manar One source: `src/components/shell/apps.ts` (modules and their
  sidebar groups), `nav-people-admin.ts` (every HR, payroll and
  self-service menu item), and the page tree under `src/app/(app)`.
  1,170 pages in total; 233 in HR, payroll, self-service, approvals,
  performance, letters and dashboards (appendix B).
- Live demo, signed in as HR manager and as system administrator, pages
  loaded read-only with Playwright (GET only, no form submitted):
  204 HR-area pages visited, 173 rendered, 31 timed out; the source
  tree, not the crawl, is the basis of the inventory.
  Screenshots: `/tmp/claude-0/-home-user-HR-Payroll/55600167-2f81-585b-`
  `8597-bc047d967ec5/scratchpad/manar/inventory/`.
- Market list: `docs/superpowers/specs/2026-11-25-combined-feature-list.md`
  (about 95 rows) and `2026-11-25-master-feature-list.md` (UQ1 to UQ38).
  Together they are the "140+" list; overlapping rows are merged here.
- `docs/demo/pending-features.md`, the Apple-standard critique, and the
  demo source in the `demo-web` and `demo-payrun-explain` worktrees.

Honest notes on status

- "Live in demo" was read from the worktrees (`demo-web` for Home, pay
  run, People and Time off; `demo-payrun-explain` for Reports), not from
  `main`. Check again after the merge.
- pending-features.md lists documents and expiry alerts as backend only,
  but `home/Expiries.tsx` shows a read-only expiry list on Home and the
  Reports page has "Documents expiring". The map counts the expiry list
  as live and document upload and letters as not live.
- "Backend built" means a module exists under `packages/api/src` or the
  feature is named in pending-features.md (Plans 10 and 11 are built but
  not merged). Manar-only items with no match there (pay elements, pay
  groups, transfers, disciplinary, org chart, traffic fines) are marked
  "hours to add": a demo scene from demo data, with no real backend.
- Overtime appears twice in Manar (Time and attendance, and Payroll).
  It has one home here, Time > Overtime, and shows on the pay run as a
  line. Manar's "2 more" under Employees expands to Reporting and
  Configuration (from `apps.ts`); both are covered.

## 1. The top bar: six words that never grow

```
Mubinflow   Home  People  Time  Pay  Reports  Setup      [Cmd K]  (HA)
```

- **Home**: what needs a decision today. No panel; one click opens it.
- **People**: everyone, coming and going, requests and letters,
  compliance, growth.
- **Time**: leave, attendance, rosters, overtime. "Time off" becomes
  "Time" because attendance and overtime had no natural home; the hash
  id stays `time-off` so no link breaks.
- **Pay**: this month's run, changes, money owed and leaving pay. The
  label is "Pay"; the hash id stays `pay-run`.
- **Reports**: pay and people reports, dashboards, analysis, audit.
- **Setup**: every rule and setting (Manar's "Configuration" in both
  Employees and Payroll, plus Settings). It is a word, not a hidden
  gear, because the IT manager is a buyer.

What counts as a click. A bar word is one click and opens its panel. An area in
the panel is the second click. Cmd K, a typed word and Return is two. A person
is reached by People > Everyone > name (3) or Cmd K > name (2). No feature has a
person-record tab as its only route: every person-level item also has an all-
staff list in a panel.

The trade-off, decided: today People and Pay run open in one click. With panels
they take two (word, then "Everyone" or "This month"). To keep the two most used
screens at one click, the first area of each panel is also the word's own link:
click "Pay" to open the panel, or press Return on the focused word, or click it
a second time, to go straight to the current pay run. On the phone, the tab
opens the section page, whose top is the current run or the list (section 5).

Per role, the bar keeps a fixed count; words a role cannot use are not shown,
and the count never changes during a session.

| Role | Bar (fixed) | Count |
|---|---|---|
| HR manager, payroll officer | Home People Time Pay Reports Setup | 6 |
| GM, owner | Home People Time Pay Reports Setup (read) | 6 |
| IT manager | Home People Reports Setup | 4 |
| Line manager, employee | Home Pay Time Requests Me | 5 |

## 2. The section panels

Each panel is a sheet under the bar, 880px wide on desktop, with up to four
groups side by side and a second row when a section has more (People has seven).
A group holds at most eight areas. Each area has a live count on the right. A
row that is part of another screen (the IBAN fix is part of the pay run) is not
an area of its own; it is listed under "Inside" and opens where it lives.

The count rule: a count is the number of things waiting for someone in that area
(requests to decide, documents expiring in 30 days, people in the held state).
It is not a total of records, except "Everyone". Zero shows no count. Counts are
neutral grey; red is used only for things that stop pay (a held IBAN), so a
panel has at most one coloured run. Areas not yet built still show, in secondary
text, with "In the full system" instead of a count; they open one shared card
that says what the area does and that the real system has it (or that it is
planned). No dead links, nothing hidden.

**People**

- Team: People overview (dashboard); Everyone (employee list); New employee,
  edit details; Organisation chart; Positions and headcount; Staff across the
  group; Multi-entity, cost centres.
- Hiring: Hiring: requisitions; Hiring: candidates board; Offers and offer
  letters; Vacancies; Cost-of-hire preview; AI resume screening.
- Joining and leaving: Joiner checklists; Leaver checklists, exit; Exit
  interviews; Transfers and re-joins; Probation ending, evaluate.
- Requests and letters: Staff requests (HR queue); Raise a request for someone;
  Profile change requests; Letters: salary cert, NOC; Travel and air tickets; HR
  help desk tickets; Policy versions, acknowledge.
- Documents and visas: Document expiry (all staff); Document upload, versions;
  Visas and government cases; Compliance calendar, due dates; ILOE insurance
  tracking; Electronic signatures.
- Compliance and safety: UAE compliance overview; Pension (GPSSA) register;
  Emiratisation and Nafis; Health insurance; Disciplinary records; Health and
  safety incidents; Labour crews and documents; Accommodation (camps).
- Growth: Appraisals and cycles; Goals and KPIs; Department performance; Skills;
  Training and learning; Engagement surveys; Compensation planning; Workforce
  planning.
- Inside: Employee record with tabs (in Everyone); End employment, resignation
  (in the person); Verifiable letters (code) (in Letters).

**Time**

- Leave: Leave requests (HR queue); Leave calendar; Record leave for someone;
  Leave encashment, donation; Leave liability and tickets; Holidays, comp-off,
  grants.
- Attendance: Attendance today; Attendance corrections; Phone clock-in
  (geofence); Device punches, unmatched; Timesheets, time booking; Work-from-
  home tracking; Face or QR check-in, kiosk.
- Rosters: Shifts and rosters; Roster planning; Attendance against shifts;
  Leave-safe roster, OT cost.
- Overtime: Overtime to approve; Crew overtime pre-approval.
- Inside: Leave balances (in the person).

**Pay**

- This month: Pay run: review, fix, approve; Payslip; What-if replay (owner
  view); Payslips of a run (list); Past pay runs; Bank advice file; Off-cycle
  and bonus runs; Salary hold.
- Changes: Pay corrections; Salary revisions, arrears; Deductions ledger;
  Expense claims; Traffic fines to decide; Prior-employment pay data; Sales
  commission statements.
- Owed and leaving: Loans and advances; Final settlements; Gratuity provision;
  One exit flow, legal flags.
- Not in scope yet: Multi-currency payroll; Pay-structure sandbox; Pay from
  evidence (KPI pay); AI anomaly checks; DIFC DEWS, other GCC pensions; Saudi
  payroll (Mudad, GOSI); Earned wage access, cards.
- Inside: Fix a held IBAN inline (in Pay run); Maker and checker approval (in
  Pay run); Explain any figure (trace) (in any figure); Pre-pay gate (Fix step)
  (in Pay run); WPS salary file (SIF) (in Pay run); Pension in the run (GPSSA)
  (in Pay run); Settlement statement (in Final settlements).

**Reports**

- Pay reports: Payroll summary (register); Cost by department; Salary file
  register (bank); Employer cost and costing; Variance against last month;
  Gratuity liability report; Leave report; Loans report.
- People and dashboards: Headcount by nationality; Documents expiring report; HR
  analytics (turnover...); Executive dashboard; IT dashboard (access, jobs);
  Owner brief (weekly pack); Board pack.
- Finance links: Elements and element variance; Payroll journal; Recharges
  between companies.
- Analysis and trail: Analysis builder; Audit trail (hash-chained); Approval
  report, status, matrix; Inspection pack, auditor room; Ask for a report in
  words; Payroll forecast, plan vs actual.

**Setup**

- People rules: Jobs and grades; Document types; Letter templates; Checklist
  templates; Request approval levels; KPI library and periods; Trades; Custom
  fields.
- Time rules: Leave policies; Overtime policy and rates; Holidays and Ramadan
  hours; Attendance devices and feeds; Rule packs, law updates.
- Pay rules: Pay elements; Pay groups; Pay calendar; WPS settings; Payroll
  exemptions.
- Access and approvals: Users, roles, permissions; Approval rules and limits;
  Segregation of duties; Single sign-on and MFA; Access reviews; Auditor access;
  Privacy office, retention.
- Connections: API keys; Webhooks; WhatsApp approvals; Email-in to records;
  Calendar feeds; Accounting sync (Xero...); Slack and Teams.
- Data and company: Data import, Keka cut-over; Parallel run compare; Data
  export, backup, health; Companies, numbering; Arabic screens (switch).

Home has no panel. Its content is the decision list (pay run state, approvals,
requests waiting, expiring documents, to-do, notices) and links into the other
panels. Notifications and help are icons at the right of the bar; leave cover
sits in the account menu; approval splits and resets are Cmd K only. All of
these are one click from anywhere.

## 3. Where things live: person, pay run, palette

**On the person record** (tabs: Summary, Pay, Time, Papers, Growth, History).
Anything whose subject is one employee: payslips, loans, deductions, revisions,
overtime, leave balance and requests, attendance, documents, letters, warnings,
probation, appraisals, goals, training, transfers, the audit history. Actions on
the person are verbs in one menu: Issue a letter, Revise salary, Give a loan,
Record a warning, Transfer, End employment (which opens the settlement). Each of
these also has an all-staff list in a panel, so the person is a second route,
never the only one.

**On the pay run.** Anything that changes this month's net pay shows as a line
in Review with a link to its home: approved overtime, unpaid leave, corrections,
loan instalments, deductions, revisions with arrears, expenses repaid, fines,
settlements due, pension, held IBANs. Fix holds only what stops pay or needs a
check. The run never edits these; it links to where they are decided, and comes
back.

**Only in Cmd K.** Every area is in the palette, but these live only there:
actions ("Issue NOC for Priya", "Enter IBAN for ..."), the AI assistant and
policy questions when built, rare tasks done less than monthly by one person
(approval splits and resets, data export, demo clock), and modules outside HR
and payroll (section 9), which show as "Other Mubinflow modules" with their
status. Nothing else is palette-only.

## 4. Screen archetypes

Seven templates cover every row. Builders fill a template from a config
(columns, filters, tabs, fields) and demo data; they do not design screens.
Counts are over all inventory rows.

| Code | Archetype | Rows | In gap | Build once | Per row |
|---|---|---|---|---|---|
| LF | List with filters | 60 | 47 | 1.5 h | 0.5 h |
| RT | Record page with tabs | 8 | 5 | 1.5 h | 1 h |
| FA | Form with approval | 39 | 23 | 2 h | 1 h |
| CA | Calendar | 9 | 4 | 1.5 h | 1 h |
| RP | Report | 41 | 24 | 1 h | 0.5 h |
| ST | Settings form | 30 | 23 | 1 h | 0.5 h |
| SF | Step flow | 8 | 2 | exists | 2 h |

- LF: search, segmented filter (All / Needs attention / ...), fixed
  48px rows, row opens a record or a side sheet. Covers lists, queues,
  ledgers and boards (a board is LF grouped by status).
- RT: summary strip of 3 figures, then tabs; each tab is an LF or a
  key-value grid. Employee, payslip, settlement, checklist.
- FA: a side sheet form; submit sends it to the approvals inbox with
  maker and checker named. Letters, loans, revisions, leave.
- CA: month grid with people as rows; leave, rosters, holidays.
- RP: title, period chip, one figure, one table or bars, CSV and print
  (the current Reports page is the template).
- ST: grouped key-value settings with an edit sheet and a change log.
- SF: the pay run stepper; reused for import, off-cycle runs and exit.

## 5. Mock: the People panel, desktop and phone

Counts: 31, 1 on probation, 1 leaver and 2 held IBANs come from the demo data;
the others are placeholders the build reads from selectors.

```
Mubinflow   Home  [People]  Time  Pay  Reports  Setup    [Cmd K] (HA)
+--------------------------------------------------------------------+
| TEAM            HIRING            JOINING, LEAVING  REQUESTS       |
| Everyone    31  Candidates     3  Joiners        1  Staff req.   4 |
| Overview        Requisitions      Leavers        1  Letters      2 |
| Org chart       Offers         1  Probation      1  Profile chg. 1 |
| Positions       Vacancies         Transfers         Travel         |
| Across group    Cost of hire  ..  Exit interv.  ..  Policies    .. |
|                                                                    |
| DOCUMENTS, VISAS    COMPLIANCE, SAFETY     GROWTH                  |
| Expiring        5   UAE overview           Appraisals        3     |
| Visa cases      2   Pension (GPSSA)        Goals and KPIs          |
| Due dates       3   Emiratisation, Nafis   Training         ..     |
| ILOE            ..  Disciplinary           Surveys          ..     |
|                                                                    |
| ".." = In the full system (opens what it does). Cmd K: type a name |
+--------------------------------------------------------------------+
```

Behaviour: opens on click or Return, closes on Esc or a click outside, arrow
keys move between areas, the first area takes focus. It is a `nav` with one `ul`
per group and a heading per group; counts are read as "5 waiting". The mock
shows the first five areas of each group to fit 70 columns; the real panel shows
all of a group's areas (at most eight), so every People area is 2 clicks.

Phone: a floating bar of 4 fixed tabs (Home, Pay, Time, People), as the critique
asks, with search and the account button in the header. The account button opens
a sheet listing the Reports and Setup areas by group, so those are 2 taps too
(account, area). The employee bar on the phone is Home, Pay, Time, Requests,
with Me under the account button.

```
+------------------------------+
| People          [Srch]  (HA) |
| 31 people  1 on probation    |
| [All 31][Needs attention 3]  |
|------------------------------|
| TEAM                         |
|  Everyone                31 >|
|  Org chart                  >|
|  ...                         |
| HIRING                       |
|  Candidates               3 >|
| JOINING AND LEAVING          |
|  Leavers                  1 >|
|  Probation                1 >|
| REQUESTS AND LETTERS         |
|  Staff requests           4 >|
| DOCUMENTS AND VISAS          |
|  Expiring                 5 >|
| COMPLIANCE AND SAFETY  ...   |
| GROWTH                 ...   |
|                              |
| ( Home  Pay  Time  People )  |
+------------------------------+
```

Tap 1 is the People tab (or Pay, Time); tap 2 is the area. Grouped inset lists,
48pt rows, chevrons, the same registry as the desktop panel, so the phone and
desktop can never disagree.

## 6. Coverage against the 80% target

| Measure | Rows |
|---|---|
| Inventory rows (screens only) | 195 |
| From Manar / market / both | 54 / 50 / 91 |
| Status: live in demo | 28 |
| Status: backend built, no screen | 75 |
| Status: hours to add | 69 |
| Status: not built | 23 |
| Tier T1 tomorrow | 36 |
| Tier T2 generic screen | 79 |
| Tier T3 later | 80 |
| Live today | 28 (14%) |
| Needed for 80% | 156 |
| Gap to build | 128 rows, 96 builder-hours |
| All buildable rows | 144 rows, 114 builder-hours |

The 23 "not built" rows (AI assistant, Saudi payroll, accounting sync and so on)
cannot be made live tomorrow, so 80% means building 128 of the 144 buildable
rows. Only 16 buildable rows can be left out; they are listed after the gap.
Hours assume the templates from WP1 exist: about half an hour for a list, report
or settings screen, an hour for a form, record or calendar, two for a step flow.
They are rough.

### Gap list, by value to a bank HR manager, GM and IT manager

Order: tier, then value (3 high), then size. Who: HR, GM, IT. WP is the work
package in section 7.

| # | ID | Feature | Ar | h | Val | Who | WP |
|---|---|---|---|---|---|---|---|
| 1 | T04 | Leave balances | LF | 0.5 | 3 | HR | WP5 |
| 2 | T30 | Overtime to approve | LF | 0.5 | 3 | HR+GM | WP5 |
| 3 | P01 | People overview (dashboard) | RP | 2 | 3 | HR+GM | WP2 |
| 4 | P33 | Letters: salary cert, NOC | FA | 2 | 3 | HR | WP4 |
| 5 | R31 | Final settlements | RT | 2 | 3 | HR+GM | WP6 |
| 6 | S20 | Users, roles, permissions | LF | 2 | 3 | IT | WP9 |
| 7 | X31 | Audit trail (hash-chained) | LF | 2 | 3 | IT | WP7 |
| 8 | R09 | What-if replay (owner view) | FA | 3 | 3 | GM | WP6 |
| 9 | P30 | Staff requests (HR queue) | LF | 0.5 | 3 | HR | WP4 |
| 10 | P42 | Visas and government cases | LF | 0.5 | 3 | HR | WP4 |
| 11 | P43 | UAE compliance overview | RP | 0.5 | 3 | HR+GM | WP4 |
| 12 | P44 | Pension (GPSSA) register | LF | 0.5 | 3 | HR | WP4 |
| 13 | P45 | Emiratisation and Nafis | RP | 0.5 | 3 | HR+GM | WP4 |
| 14 | R33 | Gratuity provision | RP | 0.5 | 3 | GM | WP6 |
| 15 | S21 | Approval rules and limits | ST | 0.5 | 3 | GM+IT | WP9 |
| 16 | S22 | Segregation of duties | ST | 0.5 | 3 | IT | WP9 |
| 17 | S23 | Single sign-on and MFA | ST | 0.5 | 3 | IT | WP9 |
| 18 | S30 | API keys | LF | 0.5 | 3 | IT | WP9 |
| 19 | T06 | Leave liability and tickets | RP | 0.5 | 3 | HR+GM | WP5 |
| 20 | X05 | Variance against last month | RP | 0.5 | 3 | GM | WP7 |
| 21 | X07 | Gratuity liability report | RP | 0.5 | 3 | GM | WP7 |
| 22 | X23 | Executive dashboard | RP | 0.5 | 3 | GM | WP7 |
| 23 | X24 | IT dashboard (access, jobs) | RP | 0.5 | 3 | IT | WP7 |
| 24 | X25 | Owner brief (weekly pack) | RP | 0.5 | 3 | GM | WP7 |
| 25 | P15 | Leaver checklists, exit | RT | 1 | 3 | HR | WP3 |
| 26 | P16 | End employment, resignation | FA | 1 | 3 | HR | WP3 |
| 27 | P19 | Probation ending, evaluate | FA | 1 | 3 | HR | WP3 |
| 28 | R21 | Salary revisions, arrears | FA | 1 | 3 | HR+GM | WP6 |
| 29 | R30 | Loans and advances | FA | 1 | 3 | HR | WP6 |
| 30 | S37 | Data import, Keka cut-over | SF | 2 | 3 | IT | WP9 |
| 31 | E05 | My documents, update | LF | 0.5 | 2 | HR | WP10 |
| 32 | E10 | My team today | LF | 0.5 | 2 | HR | WP10 |
| 33 | H07 | To-do list (tasks) | LF | 0.5 | 2 | HR | WP10 |
| 34 | H08 | Notifications | LF | 0.5 | 2 | HR+GM+IT | WP10 |
| 35 | H09 | Notice board, announcements | LF | 0.5 | 2 | HR | WP10 |
| 36 | H10 | Leave cover for approvals | ST | 0.5 | 2 | HR+GM | WP10 |
| 37 | P06 | Positions and headcount | LF | 0.5 | 2 | HR+GM | WP2 |
| 38 | P07 | Staff across the group | LF | 0.5 | 2 | GM | WP2 |
| 39 | P10 | Hiring: requisitions | LF | 0.5 | 2 | HR | WP3 |
| 40 | P11 | Hiring: candidates board | LF | 0.5 | 2 | HR | WP3 |
| 41 | P36 | Travel and air tickets | LF | 0.5 | 2 | HR | WP4 |
| 42 | P47 | Disciplinary records | LF | 0.5 | 2 | HR | WP4 |
| 43 | P60 | Appraisals and cycles | LF | 0.5 | 2 | HR | WP2 |
| 44 | P61 | Goals and KPIs | LF | 0.5 | 2 | HR+GM | WP2 |
| 45 | R10 | Payslips of a run (list) | LF | 0.5 | 2 | HR | WP6 |
| 46 | R11 | Past pay runs | LF | 0.5 | 2 | HR+GM | WP6 |
| 47 | R12 | Bank advice file | RP | 0.5 | 2 | HR | WP6 |
| 48 | R22 | Deductions ledger | LF | 0.5 | 2 | HR | WP6 |
| 49 | S10 | Leave policies | ST | 0.5 | 2 | HR | WP8 |
| 50 | S11 | Overtime policy and rates | ST | 0.5 | 2 | HR | WP8 |
| 51 | S12 | Holidays and Ramadan hours | ST | 0.5 | 2 | HR | WP8 |
| 52 | S13 | Pay elements | ST | 0.5 | 2 | HR | WP8 |
| 53 | S14 | Pay groups | ST | 0.5 | 2 | HR | WP8 |
| 54 | S16 | WPS settings | ST | 0.5 | 2 | HR+IT | WP8 |
| 55 | S31 | Webhooks | LF | 0.5 | 2 | IT | WP9 |
| 56 | S32 | WhatsApp approvals | ST | 0.5 | 2 | HR+IT | WP9 |
| 57 | T10 | Attendance today | LF | 0.5 | 2 | HR | WP5 |
| 58 | T22 | Attendance against shifts | RP | 0.5 | 2 | HR | WP5 |
| 59 | X04 | Employer cost and costing | RP | 0.5 | 2 | GM | WP7 |
| 60 | X10 | Leave report | RP | 0.5 | 2 | HR | WP7 |
| 61 | X22 | HR analytics (turnover...) | RP | 0.5 | 2 | HR+GM | WP7 |
| 62 | E06 | My profile, change, dependants | FA | 1 | 2 | HR | WP10 |
| 63 | E07 | My requests and letters | FA | 1 | 2 | HR | WP10 |
| 64 | E08 | My expenses | FA | 1 | 2 | HR | WP10 |
| 65 | E09 | My time card, correct, clock | FA | 1 | 2 | HR | WP10 |
| 66 | E11 | Team probation and appraisal | FA | 1 | 2 | HR | WP10 |
| 67 | P04 | New employee, edit details | FA | 1 | 2 | HR | WP2 |
| 68 | P12 | Offers and offer letters | FA | 1 | 2 | HR | WP3 |
| 69 | P14 | Joiner checklists | RT | 1 | 2 | HR | WP3 |
| 70 | P18 | Transfers and re-joins | FA | 1 | 2 | HR | WP3 |
| 71 | P31 | Raise a request for someone | FA | 1 | 2 | HR | WP4 |
| 72 | P32 | Profile change requests | FA | 1 | 2 | HR | WP4 |
| 73 | P41 | Document upload, versions | RT | 1 | 2 | HR+IT | WP4 |
| 74 | P51 | Compliance calendar, due dates | CA | 1 | 2 | HR | WP4 |
| 75 | R20 | Pay corrections | FA | 1 | 2 | HR | WP6 |
| 76 | R23 | Expense claims | FA | 1 | 2 | HR+GM | WP6 |
| 77 | R32 | Settlement statement | RT | 1 | 2 | HR | WP6 |
| 78 | T03 | Record leave for someone | FA | 1 | 2 | HR | WP5 |
| 79 | T05 | Leave encashment, donation | FA | 1 | 2 | HR | WP5 |
| 80 | T07 | Holidays, comp-off, grants | CA | 1 | 2 | HR | WP5 |
| 81 | T11 | Attendance corrections | FA | 1 | 2 | HR | WP5 |
| 82 | T12 | Phone clock-in (geofence) | FA | 1 | 2 | HR+IT | WP5 |
| 83 | T20 | Shifts and rosters | CA | 1 | 2 | HR | WP5 |
| 84 | T21 | Roster planning | CA | 1 | 2 | HR | WP5 |
| 85 | P05 | Organisation chart | RP | 2 | 2 | HR+GM | WP2 |
| 86 | X11 | Loans report | RP | 0.5 | 1 | HR | WP7 |
| 87 | T31 | Crew overtime pre-approval | FA | 1 | 1 | HR | WP5 |
| 88 | P46 | Health insurance | LF | 0.5 | 2 | HR | WP4 |
| 89 | P62 | Department performance | RP | 0.5 | 2 | GM | WP2 |
| 90 | S19 | Rule packs, law updates | LF | 0.5 | 2 | HR | WP8 |
| 91 | S24 | Access reviews | LF | 0.5 | 2 | IT | WP9 |
| 92 | S39 | Data export, backup, health | LF | 0.5 | 2 | IT | WP9 |
| 93 | X08 | Payroll journal | RP | 0.5 | 2 | GM | WP7 |
| 94 | X32 | Approval report, status, matrix | RP | 0.5 | 2 | IT | WP7 |
| 95 | R34 | One exit flow, legal flags | SF | 2 | 2 | HR | WP6 |
| 96 | S38 | Parallel run compare | RP | 2 | 2 | HR | WP9 |
| 97 | X30 | Analysis builder | RP | 2 | 2 | GM+IT | WP7 |
| 98 | E13 | My KPIs | LF | 0.5 | 1 | HR | WP10 |
| 99 | H12 | Help and training videos | RP | 0.5 | 1 | HR | WP10 |
| 100 | P08 | Multi-entity, cost centres | LF | 0.5 | 1 | GM | WP2 |
| 101 | P13 | Vacancies | LF | 0.5 | 1 | HR | WP3 |
| 102 | P35 | Electronic signatures | LF | 0.5 | 1 | IT | WP4 |
| 103 | P37 | HR help desk tickets | LF | 0.5 | 1 | HR | WP4 |
| 104 | P48 | Health and safety incidents | LF | 0.5 | 1 | HR | WP4 |
| 105 | P49 | Labour crews and documents | LF | 0.5 | 1 | HR | WP4 |
| 106 | P50 | Accommodation (camps) | LF | 0.5 | 1 | HR | WP4 |
| 107 | P52 | ILOE insurance tracking | LF | 0.5 | 1 | HR | WP4 |
| 108 | P53 | Policy versions, acknowledge | LF | 0.5 | 1 | HR | WP4 |
| 109 | P63 | Skills | LF | 0.5 | 1 | HR | WP2 |
| 110 | P64 | Training and learning | LF | 0.5 | 1 | HR | WP2 |
| 111 | P65 | Engagement surveys | LF | 0.5 | 1 | HR | WP2 |
| 112 | P66 | Sales commission statements | RP | 0.5 | 1 | GM | WP6 |
| 113 | R24 | Traffic fines to decide | LF | 0.5 | 1 | HR | WP6 |
| 114 | S01 | Jobs and grades | ST | 0.5 | 1 | HR | WP8 |
| 115 | S02 | Document types | ST | 0.5 | 1 | HR | WP8 |
| 116 | S03 | Letter templates | ST | 0.5 | 1 | HR | WP8 |
| 117 | S04 | Checklist templates | ST | 0.5 | 1 | HR | WP8 |
| 118 | S05 | Request approval levels | ST | 0.5 | 1 | HR | WP8 |
| 119 | S06 | KPI library and periods | ST | 0.5 | 1 | HR | WP8 |
| 120 | S07 | Trades | ST | 0.5 | 1 | HR | WP8 |
| 121 | S08 | Custom fields | ST | 0.5 | 1 | IT | WP8 |
| 122 | S17 | Payroll exemptions | ST | 0.5 | 1 | HR | WP8 |
| 123 | S18 | Attendance devices and feeds | LF | 0.5 | 1 | IT | WP8 |
| 124 | S33 | Email-in to records | ST | 0.5 | 1 | IT | WP9 |
| 125 | S34 | Calendar feeds | ST | 0.5 | 1 | IT | WP9 |
| 126 | S40 | Companies, numbering | ST | 0.5 | 1 | IT | WP9 |
| 127 | T13 | Device punches, unmatched | LF | 0.5 | 1 | IT | WP5 |
| 128 | T14 | Timesheets, time booking | LF | 0.5 | 1 | HR | WP5 |

Buildable rows left out of the 80% (lowest value):

T15 Work-from-home tracking, X06 Elements and element variance, X09 Recharges
between companies, X26 Board pack, E12 My calendar, E14 Report a safety
incident, E15 Request access, H11 Approval splits and resets, P17 Exit
interviews, R14 Salary hold, R25 Prior-employment pay data, S15 Pay calendar,
H13 Team chat and intranet, H14 Meetings with transcript, R13 Off-cycle and
bonus runs, T23 Leave-safe roster, OT cost.

## 7. Work packages for parallel builders

WP1 must land first; the other nine start once it is merged. Each package owns
one folder under `apps/web/src/` and one registry file `nav/areas/<package>.ts`;
WP1's registry index imports the nine files by a fixed list, so no two packages
edit the same file. Demo data is added by the data agent in `packages/demo-
data/src/<package>.ts` before the builder starts, where the table says so.

- **WP1 Shell and templates (one builder, about 5 h, first).** The
  registry (`nav/registry.ts`: id, label, section, group, status,
  count selector, route, archetype), the bar and panels
  (`shell/TopBar.tsx`, a new `shell/SectionPanel.tsx`), the phone bar,
  Cmd K reading the same registry (`shell/CommandPalette.tsx`), the
  "In the full system" card, routes in `demo/route.ts` (add `setup`,
  `reports`; keep `pay-run` and `time-off`), `views.tsx`, and the six
  new templates under `ui/templates/`, plus Cmd K results that are
  actions (H06).

| WP | Scope | Gap rows | h |
|---|---|---|---|
| WP2 | People: Team and Growth | 12 | 9.5 |
| WP3 | People: Hiring, joining and leaving | 9 | 7.5 |
| WP4 | People: Requests, documents, compliance | 20 | 13.5 |
| WP5 | Time: leave, attendance, rosters, overtime | 15 | 11.5 |
| WP6 | Pay: this month, changes, owed and leaving | 15 | 15.5 |
| WP7 | Reports and dashboards | 13 | 9.5 |
| WP8 | Setup: rules | 17 | 8.5 |
| WP9 | Setup: access, connections, data | 14 | 11.5 |
| WP10 | Home and the employee bar | 13 | 9 |

- WP2: folder `people/team, people/growth`; new demo data first: org tree,
  positions, appraisals, goals.
- WP3: folder `people/moves`; new demo data first: candidates, offers,
  checklists, transfers.
- WP4: folder `people/papers`; new demo data first: letters, requests, visa
  cases, warnings.
- WP5: folder `time/`; new demo data first: shifts, punches, overtime claims
  (attendance exists).
- WP6: folder `pay/`; new demo data first: loans, revisions, corrections, past
  runs.
- WP7: folder `reports/`; new demo data first: audit events, monthly history for
  variance.
- WP8: folder `setup/rules`; new demo data first: none: reads the engine's packs
  and leave types.
- WP9: folder `setup/access`; new demo data first: users, roles, keys, webhooks,
  import sample.
- WP10: folder `home/inbox, me/`; new demo data first: tasks, notices,
  notifications.

Every package except WP8 needs new demo data first, so the data agent should
start now, in package order WP6, WP4, WP3, WP5, WP2, WP7, WP9, WP10. WP6 also
touches the pay run (`payrun/`), which it then owns; nobody else edits it.

## 8. Inventory: Manar One HR and payroll plus the market list

One row per area. Src: M Manar One, K market list, B both. Also: P person
record, R pay run, H Home, E employee bar, A Cmd K action (every row is in Cmd K
anyway). St: L live in demo, B backend built but no screen, H hours to add (demo
scene from demo data), N not built. T: tier. Ar: archetype (section 4). h:
builder-hours to make it live. Depth: Home is 0; every row under People, Time,
Pay, Reports and Setup is 2 clicks (word, area); Home rows are 1; employee-bar
rows are 2 in that bar.

### Home

**Home**

| ID | Feature | Src | Also | St | T | Ar | h |
|---|---|---|---|---|---|---|---|
| H01 | Decisions to make (Home) | K | - | L | 1 | RP | - |
| H02 | Approvals inbox, every kind | B | E | L | 1 | LF | - |
| H03 | Approval detail and decide | M | - | L | 1 | FA | - |
| H04 | Requests waiting for me | M | E | L | 1 | LF | - |
| H05 | Documents expiring (card) | B | P | L | 1 | LF | - |
| H06 | Search and act (Cmd K) | B | A | L | 1 | LF | - |
| H07 | To-do list (tasks) | B | E | B | 2 | LF | 0.5 |
| H08 | Notifications | M | E | H | 2 | LF | 0.5 |
| H09 | Notice board, announcements | B | E | H | 2 | LF | 0.5 |
| H10 | Leave cover for approvals | M | - | B | 2 | ST | 0.5 |
| H11 | Approval splits and resets | M | - | H | 3 | FA | 1 |
| H12 | Help and training videos | M | A | H | 3 | RP | 0.5 |
| H13 | Team chat and intranet | K | A | H | 3 | LF | 2 |
| H14 | Meetings with transcript | K | A | H | 3 | LF | 2 |
| H15 | AI assistant, cited policy Q&A | K | A | N | 3 | LF | 3 |

### People

**Team**

| ID | Feature | Src | Also | St | T | Ar | h |
|---|---|---|---|---|---|---|---|
| P01 | People overview (dashboard) | M | - | H | 1 | RP | 2 |
| P02 | Everyone (employee list) | B | - | L | 1 | LF | - |
| P03 | Employee record with tabs | B | - | L | 1 | RT | - |
| P04 | New employee, edit details | B | P | B | 2 | FA | 1 |
| P05 | Organisation chart | B | P | H | 2 | RP | 2 |
| P06 | Positions and headcount | B | - | H | 2 | LF | 0.5 |
| P07 | Staff across the group | M | P | H | 2 | LF | 0.5 |
| P08 | Multi-entity, cost centres | K | P | B | 3 | LF | 0.5 |

**Hiring**

| ID | Feature | Src | Also | St | T | Ar | h |
|---|---|---|---|---|---|---|---|
| P10 | Hiring: requisitions | B | - | B | 2 | LF | 0.5 |
| P11 | Hiring: candidates board | B | - | B | 2 | LF | 0.5 |
| P12 | Offers and offer letters | B | P | B | 2 | FA | 1 |
| P13 | Vacancies | M | - | H | 3 | LF | 0.5 |
| P20 | Cost-of-hire preview | K | A | N | 3 | FA | 2 |
| P21 | AI resume screening | K | - | N | 3 | LF | 3 |

**Joining and leaving**

| ID | Feature | Src | Also | St | T | Ar | h |
|---|---|---|---|---|---|---|---|
| P14 | Joiner checklists | B | P | B | 2 | RT | 1 |
| P15 | Leaver checklists, exit | B | P | B | 2 | RT | 1 |
| P16 | End employment, resignation | B | P | B | 2 | FA | 1 |
| P17 | Exit interviews | K | P | H | 3 | FA | 1 |
| P18 | Transfers and re-joins | M | P | H | 2 | FA | 1 |
| P19 | Probation ending, evaluate | M | P,E | B | 2 | FA | 1 |

**Requests and letters**

| ID | Feature | Src | Also | St | T | Ar | h |
|---|---|---|---|---|---|---|---|
| P30 | Staff requests (HR queue) | B | P,H | B | 2 | LF | 0.5 |
| P31 | Raise a request for someone | M | P | B | 2 | FA | 1 |
| P32 | Profile change requests | M | P | H | 2 | FA | 1 |
| P33 | Letters: salary cert, NOC | B | P,E,A | B | 1 | FA | 2 |
| P34 | Verifiable letters (code) | K | P | N | 3 | FA | 2 |
| P36 | Travel and air tickets | B | P | H | 2 | LF | 0.5 |
| P37 | HR help desk tickets | K | E | H | 3 | LF | 0.5 |
| P53 | Policy versions, acknowledge | K | E | H | 3 | LF | 0.5 |

**Documents and visas**

| ID | Feature | Src | Also | St | T | Ar | h |
|---|---|---|---|---|---|---|---|
| P40 | Document expiry (all staff) | B | P,H | L | 1 | LF | - |
| P41 | Document upload, versions | B | P | B | 2 | RT | 1 |
| P42 | Visas and government cases | B | P | H | 2 | LF | 0.5 |
| P51 | Compliance calendar, due dates | K | H | H | 2 | CA | 1 |
| P52 | ILOE insurance tracking | K | P | H | 3 | LF | 0.5 |
| P35 | Electronic signatures | M | P | H | 3 | LF | 0.5 |

**Compliance and safety**

| ID | Feature | Src | Also | St | T | Ar | h |
|---|---|---|---|---|---|---|---|
| P43 | UAE compliance overview | B | H | H | 2 | RP | 0.5 |
| P44 | Pension (GPSSA) register | B | P,R | B | 2 | LF | 0.5 |
| P45 | Emiratisation and Nafis | B | - | B | 2 | RP | 0.5 |
| P46 | Health insurance | M | P | H | 3 | LF | 0.5 |
| P47 | Disciplinary records | B | P | H | 2 | LF | 0.5 |
| P48 | Health and safety incidents | M | P,E | H | 3 | LF | 0.5 |
| P49 | Labour crews and documents | M | P | H | 3 | LF | 0.5 |
| P50 | Accommodation (camps) | B | P | H | 3 | LF | 0.5 |

**Growth**

| ID | Feature | Src | Also | St | T | Ar | h |
|---|---|---|---|---|---|---|---|
| P60 | Appraisals and cycles | B | P,E | B | 2 | LF | 0.5 |
| P61 | Goals and KPIs | B | P,E | B | 2 | LF | 0.5 |
| P62 | Department performance | M | - | H | 3 | RP | 0.5 |
| P63 | Skills | M | P | H | 3 | LF | 0.5 |
| P64 | Training and learning | B | P | B | 3 | LF | 0.5 |
| P65 | Engagement surveys | K | E | B | 3 | LF | 0.5 |
| P67 | Compensation planning | K | - | N | 3 | LF | 2 |
| P68 | Workforce planning | K | - | N | 3 | RP | 2 |

### Time

**Leave**

| ID | Feature | Src | Also | St | T | Ar | h |
|---|---|---|---|---|---|---|---|
| T01 | Leave requests (HR queue) | B | P,H | L | 1 | FA | - |
| T02 | Leave calendar | B | E | L | 1 | CA | - |
| T03 | Record leave for someone | M | P | B | 2 | FA | 1 |
| T04 | Leave balances | B | P,E | B | 1 | LF | 0.5 |
| T05 | Leave encashment, donation | B | P,R | B | 2 | FA | 1 |
| T06 | Leave liability and tickets | B | - | B | 2 | RP | 0.5 |
| T07 | Holidays, comp-off, grants | K | - | H | 2 | CA | 1 |

**Attendance**

| ID | Feature | Src | Also | St | T | Ar | h |
|---|---|---|---|---|---|---|---|
| T10 | Attendance today | B | P,H | B | 2 | LF | 0.5 |
| T11 | Attendance corrections | B | P,R | B | 2 | FA | 1 |
| T12 | Phone clock-in (geofence) | B | E | B | 2 | FA | 1 |
| T13 | Device punches, unmatched | B | - | B | 3 | LF | 0.5 |
| T14 | Timesheets, time booking | B | E | H | 3 | LF | 0.5 |
| T15 | Work-from-home tracking | K | P | B | 3 | RP | 0.5 |
| T16 | Face or QR check-in, kiosk | K | E | N | 3 | FA | 3 |

**Rosters**

| ID | Feature | Src | Also | St | T | Ar | h |
|---|---|---|---|---|---|---|---|
| T20 | Shifts and rosters | B | P | B | 2 | CA | 1 |
| T21 | Roster planning | B | - | B | 2 | CA | 1 |
| T22 | Attendance against shifts | M | - | B | 2 | RP | 0.5 |
| T23 | Leave-safe roster, OT cost | K | - | H | 3 | CA | 2 |

**Overtime**

| ID | Feature | Src | Also | St | T | Ar | h |
|---|---|---|---|---|---|---|---|
| T30 | Overtime to approve | B | P,R | B | 1 | LF | 0.5 |
| T31 | Crew overtime pre-approval | M | E | B | 2 | FA | 1 |

### Pay

**This month**

| ID | Feature | Src | Also | St | T | Ar | h |
|---|---|---|---|---|---|---|---|
| R01 | Pay run: review, fix, approve | B | H | L | 1 | SF | - |
| R02 | Fix a held IBAN inline | K | H,P | L | 1 | FA | - |
| R03 | Maker and checker approval | B | H | L | 1 | FA | - |
| R04 | Explain any figure (trace) | K | P,E | L | 1 | RT | - |
| R05 | Payslip | B | P,E | L | 1 | RT | - |
| R06 | Pre-pay gate (Fix step) | K | H | L | 1 | SF | - |
| R07 | WPS salary file (SIF) | B | - | L | 1 | SF | - |
| R08 | Pension in the run (GPSSA) | B | P | L | 1 | SF | - |
| R09 | What-if replay (owner view) | K | P,A | B | 1 | FA | 3 |
| R10 | Payslips of a run (list) | M | - | B | 2 | LF | 0.5 |
| R11 | Past pay runs | M | - | B | 2 | LF | 0.5 |
| R12 | Bank advice file | K | - | B | 2 | RP | 0.5 |
| R13 | Off-cycle and bonus runs | K | - | H | 3 | SF | 2 |
| R14 | Salary hold | K | P | H | 3 | FA | 1 |

**Changes**

| ID | Feature | Src | Also | St | T | Ar | h |
|---|---|---|---|---|---|---|---|
| R20 | Pay corrections | M | P | B | 2 | FA | 1 |
| R21 | Salary revisions, arrears | B | P | B | 2 | FA | 1 |
| R22 | Deductions ledger | M | P | B | 2 | LF | 0.5 |
| R23 | Expense claims | B | P,E | B | 2 | FA | 1 |
| R24 | Traffic fines to decide | M | P | H | 3 | LF | 0.5 |
| R25 | Prior-employment pay data | K | P | H | 3 | FA | 1 |
| P66 | Sales commission statements | B | P,R | H | 3 | RP | 0.5 |

**Owed and leaving**

| ID | Feature | Src | Also | St | T | Ar | h |
|---|---|---|---|---|---|---|---|
| R30 | Loans and advances | B | P | B | 2 | FA | 1 |
| R31 | Final settlements | B | P | B | 1 | RT | 2 |
| R32 | Settlement statement | M | P | B | 2 | RT | 1 |
| R33 | Gratuity provision | B | - | B | 2 | RP | 0.5 |
| R34 | One exit flow, legal flags | K | P | B | 3 | SF | 2 |

**Not in scope yet**

| ID | Feature | Src | Also | St | T | Ar | h |
|---|---|---|---|---|---|---|---|
| R40 | Multi-currency payroll | K | - | N | 3 | ST | 3 |
| R41 | Pay-structure sandbox | K | A | N | 3 | FA | 3 |
| R42 | Pay from evidence (KPI pay) | K | R | N | 3 | RP | 3 |
| R43 | AI anomaly checks | K | R | N | 3 | RP | 3 |
| R44 | DIFC DEWS, other GCC pensions | K | - | N | 3 | ST | 3 |
| R45 | Saudi payroll (Mudad, GOSI) | K | - | N | 3 | SF | 3 |
| R46 | Earned wage access, cards | K | P | N | 3 | LF | 3 |

### Reports

**Pay reports**

| ID | Feature | Src | Also | St | T | Ar | h |
|---|---|---|---|---|---|---|---|
| X01 | Payroll summary (register) | B | R | L | 1 | RP | - |
| X02 | Cost by department | B | - | L | 1 | RP | - |
| X03 | Salary file register (bank) | B | R | L | 1 | RP | - |
| X04 | Employer cost and costing | M | - | H | 2 | RP | 0.5 |
| X05 | Variance against last month | B | R | H | 2 | RP | 0.5 |
| X07 | Gratuity liability report | B | - | B | 2 | RP | 0.5 |
| X10 | Leave report | M | - | H | 2 | RP | 0.5 |
| X11 | Loans report | M | - | H | 2 | RP | 0.5 |

**People and dashboards**

| ID | Feature | Src | Also | St | T | Ar | h |
|---|---|---|---|---|---|---|---|
| X20 | Headcount by nationality | B | - | L | 1 | RP | - |
| X21 | Documents expiring report | B | - | L | 1 | RP | - |
| X22 | HR analytics (turnover...) | B | - | H | 2 | RP | 0.5 |
| X23 | Executive dashboard | M | H | H | 2 | RP | 0.5 |
| X24 | IT dashboard (access, jobs) | M | - | H | 2 | RP | 0.5 |
| X25 | Owner brief (weekly pack) | K | H | B | 2 | RP | 0.5 |
| X26 | Board pack | M | - | H | 3 | RP | 0.5 |

**Finance links**

| ID | Feature | Src | Also | St | T | Ar | h |
|---|---|---|---|---|---|---|---|
| X06 | Elements and element variance | M | - | H | 3 | RP | 0.5 |
| X08 | Payroll journal | B | R | H | 3 | RP | 0.5 |
| X09 | Recharges between companies | M | - | H | 3 | RP | 0.5 |

**Analysis and trail**

| ID | Feature | Src | Also | St | T | Ar | h |
|---|---|---|---|---|---|---|---|
| X30 | Analysis builder | B | A | H | 3 | RP | 2 |
| X31 | Audit trail (hash-chained) | B | P,R | B | 1 | LF | 2 |
| X32 | Approval report, status, matrix | M | - | H | 3 | RP | 0.5 |
| X33 | Inspection pack, auditor room | K | - | N | 3 | RP | 3 |
| X34 | Ask for a report in words | K | A | N | 3 | RP | 3 |
| X35 | Payroll forecast, plan vs actual | K | - | N | 3 | RP | 3 |

### Setup

**People rules**

| ID | Feature | Src | Also | St | T | Ar | h |
|---|---|---|---|---|---|---|---|
| S01 | Jobs and grades | M | - | H | 3 | ST | 0.5 |
| S02 | Document types | M | - | H | 3 | ST | 0.5 |
| S03 | Letter templates | B | - | B | 3 | ST | 0.5 |
| S04 | Checklist templates | B | - | B | 3 | ST | 0.5 |
| S05 | Request approval levels | M | - | H | 3 | ST | 0.5 |
| S06 | KPI library and periods | B | - | B | 3 | ST | 0.5 |
| S07 | Trades | M | - | H | 3 | ST | 0.5 |
| S08 | Custom fields | B | - | H | 3 | ST | 0.5 |

**Time rules**

| ID | Feature | Src | Also | St | T | Ar | h |
|---|---|---|---|---|---|---|---|
| S10 | Leave policies | B | - | B | 2 | ST | 0.5 |
| S11 | Overtime policy and rates | B | - | B | 2 | ST | 0.5 |
| S12 | Holidays and Ramadan hours | K | - | B | 2 | ST | 0.5 |
| S18 | Attendance devices and feeds | B | - | B | 3 | LF | 0.5 |
| S19 | Rule packs, law updates | K | - | B | 3 | LF | 0.5 |

**Pay rules**

| ID | Feature | Src | Also | St | T | Ar | h |
|---|---|---|---|---|---|---|---|
| S13 | Pay elements | B | - | H | 2 | ST | 0.5 |
| S14 | Pay groups | B | - | H | 2 | ST | 0.5 |
| S15 | Pay calendar | M | - | H | 3 | CA | 1 |
| S16 | WPS settings | B | - | B | 2 | ST | 0.5 |
| S17 | Payroll exemptions | M | - | H | 3 | ST | 0.5 |

**Access and approvals**

| ID | Feature | Src | Also | St | T | Ar | h |
|---|---|---|---|---|---|---|---|
| S20 | Users, roles, permissions | B | - | B | 1 | LF | 2 |
| S21 | Approval rules and limits | B | - | B | 2 | ST | 0.5 |
| S22 | Segregation of duties | B | - | H | 2 | ST | 0.5 |
| S23 | Single sign-on and MFA | B | - | B | 2 | ST | 0.5 |
| S24 | Access reviews | M | - | H | 3 | LF | 0.5 |
| S25 | Auditor access | B | - | N | 3 | ST | 2 |
| S26 | Privacy office, retention | B | - | N | 3 | ST | 2 |

**Connections**

| ID | Feature | Src | Also | St | T | Ar | h |
|---|---|---|---|---|---|---|---|
| S30 | API keys | B | - | B | 2 | LF | 0.5 |
| S31 | Webhooks | B | - | B | 2 | LF | 0.5 |
| S32 | WhatsApp approvals | K | E | B | 2 | ST | 0.5 |
| S33 | Email-in to records | K | - | B | 3 | ST | 0.5 |
| S34 | Calendar feeds | K | E | B | 3 | ST | 0.5 |
| S35 | Accounting sync (Xero...) | K | R | N | 3 | ST | 3 |
| S36 | Slack and Teams | K | - | N | 3 | ST | 3 |

**Data and company**

| ID | Feature | Src | Also | St | T | Ar | h |
|---|---|---|---|---|---|---|---|
| S37 | Data import, Keka cut-over | B | - | H | 2 | SF | 2 |
| S38 | Parallel run compare | K | R | H | 3 | RP | 2 |
| S39 | Data export, backup, health | M | - | H | 3 | LF | 0.5 |
| S40 | Companies, numbering | M | - | H | 3 | ST | 0.5 |
| S41 | Arabic screens (switch) | K | - | N | 3 | ST | 3 |

### Me

**Employee and manager bar**

| ID | Feature | Src | Also | St | T | Ar | h |
|---|---|---|---|---|---|---|---|
| E01 | My overview | M | - | L | 1 | RP | - |
| E02 | My payslips | B | - | L | 1 | LF | - |
| E03 | My leave and request | B | - | L | 1 | FA | - |
| E04 | My team's leave (manager) | M | - | L | 1 | CA | - |
| E05 | My documents, update | B | - | B | 2 | LF | 0.5 |
| E06 | My profile, change, dependants | M | - | H | 2 | FA | 1 |
| E07 | My requests and letters | B | - | B | 2 | FA | 1 |
| E08 | My expenses | B | - | B | 2 | FA | 1 |
| E09 | My time card, correct, clock | B | - | B | 2 | FA | 1 |
| E10 | My team today | M | - | B | 2 | LF | 0.5 |
| E11 | Team probation and appraisal | M | - | B | 2 | FA | 1 |
| E12 | My calendar | M | - | H | 3 | CA | 1 |
| E13 | My KPIs | B | - | B | 3 | LF | 0.5 |
| E14 | Report a safety incident | M | - | H | 3 | FA | 1 |
| E15 | Request access | M | - | H | 3 | FA | 1 |
| E16 | Ask about a payslip line | K | - | N | 3 | FA | 2 |

## 9. Manar One modules outside HR and payroll

Manar One's All apps page (seen as system administrator; the HR manager sees 6
of them) lists 18 modules, plus Projects behind a feature switch. Groups are the
sidebar groups in `apps.ts`; pages are `page.tsx` files whose route falls in
that module's menu (1,110 of the 1,170 pages place this way; the rest are portal
and public pages). Rows marked HR are covered by sections 1 to 8; the rest are
**outside HR and payroll**, listed so nothing is lost. "Our cover" names the
research doc or backend plan that already touches the module.

| Module | Groups | Pages | Purpose | Our cover |
|---|---|---|---|---|
| My work | 6 | 58 | Inbox, approvals, self-service | HR |
| Messages | 1 | 10 | Chat, mail, assistant | PL17 PL13 |
| CRM | 6 | 37 | Leads, pipeline, service | none |
| Sales | 7 | 74 | Quotes, orders, invoices | none |
| Scaffolding | 5 | 41 | Enquiries, contracts, site | none |
| Purchase | 7 | 78 | Requests, POs, bills | AP PL16 |
| Inventory | 6 | 83 | Stock, movements, yard | none |
| Manufacturing | 7 | 111 | Production, quality | none |
| Projects (switch) | 3 | 31 | BOQ, certificates | PL16 |
| Fleet and safety | 1 | 26 | Vehicles, fines, safety | rows R24 P48 |
| Accounting | 7 | 154 | Vouchers, tax, close | VAT PL12 PL16 |
| Cash and bank | 5 | 69 | Banks, payments, treasury | PL16 WPS |
| Assets | 2 | 30 | Fixed assets, leases | none |
| Group | 4 | 38 | Consolidation, intercompany | row P08 |
| Employees | 7 | 113 | HR (this map) | HR |
| Payroll | 4 | 50 | Pay runs, end of service | HR |
| Dashboards | 1 | 7 | Dashboards, analysis, pack | PL11 |
| Legal | 1 | 11 | Matters, owners, hearings | none |
| Settings | 7 | 80 | Users, controls, rules, data | PL3 PL13 PL17 |

Cover codes: HR = sections 1 to 8 of this map. PL3, PL11, PL12, PL13, PL16, PL17
= backend Plans 3 (auth, SSO), 11 (owner view), 12 (VAT and e-invoicing), 13
(channels), 16 (payables, budgets, project billing, trips, cards) and 17
(assistant, import, intranet, chat) in `docs/superpowers/plans/`. AP = the UAE
spend and AP specialists research doc. VAT = the two VAT and e-invoicing
research docs. WPS = the WPS research docs (salary files only). "none" means no
research or plan yet; CRM is not covered by Plan 15, which is social insights.

## 10. Not screens, so not in the inventory

Production hosting in the UAE, a penetration test, SOC 2 and ISO 27001, native
mobile apps (the demo is a phone-friendly website), a named customer success and
migration team, and VAT, corporate tax and e-invoicing (Plan 12; outside HR and
payroll, Accounting row above). Social and website insights (Plan 15) and
finance modules (Plan 16) appear in Cmd K under "Other Mubinflow modules" with
"not built".

## Appendix A. Manar One HR and payroll menu, item by item

Every item in `nav-people-admin.ts` (People and My workspace groups) and the HR
rows of the Administration group, with the inventory row that covers it.

- **People**: Employees P02; Staff across the group P07; Positions and headcount
  P06; Organisation chart P05; Health and safety P48; Jobs S01; Grades S01;
  Joiners and leavers P14 P15; Disciplinary records P47; HR analytics X22; UAE
  compliance P43; Health insurance P46; Pension (GPSSA) P44; Emiratisation and
  Nafis P45; Document expiry P40; Document types S02; Labour crews P49; Labour
  documents P49; Trades S07; Visas and government documents P42; Accommodation
  P50; Transfers and re-joins P18.
- **Time and attendance**: Leave T01; Leave encashment and donation T05; Leave
  policies S10; Leave liability and tickets T06; Attendance T10; Pay corrections
  R20 (one home, Pay); Shifts and rosters T20; Roster planning T21; Attendance
  against shifts T22; Attendance devices S18; Phone clock-in T12; Attendance
  feeds S18.
- **Hiring and development**: Recruitment P10 P11 P12 P13; Probation P19; Talent
  management P60 P63 P64.
- **Performance**: Department performance P62; KPI periods and targets S06; KPI
  library S06; Sales commission P66.
- **Staff services**: Travel and tickets P36; Letters P33; Letter templates S03;
  Staff requests P30; Raise a request P31; Staff request approval levels S05;
  Self-service requests P32; Expense claims R23.
- **Pay**: Payroll R01; Pay elements S13; Pay groups S14; Pay calendar S15; WPS
  settings S16; Payroll exemptions S17; Overtime T30 (one home, Time); Overtime
  rates S11; Overtime policy S11; Loans and advances R30; Deductions ledger R22;
  Salary revisions R21; Final settlements R31; Gratuity provision R33; Payroll
  reports X01 to X11.
- **My workspace**: My overview E01; My access reviews S24; My payslips E02; My
  documents E05; My calendar E12; My KPIs E13; My profile E06; My leave E03; My
  time card E09; Clock in E09; Time booking T14; My team's leave E04; My team
  today E10; My team's performance E11; Crew overtime T31; My requests E07;
  Requests waiting for me H04; My expenses E08; Report a safety incident E14;
  Request access E15.
- **My work (inbox)**: Home H01; Approvals H02 H03; To-do list H07;
  Notifications H08; Notice board H09; Leave cover for approvals H10; Approval
  splits and resets H11; Help H12.
- **Administration, HR rows**: Users and roles S20; Segregation of duties S22;
  Access reviews S24; Auditor access S25; Single sign-on S23; Approval rules and
  limits S21; Companies and numbering S40; Custom fields S08; Data import and
  cut-over S37; Data export and backup S39; API keys S30; Webhooks S31; Audit
  trail X31; Electronic signatures P35; Privacy office S26.

## Appendix B. Every Manar One page route in the HR and payroll area

233 page routes from the source tree, grouped by area, with the purpose of the
group and the inventory rows that cover it. `[id]` pages are the detail, edit or
statement page of one record; `new` is a create form.

**/hr/employees** (4): Employee list, record, edit, new. Rows: P02 to P04.

`/`, `/[id]`, `/[id]/edit`, `/new`

**/hr/company-roles** (1): Which group company employs and pays. Rows: P07.

`/[id]`

**/hr/group-staff** (1): Staff across the group companies. Rows: P07.

`/`

**/hr/organisation** (10): Positions, chart, jobs, grades, checklists,
discipline, analytics. Rows: P05 P06 P14 P15 P47 S01 X22.

`/`, `/analytics`, `/chart`, `/checklists`, `/checklists/[id]`,
`/checklists/templates`, `/discipline`, `/discipline/[id]`, `/grades`, `/jobs`

**/hr/transfers** (5): Transfers and re-hires. Rows: P18.

`/`, `/[id]`, `/[id]/edit`, `/new`, `/rehire/new`

**/hr/recruitment** (11): Requisitions, vacancies, candidates, offers. Rows: P10
to P13.

`/`, `/candidates/[id]`, `/candidates/[id]/edit`, `/candidates/new`,
`/offers/[id]`, `/offers/[id]/edit`, `/offers/new`, `/requisitions/[id]`,
`/requisitions/[id]/edit`, `/requisitions/new`, `/vacancies/[id]`

**/hr/probation** (4): Probation list, record, evaluation form. Rows: P19.

`/`, `/[id]`, `/employee/[employeeId]`, `/evaluate/[employeeId]`

**/hr/talent** (7): Appraisal cycles, skills, training. Rows: P60 P63 P64.

`/`, `/appraisals/[id]`, `/cycles/[id]`, `/skills/[id]`, `/skills/new`,
`/training/[id]`, `/training/new`

**/performance** (16): KPIs, reviews, department view, commission. Rows: P61 P62
P66 S06.

`/`, `/commission`, `/commission/statement`, `/commission/statements/[id]`,
`/departments/[id]`, `/drill/[id]`, `/library`, `/library/[id]`, `/library/new`,
`/management`, `/people/[id]`, `/periods`, `/periods/[id]`, `/reviews`,
`/reviews/[id]`, `/team`

**/hr/documents** (3): Document expiry, edit, types. Rows: P40 P41 S02.

`/`, `/[id]/edit`, `/types`

**/hr/pro** (4): Visa and government cases, passports. Rows: P42.

`/`, `/cases/[id]`, `/new`, `/passports/[employeeId]`

**/hr/compliance** (4): UAE compliance, insurance, pension, Emiratisation. Rows:
P43 to P46.

`/`, `/emiratisation`, `/insurance`, `/pension`

**/hr/labour** (4): Labour crews, trades, labour documents. Rows: P49 S07.

`/`, `/crews/[id]`, `/documents`, `/trades`

**/hr/accommodation** (5): Camps and who lives where. Rows: P50.

`/`, `/camps/[id]`, `/camps/[id]/edit`, `/camps/new`, `/employee/[employeeId]`

**/hr/safety** (2): Safety incidents. Rows: P48.

`/`, `/[id]`

**/hr/leave** (7): Leave queue, record, new, policies, exchange, liability.
Rows: T01 T03 T05 T06 S10.

`/`, `/[id]`, `/exchange`, `/liability`, `/new`, `/policies`, `/policies/[type]`

**/hr/attendance** (4): Attendance and pay corrections. Rows: T10 T11 R20.

`/`, `/adjustments`, `/adjustments/[id]`, `/adjustments/new`

**/hr/shifts** (3): Shifts, roster planning, variance. Rows: T20 to T22.

`/`, `/roster`, `/variance`

**/hr/devices** (7): Devices, feeds, punches, unmatched. Rows: T13 S18.

`/`, `/[id]`, `/[id]/edit`, `/feeds`, `/new`, `/punches`, `/unmatched`

**/hr/phone-clock** (1): Phone clock-in sites and log. Rows: T12.

`/`

**/hr/overtime** (6): Overtime claims, pre-approvals, rates, policy. Rows: T30
T31 S11.

`/`, `/[id]`, `/policy`, `/pre-approvals`, `/rates`, `/rates/[id]`

**/hr/requests** (4): Staff requests, new, approval levels. Rows: P30 P31 S05.

`/`, `/[id]`, `/new`, `/settings`

**/letters** (6): Letters, issue, templates. Rows: P33 S03.

`/`, `/[id]`, `/issue`, `/templates`, `/templates/[id]`, `/templates/new`

**/signatures** (2): E-signatures and signing requests. Rows: P35.

`/`, `/requests`

**/hr/travel** (8): Ticket entitlements, travel requests, trips. Rows: P36.

`/`, `/entitlements/[employeeId]`, `/entitlements/new`, `/requests/[id]`,
`/requests/new`, `/trips/[id]`, `/trips/[id]/edit`, `/trips/new`

**/hr/expenses** (1): Expense claims queue. Rows: R23.

`/`

**/hr/payroll** (14): Pay runs, payslips, calendar, deductions, elements,
exemptions, groups, WPS. Rows: R01 R05 R10 R11 R22 S13 to S17.

`/`, `/[id]`, `/[id]/payslips`, `/[id]/payslips/[payslipId]`, `/calendar`,
`/deductions`, `/elements`, `/elements/[id]`, `/elements/employee`,
`/elements/new`, `/exemptions`, `/groups`, `/wps`, `/wps/[employeeId]`

**/hr/loans** (3): Loans and advances. Rows: R30.

`/`, `/[id]`, `/new`

**/hr/salary-revisions** (4): Salary revisions. Rows: R21.

`/`, `/[id]`, `/employee/[employeeId]`, `/new`

**/hr/settlements** (7): Final settlements, statement, provision. Rows: R31 to
R33.

`/`, `/[id]`, `/[id]/edit`, `/[id]/statement`, `/new`, `/provision`,
`/provision/[id]`

**/hr/pay-reports** (14): 13 payroll reports and their index. Rows: X01 to X11.

`/`, `/bank`, `/cost`, `/costing`, `/element-variance`, `/elements`, `/employer-
cost`, `/gratuity`, `/journal`, `/leave`, `/loans`, `/recharges`, `/register`,
`/variance`

**/approvals** (12): Inbox, detail, delegations, matrix, report, splits, resets,
status, signed links. Rows: H02 H03 H10 H11 X32.

`/`, `/[id]`, `/delegations`, `/identity/[id]`, `/link/[token]`, `/matrix`,
`/report`, `/resets`, `/resets/[id]`, `/resets/new`, `/splits`, `/status`

**/tasks** (2): To-do list. Rows: H07.

`/`, `/[id]/edit`

**/notices** (4): Notice board. Rows: H09.

`/`, `/[id]`, `/[id]/edit`, `/new`

**/ess** (28): Employee self-service: profile, payslips, leave, time, requests,
expenses, team. Rows: E01 to E16.

`/`, `/calendar`, `/clock`, `/documents`, `/documents/update`, `/expenses`,
`/leave`, `/my-kpis`, `/my-kpis/figure/[id]`, `/payslips`,
`/payslips/[payslipId]`, `/profile`, `/profile/change`, `/profile/dependant`,
`/profile/hr-inbox`, `/requests`, `/requests/[id]`,
`/requests/[id]/letter/[letterId]`, `/requests/inbox`, `/requests/new`,
`/safety`, `/team`, `/team-overview`, `/team-overview/appraisals/[id]`, `/team-
overview/probation/[employeeId]`, `/time-booking`, `/time-card`, `/time-
card/correct`

**/dashboard** (11): Role dashboards (HR, executive, IT and others). Rows: P01
X23 X24 X26.

`/`, `/accounts`, `/executive`, `/hr`, `/it`, `/overview`, `/pack`,
`/production`, `/purchase`, `/sales`, `/yard`

**/analysis** (3): Analysis builder and saved reports. Rows: X30.

`/`, `/builder`, `/reports/[id]`

**/documents** (1): Emailed PDF batches. Rows: S39.

`/batches`
