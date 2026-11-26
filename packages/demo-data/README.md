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
- Problems, each with its source, a plain reason, a suggested fix
  (EN/AR) and a `fixKind` (`issuesOf`). From the engine: overtime
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
- Every figure carries "UAE mainland rules" (`RULES_SCOPE`; the client
  is mainland).
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
