# Plan 10: Performance, KPIs, Learning, Policies and Engagement
# Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Plan 3 backend with KPI and OKR tracking linked to
Plan 8 goals, appraisal cycles (self, manager, optional 360) with a
calibration view and company rating scales, bonus proposals that HR may
copy into a pay run, training with certifications and mandatory-training
compliance, policy acknowledgement tracking on top of the Plan 7
library, pulse surveys and eNPS with anonymity thresholds, a kudos feed,
a skills matrix with succession readiness, and an org chart.

**Features delivered (14, counted for progress):**

1. KPI and OKR tracking (objectives, key results, readings, owners,
   linked to Plan 8 goals)
2. Appraisal cycles with self, manager and optional 360 peer reviews
3. Rating scales as company parameters
4. Calibration view
5. Appraisal-to-bonus proposals into pay inputs (proposal only)
6. Training catalogue and assignments with completion tracking
7. Certifications with expiry alerts
8. Mandatory-training compliance by job title, department or person
9. Policy version history and acknowledgement tracking (extends the
   Plan 7 library; counted once, as the tracking layer only)
10. Pulse surveys and eNPS with anonymity thresholds, results by team
11. Recognition and kudos feed
12. Skills matrix
13. Succession-readiness view
14. Org chart with reporting lines

**Architecture:** API and contract only, as Plan 8 (no web screens).
Each task adds zod schemas to `packages/contract` (a new
`TALENT_ROUTES` list in `routes-talent.ts`, joined to `ROUTES` through a
new `ROUTE_GROUPS` list), one migration in the `1001_` to `1009_` range,
and service and route files under `packages/api/src/talent/` and
`src/routes/`. Every computation that decides a number (KPI progress,
eNPS, survey suppression, compliance status, bonus proposal, org chart
cycle breaking, skill gaps) is a pure function tested on its own. No
computation rates a person: ratings are typed by people; the product
only counts, compares recorded values and proposes from the company's
own bonus plan.

**Tech Stack:** As Plan 3: Node 22, TypeScript 7.0.2, zod 4.6.7, Hono
4.13.17, @electric-sql/pglite 0.5.16 (tests), pg 8.23.1, Vitest 5.1.2,
fast-check 4.11.0, tsx 4.23.15. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-25-master-feature-list.md`
(UQ28 policy versions and acknowledgements; appraisal-to-bonus as a
parity base; UQ10 is NOT claimed: this plan proposes from a company
plan, it does not pay from evidence),
`docs/superpowers/specs/2026-11-25-combined-feature-list.md` (A: org
chart and hierarchy, engagement and pulse surveys; F: performance,
goals, OKRs, 360, appraisals, learning management), `LEDGER.md`
sections 1 to 3 (speed ruling, autonomous mode),
`docs/engineering-standards.md`. Extends
`docs/superpowers/plans/2026-11-26-plan-3-backend.md` (contract, API,
tenancy, audit, roles), reuses Plan 8 goals and audit
(`docs/superpowers/plans/2026-11-26-plan-8-hiring-exit.md` Tasks 1, 2
and 8) and the Plan 7 library
(`docs/superpowers/plans/2026-11-26-plan-7-documents.md` Tasks 1 and 5).

**Prerequisite:** Plan 3 Tasks 1 to 8, Plan 7 Tasks 1, 3 and 5 and
Plan 8 Tasks 1, 2 and 8 are built. Plans 4, 5 and 6 are not needed.
Where this plan consumes a function the earlier plans do not name, the
signature below is exact and the executor exports it from the named
file (renaming only at the export if that plan used another name):

- Plan 3 `src/people/employees.ts`: `updateEmployee` (named by Plan 8
  Ruling 29) gains the manager-cycle check of Task 2.
- Plan 3 `src/payroll/pay-runs.ts`: `loadPayRun(tx: Db, companyId:
  string, id: string): Promise<PayRun | null>`.
- Plan 3 `src/payroll/payslips.ts`: `loadRunPayslip(tx: Db, deps:
  AppDeps, companyId: string, payRunId: string, employeeId: string):
  Promise<Payslip | null>` (decrypted, contract `Payslip` shape).
- Plan 7 `src/library/library.ts`: `listLibraryDocuments(ctx: ReqCtx):
  Promise<LibraryDocument[]>` (the `libraryList` logic, audience
  applied) and `visibleLibraryDocument(ctx: ReqCtx, id: string):
  Promise<{ id: string; title: string; category: LibraryCategory;
  audience: Audience; currentVersionId: string } | null>`.
- Plan 8 `src/goals/goals.ts`: `loadGoal(ctx: ReqCtx, goalId: string):
  Promise<Goal>` (404 out of scope) and `addCheckIn(ctx: ReqCtx,
  goalId: string, body: CheckInCreate): Promise<Goal>` (the
  `addGoalCheckIn` handler logic: permissions, 409 `GOAL_CLOSED`,
  audit).

## Global Constraints

- All of Plan 3's Global Constraints apply unchanged (80-character
  lines, files under about 300 lines, functions under 30, integer fils,
  money on the wire as `^\d{1,9}\.\d{2}$`, RLS on every tenant table,
  injected time and ids, `/v1`, `X-Company-Id`, tests offline).
- No statutory number in `packages/api` or `packages/contract`. This
  plan uses no legal rule at all: thresholds, validity periods, due
  windows, rating scales and bonus percentages are company parameters
  or product defaults, each labelled "product default, not law" or
  "company rule, not law" wherever shown.
- No AI and no automatic rating of people anywhere in this plan. No
  field named or computed as a "score" of a person; the eNPS score is a
  company-level count summary. No forced distribution.
- Bonus: proposals only. Nothing under `packages/api/src/payroll/`
  imports `src/talent/`; no pay run reads `bonus_proposals`. Proposal
  amounts are encrypted at rest and visible to owner and hr only.
- Survey anonymity: responses carry no employee id, user id or
  timestamp; no audit event per response; results only after close;
  small groups suppressed with a complementary rule; the minimum group
  size is snapshotted at open. Labelled with `ANONYMITY_NOTE` (Task 9).
- No "compliant" claim in any text: training "compliance" is shown only
  as status words `compliant`, `due-soon`, `expired`, `pending`,
  `overdue`, `waived` next to `TRAINING_NOTE` (Task 7).
- Audit actions match `^[a-z]+(\.[a-z-]+)+$` (first segment without a
  hyphen). Audit data never holds ratings, review answers, comments,
  reasons, kudos messages, survey answers, KPI values, skill levels,
  readiness or amounts (`talentAudit`, Task 1, on top of Plan 8
  `hrAudit`).
- No DELETE routes or grants; removal is a status (`retired`,
  `archived`, `cancelled`, `hidden`, `superseded`).
- Migrations are numbered `1001_` to `1009_` (Plan 10's range).
- Colleague visibility: every member may see `PersonRef { employeeId;
  name }` and the org chart projection (name, Arabic name, job title,
  department, manager) of active employees; never `EmployeeView`.
- "Today" is `dubaiDate(deps.now())` (Plan 3 Task 6).
- Each task ends with `pnpm check` green and one commit, and adds one
  happy-path row per new route to `tests/conformance.test.ts` and its
  ids to the `tests/leak.test.ts` id map. Review: a fresh per-task
  review after Task 6 (money) and Task 9 (privacy), and one
  whole-branch review at the end (speed ruling, 2026-11-26).

## Review Focus

1. Survey de-anonymisation: hr reads results before and after one
   person responds, or one team is hidden while the company total and
   the other teams are shown. Expected: results exist only after close,
   and no hidden group can be rebuilt by subtraction (Task 9
   `survey_results_closed_only`, `suppression_blocks_subtraction`).
2. A manager or employee reading bonus proposals, calibration rows or
   360 peer reviews: no bonus amount, calibration reason or peer author
   id reaches a role not allowed (Task 4 `appraisal_peer_authors_hidden`,
   Task 6 `bonus_hidden_from_manager_and_employee` and the leak test
   sentinels).
3. A bonus proposal approved but never typed into a pay run: no pay
   run changes, and marking it included without the line fails (Task 6
   `bonus_never_auto_pays`).
4. A reporting-line cycle in old data or a manager who has left: the
   org chart still renders with everyone exactly once, and a PATCH that
   would create a cycle is refused (Task 2 `org_chart_cycle_breaks_once`,
   `org_chart_manager_left_is_root`, `manager_cycle_refused`).
5. A certificate issued on 31 January with a one-month validity, a
   leaver with an expired certificate, and an expiry boundary near
   Dubai midnight: expiry is 28 or 29 February, leavers raise no alert
   and count in no compliance row, and "today" is the Dubai date (Task
   7 `cert_expiry_clamps_month_end`, `compliance_excludes_leavers`,
   `cert_alert_uses_dubai_date`).

## File Structure

```
packages/contract/src/routes-talent.ts       TALENT_ROUTES (Tasks 1-9)
packages/contract/src/routes.ts              + ROUTE_GROUPS (Task 1)
packages/contract/src/talent-settings.ts     settings, rating scales
packages/contract/src/org.ts                 PersonRef, org chart
packages/contract/src/skills.ts              skills, matrix, succession
packages/contract/src/okr.ts                 objectives, KPIs
packages/contract/src/appraisals.ts          cycles, reviews
packages/contract/src/calibration.ts         calibration view
packages/contract/src/bonus.ts               bonus plan, proposals
packages/contract/src/training.ts            courses, assignments, certs
packages/contract/src/policy-ack.ts          history, overview, due
packages/contract/src/kudos.ts               kudos feed
packages/contract/src/surveys.ts             surveys, results
packages/api/src/db/migrate.ts               3 or 4 digit names (Task 1)
packages/api/migrations/1001_talent_settings.sql ... 1009_surveys.sql
packages/api/src/talent/                     services and pure modules
packages/api/src/routes/talent-*.ts          route files per task
HANDOVER.md, LEDGER.md                       updated in Task 9
```

---

### Task 1: Talent route registry, migration order, settings, scales

**Files:**
- Create: `packages/contract/src/routes-talent.ts`,
  `src/talent-settings.ts`
- Modify: `packages/contract/src/routes.ts` (add `ROUTE_GROUPS`),
  `src/errors.ts`, `src/examples.ts`, `src/index.ts`,
  `tests/routes.test.ts` (Plan 7's line "`ROUTES` deep-equals
  `[...CORE_ROUTES, ...DOCUMENT_ROUTES]`" becomes "`ROUTES` deep-equals
  `ROUTE_GROUPS.flat()`"), `tests/routes-hr.test.ts` (Plan 8's
  "`ROUTES.length === CORE_ROUTES.length + HR_ROUTES.length`" and
  "`ROUTES.length` is 94" become "`ROUTES.length ===
  ROUTE_GROUPS.flat().length`"; `HR_ROUTES.length === 45` stays)
- Modify: `packages/api/src/db/migrate.ts`, `tests/migrate.test.ts`
- Create: `packages/api/migrations/1001_talent_settings.sql`,
  `packages/api/src/talent/audit.ts`, `src/talent/seal.ts`,
  `src/talent/settings.ts`, `src/talent/scales.ts`,
  `src/routes/talent-settings.ts`
- Modify: `packages/api/src/app.ts` (register),
  `tests/helpers/seed.ts` (`seedTalent`), `tests/leak.test.ts`,
  `tests/conformance.test.ts`
- Test: `packages/contract/tests/routes-talent.test.ts`,
  `packages/api/tests/talent-settings.test.ts`

**Interfaces:**
- Consumes: Plan 3 `RouteDef`, `Role`, `Id`, `IsoDate`, `Timestamp`,
  `register`, `ReqCtx`, `ApiError`, `appendAudit`, `AuditInput`,
  `Keyring`, `makeApp`, `seedCompany`, `call`; Plan 8 `hrAudit`.
- Produces (contract):
  - `routes.ts`: `ROUTE_GROUPS: readonly (readonly RouteDef[])[]` =
    `[CORE_ROUTES, DOCUMENT_ROUTES, HR_ROUTES, TIME_ROUTES,
    TALENT_ROUTES]` (only the lists that exist on the branch, in that
    order; `TIME_ROUTES` is Plan 9's); `ROUTES = ROUTE_GROUPS.flat()`.
  - `ScaleLevel { value: int 1..10; label: 1..40; labelAr?: 1..40 }`;
    `RatingScaleCreate { name: 1..80; levels: ScaleLevel[] 2..10 }`
    refined so values are strictly ascending (path `["levels"]`);
    `RatingScaleUpdate { name?; levels?; status?: "active" |
    "retired" }`; `RatingScale { id; name; levels; status; inUse:
    boolean; createdAt }`.
  - `TALENT_DEFAULTS = { surveyMinGroupSize: 5, peerReviewMinCount: 3,
    certAlertDays: 30, trainingDueSoonDays: 14, policyAckDueDays: 14,
    skillScaleId: null, companyValues: [] }`;
    `TALENT_DEFAULTS_NOTE = "Product defaults, not law. Change them to
    match your company's rules."`
  - `TalentSettingsBody { surveyMinGroupSize: int 3..50;
    peerReviewMinCount: int 2..10; certAlertDays: int 1..365;
    trainingDueSoonDays: int 1..365; policyAckDueDays: int 1..365;
    skillScaleId: Id | null; companyValues: string (1..40)[] max 20,
    unique }`; `TalentSettings = TalentSettingsBody & { version: int
    >= 0; note: typeof TALENT_DEFAULTS_NOTE }`;
    `TalentSettingsUpdate = TalentSettingsBody & { version }`.
  - `TALENT_ROUTES` (this task's five, all `auth: "tenant"`):
    `getTalentSettings GET /v1/talent-settings` (owner, hr),
    `putTalentSettings PUT /v1/talent-settings` (owner),
    `listRatingScales GET /v1/rating-scales` (all roles,
    `RatingScale[]`), `createRatingScale POST /v1/rating-scales`
    (owner, hr; 201), `updateRatingScale PATCH /v1/rating-scales/{id}`
    (owner, hr).
  - Error code: `SETTINGS_VERSION_CONFLICT` 409. `EXAMPLES` for
    `TalentSettings` and `RatingScale`.
- Produces (api):
  - `migrate.ts`: names match `^(\d{3,4})_[a-z0-9_]+\.sql$` (else
    `MIGRATION_NAME`); files apply in ascending numeric order of the
    prefix; two files with the same number throw `MIGRATION_NAME`. (If
    the branch already does this, only add the test.)
  - Migration 1001: `talent_settings(company_id pk, version int, body
    jsonb, updated_by, updated_at)`, `rating_scales(id, company_id,
    name, levels jsonb, status, created_by, created_at)`; RLS as Plan
    3; grants select, insert, update.
  - `audit.ts`: `TALENT_SENSITIVE_KEYS = ["rating","overallRating",
    "finalRating","answers","comment","reason","message","value",
    "level","selfLevel","confirmedLevel","readiness","amount","bps"]`;
    `talentAudit(tx: Db, e: AuditInput): Promise<AuditEvent>` throws
    `AUDIT_SENSITIVE_DATA` on any of these keys, then calls `hrAudit`.
    Every Plan 10 service audits through `talentAudit`.
  - `seal.ts`: `sealJson(ctx: ReqCtx, table: string, column: string,
    rowId: string, value: unknown): Promise<string>` and
    `openJson<T>(ctx, table, column, rowId, cipher: string):
    Promise<T>` using the company's `dek_wrapped` and AAD
    `"<companyId>:<table>:<column>:<rowId>"` (Plan 3 `Keyring`).
  - `settings.ts`: `getTalentSettings(tx: Db, companyId: string):
    Promise<TalentSettings>` (no row: version 0 and `TALENT_DEFAULTS`);
    `putTalentSettings(ctx, body)`: version mismatch 409
    `SETTINGS_VERSION_CONFLICT`; `skillScaleId` must name an active
    scale (else 404 `NOT_FOUND`); version + 1; audit
    `talent.settings.updated` (`data: { changed: string[] }`).
  - `scales.ts`: `loadScale(tx, companyId, id): Promise<RatingScale>`
    (404), list, create, update; `inUse` is true when
    `talent_settings` names it (Task 4 adds appraisal cycles). Audit
    `rating.scale.created`, `rating.scale.updated` (`changed`).
  - `seed.ts`: `seedTalent(app, seeded)` creates a five-level scale
    (values 1 to 5, labels "Needs improvement" to "Outstanding") and
    returns `{ scaleId }`; later tasks add fields.

- [ ] **Step 1: Write the failing tests**

`routes-talent.test.ts`: `TALENT_ROUTES.map((r) => r.id)` deep-equals
the literal `TALENT_ROUTE_IDS` in the test (this task: the five ids
above; each later task appends its ids in the order listed there);
every talent route has `auth: "tenant"`; none has method `DELETE`;
every `TALENT_ROUTES` entry is in `ROUTES`; no `(method, path)` pair
repeats in `ROUTES`; `ROUTES` deep-equals `ROUTE_GROUPS.flat()`;
`TALENT_DEFAULTS` parses with `TalentSettingsBody`;
`RatingScaleCreate` with values `[1, 3, 2]` fails with path
`["levels"]`; `surveyMinGroupSize: 2` fails.

`migrate.test.ts` (add): `migrate_numeric_order`: a temp dir with
`006_a.sql`, `072_b.sql`, `908_c.sql`, `1001_d.sql` (each inserting
its name into a log table) applies in that order; `1001-x.sql` throws
`MIGRATION_NAME`; `0072_e.sql` beside `072_b.sql` throws
`MIGRATION_NAME`.

`talent-settings.test.ts`:
- `settings_defaults_version_0`: hr GET gives version 0, the defaults
  and the note text.
- `settings_put_owner_only`: hr PUT gives 403 `FORBIDDEN`; owner PUT
  with version 0 gives version 1; again with version 0 gives 409
  `SETTINGS_VERSION_CONFLICT`.
- `settings_audit_names_fields_only`: after changing only
  `surveyMinGroupSize`, the audit `data` deep-equals `{ changed:
  ["surveyMinGroupSize"] }`; `talentAudit` with `data: { rating: 3 }`
  throws `AUDIT_SENSITIVE_DATA`.
- `scale_create_and_in_use`: hr creates a scale; employee lists it;
  owner sets `skillScaleId`; the scale shows `inUse: true`.
- `scale_retired_cannot_be_skill_scale`: retiring it and naming it in
  settings gives 404 `NOT_FOUND`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/contract test` and
  `pnpm --filter @payroll/api test talent-settings migrate`. Expected:
  FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS, including the
  conformance, leak and RLS catalog tests over the new routes and
  tables.
- [ ] **Step 5: Commit** `feat(api): talent registry, settings, scales`.

### Task 2: Org chart, skills matrix and succession readiness

**Files:**
- Create: `packages/contract/src/org.ts`, `src/skills.ts`,
  `packages/api/migrations/1002_skills_succession.sql`,
  `packages/api/src/talent/org-chart.ts` (pure),
  `src/talent/manager-cycle.ts`, `src/talent/skills.ts`,
  `src/talent/skill-gaps.ts` (pure), `src/talent/succession.ts`,
  `src/routes/talent-org.ts`
- Modify: contract `routes-talent.ts`, `errors.ts`, `examples.ts`,
  `index.ts`, `tests/routes-talent.test.ts`; api
  `src/people/employees.ts` (`updateEmployee` calls
  `assertNoManagerCycle`), `src/app.ts`, `tests/helpers/seed.ts`,
  `tests/leak.test.ts`, `tests/conformance.test.ts`
- Test: `packages/api/tests/org-chart.test.ts`,
  `tests/skills.test.ts`, `tests/succession.test.ts`

**Interfaces:**
- Consumes: Task 1 `talentAudit`, `getTalentSettings`, `loadScale`;
  Plan 3 `viewerScope`, `loadEmployee`, employees and departments
  tables.
- Produces (contract):
  - `PersonRef { employeeId: Id; name: string }`.
  - `OrgNode { employeeId; fullName; fullNameAr: string | null;
    jobTitle; departmentId: Id | null; departmentName: string | null;
    managerId: Id | null; directReportCount: int; depth: int }`;
    `BrokenLink { employeeId; managerId: Id; reason: "manager-left" |
    "manager-missing" | "cycle" }`; `OrgChart { asOf: IsoDate; roots:
    Id[]; nodes: OrgNode[]; brokenLinks: BrokenLink[] }`;
    `OrgChartQuery { rootId?: Id }`.
  - `Skill { id; name: 1..80; nameAr: string | null; category: string
    (1..60) | null; status: "active" | "retired" }`; `SkillCreate`,
    `SkillUpdate` (partial plus `status`).
  - `EmployeeSkillPut { selfLevel?: int | null; confirmedLevel?: int |
    null; note?: max 500 }` refined to at least one level key;
    `EmployeeSkill { employeeId; skillId; selfLevel: int | null;
    confirmedLevel: int | null; confirmedBy: Id | null; updatedAt }`.
  - `SkillsMatrixQuery { departmentId?: Id; skillId?: Id }`;
    `SkillsMatrix { scale: ScaleLevel[]; skills: Skill[]; rows: {
    employeeId; name; departmentId: Id | null; jobTitle; levels: {
    skillId; selfLevel: int | null; confirmedLevel: int | null }[]
    }[] }`.
  - `Readiness = z.enum(["ready-now","ready-1-2-years",
    "ready-later"])`; `SuccessionCandidateInput { employeeId;
    readiness; note?: max 500 }`; `SuccessionPlanCreate { title:
    1..120; incumbentEmployeeId?: Id; departmentId?: Id;
    requiredSkills: { skillId; level: int }[] max 20; candidates:
    SuccessionCandidateInput[] max 10 }`; `SuccessionPlanUpdate`
    (partial of create plus `status: "active" | "archived"`);
    `SkillGap { skillId; required: int; confirmed: int | null }`;
    `SuccessionPlan { id; title; incumbent: PersonRef | null;
    departmentId: Id | null; requiredSkills; candidates: (PersonRef &
    { readiness; note: string | null; gaps: SkillGap[] })[]; coverage:
    "covered" | "at-risk"; status; updatedAt; note: typeof
    SUCCESSION_NOTE }`.
  - `SUCCESSION_NOTE = "Readiness is a judgement recorded by HR. Gaps
    compare recorded skill levels only. The product does not score
    people."`
  - Routes (ten): `getOrgChart GET /v1/org-chart` (all roles, query
    `OrgChartQuery`); `listSkills GET /v1/skills` (all);
    `createSkill POST /v1/skills` (owner, hr; 201); `updateSkill PATCH
    /v1/skills/{id}` (owner, hr); `putEmployeeSkill PUT
    /v1/employees/{id}/skills/{skillId}` (all; `EmployeeSkill`);
    `getSkillsMatrix GET /v1/skills-matrix` (all); `listSuccessionPlans
    GET /v1/succession-plans`, `createSuccessionPlan POST
    /v1/succession-plans` (201), `getSuccessionPlan GET
    /v1/succession-plans/{id}`, `updateSuccessionPlan PATCH
    /v1/succession-plans/{id}` (all four owner, hr).
  - Error codes: `MANAGER_CYCLE` 422, `SKILL_NAME_TAKEN` 409,
    `SKILL_RETIRED` 409, `SKILL_SCALE_NOT_SET` 422,
    `RATING_NOT_IN_SCALE` 422, `CANDIDATE_INVALID` 422.
- Produces (api):
  - `org-chart.ts`: `OrgRow { employeeId; fullName; fullNameAr;
    jobTitle; departmentId; departmentName; managerId: string | null;
    active: boolean }`; `buildOrgChart(rows: OrgRow[], rootId?:
    string): Omit<OrgChart, "asOf">`. Only active rows become nodes.
    Algorithm (not determined by the signature):

    ```
    1. A node whose managerId is null is a root.
    2. managerId names an inactive row: root, brokenLink manager-left.
       managerId names no row: root, brokenLink manager-missing.
    3. Walk up from every remaining node; a walk that revisits a node
       has found a cycle. In each cycle the member with the smallest
       employeeId becomes a root with brokenLink reason "cycle" (its
       managerId is kept in the link, set to null on the node).
    4. depth = steps from the node's root; siblings and roots sorted
       by fullName then employeeId; nodes listed depth-first.
    5. rootId given: only that node's subtree, its depth starting at 0.
    ```
    The route gives 404 `NOT_FOUND` when `rootId` is not a node.
  - `manager-cycle.ts`: `assertNoManagerCycle(tx: Db, companyId:
    string, employeeId: string, managerId: string | null):
    Promise<void>`: 422 `MANAGER_CYCLE` when `managerId === employeeId`
    or `employeeId` appears on the manager chain above `managerId`
    (recursive CTE, bounded at 1000 steps).
  - Migration 1002: `skills(id, company_id, name, name_ar, category,
    status, unique(company_id, lower(name)))`, `employee_skills(
    company_id, employee_id, skill_id, self_level, confirmed_level,
    confirmed_by, note, updated_at, primary key(employee_id,
    skill_id))`, `succession_plans(id, company_id, title,
    incumbent_employee_id, department_id, required_skills jsonb,
    candidates jsonb, status, created_by, updated_at)` (select,
    insert, update; the candidate list is a column, so replacing it
    needs no delete; history is in the audit log by field name).
  - Skill level rules: levels must be a `value` of the scale named by
    `skillScaleId` (unset: 422 `SKILL_SCALE_NOT_SET`; other value: 422
    `RATING_NOT_IN_SCALE`); the subject employee may set `selfLevel`
    only; the subject's manager, owner and hr may set
    `confirmedLevel` only (sending the other key: 403 `FORBIDDEN`);
    others 404; retired skill 409 `SKILL_RETIRED`.
  - Matrix scope: `viewerScope` (owner and hr all, manager self and
    reports, employee self), active employees only.
  - `skill-gaps.ts`: `skillGaps(required: { skillId; level: number
    }[], confirmed: Map<string, number>): SkillGap[]`: one gap per
    required skill whose confirmed level is missing or lower,
    in `required` order. Higher value means higher level.
  - Succession rules: candidates and incumbent must be active
    employees; a candidate equal to the incumbent or listed twice is
    422 `CANDIDATE_INVALID`; required skill ids must exist; `coverage`
    is `covered` when at least one candidate is `ready-now`, else
    `at-risk`. Update with `candidates` replaces the list.
  - Audit: `skill.created`, `skill.updated` (`changed`),
    `employee.skill.updated` (`data: { skillId, fields }`),
    `succession.plan.created`, `succession.plan.updated` (`changed`).
  - `seed.ts`: `seedTalent` adds `{ skillId }` (skill "Excel") and sets
    `skillScaleId` to the seeded scale.

- [ ] **Step 1: Write the failing tests**

`org-chart.test.ts` (pure cases call `buildOrgChart` directly):
- `org_chart_tree_and_depth`: owner A (no manager), B and C report to
  A, D reports to B: roots `[A]`, depths A 0, B 1, D 2, C 1, order
  A, B, D, C (B before C by name), A `directReportCount` 2.
- `org_chart_cycle_breaks_once` (Review Focus 4): rows X to Y, Y to Z,
  Z to X: every id appears exactly once in `nodes`; exactly one
  `brokenLinks` entry with reason `cycle` for the smallest id; that id
  is the only root.
- `org_chart_manager_left_is_root` (Review Focus 4): E's manager is
  inactive: E is a root, link reason `manager-left`; the inactive row
  is not a node.
- `org_chart_subtree`: `rootId` B gives nodes B and D with depths 0, 1.
- `org_chart_property`: fast-check over 1 to 40 rows with random
  managers (including self and cycles): node count equals active row
  count and ids are unique.
- `org_chart_route_all_roles_minimal`: the employee calls `GET
  /v1/org-chart` with 200; no node object has keys other than the
  `OrgNode` keys; the body contains no sentinel amount or IBAN.
- `manager_cycle_refused` (Review Focus 4): hr PATCHes the manager's
  `managerId` to the employee who reports to them: 422
  `MANAGER_CYCLE`; `managerId` equal to own id: 422.

`skills.test.ts`:
- `skill_level_needs_scale`: with no `skillScaleId`, PUT gives 422
  `SKILL_SCALE_NOT_SET`.
- `skill_self_vs_confirmed`: the employee sets `selfLevel` 3 (200);
  the employee sending `confirmedLevel` gets 403; the manager confirms
  4; a level 9 gives 422 `RATING_NOT_IN_SCALE`.
- `skill_manager_non_report_404`.
- `skill_matrix_scoped`: the manager's matrix has rows for self and the
  report only; the employee's has one row.
- `skill_name_unique`: "excel" after "Excel" gives 409
  `SKILL_NAME_TAKEN`.
- `skill_audit_has_no_level`: audit data text has no `selfLevel`.

`succession.test.ts`:
- `skill_gaps_pure`: required Excel 4 and SQL 3, confirmed Excel 4
  only: one gap `{ SQL, required 3, confirmed null }`.
- `succession_coverage`: a plan with one `ready-1-2-years` candidate is
  `at-risk`; changing it to `ready-now` gives `covered`.
- `succession_candidate_is_incumbent_422`.
- `succession_owner_hr_only`: the manager gets 403 on list and get.
- `succession_note_text`: the response `note` equals
  `SUCCESSION_NOTE`; no key of `SuccessionPlan.shape` matches
  `/score/`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test org-chart skills
  succession`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above (pure modules first).
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): org chart, skills, succession`.

### Task 3: KPI and OKR tracking linked to goals

**Files:**
- Create: `packages/contract/src/okr.ts`,
  `packages/api/migrations/1003_okrs.sql`,
  `packages/api/src/talent/decimal.ts` (pure),
  `src/talent/kpi-progress.ts` (pure), `src/talent/objectives.ts`,
  `src/talent/kpis.ts`, `src/routes/talent-okr.ts`
- Modify: contract `routes-talent.ts`, `errors.ts`, `examples.ts`,
  `index.ts`, `tests/routes-talent.test.ts`; api `src/app.ts`,
  `tests/helpers/seed.ts`, `tests/leak.test.ts`,
  `tests/conformance.test.ts`
- Test: `packages/api/tests/kpi-progress.test.ts`,
  `tests/okr.test.ts`

**Interfaces:**
- Consumes: Task 1 `talentAudit`; Task 2 `PersonRef`; Plan 3
  `viewerScope`, departments; Plan 8 `loadGoal`, `addCheckIn`, `Goal`,
  `CheckInCreate`.
- Produces (contract):
  - `Decimal = ^-?\d{1,12}(\.\d{1,4})?$` (string, never a float);
    `OkrPeriod { year: int 2000..2100; quarter: int 1..4 | null }`
    (null quarter: the whole year).
  - `ObjectiveLevel = z.enum(["company","department","employee"])`;
    `OkrStatus = z.enum(["active","achieved","dropped"])`.
  - `ObjectiveCreate { title: 1..200; description?: max 2000; level;
    departmentId?: Id; employeeId?: Id; ownerEmployeeId?: Id; period;
    parentId?: Id }` refined: `departmentId` required exactly for
    `department`; `employeeId` only for `employee` (omitted by an
    employee means self).
  - `ObjectiveUpdate { title?; description?: string | null;
    ownerEmployeeId?: Id | null; status?: OkrStatus }` (level, period
    and parent are fixed at creation).
  - `KpiDirection = z.enum(["increase","decrease"])`;
    `KpiCreate { title: 1..200; unit: 1..20; direction; baseline:
    Decimal; target: Decimal; ownerEmployeeId?: Id; objectiveId?: Id;
    goalId?: Id; period: OkrPeriod }`; `KpiUpdate { title?; target?;
    status?: OkrStatus; goalId?: Id | null; objectiveId?: Id | null }`.
  - `KpiReadingCreate { value: Decimal; asOf: IsoDate; note?: max
    1000; checkInGoal?: boolean }`; `KpiReading { id; value; asOf;
    note: string | null; authorUserId: Id; at: Timestamp }`.
  - `KpiSummary { id; title; unit; direction; baseline; target;
    current: Decimal | null; progress: int 0..100 | null; owner:
    PersonRef; objectiveId: Id | null; goalId: Id | null; period;
    status; lastReadingOn: IsoDate | null }`; `Kpi = KpiSummary & {
    readings: KpiReading[]; createdBy; createdAt }` (readings newest
    first).
  - `Objective { id; title; description: string | null; level;
    departmentId: Id | null; employeeId: Id | null; owner: PersonRef |
    null; period; parentId: Id | null; status; progress: int 0..100 |
    null; keyResults: KpiSummary[]; createdBy; createdAt }`.
  - `ObjectiveQuery { level?; departmentId?; employeeId?; year?: int;
    quarter?: int }`; `KpiQuery { ownerEmployeeId?; objectiveId?;
    goalId?; year?; status? }`.
  - Routes (nine, all roles): `listObjectives GET /v1/objectives`,
    `createObjective POST /v1/objectives` (201), `getObjective GET
    /v1/objectives/{id}`, `updateObjective PATCH /v1/objectives/{id}`,
    `listKpis GET /v1/kpis` (`KpiSummary[]`), `createKpi POST
    /v1/kpis` (201, `Kpi`), `getKpi GET /v1/kpis/{id}`, `updateKpi
    PATCH /v1/kpis/{id}`, `addKpiReading POST /v1/kpis/{id}/readings`
    (201, `Kpi`).
  - Error codes: `PERIOD_MISMATCH` 422, `GOAL_OWNER_MISMATCH` 422,
    `READING_IN_FUTURE` 422, `KPI_NO_PROGRESS` 422, `KPI_CLOSED` 409,
    `OWNER_REQUIRED` 422, `PARENT_INVALID` 422.
- Produces (api):
  - `decimal.ts`: `parseDecimal(s: string): bigint` (scaled by 10^4,
    `"12.5"` is `125000n`); `formatDecimal(v: bigint): string`
    (shortest form, `125000n` is `"12.5"`, `-5000n` is `"-0.5"`).
  - `kpi-progress.ts`: `kpiProgress(k: { baseline: string; target:
    string; direction: "increase" | "decrease" }, current: string |
    null): number | null`. Algorithm (bigint throughout):

    ```
    current null -> null
    increase: num = cur - base; den = target - base
    decrease: num = base - cur; den = base - target
    den <= 0: return met ? 100 : 0, where met is cur >= target
              (increase) or cur <= target (decrease)
    otherwise: p = (num * 100) / den  (bigint, truncates toward 0)
               return clamp(p, 0, 100)
    ```
    `objectiveProgress(krs: { status; progress: number | null }[]):
    number | null` = floor of the mean of `progress` over `active`
    key results with non-null progress; null when none.
  - Migration 1003: `objectives(id, company_id, title, description,
    level, department_id, employee_id, owner_employee_id, year,
    quarter, parent_id, status, created_by, created_at)`, `kpis(id,
    company_id, title, unit, direction, baseline_scaled int8,
    target_scaled int8, owner_employee_id, objective_id, goal_id, year,
    quarter, status, created_by, created_at)`, `kpi_readings(id,
    company_id, kpi_id, value_scaled int8, as_of, note,
    author_user_id, at)` (readings: insert and select only).
  - Visibility: company and department objectives, and KPIs attached
    to them, are visible to every member; employee objectives and
    other KPIs follow `viewerScope` of their owner employee (else 404).
  - Edit rights: company and department objectives: owner, hr.
    Employee objectives: owner, hr, the employee, the employee's
    manager. KPIs and readings: owner, hr, the owner employee, that
    employee's manager. Others: 403 `FORBIDDEN` when visible.
  - Rules: an employee creates employee-level items for self only
    (else 403); `ownerEmployeeId` defaults to the caller's employee,
    and owner or hr without a link must send it (422
    `OWNER_REQUIRED`); a parent must exist, be visible and share the
    period (422 `PARENT_INVALID`); a KPI in an objective shares its
    period (422 `PERIOD_MISMATCH`); `goalId` is loaded with
    `loadGoal` (404 if unseen) and its `employeeId` must equal the
    KPI owner (422 `GOAL_OWNER_MISMATCH`); readings and updates on a
    non-active KPI: 409 `KPI_CLOSED`; `asOf` after today: 422
    `READING_IN_FUTURE`; `current` is the reading with the latest
    `asOf` (ties: latest `at`).
  - `checkInGoal: true` (needs `goalId`, else 400
    `VALIDATION_FAILED`): after saving the reading, call
    `addCheckIn(ctx, goalId, { progress, note: "KPI <title>: <value>
    <unit>" })` with the KPI's new progress (null progress: 422
    `KPI_NO_PROGRESS`); a 409 `GOAL_CLOSED` from Plan 8 rolls the whole
    request back, so the reading is not saved either. The goal record
    itself is unchanged in shape (Plan 8 Ruling 25 stands).
  - Audit: `objective.created`, `objective.updated` (`changed`),
    `kpi.created`, `kpi.updated` (`changed`), `kpi.reading.added`
    (`data: { asOf, goalCheckIn: boolean }`).
  - `seed.ts`: `seedTalent` adds a company objective and an employee
    KPI owned by the seeded employee: `{ objectiveId, kpiId }`.

- [ ] **Step 1: Write the failing tests**

`kpi-progress.test.ts`:
- `kpi_increase`: baseline `"0"`, target `"200"`: current `"50"` gives
  25, `"250"` gives 100, `"-10"` gives 0, `"199.99"` gives 99.
- `kpi_decrease`: baseline `"40"`, target `"10"`, current `"25"` gives
  50.
- `kpi_flat_target`: baseline and target `"5"`: current `"5"` gives
  100, `"4.9999"` gives 0 (increase).
- `kpi_null_current`: gives null.
- `kpi_property`: fast-check over random decimals: result is null or
  an integer in 0..100; `parseDecimal(formatDecimal(x)) === x`.
- `objective_mean`: progress 25, 50, null and a dropped KR at 100 give
  37.

`okr.test.ts`:
- `okr_company_objective_visible_to_all`: hr creates it; the employee
  lists and gets it; the employee PATCH gives 403.
- `okr_employee_kpi_scoped`: the seeded KPI is visible to its owner,
  the manager, hr; the other employee gets 404.
- `okr_reading_updates_progress`: readings `"50"` then `"80"` (dated
  later) on baseline 0, target 200 give `current "80"`, progress 40;
  objective progress equals the mean of its active KRs.
- `okr_reading_future_422`: `asOf` one day after the Dubai date.
- `okr_goal_link_owner_mismatch`: linking another employee's goal
  gives 422 `GOAL_OWNER_MISMATCH`.
- `okr_check_in_goal`: with a linked active goal, a reading with
  `checkInGoal: true` gives the goal a `lastCheckIn.progress` equal to
  the KPI progress.
- `okr_check_in_closed_goal_rolls_back`: the goal is `achieved`; the
  reading gives 409 `GOAL_CLOSED` and `GET /v1/kpis/{id}` shows no
  new reading.
- `okr_period_mismatch`: KPI 2027 in a 2026 objective gives 422.
- `okr_no_pay_fields`: no key of `Kpi.shape` or `Objective.shape`
  matches `/amount|bonus|salary|rating|score/`.
- `okr_audit_has_no_value`: the `kpi.reading.added` data text has no
  `"80"`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test kpi-progress
  okr`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): KPI and OKR tracking`.

### Task 4: Appraisal cycles with self, manager and 360 reviews

**Files:**
- Create: `packages/contract/src/appraisals.ts`,
  `packages/api/migrations/1004_appraisals.sql`,
  `packages/api/src/talent/cycles.ts`, `src/talent/appraisals.ts`,
  `src/talent/reviews.ts`, `src/talent/review-view.ts` (pure),
  `src/talent/peer-summary.ts` (pure), `src/routes/talent-appraisals.ts`
- Modify: contract `routes-talent.ts`, `errors.ts`, `examples.ts`,
  `index.ts`, `tests/routes-talent.test.ts`; api `src/talent/scales.ts`
  (`inUse` also counts cycles), `src/app.ts`, `tests/helpers/seed.ts`,
  `tests/leak.test.ts`, `tests/conformance.test.ts`
- Test: `packages/api/tests/review-view.test.ts`,
  `tests/appraisals.test.ts`

**Interfaces:**
- Consumes: Tasks 1 and 2 (`loadScale`, `getTalentSettings`,
  `sealJson`, `openJson`, `talentAudit`, `PersonRef`); Plan 3
  `viewerScope`, employees, memberships.
- Produces (contract):
  - `ReviewKind = z.enum(["self","manager","peer"])`;
    `CycleStatus = z.enum(["draft","open","calibration","closed"])`.
  - `AppraisalQuestion { id: ^q\d{1,2}$; text: 1..300; textAr?:
    1..300; kind: "rating" | "text"; appliesTo: ReviewKind[] 1..3 }`.
  - `AppraisalCycleCreate { name: 1..120; periodStart: IsoDate;
    periodEnd: IsoDate; ratingScaleId: Id; selfReview: boolean;
    peerReview: { enabled: boolean; maxPeers: int 1..10 }; questions:
    AppraisalQuestion[] 1..30 (unique ids); participants: { allActive:
    true } | { departmentIds: Id[] 1..200 }; dueDates?: { self?;
    manager?; peer?: IsoDate } }` refined `periodEnd >= periodStart`.
  - `AppraisalCycleUpdate` = partial of create (draft only).
  - `AppraisalCycle { id; name; periodStart; periodEnd; status;
    ratingScaleId; scale: ScaleLevel[] | null (snapshot from open);
    selfReview; peerReview; questions; participants; dueDates;
    participantCount: int; createdBy; createdAt; openedAt: Timestamp |
    null; closedAt: Timestamp | null }`.
  - `ReviewAnswer { questionId; rating: int | null; comment: string |
    null }`; `ReviewView { kind; author: PersonRef | null; status:
    "draft" | "submitted"; answers: ReviewAnswer[]; overallRating: int
    | null; submittedAt: Timestamp | null }`.
  - `PeerSummary { nominated: int; submitted: int; shown: boolean;
    minCount: int; questions: { questionId; ratingCounts: { value;
    count }[]; comments: string[] }[]; overallCounts: { value; count
    }[]; reviews: ReviewView[] | null }` (`questions` and
    `overallCounts` empty when not shown; `reviews` with authors for
    owner and hr only, else null).
  - `AppraisalSummary { id; cycleId; employee: PersonRef; manager:
    PersonRef | null; selfStatus: "none" | "draft" | "submitted";
    managerStatus: same; peersSubmitted: int; peersNominated: int;
    finalRating: int | null }` (`finalRating` null unless the viewer
    may see it, see below).
  - `Appraisal = AppraisalSummary & { self: ReviewView | null;
    managerReview: ReviewView | null; peers: PeerSummary | null;
    peerNominees: PersonRef[] | null; myPeerReview: ReviewView | null
    }`.
  - `ReviewSave { answers: { questionId; rating?: int | null;
    comment?: string (max 4000) | null }[] max 30; overallRating?: int
    | null; submit: boolean }`; `PeerNomination { peerEmployeeIds: Id[]
    max 10 }`; `PeerTask { appraisalId; cycleId; cycleName; employee:
    PersonRef; status: "draft" | "submitted" | "none"; dueDate: IsoDate
    | null }`.
  - Routes (ten): `listAppraisalCycles GET /v1/appraisal-cycles` (all),
    `createAppraisalCycle POST /v1/appraisal-cycles` (owner, hr; 201),
    `getAppraisalCycle GET /v1/appraisal-cycles/{id}` (all),
    `updateAppraisalCycle PATCH /v1/appraisal-cycles/{id}` (owner,
    hr), `openAppraisalCycle POST /v1/appraisal-cycles/{id}/open`
    (owner, hr), `listAppraisals GET /v1/appraisals` (all; query
    `cycleId?, employeeId?`; `AppraisalSummary[]`), `getAppraisal GET
    /v1/appraisals/{id}` (all), `nominatePeers PUT
    /v1/appraisals/{id}/peers` (owner, hr, manager), `saveReview PUT
    /v1/appraisals/{id}/reviews/{kind}` (all; `kind` is `ReviewKind`),
    `listMyPeerReviews GET /v1/me/peer-reviews` (all; `PeerTask[]`).
  - Error codes: `CYCLE_NOT_DRAFT` 409, `CYCLE_NOT_OPEN` 409,
    `NO_PARTICIPANTS` 422, `REVIEW_KIND_DISABLED` 409,
    `REVIEW_SUBMITTED` 409, `REVIEW_INCOMPLETE` 422, `ANSWER_INVALID`
    422, `PEER_INVALID` 422, `PEER_COUNT` 422, `PEER_ALREADY_SUBMITTED`
    409, `SCALE_RETIRED` 409.
- Produces (api):
  - Migration 1004: `appraisal_cycles(id, company_id, name,
    period_start, period_end, status, rating_scale_id, scale jsonb,
    self_review, peer_review jsonb, questions jsonb, participants
    jsonb, due_dates jsonb, peer_min_count int, created_by,
    created_at, opened_at, closed_at)`, `appraisals(id, company_id,
    cycle_id, employee_id, manager_employee_id, unique(cycle_id,
    employee_id))`, `appraisal_peers(company_id, appraisal_id,
    peer_employee_id, status "active" | "removed", primary
    key(appraisal_id, peer_employee_id))`, `appraisal_reviews(id,
    company_id, appraisal_id, kind, author_user_id,
    author_employee_id, status, answers_enc, overall_rating int,
    submitted_at)` with a unique index on `(appraisal_id, kind)` where
    `kind` is `self` or `manager`, and on `(appraisal_id,
    author_employee_id)` where `kind` is `peer`.
    `answers_enc` holds `ReviewAnswer[]` through `sealJson` (table
    `appraisal_reviews`, column `answers_enc`).
  - Open (draft only, else 409 `CYCLE_NOT_DRAFT`): the scale must be
    active (409 `SCALE_RETIRED`); snapshot `scale` and
    `peer_min_count` (from settings `peerReviewMinCount`); create one
    appraisal per employee with status `active`, `joiningDate <=
    periodEnd`, matching `participants`, with `manager_employee_id` =
    the employee's `managerId` now; none: 422 `NO_PARTICIPANTS`.
  - Reviews (cycle `open`, else 409 `CYCLE_NOT_OPEN`): `self` by the
    subject only and only when `selfReview` (else 409
    `REVIEW_KIND_DISABLED`); `manager` by the snapshotted manager, or
    by owner or hr when there is none; `peer` by an active nominee
    only and only when peers are enabled. Others: 404. A rating must be
    a scale value (422 `RATING_NOT_IN_SCALE`); an unknown question, a
    question not applying to the kind, or a rating on a `text`
    question: 422 `ANSWER_INVALID`. `submit: true` needs every
    applicable `rating` question rated, and `overallRating` for
    `manager` (422 `REVIEW_INCOMPLETE` with `detail.missing`);
    submitted reviews are immutable (409 `REVIEW_SUBMITTED`).
  - Nominations (cycle `open`; owner, hr, or the snapshotted manager):
    peers must be active employees linked to an active member, not the
    subject and not the manager (422 `PEER_INVALID`); at most
    `maxPeers` (422 `PEER_COUNT`); the call replaces the active list,
    marking dropped rows `removed`; dropping a peer who submitted: 409
    `PEER_ALREADY_SUBMITTED`.
  - `review-view.ts`: `appraisalViewFor(v: { role: Role; employeeId:
    string | null }, a: AppraisalRecord): Appraisal`, the only
    serialiser of appraisals. `AppraisalRecord` is the decrypted row
    set (cycle status, subject, manager, reviews, nominees,
    `peerMinCount`, final rating from Task 5). Visibility:
    - owner, hr: `self` and `managerReview` in any status; `peers`
      with `reviews` (authors); `finalRating` always.
    - snapshotted manager: `self` once submitted; own `managerReview`
      in any status; `peers` summary when shown; `finalRating` after
      close.
    - subject employee: own `self` in any status; `managerReview`
      only when submitted and the cycle is closed; `peers` summary
      only when shown and closed; `finalRating` after close.
    - active peer: all four null.
    - `peerNominees`: owner, hr and the snapshotted manager; null for
      the subject and peers.

    A peer sees only `myPeerReview`; anyone else gets 404. "Shown"
    means `submitted >= peerMinCount`.
  - `peer-summary.ts`: `summarisePeers(reviews: ReviewView[], minCount:
    number, withAuthors: boolean): PeerSummary`: counts per rating
    value in scale order; comments sorted by text (so order says
    nothing about authors); `reviews` only when `withAuthors`.
  - Visible appraisals for lists: owner and hr all; others those where
    they are subject or snapshotted manager. `listMyPeerReviews`: the
    caller's active nominations in open cycles.
  - Audit: `appraisal.cycle.created`, `appraisal.cycle.updated`
    (`changed`), `appraisal.cycle.opened` (`data: { participantCount
    }`), `appraisal.peers.nominated` (`data: { count }`),
    `appraisal.review.submitted` (`data: { kind }`). Drafts write no
    audit.
  - `seed.ts`: `seedTalent` adds an open cycle with peers enabled
    (`maxPeers` 3), questions `q1` (rating, all kinds) and `q2` (text,
    self and manager), and returns `{ cycleId, appraisalId }` for the
    seeded employee (manager = the seeded manager).

- [ ] **Step 1: Write the failing tests**

`review-view.test.ts` (pure): a table over viewer (owner, hr, manager,
subject, peer, other) x cycle status (open, closed) asserting which of
`self`, `managerReview`, `peers`, `peerNominees`, `finalRating`,
`myPeerReview` is null, exactly per the visibility list;
`summarisePeers` with two submitted and `minCount` 3 gives `shown:
false` and empty `questions`; with three, counts per value and
comments in text order.

`appraisals.test.ts`:
- `appraisal_open_snapshots`: open creates appraisals for active
  employees only (a leaver and a future joiner are absent); changing
  the employee's manager afterwards does not change
  `manager.employeeId`; editing the scale's labels afterwards does not
  change `cycle.scale`.
- `appraisal_open_twice_409`: 409 `CYCLE_NOT_DRAFT`.
- `appraisal_self_review_flow`: the subject saves a draft, then
  submits; a second save gives 409 `REVIEW_SUBMITTED`; the manager now
  sees `self` submitted.
- `appraisal_incomplete_submit`: the manager submits without
  `overallRating`: 422 `REVIEW_INCOMPLETE`, `missing` contains
  `"overallRating"`.
- `appraisal_rating_not_in_scale`: rating 7 on the 1 to 5 scale: 422.
- `appraisal_text_question_rating_422`: rating on `q2`: 422
  `ANSWER_INVALID`.
- `appraisal_peer_rules`: nominating the subject or the manager gives
  422 `PEER_INVALID`; four peers with `maxPeers` 3 gives 422
  `PEER_COUNT`; a non-nominee peer save gives 404.
- `appraisal_peer_authors_hidden` (Review Focus 2): three peers
  submit with comment `"PEER-SENTINEL-<n>"`; after close (set by
  direct SQL here; Task 5 adds the route), the subject's and the
  manager's bodies contain the comments but none of the three peers'
  employee ids or names in `peers`; hr sees `reviews` with authors.
- `appraisal_peers_below_threshold_hidden`: with two submitted, the
  subject and manager see `shown: false` and no comment text.
- `appraisal_employee_cannot_see_others`: the other employee gets 404
  on the seeded appraisal and an empty list.
- `appraisal_answers_encrypted`: the `appraisal_reviews` table text
  contains no `"PEER-SENTINEL"`.
- `appraisal_audit_has_no_rating`: audit data texts have no
  `overallRating` and no comment.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test review-view
  appraisals`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): appraisal cycles and 360 reviews`.

### Task 5: Calibration view and closing a cycle

**Files:**
- Create: `packages/contract/src/calibration.ts`,
  `packages/api/migrations/1005_calibration.sql`,
  `packages/api/src/talent/calibration.ts`,
  `src/talent/distribution.ts` (pure),
  `src/routes/talent-calibration.ts`
- Modify: contract `routes-talent.ts`, `errors.ts`, `examples.ts`,
  `index.ts`, `tests/routes-talent.test.ts`; api
  `src/talent/review-view.ts` (final rating from the new columns),
  `src/app.ts`, `tests/helpers/seed.ts`, `tests/leak.test.ts`,
  `tests/conformance.test.ts`
- Test: `packages/api/tests/calibration.test.ts`

**Interfaces:**
- Consumes: Task 4 cycles, appraisals, reviews, `appraisalViewFor`.
- Produces (contract):
  - `CalibrateRequest { copyManagerRatings: boolean }`;
    `FinalRatingSet { rating: int; reason: 3..500 }`.
  - `CalibrationRow { appraisalId; employee: PersonRef; departmentId:
    Id | null; departmentName: string | null; manager: PersonRef |
    null; selfRating: int | null; managerRating: int | null; peerMean:
    string | null (one decimal, only when peers are shown);
    finalRating: int | null; finalReason: string | null }`.
  - `Calibration { cycleId; status: CycleStatus; scale: ScaleLevel[];
    rows: CalibrationRow[]; distribution: { value; label; manager:
    int; final: int }[]; byDepartment: { departmentId: Id | null;
    name: string; final: { value; count }[] }[];
    missingManagerReviews: Id[]; note: typeof CALIBRATION_NOTE }`.
  - `CALIBRATION_NOTE = "Final ratings are set by people. The
    distribution is shown for discussion; the product applies no
    target curve."`
  - Routes (four): `startCalibration POST
    /v1/appraisal-cycles/{id}/calibrate` (owner, hr; body
    `CalibrateRequest`; `AppraisalCycle`), `getCalibration GET
    /v1/appraisal-cycles/{id}/calibration` (owner, hr),
    `setFinalRating PUT /v1/appraisals/{id}/final-rating` (owner, hr;
    `Appraisal`), `closeAppraisalCycle POST
    /v1/appraisal-cycles/{id}/close` (owner; `AppraisalCycle`).
  - Error codes: `CYCLE_NOT_CALIBRATING` 409, `FINAL_RATINGS_MISSING`
    422.
- Produces (api):
  - Migration 1005: `appraisals` gains `final_rating int`,
    `final_reason_enc text`, `final_set_by`, `final_set_at` (reason
    sealed, column `final_reason_enc`).
  - `distribution.ts`: `ratingDistribution(scale: ScaleLevel[],
    ratings: (number | null)[]): { value: number; count: number }[]`
    (one entry per scale value in scale order, nulls ignored);
    `meanOneDecimal(values: number[]): string | null` = sum * 10 / n
    rounded half up, formatted with one decimal (`[3, 4, 4]` gives
    `"3.7"`; empty gives null).
  - `startCalibration`: `open` only (409 `CYCLE_NOT_OPEN`); sets
    `calibration`; reviews become read-only; with
    `copyManagerRatings` each submitted manager `overallRating` is
    copied into `final_rating` with reason `"Manager rating"`.
  - `setFinalRating`: cycle `calibration` (409
    `CYCLE_NOT_CALIBRATING`); a scale value (422
    `RATING_NOT_IN_SCALE`).
  - `closeAppraisalCycle`: `calibration` only (409
    `CYCLE_NOT_CALIBRATING`); every appraisal has a final rating (422
    `FINAL_RATINGS_MISSING` with `detail.appraisalIds`, all of them);
    sets `closed` and `closedAt`, which releases results per the Task
    4 table.
  - `getCalibration` works in any status after `draft`; rows sorted by
    department name then employee name.
  - Audit: `appraisal.calibration.started` (`data: { copied: int }`),
    `appraisal.final-rating.set` (`data: { changed: ["finalRating"]
    }`), `appraisal.cycle.closed` (`data: { participantCount }`).
  - `seed.ts`: `seedTalent` takes the seeded cycle through
    calibration (final rating 4 for the seeded employee with reason
    `"CALIB-SENTINEL"`, others 3) and closes it; returns `{
    closedCycleId }`. The leak test's `mayView` allows
    `"CALIB-SENTINEL"` to owner and hr only.

- [ ] **Step 1: Write the failing tests**

`calibration.test.ts`:
- `calibration_distribution_pure`: scale 1 to 5, ratings `[3, 3, 5,
  null]` give counts `[0, 0, 2, 0, 1]`; `meanOneDecimal([3, 4, 4])`
  is `"3.7"`, `([2, 3])` is `"2.5"`.
- `calibration_copy_manager_ratings`: after manager reviews with 4 and
  2, calibrate with copy: rows' `finalRating` 4 and 2,
  `finalReason "Manager rating"`; a participant without a manager
  review is in `missingManagerReviews` with `finalRating` null.
- `calibration_reviews_locked`: a self save during calibration gives
  409 `CYCLE_NOT_OPEN`.
- `calibration_close_needs_all_finals`: close with one missing gives
  422 `FINAL_RATINGS_MISSING` listing that appraisal id; after setting
  it, close gives `closed`.
- `calibration_close_owner_only`: hr close gives 403 `FORBIDDEN`.
- `calibration_release_after_close`: before close the subject sees
  `finalRating` null; after close the rating set in calibration.
- `calibration_manager_forbidden`: the manager gets 403 on
  `GET .../calibration`.
- `calibration_reason_not_in_audit`: audit data texts lack
  `"CALIB-SENTINEL"`; the `appraisals` table text lacks it.
- `calibration_note_text`: `note` equals `CALIBRATION_NOTE`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test calibration`.
  Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): calibration view and cycle close`.

### Task 6: Bonus proposals from appraisals into pay inputs

Money task: fresh per-task review.

**Files:**
- Create: `packages/contract/src/bonus.ts`,
  `packages/api/migrations/1006_bonus.sql`,
  `packages/api/src/talent/bonus-calc.ts` (pure),
  `src/talent/bonus-plans.ts`, `src/talent/bonus-proposals.ts`,
  `src/routes/talent-bonus.ts`
- Modify: contract `routes-talent.ts`, `errors.ts`, `examples.ts`,
  `index.ts`, `tests/routes-talent.test.ts`; api `src/app.ts`,
  `tests/helpers/seed.ts`, `tests/leak.test.ts`,
  `tests/conformance.test.ts`
- Test: `packages/api/tests/bonus-calc.test.ts`,
  `tests/bonus.test.ts`, `tests/bonus-isolation.test.ts`

**Interfaces:**
- Consumes: `Fils`, `mulDiv`, `formatAed`, `TraceLine` from
  `@payroll/engine`; Plan 3 `loadEmployee` (recurring `basic`
  component and `salaryVersion`), `toMoney`, `parseAed`, `Money`,
  `Period`, `PayRunEntry`, `loadPayRun`, `loadRunPayslip`; Task 5
  final ratings; Task 1 `sealJson`, `openJson`, `talentAudit`.
- Produces (contract):
  - `BONUS_NOTE = "Proposal only. Nothing is paid until HR adds it to
    a pay run and the run is approved. Amounts come from your
    company's bonus plan, not from law."`
  - `BonusPlanPut { bpsByRating: { rating: int; bps: int 0..100000
    }[] 1..10; rounding: "HALF_UP" | "DOWN"; payPeriod: Period; label:
    1..80 }`; `BonusPlan = BonusPlanPut & { cycleId; basis:
    "monthly-basic"; locked: boolean; updatedBy; updatedAt }`.
  - `ProposalStatus = z.enum(["proposed","approved","rejected",
    "included"])`.
  - `BonusProposal { id; cycleId; appraisalId; employee: PersonRef;
    rating: int; amount: Money; kind: "plan" | "edited"; status;
    payCode: ^bonus-[0-9a-f]{12}$; payPeriod: Period; label; trace:
    TraceLine[]; proposedBy: Id; editedBy: Id | null; approvedBy: Id |
    null; approvedAt: Timestamp | null; payRunId: Id | null; note:
    typeof BONUS_NOTE }`.
  - `BonusGenerateResult { created: BonusProposal[]; existing: Id[];
    skipped: { employeeId: Id; reason: "employee-left" |
    "no-basic-salary" }[] }`.
  - `BonusEdit { amount: Money; reason: 3..500 }`; `BonusReject {
    reason: 3..500 }`; `BonusIncluded { payRunId: Id }`.
  - `BonusPayInput { proposalId; entry: { employeeId: Id; oneOffs: {
    code; label; amount: Money; sifBucket: "otherAllowances" }[] };
    note: typeof PAY_INPUT_NOTE }` where `entry` parses with Plan 3's
    `PayRunEntry`.
  - `PAY_INPUT_NOTE = "Copy this into the pay run yourself. If the
    employee already has an entry in the run, add the one-off to it."`
  - `BonusQuery { cycleId?; status?; year?; month? }`;
    `PayInputQuery { year: int; month: int 1..12 }`.
  - Routes (nine, all `owner, hr` unless marked): `getBonusPlan GET
    /v1/appraisal-cycles/{id}/bonus-plan`, `putBonusPlan PUT
    /v1/appraisal-cycles/{id}/bonus-plan` (owner),
    `generateBonusProposals POST
    /v1/appraisal-cycles/{id}/bonus-proposals` (status 200,
    `BonusGenerateResult`), `listBonusProposals GET
    /v1/bonus-proposals` (`BonusProposal[]`), `updateBonusProposal
    PATCH /v1/bonus-proposals/{id}` (`BonusEdit`),
    `approveBonusProposal POST /v1/bonus-proposals/{id}/approve`
    (owner, `mfa: true`), `rejectBonusProposal POST
    /v1/bonus-proposals/{id}/reject`, `listBonusPayInputs GET
    /v1/bonus-pay-inputs` (`BonusPayInput[]`), `markBonusIncluded
    POST /v1/bonus-proposals/{id}/mark-included`. All respond
    `BonusProposal` unless stated.
  - Error codes: `BONUS_PLAN_INVALID` 422, `BONUS_PLAN_LOCKED` 409,
    `BONUS_PLAN_MISSING` 422, `CYCLE_NOT_CLOSED` 409,
    `PROPOSAL_NOT_PROPOSED` 409, `PROPOSAL_NOT_APPROVED` 409,
    `BONUS_RUN_MISMATCH` 422, `BONUS_NOT_IN_RUN` 409.
- Produces (api):
  - `bonus-calc.ts`: `proposeBonus(i: { basicMonthly: Fils; rating:
    number; bps: number; rounding: "HALF_UP" | "DOWN"; salaryVersion:
    number }): { amount: Fils; trace: TraceLine }`: `amount =
    mulDiv(basicMonthly, BigInt(bps), 10000n, rounding)`; trace `id`
    `"bonus.proposal"`, `label` `"Proposed bonus (company plan)"`,
    `formula` `"monthly basic x bps / 10000"`, `inputs` `{ rating,
    bps, basicMonthly: formatAed(basic), salaryVersion, rounding }`,
    `result` `formatAed(amount)`, `rules: []` (company plan, no law).
    `payCodeFor(proposalId: string): string` = `"bonus-"` + the last
    12 hex digits of the id.
  - Migration 1006: `bonus_plans(company_id, cycle_id pk, body jsonb,
    locked, updated_by, updated_at)` (bps and rounding are company
    plan values, not salary), `bonus_proposals(id, company_id,
    cycle_id, appraisal_id unique, employee_id, rating, body_enc,
    kind, status, pay_code, pay_year, pay_month, proposed_by,
    edited_by, approved_by, approved_at, rejected_by, pay_run_id,
    created_at, unique(company_id, pay_code))`. `body_enc` seals `{
    amount (fils as string), trace, editReason, rejectReason }`.
  - Plan rules: `bpsByRating` lists every value of the cycle's scale
    snapshot exactly once (422 `BONUS_PLAN_INVALID` with
    `detail.missing` and `detail.extra`); the plan locks when proposals
    are first generated (later PUT: 409 `BONUS_PLAN_LOCKED`).
  - Generate: cycle `closed` (409 `CYCLE_NOT_CLOSED`); plan set (422
    `BONUS_PLAN_MISSING`); for each appraisal: employee `left` or
    `lastWorkingDate` before the pay period's first day gives
    `skipped` `employee-left`; no salary or no `basic` gives
    `no-basic-salary`; else `proposeBonus` with the recurring `basic`
    (never an override) and insert `ON CONFLICT (appraisal_id) DO
    NOTHING RETURNING id`; rows that already existed go to
    `existing`. Two concurrent calls leave one proposal per appraisal.
  - Edit: `proposed` only (409 `PROPOSAL_NOT_PROPOSED`); sets amount,
    `kind: "edited"`, `editedBy`, appends trace line `bonus.edited`
    (`formula "amount entered by HR"`, `inputs { editedBy }`).
  - Approve: owner with an MFA session; `proposed` only; approver is
    neither `proposedBy` nor `editedBy` (403 `SOD_VIOLATION`).
    Approving touches no pay run.
  - Reject: `proposed` only; reason sealed.
  - Pay inputs: approved proposals whose pay period equals the query;
    each `entry.oneOffs[0]` is `{ code: payCode, label, amount,
    sifBucket: "otherAllowances" }`.
  - Mark included: `approved` only (409 `PROPOSAL_NOT_APPROVED`); the
    run exists (404), its period equals the proposal's (422
    `BONUS_RUN_MISMATCH`) and its status is `approved` (409
    `RUN_NOT_APPROVED`, Plan 3's code), so an included bonus is always
    on an approved run, which Plan 3 makes immutable; `loadRunPayslip` for the
    employee has a line with `kind "one-off"`, `code === payCode` and
    the same amount (else 409 `BONUS_NOT_IN_RUN`); sets `included` and
    `payRunId`.
  - Visibility: every route is owner and hr; proposals never appear in
    any other route's body.
  - Audit: `bonus.plan.updated`, `bonus.proposals.generated` (`data: {
    created, existing, skipped }` counts), `bonus.proposal.edited`,
    `bonus.proposal.approved`, `bonus.proposal.rejected`,
    `bonus.proposal.included` (`data: { payRunId }`); no amounts.
  - `seed.ts`: `seedTalent` sets a plan on the closed cycle (bps 0,
    0, 5000, 10000, 15000 for ratings 1 to 5, `HALF_UP`, pay period
    April 2026), generates, and edits the seeded employee's proposal
    to `BONUS_SENTINEL = "6666.01"`; returns `{ proposalId }`. The
    leak test's `mayView` allows `"6666.01"` to owner and hr only.

- [ ] **Step 1: Write the failing tests**

`bonus-calc.test.ts`:
- `bonus_calc_half_up`: basic 400000n fils, bps 15000, `HALF_UP` gives
  600000n; basic 333333n, bps 5000 gives 166667n (`HALF_UP`) and
  166666n (`DOWN`).
- `bonus_calc_zero_bps`: gives 0n and a trace line with `rules: []`.
- `bonus_calc_trace_matches`: `trace.result === formatAed(amount)`.
- `bonus_pay_code`: id `"00000000-0000-4000-8000-0000000000ab"` gives
  `"bonus-0000000000ab"`.
- `bonus_calc_property`: fast-check: `DOWN <= HALF_UP <= DOWN + 1n`.

`bonus.test.ts`:
- `bonus_plan_must_cover_scale`: a plan missing rating 2 gives 422
  `BONUS_PLAN_INVALID` with `missing` `[2]`.
- `bonus_generate_needs_closed_cycle`: an open cycle gives 409
  `CYCLE_NOT_CLOSED`.
- `bonus_generate_amounts`: in a fresh closed cycle with the seed's
  plan, an employee with final rating 4 (bps 10000) gets an amount
  equal to their basic (`SENTINELS[id].amount`), kind `plan`; rating
  3 gives half of it rounded `HALF_UP`; a second generate returns
  `created: []` and the ids in `existing`; the plan PUT now gives 409
  `BONUS_PLAN_LOCKED`.
- `bonus_generate_concurrent_once`: two generates with `Promise.all`
  leave one proposal per appraisal (`SELECT count(*)`).
- `bonus_generate_skips_leaver`: a participant who left before April
  is in `skipped` with `employee-left`.
- `bonus_approve_sod_and_mfa`: the owner who generated, with an MFA
  session, approving gives 403 `SOD_VIOLATION`; a second owner
  without MFA gives 403 `MFA_REQUIRED`; with MFA gives `approved`; hr
  approving gives 403 `FORBIDDEN`.
- `bonus_edit_after_approve_409`: 409 `PROPOSAL_NOT_PROPOSED`.
- `bonus_pay_input_parses`: `listBonusPayInputs` for April 2026 returns
  each approved proposal, and every `entry` parses with
  `PayRunEntry`.
- `bonus_never_auto_pays` (Review Focus 3): after approval, a pay run
  for April created without the input has no line with the
  `payCode`; `markBonusIncluded` with that run gives 409
  `BONUS_NOT_IN_RUN`; after voiding that run, a new April run created
  with the pasted `entry` has the line; marking with it while still
  `draft` gives 409 `RUN_NOT_APPROVED`; marking with a May run gives
  422 `BONUS_RUN_MISMATCH`; after the second owner approves the April
  run, marking gives `included`.
- `bonus_hidden_from_manager_and_employee` (Review Focus 2): the
  manager and employee get 403 on every bonus route; the leak test
  finds `"6666.01"` in no body for them.
- `bonus_encrypted_and_not_audited`: the `bonus_proposals` table text
  and all audit data texts lack `"6666.01"` and `"666601"`.
- `bonus_note_text`: `note` equals `BONUS_NOTE`; no exported string in
  `bonus.ts` matches `/compliant|guarantee/i`.

`bonus-isolation.test.ts`: no file under `packages/api/src/payroll/`
imports from `../talent` or contains `bonus_proposals`; the string
`bonus_proposals` appears only under `src/talent/`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test bonus`.
  Expected: FAIL.
- [ ] **Step 3: Implement** `bonus-calc.ts` first (pure), then the
  rest.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): bonus proposals into pay inputs`.

### Task 7: Training, certifications and mandatory-training compliance

**Files:**
- Create: `packages/contract/src/training.ts`,
  `packages/api/migrations/1007_training.sql`,
  `packages/api/src/talent/training-audience.ts` (pure),
  `src/talent/compliance.ts` (pure), `src/talent/cert-expiry.ts`
  (pure), `src/talent/courses.ts`, `src/talent/assignments.ts`,
  `src/talent/certifications.ts`, `src/routes/talent-training.ts`
- Modify: contract `routes-talent.ts`, `errors.ts`, `examples.ts`,
  `index.ts`, `tests/routes-talent.test.ts`; api `src/app.ts`,
  `tests/helpers/seed.ts`, `tests/leak.test.ts`,
  `tests/conformance.test.ts`
- Test: `packages/api/tests/compliance.test.ts`,
  `tests/training.test.ts`, `tests/certifications.test.ts`

**Interfaces:**
- Consumes: `addMonthsClamped` (Plan 8 Task 1), `addDays`,
  `daysBetween` from `@payroll/engine`; Plan 3 `viewerScope`,
  `dubaiDate`; Task 1 `getTalentSettings`, `talentAudit`; Task 2
  `PersonRef`.
- Produces (contract):
  - `TRAINING_NOTE = "Mandatory here means required by your company's
    own rules. The product holds no legal training requirement."`
  - `DeliveryMode = z.enum(["in-person","online","on-the-job",
    "external"])`; `CourseCreate { title: 1..200; titleAr?: 1..200;
    provider?: 1..120; deliveryMode; durationHours?: int 0..1000;
    certificateValidityMonths?: int 1..120 }`; `CourseUpdate`
    (partial plus `status: "active" | "retired"`); `Course =
    CourseCreate-fields (absent as null) & { id; status; createdAt }`.
  - `TrainingAudience { allStaff: boolean; departmentIds: Id[] max
    200; jobTitles: string (1..120)[] max 100; employeeIds: Id[] max
    1000 }`.
  - `TrainingRequirementCreate { courseId; audience; dueWithinDays:
    int 1..365; renewEveryMonths?: int 1..120 }`;
    `TrainingRequirementUpdate { audience?; dueWithinDays?;
    renewEveryMonths?: int | null; status?: "active" | "retired" }`;
    `TrainingRequirement = create-fields & { id; status; createdOn:
    IsoDate; label: "company rule, not law" }`.
  - `AssignmentStatus = z.enum(["assigned","in-progress","completed",
    "waived","cancelled"])`; `TrainingAssignment { id; courseId;
    courseTitle; employee: PersonRef; status; dueDate: IsoDate | null;
    overdue: boolean; completedOn: IsoDate | null; selfReported:
    boolean; verifiedBy: Id | null; verifiedAt: Timestamp | null;
    assignedBy: Id; assignedAt: Timestamp; waivedReason: string | null
    }`.
  - `TrainingAssignmentsCreate { courseId; employeeIds: Id[] 1..200
    unique; dueDate?: IsoDate }`; `TrainingAssignmentsResult { created:
    TrainingAssignment[]; skipped: { employeeId; reason:
    "open-assignment-exists" }[] }`; `TrainingAssignmentUpdate {
    status?: AssignmentStatus; completedOn?: IsoDate; verify?: true;
    waivedReason?: 3..500; dueDate?: IsoDate | null }`.
  - `CertificationCreate { employeeId?: Id; name: 1..200; issuer?:
    1..120; courseId?: Id; certificateNumber?: ^[A-Za-z0-9/ -]{1,40}$;
    issuedOn: IsoDate; expiresOn?: IsoDate }` refined `expiresOn >=
    issuedOn`; `CertificationUpdate { status?: "superseded" |
    "revoked"; verify?: true; expiresOn?: IsoDate | null }`;
    `ExpiryState = z.enum(["none","valid","due-soon","expired"])`;
    `Certification { id; employee: PersonRef; name; issuer: string |
    null; courseId: Id | null; certificateNumber: string | null;
    issuedOn; expiresOn: IsoDate | null; expiryDerived: boolean;
    status: "active" | "superseded" | "revoked"; verifiedBy: Id |
    null; verifiedAt: Timestamp | null; expiry: ExpiryState }`.
  - `CertificationAlert { certificationId; employee: PersonRef; name;
    expiresOn: IsoDate; daysLeft: int; state: "due-soon" | "expired"
    }`.
  - `ComplianceStatus = z.enum(["compliant","due-soon","expired",
    "pending","overdue","waived"])`; `ComplianceRow { employee:
    PersonRef; departmentId: Id | null; jobTitle; courseId;
    courseTitle; requirementId; status: ComplianceStatus; requiredBy:
    IsoDate; completedOn: IsoDate | null; validUntil: IsoDate | null
    }`; `TrainingCompliance { asOf: IsoDate; rows: ComplianceRow[];
    byCourse: { courseId; title; counts: Record<ComplianceStatus, int>
    }[]; byJobTitle: { jobTitle; counts: Record<ComplianceStatus, int>
    }[]; note: typeof TRAINING_NOTE }`; `ComplianceQuery {
    departmentId?; jobTitle?; courseId? }`.
  - Routes (fourteen): `listCourses GET /v1/courses` (all),
    `createCourse POST /v1/courses` (owner, hr; 201), `updateCourse
    PATCH /v1/courses/{id}` (owner, hr), `listTrainingRequirements GET
    /v1/training-requirements` (owner, hr), `createTrainingRequirement
    POST /v1/training-requirements` (owner, hr; 201),
    `updateTrainingRequirement PATCH /v1/training-requirements/{id}`
    (owner, hr), `listTrainingAssignments GET /v1/training-assignments`
    (all; query `employeeId?, courseId?, status?`),
    `createTrainingAssignments POST /v1/training-assignments` (owner,
    hr, manager; 201, `TrainingAssignmentsResult`),
    `updateTrainingAssignment PATCH /v1/training-assignments/{id}`
    (all), `listCertifications GET /v1/certifications` (all; query
    `employeeId?, status?`), `createCertification POST
    /v1/certifications` (all; 201), `updateCertification PATCH
    /v1/certifications/{id}` (all), `listCertificationAlerts GET
    /v1/certification-alerts` (all), `getTrainingCompliance GET
    /v1/training-compliance` (owner, hr, manager).
  - Error codes: `COURSE_RETIRED` 409, `ASSIGNMENT_TRANSITION` 409,
    `COMPLETION_IN_FUTURE` 422.
- Produces (api):
  - `training-audience.ts`: `inTrainingAudience(a: TrainingAudience,
    e: { employeeId: string; departmentId: string | null; jobTitle:
    string }): boolean`: `allStaff`, or the id, department or job
    title (compared trimmed and lower-cased) is listed. Empty matches
    nobody.
  - `cert-expiry.ts`: `deriveExpiry(issuedOn: string,
    validityMonths: number | null): string | null` =
    `addMonthsClamped(issuedOn, validityMonths)`;
    `expiryState(expiresOn: string | null, today: string, alertDays:
    number): ExpiryState` (`none` when null; `expired` when `today >
    expiresOn`; `due-soon` when `daysBetween(today, expiresOn) <=
    alertDays`; else `valid`).
  - `compliance.ts`: `ComplianceInput { today; dueSoonDays;
    employees: { employeeId; name; departmentId; jobTitle;
    joiningDate; active: boolean }[]; requirements:
    TrainingRequirement[] (active only); courses: Course[];
    assignments: { employeeId; courseId; status; completedOn }[] }`;
    `computeCompliance(i: ComplianceInput): ComplianceRow[]`. Rules:
    1. Only active employees; a requirement applies when
       `inTrainingAudience` holds.
    2. One row per (employee, course). When several requirements
       apply, use the one with a non-null `renewEveryMonths` before a
       null one, then the smaller `renewEveryMonths`, then the earlier
       `requiredBy`, then the smaller requirement id.
    3. `requiredBy = addDays(max(joiningDate, createdOn),
       dueWithinDays)`.
    4. Latest `completedOn` of `completed` assignments: none and a
       `waived` assignment exists: `waived`; none and `today >
       requiredBy`: `overdue`; none: `pending`.
    5. With a completion: `renewEveryMonths` null: `compliant`, else
       `validUntil = addMonthsClamped(completedOn, renew)`; `today >
       validUntil`: `expired`; `daysBetween(today, validUntil) <=
       dueSoonDays`: `due-soon`; else `compliant`.
    6. Rows sorted by employee name, then course title.
  - Migration 1007: `courses`, `training_requirements(..., audience
    jsonb, created_on date)`, `training_assignments(id, company_id,
    course_id, employee_id, status, due_date, completed_on,
    self_reported, verified_by, verified_at, assigned_by, assigned_at,
    waived_reason)` with a partial unique index on `(company_id,
    employee_id, course_id) WHERE status IN ('assigned','in-progress')`,
    `certifications(id, company_id, employee_id, name, issuer,
    course_id, certificate_number, issued_on, expires_on,
    expiry_derived, status, verified_by, verified_at, created_by,
    created_at)`.
  - Assignment rules: retired course 409 `COURSE_RETIRED`; a manager
    assigns only to self and direct reports (others 404); an existing
    open assignment is `skipped` (insert `ON CONFLICT DO NOTHING`).
    Transitions: assigned to in-progress, completed, waived,
    cancelled; in-progress to assigned, completed, waived, cancelled;
    completed to in-progress (owner, hr only); others 409
    `ASSIGNMENT_TRANSITION`. The subject employee may move own
    assignments to in-progress or completed; `completed` needs
    `completedOn <= today` (422 `COMPLETION_IN_FUTURE`; missing: 400
    `VALIDATION_FAILED`) and sets `selfReported` true when the subject
    completes it, false when owner or hr do; `waived` needs
    `waivedReason` and owner or hr; `cancelled`: owner, hr, or the
    manager who may assign; `verify`: owner, hr. `overdue` = status
    assigned or in-progress and `dueDate < today`.
  - Certification rules: an employee creates only for self; owner and
    hr for anyone; a manager reads reports' certifications (scope
    `viewerScope`); `expiresOn` absent with a course that has
    `certificateValidityMonths` is derived (`expiryDerived` true);
    `superseded`, `revoked` and `verify`: owner, hr.
  - Alerts: active certifications of active employees (status not
    `left`) in `viewerScope` whose `expiryState` is `due-soon` or
    `expired` with `certAlertDays` from settings; sorted by
    `expiresOn`.
  - Compliance scope: owner and hr all; manager self and reports.
  - Audit: `course.created`, `course.updated`,
    `training.requirement.created`, `training.requirement.updated`,
    `training.assignment.created` (`data: { courseId, count }`),
    `training.assignment.updated` (`data: { status }`),
    `certification.created`, `certification.updated` (`changed`); no
    certificate numbers.
  - `seed.ts`: `seedTalent` adds a course "Fire safety" (validity 12
    months) and a requirement for all staff (`dueWithinDays` 30):
    `{ courseId, requirementId }`.

- [ ] **Step 1: Write the failing tests**

`compliance.test.ts` (pure, today `2026-06-15`):
- `compliance_pending_then_overdue`: joined `2026-06-01`, requirement
  created `2026-01-01`, `dueWithinDays` 30: `requiredBy`
  `2026-07-01`, status `pending`; with today `2026-07-02`, `overdue`.
- `compliance_renewal_states`: renew 12, completed `2025-06-20`:
  `validUntil` `2026-06-20`, `due-soon` with `dueSoonDays` 14;
  completed `2025-06-10`: `expired`; completed `2026-01-01`:
  `compliant`.
- `compliance_waived`: a waived assignment and no completion:
  `waived`.
- `compliance_excludes_leavers` (Review Focus 5): an inactive employee
  has no rows.
- `compliance_job_title_match`: audience `jobTitles ["Driver"]`
  matches `" driver "` and not `"Driver Lead"`.
- `compliance_strictest_requirement`: two requirements on one course
  (renew null and renew 12) give one row using the renew-12 one.
- `compliance_property`: fast-check: at most one row per (employee,
  course), and every row's employee is active.

`certifications.test.ts`:
- `cert_expiry_clamps_month_end` (Review Focus 5): issued
  `2026-01-31` on a course with validity 1 month, no `expiresOn`:
  `expiresOn` `2026-02-28`, `expiryDerived` true; issued `2024-01-31`
  gives `2024-02-29`.
- `cert_alert_uses_dubai_date` (Review Focus 5): `expiresOn`
  `2026-03-31`, `certAlertDays` 30: at `2026-02-28T20:30:00Z` (Dubai
  1 March) `daysLeft` 30 and listed `due-soon`; at
  `2026-03-31T20:30:00Z` (Dubai 1 April) state `expired`.
- `cert_alerts_exclude_leavers`: a leaver's expired certificate is not
  listed.
- `cert_employee_self_only`: an employee creating for a colleague gets
  403 `FORBIDDEN`; the manager lists the report's certificates; the
  other employee gets an empty list.
- `cert_superseded_no_alert`: marking it `superseded` removes the
  alert.
- `cert_number_not_audited`: audit data texts lack the certificate
  number.

`training.test.ts`:
- `training_assign_and_skip_duplicate`: hr assigns the course to two
  employees; assigning again gives both in `skipped`.
- `training_manager_scope`: the manager assigning a non-report gets
  404; assigning the report succeeds.
- `training_self_complete`: the employee completes with today's date:
  `selfReported` true; hr verifies: `verifiedBy` set; a future
  `completedOn` gives 422 `COMPLETION_IN_FUTURE`.
- `training_transitions`: `cancelled` to `in-progress` gives 409
  `ASSIGNMENT_TRANSITION`; the employee waiving gives 403.
- `training_compliance_route`: after the completion, the employee's
  row for "Fire safety" is `compliant` with `validUntil` 12 months on;
  the other employee's row is `pending`; `note` equals
  `TRAINING_NOTE`; the employee calling the route gets 403.
- `training_retired_course_409`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test compliance
  certifications training`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above (pure modules first).
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): training, certifications,
  compliance`.

### Task 8: Policy acknowledgement tracking and the kudos feed

The policy library, its versions, receipts and `ACK_STATEMENT` are Plan
7 Task 5. This task adds only a version history route, a cross-document
acknowledgement overview with due dates, and each person's due list.

**Files:**
- Create: `packages/contract/src/policy-ack.ts`, `src/kudos.ts`,
  `packages/api/migrations/1008_kudos.sql`,
  `packages/api/src/talent/policy-ack.ts`, `src/talent/kudos.ts`,
  `src/routes/talent-policy.ts`, `src/routes/talent-kudos.ts`
- Modify: contract `routes-talent.ts`, `errors.ts`, `examples.ts`,
  `index.ts`, `tests/routes-talent.test.ts`; api `src/app.ts`,
  `tests/helpers/seed.ts`, `tests/leak.test.ts`,
  `tests/conformance.test.ts`
- Test: `packages/api/tests/policy-ack.test.ts`,
  `tests/kudos.test.ts`

**Interfaces:**
- Consumes: Plan 7 `LibraryVersion`, `MyReceipt`, `LibraryCategory`,
  `listLibraryDocuments`, `visibleLibraryDocument`, `receiptReport`,
  tables `library_versions` and `library_receipts`; Task 1
  `getTalentSettings`, `talentAudit`; Task 2 `PersonRef`; engine
  `addDays`.
- Produces (contract):
  - `POLICY_ACK_NOTE = "A receipt records that a person confirmed they
    received and read a version. The product makes no claim about its
    legal effect."`
  - `LibraryVersionHistoryItem = LibraryVersion & { current: boolean;
    myReceipt: MyReceipt | null; counts: { acknowledged: int; viewed:
    int } | null }` (`counts`: receipts recorded on that version, owner
    and hr only).
  - `PolicyAckDocument { documentId; title; category: LibraryCategory;
    versionId; version: int; publishedAt: Timestamp; dueDate: IsoDate;
    counts: { acknowledged: int; viewed: int; pending: int }; overdue:
    int; byDepartment: { departmentId: Id | null; name: string;
    acknowledged: int; outstanding: int }[] }`;
    `PolicyAckOverview { asOf: IsoDate; dueDays: int; documents:
    PolicyAckDocument[]; note: typeof POLICY_ACK_NOTE }`;
    `PolicyAckQuery { departmentId?: Id }`.
  - `AckDueItem { documentId; title; versionId; version; publishedAt;
    dueDate: IsoDate; overdue: boolean }`.
  - `KudosCreate { recipientEmployeeIds: Id[] 1..10 unique; message:
    1..500; value?: 1..40 }`; `Kudos { id; author: { userId: Id; name:
    string; employeeId: Id | null }; recipients: PersonRef[]; message:
    string; value: string | null; createdAt: Timestamp; status:
    "visible" | "hidden"; hiddenReason: string | null }`
    (`hiddenReason` null for roles other than owner and hr);
    `KudosQuery { recipientEmployeeId?: Id; cursor?:
    ^[0-9TZ:.-]+\|[0-9a-f-]{36}$; limit?: int 1..100 (default 20) }`;
    `KudosFeed { items: Kudos[]; nextCursor: string | null }`;
    `KudosHide { reason: 3..500 }`.
  - Routes (six): `listLibraryVersions GET /v1/library/{id}/versions`
    (all; `LibraryVersionHistoryItem[]`), `getPolicyAckOverview GET
    /v1/policy-acknowledgements` (owner, hr), `listMyAcknowledgementsDue
    GET /v1/me/acknowledgements-due` (all; `AckDueItem[]`), `listKudos
    GET /v1/kudos` (all; `KudosFeed`), `postKudos POST /v1/kudos` (all;
    201, `Kudos`), `hideKudos POST /v1/kudos/{id}/hide` (owner, hr;
    `Kudos`).
  - Error codes: `KUDOS_SELF` 422, `KUDOS_RECIPIENT_INVALID` 422,
    `KUDOS_VALUE_UNKNOWN` 422.
- Produces (api):
  - `policy-ack.ts`: `ackDueDate(publishedAt: string, dueDays:
    number): string` = `addDays(dubaiDate(new Date(publishedAt)),
    dueDays)` (the `Date` here parses a stored timestamp; it reads no
    clock); `policyAckOverview(ctx, q): Promise<PolicyAckOverview>`:
    every library document whose current version `requiresAck`, built
    from Plan 7 `receiptReport` (active employees in the audience
    now); `overdue` = `viewed + pending` when today is after
    `dueDate`, else 0; `byDepartment` groups those rows by the
    employee's department now (`outstanding` = viewed + pending),
    sorted by name with "No department" last; `departmentId` filters
    rows before counting.
  - `myAcknowledgementsDue(ctx): Promise<AckDueItem[]>`: from
    `listLibraryDocuments(ctx)`, documents whose `current.requiresAck`
    is true and `myReceipt?.acknowledgedAt` is null, sorted by
    `dueDate`.
  - History: `visibleLibraryDocument` (null: 404), then all versions
    newest first.
  - Migration 1008: `kudos(id, company_id, author_user_id,
    author_employee_id, message, value, status, hidden_by,
    hidden_reason, created_at)`, `kudos_recipients(company_id,
    kudos_id, employee_id, primary key(kudos_id, employee_id))`;
    index `(company_id, created_at desc, id desc)`.
  - Kudos rules: recipients must be active employees of the company
    (422 `KUDOS_RECIPIENT_INVALID` with `detail.employeeIds`); the
    caller's own employee id among them: 422 `KUDOS_SELF`; `value`
    must be in settings `companyValues` (422 `KUDOS_VALUE_UNKNOWN`);
    feed is company-wide for every member, newest first by
    `(createdAt, id)`, `cursor` is the last item's
    `"<createdAt>|<id>"`; hidden kudos are left out for roles other
    than owner and hr, who see them with `status: "hidden"`. No
    points, amounts or reactions.
  - Audit: `kudos.posted` (`data: { recipientCount, companyValue }`),
    `kudos.hidden` (no reason). Policy reads write no audit (Plan 7
    already audits downloads and acknowledgements).
  - `seed.ts`: `seedTalent` adds one kudos from the manager to the
    employee: `{ kudosId }`.

- [ ] **Step 1: Write the failing tests**

`policy-ack.test.ts` (uses Plan 7's library routes to set up):
- `policy_history_newest_first`: after hr adds version 2, the
  employee's history lists versions 2 then 1, `current` true only on
  2, `counts` null; the owner's history has `counts` on both.
- `policy_history_audience_404`: an employee outside the audience gets
  404.
- `policy_overview_counts_and_due`: published at
  `2026-03-01T06:00:00Z`, `policyAckDueDays` 14: `dueDate`
  `2026-03-15`; one acknowledged, one viewed, two pending: counts `{
  1, 1, 2 }`, `overdue` 0 on 15 March and 3 on 16 March (Dubai dates).
- `policy_overview_by_department`: rows grouped per department with
  `acknowledged` and `outstanding`; `departmentId` filter keeps one
  group.
- `policy_my_due_list`: the employee's list has the document until
  they acknowledge the current version; after version 3 it is back.
- `policy_overview_owner_hr_only`: the manager gets 403.
- `policy_note_has_no_signature_word`: `POLICY_ACK_NOTE` does not
  match `/sign|binding|compliant/i`.

`kudos.test.ts`:
- `kudos_post_and_feed`: the employee thanks the manager with value
  "Ownership" (in `companyValues`); every role sees it in the feed.
- `kudos_self_422`, `kudos_unknown_value_422`,
  `kudos_leaver_recipient_422`.
- `kudos_paging`: 25 kudos give 20 then 5 items; the second page has
  `nextCursor` null; no item repeats.
- `kudos_hide`: hr hides one; the employee's feed lacks it; the owner
  sees `status "hidden"` and the reason; audit data lacks the reason
  and the message.
- `kudos_no_money_fields`: no key of `Kudos.shape` matches
  `/amount|points|bonus/`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test policy-ack
  kudos`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): policy acknowledgement tracking,
  kudos`.

### Task 9: Pulse surveys and eNPS, end-to-end flow, handover

Privacy task: fresh per-task review.

**Files:**
- Create: `packages/contract/src/surveys.ts`,
  `packages/api/migrations/1009_surveys.sql`,
  `packages/api/src/talent/survey-stats.ts` (pure),
  `src/talent/suppression.ts` (pure), `src/talent/surveys.ts`,
  `src/routes/talent-surveys.ts`
- Modify: contract `routes-talent.ts`, `errors.ts`, `examples.ts`,
  `index.ts`, `tests/routes-talent.test.ts`; api `src/app.ts`,
  `tests/helpers/seed.ts` (`seedCrowd`), `tests/leak.test.ts`,
  `tests/conformance.test.ts`; root `HANDOVER.md`, `LEDGER.md`
- Test: `packages/api/tests/survey-stats.test.ts`,
  `tests/surveys.test.ts`, `tests/talent-flow.test.ts`

**Interfaces:**
- Consumes: Plan 7 `Audience`, `inAudience`; Task 1
  `getTalentSettings`, `talentAudit`; Task 5 `meanOneDecimal`.
- Produces (contract):
  - `ANONYMITY_NOTE = "Responses are stored without names, user ids or
    times. Results appear only after the survey closes, and only for
    groups of at least the minimum size. Someone with direct database
    access could still try to link responses by storage order; no role
    in the product can."`
  - `ENPS_NOTE = "eNPS: answers 9 and 10 count as promoters, 0 to 6 as
    detractors. Industry convention, not law."`
  - `SurveyQuestionKind = z.enum(["enps","scale-5","yes-no"])`;
    `SurveyQuestion { id: ^q\d{1,2}$; text: 1..300; textAr?: 1..300;
    kind }`; `SurveyCreate { title: 1..120; questions:
    SurveyQuestion[] 1..20 (unique ids, at most one `enps`); audience:
    Audience; closesOn?: IsoDate }`; `SurveyUpdate` = partial of
    create (draft only).
  - `Survey { id; title; questions; audience: Audience | null; status:
    "draft" | "open" | "closed"; closesOn: IsoDate | null; openedAt:
    Timestamp | null; closedAt: Timestamp | null; invitedCount: int |
    null; responseCount: int | null; minGroupSize: int | null;
    myStatus: "responded" | "not-responded" | null; note: typeof
    ANONYMITY_NOTE }` (`audience`, `invitedCount`, `responseCount`
    null for roles other than owner and hr; `myStatus` null for
    members not invited).
  - `SurveyResponseCreate { answers: { questionId; value: int }[]
    1..20 }`; `SurveyReceipt { received: true; note: typeof
    ANONYMITY_NOTE }` (echoes nothing of the answers).
  - `EnpsSummary { promoters: int; passives: int; detractors: int;
    score: int -100..100 }`; `QuestionResult { questionId; kind; n:
    int; counts: { value: int; count: int }[]; mean: string | null;
    enps: EnpsSummary | null }`; `GroupResult { name: string;
    responseCount: int; mergedGroups: string[]; questions:
    QuestionResult[] }` (`mergedGroups` lists the team names folded
    into an "Other teams" row; empty otherwise); `SurveyResults {
    surveyId; minGroupSize: int; invitedCount: int; responseCount:
    int; responseRate: int 0..100; overall: QuestionResult[] | null;
    groups: GroupResult[]; hiddenGroupCount: int; notes: string[] }`
    (`notes` = `[ANONYMITY_NOTE, ENPS_NOTE]`).
  - Routes (eight): `listSurveys GET /v1/surveys` (all),
    `createSurvey POST /v1/surveys` (owner, hr; 201), `getSurvey GET
    /v1/surveys/{id}` (all), `updateSurvey PATCH /v1/surveys/{id}`
    (owner, hr), `openSurvey POST /v1/surveys/{id}/open` (owner, hr),
    `closeSurvey POST /v1/surveys/{id}/close` (owner, hr),
    `respondSurvey POST /v1/surveys/{id}/responses` (all; 201,
    `SurveyReceipt`), `getSurveyResults GET /v1/surveys/{id}/results`
    (owner, hr).
  - Error codes: `SURVEY_NOT_DRAFT` 409, `SURVEY_NOT_OPEN` 409,
    `SURVEY_NOT_CLOSED` 409, `ALREADY_RESPONDED` 409,
    `SURVEY_EMPTY_AUDIENCE` 422.
  - Final `TALENT_ROUTE_IDS` has 75 ids (5 + 10 + 9 + 10 + 4 + 9 + 14
    + 6 + 8); `routes-talent.test.ts` asserts `TALENT_ROUTES.length
    === 75`.
- Produces (api):
  - `survey-stats.ts`: `enpsSummary(values: number[]): EnpsSummary |
    null` (null when empty; promoters 9 to 10, passives 7 to 8,
    detractors 0 to 6; `score` = `(promoters - detractors) * 100 / n`
    rounded half away from zero in integer arithmetic);
    `questionResult(q: SurveyQuestion, values: number[]):
    QuestionResult` (counts per allowed value in ascending order:
    0..10, 1..5 or 0..1; `mean` via `meanOneDecimal` for `scale-5`
    only; `enps` for `enps` only).
  - `suppression.ts`: `suppressGroups(groups: { key: string; name:
    string; count: number }[], min: number): { shown: string[];
    other: string[] | null; hidden: string[] }` (keys). Algorithm:

    ```
    1. small = groups with count < min (count 0 groups are ignored);
       shown = groups with count >= min.
    2. small empty: other = null, hidden = [].
    3. other = small; while sum(other) < min and shown is not empty:
         move the shown group with the smallest count (ties: name,
         then key) from shown into other.
    4. sum(other) >= min: one "Other teams" row of all keys in other.
       Else: other = null and all of its keys are hidden.
    ```
    Every row then has at least `min` responses, and the rows add up
    to the total whenever the total is shown, so no hidden group can
    be rebuilt by subtraction.
  - Migration 1009: `surveys(id, company_id, title, questions jsonb,
    audience jsonb, status, closes_on, min_group_size, invited_count,
    created_by, created_at, opened_at, closed_at)`,
    `survey_invitees(company_id, survey_id, employee_id, primary
    key(survey_id, employee_id))` (the invited set, written at open),
    `survey_participation(company_id, survey_id, employee_id, primary
    key(survey_id, employee_id))` and `survey_responses(id,
    company_id, survey_id, group_key, answers jsonb)`: these two have
    no timestamp column and grant insert and select only; responses
    have no employee or user column.
  - Open: draft only (409 `SURVEY_NOT_DRAFT`); `invitedCount` = active
    employees linked to an active membership for whom `inAudience`
    holds (0: 422 `SURVEY_EMPTY_AUDIENCE`); those employees are written
    to `survey_invitees`; snapshot `min_group_size` from settings
    `surveyMinGroupSize`.
  - Respond: survey `open` and today not after `closesOn` (else 409
    `SURVEY_NOT_OPEN`); the caller needs an employee link (422
    `NO_EMPLOYEE_LINK`) and must be in `survey_invitees` (else 404;
    joiners after open are not invited); answers cover
    every question exactly once with an allowed value (else 422
    `ANSWER_INVALID`); in one transaction insert participation `ON
    CONFLICT DO NOTHING RETURNING` (no row: 409 `ALREADY_RESPONDED`),
    then the response with `group_key` = the employee's department id
    now, or `"none"`. No audit event and no log field beyond Plan 3's
    request line.
  - Close: `open` only; sets `closed`. Results: `closed` only (409
    `SURVEY_NOT_CLOSED`); `overall` null when `responseCount <
    minGroupSize`; groups named by department ("No department" for
    `none`), passed through `suppressGroups` with the snapshotted
    minimum; `responseRate` = responses * 100 / invited, rounded down.
  - Audit: `survey.created`, `survey.updated` (`changed`),
    `survey.opened` (`data: { invitedCount }`), `survey.closed`
    (`data: { responseCount }`), `survey.results.viewed`.
  - `seed.ts`: `seedCrowd(app, seeded, groups: { department: string;
    size: number }[]): Promise<{ departmentId: string; tokens:
    string[] }[]>` creates the departments and employees, invites and
    accepts a user for each, and returns their session tokens.

- [ ] **Step 1: Write the failing tests**

`survey-stats.test.ts`:
- `enps_examples`: 5 promoters, 3 passives, 2 detractors give score 30;
  1 promoter, 5 passives, 2 detractors (n 8) give -13; 2, 5, 1 give
  13; empty gives null.
- `scale_mean_and_counts`: `[3, 4, 4]` gives counts `[0, 0, 1, 2, 0]`
  and mean `"3.7"`.
- `suppression_blocks_subtraction` (Review Focus 1): groups A 10, B 8,
  C 2 with min 5: `shown ["A"]`, `other ["B","C"]` (in name order),
  `hidden []`; groups A 3, B 3: `other ["A","B"]`; group A 2 alone:
  `hidden ["A"]`.
- `suppression_property`: fast-check over 1 to 12 groups with counts 0
  to 30 and min 3 to 10: every shown group and the other row has at
  least `min`; either the shown and other counts add up to the total
  or the total is below `min` and nothing is shown.

`surveys.test.ts`:
- `survey_results_closed_only` (Review Focus 1): results of an open
  survey give 409 `SURVEY_NOT_CLOSED`; after close, 200.
- `survey_results_by_team`: `seedCrowd` with D1 4, D2 3, D3 1, min 3
  (owner sets it before open); the audience is the three crowd
  departments only; everyone in them responds; results: `overall`
  present with `responseCount` 8; groups D1 (4) and "Other teams" (4,
  `mergedGroups ["D2","D3"]`); no group has `responseCount` 1 or 3.
- `survey_small_survey_overall_hidden`: two responses from one
  department with min 3:
  `overall` null and `groups` empty, `hiddenGroupCount` 1.
- `survey_min_group_snapshot`: opened with min 5, then the setting is
  changed to 3; results report `minGroupSize` 5.
- `survey_response_row_has_no_identity`: the columns of
  `survey_responses` are exactly `id, company_id, survey_id,
  group_key, answers` and of `survey_participation` exactly
  `company_id, survey_id, employee_id`; the responses table text
  contains no employee id or user id; no audit event's action starts
  with `survey.respon`.
- `survey_double_response_once`: two responds with `Promise.all` give
  201 and 409 `ALREADY_RESPONDED`; one response row exists.
- `survey_not_invited_404` and `survey_owner_without_link_422`.
- `survey_joiner_after_open_404`: an employee added to an invited
  department after open gets 404 on respond; `responseRate` stays at
  most 100.
- `survey_answers_cover_all`: a missing question or an `enps` value of
  11 gives 422 `ANSWER_INVALID`.
- `survey_closes_on_passed`: responding the day after `closesOn`
  (Dubai date) gives 409 `SURVEY_NOT_OPEN`.
- `survey_manager_no_results`: the manager gets 403 on results and
  sees `audience: null`.
- `survey_receipt_echoes_nothing`: the 201 body has only `received`
  and `note`.

`talent-flow.test.ts`:
- `talent_flow_end_to_end`: hr creates a company objective and the
  employee a linked KPI with a goal check-in; hr runs a cycle (self,
  manager, three peers), calibrates with copied manager ratings and
  the owner closes it; the owner sets a bonus plan, hr generates, a
  second owner approves with MFA; hr pastes the pay input into an
  April pay run and marks it included; hr assigns "Fire safety", the
  employee completes it and the compliance row is `compliant`; the
  employee acknowledges a policy and their due list is empty; the
  manager posts kudos; hr runs a survey to close with
  `seedCrowd` respondents and reads results. Then `GET
  /v1/audit-events/verify` gives `ok: true` and no audit `data` text
  contains `"6666.01"`, `"CALIB-SENTINEL"`, `"PEER-SENTINEL"`, a kudos
  message or any survey answer.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test survey-stats
  surveys talent-flow`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above (pure modules first).
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Update `HANDOVER.md`** (state; the 14 features; an api
  layout row for `src/talent/`; limits: no web screens, no scheduler
  or notifications, survey anonymity note, bonus is a proposal only,
  self-reported training, no Arabic review of new strings) and
  **append to `LEDGER.md`** section 3 every ruling below with today's
  date.
- [ ] **Step 6: Commit** `feat(api): pulse surveys and eNPS, handover`.

---

## Rulings

Claude's calls under the owner's "decide, don't ask" instruction. Each
says what it costs if wrong. The executor appends them to `LEDGER.md`.

1. **API and contract only; no web screens.** Cost: the owner cannot
   click through these features until a web plan builds on
   `TALENT_ROUTES`.
2. **Migrations `1001_` to `1009_`, and the runner sorts by number.**
   As text, `1001_` sorts before `801_`, so Task 1 makes `migrate.ts`
   accept three or four digits and order numerically. Cost: one small
   change to Plan 3's runner; a plan using a five-digit range needs
   another.
3. **`ROUTE_GROUPS` composes `ROUTES`;** Plans 7 and 8's whole-list
   assertions become "`ROUTES` equals `ROUTE_GROUPS.flat()`" and each
   plan pins only its own id list (Plan 9 already asserts membership
   only). Cost: two test lines in other plans' files; a merge touch if
   those plans land later.
4. **Goals are Plan 8's, unchanged.** KPIs link to a goal from the KPI
   side and post check-ins through Plan 8's `addCheckIn`; `Goal` gains
   no field (Plan 8 Ruling 25 stands). Cost: a goal does not list its
   KPIs; the client queries `GET /v1/kpis?goalId=`.
5. **The policy library is Plan 7's.** This plan adds a version
   history route, an overview with due dates and a personal due list
   only. The due date is one company setting counted from the Dubai
   publication date. Cost: no per-document due dates; one setting for
   all policies.
6. **No AI and no computed rating of people.** Final ratings are typed
   at calibration (optionally copied from the manager's rating by an
   explicit choice); the distribution is shown, never enforced. Cost:
   no "suggested rating"; HR types every final rating.
7. **Rating scales: 2 to 10 levels with integer values 1 to 10,
   ascending; higher means better.** Cycles snapshot the scale at
   open, so later edits change nothing in a running cycle. Cost: a
   descending or non-numeric scale is not supported.
8. **360 peer feedback is confidential to owner and hr.** The subject
   and manager see counts and comments without authors, and only when
   at least `peerReviewMinCount` peers submitted (snapshotted at open;
   product default 3); comments are sorted by text. Cost: an hr user
   can see authors; small teams get no peer results shown.
9. **Results are released at close.** The subject sees the manager's
   review and the final rating only after the owner closes the cycle.
   Cost: no mid-cycle feedback through the product.
10. **Review answers and calibration reasons are encrypted with the
    company key; ratings are plain integers** so calibration can
    count them. Cost: ratings are readable to database operators.
11. **Bonus is a proposal from the company's plan, never pay.** Amount
    = recurring monthly `basic` x bps / 10000 with the plan's rounding;
    HR pastes the generated `PayRunEntry` fragment into a pay run, and
    "mark included" checks the payslip line. No pay code reads
    proposals (source-scan test). UQ10 (pay from evidence) is not
    claimed. Cost: HR enters the bonus twice (paste, then mark).
12. **The bonus SIF bucket is `otherAllowances`** (unsourced; no bank
    guide names bonuses). HR can change it in the pasted entry. Cost: a
    bank reading bonuses as another bucket needs a different entry.
13. **Bonus approval: owner, MFA, approver not the generator or
    editor** (mirrors pay-run approval). Cost: a one-owner company
    needs a second owner, as Plan 3 Ruling 10.
14. **Bonus eligibility is not modelled:** leavers before the pay
    period are skipped; joiners, notice periods and pro-rata are HR's
    edits. Cost: HR edits proposals by hand for those cases.
15. **Survey anonymity:** response rows carry no employee, user or
    time; participation is a separate table without time (needed to
    stop double answers); no audit per response; results only after
    close; the threshold is snapshotted at open; the label says it is
    anonymous inside the product, not against database access. Cost:
    no live results; a database operator could try to correlate
    storage order.
16. **No free text and every question required in surveys.** Required
    answers keep per-question counts equal to group counts, so
    question-level subtraction is impossible. Cost: no comments and
    no partial responses.
17. **Minimum group size: product default 5, floor 3; small teams are
    merged into "Other teams" until the row reaches the minimum.**
    Cost: small companies see few team rows.
18. **Survey results are owner and hr only; the team is the
    department at response time.** Cost: managers ask HR for their
    team's view; a person who moves team mid-survey counts where they
    were.
19. **eNPS uses the 9-10 / 0-6 convention, rounded half away from
    zero,** labelled "industry convention, not law". Cost: none known.
20. **Training "by role" means job title, department or named
    people,** not the four system roles. Cost: a company wanting
    "every manager-role user" adds those people by name until a
    `roles` field is added.
21. **Compliance counts self-reported completions; verification is
    shown beside it.** Cost: an employee can self-certify until HR
    verifies.
22. **Certifications are separate from Plan 7 employee documents;
    no evidence upload here.** Expiry is derived with
    `addMonthsClamped` (convention) from a company-entered validity.
    No legal certificate requirement is modelled (UQ29 is out). Cost:
    evidence files go in a Plan 7 "other" slot by hand.
23. **No scheduler or notifications:** overdue, due-soon and expiry are
    computed when read, on the Dubai date; no tasks are created. Cost:
    nobody is pushed; people must look.
24. **Colleague visibility widens on purpose:** every member sees
    `PersonRef` and the org chart projection of active employees, and
    the kudos feed is company-wide. Salary, bank and identity fields
    stay with Plan 3's `toEmployeeView`. Cost: a company wanting a
    private directory needs a setting later.
25. **Org chart cycles break at the smallest employee id, and
    `updateEmployee` refuses new cycles (`MANAGER_CYCLE`).** Cost: one
    behaviour change in Plan 3 code.
26. **Kudos have no points, money or reactions; hiding is a status;
    self-kudos are refused.** Cost: no reward catalogue.
27. **Skills use a company-chosen rating scale; self and confirmed
    levels are kept apart; succession readiness is typed by HR and
    the gap list only compares recorded levels.** Succession is owner
    and hr only. Cost: no skill inference from training or reviews.
28. **OKR progress is linear and clamped to 0 to 100; objective
    progress is the unweighted mean of active key results; KPI values
    are decimal strings scaled by 10^4.** Cost: no weights and no
    "maintain within a band" KPIs.
29. **Talent settings are one row per company with an optimistic
    version;** every default is labelled "product default, not law".
    Cost: none known.
30. **Functions consumed but not named by Plans 3, 7 and 8**
    (`loadPayRun`, `loadRunPayslip`, `listLibraryDocuments`,
    `visibleLibraryDocument`, `loadGoal`, `addCheckIn`) are exported
    from the named files with the signatures in the Prerequisite
    section. Cost: small refactors of those plans' code.
31. **Ruled out, each with its cost:** any AI (suggested ratings,
    sentiment, summaries); UQ10 pay from evidence and commissions;
    forced ranking; course content hosting, SCORM and paid enrolment;
    training bonds (UQ12, SR); sector licence packs (UQ29); the
    discipline ladder and policy-proposed settings (UQ28 rest);
    policy Q&A (UQ2); survey free text; push, email and WhatsApp
    reminders; Arabic native review of new strings; PDPL retention for
    reviews and surveys (UQ17). Cost: each is a visible gap in the
    handover.
32. **Review:** fresh per-task reviews after Task 6 (money) and Task 9
    (privacy), plus one whole-branch review (speed ruling); no pause
    for plan review (ledger, 2026-11-25). Cost: a slipped bug in Tasks
    1 to 5, 7 or 8 is caught at the end.
