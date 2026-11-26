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
