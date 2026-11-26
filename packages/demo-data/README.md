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
