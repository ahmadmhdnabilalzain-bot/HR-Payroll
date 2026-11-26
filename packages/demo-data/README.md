# @payroll/demo-data

The single source of truth for demo data: one fictional company, "Demo
company", built from a seed. Pure TypeScript: no clock, network or
unseeded randomness (a test enforces it).

```ts
import { buildDemoCompany, headlineTotals, issuesOf,
  costByDepartment, explainPayslipLine } from "@payroll/demo-data";

const demo = buildDemoCompany(); // seed 2026; same seed, same bytes
```

## What is in it

- 48 employees in 6 departments, 12 nationalities, 8 UAE nationals.
- October 2026 pay run: every payslip from the engine's
  `calculatePayslip`, with its trace, rule ids and sources. Totals are
  sums of the payslips.
- Cases, one person each: probation (end date from the engine),
  leaver (gratuity and leave pay from `calculateSettlement`, outside
  the run and the SIF), unpaid leave, overtime (one day over the legal
  daily limit, flagged), back pay (owed minus paid, two engine runs,
  carried as an `other` allowance because the engine has no back-pay
  kind), a loan instalment, and a missing IBAN (joins in December, so
  no October payslip: an issue, not a SIF line).
- The SIF from `packages/wps` and its validation report. Every demo
  IBAN fails mod 97 on purpose, so the report shows one
  `IBAN_CHECKSUM` warning per line. It never says compliant.
- Leave types, requests (some pending) and engine balances; October
  attendance and timesheets; an approvals inbox; documents with expiry
  dates; goals; the engine's Emiratisation report (targets unsourced,
  so "needs input"); GPSSA shares from the payslips.
- EN and AR labels (`DEMO_LABELS`). The Arabic is NEEDS NATIVE REVIEW.

## Assumptions (stated, not hidden)

- `gpssaContributionSalaryBase` is unsourced; nationals' payslips use
  `basic` as an override, so each carries `OVERRIDE_USED`.
- Weekend is Saturday and Sunday; annual leave is 30 days a year,
  credited monthly (company policy for the demo).
- Probation end dates are computed only for joiners from 2022-02-02,
  when the employment pack starts; earlier joiners have none.

## Fake identifiers

IBANs use check digits 00 or 01 (never issued) and fail mod 97.
Emirates IDs fail the Luhn check and are masked. Labour ids and the
employer id start with 99. Emails end in `.test`.

## Tests

`pnpm exec vitest run --maxWorkers=1 --testTimeout=60000`: lines sum
to net, nets sum to the run total, SIF records sum to the run total,
each payslip equals a fresh engine run, same seed gives the same
bytes, no real-looking identifiers, labels complete.
