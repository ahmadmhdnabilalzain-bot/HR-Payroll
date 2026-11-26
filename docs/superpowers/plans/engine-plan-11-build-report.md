# Engine Plan 11 build report (pure engine parts)

Branch `engine-plan-11`, built on `origin/claude/quirky-wozniak-b7xkvr`
at `4528bfb`. Engine only: no contract, API, migration or web change.
Not pushed.

## Scope decision

Plan 11's Architecture line says it "adds two small pure modules to
`packages/engine` (deadline dates and a payslip-level rule-change
preview)", and its File Structure lists only Task 3's files under the
engine. So only one task's code goes in `packages/engine`: Task 3 (the
`ae-deadlines` pack, deadline dates, the GPSSA late addition,
`applyRuleChange` and `previewPayslipRuleChange`). The plan specifies
every other pure function (gate checks, replay, deadline status, ICS,
exposure, score, datasets, diff, readiness, brief, token format) under
`packages/api/src/` with tests in `packages/api/tests/`. They take Plan
3 API and contract types, and several need `node:crypto` or `Date`,
which the engine's purity test bans. `packages/api` does not exist on
this branch. Building them in the engine would mean inventing those
types and moving the files away from the plan's layout, so they are
left for the API build (list below). `packages/api` was not scaffolded.

## What was built (Task 3, commit `6827691`)

- `src/sources.ts`: `MR340_2026_SUMMARY` (the plan's URL, built as the
  existing `UAE_GOV_BASE + "payment-of-wages"`, and the plan's note) and
  `DL57_ART12` (the plan's note). `DL57_ART11`'s note was widened from
  "Article 11(3)" to "Article 11(3)-(4)" (see corrections).
- `src/rules/deadlines-pack.ts`: `DEADLINE_PACKS`, one frozen pack
  `ae-deadlines` (version and effectiveFrom `2026-06-01`, effectiveTo
  `null`) with exactly the plan's nine params, values, statuses and
  sources. Each param has a comment quoting its clause from
  `docs/research/2026-11-26-gpssa-primary.md` or
  `docs/research/2026-11-25-wps-resolution-340.md`. The two WPS fines
  are `{ value: null, status: "unsourced", source: null }`.
- `src/deadlines/dates.ts`: `wpsDeadline` and `gpssaDeadline`. The
  pack is selected on the 1st of the next month. The period is checked
  with the payslip's `checkPeriod` (`INVALID_PERIOD`). A day param past
  the end of the month gives `INVALID_PARAM`.
- `src/deadlines/late.ts`: `gpssaLateAddition`, which returns the
  smaller of the daily and the capped `mulDiv`. It refuses a bad day
  count (`INVALID_COUNT`) and a negative amount (`INVALID_AMOUNT`). The
  `gpssa.late-addition` trace line carries the three rules.
- `src/preview.ts`: the private `applyChange` is now the exported
  `applyRuleChange`. `previewRuleChange` keeps its signature and
  behaviour.
- `src/payroll/preview.ts`: `PayslipPreview` and
  `previewPayslipRuleChange`, which change `packs.payroll` or
  `packs.gpssa`, whichever holds the pack id (`MISSING_PACK` when
  neither does), and pass the overrides to both sides.
- `src/index.ts` exports the new modules. The purity test already
  scans `src/deadlines/` recursively and stays green.

## Tests

- `tests/deadlines.test.ts`: `wps_due_first_of_next_month`,
  `no_pack_before_resolution_340`, `gpssa_last_day_fifteenth`,
  `gpssa_late_addition_daily`, `gpssa_late_addition_capped`,
  `gpssa_late_addition_rounds_down`, `wps_fines_unsourced`,
  `pack_frozen`, plus cases for a bad period, the trace rules, bad
  inputs, no pack on the date, and the exact param list.
- `tests/payslip-preview.test.ts`: `identity_change_zero_delta`,
  `overtime_change_moves_gross`, `unknown_pack_refused`,
  `settlement_preview_unchanged`, plus a GPSSA-pack change for a
  national (employee share 11% to 12% of the 10,000.00 basic: net
  down by 10000 fils, rule status `hypothetical`), an unknown
  key, overrides on both sides, and `applyRuleChange` leaving the
  source packs untouched.
- `tests/no-fine-figures.test.ts`: scans `engine/src/deadlines/`,
  `engine/src/rules/deadlines-pack.ts`, `api/src/compliance/` and
  `api/src/deadlines/`, skipping paths that do not exist yet, for
  `"1,000"`, `"20,000"`, `"100000"` and `"2000000"`. A guard test checks
  that the engine files are actually scanned.
- Red then green: all three files failed first (missing modules, and
  the scan guard). One exception: `settlement_preview_unchanged` was
  written and run on the untouched `preview.ts` to take its snapshot
  (`tests/__snapshots__/payslip-preview.test.ts.snap`), so it was
  green from the start, as a snapshot taken before a refactor has to
  be.
- `pnpm check` was green before each commit: engine 376 tests (36
  files), contract 43, wps 173, web 88.

## Plan corrections

No arithmetic correction: every hand-derived value matches the real
arithmetic (1000000 x 10 x 3 / 10000 = 3000; 1001 days is capped at
1000000; 999 x 10 / 10000 rounds down to 0; June 2026's WPS due date
is 2026-07-01 and its alert date 2026-07-02; December 2026's due date
is 2027-01-01; May 2026's due date is 2026-06-01; GPSSA's last day for
June is 2026-07-15; Task 5's 10000.00 x 0.1% x 3 = 30.00). The plan
file is unchanged.

One source fix, made in code and not in the plan: the plan cites
`DL57_ART11` for `gpssaLateDailyBps` and `gpssaLateCapBps`. That
source's note read "Article 11(3)", but the rule is Article 11(4). The
id is kept, as the plan names it, and the note now reads "Article
11(3)-(4)". No test or snapshot depended on the old text.

## Decisions (recorded here, not asked)

1. Scope: Task 3 only (see Scope decision).
2. `gpssaDeadline` emits two trace lines,
   `deadline.gpssa.first-day` (payable-from day) and
   `deadline.gpssa.last-day`, so that every date in the result has a
   trace line. The plan names only the last-day id. The first line is
   not called `...payable-from` because the purity test's import
   scanner reads `from"` inside a string as an import specifier. The
   WPS alert label avoids a trailing "from" for the same reason.
3. `gpssaLateAddition` with `packs` `undefined` uses `DEADLINE_PACKS`.
   `on` is required, as the plan says. A negative `amountDue` is
   refused with `INVALID_AMOUNT`, a guard the plan does not list.
4. Day params are read with the existing `intParam` (whole number, at
   least 1) and checked against the month's length. Rounding is read
   with `modeParam`.
5. Commit trailers use `Co-Authored-By: Claude Opus 5.5`, the
   harness attribution line for this session, which says only the
   user's own rule (a CLAUDE.md or memory rule) overrides it. The
   brief asked for `Claude Sonnet 5.5`, but the repository has no
   such rule (no CLAUDE.md) and that line names a different model
   from the one that wrote the code. The `Claude-Session` line is
   the same in both.

## Remaining for the API build (pure functions the plan places in
`packages/api`)

- Task 1: `toCsv`, `buildZip`, `readZip`, `SignedMoney`,
  `toSignedMoney`. Wait on contract `SignedMoney`; `zlib.crc32`; Dubai
  time from a `Date`.
- Task 2: `varianceCauses`, `evaluateGate`. Wait on contract
  `GateFinding` and `GateCode`; Plan 3 `sha256Hex`, `canonicalJson`.
- Task 4: `toPayslipInput`, `replayRun`. Wait on Plan 3 `RunSnapshot`,
  `SnapshotEmployee`, `Period` (only `PayRunEntry` is in the contract).
- Task 5: `deadlineStatus`, `toIcs`, `exposureFromTrace`,
  `scoreChecks`, `sumExposure`, `buildChecks`. Wait on contract
  `Exposure`, `ComplianceCheck`, `Filing`; Plan 7
  `EmiratisationReport`; `toIcs` takes a `Date`.
- Task 6: `parseToken`, `sealMessage`, `sealBody`, Ed25519 keys. Wait
  on contract `Payslip`; `node:crypto` (the plan places them in
  `api/src/verify`, not in a pure package).
- Task 7: `diffPayslips`. Waits on Plan 3 `ComputedPayslip`.
- Task 8: `DATASETS`, `resolveFilters`, `nextRunOn`. Wait on contract
  `DatasetId`, `ReportFilters`, `Cadence`; loaded rows.
- Task 9: `evaluateReadiness`, `buildPackFiles`. Wait on contract
  readiness and pack types.
- Task 10: `buildBrief`. Waits on contract `OwnerBrief`, `ROUTES`.

The Task 3 functions these depend on (`wpsDeadline`, `gpssaDeadline`,
`gpssaLateAddition`, `DEADLINE_PACKS`, `applyRuleChange`,
`previewPayslipRuleChange`) are exported from `@payroll/engine`.

## Concerns

- Plan 11 Task 3 asks for a fresh per-task review (law task). It has
  not been done.
- `no-fine-figures` only matches literal strings. A fine written in
  another form (for example `20000`) would pass. When the API build
  adds `api/src/compliance/` and `api/src/deadlines/`, the scan picks
  them up automatically.
- `HANDOVER.md` and `LEDGER.md` are not updated. The last engine
  build (`7074f3b`) left them alone too. Plan 11 updates them in
  Task 10, and the Rulings are appended there.
- The purity test's import scanner misreads any string ending in
  `from` or `import` followed by a quote. This is a small trap for
  future engine code; fixing the scanner is outside this task.
