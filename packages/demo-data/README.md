# @payroll/demo-data

Demo data for one FICTIONAL bank, "Zarqan Demo Bank" (Abu Dhabi, 31
staff: head office, Khalidiya and Al Ain branches, all invented).
Pure TypeScript, safe in a browser bundle: no clock, network, Node
APIs or unseeded randomness (a test enforces it).

```ts
import { buildDemoCompany, headlineTotals, issuesOf, costByDepartment,
  payslipByEmployee, explainPayslipLine, leaveRequests, approvalsInbox,
  sifSummary, needsConfirmation } from "@payroll/demo-data";

const demo = buildDemoCompany(); // seed 2026; same seed, same bytes
```

## What is in it

- 31 employees in 9 departments, 14 UAE nationals, grades 1 to 10
  with salary bands in fils.
- October 2026 pay run, prepared by the HR manager and waiting for the
  General Manager (maker-checker). Expats' payslips come from the
  engine's `calculatePayslip`; UAE nationals' from the same engine
  steps without the pension step (see below). Every payslip has its
  trace; totals are sums of the payslips.
- The WPS SIF from `packages/wps` and its validation report. One
  payslip (no IBAN) is held out of the file, with its reason.
- Problems, each with its source, a short title, a plain sentence
  (no codes, raw dates or citations; dates come as `{ iso, display }`),
  a suggested fix and a `fixKind` (`issuesOf`). Each item has a
  `kind`: `issue` (counted in `headline().issuesOpen`),
  `needs-confirmation` (pension) or `note` (the invented bank's
  routing code). `applyIbanFix(demo, employeeId, iban)` returns a new
  demo where the held pay joins the SIF, regenerated and checked again
  through packages/wps; a faulty IBAN is refused in plain words. SIF
  findings carry the file line (each employee has a salary line and an
  allowance line, so line 51 is the 26th employee; `sifSummary`
  explains this). From the engine: overtime
  over the 2-hour daily limit, a loan instalment cut by the Article 25
  cap, a sick day unpaid in probation, the partial final settlement.
  From the SIF validator: an IBAN that fails mod 97, the fictional
  bank's routing code not in the bundled table. From the demo's own
  checks: held pay (no IBAN), two documents near expiry, the pension
  item.
- Leave (6 requests: pending, sick, unpaid, rejected) with engine
  balances; October attendance with overtime, night work and unpaid
  absence; two expense claims; a leaver with gratuity
  (`calculateSettlement`, outside the run and the SIF); a new hire on
  probation; back pay (owed minus paid from two engine runs).

## Reports and audit data (`src/wp7.ts`)

For the Reports section and the audit trail. Everything is derived
from the data above; nothing contradicts it.

- **Audit trail**: `auditEvents(c)` (oldest first, 12 Jan to 27 Oct
  2026), `auditRows(c, { area?, actorId? })` for the screen (`when`
  is "27 Oct 2026, 09:42", `who` is name and job, short hashes),
  `verifyAuditChain(events)`, `AUDIT_CHAIN_NOTE`. Each entry's SHA-256
  covers the one before, so an edited or removed entry is caught at its
  position. Said on purpose: demo only, worked out at load, not a
  certified or legal proof. Actors are existing employee ids (or the
  system). Leave, expense and approval entries follow the existing
  requests; the October run entries carry the run's own figures; the
  late raise, the hire, the resignation and the settlement draft use
  the roster's own dates and amounts. `ACCESS_FACTS` is what the
  access entries (WP9) record.
- **Monthly history**: `payrollHistory(c)`, January to October 2026.
  January to September are re-run through the engine from the roster
  (30 on the payroll, the back-pay employee on the old basic until
  September, as the back-pay figure says); October is the run itself.
  Each month has headcount, gross, deductions, net, overtime minutes
  and amount, leave taken (annual, sick, unpaid, in working days) and
  per-person lines. Earlier overtime and sick days are small planned
  lists (`HISTORY_OVERTIME`, `HISTORY_SICK`) that go through the
  engine; sick days are unpaid only inside probation, as in October.
  `trendRows(c)` gives display strings, `varianceBetween(c, "2026-10",
  "2026-09")` splits the gross change by cause (new joiner, leaver,
  unpaid leave, overtime, back pay, salary raise) and the parts add up
  to the whole exactly.
- `reportDate("2026-10-27")` is "27 Oct 2026" (the older
  `displayDate` leaves the year out for 2026).
- Limits: annual leave taken before October is only the leaver's April
  week, because that is all the leave data holds; no raises or
  joiners other than the demo's own cases are invented.

## Setup data: access, connections, data (`src/wp9.ts`)

For Setup (users and roles, API keys, webhooks, import, data
location). Reads the audit trail from `src/wp7.ts`, so the two agree.

- **Users and roles**: 12 users, all existing employees (`usr-028` is
  Fatima Al Ketbi, and so on); everyone else has the Employee role
  only (`roleMatrix(c).employeeOnlyText`). `ACCESS_ROLES` and
  `ACCESS_PERMISSIONS` are the whole truth: `accessCan(c, employeeId,
  permission)`, `whoCan(c, "pay.approve")`, `roleMatrix(c)` (the
  who-can-do-what grid) and `accessUserRows(c)` (display text) all read
  them. Tests hold that the HR manager prepares and cannot approve, the
  General manager approves and cannot prepare, every approver in the
  approvals inbox and every actor in the audit trail had the permission
  for what they did, and no one signed in before their last audited
  action.
- **Rules**: `APPROVAL_RULES`, `expenseRoute(amount)` (claims over AED
  1,000.00 go to the General manager, as the two demo claims were),
  `segregationChecks(c)` (each with its `breaches`, all empty),
  `accessReview(c)`, `accessSettings(c)` (second step required for
  admin roles; single sign-on "not set up in the demo").
- **API keys**: `accessApiKeys(c)`, shown only as `zbk_demo_****1234`,
  read-only scopes, created by the IT administrator and present in the
  audit trail. **Webhooks**: `accessWebhooks(c)` with masked secrets,
  `.test` addresses and deliveries that are the audit entries
  themselves (one retried, one failing, with a plain reason).
- **Import sample**: `importSample(c)` is a 12-row CSV from "the old
  system" (`.text`), parsed and checked row by row: ready, to review,
  or to fix, each problem a sentence with a fix. Rows are existing
  employees. The IBAN problems are the ones already in the data (the
  typo, the missing IBAN), the salary difference is the September raise,
  the leaver has no leaving date; a repeated number, an incomplete
  e-mail and an unknown department are planted in the file only.
  Nothing is imported.
- **Data location**: `DATA_LOCATION`: demo only, the page served from
  Frankfurt, Germany, no real data held, and an explicit list of what is
  not claimed (certification, audit report, data-residency compliance).
- Limit: the access log starts on 12 Jan 2026; ten of the 12 users
  were created before it, so their creation is not in it.

## Limits, said on purpose

- Pension: UAE nationals employed in Abu Dhabi may fall under the Abu
  Dhabi pension fund rather than the federal fund. Their pension is
  NOT computed: a visible "not computed" line on the payslip and a
  "needs confirmation" item (`PENSION_NOT_COMPUTED`, one place).
- Emiratisation: headcount by nationality only, labelled "sample
  data, regime for banks to be confirmed". No target, status or fine.
- Every figure carries "Based on UAE mainland rules, as we read them"
  (`RULES_SCOPE`; the client is mainland).
- The net pay figure, the employer cost and the GM's approval carry
  the pension caveat (`headline().netNote`, `employerCostNote`,
  `amountNote`); nationals' employer cost is "not computed", never 0.
- The leaver's unused leave is accrued pro rata through the last day
  (full months plus 15 of 31 days of October, less leave taken: 18.71
  days), paid at basic / 30 and rounded once, half up, in fils. Our
  reading: the law gives leave for parts of the last year but no
  method. Gratuity is calculateSettlement's. The leave screens read
  `availableDays`, which for the leaver comes from the same function
  (`unusedLeaveAtExit`), so the two figures cannot differ.
- Where the engine pack labels the 50% deduction limit "official", the
  explain view shows "secondary-sourced, as we read it"
  (`PRESENTED_STATUS`; the engine is not changed).
- The 50% deduction cap is shown as our rule (secondary-sourced; the
  85% payment test is not applied).
- Pay calendar dates are samples; the settlement due date (14 days
  after the last working day) is our reading of Article 53.
- No claim of acceptance by any regulator, bank or ministry.

## Fake identifiers

IBANs use bank digits 999 (the fictional bank, a documented fake
range); one planted typo fails mod 97. Emirates IDs fail the Luhn
check and are masked. Labour and employer ids start with 99. E-mails
end in `.test`. Arabic labels are NEEDS NATIVE REVIEW
(`DEMO_AR_REVIEWED = false`, so the UI can hide them).

## Work packages (one file each, `src/<package>.ts`)

- **WP6 Pay (`pay.ts`).** `pastRuns` (June to September 2026, each
  payslip from the engine, as paid), `payTrend` (June to October, net
  and change), `runChanges(c, month)` (who changed and why),
  `salaryRevisions` (basic only; the late one's arrears are the
  engine's back pay), `loans` (an active loan cut by the deduction
  limit, a closed one repaid June to August, an advance starting in
  November; balances from the engine), `payCorrections` (July unpaid
  days recorded in error, September overtime not paid: the engine's
  difference, to pay in November), `trafficFines` (to decide; recovery
  not computed), `finalSettlements`, and read-only `payGroups` and
  `payElements`. Every record has display strings (no raw dates).
- **WP5 Time (`time.ts`).** `shifts` (templates with display hours),
  `rosterPlan` (9 to 22 November, first week published, leave shown,
  the engine's roster checks), `attendanceAgainstShifts` (October,
  engine day sheets: overtime, night overtime, late arrivals past a
  sample 15-minute grace; three planted late days), `attendanceToday`,
  `punches` and `unmatchedPunches` (an unassigned badge, an out with no
  in), `overtimeClaims` (October's, paid, valued as the engine's
  difference; two pending for November as estimates) and
  `overtimePreApprovals` (operations at month-end, engine estimate).
- **WP4 Papers (`papers.ts`).** `letters` (salary certificates quote
  the contract salary, summed; an NOC; the leaver's experience letter
  in draft), `staffRequests` (the HR queue; the missing-IBAN person's
  bank-details request links to `enter-iban`), `visaCases` (the visa
  and Emirates ID near expiry, the new hire's completed visa; fees not
  shown), `warnings` (a draft written warning built from the three
  late days in the attendance records; no deduction computed).

## Tests

`pnpm exec vitest run --maxWorkers=1 --testTimeout=60000`: lines sum
to net, nets sum to the run total, SIF records sum to the run total
less held pay, each payslip equals a fresh engine run, same seed gives
the same bytes, fake identifiers only, labels complete.

## WP3: hiring, joining and leaving (`src/wp3.ts`)

Fictional recruiting, joining and leaving data for the same 31 people.
Nothing restates a joining date or a salary: it is all derived from
the employees, so it holds for every seed. The two fixed people are
the new hire (case `probation`) and the leaver (case `leaver`).

- Requisitions (`requisitionViews`, `vacancyViews`): a filled teller
  seat (the new hire), the leaver's backfill, two credit analyst seats
  and one on hold. Pay bands come from the bank's grade scale; seats
  carry position ids (`positionIdOf`, `newPositionId`) for WP2.
- Candidates (`candidateBoard`): 13 invented people (the hired one is
  the new hire's own record), interviews with a panel, closed ones kept
  apart.
- Offers (`offerViews`, `offerLetterText`): the new hire's accepted
  offer equals the employee record; open offers are priced at the
  grade's band floor (40% housing, grade transport, phone from grade
  7), start after 27 Oct 2026 and are already decided (draft, sent,
  accepted, declined), so no new item waits in the approvals inbox.
- Checklists (`joinerChecklistViews`, `leaverChecklistView`,
  `employmentEndView`): the new hire's joining list (the Emirates ID
  step is overdue; the bank step follows the IBAN on record), a
  pre-joining list for the accepted re-joiner, the leaver's list with
  the settlement from the pay run and its due date from `payCalendar`.
- Moves (`moveViews`): two done transfers (the record already shows
  the new seat), one approved for 16 Nov 2026, and a re-join of a
  former colleague who is not on the staff list yet. Our reading, to
  confirm: his earlier gratuity was settled, the new period starts at
  the re-joining date.
- `hiringSummary`, `managerIdFor` (the line-manager rule, the same as
  the approval checker), `shortDateText` ("27 Oct 2026", unlike
  `displayDate`), `dueTextOf`.

## WP2: team and growth (`src/wp2.ts`)

Fictional org chart, seats, appraisals, goals and probation
evaluations for the same 31 people. It builds on WP3 (`wp3.ts`) and,
like it, derives every date and amount from the employee records.

- Org chart (`orgChart`, `reportingLineOf`, `directReportsOf`): the
  General Manager on top, heads of department, then staff; branch
  staff report to their own branch manager. The rule is
  `managerIdFor`, the same as the approval checker (a test compares
  the two). The leaver is not on the chart.
- Seats (`positionViews`, `positionsByDepartment`): one seat per
  employee (30 filled, the leaver's vacant since 16 Oct 2026, linked to
  its requisition) plus the new seats of the WP3 requisitions (two
  vacant, one on hold). Pay bands are the bank's grade bands.
- Overview (`peopleOverview`, `staffAcrossSites`, `costCentreViews`):
  every figure is a count of a list; cost centres carry the run's own
  gross per department.
- Appraisals (`appraisalCycleViews`, `appraisalViews`): annual 2025
  and mid-year 2026 finalised, annual 2026 open (self-assessment due
  13 Nov 2026). Only people who joined before the cycle and had not
  left are in it. Ratings follow a fixed pattern, not a random draw.
  The back-pay case's AED 1,000 raise is the mid-year outcome,
  effective 1 Sep 2026 (the existing back pay derivation); no other
  pay change is recorded.
- Goals (`goalViews`, `departmentPerformance`): three goals per
  department, two per person (weights 60 and 40), two probation goals
  for the new hire. Status is progress against the pace of the year.
- Probation (`probationEvaluationViews`, `teamProbationOf`): one for
  each employee with a probation end date; past ones confirmed, the
  new hire's in progress with the engine's last notice day and notes
  taken from the leave and attendance records. Skills, training and
  surveys (P63 to P65) are not covered.

## WP10: home and the employee bar (`src/wp10.ts`)

Fictional tasks, notifications and notices for five roles (`HomeRole`:
`hr`, `gm`, `it`, `manager`, `employee`). The people are read from the
data the way the demo's role switcher reads them (`homeRolePersonas`:
the pay run's maker and checker, the overtime case, that employee's
manager, the IT manager). Nothing is typed twice: every item is derived
from the approvals inbox, the document list, the pay run's issues, the
WP2 appraisal cycle and the WP3 checklists, offers, interviews and
moves, so a task cannot disagree with the screen it opens.

- Tasks (`homeTasksFor(c, role)`, `homeTasksForEmployee`): open first,
  soonest due first, with urgency (overdue, soon, later), priority
  (high when overdue or due within 3 days), a target route hint and a
  display due text ("Was due 19 Oct 2026, 8 days ago"). Approval tasks
  are exactly the approvals inbox; checklist tasks are exactly the open
  steps (done ones from the last 14 days show as done).
- Notifications (`homeNotificationsFor`, `unreadNotificationCount`):
  newest first, read or unread, info, action or warning. A net pay
  figure is never shown here (it needs its pension caveat).
- Notices (`homeNoticesFor`, `homeNoticesForEmployee`): live notices
  for the person's place, pinned first; an expired notice is kept in
  the data and not shown. Dates for the National Day holiday are
  sample planning dates, to follow the official announcement.
- `homeSummary` (counts of those lists), `teamToday` (E10, from
  today's attendance), `myDocumentViews` (E05, plain dates).
- Not covered: leave cover for approvals (H10), approval splits (H11),
  help videos (H12), the employee's own KPIs beyond `goalViews` (E13).
