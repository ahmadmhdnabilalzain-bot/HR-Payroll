# Plan 9 build report (API Tasks 3 to 11)

Branch `api-plan-9`, worktree
`/home/user/HR-Payroll/.claude/worktrees/agent-a754f6752b40ab1dd`, built
on `claude/quirky-wozniak-b7xkvr` at `32d2dfe`. Not pushed.

## Commits

| Task | Commit | Message |
|---|---|---|
| 3 | `65b5738` | feat(api): time settings, calendar, sites |
| 4 | `fcddb41` | feat(api): shifts, rosters and swaps |
| 5 | `75905ae` | feat(api): geofenced clock-in, corrections |
| 6 | `2afe944` | feat(api): timesheets, overtime review, pay inputs |
| 7 | `679c17a` | feat(api): leave policies, half days, carry-over |
| 9 | `b519559` | feat(api): wfh settings, notice, consent, pause |
| 10 | `ec3b057` | feat(api): wfh uploads, views, retention |
| 8 | `1fb55b8` | feat(api): team calendar, availability, flags |
| 11 | (last) | feat(time-client): sampler, indicator, agent interface; e2e; handover |

## Status

All of Tasks 3 to 11 are built (Task 8 after 9 and 10). The plan's
per-task reviews (Tasks 6, 9 and 10) and the whole-branch review have
not been run; they are for the coordinator to dispatch.

## Tests

Gate per commit: `pnpm lines`, `lines:test`, and typecheck plus tests
of every package except `apps/web`. Final run: contract 91, engine 539
(+3 skipped), time-client 13, api 50 files, 332 tests (all pass; the 19 skipped
are the real-PostgreSQL suite without `DATABASE_URL`). With a throwaway
PostgreSQL 16 and the non-superuser runtime role, the real-PostgreSQL
suite passes 19 of 19, including two Plan 9 races. wps: the
`roundtrip` test times out at 5 s when the shared machine is loaded
(passes alone; unrelated to Plan 9). Every Review Focus test name is
present: `calendar_hides_health_type_from_peer`,
`wfh_leak_manager_and_peer_see_no_coordinates`,
`clock_in_after_2000_utc_dated_next_dubai_day`,
`wfh_upload_rejections_store_nothing`,
`wfh_forgotten_clock_out_stops_at_bound`,
`approved_timesheet_snapshot_unchanged_after_edit` (Task 1's engine
names were built earlier).

## Adaptations to the plan (Plan 3 as merged differs)

1. `TIME_ROUTES` already existed in `routes-time.ts` (Plan 3's leave
   and attendance routes). That list is renamed
   `LEAVE_ATTENDANCE_ROUTES`; `TIME_ROUTES` now holds only Plan 9's
   routes, each task's group in its own `routes-time-*.ts` file.
   `ROUTES` concatenates both. `routes.test.ts` checks Plan 3's 50
   routes (ROUTES minus TIME_ROUTES); Plan 9's own counts and MFA
   lists are in `routes-time.test.ts`.
2. List responses use Plan 3's `{ items }` envelope (`HolidayList`,
   `SpecialPeriodList`, `WorkSiteList`, ...), not bare arrays.
3. Audit is an allowlist in Plan 3, not a denylist. `timeAudit` refuses
   `TIME_SENSITIVE_KEYS` first, then Plan 3's allowlist refuses every
   other unknown key. New allowed keys (`allowlist-time.ts`): `date`,
   `attendanceId`, `timesheetId`, `requestId`, `dayCount`, `rowCount`,
   `rows`, `fromYear`, `activity`, `locations`, `pauses`, `erased`;
   `from` and `to` now accept an ISO date as well as a role word.
4. The attendance table is `attendance`, not `attendance_records`.
5. Plan 9 registry, examples and error codes live in
   `registry-time.ts`, `examples-time.ts` and `errors-time.ts`, spread
   into `SCHEMAS`, `EXAMPLES` and `ERROR_STATUS`.

## Decisions

1. Commit trailer: the harness reminder (Opus 5.5) is kept over the
   launching agent's "Sonnet 5.5", as the Plan 3 builder did; only the
   user's own instructions outrank the reminder. Nothing is pushed.
2. `pnpm check` was red before Plan 9 started: `apps/web` typecheck has
   3 errors from Plan 3's contract changes (`sifFileId`, nested error
   detail). `apps/web` is Plan 4's and is not edited. Each commit is
   gated on `pnpm lines`, `lines:test`, and typecheck and tests of
   every package except `apps/web`. The wps round-trip test times out
   at 5 s when the machine is loaded (passes alone); unrelated.
3. Migration runner: no change. Names are three digits, so the
   lexicographic sort is numeric (`008` < `801` < `901`).
4. Tests that move the clock by days call `keepSessions` (test helper:
   extends the seeded sessions through the superuser handle).
5. Special periods are bounded to 40 days with `assertRange`, so a
   41-day period gives 400 `RANGE_TOO_LONG`.
6. `updateTimeProfile` also refuses an unknown or removed work-site id
   (422 `WORK_SITE_REQUIRED` with `detail.fields`).
7. Shift templates (builder's concern): a break as long as or longer
   than the span is refused (400, on create in the schema and on the
   merged result of a PATCH). This is one minute stricter than the
   engine's `INVALID_SHIFT` (which allows break = span, net 0).
8. Publishing copies only days whose draft differs from the published
   copy (or that were never published); unchanged days keep their
   version, so re-publishing a range does not void pending swaps.
   `published` in the response counts those days.
9. Roster reads: owner and hr see everyone with drafts; a manager sees
   direct reports with drafts and self and own department published
   only; an employee sees self and own department, published only
   (draft `null`, `changedSincePublish` false).
10. Roster flags use the working slot (draft when set, else
    published) and the approved leave of the padded range. Flags that
    touch [from, to] are returned.
11. A swap stores no slot snapshot (the plan's table has none):
    `requesterSlot` and `peerSlot` are the current published slots,
    shown reversed once approved. Approve needs a caller who may see
    the swap, then `assertTimeDecidable`.
12. Clock body: `validate.ts` now reads an empty body as `undefined`
    (before, any route with a body schema threw on an empty body), so
    Plan 3 clock calls with no body still work. A required body that
    is missing still gives 400 `VALIDATION_FAILED`.
13. Plan 9 attendance fields are additive: `method`, `workLocation`,
    `geofence` and `exception` appear on records clocked after
    migration 903. A record with no body stores method `unknown`.
14. `correctAttendance(ctx, id, body, source)` is exported from Plan
    3's `attendance.ts` (Plan 3's hr `PUT` now calls it); it refuses
    a locked old or new date. An approved correction updates through
    it with `source: "correction"` and a fixed note ("correction
    request approved"), so the employee's reason is not copied onto
    the record.
15. `CorrectionCreate` gains an optional `employeeId`; anything other
    than the caller's own gives 403 (the plan's "requesting for a
    colleague"). A target record of another employee also gives 403.
    A new record (no `attendanceId`) needs a clock-out.
16. Cancel of a correction: the requesting user only (others 404).
17. Coordinator item (a): a record longer than 24 hours is refused.
    `AttendanceCorrection` (Plan 3's hr `PUT`) refuses clockOut more
    than 24 h after clockIn (400); a live clock-out more than 24 h
    after clock-in gives 422 `CLOCK_OUT_TOO_LATE` (new code) and the
    record stays open for a correction. `recordShape` (clock-math)
    treats an open record, a record over 24 h or a backwards one as
    open (never worked time: `MISSED_CLOCK_OUT`, plus
    `RECORD_OVER_24_HOURS` for an overlong closed one), drops records
    under a minute, and clamps to the engine's -1440..2880, so a month
    sheet never throws (test
    `overlong_record_is_a_missed_clock_out_not_a_crash`).
18. `buildDayInputs` returns `BuiltDay` (the engine `DayInput` plus the
    slot, records, leave and extra flags), not bare `DayInput[]`;
    `sourceHash` hashes all of it, so a leave-type change also makes a
    frozen sheet stale. Days run to today inclusive.
19. A frozen (submitted or approved) sheet's leave dates feed its pay
    inputs, not live leave, so approved inputs never change silently;
    a later change shows `stale` and adds `TIMESHEET_STALE`.
20. `periodHourFlags` (144 hours in 3 weeks) is computed over the
    month's days only (no carry-in from the previous month).
21. Reject and reopen notes (`TimesheetNote`) are validated but not
    stored (no column in the plan; notes are never audited). Reject
    and reopen clear the frozen days; decisions are kept.
22. SOD for timesheets: the requester is the user who submitted.
    `decideOvertime` is refused on an approved sheet (409).
23. Pay-input tests are relative to the engine (`computeDaySheet` on
    the same input) as the coordinator asked, so the engine overtime
    fix (in progress on another branch) changes the expected numbers
    with it. Dependency: the timesheet overtime figures are whatever
    the engine day sheet returns.
24. Payroll kind before Task 7: "other-paid" for a paid type and
    "unpaid" otherwise (`leave/payroll-kind.ts`).
25. Test runs: the api suite runs with one worker; with two, the
    shared machine OOM-kills a worker.
26. Implementation for Task 6 was written before its tests (the tests
    were then run and pass); Tasks 3 to 5 and 7 were red first.
27. `balanceFor` keeps Plan 3's parameters and gains an optional
    `asOf` (default the year's last day); the balance route passes
    today in Dubai. It delegates to `policyBalance`.
28. Leave request planning lives in `leave/preview.ts`
    (`planRequest`): the create route throws the first blocking
    problem, the preview returns it in `blocked`. Order: zero days,
    overlap (by half-day parts), blocking blackout, balance (as of the
    start date). `BELOW_STAFFING` comes through `staffing-hook.ts`
    (Task 8).
29. Migration 905 backfills `leave_request_dates` for Plan 3 requests
    (full calendar days) so overlap and timesheets read one source.
    `leaveMap` now reads counted dates, so half days and skipped days
    reach rosters, swaps and timesheets.
30. Carry-over creates a row (possibly 0 halves) for every employee
    who had joined by 31 December and every type with a cap; a repeat
    run returns the stored rows with `alreadyRun: true`.
31. The audit `days` key accepts half days.
32. Real PostgreSQL (16, non-superuser runtime role, as Plan 3's
    builder ran it): 19 of 19 pass, including two Plan 9 races
    (`pg-concurrency-time.ts`: parallel timesheet prepares give one
    row; parallel carry-over runs store one set).
33. Task order: Task 9 and 10 (WFH, the sensitive ones) were built
    before Task 8, so that if room ran out the privacy work would be
    done. Migration 906 (Task 8) is therefore added after 907; on a
    fresh database the runner applies files in name order, and on an
    existing one it applies any file not yet applied.
34. WFH settings column `location_hourly` is named
    `location_each_hour`: the plan's own column-name check
    (`/screen|keystroke|key_log|url|title|content/`) matches "url"
    inside "hourly". The check is kept strict; the column was renamed.
35. `wfh_consents` has a `seq` (bigserial) so "the latest row" is
    exact even when two decisions share a timestamp.
36. `WfhSettings.neverCollected` is typed as an array of the
    `NEVER_COLLECTED` enum (a test checks it equals the list).
37. The leak test treats "self" routes (`getWfhStatus`, and Task 10's
    own-data routes) as 422 `NO_EMPLOYEE_LINK` for the seeded owner
    and hr, who have no employee link.
38. Consent: a grant or decline must name the current notice (409);
    a withdrawal applies to the current notice. Withdrawing does not
    end an open pause (clock-out does).
39. Uploads check the current state without needing an open record
    (settings on, profile tracked, current consent granted), then the
    record (the caller's own remote record), then every sample's
    window (`checkSampleTime`, consent time = the current grant), then
    collection switches. Any failure stores nothing; the first bad
    sample is named by `detail.index`.
40. Every `/v1/wfh/` handler (Tasks 9 and 10) runs the purge first
    (`purged` wrapper). Reads also filter by the cutoff. The cutoff
    uses the settings' retention, else the last notice's (so data
    never lingers if retention is later cleared while disabled).
41. `purgeAllCompanies` lives in `src/db/wfh-purge-all.ts` because the
    source scan allows `withTenant(` only in the plumbing and `db/`.
    `main.ts purge-wfh` and `pnpm api:purge-wfh` call it.
42. Timesheet WFH totals measure retention from the start of today in
    Dubai (the timesheet build has the date, not the instant).
43. Real PostgreSQL could not stay in the scratchpad (its directory
    permissions were reset during the run); the throwaway server ran
    from the postgres user's home instead and is stopped at the end.
    The location race is tested on pglite only (it serialises, so it
    proves the code path, not the lock); the lock is the employee row
    `FOR UPDATE`, the same pattern as Plan 3's clock-in.
44. Calendar visibility: owner and hr see everyone; others see self,
    their own department and (managers) their direct reports. Leave
    type names and pending leave only for the person, their manager,
    hr and owner (so a sick type is never shown to a peer).
45. Availability: owner and hr see every department; others only
    their own (none without a department). `BELOW_STAFFING` counts the
    requester as off on dates they are scheduled and not yet on leave.
46. Flags: `EARLY_LEAVE` uses the same grace as lateness (the plan
    names no threshold for it). Day flags are one flag per date. The
    144-hours flag is attached to the last date of its window. Flags
    are computed from the same day inputs and engine day sheets as
    timesheets (90 days back for the patterns), so the engine fix in
    progress changes them with it.
47. Task 11: `@payroll/time-client` keeps every side effect behind a
    port; the purity test bans clock reads, browser globals, timers,
    `fetch` and `node:` imports, and allows the capture words only in
    `desktop-agent.ts` (as `false` keys). The sampler shows the
    indicator before every reading and posts `indicatorShown: true`;
    the server refuses a location without it. `categorise` uses
    example hosts only (product default, not law).
48. `time-e2e.test.ts` runs the plan's end-to-end path; the overtime
    it checks is whatever the engine day sheet returns.

## Concerns

- Reviews pending: Tasks 6 (pay inputs), 9 and 10 (privacy) and the
  whole branch. Nothing has been reviewed by a second agent.
- Engine dependency: the engine fix in progress (break deducted twice
  when already clocked out, 8-hour limit on shift days, carry-over
  excess) will change timesheet, flag and pay-input numbers. The API
  tests compare with the engine's own functions, so they follow it;
  the e2e and timesheet tests should be re-run after that merge.
- `apps/web` typecheck was red before Plan 9 (3 errors) and Plan 9
  widens `LeaveRequest.days`, `LeaveBalance` day fields,
  `AttendanceRecord.source` and adds optional fields (Rulings 6 and 7);
  its typecheck still shows the same 3 errors after Plan 9 (no new
  ones), but clients that assume whole leave days should be checked.
- `routes.ts`, `errors.ts`, `registry.ts`, `examples.ts`, `index.ts`
  in the contract, and `app.ts`, `allowlist.ts`, `attendance.ts`,
  `leave/requests.ts`, `leave/balances.ts`, `routes/leave.ts`,
  `validate.ts`, the leak and conformance tests and the seed helpers in
  the api were edited; other plans built in parallel will meet textual
  merges there.
- pglite serialises, so the location race and swap/version races are
  proven on real PostgreSQL only for timesheet prepare and carry-over.
- `buildDayInputs` and a few route handlers are slightly over 30 lines;
  `routes/time-timesheets.ts` is near 200 lines. No file is over 300.
- The notice text, the categories list and the 24-hour record bound are
  product wording and bounds, not law; counsel should read the notice.
- A unique-index race on a duplicate open pause would give 500 (the
  employee row lock covers the normal path), as Plan 3 noted for its
  own unique indexes.

## Review fixes (after `.superpowers/sdd/plan9/api-review.md`)

| Item | Commit | Fix |
|---|---|---|
| C1 | `bf3c383` | Consent decisions, withdrawals and uploads take the employee row lock first; a real-PostgreSQL race test (240-minute upload against "withdraw and erase") was red with 240 rows left, green with 0 |
| I1 | `6005cc6` | Submit voids decisions that no longer fit the frozen day; approve refuses `OVERTIME_DECISION_INVALID`; reject and reopen void every decision (`voided_at`, no deletes); `buildPayInputs` clips to the day and drops rest-day work on a work day with a `DECISION_CLIPPED` item |
| I3 | `f1624b6` | `LeaveOnDate.parts` keeps each half with its own type; the timesheet day shows `leave.parts`; pay inputs treat each half separately |
| I4 | `37d09a8` | `WfhExport.minutes` holds every stored minute from the cutoff on |
| I5 | `e38c490` | Tests for the 24-hour clock-out bound, SoD by submitter, consent time and clock-out boundary, the manager summary scope, the pay-input import graph (side-effect imports too) and a forbidden-column check over every table; each was shown to fail under its mutation (M8, M5b, M14, M10, M17, M9, M2b, M2c) |
| Minors | `8907545` | M1 real `now` for timesheet WFH totals; M2 paused minutes honour the cutoff; M3 an hr correction closes an open pause and the purge removes open pauses older than the cutoff; M8 future-day corrections refused; M14 clock-math tests in `clock-math.test.ts` |
| I2 + merge | `7d556ca` | `carry-over.ts` passes the time params and stores `excess_halves`; `CarryOverResult` rows show `excessDays` and the engine's `UNUSED_LEAVE_NOT_CARRIED` flags |

Minors not done (need a ruling or are larger): M4 (scheduling the
purge: handover now says operations should run it daily), M5 (raising
retention extends old data), M6 (auditing summary and timesheet WFH
views), M7 (swap peer limited to the same department), M8 rest (open
records and cross-midnight records in the overlap check), M9 (lock
checks on clock-out, roster and swap approval), M10 (refuse approving
a stale sheet), M11 (fixed on main by the Plan 3 review: nobody
decides their own leave), M12 (handover now says the geofence is
evidence, not enforcement), M13 (pending leave lowers carry-over).

### Merge of `claude/quirky-wozniak-b7xkvr` (`7d556ca`)

Conflicts, all resolved keeping both sides: contract `routes.ts`,
`registry.ts`, `examples.ts` (EXPENSE and TIME lists side by side);
api `app.ts`, `audit/allowlist.ts`, `main.ts` (expense app, blob store
and `purge-wfh` together); `attendance.ts` (main's stricter
`checkTimes`/`checkOpen` and `correct(old, now)` kept, Plan 9's
`source`, pause closing and lock check added); `routes/attendance.ts`
(Plan 9's `correctAttendance` wrapper kept; it now calls main's
`correct`); `leave/requests.ts` and `routes/leave.ts` (main's sealed
reason and stricter `decide` kept, Plan 9's half days, planning and
warnings kept); `conformance.test.ts` (main's `api-flow.ts` kept;
`timeFlow` called from it); `leak.test.ts` (both kinds, fixtures and
paths); `seed-rows.ts`, `pg.integration.test.ts` (both);
`HANDOVER.md` (both states, one "Known limits" section). `apps/web`:
origin's files, plus `errors-time.ts` texts for Plan 9's error codes
(English, and Arabic flagged NEEDS NATIVE REVIEW). Lockfile
regenerated. Migrations run 001-013, 601-605, 901-908 in name order;
the RLS catalog test confirms forced RLS and a policy on every tenant
table. The forbidden-column check over every table allows, by table
and column, `employees.job_title`, `expense_policies.claim_window_days`,
`receipts.content_type` and `expense_claims.title`.

Tests after the merge, one package at a time: contract 111, engine
584, time-client 13, web 103 (typecheck clean), api 80 files / 568
tests, real PostgreSQL 22 of 22 (throwaway server, stopped). wps 173
with the known `roundtrip` 5-second timeout under load.
