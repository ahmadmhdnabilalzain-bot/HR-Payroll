# Engine Plan 12 build report (Tasks 1 to 5)

Branch `engine-plan-12`, worktree
`/home/user/HR-Payroll/.claude/worktrees/agent-afed9d5448c462e07`,
based on `claude/quirky-wozniak-b7xkvr` at d6b3c6c. Not pushed.

## Status

Tasks 1 to 5 of
`docs/superpowers/plans/2026-11-26-plan-12-vat-einvoicing.md` are done,
engine only. Each task was written test-first (red run seen, then
green) and committed after a green `pnpm check`.

| Task | Commit | Subject |
|---|---|---|
| 1 | ace917b | feat(engine): VAT, CT and e-invoicing packs |
| 2 | 4f005fb | feat(engine): Decision 17 conditions |
| 3 | b6b78fa | feat(engine): VAT line checks and periods |
| 4 | f32bb41 | feat(engine): VAT 201 box computation |
| 5 | 7470d11 | feat(engine): corporate tax and e-invoicing |

## Tests

`pnpm check` is green. Engine: 445 passed, 3 skipped (353 before). The
3 skips are the `no-tax-figures` scans of `packages/api/src/tax`,
`packages/api/src/einvoicing` and `packages/contract/src/tax`, which
do not exist yet (Task 6 onward). They switch on once those folders
appear. Contract 43, wps 173, web 88: unchanged and passing.

New test files: `tax-packs`, `no-tax-figures` (figure scan plus the
banned-wording scanner, tested on planted strings), `employee-expense`,
`vat-line`, `vat-periods`, `vat201`, `vat201-props` (fast-check),
`corporate-tax`, `einvoicing`, plus the helper `vat201-fixture.ts`.
`purity.test.ts` also checks that `src/tax/` is scanned.

## Plan corrections

None. I checked every hand-derived number in the plan by hand and by
test: weekdays, the business-day counts, the fine months, the
corporate tax bands, the VAT 201 box sums and the due dates. All
matched, so the plan file is unchanged.

## Decisions

1. Tax sources live in a new `src/sources-tax.ts` (`TAX_SOURCES`),
   which `sources.ts` spreads into `SOURCES`. This keeps
   `sources.ts` small.
2. Section 3.3 of the research note prints no URL, so
   `MD244_2025_ART3_4` uses the MD 244 PDF URL from section 3.1. The
   FAQ and CD 106 URLs are printed without a scheme, so `https://` was
   added.
3. `packParamsView` shows an empty source url (engine convention) as
   `null`.
4. `addMonthsClamped` already existed in `employment/calendar.ts`.
   `tax/calendar.ts` re-exports it, so there is one implementation and
   `tsc` accepts the barrel.
5. Shared tax param readers are in `tax/params.ts` (string, ISO date,
   and a rounding mode under any key). They reuse `intParam` and
   `boolParam`.
6. Decision 17: every `CaseDef.conditions` list includes the two
   Article 1 conditions first. The data is in
   `employee-expense-defs.ts`, because a file name containing "cases"
   breaks an existing purity assertion. The case is validated and
   attestations are checked before the pack is selected, so bad input
   throws even before 1 Oct 2026. Passing `stayDays` for any case
   other than `new-employee-accommodation` throws `INVALID_INPUT`.
   The "before 2026-10-01" reason is built from the pack's
   `effectiveFrom`, not from a literal.
7. `checkDocumentVat` refuses negative amounts (`INVALID_AMOUNT`). A
   VAT error on a non-standard treatment carries `expected: 0n`.
8. `vatPeriods`: `from > to` throws `INVALID_PERIOD`, a length other
   than 1 or 3 throws `INVALID_PARAM`, and a `from` before the first
   period is clipped to it. `rollToBusinessDay` refuses a weekend of
   all seven days.
9. VAT 201:
   - Boxes 2, 6 and 7 have columns amount and VAT, with adjustment
     `null`; the plan names columns only for the other boxes.
   - When any box 9 or 10 document has `claimedVat: null`, that box's
     VAT column is `null` rather than a partial sum. This follows the
     "null, never 0.00" constraint. The amount is still shown.
   - Problems are grouped by code and box, with their `docIds`.
   - `NEGATIVE_BOX` is raised once per box, in box order.
   - Document ids must be unique (`DUPLICATE_DOCUMENT`), and
     `correctsPeriodStart` must be earlier than `periodStart`
     (`INVALID_PERIOD`).
   - A `vat201.corrections` trace line, carrying the threshold rule,
     is added next to the 15 box lines.
   - The code is split into `vat201-layout.ts`, `vat201-types.ts`,
     `vat201-docs.ts` and `vat201.ts` to respect the size limits.
10. Corporate tax: "at most 18 months" means the period length.
    `periodEnd` must be on or before
    `addMonthsClamped(start, 18) - 1 day`. SBR reasons are codes, for
    example `REVENUE_OVER_THRESHOLD` or `SBR_END_DATE_UNSOURCED`. When
    the last eligible period is unsourced, the trace shows it as a rule
    with value `"null"` and status `unsourced`.
11. E-invoicing:
    - `tinFromTrn` and `participantIdFor` take no date, so they use the
      single open-ended pack. Zero or several such packs throw.
    - `missingDocumentFineExposure` selects a pack on day 1 of each
      month.
    - An `appointedOn` later than `asOf` throws `INVALID_PERIOD`.
    - A negative revenue throws `INVALID_AMOUNT`.

## Concerns

1. The VAT 201 corrections formula is implemented exactly as the plan
   states it: sale VAT minus claimed purchase VAT. It leaves out the
   Box 3 output VAT on reverse-charge purchases. Example: a correcting
   reverse-charge purchase with VAT 500 and claimed 0 changes Box 14
   by +500 but shows a correction effect of 0. The test
   `correction_effect_formula_as_written` pins this behaviour. This is
   a rule question, not an arithmetic one, so I left the plan as it
   is. A reviewer should decide whether to add `+ vat` for
   reverse-charge purchases.
2. Source URLs were joined literally, as the plan requires.
   - The guide URL joins to `...User%20GuideEnglishV40...`. The line
     break probably lost a `%20`.
   - The Decision 17 URL has `tax.gov.ae//Datafolder`.
   - The bulletin URL reads `CT_TaxB_ulletin_EN_V5.pdf`.
   None of the three was repaired or checked against the live page.
3. The per-task fresh reviews that the plan requires after Tasks 1, 2,
   4 and 5 (law and money) are still owed. This build could not
   dispatch reviewers.
4. Commit trailers say `Claude Sonnet 5.5`, as the task instruction
   gives them. A session reminder suggested `Claude Opus 5.5`. I
   followed the task text, which also matches the recent history.
5. The purity scanner reads any string literal ending in `from` or
   `import` followed by a quote as an import. A field name `"from"`
   tripped it, so I renamed it; the scanner itself was not changed.

## Review fixes (after `.superpowers/sdd/plan12/final-review.md`)

Merged `claude/quirky-wozniak-b7xkvr` (04dd349) first, then:

| Fix | Commit | What |
|---|---|---|
| I1, M3, M7 | 1c12585 | corrections use `box14Effect`; `CLAIMED_ON_UNTAXED` |
| I2 | 3b5f89d | 0% band cites the 25 Nov note; guidelines note |
| I3 | 6a3284f | wider banned-wording scan, variants, URL strip |
| M1, M2, M5, M6 | 8feebc7 | cap and 18-month tests, 15-digit TRN, stay days |

- I1: each document's Box 14 effect is computed the way `placeDocs`
  places it. Standard sales count `+vat`, standard purchases count
  `-claimed`, reverse-charge purchases count `vat - claimed`, and
  everything else counts 0. The pinned test now expects `600n`. The
  review's three scenarios are tests. Two new property tests: the
  corrections total equals the Box 14 change, and a single corrected
  period's effect equals `box14`. An undecided claim counts as 0, as
  the prescribed helper does; the return is incomplete then anyway.
- M7: the property generators now cover credit notes, corrections,
  entered or `none` FTA boxes, and signed adjustments.
- M3: an excluded purchase with `claimedVat > 0` raises
  `CLAIMED_ON_UNTAXED`, which makes the return incomplete.
- I2: new source `RESEARCH_CT_ZERO_RATE` points to the 25 Nov note,
  with an empty url like `RESEARCH_EMIRATISATION`. Status stays
  `secondary`. The `MOF_EINV_GUIDELINES` note now says "V1.1 path;
  link serves V2.1".
- I3: the scan now covers:
  - folders `api/src/{tax,einvoicing}` and
    `contract/src/{tax,einvoicing}`;
  - `contract/src/routes-(vat|tax|einvoic)*.ts`;
  - `api/src/routes/(vat|tax|einvoic)*.ts`.

  It catches these variants: "submitted to FTA", "FTA-approved",
  "5 %", "five per cent", "recover input tax". URLs and
  percent-encoded bytes are removed before the scan. The engine's
  `src/tax` text is scanned too; only the quoted Box 13 FTA label is
  allowed. Once `routes-vat.ts` exists, the test fails unless that
  file is scanned and the tax folders exist. The plan's test spec is
  updated to match. The scanner and its planted-string tests live in
  one file, so I could not show a separate failing run for it.
- M5: `tinFromTrn` accepts exactly `^\d{15}$`, which is the Ruling 9
  assumption and is marked as one in the code.
- M6: `stayDays` counts calendar days including the first and the
  last day. This is a cautious convention, documented on the
  interface and in the plan.
- M4 (not requested): I added a comment documenting rounding per
  band; no behaviour changed.
- The M1 and M2 tests pass against the existing code. They pin
  behaviour that was already right, so there was no failing run.

Checks: engine 550 tests pass, including the line-length checks and
the typecheck of every package except web.

`pnpm check` is not fully green, for reasons outside the engine:
- `apps/web` fails its typecheck and 15 unit tests on the merged
  base. The errors are `sifFileId` missing on `AppPayRun` and
  `ErrorDetail` typing. These files are untouched by this work.
- `packages/api` had 174 tests pass, then one worker was killed with
  SIGKILL, probably memory.

UNVERIFIED source URLs, left untouched as instructed:
1. VAT guide: `...User%20GuideEnglishV40...`, which probably lost a
   `%20`.
2. Decision 17: `tax.gov.ae//Datafolder`, verbatim in the note.
3. CT bulletin: `CT_TaxB_ulletin_EN_V5.pdf`, verbatim in the note.
