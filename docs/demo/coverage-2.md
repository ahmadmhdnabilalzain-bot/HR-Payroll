# Coverage 2: the Mubinflow demo against the navigation map

Date 2026-11-26. Build: branch integ, HEAD 0448198 (WP18 merge), built fresh
with vite into a scratch folder and served on its own port. Map:
docs/design/2026-11-26-navigation-map.md, section 8, 208 rows. The first count
(106 of 208 live) was made on HEAD 86af32a; 62 commits and the WP14, WP16, WP17,
WP18 and WP19 merges came after it.

## 1. Method

Owner rulings applied: UAE only, so R45 (Saudi payroll) leaves the count and R44
is narrowed to DIFC DEWS (its GCC part is dropped); the target is 80 percent of
the HR and payroll rows.

A row is **live** when both hold:

1. A registry area (apps/web/src/nav/areas/*.ts, 160 areas, all
   status "live") or a screen inside a host (Home, the pay run steps, the
   top bar) covers the row's feature, and
2. its route, opened as a role the area lists, shows a real screen: not
   "outside your view", not Home, not the section front page, no page
   error, and a heading that names the feature.

How it was checked. The registry was read by importing ALL_AREAS in a vitest run
(no hand copy). A Playwright walk then opened every area route for every role
the area lists (IT also for Setup areas HR lists, as roleAllows does), and
recorded heading, text length, rows, tables, buttons and inputs. Two areas
repeat another area's screen on purpose (people.expiring is reports.documents;
requests.waiting is time.requests; me.help is setup.help); each row is still
mapped to the area that names it. Host rows were opened by hand in the same
build: Home as HR, GM, IT, manager and employee, home/tasks, home/notices, the
bell, the Cmd K palette, pay-run/fix, review, approve and gate, and the employee
payslip (people/emp-017/payslip).

A row is **partial** when a screen exists but the feature named in the row is
only half there (the reason is given). Partial is not counted as live. A row is
**missing** when nothing covers it; rows that make no sense for a bank are kept
in the count as missing and marked skipped, so the headline figure is not
flattered.

Rule for rows that name more than one thing: a row that says "A or B"
is live when either works; a row that says "A and B" or lists items
needs all of them. So T16 (face or QR) is live with the QR kiosk, while
R13 (off-cycle and bonus), T07 (holidays, comp-off, grants) and H12
(help and training videos) are partial. Sample codes and sample dates
count as demo data, not as gaps.

Keyword row ids in the registry were treated as the builder's claim, not as
proof: E14 is tagged on an HR report, so E14 is partial; T16 is live because a
QR kiosk screen opens, though face check-in is not built.

Two registry faults found (not counted against coverage, since HR opens both):

- setup.parallel (setup/migration/parallel) and setup.cover
  (people/more/cover) are Setup areas, so the palette offers them to the
  IT manager, but the route answers "outside your view" for IT.

### Row by row

Status: live, partial, missing, out (other country). "host:" marks a
row that lives inside a host screen.


**Home**

| ID | Src | Feature | Area id or host screen | Status |
|---|---|---|---|---|
| H01 | K | Decisions to make (Home) | host:home (HR, GM) | live |
| H02 | B | Approvals inbox, every kind | host:home Approvals card | live |
| H03 | M | Approval detail and decide | host:home approve/decline | live |
| H04 | M | Requests waiting for me | requests.waiting | live |
| H05 | B | Documents expiring (card) | people.expiring | live |
| H06 | B | Search and act (Cmd K) | host:Cmd K palette | live |
| H07 | B | To-do list (tasks) | host:home/tasks | live |
| H08 | M | Notifications | host:bell panel | live |
| H09 | B | Notice board, announcements | host:home/notices | live |
| H10 | M | Leave cover for approvals | setup.cover, requests.cover | live |
| H11 | M | Approval splits and resets | setup.splits | live |
| H12 | M | Help and training videos | setup.help, me.help | partial |
| H13 | K | Team chat and intranet | - | missing |
| H14 | K | Meetings with transcript | - | missing |
| H15 | K | AI assistant, cited policy Q&A | - | missing |
| H16 | K | Agent actions you confirm | - | missing |

**People**

| ID | Src | Feature | Area id or host screen | Status |
|---|---|---|---|---|
| P01 | M | People overview (dashboard) | people.overview | live |
| P02 | B | Everyone (employee list) | people.everyone | live |
| P03 | B | Employee record with tabs | people.everyone | live |
| P04 | B | New employee, edit details | people.new-employee | live |
| P05 | B | Organisation chart | people.org | live |
| P06 | B | Positions and headcount | people.positions | live |
| P07 | M | Staff across the group | people.sites | live |
| P08 | K | Multi-entity, cost centres | people.centres | live |
| P10 | B | Hiring: requisitions | people.requisitions | live |
| P11 | B | Hiring: candidates board | people.board | live |
| P12 | B | Offers and offer letters | people.offers | live |
| P13 | M | Vacancies | people.vacancies | live |
| P20 | K | Cost-of-hire preview | - | missing |
| P21 | K | AI resume screening | - | missing |
| P22 | K | Referral and agency ledger | - | missing |
| P14 | B | Joiner checklists | people.joiners | live |
| P15 | B | Leaver checklists, exit | people.leavers | live |
| P16 | B | End employment, resignation | people.end | live |
| P17 | K | Exit interviews | people.exit | live |
| P18 | M | Transfers and re-joins | people.transfers | live |
| P19 | M | Probation ending, evaluate | people.probation | live |
| P30 | B | Staff requests (HR queue) | people.staff-requests | live |
| P31 | M | Raise a request for someone | people.staff-requests | live |
| P32 | M | Profile change requests | people.profile-changes | live |
| P33 | B | Letters: salary cert, NOC | people.letters | live |
| P34 | K | Verifiable letters (code) | - | missing |
| P36 | B | Travel and air tickets | people.travel | live |
| P37 | K | HR help desk tickets | people.helpdesk | live |
| P53 | K | Policy versions, acknowledge | people.policies | live |
| P40 | B | Document expiry (all staff) | people.expiring | live |
| P41 | B | Document upload, versions | people.documents | live |
| P42 | B | Visas and government cases | people.visas | live |
| P51 | K | Compliance calendar, due dates | people.calendar | live |
| P52 | K | ILOE insurance tracking | people.iloe | live |
| P35 | M | Electronic signatures | people.signatures | live |
| P54 | K | Document intake, provenance | - | missing |
| P55 | K | Sector packs, licence gates | - | missing |
| P43 | B | UAE compliance overview | people.compliance | live |
| P44 | B | Pension (GPSSA) register | people.pension | partial |
| P45 | B | Emiratisation and Nafis | people.emiratisation | live |
| P46 | M | Health insurance | people.insurance | live |
| P47 | B | Disciplinary records | people.warnings | live |
| P48 | M | Health and safety incidents | people.incidents | live |
| P49 | M | Labour crews and documents | - | missing |
| P50 | B | Accommodation (camps) | - | missing |
| P60 | B | Appraisals and cycles | people.appraisals | live |
| P61 | B | Goals and KPIs | people.goals | live |
| P62 | M | Department performance | people.performance | live |
| P63 | M | Skills | people.skills | live |
| P64 | B | Training and learning | people.training | live |
| P65 | K | Engagement surveys | people.surveys | live |
| P67 | K | Compensation planning | - | missing |
| P68 | K | Workforce planning | - | missing |

**Time**

| ID | Src | Feature | Area id or host screen | Status |
|---|---|---|---|---|
| T01 | B | Leave requests (HR queue) | time.requests | live |
| T02 | B | Leave calendar | time.requests | live |
| T03 | M | Record leave for someone | time.leave-for | live |
| T04 | B | Leave balances | time.balances | live |
| T05 | B | Leave encashment, donation | time.encash | live |
| T06 | B | Leave liability and tickets | time.liability | live |
| T07 | K | Holidays, comp-off, grants | setup.public-holidays | partial |
| T10 | B | Attendance today | time.today | live |
| T11 | B | Attendance corrections | time.corrections | live |
| T12 | B | Phone clock-in (geofence) | time.phone | live |
| T13 | B | Device punches, unmatched | time.punches | live |
| T14 | B | Timesheets, time booking | time.register | live |
| T15 | K | Work-from-home tracking | time.wfh | live |
| T16 | K | Face or QR check-in, kiosk | time.kiosk | live |
| T20 | B | Shifts and rosters | time.roster | live |
| T21 | B | Roster planning | time.plan | live |
| T22 | M | Attendance against shifts | time.against | live |
| T23 | K | Leave-safe roster, OT cost | time.cover | live |
| T30 | B | Overtime to approve | time.overtime | live |
| T31 | M | Crew overtime pre-approval | time.crew | live |

**Pay**

| ID | Src | Feature | Area id or host screen | Status |
|---|---|---|---|---|
| R01 | B | Pay run: review, fix, approve | pay.run | live |
| R02 | K | Fix a held IBAN inline | host:pay-run/fix Enter IBAN | live |
| R03 | B | Maker and checker approval | pay.approve | live |
| R04 | K | Explain any figure (trace) | pay.run | live |
| R05 | B | Payslip | pay.myslip | live |
| R06 | K | Fix step: what stops pay | host:pay-run/fix | live |
| R07 | B | WPS salary file (SIF) | pay.file | live |
| R08 | B | Pension in the run (GPSSA) | host:pay-run/review | partial |
| R09 | K | What-if replay (owner view) | pay.what-if | live |
| R10 | M | Payslips of a run (list) | host:review, Show all | live |
| R11 | M | Past pay runs | pay.runs | live |
| R12 | K | Bank advice file | pay.advice | live |
| R13 | K | Off-cycle and bonus runs | pay.offcycle | partial |
| R15 | K | Pre-pay gate with causes | pay.gate | live |
| R20 | M | Pay corrections | pay.corrections | live |
| R21 | B | Salary revisions, arrears | pay.revisions | live |
| R22 | M | Deductions ledger | pay.deductions | live |
| R23 | B | Expense claims | pay.expenses | live |
| R24 | M | Traffic fines to decide | pay.fines | live |
| R25 | K | Prior-employment pay data | pay.prior | live |
| R14 | K | Salary hold | pay.hold | live |
| P66 | B | Sales commission statements | - | missing |
| R30 | B | Loans and advances | pay.loans | live |
| R31 | B | Final settlements | pay.settlements | live |
| R32 | M | Settlement statement | pay.settlements | live |
| R33 | B | Gratuity provision | pay.gratuity-provision | live |
| R34 | K | One exit flow, legal flags | pay.exit | live |
| R40 | K | Multi-currency payroll | - | missing |
| R41 | K | Pay-structure sandbox | - | missing |
| R42 | K | Pay from evidence (KPI pay) | - | missing |
| R43 | K | AI anomaly checks | - | missing |
| R44 | K | DIFC DEWS, other GCC pensions | - | missing |
| R45 | K | Saudi payroll (Mudad, GOSI) | - | out |
| R46 | K | Earned wage access, cards | - | missing |
| R47 | K | Direct WPS submission | - | missing |

**Reports**

| ID | Src | Feature | Area id or host screen | Status |
|---|---|---|---|---|
| X01 | B | Payroll summary (register) | reports.summary | live |
| X02 | B | Cost by department | reports.departments | live |
| X03 | B | Salary file register (bank) | reports.files | live |
| X04 | M | Employer cost and costing | reports.employer-cost | partial |
| X05 | B | Variance against last month | reports.variance | live |
| X07 | B | Gratuity liability report | reports.gratuity-liability | live |
| X10 | M | Leave report | reports.leave | live |
| X11 | M | Loans report | reports.loans | live |
| X20 | B | Headcount by nationality | reports.nationality | live |
| X21 | B | Documents expiring report | reports.documents | live |
| X22 | B | HR analytics (turnover...) | reports.headcount | live |
| X23 | M | Executive dashboard | reports.dashboard-exec | live |
| X24 | M | IT dashboard (access, jobs) | reports.it-dashboard | live |
| X25 | K | Owner brief (weekly pack) | reports.owner-brief | live |
| X26 | M | Board pack | reports.board-pack | live |
| X06 | M | Elements and element variance | reports.elements | live |
| X08 | B | Payroll journal | reports.journal | live |
| X09 | M | Recharges between companies | - | missing |
| X12 | K | Report templates library | - | missing |
| X13 | K | Cost and budget view | - | missing |
| X30 | B | Analysis builder | reports.analysis | live |
| X31 | B | Audit trail (hash-chained) | reports.audit | live |
| X32 | M | Approval report, status, matrix | reports.sign-offs | live |
| X33 | K | Inspection pack, auditor room | - | missing |
| X34 | K | Ask for a report in words | - | missing |
| X35 | K | Payroll forecast, plan vs actual | - | missing |
| X36 | K | Public accuracy scoreboard | - | missing |
| X37 | K | Error-remedy record | - | missing |

**Setup**

| ID | Src | Feature | Area id or host screen | Status |
|---|---|---|---|---|
| S01 | M | Jobs and grades | setup.jobs | live |
| S02 | M | Document types | setup.documents | live |
| S03 | B | Letter templates | setup.letters | live |
| S04 | B | Checklist templates | setup.checklists | live |
| S05 | M | Request approval levels | setup.sign-off | live |
| S06 | B | KPI library and periods | setup.kpis | live |
| S07 | M | Trades | - | missing |
| S08 | B | Custom fields | setup.custom-fields | live |
| S10 | B | Leave policies | setup.leave | live |
| S11 | B | Overtime policy and rates | setup.hours | live |
| S12 | K | Holidays and Ramadan hours | setup.holidays | live |
| S18 | B | Attendance devices and feeds | setup.devices | live |
| S19 | K | Rule packs, law updates | setup.rule-packs | live |
| S13 | B | Pay elements | setup.payelements | live |
| S14 | B | Pay groups | setup.paygroups | live |
| S15 | M | Pay calendar | setup.calendar | live |
| S16 | B | WPS settings | setup.wps | live |
| S17 | M | Payroll exemptions | setup.exemptions | live |
| S09 | K | Rule-change preview, notice | - | missing |
| S20 | B | Users, roles, permissions | setup.users | live |
| | | | setup.roles | |
| | | | setup.who | |
| S21 | B | Approval rules and limits | setup.rules | live |
| S22 | B | Segregation of duties | setup.separation | live |
| S23 | B | Single sign-on and MFA | setup.signin | live |
| S24 | M | Access reviews | setup.review | live |
| S25 | B | Auditor access | - | missing |
| S26 | B | Privacy office, retention | - | missing |
| S30 | B | API keys | setup.keys | live |
| S31 | B | Webhooks | setup.hooks | live |
| S32 | K | WhatsApp approvals | setup.whatsapp | live |
| S33 | K | Email-in to records | setup.email-in | live |
| S34 | K | Calendar feeds | setup.calendar-feeds | live |
| S35 | K | Accounting sync (Xero...) | - | missing |
| S36 | K | Slack and Teams | - | missing |
| S43 | K | ERP integration (SAP...) | - | missing |
| S37 | B | Data import, Keka cut-over | setup.import | live |
| S38 | K | Parallel run compare | setup.parallel | live |
| S39 | M | Data export, backup, health | setup.location | live |
| S40 | M | Companies, numbering | setup.company | live |
| S41 | K | Arabic screens (switch) | host:top bar language | partial |
| | | | ?ar=1 only | |
| S42 | K | Bureau console (accountants) | - | missing |

**Me**

| ID | Src | Feature | Area id or host screen | Status |
|---|---|---|---|---|
| E01 | M | My overview | host:home (employee) | live |
| E02 | B | My payslips (past months) | me.payslips | live |
| E03 | B | My leave and request | me.leave | live |
| E04 | M | My team's leave (manager) | time.requests | live |
| E05 | B | My documents, update | me.documents | live |
| E06 | M | My profile, change, dependants | me.change-details | live |
| | | | me.profile | |
| E07 | B | My requests and letters | requests.asks | live |
| E08 | B | My expenses | me.expenses | live |
| E09 | B | My time card, correct, clock | time.my-card | live |
| E10 | M | My team today | host:home (manager) Team today | live |
| E11 | M | Team probation and appraisal | me.team-reviews | live |
| E12 | M | My calendar | me.calendar | live |
| E13 | B | My KPIs | me.kpis | live |
| E14 | M | Report a safety incident | people.incidents (HR) | partial |
| E15 | M | Request access | requests.access, setup.access-requests | live |
| E16 | K | Ask about a payslip line | - | missing |

## 2. Totals

| Measure | Rows | Share |
|---|---|---|
| Map rows | 208 | |
| Out of scope (other country: R45) | 1 | |
| UAE-scope rows (the base) | 207 | 100% |
| Live | 160 | 77.3% |
| Partial | 8 | 3.9% |
| Missing | 39 | 18.8% |
| of which skipped as meaningless for a bank | 8 | |
| Target, 80% of 207 | 166 | 80.2% |
| Short of target | 6 | |
| Manar-origin rows (M and B) | 145 | |
| Manar-origin live | 133 | 91.7% |
| Market-only rows (K) in scope | 62 | |
| Market-only live | 27 | 43.5% |
| Live without the 8 skipped rows | 160 of 199 | 80.4% |

Headline: 160 of 207 UAE-scope rows are live, 77.3 percent, up from 106 of 208
(51.0 percent). The 80 percent line is 166, so 6 rows are still short. Finishing
the 8 partial rows alone clears it (168, 81.2 percent). Manar One's own rows are
at 91.7 percent; the gap is almost all market-list rows that nobody has built.

## 3. Rows still missing or partial, by value to the bank

Ranked for the bank's HR manager, General manager and IT manager: first what a
UAE bank must have (law, audit, money), then what saves them time, then nice-to-
have, then rows that do not fit a bank.

| # | ID | Feature | For | Reason |
|---|---|---|---|---|
| 1 | R08 | Pension in the run (GPSSA) | HR, GM | |
| | | | | partial: pension shown as not computed; fund rate unconfirmed |
| 2 | P44 | Pension (GPSSA) register | HR | |
| | | | | partial: register of 14 nationals, every line not computed |
| 3 | X04 | Employer cost and costing | GM | |
| | | | | partial: employer cost leaves pension out, says partial |
| 4 | R13 | Off-cycle and bonus runs | HR, GM | |
| | | | | partial: off-cycle list only; no bonus run in the data |
| 5 | S25 | Auditor access | IT, GM | |
| | | | | not built: auditor access (internal audit, CBUAE) |
| 6 | X33 | Inspection pack, auditor room | GM, IT | |
| | | | | not built: inspection pack, auditor room |
| 7 | S26 | Privacy office, retention | IT | |
| | | | | not built: privacy office, retention (UAE PDPL) |
| 8 | S41 | Arabic screens (switch) | HR, GM | |
| | | | | partial: Arabic hidden unless ?ar=1, not native-reviewed |
| 9 | P67 | Compensation planning | HR, GM | |
| | | | | not built: compensation planning (annual increments) |
| 10 | X35 | Payroll forecast, plan vs actual | GM | |
| | | | | not built: payroll forecast, plan against actual |
| 11 | X13 | Cost and budget view | GM | not built: cost and budget view |
| 12 | S43 | ERP integration (SAP...) | IT | |
| | | | | not built: ERP integration (SAP, Oracle) |
| 13 | S09 | Rule-change preview, notice | HR, IT | |
| | | | | not built: rule-change preview and notice |
| 14 | P34 | Verifiable letters (code) | HR | |
| | | | | not built: verifiable letters (salary certificate code) |
| 15 | X37 | Error-remedy record | GM, IT | not built: error-remedy record |
| 16 | R43 | AI anomaly checks | HR, GM | not built: anomaly checks on the run |
| 17 | S36 | Slack and Teams | IT | |
| | | | | not built: Teams and Slack (banks use Teams) |
| 18 | T07 | Holidays, comp-off, grants | HR | |
| | | | | partial: public holidays only; no comp-off or grants |
| 19 | E16 | Ask about a payslip line | HR | |
| | | | | not built: employee asks about a payslip line |
| 20 | H15 | AI assistant, cited policy Q&A | HR | |
| | | | | not built: cited policy questions and answers |
| 21 | P66 | Sales commission statements | HR, GM | |
| | | | | no data: sales commission statements (RMs) |
| 22 | R47 | Direct WPS submission | HR | not built: direct WPS submission |
| 23 | P68 | Workforce planning | GM | not built: workforce planning |
| 24 | S35 | Accounting sync (Xero...) | IT | |
| | | | | not built: accounting sync (GL posting) |
| 25 | P54 | Document intake, provenance | HR, IT | |
| | | | | not built: document intake with provenance |
| 26 | E14 | Report a safety incident | HR | |
| | | | | partial: HR log and report; employee cannot report |
| 27 | R41 | Pay-structure sandbox | HR | not built: pay-structure sandbox |
| 28 | P20 | Cost-of-hire preview | HR, GM | not built: cost-of-hire preview |
| 29 | H12 | Help and training videos | HR | |
| | | | | partial: how-to cards only, no training videos |
| 30 | X12 | Report templates library | HR | |
| | | | | not built: report templates library |
| 31 | H16 | Agent actions you confirm | HR | |
| | | | | not built: agent actions you confirm |
| 32 | X34 | Ask for a report in words | GM | |
| | | | | not built: ask for a report in words |
| 33 | R44 | DIFC DEWS, other GCC pensions | HR | |
| | | | | not built: DIFC DEWS (bank is in Abu Dhabi mainland) |
| 34 | X09 | Recharges between companies | GM | |
| | | | | no data: recharges (one company in the data) |
| 35 | P22 | Referral and agency ledger | HR | |
| | | | | not built: referral and agency ledger |
| 36 | P21 | AI resume screening | HR | not built: AI resume screening |
| 37 | R42 | Pay from evidence (KPI pay) | HR | |
| | | | | not built: pay from evidence (KPI pay) |
| 38 | R46 | Earned wage access, cards | HR | |
| | | | | not built: earned wage access (a bank lends itself) |
| 39 | R40 | Multi-currency payroll | HR | |
| | | | | not built: multi-currency (bank pays AED) |
| 40 | H13 | Team chat and intranet | - | |
| | | | | skipped: the bank has its own intranet and chat |
| 41 | H14 | Meetings with transcript | - | |
| | | | | skipped: meeting tools sit outside HR |
| 42 | P49 | Labour crews and documents | - | |
| | | | | skipped: labour crews, not a bank workforce |
| 43 | P50 | Accommodation (camps) | - | |
| | | | | skipped: labour camps, not a bank workforce |
| 44 | P55 | Sector packs, licence gates | - | |
| | | | | skipped: sector licence gates (construction) |
| 45 | S07 | Trades | - | skipped: trades, not a bank workforce |
| 46 | S42 | Bureau console (accountants) | - | |
| | | | | skipped: bureau console for accountants |
| 47 | X36 | Public accuracy scoreboard | - | |
| | | | | skipped: vendor marketing scoreboard |

Out of scope: R45, Saudi payroll (Mudad, GOSI): other country.

## 4. Work packages worth building (12)

Packages WP20 to WP31 together cover 26 rows. The 8 partial rows are in
WP20, WP21, WP24 and WP31, and finishing them alone clears 80 percent. A
package changes only the files it owns: one area file, one screen folder,
and one demo-data module with its adapter.

The integrator edits the files every package needs. Packages must not
edit them, but they hand the integrator the lines to add:

- apps/web/src/nav/areas/index.ts (the area list)
- the section routers: people/People.tsx, pay/PayArea.tsx,
  reports/Reports.tsx, reports/catalogue.ts, setup/Setup.tsx, me/Me.tsx,
  me/MeMore.tsx, time/TimeRouter.tsx
- demo/state.tsx, demo/data/adapter.ts, demo/data/types.ts
- packages/demo-data/src/index.ts, tests/unit/boundaries.test.ts

These are the files every one of the WP14 to WP19 merges touched (see
git show --stat on each merge commit). Read only: the packages read the
payroll journal, letters, policy versions and appraisals data but do not
edit them. Checked pairwise: no file is owned by two packages.

**WP20 Pension in the run.** Rows R08, P44, X04.
Owns: nav/areas/pension.ts, apps/web/src/pay/pension/,
packages/demo-data/src/wpe-pension.ts, and for this wave the existing
packages/engine/src/payroll/ (params.ts, payslip.ts),
payrun/ReviewStep.tsx, people/Payslip.tsx, people/papers/Pension.tsx
and reports/cost/Employer.tsx. No other package edits these.
Data: the 14 UAE nationals and their contribution salary, the fund
(GPSSA federal or Abu Dhabi fund) per person, and rates entered as
"to confirm with the fund" values with their source.
Spec: compute employee and employer pension for every UAE national in
the October run, from rates kept in the rule pack with a source line.
Each line is marked "rate to confirm" until the fund is confirmed. The
review step, the payslip, the pension register and the employer cost
report all read the same figures. The register gains a contribution
column, a monthly total per fund and a CSV export for the fund upload.
A figure is never shown as final while the rate is unconfirmed.
This is the bank's largest legal gap: 14 of 31 staff are nationals.

**WP21 Bonus run.** Row R13.
Owns: nav/areas/bonus.ts, apps/web/src/pay/bonus/,
packages/demo-data/src/wpe-bonus.ts, and the existing pay/Ledger.tsx
(the off-cycle list).
Data: an annual bonus pool of sample amounts per department, a rating
per person from the appraisals data, and a pay date.
Spec: an off-cycle run with the same four steps as the monthly run
(review, fix, approve, pay). HR loads amounts from a rating-to-percent
table, sees a total against the pool, and gets maker and checker
approval by the General manager. The run makes its own WPS salary file
and payslips. The off-cycle list then shows the run.

**WP22 Auditor access and inspection pack.** Rows S25, X33, X37.
Owns: nav/areas/audit-room.ts, apps/web/src/setup/auditor/,
apps/web/src/reports/inspection/, packages/demo-data/src/wpe-audit.ts,
and the existing setup/access/Users.tsx and setup/access/Review.tsx.
Data: one sample external-auditor user, a review window, and a list of
past errors with their fix (from pay corrections and the audit trail).
Spec: the IT manager grants a read-only auditor role that expires on a
set date, and the access review lists it. The inspection pack is one
page per month: the payroll register, sign-offs, the salary file
register, exceptions with their reasons, and the audit chain check,
printable as one PDF. The error-remedy record lists each payroll error
with who found it, the correction, and the pay run that paid it.

**WP23 Privacy and retention.** Row S26.
Owns: nav/areas/privacy.ts, apps/web/src/setup/privacy/,
packages/demo-data/src/wpe-privacy.ts.
Data: data categories (identity, pay, health, documents), a retention
period per category marked "sample, to confirm", and a few sample
subject requests.
Spec: a register of personal data kept, why, for how long and who can
see it, with a queue of access and erasure requests that have due
dates. A retention run shows which leaver records would be removed and
asks for sign-off; nothing is deleted in the demo. The page does not say
the bank complies with the UAE data protection law; it only shows what
is tracked.

**WP24 Arabic screens.** Row S41.
Owns: apps/web/src/i18n/ar/ and demo/flags.ts. Other packages add no
keys to i18n/ar while this runs. The "NEEDS NATIVE REVIEW" labels also
sit in 15 nav/areas/*.ts files that other packages own, so WP24 hands
those fixes to the integrator as a list, applied after the wave.
Data: none new. The work is a native review of the Arabic labels.
Spec: a native speaker reviews every Arabic label, starting with the
"NEEDS NATIVE REVIEW" files. Then arReviewed is set, so the language
switch shows without ?ar=1. Check right-to-left layout on Home, the pay
run, the payslip and one list. Numbers and AED amounts stay in Western
digits unless the owner rules otherwise.

**WP25 Plans and budgets.** Rows P67, P68, X13, X35.
Owns: nav/areas/planning.ts, apps/web/src/reports/planning/,
packages/demo-data/src/wpe-planning.ts, and the existing
pay/Revisions.tsx.
Data: a 2027 headcount and payroll budget per department (sample),
merit increase guidelines by rating, and open seats from positions.
Spec: compensation planning lets a manager propose increases inside a
guideline and budget, and the General manager approves them as a
batch; approved rows become salary revisions. Workforce planning shows
seats, vacancies and leavers against the budget. Cost and budget shows
actual payroll against budget by department each month. The forecast
projects the next 12 months from the current run, known joiners,
leavers and approved increases, and shows plan against actual.

**WP26 ERP, GL and Teams connections.** Rows S43, S35, S36.
Owns: nav/areas/erp.ts, apps/web/src/setup/erp/,
packages/demo-data/src/wpe-erp.ts.
Data: a sample chart of accounts and a mapping from pay elements to GL
accounts. The payroll journal already exists.
Spec: a mapping screen from pay elements and departments to GL accounts
and cost centres. A posting preview turns the payroll journal into the
ERP's file layout (CSV, as SAP or Oracle would take it) with its
totals, and a download. A Teams card setting sends approvals into
Teams, shown as a preview. Nothing connects to a real system, and the
screen says so.

**WP27 Verifiable letters and document intake.** Rows P34, P54.
Owns: nav/areas/verify.ts, apps/web/src/people/verify/,
packages/demo-data/src/wpe-verify.ts.
Data: the issued letters from the letters data, and a sample of
emailed documents with sender and time.
Spec: every salary certificate and NOC gets a short code and a check
page where another bank enters the code and sees name, issue date and
status (valid or withdrawn), without salary unless the employee agreed.
Document intake lists each document that came in, its source (email,
upload, HR), who received it and which record it was filed to.

**WP28 Rule-change preview.** Row S09.
Owns: nav/areas/rule-change.ts, apps/web/src/setup/rule-change/,
packages/demo-data/src/wpe-rule-change.ts.
Data: one sample pending change in the rule pack (for example a change
to the overtime rate) with its source and effective date.
Spec: before a rule pack update applies, show who it changes and by
how much in the next run, worked out by the engine. Show the notice to
send to the affected staff, and an approve or hold decision for HR and
the General manager. This links to Rules and sources.

**WP29 Ask and explain.** Rows H15, E16, R43.
Owns: nav/areas/ask.ts, apps/web/src/home/ask/,
packages/demo-data/src/wpe-ask.ts, and the existing pay/gate/checks.ts
and pay/gate/Checks.tsx. It does not edit people/Payslip.tsx (WP20 owns
that): the question starts on its own page, where the employee picks a
line of the payslip trace, and the integrator adds an "Ask" link on the
payslip after the wave.
Data: the policy versions already in the data, the payslip trace, and
anomaly rules (sample thresholds).
Spec: an employee picks a payslip line and asks a question. HR gets
it with the trace attached and answers in a thread. Policy questions get
answers quoted from the policy version, each with the section cited, or
"ask HR" when nothing matches. The answers come from fixed rules, not a
model. Anomaly checks add run-level flags to the pre-pay checks page:
pay jumps, duplicate IBANs, and a person paid after their last day.

**WP30 Commission statements.** Row P66.
Owns: nav/areas/commission.ts, apps/web/src/pay/commission/,
packages/demo-data/src/wpe-commission.ts. The commission reaches the
payslip as a pay element in the data, so no payslip file changes.
Data: a sample commission plan for relationship managers (target,
rate, cap) and their October sales figures.
Spec: one statement per relationship manager: target, achieved,
commission worked out with a trace, and the amount that joins the next
pay run. HR checks the figures and the General manager signs off. The
payslip shows it as its own element line.

**WP31 Time and safety finish.** Rows T07, E14, H12.
Owns: nav/areas/time-finish.ts, apps/web/src/time/finish/,
packages/demo-data/src/wpe-time-finish.ts, and the existing
me/MyHelp.tsx and people/safety/Incidents.tsx.
Data: comp-off days earned for work on a holiday, and leave grants
(for example extra days given by the GM); short help videos or clip
links (sample).
Spec: comp-off days earned by working a public holiday, with a balance
and an expiry, plus one-off leave grants signed off by the General
manager. On My pages, an employee reports a safety incident in three
fields, and it lands in the HR incidents log. The help page adds one
short video per card, or a "video to record" marker where none exists.

Not packaged, because they are low value for this bank: R40, R41, R42,
R44, R46, R47, P20, P21, P22, X09, X12, X34, H16, plus the 8 skipped
rows.

## 5. Depth gaps: live but thin

These rows count as live, but the screen is thin. The walk opened each
area as HR and counted text, list rows, buttons and links into a record.
Then the first record of each candidate was opened. Settlements, people
leaving, visas, expenses, webhooks, surveys and crew overtime have full
record pages, so they are not on this list. A screen is thin here when
it has no record to open and either very little data or no action a
bank manager expects. The order is by value to the bank.

| # | ID | Area | Seen | Deserves |
|---|---|---|---|---|
| 1 | X03 | reports.files | 1 file, 5 runs | |
| | | | every month's file, totals, rejects | |
| 2 | P42 | people.visas | 2 cases, 16 expats | |
| | | | a case for each expat, cost, due dates | |
| 3 | P19 | people.probation | 1 case, no record | |
| | | | record with form, history, extend | |
| 4 | P16 | people.end | 1 row, 167 chars | |
| | | | notice, last day, settlement link | |
| 5 | S21 | setup.rules | read only | |
| | | | limits by amount and kind, editable | |
| 6 | S05 | setup.sign-off | read only | |
| | | | levels per request kind, editable | |
| 7 | S22 | setup.separation | read only | |
| | | | conflicts found in roles, with a fix | |
| 8 | S23 | setup.signin | read only, 389 chars | |
| | | | SSO and MFA policy per role | |
| 9 | P01 | people.overview | 5 tiles, 411 chars | |
| | | | trends, headcount by grade, risks | |
| 10 | X22 | reports.headcount | one table | |
| | | | turnover by department, tenure | |
| 11 | P07 | people.sites | counts only | |
| | | | site cards with staff and managers | |
| 12 | P08 | people.centres | no action, no record | |
| | | | cost centre with people and cost | |
| 13 | P13 | people.vacancies | 2 rows, link to board | |
| | | | posting text, channels, candidates | |
| 14 | T21 | time.plan | 2 weeks, no record | |
| | | | week view with checks to fix | |
| 15 | S14 | setup.paygroups | 4 rows, read only | |
| | | | group record: people, payday, file | |

Not on the list: T03 and E08 open empty until used, which is fine for a
demo.
