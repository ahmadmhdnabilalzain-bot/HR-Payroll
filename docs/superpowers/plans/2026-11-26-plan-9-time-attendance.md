# Plan 9: Time, Attendance, Shifts, Leave Policies and Work-From-Home

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Plan 3 backend with shifts and rosters, swaps,
browser and phone clock-in with a geofence, corrections with approval,
timesheets and overtime review that produce reviewed time inputs for
Plan 5, leave policies, a company-entered holiday calendar, team
availability, attendance flags, and work-from-home tracking exactly as
the owner decided (UQ38), with a client package for the phone and
browser location sampler and an interface for a desktop agent.

**Architecture:** Legal values and the law-touching time arithmetic
(day sheets, night overtime, roster checks, leave counting and accrual)
live in a new frozen engine pack `ae-time` and pure modules in
`packages/engine/src/time/`; the API never holds a statutory number.
Each API task adds its zod schemas and routes to `packages/contract`
(a new `TIME_ROUTES` list in `routes-time.ts`), its migration (901 to
908), services under `packages/api/src/time/`, `src/leave/` and
`src/wfh/`, and keeps Plan 3's cross-cutting tests (conformance, leak,
RLS catalog, audit) green. A new pure package `packages/time-client`
holds the hourly location sampler, the phone and browser location
ports, the visible indicator model and the desktop agent interface.

**Tech Stack:** As Plan 3: Node 22, TypeScript 7.0.2, zod 4.6.7, Hono
4.13.17, @electric-sql/pglite 0.5.16 (tests), pg 8.23.1, Vitest 5.1.2,
fast-check 4.11.0, tsx 4.23.15. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-25-master-feature-list.md`
(UQ38 work-from-home tracking; UQ30 leave-safe roster, cost part out;
UQ18 approvals; tags SR and "flag, never deduct"),
`docs/superpowers/specs/2026-11-25-combined-feature-list.md` (section
B: leave policies and accrual, holiday calendar, team calendar,
attendance by web, mobile, GPS and geofence, regularisation, overtime
approval, shifts and rosters, timesheets for payroll input, Ramadan
hours and public holidays), `LEDGER.md` section 1 (2026-11-25: "Work
from home would record screen time and location service"; no
screenshots and no keystroke logging, "No, I don't want those 2";
"Location service will just record once every hour"), section 3
(2026-11-25 remote-work tracking design; speed ruling 2026-11-26),
`docs/research/2026-11-25-remote-work-tracking-feasibility.md`,
`docs/research/2026-11-26-labour-law-primary.md` (the only source of
labour rules here: DL = Decree-Law 33 of 2021, ER = Cabinet Resolution
1 of 2022), `docs/research/2026-11-26-pdpl-primary.md` (PDPL = Federal
Decree-Law 45 of 2021), `docs/engineering-standards.md`. Extends
`docs/superpowers/plans/2026-11-26-plan-3-backend.md` (contract, API,
tenancy, audit, roles, basic leave and attendance; not redone) and
feeds the input shapes of
`docs/superpowers/plans/2026-11-26-plan-5-monthly-payroll.md` Task 2.

**Prerequisite:** Plan 3 is built (Tasks 1 to 8). Plan 9 does not need
Plans 4 to 8. Where Plan 9 consumes a Plan 3 function that Plan 3's
Interfaces blocks do not name, this plan gives the exact signature and
the executor exports it from the named Plan 3 file.

## Features delivered (count these)

Delivery level in brackets: engine (pure, tested), API (routes, tables,
tests), client (pure package with ports; no screen), interface (types
and a reference plan only).

1. **Shifts and rosters**: shift templates, rotation patterns, draft
   and publish, legal roster flags [engine, API].
2. **Shift swap requests**: peer acceptance, manager approval, flags
   after the swap [API].
3. **Browser and phone clock-in with geofence**: work sites as
   parameters, per-employee geofence mode, site or remote [API].
4. **Attendance corrections with approval** [API].
5. **Timesheets and overtime review with payroll time inputs**:
   approved items only, shaped for Plan 5, never paid automatically
   [engine, API].
6. **Leave policies**: accrual, carry-over, half days, blackout dates,
   working-day counting, statutory warnings [engine, API].
7. **Holiday and Ramadan calendar**: company-entered, no built-in list
   [API].
8. **Leave calendar and team availability**: staffing minimums, health
   leave types hidden from peers [API].
9. **Absence pattern and late arrival flags**: informational, no
   consequence, inputs shown [API].
10. **Work-from-home tracking (UQ38)**: notice and consent, active time
    and app and site categories, hourly location, pause, own data and
    export, retention limit [API]; phone and browser location sampler
    with a visible indicator model [client]; desktop agent [interface].

## Global Constraints

- All of Plan 3's Global Constraints apply unchanged (80-character
  lines, files under about 300 lines, functions under 30, RLS on every
  tenant table, all queries through `withTenant`, injected time and
  ids, `/v1`, `X-Company-Id`, tests offline).
- No statutory number in `packages/api`, `packages/contract` or
  `packages/time-client`: no zod range, constant, default or test
  literal that encodes a legal value. API tests read legal values from
  `TIME_PACKS` through `loadTimeParams` or call the engine.
- Every legal flag or warning carries its `TraceRule` (pack key,
  value, status, pack id and version). A value is `official` only where
  the research note marks the text READ and quotes the value.
- No invented calendar data anywhere, fixtures included: no holiday
  list, no Ramadan dates, no default weekend. Fixtures use neutral
  names ("Company Day A", "Test period") and arbitrary dates.
- Product defaults (grace minutes, flag thresholds, accuracy allowance,
  tracked-hours bound) are labelled "product default, not law" where
  shown (`productDefaults` lists the keys still at their default).
- Remote-work tracking, exactly as the owner decided: active time while
  clocked in (one yes or no per minute), app and site CATEGORIES only,
  location sampled once an hour while clocked in, the employee sees
  their own data and can pause, notice and consent before tracking
  starts, a retention limit with no default. Screenshots, screen video,
  keystroke logging, page contents, window titles and web addresses are
  out of scope with no switch: no route, column, setting key or client
  capability exists for them.
- Tracking data never changes pay: no module that builds pay inputs
  reads a `wfh_` table, and pay inputs are an export only (nothing in
  this plan writes pay-run tables).
- Clock-in coordinates are used once for the geofence and discarded;
  hourly WFH locations are stored rounded to 3 decimals (about 110 m).
  Coordinates, categories, notes and reasons never appear in audit rows
  or log lines (`TIME_SENSITIVE_KEYS`, Task 3).
- Health-related leave types (`payrollKind` `sick` or `maternity`) are
  shown only to the employee, their manager, hr and owner (PDPL Art 1
  lists health data as sensitive).
- Flags are informational: every flag has `consequence: "none"` and
  shows its inputs; nothing in this plan deducts, sanctions or blocks
  pay because of a flag (master list: "flag, never deduct").
- Arabic copy is `null` with `arabicStatus: "not-reviewed"` until a
  native speaker reviews it (HANDOVER known limits).
- Contract changes to Plan 3 schemas are additive (new optional fields,
  new routes) except the named widenings in Rulings 6 and 7.
- No deletes except the two WFH sample tables (retention and erasure,
  Ruling 20); every other removal is a status.
- Audit actions match `^[a-z]+(\.[a-z-]+)+$` with no hyphen in the
  first segment.
- Migrations are numbered `901_` to `908_` (Plan 9's range).
- Each task ends with `pnpm check` green and one commit. Review: a fresh
  per-task review after Tasks 1, 2 (law), 6 (pay inputs), 9 and 10
  (privacy and security), and one whole-branch review at the end (speed
  ruling, 2026-11-26).

## Review Focus

1. A manager or a colleague reading WFH, calendar, roster, flag or
   timesheet routes: no location coordinate, per-minute activity, or
   sick or maternity leave type of someone they may not see appears in
   any body (Task 8 `calendar_hides_health_type_from_peer`, Task 10
   `wfh_leak_manager_and_peer_see_no_coordinates`).
2. A shift or clock-out that crosses midnight Dubai time (also 20:00
   UTC): the record keeps the clock-in date and night overtime between
   22:00 and 04:00 is split right on both sides of 00:00 (Task 1
   `night_overtime_across_midnight`, Task 5
   `clock_in_after_2000_utc_dated_next_dubai_day`).
3. A tracking upload sent late, for a minute after clock-out, inside a
   pause, after consent was withdrawn, or carrying an extra field such
   as `url`, `title` or `screenshot`: rejected whole and nothing is
   stored (Task 10 `wfh_upload_rejections_store_nothing`).
4. An employee who forgets to clock out: tracking stops at the
   tracked-hours bound and no location or activity is accepted after
   it; the day shows a missed clock-out flag, not 20 hours of overtime
   (Task 10 `wfh_forgotten_clock_out_stops_at_bound`, Task 1
   `open_record_flag_not_overtime`).
5. Attendance or leave edited after a timesheet was approved: the
   locked day refuses edits (409 `TIMESHEET_LOCKED`) and the approved
   pay inputs never change silently; a leave change shows `stale`
   (Task 6 `approved_timesheet_snapshot_unchanged_after_edit`).

## File Structure

```
packages/engine/src/sources.ts               + DL33/ER1 ids (if absent)
packages/engine/src/rules/time-pack.ts       ae-time pack (data)
packages/engine/src/time/params.ts           TimeParams, loadTimeParams
packages/engine/src/time/intervals.ts        minute interval math
packages/engine/src/time/types.ts            day, roster, leave types
packages/engine/src/time/day-sheet.ts        computeDaySheet, 3-week cap
packages/engine/src/time/roster-checks.ts    checkRoster
packages/engine/src/time/leave-count.ts      countLeaveHalves
packages/engine/src/time/leave-accrual.ts    accrual, balance, policy
packages/contract/src/routes-time.ts         TIME_ROUTES (Tasks 3-10)
packages/contract/src/time-{settings,rosters,clock,timesheets,
  pay-inputs,leave-policy,calendar,wfh}.ts   schemas per task
packages/api/migrations/901_time_settings.sql ... 908_wfh_samples.sql
packages/api/src/audit/time-audit.ts         timeAudit, sensitive keys
packages/api/src/time/                       settings, calendar, sites,
                                             profiles, geofence, rosters,
                                             swaps, clock, corrections,
                                             decide, timesheets, pay
                                             inputs, availability, flags
packages/api/src/leave/                      policy, blackouts, accrual
                                             balances, carry-over (adds)
packages/api/src/wfh/                        settings, notice, consent,
                                             pause, ingest, views,
                                             retention
packages/api/src/routes/time-*.ts, wfh.ts    route handlers
packages/api/tests/helpers/seed-time.ts      seedTime
packages/time-client/                        sampler, ports, indicator,
                                             activity meter, categories,
                                             desktop agent interface
HANDOVER.md, LEDGER.md                       updated in Task 11
```

---

### Task 1: `ae-time` rule-pack, day sheets and roster checks

Law task: fresh per-task review.

**Files:**
- Modify: `packages/engine/src/sources.ts` (ids below, each added only
  if absent; Plan 5 Task 1 adds some of the same ids with the same url
  and note format, so on a merge keep one entry)
- Create: `packages/engine/src/rules/time-pack.ts`,
  `src/time/params.ts`, `src/time/intervals.ts`, `src/time/types.ts`,
  `src/time/day-sheet.ts`, `src/time/roster-checks.ts`
- Modify: `packages/engine/src/index.ts` (export the new modules)
- Test: `packages/engine/tests/time-pack.test.ts`,
  `tests/time-intervals.test.ts`, `tests/time-day-sheet.test.ts`,
  `tests/time-roster.test.ts`

**Interfaces:**
- Consumes: `RulePack`, `RuleParam`, `ParamValue`, `requireParam`,
  `selectPack`, `deepFreeze`, `sourceOf`, `traceRule`, `TraceBuilder`,
  `TraceLine`, `TraceRule`, `EngineError`, `addDays`, `daysBetween`,
  `parseIsoDate`, `toDayNumber` (all existing in `packages/engine`).
- Produces:
  - Source ids (url `https://uaelegislation.gov.ae/en/legislations/
    1541` for DL, `.../1547` for ER; note names law and article):
    `DL33_ART17` ("Federal Decree-Law 33 of 2021, Article 17(1)"),
    `DL33_ART18`, `DL33_ART19` ("Article 19(1)-(5)"), `DL33_ART21`,
    `DL33_ART28` ("Article 28(1)-(2)"), `DL33_ART29` ("Article
    29(1)"), `DL33_ART30` ("Article 30(1)"), `DL33_ART31` ("Article
    31(3)"), `ER1_2022_ART15` ("Cabinet Resolution 1 of 2022 (Executive
    Regulation), Article 15(2)"), `ER1_2022_ART19` ("... Article
    19(1)").
  - `TIME_PACKS: readonly RulePack[]`: one pack, id `ae-time`, version
    and effectiveFrom `2022-02-02`, effectiveTo `null`, `deepFreeze`d,
    with exactly these params (o = official, c = convention, u =
    unsourced; every `o` value is quoted as READ in the labour law
    note):

| key | value | S | source |
|---|---|---|---|
| timeMaxNormalMinutesPerDay | 480 | o | DL33_ART17 |
| timeMaxNormalMinutesPerWeek | 2880 | o | DL33_ART17 |
| timeRamadanReductionMinutes | 120 | o | ER1_2022_ART15 |
| timeMaxConsecutiveWorkMinutes | 300 | o | DL33_ART18 |
| timeMinRestBreakMinutes | 60 | o | DL33_ART18 |
| timeOvertimeMaxMinutesPerDay | 120 | o | DL33_ART19 (flag only) |
| timeMaxMinutesPer3Weeks | 8640 | o | DL33_ART19 |
| timeNightWindow | "22:00-04:00" | o | DL33_ART19 |
| timeMaxConsecutiveRestDaysWorked | 2 | o | DL33_ART19 (19(5)) |
| timeMinWeeklyRestDays | 1 | o | DL33_ART21 |
| timeHolidayWorkCompensated | true | o | DL33_ART28 |
| timeAnnualLeaveMinDays | 30 | o | DL33_ART29 |
| timeFirstYearDaysPerMonth | 2 | o | DL33_ART29 |
| timeCarryOverMaxShareBps | 5000 | o | ER1_2022_ART19 |
| timeSickLeaveMaxDaysPerYear | 90 | o | DL33_ART31 |
| timeMaternityLeaveDays | 60 | o | DL33_ART30 |
| timeWeekBasis | "iso-monday" | c | ENGINE_CONVENTION |
| timeLeaveYear | "calendar-year" | c | ENGINE_CONVENTION |
| timeWfhRetentionDays | null | u | null |

  - `params.ts`: `type TimeOverrides = Record<string, ParamValue> |
    undefined`; `interface Typed<T>` is re-used from
    `gratuity-params.ts`; `interface TimeParams` with one field per
    key above except the last, named without the `time` prefix in
    camel case (`maxNormalMinutesPerDay: Typed<number>`, ...,
    `nightWindow: Typed<{ start: number; end: number }>` in minutes
    from midnight, `weekBasis: Typed<"iso-monday">`, `leaveYear:
    Typed<"calendar-year">`, `holidayWorkCompensated: Typed<boolean>`);
    `loadTimeParams(pack: RulePack, ov: TimeOverrides): TimeParams`;
    `loadWfhRetention(pack: RulePack, companyDays: number | null):
    Typed<number>` (passes `{ timeWfhRetentionDays: companyDays }` as
    the override; `null` throws `UNSOURCED_PARAM`; below 1 throws
    `INVALID_PARAM`). Integer params use a local `minutesParam` that
    returns `Typed<number>` (safe integer, at least 0).
  - `intervals.ts`: `interface Interval { start: number; end: number }`
    (minutes from 00:00 Dubai of the sheet's date, `end > start`,
    values from -1440 to 2880); `mergeIntervals(xs): Interval[]`
    (sorted, overlaps and touching joined); `totalMinutes(xs): number`;
    `overlapMinutes(a: Interval[], b: Interval[]): number`;
    `outside(xs: Interval[], window: Interval): Interval[]`;
    `tail(xs: Interval[], minutes: number): Interval[]` (the last
    `minutes` of the merged timeline); `nightWindows(w: { start;
    end }): Interval[]` returns `[k*1440 + start, k*1440 + 1440 + end]`
    for k = -1..1 (so `22:00-04:00` gives `[-120, 240]`, `[1320,
    1680]`, `[2760, 3120]`); `parseHhmm("HH:MM"): number` (throws
    `INVALID_TIME` outside `00:00`..`23:59`).
  - `types.ts`:
    `ShiftSlot { start: number; end: number; breakMinutes: number }`
    (`end > start`, `end - start <= 1440`);
    `LeavePart = "none" | "am" | "pm" | "full"`;
    `DayInput { date: string; kind: "work" | "rest" | "holiday";
    shift: ShiftSlot | null; worked: Interval[]; openRecord: boolean;
    ramadan: boolean; leave: LeavePart }`;
    `TimeFlag { code: string; dates: string[]; detail: Record<string,
    string>; rule: TraceRule | null }`;
    `DaySheet { date; kind; scheduledMinutes: number; workedMinutes:
    number; lateMinutes: number; earlyLeaveMinutes: number;
    overtimeMinutes: number; overtimeNightMinutes: number;
    restDayWorkMinutes: number; flags: TimeFlag[]; trace: TraceLine[] }`;
    `RosterDayInput { date: string; slot: ShiftSlot | "rest" | null;
    holiday: boolean; companyRestDay: boolean; ramadan: boolean;
    onApprovedLeave: boolean }`;
    `RosterCheckInput { employeeId: string; days: RosterDayInput[] }`
    (dates consecutive, ascending; else `INVALID_ROSTER_DAYS`).
  - `computeDaySheet(day: DayInput, p: TimeParams): DaySheet`, rules:
    1. `worked` excludes an open record (the API passes only closed
       intervals and sets `openRecord`); `clocked =
       totalMinutes(mergeIntervals(worked))`.
    2. `scheduledMinutes`: shift net (`end - start - breakMinutes`);
       `am` or `pm` leave: `floor(net / 2)`; `full` leave, no shift,
       rest or holiday: 0.
    3. `workedMinutes`: with a shift, no half-day leave and `clocked >
       breakMinutes`: `clocked - breakMinutes` (rostered break assumed
       taken, convention); otherwise `clocked`.
    4. `lateMinutes` = `max(0, firstStart - shift.start)` unless leave
       is `am` or `full`; `earlyLeaveMinutes` = `max(0, shift.end -
       lastEnd)` unless leave is `pm` or `full`; both 0 with no shift
       or nothing worked.
    5. Rest or holiday: `restDayWorkMinutes = workedMinutes`, overtime
       0. `full` leave with work: overtime 0, flag `WORK_ON_LEAVE_DAY`
       (detail `minutes`).
    6. Work day with a shift: `overtimeMinutes = max(0, workedMinutes -
       scheduledMinutes)`; `overtimeNightMinutes = min(overtime,
       overlapMinutes(outside(worked, [shift.start, shift.end]),
       nightWindows))`.
    7. Work day without a shift: limit = `maxNormalMinutesPerDay` minus
       `ramadanReductionMinutes` when `ramadan`; `overtime = max(0,
       workedMinutes - limit)`; night = `overlapMinutes(tail(worked,
       overtime), nightWindows)`.
    8. Flags: `OVERTIME_DAILY_CAP_EXCEEDED` when overtime >
       `overtimeMaxMinutesPerDay` (detail `minutes`; rule
       `timeOvertimeMaxMinutesPerDay`; overtime is never cut);
       `MISSED_CLOCK_OUT` when `openRecord` (no rule).
    9. Trace: one line per minute field, ids `time.scheduled`,
       `time.worked`, `time.late`, `time.early`, `time.overtime`,
       `time.overtimeNight`, `time.restDayWork`; `rules` carry the
       normal-hours, Ramadan and night-window rules where used.
  - `periodHourFlags(days: { date: string; workedMinutes: number }[],
    p: TimeParams): TimeFlag[]`: `HOURS_144_IN_3_WEEKS` for each
    maximal run of 21-day windows whose total exceeds
    `maxMinutesPer3Weeks` (dates = the window's first and last date).
  - `checkRoster(input: RosterCheckInput, p: TimeParams): TimeFlag[]`
    codes: `NO_WEEKLY_REST` (seven consecutive days all with shifts;
    dates the seven), `SHIFT_OVER_NORMAL_HOURS` (net >
    `maxNormalMinutesPerDay`, or > that minus the Ramadan reduction on
    a Ramadan day, rule accordingly), `WEEK_OVER_48_HOURS` (ISO week
    Monday to Sunday net total > `maxNormalMinutesPerWeek`),
    `NO_BREAK_AFTER_5_HOURS` (gross `end - start >
    maxConsecutiveWorkMinutes` and `breakMinutes <
    minRestBreakMinutes`), `HOLIDAY_SHIFT` (rule
    `timeHolidayWorkCompensated`), `CONSECUTIVE_REST_DAYS_WORKED`
    (more than `maxConsecutiveRestDaysWorked` consecutive company rest
    days with shifts), `ON_APPROVED_LEAVE` (no rule). Flags never
    block anything.

- [ ] **Step 1: Write the failing tests**

`time-pack.test.ts`: `loadTimeParams(TIME_PACKS[0], undefined)` gives
`maxNormalMinutesPerDay.v === 480`, `.rule.status === "official"`,
`nightWindow.v` deep-equal `{ start: 1320, end: 240 }`; every `o` row
of the table has status `official` and its source id; `weekBasis` and
`leaveYear` are `convention`; `loadWfhRetention(pack, null)` throws
`UNSOURCED_PARAM`; `loadWfhRetention(pack, 90).v === 90` and its rule
has `overridden: true`; `loadWfhRetention(pack, 0)` throws
`INVALID_PARAM`; `Object.isFrozen(TIME_PACKS[0].params)`; no key is
shared with any other exported pack (`GRATUITY_PACKS`, and Plan 5's or
Plan 8's packs when present, checked by iterating the engine's exports
for arrays of `RulePack`).

`time-intervals.test.ts`: `mergeIntervals([[10,20],[20,30],[5,8]])` is
`[[5,8],[10,30]]`; `overlapMinutes([[1300,1400]], nightWindows(...))`
is 80; `tail([[600,700],[800,900]], 150)` is `[[650,700],[800,900]]`;
`outside([[180,840]], {start: 360, end: 840})` is `[[180,360]]`;
`parseHhmm("24:00")` throws `INVALID_TIME`; fast-check: `totalMinutes(
mergeIntervals(xs)) <= sum of lengths` and merge is idempotent.

`time-day-sheet.test.ts` (shift values in minutes from midnight):
- `full_shift_no_overtime`: shift 540-1080 break 60, worked
  `[[540,1080]]`: scheduled 480, worked 480, overtime 0.
- `overtime_after_shift_with_night`: shift 840-1320 break 0, worked
  `[[840,1440]]`: overtime 120, night 120.
- `night_overtime_across_midnight` (Review Focus 2): shift 960-1440
  break 0, worked `[[960,1560]]`: worked 600, overtime 120, night 120,
  `date` unchanged.
- `early_start_overtime_partly_night`: shift 360-840 break 0, worked
  `[[180,840]]`: overtime 180, night 60.
- `no_shift_overtime_tail`: no shift, worked `[[600,1380]]`: overtime
  300, night 60.
- `ramadan_no_shift_limit_reduced`: no shift, `ramadan`, worked
  `[[540,960]]`: overtime 60, trace `time.overtime` cites
  `timeRamadanReductionMinutes`.
- `rest_day_work`: kind `rest`, worked `[[540,780]]`:
  `restDayWorkMinutes` 240, overtime 0.
- `late_and_early`: shift 540-1080 break 60, worked `[[560,1060]]`:
  late 20, early 20, overtime 0.
- `half_day_am_leave_halves_schedule`: leave `am`, shift 540-1080
  break 60, worked `[[840,1080]]`: scheduled 240, worked 240, late 0.
- `overtime_cap_flag_never_cuts`: shift 540-1020 break 0, worked
  `[[540,1200]]`: overtime 180 and flag `OVERTIME_DAILY_CAP_EXCEEDED`
  with `detail.minutes === "180"`.
- `open_record_flag_not_overtime` (Review Focus 4): `openRecord: true`,
  worked `[]`: overtime 0, flag `MISSED_CLOCK_OUT`.
- `work_on_full_leave_day_flagged`: leave `full`, worked
  `[[540,600]]`: overtime 0, flag `WORK_ON_LEAVE_DAY`.
- `day_sheet_invariants` (fast-check, 200 runs over random shifts and
  up to 3 intervals): `0 <= night <= overtime <= workedMinutes`, same
  input twice gives deep-equal output.
- `three_week_cap`: 21 consecutive days of 420 minutes give one
  `HOURS_144_IN_3_WEEKS` flag; 20 days give none.

`time-roster.test.ts`:
- `seven_shifts_no_weekly_rest`: 7 days of 540-1020 break 60 give
  `NO_WEEKLY_REST` with the 7 dates; a `"rest"` on day 4 gives none.
- `shift_over_normal_hours`: 540-1140 break 60 (net 540) flagged; on a
  Ramadan day 540-1020 break 60 (net 420) flagged with rule key
  `timeRamadanReductionMinutes`.
- `week_over_48_hours`: Monday to Friday 480-1140 break 60 (net 600)
  gives one `WEEK_OVER_48_HOURS`.
- `no_break_after_5_hours`: 540-900 break 30 flagged; break 60 not;
  540-840 break 0 not.
- `holiday_and_leave_flags`: a shift on a holiday gives `HOLIDAY_SHIFT`
  with rule `timeHolidayWorkCompensated`; on approved leave gives
  `ON_APPROVED_LEAVE`.
- `consecutive_rest_days_worked`: shifts on 3 consecutive company rest
  days flagged; on 2 not.
- `roster_days_must_be_consecutive`: a gap throws
  `INVALID_ROSTER_DAYS`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/engine test time`.
  Expected: FAIL, modules not found.
- [ ] **Step 3: Implement** the files above. Pure core: no clock,
  `Date`, file or environment access (the engine purity test covers
  `src/time/` and `src/rules/` automatically).
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(engine): ae-time pack, day sheets, roster
  checks`.

### Task 2: Leave counting, accrual, balances and policy warnings

Law task: fresh per-task review.

**Files:**
- Create: `packages/engine/src/time/leave-count.ts`,
  `src/time/leave-accrual.ts`
- Modify: `packages/engine/src/time/types.ts`, `src/index.ts`
- Test: `packages/engine/tests/time-leave-count.test.ts`,
  `tests/time-leave-accrual.test.ts`

**Interfaces:**
- Consumes: Task 1 `TimeParams`, `TimeFlag`; `addDays`, `daysBetween`,
  `parseIsoDate`, `daysInMonth`, `formatIsoDate`.
- Produces (all counts are whole half-days, "halves", so no fractions):
  - `type DayPart = "full" | "am" | "pm"`;
    `LeaveSpan { start: string; end: string; startPart: DayPart;
    endPart: DayPart }`; `DayBasis = "calendar" | "working"`;
    `LeaveCalendar { restDates: ReadonlySet<string>; holidayDates:
    ReadonlySet<string> }`.
  - `countLeaveHalves(span: LeaveSpan, basis: DayBasis, cal:
    LeaveCalendar): { halves: number; dates: { date: string; halves:
    1 | 2; part: DayPart }[]; skipped: { date: string; why:
    "rest-day" | "holiday" }[] }`. Rules: one day needs `startPart ===
    endPart` (2 halves for `full`, 1 for `am` or `pm`); several days
    need `startPart` in `full | pm` and `endPart` in `full | am` (else
    `INVALID_DAY_PART`); `end < start` throws `INVALID_DATE`;
    `calendar` counts every date (holidays included, as Plan 3);
    `working` skips dates in `restDates` (why `rest-day`) and then
    `holidayDates` (why `holiday`); a part on a skipped date is
    dropped.
  - `LeaveAccrualPolicy { accrual: "upfront" | "monthly"; annualDays:
    number; joiningYearProRata: boolean }`.
  - `accruedHalves(p: LeaveAccrualPolicy, joiningDate: string, year:
    number, asOf: string): number`. Upfront: joined after 31 December
    of `year`: 0; joined in `year` with pro-rata: `floor(annualDays * 2
    * months / 12)` where `months = 13 - joinMonth` when joined on the
    1st, else `12 - joinMonth`; otherwise `annualDays * 2`. Monthly:
    `floor(annualDays * 2 * credited / 12)` where `credited` counts
    the months m of `year` with `joiningDate <= first day of m` and
    `last day of m <= asOf` (a part month is not credited; convention).
  - `BalanceInput { accruedHalves: number; carriedHalves: number;
    carriedExpiresOn: string | null; adjustmentHalves: number; taken:
    { date: string; halves: number }[]; pendingHalves: number; asOf:
    string }`; `balanceHalves(b): { takenHalves: number;
    carriedUsedHalves: number; expiredHalves: number; availableHalves:
    number }`: `carriedUsed = min(carried, taken on or before
    carriedExpiresOn, or all taken when null)`; `expired = carried -
    carriedUsed` when `asOf > carriedExpiresOn`, else 0; `available =
    accrued + carried - expired + adjustments - taken - pending`
    (carried days are used first; convention).
  - `carryOverHalves(remainingHalves: number, capHalves: number):
    number` = `min(max(0, remaining), cap)`.
  - `LeavePolicyFacts { payrollKind: "annual" | "sick" | "maternity" |
    "unpaid" | "other-paid"; annualDays: number | null; accrual;
    dayCount: DayBasis; carryOverMaxDays: number | null }`;
    `checkLeavePolicy(f: LeavePolicyFacts, p: TimeParams): TimeFlag[]`
    codes: `ANNUAL_BELOW_STATUTORY` (annual, calendar, `annualDays <
    annualLeaveMinDays`), `ANNUAL_BASIS_NOT_COMPARED` (annual, working
    basis; the law's 30 days are not compared with working days),
    `MONTHLY_BELOW_FIRST_YEAR_RATE` (annual, monthly, `annualDays / 12 <
    firstYearDaysPerMonth`, compared as `annualDays < 12 * that`),
    `CARRY_OVER_ABOVE_HALF` (`carryOverMaxDays * 10000 > annualDays *
    carryOverMaxShareBps`; ER 19(1) speaks of the worker's carry
    forward; whether a more generous policy is allowed is not in the
    note), `SICK_BELOW_STATUTORY` (sick, `annualDays` not null and
    below `sickLeaveMaxDaysPerYear`), `MATERNITY_IS_PER_BIRTH`
    (maternity with `annualDays` not null; Art 30 grants leave per
    birth). Each carries its rule; warnings never block.

- [ ] **Step 1: Write the failing tests**

`time-leave-count.test.ts`:
- `calendar_three_full_days`: `2026-03-01..03`, full/full: 6 halves.
- `working_skips_rest_and_holiday`: same span, `restDates`
  `{2026-03-02}`, `holidayDates` `{2026-03-03}`: 2 halves, skipped
  lists both with their reasons; on `calendar` the holiday counts (6).
- `single_am_is_one_half`, `pm_start_am_end_three_days` (4 halves:
  1 + 2 + 1).
- `invalid_parts`: one day `am`/`pm` and several days starting `am`
  both throw `INVALID_DAY_PART`.
- `leap_span`: `2028-02-28..2028-03-01` calendar full: 6.
- `all_skipped_is_zero`: two rest dates on `working`: 0 halves.
- `calendar_matches_plan3_days` (fast-check): for any valid span with
  full parts, `halves === 2 * (daysBetween(start, end) + 1)`.

`time-leave-accrual.test.ts`:
- `upfront_full_year`: joined 2020-05-10, 30 days: 60 halves.
- `upfront_pro_rata`: joined `2026-04-01`: 45; `2026-04-02`: 40;
  joined `2027-01-01` for 2026: 0.
- `monthly_credits_whole_months`: joined 2020-01-01, asOf
  `2026-03-31`: 15; asOf `2026-03-30`: 10; joined `2026-02-15`, asOf
  `2026-05-31`: 15 (March to May); 22 days, asOf `2026-06-30`: 22.
- `balance_carried_first_then_expires`: accrued 60, carried 10
  expiring `2026-03-31`, taken 4 on `2026-02-10` and 8 on
  `2026-05-01`, pending 2: at `2026-06-01` carriedUsed 4, expired 6,
  available 50; at `2026-03-01` expired 0, available 56.
- `carry_over_cap`: `carryOverHalves(-4, 10)` 0, `(7, 10)` 7, `(30,
  10)` 10.
- `policy_warnings`: annual calendar 22 days gives
  `ANNUAL_BELOW_STATUTORY` with rule key `timeAnnualLeaveMinDays`;
  annual working 22 gives `ANNUAL_BASIS_NOT_COMPARED` only; monthly
  calendar 20 gives `ANNUAL_BELOW_STATUTORY` and
  `MONTHLY_BELOW_FIRST_YEAR_RATE`; carry-over 16 of 30 gives
  `CARRY_OVER_ABOVE_HALF`, 15 of 30 none; sick 60 gives
  `SICK_BELOW_STATUTORY`; maternity with 60 gives
  `MATERNITY_IS_PER_BIRTH`; annual calendar 30, upfront, no carry-over:
  `[]`.
- `balance_identity` (fast-check): `available + taken + pending +
  expired === accrued + carried + adjustments`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/engine test leave`.
  Expected: FAIL.
- [ ] **Step 3: Implement** `leave-count.ts` and `leave-accrual.ts`.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(engine): leave counting and accrual`.

### Task 3: Time route registry, settings, holiday and Ramadan calendar, work sites, profiles

**Files:**
- Create: `packages/contract/src/routes-time.ts`,
  `packages/contract/src/time-settings.ts`
- Modify: `packages/contract/src/routes.ts` (if Plan 3's list is not
  yet named `CORE_ROUTES` by another plan, rename it; then append
  `...TIME_ROUTES` to the `ROUTES` concatenation, keeping any other
  plan's lists), `src/errors.ts`, `src/examples.ts`, `src/index.ts`
- Create: `packages/api/migrations/901_time_settings.sql`,
  `packages/api/src/audit/time-audit.ts`, `src/time/settings.ts`,
  `src/time/calendar.ts`, `src/time/sites.ts`, `src/time/profiles.ts`,
  `src/time/range.ts`, `src/routes/time-settings.ts`
- Modify: `packages/api/src/app.ts` (register),
  `tests/leak.test.ts` (id map), `tests/conformance.test.ts` (one
  happy-path row per new route)
- Create: `packages/api/tests/helpers/seed-time.ts`
- Test: `packages/contract/tests/routes-time.test.ts`,
  `packages/api/tests/time-settings.test.ts`

**Interfaces:**
- Consumes: Plan 3 `RouteDef`, `Role`, `Id`, `IsoDate`, `Timestamp`,
  `TraceLine`, `register`, `ReqCtx`, `appendAudit`, `AuditInput`,
  `viewerScope`, `ApiError`, `createTestDb`, `makeApp`, `call`,
  `seedCompany`, `dubaiDate`.
- Produces (contract, exported from `index.ts`):
  - `Weekday = z.enum(["mon","tue","wed","thu","fri","sat","sun"])`;
    `Hhmm` (`^([01]\d|2[0-3]):[0-5]\d$`); `GeoPoint { lat: number
    -90..90; lng: number -180..180 }`; `TraceRuleView` (same fields as
    `TraceRule`); `TimeFlagView { code; dates: IsoDate[]; detail:
    Record<string,string>; rule: TraceRuleView | null }`.
  - `TimeSettings { restDays: Weekday[] (unique, max 6; `[]` means not
    set); graceMinutes: int 0..120; lateFlagThreshold: int 1..31;
    restAdjacentAbsenceThreshold: int 1..31; shortSickSpellThreshold:
    int 1..31; accuracyAllowanceM: int 0..500; productDefaults:
    string[] }`; `TimeSettingsUpdate` (strict partial without
    `productDefaults`). Product defaults (not law): grace 5, late 3,
    adjacent 2, sick spells 3, accuracy 50; `restDays` has no default.
  - `Holiday { id; date; name 1..100; nameAr: string | null; kind:
    "public" | "company"; status: "active" | "removed" }`;
    `HolidayCreate { date; name; nameAr?; kind }`; `HolidayUpdate {
    name?; nameAr?: string | null; status? }`; `YearQuery { year: int
    2000..2100 }`.
  - `SpecialPeriod { id; kind: "ramadan"; name; start; end; status }`
    (1 to 40 days, product bound); `SpecialPeriodCreate`,
    `SpecialPeriodUpdate { name?; status? }`.
  - `WorkSite { id; name; point: GeoPoint; radiusM: int 25..5000;
    status }`; `WorkSiteCreate`, `WorkSiteUpdate` (partial).
  - `TimeProfile { employeeId; workMode: "site" | "remote" | "hybrid";
    geofenceMode: "off" | "record" | "require"; workSiteIds: Id[]
    (max 20); wfhTracked: boolean; shiftWorker: boolean }`;
    `TimeProfileUpdate` (all but `employeeId`).
  - `TIME_ROUTES: readonly RouteDef[]`, this task's 13 (all
    `auth: "tenant"`):
    `getTimeSettings GET /v1/time/settings` (all roles),
    `updateTimeSettings PUT /v1/time/settings` (owner, hr),
    `listHolidays GET /v1/time/holidays` (all, query `YearQuery`),
    `createHoliday POST /v1/time/holidays` (owner, hr; 201),
    `updateHoliday PATCH /v1/time/holidays/{id}` (owner, hr),
    `listSpecialPeriods GET /v1/time/special-periods` (all, `YearQuery`),
    `createSpecialPeriod POST /v1/time/special-periods` (owner, hr;
    201), `updateSpecialPeriod PATCH /v1/time/special-periods/{id}`
    (owner, hr), `listWorkSites GET /v1/time/work-sites` (owner, hr,
    manager), `createWorkSite POST /v1/time/work-sites` (owner, hr;
    201), `updateWorkSite PATCH /v1/time/work-sites/{id}` (owner, hr),
    `getTimeProfile GET /v1/employees/{id}/time-profile` (all, scoped),
    `updateTimeProfile PUT /v1/employees/{id}/time-profile` (owner,
    hr).
  - Error codes (status): `HOLIDAY_EXISTS` 409, `PERIOD_OVERLAP` 409,
    `WORK_SITE_REQUIRED` 422, `RANGE_TOO_LONG` 400.
  - `EXAMPLES` entries for every new response schema (fixture names
    only, such as "Company Day A"; coordinates `{ lat: 1.5, lng: 1.5 }`).
- Produces (api):
  - Migration 901: `company_time_settings(company_id pk, rest_days
    text[], grace_minutes, late_flag_threshold,
    rest_adjacent_absence_threshold, short_sick_spell_threshold,
    accuracy_allowance_m, updated_at)`, `holidays(id, company_id, date,
    name, name_ar, kind, status)` with a partial unique index on
    `(company_id, date) WHERE status = 'active'`, `special_periods(id,
    company_id, kind, name, start_date, end_date, status)`,
    `work_sites(id, company_id, name, lat_e6 int, lng_e6 int, radius_m,
    status)`, `employee_time_profiles(company_id, employee_id pk,
    work_mode, geofence_mode, work_site_ids uuid[], wfh_tracked,
    shift_worker)`; RLS as Plan 3; grants select, insert, update.
  - `time-audit.ts`: `TIME_SENSITIVE_KEYS = ["lat","lng","point",
    "location","coordinates","distance","category","categories",
    "note","reason","minutes"]` and `timeAudit(tx: Db, e: AuditInput):
    Promise<AuditEvent>` (throws `AUDIT_SENSITIVE_DATA` on a key in
    this list or Plan 3's `SENSITIVE_KEYS`, then `appendAudit`). Every
    Plan 9 service audits through it.
  - `getTimeSettings(tx, companyId): Promise<TimeSettings>` (row or
    product defaults; never throws).
  - `CompanyCalendar { holidays: Map<string, Holiday>; ramadan:
    { start: string; end: string }[]; restDays: Weekday[] }`;
    `loadCalendar(tx, companyId, from: string, to: string):
    Promise<CompanyCalendar>` (active rows only); `weekdayOf(date:
    string): Weekday` (from `toDayNumber`, no `Date`);
    `isCompanyRestDay(cal, date): boolean`; `isRamadan(cal, date)`.
  - `loadProfile(tx, companyId, employeeId): Promise<TimeProfile>`
    (row or defaults `site`, `off`, `[]`, false, false).
  - `assertRange(from: string, to: string, maxDays: number): void`
    (`to < from` 400 `VALIDATION_FAILED`, longer than `maxDays` 400
    `RANGE_TOO_LONG`) in `range.ts`; used by every range route with
    62 days unless stated.
  - Rules: one active holiday per date (409 `HOLIDAY_EXISTS`); special
    periods of one kind may not overlap (409 `PERIOD_OVERLAP`); date
    and kind of a holiday never change (remove and re-create);
    `geofenceMode` other than `off` needs at least one active work site
    (422 `WORK_SITE_REQUIRED`); `getTimeProfile` follows
    `viewerScope` (else 404).
  - Audit: `time.settings.updated` (`data: { changed }`),
    `holiday.created`, `holiday.updated`, `period.created`,
    `period.updated`, `site.created`, `site.updated`,
    `profile.updated` (`data: { employeeId, changed }`).
  - `seed-time.ts`: `seedTime(app, seeded)` starts here (rest days
    `["wed"]`, an arbitrary fixture value, one holiday "Company Day A" on
    `2026-03-20`, one work site "Site A" at `{ lat: 1.5, lng: 1.5 }`
    radius 200, profiles for the seeded employee and report) and
    returns `{ holidayId, siteId }`; later tasks add fields.

- [ ] **Step 1: Write the failing tests**

`routes-time.test.ts`: `TIME_ROUTES.map((r) => r.id)` deep-equals the
literal `TIME_ROUTE_IDS` array in the test (this task: the 13 ids above;
each later task appends its ids); every time route has `auth:
"tenant"`; every `TIME_ROUTES` entry is in `ROUTES` (membership, not a
total count, so other plans' lists can join); no `(method, path)` pair
repeats in `ROUTES`; no route in `ROUTES` has a path matching
`/screenshot|screen|keystroke|keylog|capture|webcam|camera|microphone/i`
and none has method `DELETE`.

`time-settings.test.ts`:
- `settings_defaults_labelled`: a fresh company's `GET
  /v1/time/settings` has `restDays: []` and `productDefaults` listing
  the five defaulted keys; after `PUT { graceMinutes: 10 }` the list no
  longer has `graceMinutes`; employee `PUT` gives 403 `FORBIDDEN`.
- `settings_reject_unknown_keys`: `PUT { screenshots: true }` gives 400
  `VALIDATION_FAILED` (strict schema).
- `holiday_one_per_date`: second active holiday on `2026-03-20` gives
  409 `HOLIDAY_EXISTS`; after `status: "removed"` a new one succeeds;
  `listHolidays?year=2026` returns both rows with their statuses.
- `no_builtin_calendar`: a fresh company lists zero holidays and zero
  special periods for every year from 2024 to 2030.
- `special_period_overlap`: two overlapping `ramadan` periods give 409
  `PERIOD_OVERLAP`; a 41-day period gives 400.
- `profile_geofence_needs_site`: `geofenceMode: "require"` with no
  sites gives 422 `WORK_SITE_REQUIRED`; with the seeded site succeeds;
  a manager reading a non-report's profile gets 404.
- `time_audit_rejects_coordinates`: `timeAudit` with `data: { lat:
  "1" }` throws `AUDIT_SENSITIVE_DATA`; the `site.created` audit row's
  `data` text has no coordinate.

- [ ] **Step 2: Run** `pnpm --filter @payroll/contract test` and
  `pnpm --filter @payroll/api test time-settings`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS, including Plan 3's
  conformance, leak and RLS catalog tests over the new routes and
  tables.
- [ ] **Step 5: Commit** `feat(api): time settings, calendar, sites`.

### Task 4: Shifts, rosters, publishing and swap requests

**Files:**
- Create: `packages/contract/src/time-rosters.ts`
- Modify: contract `routes-time.ts`, `errors.ts`, `examples.ts`,
  `index.ts`, `tests/routes-time.test.ts`
- Create: `packages/api/migrations/902_rosters.sql`,
  `src/time/shifts.ts`, `src/time/rosters.ts`,
  `src/time/roster-flags.ts`, `src/time/swaps.ts`,
  `src/time/decide.ts`, `src/routes/time-rosters.ts`
- Modify: api `src/app.ts`, `tests/helpers/seed-time.ts`,
  `tests/leak.test.ts`, `tests/conformance.test.ts`
- Test: `packages/api/tests/rosters.test.ts`, `tests/swaps.test.ts`

**Interfaces:**
- Consumes: Task 1 `checkRoster`, `TIME_PACKS`, `loadTimeParams`,
  `parseHhmm`; Task 3 `loadCalendar`, `isCompanyRestDay`, `isRamadan`,
  `assertRange`, `timeAudit`, `TimeFlagView`; Plan 3 `viewerScope`,
  `leaveDays`.
- Produces (contract):
  - `ShiftTemplate { id; name 1..60; nameAr: string | null; start:
    Hhmm; end: Hhmm; breakMinutes: int 0..240; crossesMidnight:
    boolean; netMinutes: int; status: "active" | "retired" }`
    (`crossesMidnight` and `netMinutes` derived; `end === start` is
    refused as 400); `ShiftTemplateCreate`, `ShiftTemplateUpdate`.
  - `RosterSlot = { kind: "shift"; shiftTemplateId: Id; start: Hhmm;
    end: Hhmm; breakMinutes: int; netMinutes: int } | { kind: "rest" }`;
    `RosterDay { employeeId; date; draft: RosterSlot | null;
    published: RosterSlot | null; publishedAt: Timestamp | null;
    changedSincePublish: boolean; version: int }`;
    `RosterQuery { from; to; employeeId?; departmentId? }`;
    `RosterPut { entries: { employeeId; date; slot: { kind: "shift";
    shiftTemplateId: Id } | { kind: "rest" } | null }[] (1..500) }`;
    `RosterResult { days: RosterDay[]; flags: (TimeFlagView & {
    employeeId: Id })[] }`; `RotationApply { employeeIds: Id[] (1..100);
    from; to; pattern: (Id | null)[] (1..28; null is a rest day) }`;
    `RosterPublish { from; to; employeeIds?: Id[] }`;
    `PublishResult { published: int; flags: (TimeFlagView & {
    employeeId: Id })[] }`.
  - `SwapStatus = z.enum(["pending-peer","pending-approval","approved",
    "rejected","declined","cancelled"])`; `SwapRequest { id;
    requesterEmployeeId; date; peerEmployeeId; peerDate; status;
    requesterSlot: RosterSlot; peerSlot: RosterSlot; flagsAfter:
    (TimeFlagView & { employeeId })[]; decidedBy: Id | null; decidedAt:
    Timestamp | null; createdAt }`; `SwapCreate { date; withEmployeeId:
    Id; withDate?: IsoDate }`; `SwapRespond { accept: boolean }`;
    `SwapDecision { note?: string 1..500 }`.
  - Routes appended to `TIME_ROUTES` (13): `listShiftTemplates GET
    /v1/time/shifts` (all), `createShiftTemplate POST /v1/time/shifts`
    (owner, hr; 201), `updateShiftTemplate PATCH /v1/time/shifts/{id}`
    (owner, hr), `getRoster GET /v1/time/roster` (all; query
    `RosterQuery`; response `RosterDay[]`), `putRosterEntries PUT
    /v1/time/roster` (owner, hr, manager; `RosterResult`),
    `applyRotation POST /v1/time/roster/rotation` (owner, hr, manager;
    `RosterResult`), `publishRoster POST /v1/time/roster/publish`
    (owner, hr, manager; `PublishResult`), `listSwapRequests GET
    /v1/time/swaps` (all; `SwapRequest[]`), `createSwapRequest POST
    /v1/time/swaps` (all; 201), `respondSwapRequest POST
    /v1/time/swaps/{id}/respond` (all), `approveSwapRequest POST
    /v1/time/swaps/{id}/approve` (owner, hr, manager),
    `rejectSwapRequest POST /v1/time/swaps/{id}/reject` (owner, hr,
    manager), `cancelSwapRequest POST /v1/time/swaps/{id}/cancel`
    (all); the swap routes respond `SwapRequest`.
  - Error codes: `SHIFT_RETIRED` 422, `SWAP_SELF` 422, `SWAP_IN_PAST`
    422, `SWAP_ON_LEAVE` 422, `SWAP_NO_PUBLISHED_ENTRY` 422,
    `SWAP_NOT_PENDING` 409, `SWAP_ENTRY_CHANGED` 409, `NOT_SWAP_PARTY`
    403.
- Produces (api):
  - Migration 902: `shift_templates(id, company_id, name, name_ar,
    start_min, end_min, break_minutes, status)`,
    `roster_entries(company_id, employee_id, date, draft_kind,
    draft_shift_template_id, published_kind, published_template_id,
    published_start_min, published_end_min, published_break_minutes,
    published_at, version, pk(company_id, employee_id, date))`,
    `swap_requests(id, company_id, requester_employee_id, date,
    peer_employee_id, peer_date, status, requester_version,
    peer_version, requested_by, decided_by, decided_at, created_at)`;
    RLS, grants as Plan 3. Published shifts store a time snapshot, so
    editing a template changes drafts only.
  - `assertTimeDecidable(ctx: ReqCtx, s: { employeeIds: string[];
    requestedByUserId: string; status: string }, pendingStatus:
    string | null,
    notPendingCode: ErrorCode): Promise<void>` in `decide.ts`, checks
    in this order: role owner, hr or manager (else 403 `FORBIDDEN`);
    the caller may not be one of those employees nor the requester (403
    `SOD_VIOLATION`); a manager needs every employee in `employeeIds`
    as a direct report (else 404); status must equal `pendingStatus`
    (409 `notPendingCode`; `pendingStatus` `null` skips this check).
    Used by Tasks 4, 5 and 6.
  - `slotToShiftSlot(slot: RosterSlot): ShiftSlot | "rest"`;
    `publishedSlotOn(tx, companyId, employeeId, date): Promise<{ slot:
    RosterSlot | null; version: number }>` (used by Tasks 5, 6, 8).
  - `rosterFlagsFor(tx, companyId, employeeIds: string[], from, to):
    Promise<(TimeFlagView & { employeeId })[]>`: builds
    `RosterCheckInput` from draft-or-published slots over `from - 6` to
    `to + 6`, holidays, company rest days, Ramadan periods and approved
    full-day leave, and calls `checkRoster`.
  - Rules: managers write and publish only direct reports' entries
    (any other employee: 404 for the whole batch, nothing written); a
    retired template in a new entry gives 422 `SHIFT_RETIRED`; editing
    a published day leaves `published` unchanged and sets
    `changedSincePublish`; publishing copies draft to published
    (`null` clears it), stamps `publishedAt`, increments `version`;
    rotation cycles `pattern` from `from` to `to` into drafts; employees
    see only `published` (draft `null`) for themselves and their
    department; flags never block a write or a publish.
  - Swaps: requester is an employee with a published entry on `date`;
    peer is another employee (422 `SWAP_SELF`) with a published entry
    on `peerDate = withDate ?? date` (422 `SWAP_NO_PUBLISHED_ENTRY`);
    both dates on or after `dubaiDate(now)` (422 `SWAP_IN_PAST`);
    neither party on approved leave on its date (422 `SWAP_ON_LEAVE`).
    Only the peer responds (403 `NOT_SWAP_PARTY`): accept gives
    `pending-approval`, decline gives `declined`. Approval uses
    `assertTimeDecidable` with both employee ids and
    `pending-approval`; both entries' `version` must equal the stored
    versions (409 `SWAP_ENTRY_CHANGED`); applying exchanges both
    published and draft slots and increments versions in one
    transaction. Cancel: the requester while `pending-peer` or
    `pending-approval`. `flagsAfter` is computed on read for pending
    swaps as if applied. Visibility: the two parties, a manager of
    either, hr, owner; others 404.
  - Audit: `shift.created`, `shift.updated`, `roster.updated` (`data:
    { employeeCount, from, to }`), `roster.published`,
    `swap.requested`, `swap.accepted`, `swap.declined`,
    `swap.approved`, `swap.rejected`, `swap.cancelled`.
  - `seedTime` adds a template "Shift A" 09:00 to 17:00 break 60 and a
    published roster for the seeded employee and report for March 2026
    (rest on the company rest day), returning `shiftId`.

- [ ] **Step 1: Write the failing tests**

`rosters.test.ts`:
- `template_derives_net_and_midnight`: 22:00 to 06:00 break 30 has
  `crossesMidnight: true`, `netMinutes` 450.
- `manager_writes_reports_only`: a batch with one non-report gives 404
  and no row changes.
- `employee_sees_published_only`: after a draft edit, the employee's
  `GET /v1/time/roster` shows the old published slot and `draft:
  null`; hr sees both and `changedSincePublish: true`.
- `publish_snapshots_times`: publish, then edit the template's end to
  18:00: the published slot still ends at 17:00; the draft shows 18:00.
- `rotation_cycles_pattern`: pattern `[A, A, null]` over 7 days gives
  drafts A, A, rest, A, A, rest, A.
- `roster_flags_returned_not_blocking`: seven shifts in a row give 200
  with a `NO_WEEKLY_REST` flag whose rule status equals
  `loadTimeParams(TIME_PACKS[0]).minWeeklyRestDays.rule.status`.
- `roster_range_limit`: a 63-day range gives 400 `RANGE_TOO_LONG`.
- `retired_template_refused`: 422 `SHIFT_RETIRED`.

`swaps.test.ts`:
- `swap_happy_path`: employee requests a swap with the report's same
  date, the report accepts, hr approves: both published slots are
  exchanged, versions rise, audit has `swap.approved`.
- `swap_peer_only_responds`: the requester responding gives 403
  `NOT_SWAP_PARTY`.
- `swap_sod`: the manager who is one of the parties approving gives 403
  `SOD_VIOLATION`.
- `swap_entry_changed`: hr edits and republishes the peer's day after
  acceptance: approve gives 409 `SWAP_ENTRY_CHANGED` and nothing
  changes.
- `swap_on_leave_and_past`: a party on approved leave gives 422
  `SWAP_ON_LEAVE`; yesterday gives 422 `SWAP_IN_PAST`.
- `swap_visibility`: an unrelated employee gets 404 and does not see it
  in the list.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test rosters swaps`.
  Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): shifts, rosters and swaps`.

### Task 5: Browser and phone clock-in with geofence; corrections with approval

**Files:**
- Create: `packages/contract/src/time-clock.ts`
- Modify: contract `attendance.ts` (additive fields below),
  `routes.ts` (Plan 3 `clockIn` and `clockOut` gain an optional
  `body`), `routes-time.ts`, `errors.ts`, `examples.ts`, `index.ts`,
  `tests/routes-time.test.ts`, `tests/schemas.test.ts`
- Create: `packages/api/migrations/903_clock_corrections.sql`,
  `src/time/geofence.ts`, `src/time/locks.ts`,
  `src/time/corrections.ts`, `src/routes/time-corrections.ts`
- Modify: api `src/attendance/attendance.ts` (clock-in and clock-out
  bodies, lock check on Plan 3's hr correction), `src/app.ts`,
  `tests/helpers/seed-time.ts`, `tests/conformance.test.ts`,
  `tests/leak.test.ts`
- Test: `packages/api/tests/geofence.test.ts`,
  `tests/clock.test.ts`, `tests/corrections.test.ts`

**Interfaces:**
- Consumes: Task 3 `loadProfile`, `getTimeSettings`, `timeAudit`;
  Task 4 `assertTimeDecidable`, `publishedSlotOn`; Plan 3
  `dubaiDate`, `AttendanceRecord`, `AttendanceCorrection`.
- Produces (contract):
  - `ClockMethod = z.enum(["web","phone"])`; `WorkLocation =
    z.enum(["site","remote"])`; `ClockBody { method: ClockMethod;
    workLocation?: WorkLocation (default "site"); location?: GeoPoint &
    { accuracyM: int 0..100000 }; locationDecision?: "shared" |
    "declined" | "unavailable" }` (strict; Plan 3 clients that send no
    body still work: method is stored as `"unknown"`).
  - `CLOCK_LOCATION_NOTICE` (exact English, shown by the client before
    it reads a location at clock-in): "Your location is checked once
    against your work site and then discarded. Only inside or outside
    and the distance are kept."
  - `AttendanceRecord` gains optional fields (additive): `method?:
    "web" | "phone" | "unknown"`; `workLocation?: WorkLocation`;
    `geofence?: { mode: "off" | "record" | "require"; result: "inside"
    | "outside" | "no-location" | "not-applied"; siteId: Id | null;
    distanceM: int | null }`; `exception?: "outside-geofence" |
    "no-location" | null`. `source` widens to `"self" | "hr" |
    "correction"` (Ruling 7).
  - `CorrectionStatus = z.enum(["pending","approved","rejected",
    "cancelled"])`; `CorrectionRequest { id; employeeId; attendanceId:
    Id | null; date; clockIn: Timestamp; clockOut: Timestamp | null;
    reason: string; status; requestedBy: Id; decidedBy: Id | null;
    decidedAt: Timestamp | null; decisionNote: string | null }`;
    `CorrectionCreate { attendanceId?: Id; date; clockIn; clockOut:
    Timestamp | null; reason 3..500 }`; `CorrectionQuery {
    employeeId?; status? }`.
  - Routes appended (5): `listCorrectionRequests GET
    /v1/attendance/correction-requests` (all; `CorrectionRequest[]`),
    `createCorrectionRequest POST /v1/attendance/correction-requests`
    (all; 201), `approveCorrectionRequest POST
    /v1/attendance/correction-requests/{id}/approve` (owner, hr,
    manager), `rejectCorrectionRequest POST .../{id}/reject` (owner, hr,
    manager; body `{ note?: string 1..500 }`), `cancelCorrectionRequest
    POST .../{id}/cancel` (all); each responds `CorrectionRequest`.
  - Error codes: `REMOTE_NOT_ALLOWED` 422, `CORRECTION_NOT_PENDING`
    409, `CORRECTION_TIMES_INVALID` 422, `ATTENDANCE_OVERLAP` 409,
    `TIMESHEET_LOCKED` 409.
- Produces (api):
  - Migration 903: `attendance_records` gains `method`,
    `work_location`, `geofence_mode`, `geofence_result`,
    `geofence_site_id`, `geofence_distance_m`, `exception` (all
    nullable; no coordinate column); `source` check allows
    `correction`; `attendance_corrections(id, company_id, employee_id,
    attendance_id, date, clock_in, clock_out, reason, status,
    requested_by, decided_by, decided_at, decision_note, created_at)`.
  - `geofence.ts` (pure): `haversineMeters(a: GeoPoint, b: GeoPoint):
    number` (mean Earth radius 6371008.8 m); `GeofenceOutcome { result;
    siteId: string | null; distanceM: number | null }`;
    `evaluateGeofence(mode, sites: WorkSite[], reading: (GeoPoint & {
    accuracyM }) | null, allowanceM: number): GeofenceOutcome`: mode
    `off` gives `not-applied` and ignores the reading; no reading gives
    `no-location`; else the nearest active site, `inside` when
    `distance <= radiusM + min(accuracyM, allowanceM)`, distance rounded
    to the nearest 10 m.
  - Clock-in (extends Plan 3): `workLocation: "remote"` needs profile
    `workMode` `remote` or `hybrid` (422 `REMOTE_NOT_ALLOWED`) and
    always gives `not-applied`; site clock-in evaluates the geofence
    with the profile's sites; mode `require` with `outside` or
    `no-location` still creates the record and sets `exception` (never
    refused, Ruling 12); the reading is never stored, logged or
    audited. Clock-out accepts the same body and does not re-check the
    geofence.
  - `isDayLocked(tx, companyId, employeeId, date): Promise<boolean>`
    in `locks.ts`: true when a timesheet covering `date` is
    `submitted` or `approved` (Task 6 creates the table; until then it
    returns false through a guarded query on `to_regclass`). Plan 3's
    `PUT /v1/attendance/{id}` and every correction path give 409
    `TIMESHEET_LOCKED` on a locked day.
  - `correctAttendance(tx: Db, deps: AppDeps, ctx: ReqCtx, id: string,
    body: AttendanceCorrection): Promise<AttendanceRecord>` exported
    from Plan 3's `src/attendance/attendance.ts` (the body of its hr
    `PUT`), reused on approval.
  - Correction rules: an employee requests for self only (another
    employee: 403 `FORBIDDEN`); hr and owner use Plan 3's direct `PUT`
    instead (Ruling 11); `dubaiDate(clockIn) === date`, `clockOut >=
    clockIn` and at most 24 hours apart (else 422
    `CORRECTION_TIMES_INVALID`); the target record must belong to the
    employee and `date`; a new interval may not overlap another closed
    record that day (409 `ATTENDANCE_OVERLAP`); a locked day gives 409
    `TIMESHEET_LOCKED` at create and at approve. Approve uses
    `assertTimeDecidable` (`pending`, `CORRECTION_NOT_PENDING`); it
    updates the record through `correctAttendance` or inserts one with
    `source: "correction"`. Cancel: the requester while pending.
  - Audit: `attendance.clocked-in` is not added (Plan 3 audits none);
    `correction.requested` (`data: { date }`), `correction.approved`
    (`data: { date, attendanceId }`), `correction.rejected`,
    `correction.cancelled`; never the reason or note.

- [ ] **Step 1: Write the failing tests**

`geofence.test.ts`: two points 0.01 degree of latitude apart are 1110 m
after rounding; a reading 140 m from a 100 m site with accuracy 80 and
allowance 50 is `inside`, with accuracy 20 `outside` (the comparison
uses the unrounded distance); mode `off` with a
reading gives `not-applied`; nearest of two sites wins.

`clock.test.ts`:
- `clock_in_phone_inside_geofence`: profile `require` with Site A, a
  phone clock-in 50 m away gives `geofence.result "inside"`, `exception
  null`, `method "phone"`.
- `clock_in_outside_require_creates_exception`: 2 km away gives 201
  with `exception "outside-geofence"`; declined location gives
  `exception "no-location"`.
- `clock_coordinates_never_stored`: after a clock-in with sentinel
  coordinates `{ lat: 1.23456, lng: 1.65432 }`, no text of the
  `attendance_records` table, the audit rows or the captured log lines
  contains `1.23456` or `1.2345`.
- `geofence_off_ignores_location`: mode `off` gives `not-applied` and
  `distanceM null` even with a reading.
- `remote_needs_profile`: `workLocation "remote"` with `workMode
  "site"` gives 422 `REMOTE_NOT_ALLOWED`; with `hybrid`, 201 and
  `not-applied`.
- `clock_in_without_body_still_works`: Plan 3 style call gives 201 and
  `method "unknown"`.
- `clock_in_after_2000_utc_dated_next_dubai_day` (Review Focus 2):
  clock-in at `2026-03-01T20:30:00Z` has `date` `2026-03-02`; clock-out
  at `2026-03-02T00:30:00Z` keeps that date.

`corrections.test.ts`:
- `correction_new_record_after_approval`: the employee requests a
  missed day, the manager approves: a record with `source
  "correction"` exists; audit `correction.approved` data has no reason.
- `correction_updates_existing`: correcting an existing record changes
  its times through `correctAttendance`.
- `correction_rules`: times on another date give 422
  `CORRECTION_TIMES_INVALID`; overlapping another record gives 409
  `ATTENDANCE_OVERLAP`; requesting for a colleague gives 403.
- `correction_sod_and_scope`: a manager approving own request gives
  403 `SOD_VIOLATION`; a non-report's request gives 404; approving twice
  gives 409 `CORRECTION_NOT_PENDING`.
- `locked_day_refuses_edits`: with a stub row making the day locked
  (inserted directly once Task 6's table exists; until then this test
  is added in Task 6), Plan 3's hr `PUT` gives 409 `TIMESHEET_LOCKED`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test geofence clock
  corrections`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): geofenced clock-in, corrections`.

### Task 6: Timesheets, overtime review and payroll time inputs

Pay-input task: fresh per-task review.

**Files:**
- Create: `packages/contract/src/time-timesheets.ts`,
  `packages/contract/src/time-pay-inputs.ts`
- Modify: contract `routes-time.ts`, `errors.ts`, `examples.ts`,
  `index.ts`, `tests/routes-time.test.ts`
- Create: `packages/api/migrations/904_timesheets.sql`,
  `src/time/clock-math.ts`, `src/time/timesheet-build.ts`,
  `src/time/timesheets.ts`, `src/time/pay-inputs.ts` (pure),
  `src/time/pay-inputs-load.ts`, `src/routes/time-timesheets.ts`
- Modify: api `src/time/locks.ts`, `src/app.ts`,
  `tests/helpers/seed-time.ts`, `tests/conformance.test.ts`,
  `tests/leak.test.ts`, `tests/corrections.test.ts`
  (`locked_day_refuses_edits`)
- Test: `packages/contract/tests/pay-inputs-shape.test.ts`,
  `packages/api/tests/clock-math.test.ts`, `tests/timesheets.test.ts`,
  `tests/pay-inputs.test.ts`, `tests/pay-inputs-purity.test.ts`

**Interfaces:**
- Consumes: Task 1 `computeDaySheet`, `periodHourFlags`, `DayInput`,
  `DaySheet`, `TIME_PACKS`, `loadTimeParams`; Plan 3 approved leave
  requests (full days; Task 7 adds half-day parts here); Task 3
  `loadCalendar`, `isCompanyRestDay`, `isRamadan`, `timeAudit`; Task 4
  `publishedSlotOn`, `slotToShiftSlot`, `assertTimeDecidable`; Task 5
  `isDayLocked`; Plan 3 `canonicalJson`, `sha256Hex`, `dubaiDate`.
- Produces (contract):
  - `OvertimeDecision { approvedMinutes: int >= 0;
    approvedNightMinutes: int >= 0; restDayWork: { approved: boolean;
    compensation: "pay" | "day-off" } | null; decidedBy: Id;
    decidedAt: Timestamp }`.
  - `TimesheetDay { date; kind: "work" | "rest" | "holiday"; shift: {
    start: Hhmm; end: Hhmm; breakMinutes: int } | null; records: {
    attendanceId: Id; clockIn; clockOut: Timestamp | null }[]; leave: {
    part: "full" | "am" | "pm"; typeName: string | null; payrollKind:
    string | null } | null; scheduledMinutes; workedMinutes;
    lateMinutes; earlyLeaveMinutes; overtimeMinutes;
    overtimeNightMinutes; restDayWorkMinutes (all int); decision:
    OvertimeDecision | null; flags: TimeFlagView[]; trace: TraceLine[];
    wfh: { activeMinutes: int; idleMinutes: int; pausedMinutes: int } |
    null }`.
  - `TimesheetStatus = z.enum(["draft","submitted","approved"])`;
    `TimesheetSummary { id; employeeId; year; month; status; stale:
    boolean; totals: { scheduled; worked; overtime; overtimeNight;
    approvedOvertime; approvedNight; restDayWorkDays } (ints);
    flags: TimeFlagView[]; submittedAt; submittedBy; approvedAt;
    approvedBy (nullable) }`; `Timesheet = TimesheetSummary & { days:
    TimesheetDay[] }`; `TimesheetQuery { year; month; employeeId?;
    status? }`; `TimesheetPrepare { employeeId?: Id; year; month }`;
    `OvertimeDecisionInput { days: { date; approvedMinutes;
    approvedNightMinutes; restDayWork?: { approved; compensation }
    }[] (1..31) }`; `TimesheetNote { note: string 3..500 }`.
  - `time-pay-inputs.ts`, shaped exactly as Plan 5's `PayslipInput`
    parts: `PayInputOvertime { date; minutes: int > 0; nightMinutes:
    int >= 0 }` (Plan 5 `OvertimeEntry`), `PayInputRestDayWork { date;
    kind: "rest-day" | "holiday"; compensation: "pay" | "day-off" }`
    (Plan 5 `RestDayWork`), `PayInputAbsence { date; kind: "unpaid" |
    "sick" | "maternity" }` (Plan 5 `Absence`);
    `ManualItem { date: IsoDate | null; code: "HALF_DAY_ABSENCE" |
    "WORK_ON_ABSENCE_DATE" | "DATE_OUTSIDE_SERVICE" |
    "SICK_COUNTER_HAS_HALF_DAYS" | "TIMESHEET_STALE"; note }`;
    `PayInputEmployee { employeeId; timesheetId; overtime:
    PayInputOvertime[]; restDayWork: PayInputRestDayWork[]; absences:
    PayInputAbsence[]; sickDaysUsedBefore: int >= 0;
    maternityDaysUsedBefore: int >= 0; needsManualEntry: ManualItem[] }`;
    `PayInputs { year; month; statement: typeof PAY_INPUTS_STATEMENT;
    sickYear: "calendar-year"; employees: PayInputEmployee[];
    missingTimesheets: Id[]; notApproved: { employeeId; timesheetId;
    status }[]; flagsNotDeducted: { employeeId; date; code:
    "UNRECORDED_ABSENCE" }[] }`.
  - `PAY_INPUTS_STATEMENT` (exact): "Time inputs for review. Nothing
    here is paid until HR enters it in a pay run and an owner approves
    the run. Work-from-home tracking data is never included."
  - Routes appended (9): `listTimesheets GET /v1/time/timesheets`
    (all; `TimesheetSummary[]`), `getTimesheet GET
    /v1/time/timesheets/{id}` (all, scoped), `prepareTimesheet POST
    /v1/time/timesheets` (all; 201, `altStatus` 200 when it exists),
    `submitTimesheet POST /v1/time/timesheets/{id}/submit` (all),
    `decideOvertime POST /v1/time/timesheets/{id}/overtime` (owner, hr,
    manager), `approveTimesheet POST /v1/time/timesheets/{id}/approve`
    (owner, hr, manager), `rejectTimesheet POST
    /v1/time/timesheets/{id}/reject` (owner, hr, manager; body
    `TimesheetNote`), `reopenTimesheet POST
    /v1/time/timesheets/{id}/reopen` (owner, hr; body `TimesheetNote`);
    these respond `Timesheet`; `getPayInputs GET /v1/time/pay-inputs`
    (owner, hr; query `{ year; month }`; `PayInputs`).
  - Error codes: `TIMESHEET_TRANSITION` 409, `PERIOD_NOT_ENDED` 409,
    `OVERTIME_UNDECIDED` 422, `OVERTIME_DECISION_INVALID` 422.
- Produces (api):
  - Migration 904: `timesheets(id, company_id, employee_id, year,
    month, status, days_json jsonb, source_hash, submitted_at,
    submitted_by, approved_at, approved_by, created_at, unique
    (company_id, employee_id, year, month))`, `overtime_decisions
    (company_id, timesheet_id, date, approved_minutes,
    approved_night_minutes, rest_day_approved, compensation,
    decided_by, decided_at, pk(timesheet_id, date))`.
  - `clock-math.ts`: `minutesFromDubaiMidnight(ts: string, date:
    string): number` (`(Date.parse(ts) - Date.parse(date +
    "T00:00:00+04:00")) / 60000`, floored; parsing given strings only,
    never the clock); `recordToInterval(r, date): Interval | null`
    (null when open).
  - `buildDayInputs(tx, companyId, employeeId, year, month, today:
    string): Promise<DayInput[]>`: one per date of the month up to
    `today`; kind `holiday` (active holiday), `rest` (published rest
    slot, else company rest day when no published slot), else `work`;
    shift from the published slot; worked from closed records with
    that `date`; `openRecord` when an open record has that date and
    `date < today`; leave part from approved requests (Task 7 parts;
    Plan 3 requests are `full`).
  - `buildTimesheetDays(inputs, p, decisions, wfh): TimesheetDay[]`
    and `sourceHash(inputs) = sha256Hex(canonicalJson(inputs))`.
  - Status rules: `prepare` (self, or owner and hr for anyone) creates
    the row with `INSERT ... ON CONFLICT DO NOTHING` then reads it
    (201 when created, 200 otherwise); a draft's days are rebuilt on
    every read; `submit` (self, owner, hr) needs `dubaiDate(now)` after
    the month's last day (409 `PERIOD_NOT_ENDED`) and stores
    `days_json` and `source_hash`; `decideOvertime` in `draft` or
    `submitted` through `assertTimeDecidable` with `pendingStatus null`
    (`approvedMinutes <= overtimeMinutes`, `approvedNightMinutes <=
    min(approvedMinutes, overtimeNightMinutes)`, `restDayWork` only on
    rest or holiday days with work; else 422
    `OVERTIME_DECISION_INVALID` with `detail.dates`); `approve` from
    `submitted` through `assertTimeDecidable` needs a decision for
    every day with overtime or rest-day work (422 `OVERTIME_UNDECIDED`
    with `detail.dates`); `reject` sends `submitted` to `draft`;
    `reopen` sends `approved` to `draft`; any other move 409
    `TIMESHEET_TRANSITION`. Submitted and approved sheets read
    `days_json`; `stale` is true when the rebuilt `sourceHash` differs.
    `wfh` is filled from Task 10's `wfhDayTotals` when present, else
    `null`, and only for the employee and deciders.
  - `isDayLocked` now reads `timesheets` (status `submitted` or
    `approved` for the date's month).
  - `buildPayInputs(input: PayInputSource): PayInputs` (pure, in
    `pay-inputs.ts`, imports only contract types and engine date
    helpers) where `PayInputSource { year; month; employees: {
    employeeId; joiningDate; lastWorkingDate: string | null }[];
    timesheets: { employeeId; id; status; stale: boolean; days:
    TimesheetDay[] }[]; leaveDates: { employeeId; date; halves: 1 | 2;
    payrollKind: string }[]; sickHalvesBefore: Record<string, number>;
    maternityRunBefore: Record<string, number> }`. Rules:
    1. Only `approved` timesheets feed arrays; others go to
       `notApproved`, employees without one to `missingTimesheets`.
    2. Overtime: approved days with `approvedMinutes > 0`, minutes and
       night from the decision. Rest-day work: decisions with
       `approved: true`; kind `holiday` or `rest-day` from the day.
    3. Absences: full-day approved leave of `payrollKind` `sick`,
       `maternity` or `unpaid`; a half day goes to `needsManualEntry`
       `HALF_DAY_ABSENCE`.
    4. A date with an absence and overtime or rest-day work: removed
       from all arrays, `WORK_ON_ABSENCE_DATE`; a date before joining
       or after leaving: removed, `DATE_OUTSIDE_SERVICE` (both refused
       by Plan 5).
    5. `sickDaysUsedBefore = floor(sickHalvesBefore / 2)` (approved
       sick leave earlier in the same calendar year), with
       `SICK_COUNTER_HAS_HALF_DAYS` when odd; `maternityDaysUsedBefore`
       = days of the continuous approved maternity run ending the day
       before the month starts.
    6. A `stale` approved sheet adds `TIMESHEET_STALE`.
    7. `flagsNotDeducted`: approved-sheet work days with a published
       shift, no record and no leave (`UNRECORDED_ABSENCE`); never an
       absence.
  - `loadPayInputSource(tx, companyId, year, month)` reads employees,
    timesheets, approved leave and decisions; it never reads a `wfh_`
    table.
  - Audit: `timesheet.prepared`, `timesheet.submitted`,
    `overtime.decided` (`data: { timesheetId, dayCount }`),
    `timesheet.approved`, `timesheet.rejected`, `timesheet.reopened`,
    `payinputs.viewed` (`data: { year, month, employeeCount }`).

- [ ] **Step 1: Write the failing tests**

`pay-inputs-shape.test.ts`: the keys of `PayInputOvertime.shape`,
`PayInputRestDayWork.shape` and `PayInputAbsence.shape` deep-equal the
literal key lists copied from Plan 5's `OvertimeEntry`, `RestDayWork`
and `Absence` (`["date","minutes","nightMinutes"]`,
`["date","kind","compensation"]`, `["date","kind"]`) and their enums
equal Plan 5's literals; `PAY_INPUTS_STATEMENT` equals the exact text.

`clock-math.test.ts`: `minutesFromDubaiMidnight("2026-03-01T20:30:00Z",
"2026-03-02")` is 30; `("2026-03-02T22:00:00Z", "2026-03-02")` is 1560.

`timesheets.test.ts` (fixtures from `seedTime`; legal values read from
`loadTimeParams`):
- `prepare_builds_days_from_roster_and_records`: a 09:00 to 19:00 day
  on a 09:00 to 17:00 shift with break 60 gives `overtimeMinutes` 60;
  the holiday is kind `holiday`; the company rest day is `rest`.
- `prepare_twice_concurrently_one_timesheet`: two `Promise.all`
  prepares give statuses `{201, 200}` and one id; `SELECT count(*)` 1.
- `submit_before_month_end_refused`: 409 `PERIOD_NOT_ENDED`; with the
  clock moved to April it succeeds.
- `overtime_decision_bounds`: approving more than the day's overtime
  gives 422 `OVERTIME_DECISION_INVALID` naming the date.
- `approve_needs_all_decisions`: 422 `OVERTIME_UNDECIDED` lists the
  undecided dates; after deciding, approve gives `approved`.
- `timesheet_sod`: the manager approving the report's sheet succeeds;
  a manager approving a sheet of their own gives 403 `SOD_VIOLATION`
  (not 404: the separation check runs before the scope check).
- `approved_timesheet_snapshot_unchanged_after_edit` (Review Focus 5):
  after approval, hr `PUT /v1/attendance/{id}` on that month gives 409
  `TIMESHEET_LOCKED`; a correction request gives 409; hr cancelling an
  approved leave in that month succeeds, the sheet shows `stale: true`
  and its `days` and the pay inputs' overtime are deep-equal to before.
- `reopen_then_edit`: owner reopens; the edit then succeeds.
- `wfh_hidden_from_peers`: a colleague cannot read the sheet (404).

`pay-inputs.test.ts` (pure `buildPayInputs` cases plus one route call):
- `only_approved_feed_arrays`: a submitted sheet appears in
  `notApproved` and adds nothing.
- `overtime_and_rest_day_from_decisions`: decided 90 of 120 minutes
  with 30 night gives `{ date, minutes: 90, nightMinutes: 30 }`; a
  rest-day decision `pay` gives a `RestDayWork` entry.
- `half_day_absence_manual`: a half-day unpaid leave gives no absence
  and one `HALF_DAY_ABSENCE` item.
- `work_on_absence_removed`: sick day with approved overtime gives
  neither entry and `WORK_ON_ABSENCE_DATE`.
- `outside_service_removed`: overtime before joining gives
  `DATE_OUTSIDE_SERVICE`.
- `unrecorded_absence_never_deducted`: a scheduled day without records
  appears in `flagsNotDeducted` and not in `absences`.
- `counters`: 5 sick halves earlier in the year give
  `sickDaysUsedBefore` 2 and `SICK_COUNTER_HAS_HALF_DAYS`.
- `pay_inputs_unique_dates` (fast-check over random sheets and leave):
  every date appears at most once across `absences`, `overtime` and
  `restDayWork` of one employee, and every date is inside the month.
- `pay_inputs_route`: hr gets `statement` equal to
  `PAY_INPUTS_STATEMENT`; a manager gets 403.

`pay-inputs-purity.test.ts`: `src/time/pay-inputs.ts` and
`src/time/pay-inputs-load.ts` contain no `wfh` substring and no import
of `src/wfh/`; `pay-inputs.ts` has no `Date`, `deps`, `tx` or `./db`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/contract test` and
  `pnpm --filter @payroll/api test timesheets pay-inputs clock-math`.
  Expected: FAIL.
- [ ] **Step 3: Implement** the files above; add
  `locked_day_refuses_edits` to `corrections.test.ts` now.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): timesheets, overtime review, pay
  inputs`.

### Task 7: Leave policies, half days, blackouts, accrual and carry-over

**Files:**
- Create: `packages/contract/src/time-leave-policy.ts`
- Modify: contract `leave.ts` (additive fields and the widenings in
  Ruling 6), `routes-time.ts`, `errors.ts`, `examples.ts`, `index.ts`,
  `tests/routes-time.test.ts`, `tests/schemas.test.ts`
- Create: `packages/api/migrations/905_leave_policies.sql`,
  `src/leave/policy.ts`, `src/leave/blackouts.ts`,
  `src/leave/policy-balance.ts`, `src/leave/carry-over.ts`,
  `src/leave/preview.ts`, `src/routes/time-leave.ts`
- Modify: api `src/leave/requests.ts` (parts, blackouts, overlap by
  halves, warnings), `src/leave/balances.ts` (`balanceFor` delegates to
  `policyBalance`), `src/leave/days.ts` (`unpaidLeaveDaysIn` from
  halves), `src/time/timesheet-build.ts` (leave parts), `src/app.ts`,
  `tests/helpers/seed-time.ts`, `tests/conformance.test.ts`,
  `tests/leak.test.ts`
- Test: `packages/api/tests/leave-policy.test.ts`,
  `tests/leave-halves.test.ts`, `tests/carry-over.test.ts`

**Interfaces:**
- Consumes: Task 2 `countLeaveHalves`, `accruedHalves`,
  `balanceHalves`, `carryOverHalves`, `checkLeavePolicy`; Task 3
  `loadCalendar`, `weekdayOf`, `timeAudit`, `TimeFlagView`; Task 4
  `publishedSlotOn`; Plan 3 `balanceFor`, `unpaidLeaveDaysIn`,
  `LeaveType`, `LeaveRequest`, `LeaveBalance`, `LeaveRequestCreate`.
- Produces (contract):
  - `HalfDays` = number, `multipleOf(0.5)`, 0..366;
    `DayPart = z.enum(["full","am","pm"])`;
    `PayrollKind = z.enum(["annual","sick","maternity","unpaid",
    "other-paid"])`.
  - `LeavePolicy { leaveTypeId; payrollKind; accrual: "upfront" |
    "monthly"; joiningYearProRata: boolean; dayCount: "calendar" |
    "working"; halfDays: boolean; carryOverMaxDays: HalfDays | null;
    carryOverExpiresMonths: int 1..12 | null; minNoticeDays: int
    0..365; maxConsecutiveDays: int 1..366 | null; allowNegative:
    boolean; isDefault: boolean; warnings: TimeFlagView[] }`;
    `LeavePolicyPut` (all but `leaveTypeId`, `isDefault`, `warnings`;
    strict). Default when no row: `payrollKind` `other-paid` for a paid
    type and `unpaid` otherwise, `upfront`, no pro-rata, `calendar`, no
    half days, no carry-over, notice 0, no maximum, no negative.
  - `LeaveBlackout { id; name; from; to; leaveTypeIds: Id[] (empty =
    all); departmentId: Id | null; mode: "block" | "warn"; status }`;
    `LeaveBlackoutCreate`, `LeaveBlackoutUpdate { name?; mode?;
    status? }`.
  - `LeaveWarning { code: "BLACKOUT_WARN" | "BLACKOUT_OVERRIDDEN" |
    "BELOW_STAFFING" | "SHORT_NOTICE" | "OVER_MAX_CONSECUTIVE" |
    "HOLIDAYS_EXCLUDED"; message; dates: IsoDate[] }`.
  - Plan 3 `LeaveRequestCreate` gains `startPart?: DayPart`,
    `endPart?: DayPart`, `overrideBlackout?: boolean`; `LeaveRequest`
    gains `startPart?`, `endPart?`, `warnings?: LeaveWarning[]`, and its
    `days` widens to `HalfDays`; `LeaveBalance` gains `accrual?`,
    `accruedToDate?: HalfDays`, `carriedDays?: HalfDays`,
    `carriedExpiresOn?: IsoDate | null`, `expiredDays?: HalfDays`, its
    day fields widen to `HalfDays` and `dayCountRule` widens to
    `"calendar-days-inclusive" | "working-days"`.
  - `LeavePreview { days: HalfDays; dates: { date; part: DayPart }[];
    skipped: { date; why: "rest-day" | "holiday" }[]; balanceAfter:
    HalfDays | null; warnings: LeaveWarning[]; blocked: { code:
    ErrorCode; dates: IsoDate[] } | null }`;
    `CarryOverRun { fromYear: int 2000..2099 }`; `CarryOverResult {
    fromYear; toYear; rows: { employeeId; leaveTypeId; days: HalfDays;
    expiresOn: IsoDate | null }[]; alreadyRun: boolean }`.
  - Routes appended (7): `getLeavePolicy GET
    /v1/leave-types/{id}/policy` (all), `putLeavePolicy PUT
    /v1/leave-types/{id}/policy` (owner, hr), `listLeaveBlackouts GET
    /v1/leave-blackouts` (all; `YearQuery`), `createLeaveBlackout POST
    /v1/leave-blackouts` (owner, hr; 201), `updateLeaveBlackout PATCH
    /v1/leave-blackouts/{id}` (owner, hr), `previewLeaveRequest POST
    /v1/leave-requests/preview` (all; body `LeaveRequestCreate`;
    `LeavePreview`), `runLeaveCarryOver POST /v1/leave-carry-over`
    (owner, hr; `CarryOverResult`).
  - Error codes: `LEAVE_BLACKOUT` 422, `HALF_DAY_NOT_ALLOWED` 422,
    `INVALID_DAY_PART` 422, `LEAVE_ZERO_DAYS` 422,
    `REST_DAYS_NOT_SET` 422, `LEAVE_POLICY_INVALID` 422.
- Produces (api):
  - Migration 905: `leave_policies(company_id, leave_type_id pk,
    payroll_kind, accrual, joining_year_pro_rata, day_count, half_days,
    carry_over_max_halves, carry_over_expires_months, min_notice_days,
    max_consecutive_days, allow_negative, updated_at)`;
    `leave_requests` gains `start_part`, `end_part` (default `full`)
    and `half_units int`, backfilled `days * 2` and then `NOT NULL`;
    the old `days` column is dropped (Plan 3 code reading it changes in
    this task); `leave_request_dates(company_id, request_id, date,
    halves, part)` written on create (the counted dates);
    `leave_blackouts(id, company_id, name, from_date, to_date,
    leave_type_ids uuid[], department_id, mode, status)`;
    `leave_carryovers(company_id, employee_id, leave_type_id, to_year,
    halves, expires_on, created_at, unique(company_id, employee_id,
    leave_type_id, to_year))`, `leave_carryover_runs(company_id,
    from_year, created_at, pk(company_id, from_year))`.
  - `loadPolicy(tx, companyId, leaveTypeId): Promise<LeavePolicy>`
    (row or default, with `checkLeavePolicy` warnings).
  - `policyBalance(tx, companyId, employeeId, leaveTypeId, year,
    asOf: string): Promise<LeaveBalance>`; `balanceFor` keeps its
    Plan 3 signature and calls it with `asOf = dubaiDate(now)`. A
    type with `annualDays null` keeps no balance (as Plan 3).
  - Request rules (added to Plan 3's): parts need `halfDays` (422
    `HALF_DAY_NOT_ALLOWED`) and the Task 2 shape (422
    `INVALID_DAY_PART`); days come from `countLeaveHalves` with the
    policy basis, `restDates` = published rest slots, else company rest
    days, and `holidayDates`; `working` basis with company `restDays`
    `[]` and no published roster gives 422 `REST_DAYS_NOT_SET`; zero
    halves gives 422 `LEAVE_ZERO_DAYS`; overlap compares halves per
    date (an `am` and a `pm` on one date do not overlap); a `block`
    blackout gives 422 `LEAVE_BLACKOUT` with `detail.dates` unless the
    caller is owner or hr and sends `overrideBlackout: true` (warning
    `BLACKOUT_OVERRIDDEN`, audited); `warn` blackouts, short notice,
    over maximum, staffing (Task 8 adds `BELOW_STAFFING`) and skipped
    holidays return as `warnings`; balance check uses
    `availableHalves` as of `startDate`, skipped when `allowNegative`.
  - `unpaidLeaveDaysIn` returns `ceil(halves / 2)` of approved unpaid
    requests in the period, so a half day counts as 1 and Plan 3's
    pay run treats the month as partial (Ruling 9).
  - Policy rules: carry-over on a type with no balance gives 422
    `LEAVE_POLICY_INVALID`; changing a policy never rewrites existing
    requests.
  - Carry-over: `runLeaveCarryOver` inserts the run row with `ON
    CONFLICT DO NOTHING`; when the row already existed it returns the
    stored rows with `alreadyRun: true`; else for every employee and
    type with `carryOverMaxDays` it stores `carryOverHalves(available
    at 31 December, cap)` with `expiresOn` = last day of month
    `carryOverExpiresMonths` of the next year (or `null`). Carried
    halves feed `policyBalance` of the next year.
  - Audit: `leave.policy.updated` (`data: { leaveTypeId, changed }`),
    `blackout.created`, `blackout.updated`, `leave.carried`
    (`data: { fromYear, rowCount }`), `leave.blackout-overridden`
    (`data: { requestId }`).
  - `seedTime` adds an annual type "Type A" with a monthly policy and a
    sick type "Type S" (`payrollKind "sick"`, name used as a leak
    sentinel `"SickTypeSentinel"`), returning their ids.

- [ ] **Step 1: Write the failing tests**

`leave-policy.test.ts`:
- `default_policy_matches_plan3`: a type without a policy returns
  `isDefault: true`, `dayCount "calendar"`, and the Plan 3 balance
  numbers are unchanged.
- `policy_warnings_from_engine`: a policy whose annual days are one
  below `loadTimeParams(TIME_PACKS[0]).annualLeaveMinDays.v` returns a
  warning `ANNUAL_BELOW_STATUTORY` with that rule; the policy still
  saves (200).
- `monthly_accrual_balance`: Type A with 30 days monthly for an
  employee joined in 2020, `now` 2026-03-31 Dubai: `accruedToDate` 7.5
  and `dayCountRule "calendar-days-inclusive"`.
- `working_basis_needs_rest_days`: with `restDays []` and no roster,
  a request gives 422 `REST_DAYS_NOT_SET`.
- `blackout_block_and_override`: a `block` blackout gives 422
  `LEAVE_BLACKOUT`; hr with `overrideBlackout: true` succeeds with
  warning `BLACKOUT_OVERRIDDEN` and audit
  `leave.blackout-overridden`; an employee sending the flag still gets
  422.
- `preview_shows_skipped_holiday`: a working-basis request over
  "Company Day A" previews the date in `skipped` with `holiday` and a
  `HOLIDAYS_EXCLUDED` warning; preview writes nothing.
- `carry_over_on_no_balance_type`: 422 `LEAVE_POLICY_INVALID`.

`leave-halves.test.ts`:
- `half_day_needs_policy`: an `am` request on a type without
  `halfDays` gives 422 `HALF_DAY_NOT_ALLOWED`.
- `half_days_am_pm_same_date_no_overlap`: an `am` and a `pm` request
  on one date both succeed; a second `am` gives 409 `LEAVE_OVERLAP`.
- `half_day_balance`: an approved `pm` request lowers `remainingDays`
  by 0.5.
- `half_day_unpaid_leave_counts_as_partial`: one approved `am` day of
  an unpaid type gives `unpaidLeaveDaysIn` 1 for that month, and Plan
  3's `POST /v1/pay-runs` for the month without overrides gives 422
  `PAY_RUN_PROBLEMS` with `ENTERED_AMOUNTS_REQUIRED`.
- `timesheet_shows_half_day`: the day's `leave.part` is `am` and
  `scheduledMinutes` is half the shift's net.

`carry-over.test.ts`:
- `carry_over_capped_with_expiry`: 30-day upfront type, cap 5, expiry
  3 months, 12 days taken in 2026: the 2027 balance shows
  `carriedDays` 5 and `carriedExpiresOn` `2027-03-31`; at 2027-04-01
  unused carried days show as `expiredDays`.
- `carry_over_twice_concurrently_once`: two `Promise.all` runs for 2026
  give one set of rows; one result has `alreadyRun: true`; `SELECT
  count(*)` of carry-over rows equals the employee count.
- `carry_over_hr_only`: a manager gets 403.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test leave
  carry-over`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS (Plan 3's
  `leave.test.ts` and `leave-days.test.ts` still pass unchanged).
- [ ] **Step 5: Commit** `feat(api): leave policies, half days,
  carry-over`.

### Task 8: Leave calendar, team availability and attendance flags

**Files:**
- Create: `packages/contract/src/time-calendar.ts`
- Modify: contract `routes-time.ts`, `errors.ts`, `examples.ts`,
  `index.ts`, `tests/routes-time.test.ts`
- Create: `packages/api/migrations/906_staffing.sql`,
  `src/time/team-calendar.ts`, `src/time/availability.ts`,
  `src/time/flags.ts` (pure), `src/time/flags-load.ts`,
  `src/routes/time-calendar.ts`
- Modify: api `src/leave/requests.ts` (`BELOW_STAFFING` warning),
  `src/app.ts`, `tests/conformance.test.ts`, `tests/leak.test.ts`
- Test: `packages/api/tests/team-calendar.test.ts`,
  `tests/availability.test.ts`, `tests/flags.test.ts`

**Interfaces:**
- Consumes: Task 1 `computeDaySheet` (through Task 6
  `buildDayInputs`); Task 3 `loadCalendar`, `getTimeSettings`,
  `assertRange`, `TimeFlagView`; Task 4 `publishedSlotOn`; Task 6
  `buildDayInputs`, `minutesFromDubaiMidnight`; Task 7 `loadPolicy`,
  `leave_request_dates`; Plan 3 `viewerScope`.
- Produces (contract):
  - `CalendarEntry { employeeId; employeeName; kind: "leave" | "shift"
    | "rest"; leave: { status: "approved" | "pending"; part: DayPart;
    typeName: string | null } | null; shift: { start: Hhmm; end: Hhmm }
    | null }`; `CalendarDay { date; holiday: { name; nameAr: string |
    null } | null; specialPeriod: "ramadan" | null; companyRestDay:
    boolean; entries: CalendarEntry[] }`; `CalendarQuery { from; to;
    departmentId? }`.
  - `AvailabilityDay { date; departmentId; scheduled: int; onLeave:
    int; available: int; minOnDuty: int | null; belowMinimum: boolean }`;
    `StaffingPut { minOnDuty: int 0..500 | null }`;
    `DepartmentStaffing { departmentId; minOnDuty: int | null }`.
  - `AttendanceFlag { employeeId; code; dates: IsoDate[]; explanation:
    string; inputs: Record<string, string>; basis: "product-threshold"
    | "law" | "record"; rule: TraceRuleView | null; consequence:
    "none" }`; `FlagQuery { from; to; employeeId? }`.
  - Routes appended (4): `getLeaveCalendar GET /v1/time/calendar`
    (all; `CalendarDay[]`), `getTeamAvailability GET
    /v1/time/availability` (all; `AvailabilityDay[]`),
    `putStaffingMinimum PUT /v1/departments/{id}/staffing` (owner, hr;
    `DepartmentStaffing`), `listAttendanceFlags GET /v1/time/flags`
    (all; `AttendanceFlag[]`).
- Produces (api):
  - Migration 906: `department_staffing(company_id, department_id pk,
    min_on_duty, updated_at)`.
  - Calendar visibility: owner and hr see everyone; a manager sees
    self, direct reports and their departments; an employee sees own
    department. `typeName` is shown to the employee, their manager, hr
    and owner; for everyone else it is `null`, and for `sick` or
    `maternity` types it is never shown to anyone else (Global
    Constraints); pending leave is shown only to the employee, their
    manager, hr and owner; shifts are the published slots only.
  - Availability per department and date: `scheduled` = employees with
    a published shift (or, without a published slot, active employees
    on a non-rest, non-holiday day); `onLeave` = those with approved
    full-day leave; `belowMinimum` when `available < minOnDuty`.
    Employees see only their department's counts; the response holds
    counts only, no names.
  - `belowStaffingDates(tx, companyId, employeeId, dates):
    Promise<string[]>` used by Task 7's request rules for the
    `BELOW_STAFFING` warning (never a refusal).
  - `FlagDay { date; kind; hasPublishedShift: boolean; lateMinutes;
    earlyLeaveMinutes; worked: boolean; openRecord: boolean; leave:
    "none" | "half" | "full"; sickLeave: boolean; restOrHolidayNext:
    boolean; restOrHolidayPrev: boolean; geofenceException: boolean;
    sheetFlags: TimeFlagView[] }`; `computeAttendanceFlags(employeeId:
    string, days: FlagDay[], t: { graceMinutes; lateFlagThreshold;
    restAdjacentAbsenceThreshold; shortSickSpellThreshold }, window: {
    from: string; to: string }): AttendanceFlag[]` (pure). Codes and
    bases: `LATE_ARRIVAL` (late > grace, record), `EARLY_LEAVE`
    (record), `MISSED_CLOCK_OUT` (record), `UNRECORDED_ABSENCE`
    (published shift, no record, no leave, not a holiday; record),
    `GEOFENCE_EXCEPTION` (record), `REPEATED_LATENESS` (late days in
    the 30 days ending on `to` >= threshold; product-threshold),
    `ABSENCE_NEXT_TO_REST_DAY` (unrecorded absences or sick days next
    to a rest day or holiday in the 90 days ending on `to` >=
    threshold; product-threshold), `FREQUENT_SHORT_SICK_LEAVE` (sick
    spells of 1 or 2 days in 90 days >= threshold; product-threshold),
    and the day-sheet law flags passed through
    (`OVERTIME_DAILY_CAP_EXCEEDED`, `HOURS_144_IN_3_WEEKS`; law, with
    rule). Every flag lists its dates and inputs and has `consequence:
    "none"`.
  - `loadFlagDays(tx, companyId, employeeId, from, to)` reads 89 days
    before `from` for the pattern windows.
  - Flag visibility: the employee sees own flags; a manager direct
    reports; hr and owner everyone; others 404 on `employeeId`.
  - Audit: `staffing.updated`.

- [ ] **Step 1: Write the failing tests**

`team-calendar.test.ts`:
- `calendar_hides_health_type_from_peer` (Review Focus 1): with an
  approved "Type S" leave for the report, the colleague's calendar
  body has the entry with `typeName null` and does not contain
  `SickTypeSentinel`; the report's manager, hr and the report see the
  name; a non-health type's name is also `null` for the colleague.
- `pending_hidden_from_peers`: a pending request is absent from the
  colleague's calendar and present in the manager's.
- `calendar_marks_holiday_and_rest`: "Company Day A" and the company
  rest day are marked; no other date has a holiday.
- `calendar_range_limit`: 63 days gives 400 `RANGE_TOO_LONG`.

`availability.test.ts`:
- `below_minimum_counts_only`: department minimum 2 with one of two
  scheduled employees on leave gives `available 1`, `belowMinimum
  true`; an employee's response contains no employee name.
- `leave_request_warns_below_staffing`: the request still succeeds
  (201) with warning `BELOW_STAFFING` naming the date.

`flags.test.ts` (pure cases plus routes):
- `late_uses_grace`: grace 5, late 5 gives no flag; late 6 gives
  `LATE_ARRIVAL` with `inputs.lateMinutes "6"`.
- `repeated_lateness_threshold`: 3 late days in 30 days with threshold
  3 gives `REPEATED_LATENESS` listing the 3 dates; 2 gives none.
- `absence_next_to_rest_day`: two unrecorded absences each adjacent to
  a rest day with threshold 2 give the pattern flag.
- `short_sick_spells`: three 1-day sick spells in 90 days give
  `FREQUENT_SHORT_SICK_LEAVE`; one 5-day spell does not.
- `unrecorded_absence_only_with_shift`: a work day without a published
  shift gives no `UNRECORDED_ABSENCE`.
- `flags_have_no_consequence`: every flag from a mixed fixture has
  `consequence "none"` and non-empty `dates`.
- `flags_visibility`: a colleague asking for the report's flags gets
  404; the report sees own flags; the manager sees them.
- `law_flags_carry_rule`: a day over the daily overtime cap yields
  `OVERTIME_DAILY_CAP_EXCEEDED` with `basis "law"` and the rule key
  `timeOvertimeMaxMinutesPerDay`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test calendar
  availability flags`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): team calendar, availability,
  flags`.

<!-- TASKS -->


---

## Desktop agent: reference implementation plan (not built here)

<!-- AGENT -->

## Rulings

<!-- RULINGS -->
