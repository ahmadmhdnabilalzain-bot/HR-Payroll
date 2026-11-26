# Plan 8: Hiring, Onboarding, Tasks and the One Exit Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Plan 3 backend with a built-in task manager, job
requisitions and a light applicant tracker, offers with approval, offer
to hire conversion with onboarding tasks and sourced probation dates,
the one exit flow (notice from sourced rules, clearance tasks, final
settlement from `@payroll/engine` with its not-computed list, document
and access-revocation hooks) and simple goals with check-ins.

**Architecture:** Statutory dates (probation end, notice, settlement due
date) come from a new pure, frozen engine rule-pack `ae-employment` in
`packages/engine/src/employment/`; the API never holds a statutory
number. Each API task adds its zod schemas and routes to
`packages/contract` (a new `HR_ROUTES` list joined to Plan 3's routes),
its migration, service and route files to `packages/api`, and keeps Plan
3's cross-cutting tests (conformance, leak, RLS catalog, audit) green in
the same commit. Reminders and deadlines are dated tasks in the task
manager, because no scheduler exists. Calendar, document generation and
external access revocation are ports with a "not configured" default.

**Tech Stack:** As Plan 3: Node 22, TypeScript 7.0.2, zod 4.6.7, Hono
4.13.17, @electric-sql/pglite 0.5.16 (tests), pg 8.23.1, Vitest 5.1.2,
fast-check 4.11.0, tsx 4.23.15. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-25-master-feature-list.md`
(capability 4 "One exit flow": UQ12 and UQ13 — the brief's "UQ4" means
this capability; UQ7 rule-computed due dates; UQ18 approvals; UQ27
hiring flow; tags SR and "flag, never deduct"),
`docs/superpowers/specs/2026-11-25-combined-feature-list.md` (A:
onboarding and offboarding, resignation and termination; F: recruiting,
offer letters, interview scheduling, goals; H: task manager),
`docs/research/2026-11-26-labour-law-primary.md` (the only source of
legal rules here: DL = Decree-Law 33 of 2021), `LEDGER.md` sections 1 to
3 (speed ruling), `docs/engineering-standards.md`. Extends
`docs/superpowers/plans/2026-11-26-plan-3-backend.md` and uses
`calculateSettlement` from
`docs/superpowers/plans/2026-11-25-plan-1-payroll-engine.md`.

**Prerequisite:** Plan 3 is built (Tasks 1 to 8). Plan 8 does not depend
on Plan 4 or Plan 5. Where Plan 8 consumes a Plan 3 function that Plan 3's
Interfaces blocks do not name, this plan gives the exact signature and
the executor exports it from the named Plan 3 file (renaming only at the
export if Plan 3 used another internal name).

## Global Constraints

- All of Plan 3's Global Constraints apply unchanged (80-character
  lines, files under about 300 lines, functions under 30, integer fils,
  money on the wire as `^\d{1,9}\.\d{2}$`, RLS on every tenant table,
  injected time and ids, `/v1`, `X-Company-Id`, tests offline).
- No statutory number in `packages/api` or `packages/contract`: no zod
  range, constant, default or test literal that encodes a legal value.
  API tests read legal values from `EMPLOYMENT_PACKS` or call the engine.
- Every legal date shown to a user carries its engine trace line (rule
  key, value, status `official` or `convention`, pack id and version).
  A value is `official` only where the research note marks the text
  READ and quotes the value.
- Product defaults (template items, due offsets, size bounds) are
  labelled "product default, not law" where shown.
- Exit settlement: shown exactly as `calculateSettlement` returns it,
  including its `notComputed` list verbatim; loans, tickets, bonds,
  claims, cards and deductions are listed as flag-only and **never
  deducted** (master feature list default).
- The exit kind (resignation, termination and so on) never changes the
  settlement: resignation rules are NOT FOUND in the research note.
- No AI anywhere in this plan. No "compliant" claim in any text.
- No deletes: `payroll_app` has no DELETE grant; removal is a status.
- Audit actions match `^[a-z]+(\.[a-z-]+)+$` (first segment has no
  hyphen). Audit data never holds amounts, salary, settlement figures,
  comment bodies, reasons or candidate contact details (Plan 3
  `assertNoSensitive` plus `HR_SENSITIVE_KEYS`, Task 2).
- Migrations are numbered `801_` to `807_` (Plan 8's range).
- Each task ends with `pnpm check` green and one commit. Review: a fresh
  per-task review after Tasks 1, 6 and 7 (law, money, security) and one
  whole-branch review at the end (speed ruling, 2026-11-26).

## Review Focus

1. A manager or employee calling any new GET route (offers, exits,
   tasks, applications, goals): no offer salary or settlement amount of
   anyone they may not see appears in any body (Task 4 and Task 6 extend
   Plan 3's `leak.test.ts`; `exit_settlement_hidden_from_manager`).
2. "Hire" sent twice at once after a retry: exactly one employee and one
   onboarding flow exist and both callers get the same employee id
   (Task 5 `hire_twice_concurrently_one_employee`).
3. Notice given on the last day of probation versus the day after, and
   a joiner on the 31st: the right rule applies and no date overflows a
   month (Task 1 `notice_on_probation_last_day_is_probation`,
   `probation_clamps_month_end`).
4. The engine refuses the leaver (GCC national, last day before
   2022-02-02) or returns not-applicable (UAE national): the exit shows
   the refusal or reason with status 200, never a 500 (Task 6
   `exit_settlement_refused_not_500`).
5. A leaver whose access was revoked still holds a valid session token:
   the next tenant call gets 403 `TENANT_FORBIDDEN`, and the company's
   last owner cannot be revoked (Task 7
   `revoked_session_gets_403_immediately`, `revoke_last_owner_409`).

## File Structure

```
packages/engine/src/sources.ts                 + DL33_ART9/43/44/45/53
packages/engine/src/rules/employment-pack.ts   ae-employment pack (data)
packages/engine/src/employment/calendar.ts     addMonthsClamped
packages/engine/src/employment/types.ts        ExitKind, inputs, results
packages/engine/src/employment/probation.ts    calculateProbation
packages/engine/src/employment/notice.ts       notice, settlement due
packages/contract/src/routes-hr.ts             HR_ROUTES (Tasks 2 to 8)
packages/contract/src/{tasks,hiring,offers,onboarding,exits,goals}.ts
packages/api/migrations/801_tasks.sql ... 807_goals.sql
packages/api/src/tasks/        task manager service and visibility
packages/api/src/approvals/    assertDecidable (shared approval rule)
packages/api/src/ports/        calendar, documents, access ports
packages/api/src/hiring/       requisitions, candidates, applications,
                               scorecards, interviews, offers
packages/api/src/onboarding/   templates, expand (pure), terms, hire
packages/api/src/exits/        notice, settlement (pure), exits, hooks,
                               close
packages/api/src/goals/        goals and check-ins
packages/api/src/routes/{tasks,hiring,offers,onboarding,exits,goals}.ts
HANDOVER.md, LEDGER.md                          updated in Task 8
```

---

### Task 1: `ae-employment` rule-pack, probation and notice dates

Law task: fresh per-task review.

**Files:**
- Modify: `packages/engine/src/sources.ts` (five ids below)
- Create: `packages/engine/src/rules/employment-pack.ts`,
  `src/employment/calendar.ts`, `src/employment/types.ts`,
  `src/employment/probation.ts`, `src/employment/notice.ts`
- Modify: `packages/engine/src/index.ts` (export the five new modules)
- Test: `packages/engine/tests/employment-pack.test.ts`,
  `tests/employment-probation.test.ts`, `tests/employment-notice.test.ts`

**Interfaces:**
- Consumes: `RulePack`, `RuleParam`, `deepFreeze`, `sourceOf`,
  `selectPack`, `TraceBuilder`, `Traced`, `EngineError`, `addDays`,
  `daysBetween`, `parseIsoDate`, `formatIsoDate`, `daysInMonth`; and
  `intParam`, `boolParam`, `fixedParam` from `src/gratuity-params.ts`
  (import, do not copy).
- Produces:
  - Source ids, url `https://uaelegislation.gov.ae/en/legislations/1541`,
    note `"Federal Decree-Law 33 of 2021, Article N(...)"`:
    `DL33_ART9` ("Article 9(1)-(6)"), `DL33_ART43` ("Article
    43(1)-(5)"), `DL33_ART44` ("Article 44 (heading and list read; body
    not read closely)"), `DL33_ART45` ("Article 45 (list read)"),
    `DL33_ART53` ("Article 53"). Plan 5 adds other `DL33_ART*` ids; the
    sets do not overlap.
  - `EMPLOYMENT_PACKS: readonly RulePack[]`: one pack, id
    `ae-employment`, version and effectiveFrom `2022-02-02`,
    effectiveTo `null`, `deepFreeze`d, params:

| key | value | status | source (clause) |
|---|---|---|---|
| empProbationMaxMonths | 6 | official | DL33_ART9 (9(1)) |
| empProbationEmployerNoticeDays | 14 | official | DL33_ART9 (9(1)) |
| empProbationLeaveStateNoticeDays | 14 | official | DL33_ART9 (9(4),(6)) |
| empProbationNewEmployerNoticeMonths | 1 | official | DL33_ART9 (9(3)) |
| empNoticeMinDays | 30 | official | DL33_ART43 (43(1)) |
| empNoticeMaxDays | 90 | official | DL33_ART43 (43(1)) |
| empNoticeReducibleByAgreement | true | official | DL33_ART43 (43(2)) |
| empJobSearchDayRight | true | official | DL33_ART43 (43(5)) |
| empSummaryDismissalNoticeDays | 0 | convention | DL33_ART44 |
| empWorkerExitWithoutNoticeDays | 0 | convention | DL33_ART45 |
| empSettlementDueDays | 14 | official | DL33_ART53 |
| empSettlementTrigger | "last-working-date" | convention | DL33_ART53 |
| empNoticeStartRule | "day-after-notice" | convention | ENGINE_CONVENTION |
| empProbationEndRule | "clamped-months-minus-one-day" | convention | ENGINE_CONVENTION |

  - `calendar.ts`: `addMonthsClamped(date: string, months: number):
    string` (same day number `months` later, clamped to the target
    month's last day; `months` a whole number of at least 0, else
    `INVALID_MONTHS`).
  - `types.ts`:
    `type ExitKind = "resignation" | "termination" |
    "summary-dismissal" | "worker-exit-without-notice" |
    "probation-employer-termination" | "probation-leave-state" |
    "probation-new-employer"`; `EXIT_KINDS: readonly ExitKind[]` in
    that order; `PROBATION_KINDS` (the last three); `WORKER_KINDS =
    ["resignation", "worker-exit-without-notice",
    "probation-leave-state", "probation-new-employer"]`;
    `type NoticeFlag = "reduced-by-agreement" | "counsel-review" |
    "job-search-day"`;
    `ProbationInput { joiningDate: string; probationMonths: number }`;
    `ProbationResult { probationEndDate: string | null;
    employerNoticeDeadline: string | null }`;
    `NoticeInput { kind: ExitKind; joiningDate: string;
    noticeGivenDate: string; probationEndDate: string | null;
    contractNoticeDays: number | null; agreedNoticeDays: number | null }`;
    `NoticeResult { kind: ExitKind; inProbation: boolean; noticeDays:
    number; lastWorkingDate: string; settlementDueDate: string; flags:
    NoticeFlag[] }`.
  - `probation.ts`: `calculateProbation(input: ProbationInput, packs:
    readonly RulePack[], ov?: Record<string, ParamValue>):
    Traced<ProbationResult>`. Pack by `joiningDate`. `probationMonths`
    not a whole number of at least 0: `INVALID_PROBATION_MONTHS`; above
    `empProbationMaxMonths`: `PROBATION_TOO_LONG` (`detail.value`,
    `detail.max`). Zero months: both dates `null`, one trace line
    `employment.probation.none`. Otherwise `probationEndDate =
    addDays(addMonthsClamped(joiningDate, months), -1)` (trace
    `employment.probation.end`, rules `empProbationMaxMonths`,
    `empProbationEndRule`), `employerNoticeDeadline =
    max(joiningDate, addDays(end, -empProbationEmployerNoticeDays))`
    (trace `employment.probation.notice-deadline`, rules
    `empProbationEmployerNoticeDays`, `empNoticeStartRule`).
  - `notice.ts`:
    `validateContractNotice(days: number, onDate: string, packs,
    ov?): Traced<number>`: whole number else `INVALID_NOTICE_DAYS`;
    outside `[empNoticeMinDays, empNoticeMaxDays]`:
    `NOTICE_OUT_OF_RANGE` (`detail.value`, `detail.min`, `detail.max`);
    trace `employment.notice.contract`.
    `settlementDueDate(lastWorkingDate: string, packs, ov?):
    Traced<string>` = `addDays(lastWorkingDate, empSettlementDueDays)`,
    trace `employment.settlement.due` with rules
    `empSettlementDueDays` and `empSettlementTrigger`.
    `calculateNotice(input: NoticeInput, packs, ov?):
    Traced<NoticeResult>`. Pack by `noticeGivenDate`. Rules:
    1. `noticeGivenDate < joiningDate`: `NOTICE_BEFORE_JOINING`.
       Unknown kind: `UNKNOWN_EXIT_KIND`.
    2. `inProbation = probationEndDate !== null && noticeGivenDate <=
       probationEndDate`. A probation kind when not in probation:
       `EXIT_KIND_NEEDS_PROBATION`; `resignation` or `termination` in
       probation: `EXIT_KIND_IN_PROBATION`.
    3. Base days: `resignation`, `termination`: `contractNoticeDays`
       (null: `CONTRACT_NOTICE_REQUIRED`), checked by
       `validateContractNotice`; `probation-employer-termination`:
       `empProbationEmployerNoticeDays`; `probation-leave-state`:
       `empProbationLeaveStateNoticeDays`; `probation-new-employer`:
       last day `addMonthsClamped(noticeGivenDate,
       empProbationNewEmployerNoticeMonths)`, days = `daysBetween`;
       `summary-dismissal`: `empSummaryDismissalNoticeDays`;
       `worker-exit-without-notice`: `empWorkerExitWithoutNoticeDays`.
    4. `agreedNoticeDays` (not null): only for `resignation` and
       `termination` (else `AGREED_NOTICE_NOT_APPLICABLE`); whole
       number of at least 0 (else `INVALID_NOTICE_DAYS`); above the base
       days: `AGREED_NOTICE_TOO_LONG`; below: used, flag
       `reduced-by-agreement` (rule `empNoticeReducibleByAgreement`).
    5. `lastWorkingDate = addDays(noticeGivenDate, noticeDays)` (rule
       `empNoticeStartRule`); `settlementDueDate` from the function
       above.
    6. Flags: `counsel-review` for `summary-dismissal` and
       `worker-exit-without-notice`; `job-search-day` for `termination`
       with `noticeDays > 0` (rule `empJobSearchDayRight`).
    7. Trace lines in order: `employment.notice.kind`
       (inputs kind, inProbation), `employment.notice.days`,
       `employment.notice.last-day`, `employment.settlement.due`.
    These trace ids are not added to the explain catalog (Ruling 26).

- [ ] **Step 1: Write the failing tests**

`employment-pack.test.ts`:
- `pack_frozen`: `Object.isFrozen(EMPLOYMENT_PACKS[0]!.params
  .empNoticeMinDays)` is true.
- `official_params_cite_article`: every `official` param has
  `source.note` matching `/Article \d/` and url starting
  `https://uaelegislation.gov.ae/en/legislations/`.
- `statuses_match_table`: a literal copy of the table's key-to-status
  map deep-equals the pack's key-to-status map.
- `keys_prefixed`: every key starts with `emp`.
- `no_pack_before_2022`: `calculateNotice` with `noticeGivenDate
  "2022-02-01"` throws `NO_PACK_FOR_DATE`.

`employment-probation.test.ts`:
- `probation_six_months`: joined `2026-03-01`, 6 months: end
  `2026-08-31`, deadline `2026-08-17`; trace line ids are
  `employment.probation.end`, `employment.probation.notice-deadline`;
  the end line's rule `empProbationMaxMonths` has status `official`.
- `probation_clamps_month_end` (Review Focus 3): joined `2026-01-31`,
  1 month: end `2026-02-27`; joined `2024-08-31`, 6 months: end
  `2025-02-27`; `addMonthsClamped("2024-01-31", 1)` is `"2024-02-29"`.
- `probation_zero_months`: both null, one line
  `employment.probation.none`.
- `probation_too_long`: 7 months throws `PROBATION_TOO_LONG` with
  `detail.max === "6"`; `-1` and `1.5` throw
  `INVALID_PROBATION_MONTHS`.
- `probation_override_marks_overridden`: `{ empProbationMaxMonths: 3 }`
  makes 4 months throw and 3 pass with `rules[0].overridden === true`.
- `probation_never_exceeds_max` (fast-check, any joining date
  2022-02-02..2030-12-31, months 1..6): `end >= joiningDate` and
  `end < addMonthsClamped(joiningDate, months)`.

`employment-notice.test.ts` (base: joined `2024-01-01`, probation end
`2024-06-30`, contract 30 days):
- `notice_resignation_contract_days`: given `2026-03-01`: `noticeDays`
  30, last `2026-03-31`, settlement due `2026-04-14`, `inProbation`
  false, flags `[]`.
- `notice_on_probation_last_day_is_probation` (Review Focus 3): given
  `2024-06-30`, `resignation` throws `EXIT_KIND_IN_PROBATION`;
  `probation-employer-termination` gives 14 days, last `2024-07-14`;
  given `2024-07-01`, `probation-employer-termination` throws
  `EXIT_KIND_NEEDS_PROBATION`.
- `notice_new_employer_one_month`: given `2024-01-31`,
  `probation-new-employer`: last `2024-02-29`, `noticeDays` 29; its
  `employment.notice.days` line cites
  `empProbationNewEmployerNoticeMonths` with value `"1"`.
- `notice_contract_out_of_range`: contract 29 and 91 throw
  `NOTICE_OUT_OF_RANGE`; 90 passes; null for `termination` throws
  `CONTRACT_NOTICE_REQUIRED`.
- `notice_agreed_reduction`: contract 60, agreed 10: `noticeDays` 10,
  flags `["reduced-by-agreement"]`; agreed 70 throws
  `AGREED_NOTICE_TOO_LONG`; agreed 5 on
  `probation-leave-state` throws `AGREED_NOTICE_NOT_APPLICABLE`.
- `notice_termination_job_search_flag`: `termination` flags include
  `job-search-day`; `resignation` flags do not.
- `notice_without_notice_kinds`: `summary-dismissal` and
  `worker-exit-without-notice`: `noticeDays` 0, last = given, flags
  `["counsel-review"]`, the days line's rule status `convention`.
- `notice_before_joining`: given `2023-12-31` throws
  `NOTICE_BEFORE_JOINING`.
- `settlement_due_rules`: the `employment.settlement.due` line has
  rule `empSettlementDueDays` status `official` and
  `empSettlementTrigger` status `convention`.
- `notice_override_min`: `{ empNoticeMinDays: 45 }` makes contract 30
  throw `NOTICE_OUT_OF_RANGE`.
- `notice_dates_consistent` (fast-check, kinds `resignation` and
  `termination`, contract 30..90, given 2024-07-01..2030-12-31):
  `daysBetween(given, last) === noticeDays` and
  `settlementDueDate === addDays(last, 14)`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/engine test employment`.
  Expected: FAIL (modules missing).
- [ ] **Step 3: Implement** the source ids, the pack (a local `param()`
  helper as in `gratuity-pack.ts`, one short comment per line quoting
  the clause from the research note), then `calendar.ts`, `types.ts`,
  `probation.ts`, `notice.ts`. Read every value with `intParam`,
  `boolParam` or `fixedParam`.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS (the purity test now
  scans `src/employment/`; `shared.test.ts` checks each source note).
- [ ] **Step 5: Commit** `feat(engine): employment rule-pack and dates`.

### Task 2: Task manager and the HR route registry

**Files:**
- Create: `packages/contract/src/tasks.ts`,
  `packages/contract/src/routes-hr.ts`
- Modify: `packages/contract/src/routes.ts` (rename Plan 3's list to
  `CORE_ROUTES`; `ROUTES = [...CORE_ROUTES, ...HR_ROUTES]`),
  `src/errors.ts`, `src/examples.ts`, `src/index.ts`,
  `tests/routes.test.ts` (the "count of routes equals 49" assertion
  becomes `CORE_ROUTES.length === 49`)
- Create: `packages/api/migrations/801_tasks.sql`,
  `packages/api/src/tasks/tasks.ts`, `src/tasks/visibility.ts`,
  `src/routes/tasks.ts`
- Create: `packages/api/src/audit/hr-audit.ts`
- Modify: `packages/api/src/app.ts` (register), `tests/helpers/seed.ts`
  (`seedHr`, below), `tests/leak.test.ts` (id map),
  `tests/conformance.test.ts` (one happy-path row per new route)
- Test: `packages/contract/tests/routes-hr.test.ts`,
  `packages/api/tests/tasks.test.ts`

**Interfaces:**
- Consumes: Plan 3 `RouteDef`, `Role`, `Id`, `IsoDate`, `Timestamp`,
  `TraceLine`, `withTenant` (through `register`), `ReqCtx`,
  `appendAudit`, `viewerScope`, `ApiError`, `createTestDb`, `makeApp`,
  `seedCompany`; `dubaiDate` (Plan 3 Task 6).
- Produces (contract, exported from `index.ts`):
  - `TaskStatus = z.enum(["open","in-progress","done","cancelled"])`;
    `FlowType = z.enum(["onboarding","exit","requisition","goal"])`;
    `TaskSource = z.enum(["manual","onboarding-template",
    "exit-template","probation-reminder","exit-deadline"])`.
  - `ChecklistItem { id; label; done: boolean; doneBy: Id | null;
    doneAt: Timestamp | null; status: "active" | "removed" }`;
    `TaskComment { id; authorUserId: Id; body; createdAt }`.
  - `TaskSummary { id; title; status; assigneeUserId: Id | null;
    assigneeRole: Role | null; dueDate: IsoDate | null; overdue:
    boolean; employeeId: Id | null; flow: { type: FlowType; id: Id } |
    null; source: TaskSource; rule: TraceLine | null; checklistDone:
    int; checklistTotal: int; commentCount: int; createdBy: Id;
    createdAt; completedAt: Timestamp | null }`;
    `Task = TaskSummary & { description: string | null; checklist:
    ChecklistItem[]; comments: TaskComment[] }`.
  - `TaskCreate { title 1..200; description? max 4000;
    assigneeUserId?: Id; dueDate?: IsoDate; employeeId?: Id;
    checklist?: string (1..200)[] max 30 }` (no flow: only the system
    links tasks to flows); `TaskUpdate { title?; description?: string |
    null; assigneeUserId?: Id | null; dueDate?: IsoDate | null;
    status?: TaskStatus; addChecklist?: string[] max 30 }`;
    `TaskQuery { mine?: "true"; employeeId?; flowType?; flowId?;
    status?; dueBefore?: IsoDate }`; `CommentCreate { body 1..4000 }`;
    `ChecklistItemUpdate { done?: boolean; removed?: true }`.
  - `HR_ROUTES: readonly RouteDef[]`, this task's six (all roles,
    tenant): `listTasks GET /v1/tasks` (query `TaskQuery`, response
    `TaskSummary[]`), `createTask POST /v1/tasks` (201, `Task`),
    `getTask GET /v1/tasks/{id}`, `updateTask PATCH /v1/tasks/{id}`,
    `addTaskComment POST /v1/tasks/{id}/comments` (201),
    `updateChecklistItem PATCH /v1/tasks/{id}/checklist/{itemId}`, each
    responding `Task`.
  - Error codes (status): `TASK_TRANSITION` 409, `ASSIGNEE_NOT_MEMBER`
    422.
  - `EXAMPLES` entries for `Task` and `TaskSummary`.
- Produces (api):
  - Migration 801: `tasks(id, company_id, title, description, status,
    assignee_user_id, assignee_role, due_date, employee_id, flow_type,
    flow_id, source, rule jsonb, created_by, created_at,
    completed_at)`, `task_checklist_items(id, company_id, task_id,
    label, done, done_by, done_at, status, position)`,
    `task_comments(id, company_id, task_id, author_user_id, body,
    created_at)`; indexes on `(company_id, assignee_user_id, status)`
    and `(company_id, flow_type, flow_id)`; RLS as Plan 3; grants
    select, insert, update (comments: insert, select).
  - `NewTaskInput { title; description: string | null;
    assigneeUserId: string | null; assigneeRole: Role | null; dueDate:
    string | null; employeeId: string | null; flow: { type; id } |
    null; source: TaskSource; rule: TraceLine | null; checklist:
    string[] }`.
  - `createTasks(tx: Db, deps: AppDeps, companyId: string, actorUserId:
    string, items: NewTaskInput[]): Promise<TaskSummary[]>` (one audit
    `task.created` per task, `data: { source, flowType }`), used by
    Tasks 5 and 6.
  - `cancelFlowTasks(tx, deps, companyId, actorUserId, flow: { type;
    id }, why: string): Promise<string[]>`: cancels open and
    in-progress tasks of the flow, adds a comment `why` to each,
    returns their ids. `cancelTasksWhere(tx, deps, companyId,
    actorUserId, f: { employeeId: string; source: TaskSource }, why):
    Promise<string[]>` does the same by employee and source.
  - `openFlowTaskIds(tx, companyId, flow): Promise<string[]>` (status
    open or in-progress).
  - `isActiveMember(tx, companyId, userId): Promise<boolean>`
    (membership exists; Task 7 adds "and not revoked").
  - `canSeeTask(viewer: { role; userId }, t: { assigneeUserId;
    createdBy }): boolean` in `visibility.ts`: owner and hr all; others
    assignee or creator. Unseen tasks are 404.
  - Rules: an employee may create only tasks assigned to self (missing
    assignee means self; another: 403 `FORBIDDEN`); the assignee must
    be an active member (422 `ASSIGNEE_NOT_MEMBER`); `employeeId` must
    be in `viewerScope` (else 404); title, description, assignee, due
    date: creator, owner, hr (else 403 `FORBIDDEN`); status: those or
    the assignee; cancelling a flow task: owner or hr only (403).
    Transitions: open to in-progress, done, cancelled; in-progress to
    open, done, cancelled; done to open; cancelled to open (owner, hr);
    any other: 409 `TASK_TRANSITION`. `done` sets `completedAt`, reopen
    clears it. `overdue` = status open or in-progress and `dueDate <
    dubaiDate(deps.now())`. List order: due date ascending (nulls
    last), then `createdAt`. Checklist items are never deleted:
    `removed: true` sets status `removed`.
  - `hr-audit.ts`: `HR_SENSITIVE_KEYS = ["body","reason","note",
    "email","phone","salary","settlement","total","gratuity",
    "leavePay"]` and `hrAudit(tx: Db, e: AuditInput):
    Promise<AuditEvent>`, which throws `AUDIT_SENSITIVE_DATA` on any of
    these keys and then calls `appendAudit`. Every Plan 8 service
    audits through `hrAudit` (Plan 3's own list is left unchanged).
  - Audit: `task.created`, `task.updated` (`data: { changed: string[],
    status? }`), `task.commented` (no body).
  - `seed.ts`: `seedHr(app, seeded)` starts here (one manual task
    assigned to the seeded employee) and returns `{ taskId }`; later
    tasks add fields. The leak test's id map gets `{id}` for task
    routes and `{itemId}`.

- [ ] **Step 1: Write the failing tests**

`routes-hr.test.ts`: `HR_ROUTES.map((r) => r.id)` deep-equals the
literal `HR_ROUTE_IDS` array in the test (this task: the six ids above;
each later task appends its ids); every HR route has `auth: "tenant"`;
`ROUTES.length === CORE_ROUTES.length + HR_ROUTES.length`; no
`(method, path)` pair repeats across both lists.

`tasks.test.ts`:
- `tasks_employee_creates_self_task`: 201, `assigneeUserId` is the
  caller, audit `task.created` with `data.source "manual"`.
- `tasks_employee_cannot_assign_others`: 403 `FORBIDDEN`.
- `tasks_visibility_assigned_or_created`: a manager neither assignee
  nor creator gets 404 on GET and the task is absent from the list; hr
  sees it.
- `tasks_status_transitions`: done sets `completedAt`; reopen clears
  it; `done` to `in-progress` is 409 `TASK_TRANSITION`.
- `tasks_overdue_uses_dubai_date`: due `2026-03-01`; at
  `2026-02-28T20:30:00Z` (Dubai 1 March) `overdue` false; at
  `2026-03-01T20:00:00Z` (Dubai 2 March) true.
- `tasks_checklist_toggle_and_remove`: toggling sets `doneBy`;
  `removed: true` keeps the item with status `removed`;
  `checklistTotal` counts only active items.
- `tasks_comment_audit_has_no_body`: audit `data` text lacks the
  comment body; `hrAudit` with `data: { note: "x" }` throws
  `AUDIT_SENSITIVE_DATA`.
- `tasks_assignee_must_be_member`: random uuid gives 422
  `ASSIGNEE_NOT_MEMBER`.
- `tasks_link_employee_out_of_scope_404`: a manager linking a
  non-report employee gets 404.
- `tasks_flow_cancel_hr_only`: a flow task made with `createTasks`
  (flow `exit`) and assigned to the employee: the employee cancelling
  gets 403, hr succeeds; `cancelFlowTasks` returns its id and adds the
  comment.
- `tasks_no_delete_route`: no route in `ROUTES` has method `DELETE`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/contract test` and
  `pnpm --filter @payroll/api test tasks`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS, including Plan 3's
  conformance, leak and RLS catalog tests over the new routes and
  tables.
- [ ] **Step 5: Commit** `feat(api): task manager`.

### Task 3: Requisitions, candidates, applications, scorecards, interviews

**Files:**
- Create: `packages/contract/src/hiring.ts`
- Modify: `packages/contract/src/routes-hr.ts`, `src/errors.ts`,
  `src/examples.ts`, `src/index.ts`, `tests/routes-hr.test.ts`
- Create: `packages/api/migrations/802_hiring.sql`,
  `packages/api/src/approvals/decide.ts`, `src/ports/calendar.ts`,
  `src/hiring/requisitions.ts`, `src/hiring/candidates.ts`,
  `src/hiring/applications.ts`, `src/hiring/scorecards.ts`,
  `src/hiring/interviews.ts`, `src/routes/hiring.ts`
- Modify: `packages/api/src/deps.ts` (`calendar` in `AppDeps`, default
  `notConnectedCalendar`), `src/app.ts`, `tests/helpers/test-app.ts`
  (`makeApp({ calendar })` override), `tests/helpers/seed.ts`,
  `tests/leak.test.ts`, `tests/conformance.test.ts`
- Test: `packages/api/tests/approvals.test.ts`,
  `tests/requisitions.test.ts`, `tests/applications.test.ts`

**Interfaces:**
- Consumes: Task 2 `HR_ROUTES`, `hrAudit`, `isActiveMember`; Plan 3
  `ReqCtx`, `ApiError`, `Role`.
- Produces (contract):
  - `Decision { approve: boolean; note?: string max 1000 }` (shared by
    requisitions, offers and exits).
  - `RequisitionStatus = z.enum(["pending-approval","open","rejected",
    "filled","cancelled"])`; `RequisitionCreate { title 1..200;
    titleAr?; departmentId?: Id; hiringManagerUserId?: Id; headcount:
    int 1..50; reason?: max 2000 }`; `Requisition { id; title; titleAr:
    string | null; departmentId: Id | null; hiringManagerUserId: Id |
    null; headcount; hiredCount: int; status; reason: string | null;
    requestedBy: Id; decidedBy: Id | null; decidedAt: Timestamp | null;
    decisionNote: string | null; createdAt }`; `RequisitionClose {
    reason 1..1000 }`.
  - `CandidateSource = z.enum(["referral","agency","job-board",
    "website","social","direct","other"])`; `CandidateCreate {
    fullName 1..200; email?; phone?: ^\+?\d{7,15}$; source;
    sourceDetail?: max 200 }`; `Candidate { id; fullName; email:
    string | null; phone: string | null; source; sourceDetail: string
    | null; createdAt }`.
  - `Stage = z.enum(["applied","screening","interview","offer",
    "hired","rejected","withdrawn"])`; `StageMove { stage: Stage
    excluding "hired"; note?: max 1000 }`; `StageEvent { stage; at; by:
    Id; note: string | null }`.
  - `Scorecard { id; interviewerUserId; criteria: { key:
    ^[a-z][a-z0-9-]{0,31}$; rating: int 1..5; note: string | null }[]
    1..10; recommendation: "strong-no" | "no" | "yes" | "strong-yes";
    summary: string | null; submittedAt }`; `ScorecardCreate` (criteria,
    recommendation, summary?).
  - `Interview { id; applicationId; startsAt: Timestamp; endsAt:
    Timestamp; interviewerUserIds: Id[] 1..5; location: string | null;
    status: "scheduled" | "cancelled"; calendar: { status:
    "not-connected" | "sent" | "failed"; externalRef: string | null }
    }`; `InterviewCreate { startsAt; endsAt; interviewerUserIds;
    location?: max 300 }`.
  - `ApplicationCreate { requisitionId; candidateId }`; `Application {
    id; requisitionId; candidate: { id; fullName }; stage; history:
    StageEvent[]; scorecards: Scorecard[]; interviews: Interview[];
    offerId: Id | null; createdAt }`; `ApplicationQuery {
    requisitionId?; stage? }`.
  - Routes appended to `HR_ROUTES` (fourteen): `listRequisitions GET
    /v1/requisitions`, `createRequisition POST /v1/requisitions` (201),
    `getRequisition GET /v1/requisitions/{id}` (owner, hr, manager);
    `decideRequisition POST /v1/requisitions/{id}/decision` (owner,
    hr; body `Decision`); `closeRequisition POST
    /v1/requisitions/{id}/close` (owner, hr, manager); `listCandidates
    GET /v1/candidates`, `createCandidate POST /v1/candidates` (owner,
    hr); `listApplications GET /v1/applications` (owner, hr, manager),
    `createApplication POST /v1/applications` (owner, hr),
    `getApplication GET /v1/applications/{id}`,
    `moveApplicationStage POST /v1/applications/{id}/stage`,
    `submitScorecard POST /v1/applications/{id}/scorecards` (201),
    `scheduleInterview POST /v1/applications/{id}/interviews` (201),
    `cancelInterview POST /v1/interviews/{id}/cancel` (owner, hr,
    manager); application routes respond `Application`, interview
    cancel responds `Interview`.
  - Error codes: `APPROVAL_NOT_PENDING` 409, `REQUISITION_NOT_OPEN`
    409, `CANDIDATE_EXISTS` 409, `APPLICATION_EXISTS` 409,
    `APPLICATION_CLOSED` 409, `SCORECARD_EXISTS` 409,
    `INTERVIEW_TIMES` 422, `INTERVIEWER_ROLE` 422.
  - `EXAMPLES` for `Requisition`, `Candidate`, `Application`,
    `Interview`.
- Produces (api):
  - `assertDecidable(ctx: ReqCtx, item: { status: string; requestedBy:
    string }, opts: { pending: string; roles: readonly Role[] }): void`:
    role not in `opts.roles` 403 `FORBIDDEN`; status not `pending` 409
    `APPROVAL_NOT_PENDING`; caller is `requestedBy` 403
    `SOD_VIOLATION`. The one approval rule for requisitions, offers and
    exits (seed of UQ18).
  - `CalendarPort { proposeEvent(e: { companyId: string; interviewId:
    string; startsAt: string; endsAt: string; attendeeUserIds:
    string[]; title: string }): Promise<{ status: "not-connected" } |
    { status: "sent"; externalRef: string }> }`;
    `notConnectedCalendar: CalendarPort`. A throwing port is stored as
    `failed`; the interview is still saved.
  - Migration 802: `requisitions`, `candidates` (unique `(company_id,
    lower(email))` where email is not null), `applications` (unique
    `(company_id, requisition_id, candidate_id)`),
    `application_stage_events`, `scorecards` (unique `(company_id,
    application_id, interviewer_user_id)`), `interviews`.
  - Rules: a new requisition is `pending-approval`; a manager's
    `hiringManagerUserId` defaults to and must equal the caller (403
    `FORBIDDEN`); approve opens it, reject sets `rejected`; close
    (requester, owner, hr) sets `cancelled` from pending or open, else
    409 `REQUISITION_NOT_OPEN`. Managers see requisitions they
    requested or hire for; owner and hr see all. Applications need an
    `open` requisition (409 `REQUISITION_NOT_OPEN`). Stage moves:
    owner, hr or the hiring manager; from `hired`, `rejected` or
    `withdrawn`: 409 `APPLICATION_CLOSED`; every move adds a
    `StageEvent`; `hired` is set only by Task 5. Interviewers must be
    active members with role owner, hr or manager (422
    `INTERVIEWER_ROLE`); `endsAt <= startsAt`: 422 `INTERVIEW_TIMES`.
    Scorecards: interviewer = caller; a manager must be the hiring
    manager or listed on one of the application's interviews (else
    404); one per interviewer (409 `SCORECARD_EXISTS`). Scorecard
    visibility: owner, hr and the hiring manager all; others their own.
    Candidate duplicate email (case-insensitive): 409
    `CANDIDATE_EXISTS`.
  - Audit: `requisition.created`, `requisition.approved`,
    `requisition.rejected`, `requisition.cancelled`,
    `candidate.created` (no contact data), `application.created`,
    `application.stage-changed` (`data: { from, to }`),
    `scorecard.submitted`, `interview.scheduled`,
    `interview.cancelled`.
  - `seedHr` adds an open requisition (hiring manager: the seeded
    manager), a candidate and an application at stage `offer`.

- [ ] **Step 1: Write the failing tests**

`approvals.test.ts` (fake `ReqCtx`): `decide_not_pending_409`,
`decide_requester_sod_403`, `decide_wrong_role_403`,
`decide_ok_returns_void`.

`requisitions.test.ts`:
- `req_manager_creates_pending`: 201, status `pending-approval`,
  `hiringManagerUserId` is the manager.
- `req_manager_cannot_decide`: manager 403 `FORBIDDEN`; hr deciding a
  request hr made 403 `SOD_VIOLATION`.
- `req_owner_approves_opens`: status `open`, `decidedBy` the owner.
- `req_reject_keeps_note`: `decisionNote` stored; audit `data` lacks
  the note text.
- `req_manager_sees_own_only`: a requisition by hr with another hiring
  manager is absent from the manager's list and 404 on GET.
- `req_employee_forbidden`: 403 on list and create.
- `req_close_cancelled`: then a new application gives 409
  `REQUISITION_NOT_OPEN`.

`applications.test.ts`:
- `app_requires_open_requisition`: pending requisition gives 409.
- `app_duplicate_409`: same candidate twice gives
  `APPLICATION_EXISTS`.
- `app_stage_moves_and_history`: applied, screening, interview,
  screening (back) gives four `history` events in order.
- `app_stage_hired_rejected_by_schema`: `stage: "hired"` gives 400
  `VALIDATION_FAILED`.
- `app_closed_after_rejected`: a move after `rejected` gives 409
  `APPLICATION_CLOSED`.
- `scorecard_one_per_interviewer`: second submit 409.
- `scorecard_visibility_interviewer_own_only`: interview with two
  manager interviewers (neither hiring manager); each sees one
  scorecard in `getApplication`; hr sees two.
- `interview_end_before_start_422`.
- `interview_employee_interviewer_422`: an employee-role user gives
  `INTERVIEWER_ROLE`.
- `interview_calendar_not_connected`: `calendar.status`
  `"not-connected"`, `externalRef` null.
- `interview_calendar_port_throws_recorded_failed`: `makeApp({
  calendar: throwing })` gives 201 with `calendar.status "failed"`.
- `candidate_duplicate_email_409`: `A@x.com` then `a@x.com`.
- `candidate_hidden_from_employee`: employee 403 on `GET
  /v1/candidates`; candidate audit `data` lacks the email.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test requisitions
  applications approvals`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): requisitions and applicant tracker`.

### Task 4: Offers with approval

**Files:**
- Create: `packages/contract/src/offers.ts`,
  `packages/api/migrations/803_offers.sql`,
  `packages/api/src/hiring/offers.ts`, `src/routes/offers.ts`
- Modify: contract `routes-hr.ts`, `errors.ts`, `examples.ts`,
  `index.ts`, `tests/routes-hr.test.ts`; api `src/app.ts`,
  `src/people/employees.ts` (export `validateSalary`),
  `tests/helpers/seed.ts`, `tests/leak.test.ts`,
  `tests/conformance.test.ts`
- Test: `packages/api/tests/offers.test.ts`

**Interfaces:**
- Consumes: Task 1 `calculateProbation`, `validateContractNotice`,
  `EMPLOYMENT_PACKS`; Task 3 `assertDecidable`, `Decision`,
  applications; Plan 3 `SalaryComponent`, `Keyring`, `toMoney`,
  `parseAed`, and `validateSalary(components: SalaryComponent[]):
  void` (Plan 3's salary rules, exported from
  `src/people/employees.ts`: 422 `BASIC_COMPONENT_REQUIRED`,
  `DUPLICATE_COMPONENT`).
- Produces (contract):
  - `OfferStatus = z.enum(["pending-approval","approved","rejected",
    "accepted","declined","withdrawn","hired"])`.
  - `OfferCreate { applicationId; jobTitle 1..200; departmentId?;
    managerId?: Id (employee); startDate: IsoDate; salary:
    SalaryComponent[] 1..30; probationMonths: int >= 0;
    contractNoticeDays: int >= 1; expiresOn?: IsoDate; note?: max
    1000 }` (legal limits are checked by the engine, not zod).
  - `Offer { id; applicationId; candidateName; jobTitle; departmentId:
    Id | null; managerId: Id | null; startDate; salary:
    SalaryComponent[] | null; probationMonths; probationEndDate: IsoDate
    | null; contractNoticeDays; termsTrace: TraceLine[]; expiresOn:
    IsoDate | null; status; createdBy; decidedBy: Id | null; decidedAt:
    Timestamp | null; respondedOn: IsoDate | null; employeeId: Id |
    null; createdAt }` (`salary` null: not visible to you).
  - `OfferResponse { accepted: boolean; respondedOn: IsoDate }`.
  - Routes (six): `createOffer POST /v1/offers` (owner, hr; 201),
    `listOffers GET /v1/offers`, `getOffer GET /v1/offers/{id}` (owner,
    hr, manager), `decideOffer POST /v1/offers/{id}/decision` (owner,
    `mfa: true`), `recordOfferResponse POST /v1/offers/{id}/response`,
    `withdrawOffer POST /v1/offers/{id}/withdraw` (owner, hr); all
    respond `Offer`.
  - Error codes: `APPLICATION_NOT_AT_OFFER` 409, `OFFER_EXISTS` 409,
    `OFFER_NOT_APPROVED` 409, `OFFER_EXPIRED` 409,
    `OFFER_NOT_WITHDRAWABLE` 409. `EXAMPLES.Offer` uses salary
    `"1234.00"`.
- Produces (api):
  - Migration 803: `offers(id, company_id, application_id, job_title,
    department_id, manager_id, start_date, salary_enc,
    probation_months, contract_notice_days, expires_on, note, status,
    created_by, decided_by, decided_at, decision_note, responded_on,
    employee_id, created_at)`; partial unique `(company_id,
    application_id) WHERE status IN ('pending-approval','approved',
    'accepted','hired')`. Salary encrypted with the company DEK, AAD
    `"<companyId>:offers:salary_enc:<offerId>"`.
  - `loadOffer(tx, deps, companyId, id): Promise<OfferRow>` (decrypted,
    amounts as `Fils`, internal, used by Task 5);
    `toOfferView(row, viewer: { role }): Offer` (the only serializer;
    salary for owner and hr only); the terms trace is
    `calculateProbation(...).trace` plus
    `validateContractNotice(...).trace`.
  - Rules: application stage must be `offer` (409
    `APPLICATION_NOT_AT_OFFER`); one live offer per application (409
    `OFFER_EXISTS`, from the partial unique index); `validateSalary`;
    the engine checks run at create with `onDate = startDate` and an
    `EngineError` maps to Plan 3's 422 `ENGINE_REFUSED`. Decision:
    `assertDecidable(ctx, { status, requestedBy: createdBy }, {
    pending: "pending-approval", roles: ["owner"] })`. Response only on
    `approved` (409 `OFFER_NOT_APPROVED`); `respondedOn > expiresOn`:
    409 `OFFER_EXPIRED`. Withdraw from pending-approval, approved or
    accepted (else 409 `OFFER_NOT_WITHDRAWABLE`). Managers see offers
    on requisitions they hire for, with `salary: null`.
  - Audit: `offer.created` (`data: { applicationId }`),
    `offer.approved`, `offer.rejected`, `offer.accepted`,
    `offer.declined`, `offer.withdrawn`; never salary.
  - `seedHr` adds an approved, accepted offer on the seeded application
    with basic `"8888.01"` (`OFFER_SENTINEL`); the leak test's `mayView`
    gets: offer routes show `OFFER_SENTINEL` to owner and hr only.

- [ ] **Step 1: Write the failing tests** in `offers.test.ts`:
- `offer_requires_offer_stage`: application at `screening` gives 409
  `APPLICATION_NOT_AT_OFFER`.
- `offer_probation_over_max_refused`: `probationMonths` =
  `EMPLOYMENT_PACKS[0]!.params.empProbationMaxMonths.value + 1` gives
  422 `ENGINE_REFUSED`, `detail.engineCode "PROBATION_TOO_LONG"`.
- `offer_notice_out_of_range_refused`: `contractNoticeDays` =
  `empNoticeMinDays.value - 1` gives 422, `engineCode
  "NOTICE_OUT_OF_RANGE"`.
- `offer_terms_from_engine`: `probationEndDate` equals
  `calculateProbation({ joiningDate: startDate, probationMonths },
  EMPLOYMENT_PACKS).value.probationEndDate`; `termsTrace` is non-empty.
- `offer_salary_hidden_from_manager`: hiring manager GET gives
  `salary: null` and the body text lacks `"8888.01"`.
- `offer_approve_needs_mfa`: 403 `MFA_REQUIRED`.
- `offer_creator_cannot_approve`: an owner-created offer approved by
  the same owner gives 403 `SOD_VIOLATION`.
- `offer_response_only_after_approval`: 409 `OFFER_NOT_APPROVED`.
- `offer_expired_409`: `expiresOn 2026-03-10`, `respondedOn
  2026-03-11`.
- `offer_one_live_per_application`: second create 409 `OFFER_EXISTS`;
  after withdraw a new offer is 201.
- `offer_salary_encrypted_at_rest`: the raw `offers` row text lacks
  `"8888.01"`; audit `data` text lacks it.
- `offer_basic_required`: salary without `basic` gives 422
  `BASIC_COMPONENT_REQUIRED`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test offers`.
  Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS (leak test covers the
  offer routes).
- [ ] **Step 5: Commit** `feat(api): offers with approval`.

### Task 5: Offer to hire, employment terms, onboarding checklist

Money-adjacent (copies salary into the employee record): covered by the
whole-branch review; `hire_*` tests pin the salary copy.

**Files:**
- Create: `packages/contract/src/onboarding.ts`,
  `packages/api/migrations/804_onboarding.sql`,
  `packages/api/src/onboarding/templates.ts`,
  `src/onboarding/expand.ts` (pure), `src/onboarding/terms.ts`,
  `src/onboarding/hire.ts`, `src/routes/onboarding.ts`
- Modify: contract `routes-hr.ts`, `routes.ts` (`altStatus` comment
  adds hire), `errors.ts`, `examples.ts`, `index.ts`,
  `tests/routes-hr.test.ts`; api `src/app.ts`,
  `src/people/employees.ts` (export `createEmployee`, `setSalary`),
  `tests/helpers/seed.ts`, `tests/leak.test.ts`,
  `tests/conformance.test.ts`
- Test: `packages/api/tests/expand.test.ts`, `tests/terms.test.ts`,
  `tests/hire.test.ts`

**Interfaces:**
- Consumes: Task 1 `calculateProbation`, `validateContractNotice`;
  Task 2 `createTasks`, `cancelTasksWhere`, `NewTaskInput`; Task 4
  `loadOffer`; engine `addDays`; Plan 3 `EmployeeView`,
  `toEmployeeView`, `viewerScope`, and these two, exported from
  `src/people/employees.ts` (the code behind `POST /v1/employees` and
  `PUT /v1/employees/{id}/salary`, each writing its Plan 3 audit
  event): `createEmployee(ctx: ReqCtx, body: EmployeeCreate):
  Promise<EmployeeRow>`, `setSalary(ctx: ReqCtx, employeeId: string,
  body: SalaryUpdate): Promise<EmployeeRow>`.
- Produces (contract):
  - `TemplateKind = z.enum(["onboarding","exit"])`; `TemplateItem {
    title 1..200; category: "documents" | "accounts" | "equipment" |
    "handover" | "payroll" | "other"; assignee: "hr" | "manager" |
    "employee" | "owner"; dueOffsetDays: int -60..365; checklist?:
    string[] max 20 }`; `ChecklistTemplate { kind; version: int;
    items: TemplateItem[] 1..50; isDefault: boolean; label: string |
    null }` (`label` is `"product default, not law"` when
    `isDefault`); `TemplatePut { items }`.
  - `EmploymentTerms { employeeId; probationMonths; probationEndDate:
    IsoDate | null; employerNoticeDeadline: IsoDate | null;
    contractNoticeDays; trace: TraceLine[]; updatedAt }`; `TermsPut {
    probationMonths: int >= 0; contractNoticeDays: int >= 1 }`.
  - `HireRequest { number; nationality; workerClass; fullNameAr?;
    email?; labourPersonId?; emiratesIdNumber? }` (same field schemas
    as `EmployeeCreate`); `HireResult { employee: EmployeeView; terms:
    EmploymentTerms; flowId: Id; tasks: TaskSummary[] }`.
  - Routes (five): `hireFromOffer POST /v1/offers/{id}/hire` (owner,
    hr; 201, `altStatus: 200`, `HireResult`); `listChecklistTemplates
    GET /v1/checklist-templates` (owner, hr; `ChecklistTemplate[]`);
    `putChecklistTemplate PUT /v1/checklist-templates/{kind}` (owner,
    hr); `getEmploymentTerms GET /v1/employees/{id}/terms` (all roles,
    `viewerScope`, else 404); `putEmploymentTerms PUT
    /v1/employees/{id}/terms` (owner, hr).
  - Error codes: `OFFER_NOT_ACCEPTED` 409,
    `EMPLOYMENT_TERMS_REQUIRED` 422 (used by Task 6).
- Produces (api):
  - Migration 804: `checklist_templates(company_id, kind, version,
    items jsonb, updated_by, updated_at, pk(company_id, kind))`,
    `employment_terms(company_id, employee_id pk, probation_months,
    probation_end_date, employer_notice_deadline,
    contract_notice_days, updated_by, updated_at)`,
    `offer_hires(company_id, offer_id, employee_id, flow_id,
    created_at, pk(company_id, offer_id))` with a foreign key to
    `employees` `DEFERRABLE INITIALLY DEFERRED`,
    `onboarding_flows(id, company_id, employee_id, offer_id,
    template_version, started_at)`.
  - `DEFAULT_TEMPLATES: Record<TemplateKind, TemplateItem[]>` (product
    defaults, not law). Onboarding (offset from start date): "Collect
    passport, visa and Emirates ID copies" (documents, hr, -7);
    "Collect the signed offer letter and employment contract"
    (documents, hr, -7); "Collect bank details for salary" (payroll,
    hr, 0); "Create work email and app login" (accounts, hr, -1);
    "Invite the new joiner to this app" (accounts, hr, 0); "Prepare
    laptop and access card" (equipment, manager, -3); "First-week plan
    and introductions" (other, manager, 0); "Set first goals" (other,
    manager, 14). Exit (offset from last working date): "Agree a
    handover plan" (handover, manager, -14); "Exit interview" (other,
    manager, -3); "Return laptop, access card and equipment"
    (equipment, employee, 0); "Revoke system accounts" (accounts, hr,
    0); "Final settlement review" (payroll, hr, 0); "Issue experience
    certificate" (documents, hr, 0); "Cancel labour card and residence
    visa (PRO). No deadline is sourced yet." (documents, hr, 0).
  - `getTemplate(tx, companyId, kind): Promise<ChecklistTemplate>`
    (stored, else the default with version 0 and `isDefault: true`);
    `putTemplate` stores version + 1 (audit `template.updated`, `data:
    { kind, version }`).
  - `expandTemplate(t: ChecklistTemplate, anchorDate: string, people:
    { managerUserId: string | null; employeeUserId: string | null },
    link: { employeeId: string; flow: { type: FlowType; id: string };
    source: TaskSource }): NewTaskInput[]` (pure): due =
    `addDays(anchorDate, dueOffsetDays)`; assignee `hr` and `owner` map
    to `assigneeRole`; `manager` to `managerUserId`, else role `hr`;
    `employee` to `employeeUserId`, else role `hr`.
  - `probationTasks(p: Traced<ProbationResult>, employeeId: string,
    managerUserId: string | null): NewTaskInput[]` (pure): none when
    `probationEndDate` is null; else "Probation decision: last day to
    give written notice" due `employerNoticeDeadline` with `rule` = the
    `employment.probation.notice-deadline` trace line, and "Probation
    ends" due `probationEndDate` with `rule` = the
    `employment.probation.end` line; source `probation-reminder`;
    assignee the manager user, else role `hr`.
  - `putTerms(ctx, employeeId, body: TermsPut): Promise<EmploymentTerms>`:
    runs both engine checks (`onDate` = joining date; `EngineError` to
    422 `ENGINE_REFUSED`); stores the dates; when they change,
    `cancelTasksWhere(..., { employeeId, source: "probation-reminder" },
    "re-dated: employment terms changed")` then creates the new
    `probationTasks`; audit `terms.updated` (`data: { changed }`).
    `loadTerms(tx, companyId, employeeId): Promise<EmploymentTerms |
    null>`.
  - `hireFromOffer(ctx, offerId, body): Promise<{ status: 200 | 201;
    result: HireResult }>`, all in the handler's one transaction:
    1. Offer must be `accepted` (else 409 `OFFER_NOT_ACCEPTED`), unless
       an `offer_hires` row exists: then 200 with that hire.
    2. Claim: `INSERT INTO offer_hires ... ON CONFLICT DO NOTHING
       RETURNING` with a new employee id and flow id; no row: read the
       existing hire and return 200 (a concurrent call waits on the
       unique index, as Plan 3's pay-run create does).
    3. `createEmployee` (full name from the candidate, job title,
       department, manager, `joiningDate = startDate`, plus the
       request fields) with the claimed id; `setSalary` with the
       offer's salary; `putTerms` with the offer's terms.
    4. Onboarding flow row; `createTasks` with `expandTemplate(
       onboarding template, startDate, ...)` plus `probationTasks`.
    5. Offer `hired` with `employeeId`; application stage `hired`
       (with a `StageEvent`); requisition `hiredCount + 1`, status
       `filled` when it reaches `headcount`.
    6. Audit `offer.hired` and `onboarding.started` (`data: {
       employeeId, taskCount }`).
    An error after the claim (for example 409
    `EMPLOYEE_NUMBER_TAKEN`) rolls the whole transaction back.
  - `seedHr` hires the seeded offer; returns `{ hiredEmployeeId,
    onboardingFlowId }`.

- [ ] **Step 1: Write the failing tests**

`expand.test.ts` (pure):
- `expand_negative_offset_before_start`: offset -7 from `2026-03-01`
  is `2026-02-22`.
- `expand_manager_falls_back_to_hr`: `managerUserId` null gives
  `assigneeRole "hr"`, `assigneeUserId` null.
- `expand_employee_without_login_goes_to_hr`.
- `probation_tasks_dates_from_engine`: due dates equal
  `calculateProbation(...)` values and each `rule.id` is the matching
  trace id.
- `probation_tasks_none_for_zero_months`: `[]`.

`terms.test.ts`:
- `terms_put_returns_engine_dates`: equals `calculateProbation`
  output; `trace` non-empty.
- `terms_over_max_refused`: 422 `ENGINE_REFUSED`.
- `terms_change_cancels_and_recreates_reminders`: months 6 then 3:
  the two old reminder tasks are `cancelled` with a comment containing
  `"terms changed"`; two new ones carry the new dates.
- `terms_out_of_scope_404`: a manager reading a non-report's terms.
- `default_template_labelled`: `GET /v1/checklist-templates` returns
  both kinds with `isDefault: true`, `version 0`, `label "product
  default, not law"`.
- `template_put_versions`: two PUTs give version 1 then 2,
  `isDefault: false`, `label: null`.

`hire.test.ts`:
- `hire_creates_employee_salary_terms_tasks`: 201; employee
  `joiningDate` equals the offer `startDate`; hr view salary equals
  the offer salary (`"8888.01"` basic); terms equal the offer terms;
  task count = onboarding template items + 2 probation tasks, each
  with `flow.type "onboarding"` and the new `employeeId`; offer
  `hired`; application `hired`.
- `hire_twice_concurrently_one_employee` (Review Focus 2): two
  `Promise.all` calls give statuses `{201, 200}` and the same
  `employee.id`; `employees` rows with that number: 1;
  `onboarding_flows` rows for the offer: 1.
- `hire_requires_accepted_offer`: approved, not accepted: 409
  `OFFER_NOT_ACCEPTED`.
- `hire_duplicate_number_rolls_back`: number taken gives 409
  `EMPLOYEE_NUMBER_TAKEN`; no `offer_hires` row; offer still
  `accepted`; no new tasks.
- `hire_fills_requisition_at_headcount`: headcount 1: status `filled`,
  `hiredCount` 1.
- `hire_audit_no_amounts`: no audit `data` text contains `"8888.01"`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test expand terms
  hire`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): offer to hire and onboarding`.

### Task 6: Exit request, notice, clearance tasks, final settlement

Law and money: fresh per-task review.

**Files:**
- Create: `packages/contract/src/exits.ts`,
  `packages/api/migrations/805_exits.sql`,
  `packages/api/src/exits/notice.ts`, `src/exits/settlement.ts`
  (pure), `src/exits/exits.ts`, `src/routes/exits.ts`
- Modify: contract `routes-hr.ts`, `errors.ts`, `examples.ts`,
  `index.ts`, `tests/schemas.test.ts`, `tests/routes-hr.test.ts`; api
  `src/app.ts`, `src/people/employees.ts` (export `updateEmployee`),
  `tests/helpers/seed.ts`, `tests/leak.test.ts`,
  `tests/conformance.test.ts`
- Test: `packages/api/tests/exit-settlement.test.ts`,
  `tests/exits.test.ts`

**Interfaces:**
- Consumes: Task 1 `calculateNotice`, `ExitKind`, `NoticeFlag`;
  Task 2 `createTasks`, `cancelFlowTasks`; Task 3 `assertDecidable`,
  `Decision`; Task 5 `loadTerms`, `getTemplate`, `expandTemplate`;
  engine `calculateSettlement`, `GRATUITY_PACKS`, `explainTrace`,
  `EngineError`, `Fils`; Plan 3 `Settlement` (contract), `toMoney`,
  `loadEmployee`, `viewerScope`, `computePayRun` (cross-check test
  only), and `updateEmployee(ctx: ReqCtx, id: string, patch:
  EmployeeUpdate): Promise<EmployeeRow>` (the code behind `PATCH
  /v1/employees/{id}`, exported from `src/people/employees.ts`).
- Produces (contract):
  - `ExitKind` (literal copy of the engine's seven strings; the
    schema test compares with a literal list, as Plan 3 does for
    `WorkerClass`); `ExitStatus = z.enum(["requested","in-notice",
    "rejected","withdrawn","closed"])`.
  - `NOTICE_FLAG_TEXT: Record<NoticeFlag, string>`, exactly:
    `reduced-by-agreement`: "Notice reduced by agreement (Decree-Law
    33 of 2021, Article 43(2)). The worker's rights must be kept.";
    `counsel-review`: "Exit without notice: the grounds and procedure
    in Articles 44 and 45 are not modelled. Check with counsel.";
    `job-search-day`: "After notice from the employer, the worker may
    take one unpaid working day a week to look for work, with notice
    (Article 43(5))."
  - `EXIT_FLAG_ONLY` (exact strings, in order): "loan balances", "air
    ticket entitlement", "training-bond balance", "open expense
    claims", "company card balance", "deductions from final pay";
    `EXIT_FLAG_ONLY_NOTE = "Not computed and never deducted
    automatically. Check and settle these by hand."`
  - `ExitCreate { employeeId?: Id; kind: ExitKind; noticeGivenDate:
    IsoDate; agreedNoticeDays?: int >= 0; reason?: max 2000 }`;
    `SettlementInputs { unusedLeaveDays: int >= 0;
    serviceUnpaidLeaveDays: int >= 0 }`.
  - `ExitSettlement { settlement: Settlement; flagOnly: string[];
    flagOnlyNote: string; inputs: SettlementInputs & { salaryVersion:
    int }; dueDate: IsoDate; dueTrace: TraceLine; version: int;
    computedAt: Timestamp }`.
  - `Exit { id; employeeId; employeeName; kind; status;
    noticeGivenDate; noticeDays; lastWorkingDate; settlementDueDate;
    inProbation; flags: { code: NoticeFlag; text: string }[];
    noticeTrace: TraceLine[]; reason: string | null; requestedBy;
    decidedBy: Id | null; decidedAt: Timestamp | null; settlement:
    ExitSettlement | null; access: { status: "not-revoked" | "revoked"
    | "no-login"; at: Timestamp | null }; documents: { kind; status;
    documentRef: string | null; at }[]; closedAt: Timestamp | null;
    createdAt }`.
  - Routes (six): `createExit POST /v1/exits` (all roles; 201),
    `listExits GET /v1/exits` (query `employeeId?, status?`),
    `getExit GET /v1/exits/{id}` (all roles), `decideExit POST
    /v1/exits/{id}/decision` (owner, hr), `computeExitSettlement POST
    /v1/exits/{id}/settlement` (owner, hr; body `SettlementInputs`),
    `withdrawExit POST /v1/exits/{id}/withdraw` (all roles); all
    respond `Exit`.
  - Error codes: `EXIT_EXISTS` 409, `EXIT_NOT_APPROVED` 409,
    `EXIT_NOT_OPEN` 409, `SALARY_REQUIRED` 422,
    `EXIT_ACCESS_REVOKED` 409. `EXAMPLES.Exit` with a computed
    settlement of fake amounts.
- Produces (api):
  - Migration 805: `exits(id, company_id, employee_id, kind, status,
    notice_given_date, notice_days, last_working_date,
    settlement_due_date, in_probation, flags text[], notice_trace
    jsonb, reason_enc, requested_by, decided_by, decided_at,
    decision_note, prior_last_working_date, settlement_enc,
    settlement_version, closed_at, created_at)`; partial unique
    `(company_id, employee_id) WHERE status IN ('requested',
    'in-notice')`. `reason_enc` and `settlement_enc` use the company
    DEK, AAD `"<companyId>:exits:<column>:<exitId>"`.
  - `noticeFor(employee, terms: EmploymentTerms, body: ExitCreate):
    Traced<NoticeResult>` in `notice.ts`: maps to `calculateNotice`
    (`probationEndDate` and `contractNoticeDays` from the terms,
    `agreedNoticeDays ?? null`).
  - `computeExitSettlement(i: { joiningDate: string; lastWorkingDate:
    string; workerClass: WorkerClass; lastBasicMonthly: Fils;
    unusedLeaveDays: number; serviceUnpaidLeaveDays: number }):
    Settlement` (pure, wire amounts via `toMoney`): calls
    `calculateSettlement({ gratuity: { joiningDate, lastWorkingDate,
    unpaidLeaveDays: serviceUnpaidLeaveDays, lastBasicMonthly,
    workerClass }, unusedLeaveDays }, GRATUITY_PACKS)`; success gives
    `computed` with the engine's `notComputed` unchanged,
    `explanation` from `explainTrace` (`arReviewed: false`) and
    `includedInSif: false`; an `EngineError` gives `refused` with its
    code and message. It takes no exit kind (Ruling 10).
  - Rules:
    1. Create: owner and hr any kind for any employee in the company;
       other roles only for self (`employeeId` omitted or own) and a
       kind in the engine's `WORKER_KINDS`, else 403 `FORBIDDEN`. No
       terms row: 422 `EMPLOYMENT_TERMS_REQUIRED`. An `EngineError`
       from `noticeFor`: 422 `ENGINE_REFUSED`. A second open exit: 409
       `EXIT_EXISTS` (`ON CONFLICT DO NOTHING`, no row returned).
    2. Decision: `assertDecidable(ctx, { status, requestedBy }, {
       pending: "requested", roles: ["owner","hr"] })`. Approve: status
       `in-notice`; store the employee's current `lastWorkingDate` in
       `prior_last_working_date`; `updateEmployee(ctx, employeeId, {
       lastWorkingDate })`; `createTasks` with `expandTemplate(exit
       template, lastWorkingDate, ..., { flow: { type: "exit", id },
       source: "exit-template" })` plus one task "Pay the final
       settlement by this date" due `settlementDueDate`, source
       `exit-deadline`, `rule` = the `employment.settlement.due` trace
       line, assignee role `hr`. Reject: `rejected`.
    3. Settlement: status `in-notice` (else 409 `EXIT_NOT_APPROVED`);
       the recurring monthly `basic` component of the salary record,
       never a one-off or override (none: 422 `SALARY_REQUIRED`);
       stored encrypted, `settlement_version + 1`; recomputing replaces
       it until close.
    4. Withdraw: the requester, owner or hr; status `requested` or
       `in-notice` (else 409 `EXIT_NOT_OPEN`); access revoked: 409
       `EXIT_ACCESS_REVOKED`. From `in-notice`: if the employee's
       `lastWorkingDate` still equals the exit's, restore
       `prior_last_working_date` via `updateEmployee`;
       `cancelFlowTasks(..., "exit withdrawn")`.
    5. Visibility: owner and hr all; others self plus `viewerScope`;
       `settlement` and `reason` only for owner, hr and the leaver;
       out of scope: 404.
  - Audit: `exit.requested` (`data: { kind }`), `exit.approved`
    (`data: { lastWorkingDate }`), `exit.rejected`, `exit.withdrawn`,
    `exit.settlement-computed` (`data: { version, status }`).
  - `seedHr` adds an approved exit for the manager's direct report with
    a computed settlement and returns `SETTLEMENT_SENTINELS: Record<
    employeeId, string>` (the settlement `total` string); the leak
    test checks those strings with `mayView` = owner, hr and self on
    exit routes.

- [ ] **Step 1: Write the failing tests**

`exit-settlement.test.ts` (pure):
- `exit_settlement_equals_engine`: expat, joined `2019-01-01`, left
  `2026-03-31`, basic `400000n`, unused leave 10, service unpaid 0:
  `total` equals `toMoney(calculateSettlement(...).value.total)`.
- `exit_settlement_shows_engine_not_computed_verbatim`:
  `settlement.notComputed` deep-equals the engine's `notComputed`.
- `exit_settlement_gcc_refused`: `refused`, code equals the code the
  engine throws for the same input (called in the test).
- `exit_settlement_uae_not_applicable`: outcome `not-applicable`,
  reason equals `UAE_NATIONAL_REASON`.
- `exit_settlement_matches_payslip_settlement`: for the same inputs,
  equals the `settlement` on Plan 3's `computePayRun` leaver payslip.

`exits.test.ts`:
- `exit_employee_resigns_self`: 201; `lastWorkingDate` and
  `noticeDays` equal `calculateNotice(...)` for the stored terms;
  `flags` texts equal `NOTICE_FLAG_TEXT`.
- `exit_employee_cannot_terminate`: 403 `FORBIDDEN`.
- `exit_manager_cannot_create_for_report`: 403 `FORBIDDEN`.
- `exit_needs_terms`: 422 `EMPLOYMENT_TERMS_REQUIRED`.
- `exit_in_probation_kind_refused`: 422 `ENGINE_REFUSED`, `engineCode
  "EXIT_KIND_IN_PROBATION"`.
- `exit_one_open_per_employee`: 409 `EXIT_EXISTS`.
- `exit_requester_cannot_approve`: hr-created termination approved by
  the same hr: 403 `SOD_VIOLATION`.
- `exit_approve_sets_last_day_and_tasks`: employee `lastWorkingDate`
  set; exit tasks = exit template items + 1; the deadline task's
  `dueDate` equals `settlementDueDate` and its `rule.rules` contain
  `empSettlementDueDays` (`official`) and `empSettlementTrigger`
  (`convention`).
- `exit_settlement_before_approval_409`: `EXIT_NOT_APPROVED`.
- `exit_settlement_refused_not_500` (Review Focus 4): GCC national:
  200, `settlement.settlement.status "refused"`.
- `exit_settlement_same_for_resignation_and_termination`: two
  employees with equal data, one resigns, one is terminated: equal
  `total`.
- `exit_settlement_flag_only_listed`: `flagOnly` deep-equals
  `EXIT_FLAG_ONLY`; `total` equals gratuity plus leave pay (nothing
  deducted).
- `exit_settlement_hidden_from_manager` (Review Focus 1): manager GET
  gives `settlement: null`, `reason: null`; the body lacks the total.
- `exit_withdraw_after_approval_restores`: employee `lastWorkingDate`
  back to null; open exit tasks `cancelled` with comment "exit
  withdrawn".
- `exit_audit_no_amounts`: no audit `data` text contains the total or
  the reason.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test exit`.
  Expected: FAIL.
- [ ] **Step 3: Implement** `settlement.ts` first (pure), then the rest.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): exit flow and final settlement`.
