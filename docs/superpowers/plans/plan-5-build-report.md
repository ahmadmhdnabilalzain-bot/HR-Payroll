# Plan 5 build report

Plan: `docs/superpowers/plans/2026-11-26-plan-5-monthly-payroll.md`.
Built test-first, one commit per task, `pnpm check` green before each.

## Red runs (test written first, run before the code existed)

- Task 1 `payroll-packs`: FAIL, `Cannot find module
  '../src/payroll/params'` (Test Files 1 failed, no tests ran).
- Task 2 `payroll-validate`: FAIL, `Cannot find module
  '../src/payroll/validate'` (Test Files 1 failed, no tests ran).
- Task 3 `payroll-days payroll-earnings`: FAIL, `Cannot find module
  '../src/payroll/days'` (Test Files 2 failed, no tests ran).
- Task 4 `payroll-variable`: FAIL, `Cannot find module
  '../src/payroll/variable'` (Test Files 1 failed, no tests ran).
- Task 5 `payroll-gpssa`: FAIL, `Cannot find module
  '../src/payroll/gpssa'` (Test Files 1 failed, no tests ran).
- Task 6 `payroll-deductions`: FAIL, `Cannot find module
  '../src/payroll/deductions'` (Test Files 1 failed, no tests ran).
- Task 7 `payroll-payslip payroll-props`: FAIL, `Cannot find module
  '../src/payroll/not-computed'` and `'../src/payroll/payslip'` (Test
  Files 2 failed, no tests ran).
- Task 8 `payroll-explain payroll-cases`: FAIL, `Cannot find module
  '../src/cases/payroll-runner'` and `'../src/explain/payroll-catalog'`
  (Test Files 2 failed, no tests ran). After the code, one test of my own
  failed (`expected 28 to be greater than 30`, a wrong threshold in the
  test); it now asserts the emitted ids equal the catalog keys.
- Task 9 `from-payslip` (wps): FAIL, `Cannot find module
  '../src/from-payslip'` (Test Files 1 failed, no tests ran).

Every other new test passed at its first green run.

## Status

All 9 tasks are done. Branch `worktree-agent-a228cc9bc054c8ed5` (worktree
`/home/user/HR-Payroll/.claude/worktrees/agent-a228cc9bc054c8ed5`), based
on `origin/claude/quirky-wozniak-b7xkvr` at `8b5b3d5`. Not pushed.

Final `pnpm check`: line length ok; typecheck ok; engine 275 tests
pass (154 before the plan); wps 172 tests pass (164 before). The 10
payroll cases pass, and so do the 200-run properties (7 engine, 1 wps).

## Plan corrections

- Hand-derived amounts: **none needed correcting.** I recomputed every
  amount in Tasks 3 to 9 and the case table by hand (fils, HALF_UP per
  line, DOWN for caps) before writing code, and the code agrees with all
  of them.
- `ded.scheme` message: the plan's "Deduction for an approved scheme"
  (Arabic "نظام معتمد") became "Deduction for a savings or welfare
  scheme" ("نظام ادخار أو رعاية"), to keep approval words out of product
  text. The plan's catalog block is updated to match (Ruling B4).
- Plan checkboxes are ticked.

## Decisions made while building (also in LEDGER section 10)

- B1: `calculatePayslip` checks the period (`INVALID_PERIOD`) before it
  selects a pack; the plan's order would report month 13 as
  `INVALID_DATE` from `selectPack`.
- B2: overtime and rest-day work may share one date; only a date listed
  twice in one list, or work on an absence date, is refused.
- B3: a deferred remainder is `kind-cap` when what was left of the kind
  cap was not more than what was left of the overall cap.
- B4: honest `ded.scheme` wording (above).
- B5: override keys that no pack uses are ignored, as in the gratuity.
  No new error code was added.
- B6: `deductionOrder` loads as text; `applyDeductions` refuses anything
  but the seven kinds once each (`INVALID_PARAM`).
- Sources: the 16 per-article ids have notes such as "Federal Decree-Law
  33 of 2021, Article 19(1)-(4)"; Law 7 notes say "(site English text;
  later amendments not read)". Statuses follow the plan's tables exactly;
  `gpssaContributionSalaryBase` and `gpssaGccNationalContribution` stay
  `unsourced` (value and source `null`).
- Error details use `field` and `value` throughout (plus `expected` for
  `GPSSA_FIXING_MONTH`).
- Trace inputs beyond the plan's minimum, for debugging: earnings lines
  carry `kind`, `monthly`, `paidHalfDays`, `totalHalfDays`; loan lines
  carry `instalment`; rest-day lines carry `wage`, `basicMonthly`,
  `mode`. No trace id outside the Task 8 catalog is emitted (a test
  asserts the emitted base ids equal the catalog keys).
- Test helpers: `tests/payroll-fixture.ts` (FX, `nationalFx`,
  `expectTraced`) and `tests/payroll-arbitrary.ts` (the property
  arbitrary). The wps property test uses a smaller local arbitrary
  in the same style, since the engine's test helpers are not exported.

## Concerns

- Reviews: the plan asks for a fresh reviewer after Tasks 3 to 7 and 9
  and a whole-branch review. The brief forbade subagents, so **none was
  run.** The whole-branch review is still needed before merging.
- Commit trailers: the brief said "exactly" `Claude Sonnet 5.5`, and a
  session note said `Claude Opus 5.5`. I used the brief's text on all
  nine commits.
- Task 9 commit subject: the brief's `feat(wps): payslip adapter`,
  not the plan's `feat(wps): payslip to SIF adapter`.
- Typo-safe overrides: an override key that no pack uses is ignored
  silently (B5). A refusal would need a new error code; left to the
  owner.
- The Arabic catalog is marked `NEEDS NATIVE REVIEW`. "cap.base" keeps
  the plan's "الأجر المعتمد" ("the wage used as the base"), which can
  also read as "approved"; a native reviewer should check it.
- Money rulings that matter most if wrong: the unsourced GPSSA base
  (every national needs an override), the rest-day reading (AED 500 a
  day at a AED 15,000 wage), calendar-day proration, and the deferrable
  GPSSA share.
- `OVERRIDE_USED` gap (found at the end, not fixed): the
  `maxNormalHoursPerDay` rule is read in validation but sits on no trace
  line, so overriding it (say to 12, with a 12-hour contract and
  overtime) changes the overtime rate without raising the flag.
  `overtimeMaxMinutesPerDay` is only on the normal overtime line, so a
  night-only month has the same gap (only a flag is affected there).
  Fix: add both rules to both overtime lines. The whole-branch review
  should pick this up.
- Review Focus 1 is half-tested: the date check rejects dates after the
  leaving date (the `d > payEnd` branch), but no test uses a leaver; the
  tests cover dates before joining and after the month.
- Merge risk: LEDGER section 10 and the HANDOVER edits may collide with
  other worktrees building in parallel.

## Review fix round (after the whole-branch review)

The review (`.superpowers/sdd/plan5/final-review.md` in the main checkout)
was READY AFTER FIXES with nothing Critical. The branch was synced with
`origin/claude/quirky-wozniak-b7xkvr` (fast-forward to `d5a9959`) before
the fixes. New commits, none amended:

- `28490ea` fix(engine): trace the GPSSA employee share and flag every
  override (I1, I2, M8, M9). Red first: `payroll-overrides`, 8 of 8
  failed.
- `6cfa0cb` fix(engine): exit deferrals and payslip message text (I3,
  M3, M7). Red first: `payroll-messages`, 7 of 8 failed (the stayer
  case already passed).
- `448f17e` fix(engine): round the employer GPSSA share once, cap night
  minutes (M2, M12, I4). Red first: the M2 and M12 tests failed (3);
  the five I4 tests pin existing behaviour, so they passed on the code
  and I checked that each kills its mutant (court cap 3000, overtime
  threshold 150, GPSSA HALF_EVEN, `d > w.monthEnd`, WPS order with
  housing second: all five killed). The new property "taken plus
  deferred equals requested" passed. The property arbitrary now keeps
  night minutes within 360.
- The last commit: case statuses and not-computed list (M4, M6), LEDGER
  Rulings B7 to B13, HANDOVER and this report. Red first: 3 tests
  failed (NOT_COMPUTED length, two case-status tests).

Rulings (LEDGER section 10):

- B7 replaces B5: overrides are recorded when params load;
  `UNKNOWN_OVERRIDE` refuses a key no pack defines; `OVERRIDE_UNUSED`
  shows a known key this payslip did not read.
- B8: the `gpssa.employee-share` line; `ded.gpssa` inputs `share` and
  `arrears`; the pension lines carry the salary-base rule; explanations
  print "overridden" (Arabic "قيمة مستبدلة", NEEDS NATIVE REVIEW).
- B9: `DEDUCTION_DUE_AT_EXIT` for a leaver's deferrals.
- B10 (M2): the employer share is rounded once. Checked by hand: salary
  300,100 x 15% = 45,015 exactly; x 12.5% = 37,512.5, which rounds
  HALF_UP to 37,513; support = 45,015 - 37,513 = 7,502. The review's
  37,513 is right. Earlier tests still hold (1,999,999: gross 300,000,
  payable 249,999.875 -> 250,000, support 50,000).
- B11 (M12): more than 360 night minutes on one date is refused
  (`INVALID_MINUTES`), not clamped.
- B12 (M13): "2.5% of its share" is read as 2.5 points of salary.
- B13 (M4): case files declare the weakest status in their trace; the
  runner fails a case that claims more; the national cases are
  `unsourced`.
- M3: the cap message prints the rate (`{in.capPercent}`, for example
  "50%"); `GPSSA_SHARE_DEFERRED` cites DL57 Art 11(4) only under DL57
  and says the Law 7 clause is not read; sick and maternity messages
  show days beyond the limit, and sick shows probation days.
- M6: five lines added to `NOT_COMPUTED` (private sector assumed,
  mid-month salary change, Art 30(2) GPSSA exclusion, Art 19(5), a
  Cabinet decision on the 2.5% support), 17 in all.
- M7: Arabic `cap.base` is now "الأجر الذي تُحسب عليه حدود الخصم"
  (still NEEDS NATIVE REVIEW).

Open items (skipped as instructed): M1 Law 7 join-and-leave in one
month; M5 no flag for probation-unpaid sick days; M10 two daily bases;
M11 WPS fixed can be 0 and half-pay days are not in `unpaidLeaveDays`.

Final `pnpm check` after the fix round: engine 300 tests, wps 173,
contract 43, web 88, all pass.
