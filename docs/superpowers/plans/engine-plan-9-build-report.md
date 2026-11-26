# Engine Plan 9 build report (Tasks 1 and 2, pure engine parts)

Branch `engine-plan-9`, built on `origin/claude/quirky-wozniak-b7xkvr`
at `4528bfb`. Engine only: no contract, API, migration, client or web
change. Not pushed.

## What was built

### Task 1: `ae-time` pack, day sheets, roster checks (`5eca2ed`)

- `src/sources.ts`: added `DL33_ART18`, `DL33_ART21`, `DL33_ART29`
  ("Article 29(1)") and `ER1_2022_ART15` ("Article 15(2)"). The ids
  `DL33_ART17`, `DL33_ART19`, `DL33_ART28`, `DL33_ART30`, `DL33_ART31`
  and `ER1_2022_ART19` were already there from Plan 5, so they were
  kept as they are (one entry each). The one exception is the
  `DL33_ART19` note, widened from 19(1)-(4) to 19(1)-(5); see
  Decisions.
- `src/rules/time-pack.ts`: `TIME_PACKS`, one frozen pack `ae-time`
  (version and effectiveFrom `2022-02-02`, effectiveTo `null`) with
  the 19 params of the plan's table. Each official param has a comment
  quoting the clause as READ in
  `docs/research/2026-11-26-labour-law-primary.md`.
  `timeWfhRetentionDays` is `unsourced` with value `null`.
- `src/time/params.ts`: `TimeOverrides`, `TimeParams`,
  `loadTimeParams`, `loadWfhRetention`.
- `src/time/intervals.ts`: `Interval`, `mergeIntervals`,
  `totalMinutes`, `overlapMinutes`, `outside`, `tail`, `nightWindows`,
  `parseHhmm`.
- `src/time/types.ts`: `ShiftSlot`, `LeavePart`, `DayInput`,
  `TimeFlag`, `DaySheet`, `RosterDayInput`, `RosterCheckInput`.
- `src/time/day-sheet.ts`: `computeDaySheet` (plan rules 1 to 9) and
  `periodHourFlags`. `src/time/day-sheet-trace.ts` builds the 7 trace
  lines; each records the inputs that reproduce its number (shift
  times, first start, last end, scheduled, limit, night minutes).
- `src/time/roster-checks.ts`: `checkRoster`, with all 7 flag codes.
- Tests: `time-pack`, `time-intervals`, `time-day-sheet`,
  `time-roster`. Every test name the plan lists is there, plus small
  extra cases: bad overrides, invalid shift and interval, trace ids and
  trace inputs, full leave on a rest day, a non-crossing night window,
  a run of windows, missing dates counting 0, a null slot breaking a
  run, a 9-day run giving one flag, the ISO week boundary, adjacent
  rest days, an invalid roster slot, an empty roster.

### Task 2: leave counting and accrual (`c92eaaf`)

- `src/time/types.ts`: `DayPart`, `LeaveSpan`, `DayBasis`,
  `LeaveCalendar`, `LeaveCount`, `LeaveAccrualPolicy`, `BalanceInput`,
  `BalanceResult`, `LeavePayrollKind`, `LeavePolicyFacts`.
- `src/time/leave-count.ts`: `countLeaveHalves`.
- `src/time/leave-accrual.ts`: `accruedHalves`, `balanceHalves`,
  `carryOverHalves`, `checkLeavePolicy` (6 warning codes, each with its
  rule).
- Tests: `time-leave-count` and `time-leave-accrual`, with every test
  name the plan lists plus extra cases: rest day wins over holiday, a
  part on a skipped date, end before start, carry-over with no expiry,
  every warning carries a rule, the monthly rate on a working basis,
  null annual days.

Both modules are exported from `src/index.ts`. The engine purity test
covers `src/time/` and `src/rules/`: no `Date`, clock, file or
environment access.

## Tests

`pnpm check` is green on both commits. Engine: 424 tests (was 353, so
71 new across 6 files, 4 of them fast-check properties: day-sheet
invariants with 200 runs, interval merge, balance identity and the
calendar-count property). Contract 43, wps 173, web 88, all unchanged.
Red then green for each task: the new test files failed with "module
not found" before the code existed. On Task 1's first green run one
test still failed (the pack was not yet exported from the barrel);
adding the exports fixed it.

## Plan tasks: done and remaining

Done in the engine (Tasks 1 and 2):

- Task 1: ae-time pack, params and sources; interval math; day sheet
  with overtime and the night split; the 144-hours-in-3-weeks flag;
  roster and shift conflict checks.
- Task 2: leave halves, half days, working-day counting; accrual,
  balance, carry-over cap, policy warnings.

Left for the API build (pure, but the plan puts them in `packages/api`):

- `haversineMeters`, `evaluateGeofence`: `src/time/geofence.ts`,
  Task 5.
- `minutesFromDubaiMidnight` (uses `Date.parse`):
  `src/time/clock-math.ts`, Task 6.
- Timesheet to pay inputs, `buildPayInputs` (Plan 5 shapes):
  `src/time/pay-inputs.ts`, Task 6.
- Absence and lateness patterns, `computeAttendanceFlags`:
  `src/time/flags.ts`, Task 8.
- WFH sample window, `checkSampleTime`: `src/wfh/sample-window.ts`,
  Task 10.
- WFH category and day totals: `src/wfh/views.ts`, Task 10.
- Everything else in Tasks 3 to 11 (contract, migrations, routes,
  `packages/time-client`).

The pure functions listed above stay out of the engine. The plan
puts each one in a named `packages/api` file and has them take
contract types (`TimesheetDay`, `TimeFlagView`, `WorkSite`,
`ActivityCategory`). `pay-inputs-purity.test.ts` also checks the API
path. `clock-math.ts` uses `Date.parse`, which the engine purity test
does not allow. So building them here would mean moving files the plan
names, which the brief said not to do. The API build consumes Tasks 1
and 2 as the plan's Interfaces blocks state.

## Plan corrections

None. I re-derived every number the plan gives for Tasks 1 and 2 by
hand, and each one matched the real arithmetic.

## Decisions (recorded, not asked)

1. **`DL33_ART19` note widened** to "Article 19(1)-(5)" as Plan 9
   asks, because `timeMaxConsecutiveRestDaysWorked` reads 19(5). The
   old text named a subset (19(1)-(4)) and only Plan 5 used it; no test
   checks the note text. The Plan 5 plan text and its build report
   still quote the old note.
2. **`loadWfhRetention(pack, null)`** passes no override, so
   `requireParam` throws `UNSOURCED_PARAM`. The override type cannot
   carry `null`. A non-integer value, or one below 1, throws
   `INVALID_PARAM`.
3. **`nightWindows` handles both shapes of window.** A window that
   crosses midnight (the law's 22:00-04:00) gives exactly the plan's
   `[k*1440+start, k*1440+1440+end]`. A window that does not cross
   midnight (possible only through an override) gives
   `[k*1440+start, k*1440+end]`. The results are not range-checked,
   because 3120 is past 2880.
4. **Input validation the plan implies.** `computeDaySheet` and
   `checkRoster` throw `INVALID_SHIFT` when a shift has `end <= start`,
   is longer than 1440 minutes, or has a break outside 0 to its span.
   `computeDaySheet` throws `INVALID_INTERVAL` for an interval outside
   -1440..2880 or with `end <= start`, and `INVALID_DATE` for a bad
   date.
5. **`periodHourFlags`** gives one flag per maximal run of 21-day
   windows over the limit. Its dates are the first window's first date
   and the last window's last date, and `detail.minutes` is the run's
   highest window total. A date missing from the input counts as 0.
6. **`NO_WEEKLY_REST`** gives one flag per maximal run of 7 or more
   consecutive shift days, with every date in the run. A `null` slot
   (no roster entry) breaks the run, the same as `"rest"`.
7. **`CONSECUTIVE_REST_DAYS_WORKED`** counts runs over the sequence of
   company rest days, skipping work days between them. Art 19(5)
   speaks of consecutive rest days, and with one rest day a week those
   fall a week apart. Rest days next to each other also form a run.
   Holidays are not company rest days here.
8. **`WEEK_OVER_48_HOURS`** totals each ISO week (Monday to Sunday)
   over the days present in the input. A week cut off at the edge of
   the range counts only the days given; the plan's Task 4 pads by 6
   days on each side. Dates are that week's shift dates. The Monday is
   computed from the day number (1970-01-01 was a Thursday), with no
   `Date`; a test pins 2026-03-02 as a Monday.
9. **Flag rules picked where the plan names none:** `NO_WEEKLY_REST`
   uses `timeMinWeeklyRestDays`, `NO_BREAK_AFTER_5_HOURS` uses
   `timeMinRestBreakMinutes`, and `SHIFT_OVER_NORMAL_HOURS` uses
   `timeMaxNormalMinutesPerDay` (or `timeRamadanReductionMinutes` on a
   Ramadan day, as the plan asks). `ON_APPROVED_LEAVE`,
   `MISSED_CLOCK_OUT` and `WORK_ON_LEAVE_DAY` carry no rule.
10. **`WORK_ON_LEAVE_DAY`** is raised only on work days. On a rest day
    or holiday, the work counts as rest-day work, following plan rule
    5's order.
11. **`MONTHLY_BELOW_FIRST_YEAR_RATE` runs on both day bases.** The
    plan's condition is "annual, monthly" and names no basis, so a
    working-basis monthly policy can get both
    `ANNUAL_BASIS_NOT_COMPARED` and this warning. A test pins this.
12. **`CARRY_OVER_ABOVE_HALF` applies to any payroll kind** that has
    both `annualDays` and `carryOverMaxDays`. That is the plan's
    literal rule, even though ER 19(1) is about annual leave.
13. **`balanceHalves` counts every taken entry, whatever its date.**
    The plan's expected 56 at 2026-03-01 includes the May entry. Only
    the carried-used split looks at dates.
14. **Type names:** the payroll-kind union is exported as
    `LeavePayrollKind`, and the count result and balance result as
    `LeaveCount` and `BalanceResult`. The plan wrote these inline, and
    naming them avoids barrel collisions with Plan 5's names.
    `TimeParams` integers are `Typed<number>`, as the plan says, not
    `bigint`. This engine has no money here.
15. Leave accrual throws `INVALID_LEAVE_POLICY` for negative or
    fractional `annualDays` or `year`.

## Concerns

- The roster and day-sheet flags follow the plan's readings. Art 19(5)
  and the "rostered break assumed taken" convention would both be
  worth a look from counsel. The per-task law review that the plan
  asks for after Tasks 1 and 2 has not happened yet.
- `loadTimeParams` takes `choiceParam` from `payroll/params.ts`, which
  makes the time module depend on that file. It is small and pure, but
  if Plan 5's params move, this import moves with them.
- The validation throws in Decision 4 and Decision 15 reach the API
  build, which has to stop such inputs before they get here:
  - `INVALID_INTERVAL`: a record closed more than 48 hours after its
    date's midnight would make `computeDaySheet` throw, and that
    month's draft timesheet could not be read. Plan 9 bounds
    corrections to 24 hours. I found no bound on an ordinary clock-out
    in the plan, so `buildDayInputs` should clip or flag such records.
  - `INVALID_SHIFT`: the contract allows `breakMinutes` up to 240 on
    any span. A template whose break is longer than its span would make
    `checkRoster` throw on a roster save, against "flags never block a
    write". The template schema should refuse it.
  - `INVALID_LEAVE_POLICY`: `annualDays` is already an integer in the
    contract (`leave.ts`), so this cannot fire from the API.
- `timeMaxConsecutiveRestDaysWorked` is `official` per the plan table,
  but the note paraphrases Art 19(5) and does not quote it.
- Decision 11 follows the plan literally; whether to compare a monthly
  rate on a working basis is open.
- `ER1_2022_ART15` cites 15(2). The note quotes it as READ in its
  section 13, not in section 1 next to the other hours articles.

## Review fixes (law and correctness review, READY AFTER FIXES)

Merged `origin/claude/quirky-wozniak-b7xkvr` (`435896e`) first. Each
fix was written test-first, with the engine typecheck, the engine
tests, `pnpm lines` and `pnpm lines:test` green before each commit.
Engine tests: 584, all passing.

- `90b96c2` C1 (Critical): only the part of the rostered break that
  is not already an unclocked gap inside the shift is assumed, with
  `max(0, clocked - assumed)`. The review case (540-780 and 840-1140
  on a 540-1080 shift with a 60-minute break) gives worked 540 and
  overtime 60. A property checks that worked and overtime never fall
  as clocked time rises. Plan rule 3 is amended. M6 (half-day
  overtime) is documented, not changed. Halving the break would make
  the plan's `half_day_am_leave_halves_schedule` show 210 worked
  minutes for a fully worked afternoon, an understatement the approver
  cannot raise, whereas an overstatement stays a candidate the
  approver reduces.
- `63c7583` I1: on a shift day, overtime is
  `max(0, worked - min(scheduled, limit))`, where the limit includes
  the Ramadan reduction. Night minutes come from the worked time
  outside the shift, or from all worked time when the limit binds. M5:
  with no shift, night is `min(overtime, night minutes worked)`. M2:
  the Ramadan overtime trace says "reading ... not stated in ER
  15(2)". Plan rules 6 and 7 and Ruling 4 are amended.
- `04a1e3c` I2 (engine side): a closed interval longer than 24 hours,
  or outside -1440..2880, is left out of worked time. It is flagged
  `LONG_RECORD` and `MISSED_CLOCK_OUT` and never throws. M7:
  fractional minutes throw `INVALID_INTERVAL` or `INVALID_SHIFT`, in
  both the day sheet and the roster check. M8: the fixed UTC+4,
  no-DST assumption is stated in the pack, in `Interval` and in
  `DayInput`.
- `60bdc53` I4: `carryOverHalves(remaining, cap, p)` returns
  `{ carriedHalves, excessHalves, flags }`. Any excess raises
  `UNUSED_LEAVE_NOT_CARRIED` with rule `timeCarryOverMaxShareBps`; its
  note says ER 19(1) offers cash as the alternative and that
  forfeiture is unsourced. `balanceHalves` adds `flags` with
  `CARRIED_LEAVE_EXPIRED` (company policy, not law; unsourced).
  Halves must be whole (`INVALID_HALVES`). The plan's Tasks 2 and 7
  are amended.
- `9382f23` M3: `MONTHLY_BELOW_FIRST_YEAR_RATE` now runs on the
  calendar basis only. This supersedes Decision 11 above.
- `e981beb` I5: `tests/time-boundaries.test.ts` pins every surviving
  mutant: the 21-day window, the exact limits of each `>` check, both
  expiry boundaries, the floor roundings, worked never below zero,
  and sick days over 90. `balance_identity` is replaced by a property
  checked against an independent model of expiry. I re-ran all 13
  mutations listed (the review counts 12 survivors and lists 13) on a
  copy of the engine. Each now fails a test; the unmutated copy
  passes.
- `6c3420b` M1: the Art 19(5) official text is added to the labour
  law note as "search excerpt, not read in full" and quoted at the
  pack param. The day-laborer exclusion is not modelled.

These supersede the matching Concerns above: the Art 19(5) quote and
Decision 11 are settled, and `INVALID_INTERVAL` no longer fires for a
long record.

Plan corrections from the review: rule 3, rules 6 and 7, rule 8
(`LONG_RECORD`), Ruling 4, and the Task 2 interfaces and test lines
for `balanceHalves`, `carryOverHalves` and the monthly-rate warning.
The Task 7 carry-over run now stores the excess. These are rule
changes the review asked for, not arithmetic errors.

### Needed in the contract and API build (not engine)

- I2: the clock-out route should refuse with 422 a clock-out more
  than 24 hours after clock-in, pointing to a correction.
  `buildDayInputs` must never throw: it should pass a record longer
  than the tracked-hours bound as `openRecord: true` without its
  interval. The engine also tolerates such an interval and flags it.
- I3: the shift template schema must refuse `breakMinutes >= span`
  and `start == end`. The engine still throws `INVALID_SHIFT` for a
  break longer than its span, an impossible shape that the contract
  must stop first.
- Task 7: store `excessHalves` and show `UNUSED_LEAVE_NOT_CARRIED` to
  HR. Show `CARRIED_LEAVE_EXPIRED` beside any expiry setting, labelled
  "company policy, not law; counsel to confirm".

### Not fixed (left for counsel or a later task)

- M4 (no day-level Art 18 flag for a day worked straight through),
  M9 (duplicate pack values across `ae-payroll` and `ae-time`, no
  consistency test), M10 (holidays inside calendar-basis leave,
  `periodHourFlags` needing 20 days of lead-in), M11 (source note
  ranges kept from Plan 5). The coordinator did not ask for these.
