# Project Ledger

The record of the owner's decisions, standing instructions and the future
plan. **Append only.** New entries go at the bottom of their section, dated.
When something changes, add a new entry saying what it replaces; never
rewrite history.

Section 1 and 2 are the owner's words (quoted or closely paraphrased).
Section 3 is Claude's calls: the owner can overrule any of them. Keeping
them apart is deliberate.

## 1. Owner decisions (the owner's words)

| Date | Decision |
|---|---|
| 2026-11-25 | "I wanna create an App for companies that is basically for HR and Payroll." Research the top competitors, then build something superior. |
| 2026-11-25 | "In UAE these are the ones": Yomly, HONO, Bayzat, GulfHR, ZenHR, NeuralHR.AI, StackHX, Zoho Payroll + Zoho People, Darwinbox, SAP. |
| 2026-11-25 | "Yea we target SME." |
| 2026-11-25 | "Yes you will build." The v2 design is approved as the basis. |
| 2026-11-25 | On the lawyer, bank contact and pilot customers: "I built a whole ERP earlier and I am selling it to a company now and didn't do any of the stuff you mentioned in point 2 or 3." They are not required before building. |
| 2026-11-25 | Before building: "I need the advisor to prove to me the list of features he will build, why they will make us superior technically, and how we will dominate the market." |
| 2026-11-25 | "We are doing HR and payroll. Not a full ERP." (also recorded in section 2) |
| 2026-11-25 | "What about Keka": Keka is added to the competitor set. |
| 2026-11-25 | "We won't exclude these except insurance": expense management, accounts payable and spend, corporate cards, project billing, task manager, intranet and chat are **in scope**; insurance stays out. Supersedes the HR-and-payroll-only fence. |
| 2026-11-25 | On the six uniqueness candidates: "You can add all those, but definitely not enough." The six are accepted into the plan; the owner wants more ideas. |
| 2026-11-25 | "Think of stuff related to KPIs, hiring, training, company guidelines, approvals flow, audit readiness, etc." More uniqueness ideas wanted in these areas and beyond. |
| 2026-11-25 | "Emails integrations, tasks list, scheduling, progress, budgeting, business trips and flight tickets and similar ideas and features to add." More ideas wanted in these areas. |
| 2026-11-25 | "All approved." The master feature list (`docs/superpowers/specs/2026-11-25-master-feature-list.md`) is approved as the gate; Plan 1 and the build proceed. |
| 2026-11-25 | After Plan 1: "Do both" (start Plan 2, the WPS salary file generator and validator, and lay out the pull request options). No pull request is opened without an explicit instruction. |
| 2026-11-25 | "I wanna add integration to social media pages with insights: Instagram, TikTok, Snapchat, X, LinkedIn." Added to scope; feasibility research in progress. |
| 2026-11-25 | "Also the website integration for the data insights." Added to scope next to social media insights; feasibility research in progress. |
| 2026-11-25 | "Documents generation and standard letters and attachments uploads and sharing between the company staff are needed. Also VAT formats for 5% and corporate tax templates." Added to scope; research in progress. |
| 2026-11-25 | "For VAT the reports that get uploaded to the FTA need to be ready. E-invoicing integration as well." Added to scope (UQ35); research in progress. |
| 2026-11-25 | "If LinkedIn is risky ignore it. But the rest it should be full integration." LinkedIn is excluded for now; Instagram, TikTok, Snapchat and X get full integrations. |
| 2026-11-25 | "I need a feature for meetings within the app itself. Video and audio with summarized meeting points and assigned list of tasks per staff." Added to scope (UQ37); feasibility research in progress. |
| 2026-11-25 | "Work from home would record screen time and location service." On screenshots and keystroke logging: "No, I don't want those 2." Both are out of scope, with no switch. "Location service will just record once every hour." |
| 2026-11-26 | UI brief (before designing the interface): "I am not looking for something standard. This has to look extremely advanced with motion graphics and animation, extremely smooth, easy user interface and navigation, looking super high tech, bright and dark mode switches, no long side bar menus, the flow of the functions need to be clear and doesn't confuse the staff. It shouldn't look like it was made with AI. I genuinely want clients to be amazed." Supersedes the standard shell in Plan 4. |
| 2026-11-26 | Autonomous mode: "I'm gonna leave you to work alone... keep the laptop on. Carry on in the parallel builds. Don't stop. For technical matters, you finalize them; you don't need my approval. For the design I have to approve: keep the mock-ups (concepts A, B and C) and I will check them when I wake up. For the features, don't stop building, build in parallel. I'm expecting in 6 or 7 hours you will be done with at least 40 or 50 extra features." |
| 2026-11-25 | Asked for the combined list of all competitors' features (`docs/superpowers/specs/2026-11-25-combined-feature-list.md`). |

## 2. Standing instructions (the owner's words)

| Date | Instruction |
|---|---|
| 2026-11-25 | "The advisor needs to lead the research and propose the plan." Nothing is built until the owner approves. |
| 2026-11-25 | "Always use agents in parallel in need." |
| 2026-11-25 | "Always check with the advisor before taking a decision." |
| 2026-11-25 | "I rely on you in the technical matters." |
| 2026-11-25 | "Use all relative skills needed." |
| 2026-11-25 | "The code built in an organized way, no long lines, it should be always easy to debug, and always the repo should be updated with a ready handover." (`docs/engineering-standards.md`, `HANDOVER.md`) |
| 2026-11-25 | "All my decisions and instructions and future plan goes to the ledger." |
| 2026-11-25 | "Let more agents work in parallel if possible." Run independent work in parallel; builders that edit the same repository still run one at a time, with reviews and research alongside. |
| 2026-11-25 | "Don't ask me technical stuff. Do what I write." Claude decides technical questions, records each as a ruling, and does not stop to ask. |
| 2026-11-26 | "You can run 10 agents at a time. I am fine with that." Up to 10 agents run concurrently; agents that edit code work in separate git worktrees or on separate files. |
| 2026-11-25 | Use Firecrawl by default for external data and research tasks when suitable. (Not saved to memory: no memory tool in this session.) |
| 2026-11-25 | "We are doing HR and payroll. Not a full ERP." Scope fence recorded in the advisor's proof. |

## 3. Claude's calls (the owner can overrule)

| Date | Call | Reason |
|---|---|---|
| 2026-11-26 | Supersedes the runner note in Plan 6 ruling 26: the migration runner accepts three- or four-digit numbers and sorts them numerically (001 to 013, 070 to 075, 601 to 605, 801 to 807, 901 to 908, 1301 to 1309). After main merged into Plan 13: a role step needs the role at decision time on WhatsApp too (`verdictFor`), a named chain approver must be a human member (never an API key's service user), and revoked memberships (Plan 8) get no notices, cannot act through WhatsApp and lose their calendar feeds. | Plan 13 merge; recorded in `plan-13-build-report.md`. |
| 2026-11-26 | Plan 13 rulings 1 to 36 adopted as written in `docs/superpowers/plans/2026-11-26-plan-13-channels.md`, with the changes in `plan-13-build-report.md` (stricter email-in sender check, no WhatsApp reply after a withdrawal, SSO invites never link an existing account, job-scan RLS policies for the cross-company functions, holidays and deadlines empty until Plans 9 and 11 merge). | Recorded by reference, as for Plan 3. |
| 2026-11-25 | Lawyer, bank and pilots become an optional verification track, not gates. | Follows the owner's decision above. |
| 2026-11-25 | Every statutory value in code carries a source URL and a status (`sourced` or `unsourced`); unsourced values have no default. | With no lawyer, checkable sources replace sign-off. |
| 2026-11-25 | Real customer payroll and any "verified compliant" claim wait until the rules are sourced. The owner decides when. | Wrong pay harms real employees. |
| 2026-11-25 | Files-only v1 (no salary payments), mainland UAE first, TypeScript and PostgreSQL. | See design doc sections 4 and 6. |
| 2026-11-25 | Develop on branch `claude/quirky-wozniak-b7xkvr`; no pull request unless asked. | Session branch rule. |
| 2026-11-25 | Advisor's uniqueness candidates: the six are now accepted by the owner (see section 1); they remain bets until each is demoed. | Owner asked what could make us unique. |
| 2026-11-25 | "Full integration" for the four platforms is read as: connect the account, pull insights, and publish or schedule where the platform API allows. Direct integrations, not an aggregator, unless an app review blocks one. The owner can narrow this. | Follows the owner's instruction. |
| 2026-11-25 | Remote-work tracking design: active time while clocked in, app and site categories (no page contents), location once an hour while clocked in, the employee sees their own data and can pause, notice before tracking starts, a retention limit, and a lawyer to confirm the consent wording. Location comes from the phone app by default (browser permission as fallback), with a visible indicator. | Research in `docs/research/2026-11-25-remote-work-tracking-feasibility.md`. |
| 2026-11-25 | Plan 2 scope: the SIF file format only. Pay amounts, creation date and time are inputs (no monthly pay run exists, the core has no clock). Resolution 340 dates and penalties stay out. The generator never claims "WPS compliant": it says the layout matches two bank guides and is unconfirmed by MOHRE. | Sources: `docs/research/2026-11-25-wps-sif-layout.md`. |
| 2026-11-25 | Plan execution stays subagent-driven with per-task review; no pause for plan review. | Owner: no technical questions. |
| 2026-11-26 | Speed ruling (owner: "we are moving extremely slow"): from Plan 3 on, tasks are bigger, per-task review is dropped for low-risk work in favour of one whole-branch review per plan, and independent plans are built in parallel in separate git worktrees. Names for the app are decided last and do not block building. | Keeps quality gates where risk is (money, law, security) and removes them where tests already cover it. Costs more rework if a bug slips past, caught by the final review. |
| 2026-11-25 | Superseded: the HR-and-payroll-only fence and the F17 expense cut are reversed. New order: core first, HR-adjacent next, finance modules last. | Cards and payments need licensed partners, so they come last and depend on partnerships. |
| 2026-11-25 | Correction: Zoho People includes leave management from its second plan and attendance from its third, at low per-user prices. The earlier "Zoho gates leave and attendance" differentiator is withdrawn. | Read from Zoho's own pricing page. |
| 2026-11-26 | Plan 3 rulings 1 to 25 (Hono, pglite for tests and `pg` in production, plain SQL behind a small `Db`, RLS on `app.company_id` via `withTenant`, `X-Company-Id`, opaque 8-hour sessions, scrypt and own TOTP, MFA at three actions, per-company AES-GCM keys, narrow separation of duties, entered pay components, settlement shown but not paid through WPS, calendar-day leave, fixed UTC+4, two-decimal money strings, hash-chained audit, no build step, generated OpenAPI, leave and attendance in M1, the deferred list, parallel build with Plan 4, review plan, pinned versions) are adopted as written in `docs/superpowers/plans/2026-11-26-plan-3-backend.md`, with the changes in section 10. | Plan 3 build. |
| 2026-11-26 | Supersedes Plan 3 ruling 13: the leaver's unpaid leave over service is an optional pay-run input (`serviceUnpaidLeaveDays`); when not entered the settlement passes 0 and says "unpaid leave over service (not entered)". | Web app request; the gratuity input is now enterable. |
| 2026-11-26 | Supersedes Plan 3 ruling 9 in part: the keyring derives separate HKDF subkeys for wrapping company keys and for global values, and cipher text names the master key (`v1.<keyId>.<data>`). KMS and rotation are still deferred. | Security review (M-5). |
| 2026-11-26 | Adds to Plan 3 rulings 2 and 4: production uses two database roles, a migration role that owns the tables and a runtime role (no superuser, no BYPASSRLS, owns nothing) granted `payroll_app WITH SET TRUE`; the server refuses to start otherwise. | Security review (I-2): PostgreSQL 16 role semantics and superuser bypass. |
| 2026-11-26 | Plan 9 rulings 1 to 34 (`docs/superpowers/plans/2026-11-26-plan-9-time-attendance.md`) are adopted as written, including work-from-home tracking exactly as the owner decided (no screenshots, no keystroke logging, location once an hour, categories only, own data and pause, consent after notice, retention with no default), with the API adaptations and decisions listed in `docs/superpowers/plans/plan-9-build-report.md`: a clock-out more than 24 hours after clock-in is refused (422 `CLOCK_OUT_TOO_LATE`) and such records never count as worked time; shift breaks must be shorter than the span; frozen timesheets feed pay inputs; the WFH settings column is `location_each_hour`. | Plan 9 API build. |
| 2026-11-26 | Supersedes Plan 3 ruling 8 in part: MFA enrolment and confirmation need the password, confirmation no longer upgrades the session, and other sessions are revoked; TOTP codes are single-use. | Security review (I-4) and coordinator instruction. |
| 2026-11-26 | Plan 8 Ruling 1: API and contract only; no web screens (Plan 4's web app builds against `HR_ROUTES` later). | Plan 8 build. |
| 2026-11-26 | Plan 8 Ruling 2: statutory values live in the engine pack `ae-employment` with `emp`-prefixed keys and five `DL33_ART*` source ids. | Plan 8 build. |
| 2026-11-26 | Plan 8 Ruling 3: `official` only where the research note quotes the value as READ (6 months, 14 days, one month, 30 to 90 days, reducible by agreement, job-search day, 14 days). | Plan 8 build. |
| 2026-11-26 | Plan 8 Ruling 4: exits without notice (Articles 44, 45) give zero notice as a `convention` with a counsel flag; no grounds are encoded. | Plan 8 build. |
| 2026-11-26 | Plan 8 Ruling 5: settlement due date is 14 days (`official`, Article 53) counted from the last working date (`convention`). | Plan 8 build. |
| 2026-11-26 | Plan 8 Ruling 6: notice counts from the day after written notice; last working day = notice date + notice days (`convention`). | Plan 8 build. |
| 2026-11-26 | Plan 8 Ruling 7: probation end = joining date plus months, clamped to month end, minus one day (`convention`). | Plan 8 build. |
| 2026-11-26 | Plan 8 Ruling 8: a contract notice outside 30 to 90 days is refused, not raised to 30. | Plan 8 build. |
| 2026-11-26 | Plan 8 Ruling 9: agreed notice reductions apply only to resignation and termination (43(2)); probation notices cannot be reduced. | Plan 8 build. |
| 2026-11-26 | Plan 8 Ruling 10: the exit kind never changes the settlement (resignation rules NOT FOUND in Decree-Law 33 of 2021). | Plan 8 build. |
| 2026-11-26 | Plan 8 Ruling 11: the engine's `notComputed` list is shown verbatim; loans, tickets, bonds, claims, cards and deductions are flag-only and never deducted. | Plan 8 build. |
| 2026-11-26 | Plan 8 Ruling 12: unused leave days and unpaid service days are HR-entered at settlement time. | Plan 8 build. |
| 2026-11-26 | Plan 8 Ruling 13: the exit settlement is a pure API function that calls the engine, cross-checked against Plan 3's payslip settlement. | Plan 8 build. |
| 2026-11-26 | Plan 8 Ruling 14: no scheduler; reminders and deadlines are dated tasks, overdue is computed on read (Dubai date), changed terms cancel and recreate reminders with a comment. | Plan 8 build. |
| 2026-11-26 | Plan 8 Ruling 15: one shared approval rule (`assertDecidable`: role, pending status, separation of duties); no generic approvals table yet. | Plan 8 build. |
| 2026-11-26 | Plan 8 Ruling 16: MFA on offer approval and access revocation only. | Plan 8 build. |
| 2026-11-26 | Plan 8 Ruling 17: interview scheduling is a `CalendarPort`, default "not connected"; interviews are stored locally. | Plan 8 build. |
| 2026-11-26 | Plan 8 Ruling 18: document generation is a `DocumentPort`, default "not configured", given ids only. | Plan 8 build. |
| 2026-11-26 | Plan 8 Ruling 19: access revocation = in-app membership revoke plus an external port; sessions are kept for other companies; the last owner cannot be revoked; a new invite restores access. | Plan 8 build. |
| 2026-11-26 | Plan 8 Ruling 20: ports run inside the handler's transaction; a throwing port is recorded as failed and never rolls back. | Plan 8 build. |
| 2026-11-26 | Plan 8 Ruling 21: hire idempotency by a claim row (`offer_hires`, `ON CONFLICT DO NOTHING`) before the employee is created. | Plan 8 build. |
| 2026-11-26 | Plan 8 Ruling 22: candidates have no login; HR records offer responses; no e-signature. | Plan 8 build. |
| 2026-11-26 | Plan 8 Ruling 23: one template per kind per company, versioned; defaults labelled "product default, not law"; the visa cancellation task has no due rule. | Plan 8 build. |
| 2026-11-26 | Plan 8 Ruling 24: only the system links tasks to flows; nothing is deleted (items removed, tasks cancelled, comments append only). | Plan 8 build. |
| 2026-11-26 | Plan 8 Ruling 25: goals are simple records: no ratings, no pay links, no AI. | Plan 8 build. |
| 2026-11-26 | Plan 8 Ruling 26: employment trace ids are not added to the explain catalog; raw trace lines with rule status are returned. | Plan 8 build. |
| 2026-11-26 | Plan 8 Ruling 27: Plan 8 audit action names avoid a hyphen in the first segment (`template.updated`, `terms.updated`). | Plan 8 build. |
| 2026-11-26 | Plan 8 Ruling 28: Plan 8 migrations use the range 801 to 807. | Plan 8 build. |
| 2026-11-26 | Plan 8 Ruling 29: Plan 3 functions consumed but not named there are exported with the planned signatures (built as `src/people/employee-actions.ts`; Plan 3's salary check is `checkSalary`). | Plan 8 build. |
| 2026-11-26 | Plan 8 Ruling 30: employees may resign (and give the probation notices that are theirs) for themselves; managers cannot open exits; interviewers must be owner, hr or manager. | Plan 8 build. |
| 2026-11-26 | Plan 8 Ruling 31: product bounds (headcount 1 to 50, criteria 1 to 10, offsets -60 to 365, interviewers 1 to 5) are product choices, not law. | Plan 8 build. |
| 2026-11-26 | Plan 8 Ruling 32: ruled out, each a visible gap in the handover: cost-of-hire and hiring-plan cost, referral and agency ledger, permit/MOHRE/WPS setup deadlines, labour card and visa cancellation deadlines, ticket/loan/bond/card balances, exit interview forms, candidate data retention (PDPL), job posts and careers page, resume parsing and AI screening, email-in resignations, notice during leave, job-search day tracking, the probation-once check, part-time workers. | Plan 8 build. |
| 2026-11-26 | Plan 8 Ruling 33: per-task review of Tasks 1, 6 and 7 plus one whole-branch review; no pause for plan review. | Plan 8 build. |
| 2026-11-26 | Plan 8 build calls (builder's decisions; full list in `docs/superpowers/plans/plan-8-build-report.md`): joiners before 2022-02-02 get zero-month terms only; terms check the contract notice on the later of joining date and today; revoking access closes the leaver's unused invites; audit keys for Plan 8 are a separate allowlist file spread into Plan 3's; list responses are `{ items }`. | Plan 8 build. |
| 2026-11-26 | Plan 6 ruling 1 (UNSOURCED, flagged): reimbursements are paid with payroll but outside the SIF; the SIF carries salary only, the payslip `net` includes reimbursements, and payslips, runs and the payouts report show `REIMBURSEMENT_WPS_NOTE`. | No source says whether expense repayments must go through WPS; one change in `buildSifBatch` if they must. |
| 2026-11-26 | Plan 6 ruling 2: "non-taxable" means "not wage": never in gross, the deduction cap base, GPSSA or gratuity (property-tested). | No personal income tax rule in our packs. |
| 2026-11-26 | Plan 6 ruling 3: reimbursement is added to the API payslip after the salary computation, not inside the engine. | Keeps the engine invariant `net = gross - deductions` and its SIF adapter intact. |
| 2026-11-26 | Plan 6 ruling 4: VAT is captured only (VAT-inclusive amount, VAT, supplier name and TRN); the only check is VAT <= amount; `vatRecoverability` is fixed at `not-assessed` (unsourced) with `VAT_STATEMENT` on every claim and VAT report. | FTA Decision 17 of 2026 is known from secondary summaries only. |
| 2026-11-26 | Plan 6 ruling 5: TRN format `^\d{15}$` is a convention, not a sourced rule; no checksum. | One regex to change. |
| 2026-11-26 | Plan 6 ruling 6: AED only; original currency and amount are information fields flagged `FOREIGN_CURRENCY`; no exchange rate. | Claimants convert by hand. |
| 2026-11-26 | Plan 6 ruling 7: mileage and per diem rates are dated company policy values with no default; whole kilometres and whole days; the applied rate is stored on the item. | No statutory private-sector rate was read. |
| 2026-11-26 | Plan 6 ruling 8: per-role limits key on the four app roles, with a `role: null` default row. | One lookup to change if the owner meant grade or department. |
| 2026-11-26 | Plan 6 ruling 9: limits are checked at submit only, against submitted, approved and reimbursed claims; `block` refuses, `flag` needs a justification and adds the over-limit approver. | A policy tightened after submit does not re-check open claims. |
| 2026-11-26 | Plan 6 ruling 10: approval spine scope (UQ18): generic chains per subject type, amount tiers, line-manager, role and named-user approvers, fallback hr then owner, maker-checker, distinct approvers, over-limit escalation, optimistic step numbers, inbox and aging. Delegation, leave-aware rerouting, risk signals, SLA alerts, moving leave and pay runs onto the spine and WhatsApp approvals are deferred. | Leave and pay runs keep Plan 3's checks for now. |
| 2026-11-26 | Plan 6 ruling 11: eligibility is fixed at submit; a claim whose last approver leaves is cancelled and resubmitted. | Occasional resubmission. |
| 2026-11-26 | Plan 6 ruling 12: a one-person company cannot approve its own claims (`NO_ELIGIBLE_APPROVER`). | As Plan 3 ruling 10 for pay runs. |
| 2026-11-26 | Plan 6 ruling 13: expense approvals need no MFA; changing a chain needs owner and MFA. | Who approves money is a sensitive setting (G10). |
| 2026-11-26 | Plan 6 ruling 14: no partial approval; the approver returns the claim instead. | One more round trip. |
| 2026-11-26 | Plan 6 ruling 15: claim amounts are stored in clear (bigint fils) so reports sum in SQL; payslip bodies stay sealed; receipt files are encrypted. | A database reader sees expense amounts, not salaries. |
| 2026-11-26 | Plan 6 ruling 16: draft edits are revisions, not deletes (no delete grant). | A few spare rows. |
| 2026-11-26 | Plan 6 ruling 17: receipts are JPEG, PNG or PDF, sniffed from bytes, at most 5 MiB, sent as base64 JSON under a 7.5 MB body limit, always downloaded as an attachment under a generated name; HEIC is refused. | iPhone photos are converted in the client. |
| 2026-11-26 | Plan 6 ruling 18: storage is a `BlobStore` port: memory in tests, local disk (`RECEIPTS_DIR`) in development, object storage later. | Multi-server needs the object-storage adapter first. |
| 2026-11-26 | Plan 6 ruling 19: OCR is an interface only (`ReceiptReader`, null by default); output is schema-checked, stored as a suggestion and never applied. | Claimants type every field until a reader is chosen. |
| 2026-11-26 | Plan 6 ruling 20: duplicates are flagged, never blocked (`POSSIBLE_DUPLICATE`, `DUPLICATE_RECEIPT`). | An approver can still approve a real duplicate after seeing the flag. |
| 2026-11-26 | Plan 6 ruling 21: approved, unlinked claims of in-scope employees join the next run created; HR can exclude claims per run; void releases them; approval marks them reimbursed; submitted claims are counted as a warning, never a block. | A claim approved just after a run waits a month unless the draft is voided and recreated. |
| 2026-11-26 | Plan 6 ruling 22: a leaver's claim approved after the final run waits as `approved` and shows as `employee-left` in the unpaid report; it is not added to the settlement. | HR pays it by hand. |
| 2026-11-26 | Plan 6 ruling 23: reports are owner and hr only; CSV has a statement line first and a BOM, and formula-like cells are written as text. | Managers cannot export team spend. |
| 2026-11-26 | Plan 6 ruling 24: audit data holds counts, codes and ids, never amounts, VAT, TRNs or supplier names. | Auditors read amounts from the claim. |
| 2026-11-26 | Plan 6 ruling 25: backend only; expense and approval screens are a Plan 4 follow-up; the web mocks carry the no-claim payslip and pay-run values. | No user-facing expenses until then. |
| 2026-11-26 | Plan 6 ruling 26: migrations are numbered 601 to 604 (Plan 3 already used 007 and 008; Plans 8 and 9 use 801 and 901 blocks); the runner's three-digit lexical order is unchanged. | Supersedes the plan's 007 to 010. |
| 2026-11-26 | Plan 6 ruling 27: no cards, no payments, no bank payment files; the payouts report is a list for HR. | Licensed partners first (ledger 2026-11-25). |
| 2026-11-26 | Plan 6 ruling 28: per-task security review for Tasks 2, 3 and 6, one whole-branch review at the end; built in one worktree, in order. | A slip in Tasks 1, 4, 5 or 7 is caught by the final review. |
| 2026-11-26 | Plan 6 build: adaptations to the plan (route count 75, list envelopes, extra files, visibility before step checks, first tier at 0.00, run columns, snapshot rebuild from linked claims, Opus commit trailer) are listed in `docs/superpowers/plans/plan-6-build-report.md`. | Plan 6 build. |
| 2026-11-26 | Supersedes the 2026-11-26 row on Plan 3 ruling 13 above: a leaver's `serviceUnpaidLeaveDays` is required like `unusedLeaveDays`; a missing value is refused with `SETTLEMENT_INPUT_REQUIRED`, never treated as 0 (current plan text, rule 5 and Ruling 13; money review I-1). | Assuming 0 overstated the gratuity (200 unpaid days: 22,986.30 shown instead of 20,794.52). |
| 2026-11-26 | Plan 7 rulings 1 to 29 (Chrome PDF behind a renderer port with DejaVu Sans embedded; files in Plan 6's blob store with RLS metadata; two-step base64 upload; PDF, PNG and JPEG by magic bytes up to 10 MiB; no virus scan yet; no external share links; expiry alerts computed on read with 60, 30 and 7 day convention defaults; one slot per statutory document type; managers see type, expiry and verified state only; employees upload their own, unverified; retention settings and a due list with no default and no deletion; library receipts per version, audience at report time, leavers drop out; an acknowledgement is a receipt, never a signature; letter roles; one language per letter; the Arabic gate per template version; starter letters state no law; immutable template versions, letters pin the version and keep the PDF hash and encrypted merge values; Emiratisation pack values only as `secondary`, `convention` or `unsourced`; the 2026 fine unsourced; counting flags and sector entered by HR; migrations 070 to 079 and `DOCUMENT_ROUTES`; first audit segment without a hyphen; no MFA step-up for letters; no web screens; items pulled forward; review per Tasks 2, 3 and 7; pinned dependencies; preview as base64 JSON) are adopted as written in `docs/superpowers/plans/2026-11-26-plan-7-documents.md`, with the adaptations in `docs/superpowers/plans/plan-7-build-report.md`. | Plan 7 build. |
| 2026-11-26 | Adds to Plan 7 ruling 1: Chrome also runs behind a dead proxy (`--proxy-server=127.0.0.1:9`, loopback included), because a test showed an iframe navigation escaping request interception; and every render uses a fresh isolated browser context. | Plan 7 Task 7 test. |
| 2026-11-26 | Adds to Plan 7 ruling 14: an issuer sees a letter they issued only while it uses no salary field or they are still owner or hr; salary values are gathered only for owner and hr, whatever the template says. | Plan 7 Task 7 access review. |

## 4. Future plan (current)

Each item gets its own plan under `docs/superpowers/plans/`.

1. Plan 1: payroll engine: **done** (built, reviewed, fix wave applied).
   Money type, gratuity and settlement with trace, rule-change preview,
   English and Arabic explanation, case library, demo command.
2. Plan 2: WPS (SIF) generator and validator: **done** (built task by
   task, tasks 1 to 5 each reviewed, task 6 not; whole-branch review and
   one fix round done, 2026-11-26). Layout from two bank guides that
   agree; unconfirmed by MOHRE. Generator, validator, routing codes,
   report, demo commands `pnpm sif` and `pnpm sif:check`.
3. Plan 3: data model, API, tenancy and security baseline.
4. Plan 4: web app (Arabic and English).
5. Later: M2 and M3 items; then adjacent modules (expenses, tasks,
   intranet and chat), then finance modules (accounts payable, spend,
   cards, project billing) which need licensed partners.
6. The master feature list (`docs/superpowers/specs/2026-11-25-master-feature-list.md`, 31 unique items) is the gate to Plan 1; approved by the owner.
7. 2026-11-26: Plan 3 (data model, API, tenancy, security baseline) is
   built on a worktree branch, Tasks 1 to 8, with the security review's
   fixes; not yet merged or pushed. Plan 4 builds against
   `packages/contract`.

## 5. Open items

- Owner has not yet reviewed the advisor's proof
  (`docs/superpowers/specs/2026-11-25-advisor-proof.md`); no code until then.
- Primary text of Ministerial Resolution 340 of 2026 not read (only
  summaries: `docs/research/2026-11-25-wps-resolution-340.md`).
- Research notes added: labour law, GPSSA and Emiratisation, UAE spend and AP
  specialists (all snippet-level, in `docs/research/`).
- Unsourced statutory values: overtime premiums, leave pay beyond sick
  leave, GPSSA rates, deduction caps, proration divisor.
- SIF layout: sourced from two bank guides (DIB, Emirates Islamic); the central bank's own spec is still unread. See `docs/research/2026-11-25-wps-sif-layout.md`.
- Bayzat and ZenHR pricing: quote-only or not published.

## 6. Rulings made during the Plan 1 build (Claude's calls)

The owner can overrule any of these. Source: the build ledger.

- Ruling 1 (pre-flight): the line-length check skips `node_modules`, `dist`,
  `.superpowers` and lockfiles, because the 80-character rule is for our own
  files. Costs nothing if wrong.
- Ruling 2 (pre-flight): `module: ESNext`, `moduleResolution: Bundler` and
  relative imports without file extensions, to keep the code short. Costs one
  config change if the runtime disagrees.
- Ruling 3 (pre-flight): the gratuity calculation always emits the
  `service.days` and `service.years` trace lines and the `gratuity.*` lines
  only when the worker is eligible, so the explanation catalog covers every
  id that can appear. Costs a small catalog change if wrong.
- Ruling 4 (pre-flight): the root `demo` script was added in Task 10, not
  Task 1, because `cli.ts` did not exist before. Costs nothing.
- Task 5: Ruling: the gratuity pack applies to lastWorkingDate on or after 2022-02-02 (Decree-Law 33 of 2021 in force); earlier leavers fall under the old law, which is not modelled, so NO_PACK_FOR_DATE is the correct refusal — the brief's 1990 to 2019 cap case was a plan defect; the cap test runs inside the pack range (1994-01-01 to 2023-12-31) — if wrong, add an old-law pack later. Open question for counsel: service accrued before 2 Feb 2022 for people leaving after it.
- Task 5: Ruling: gcc-national with an override still throws UNSUPPORTED_WORKER_CLASS (safer than quietly using the expat formula); a badly typed override throws INVALID_PARAM (closes the Task 3 minor); select.ts now shares date checks from dates.ts — review must cover the select.ts change.
- Task 10: Ruling: src/sample-schema.ts (a second zod file) is accepted as part of the I/O shell, because the controller allowed it in the dispatch; the plan's "zod only in cases/schema.ts" is read as "zod only in shell files" — costs one file move if the owner wants it strict.
- Final review: READY AFTER FIXES; one fix wave (commits bc20961 to d333f36) addressed 9 findings; a scoped re-review followed.

## 7. Residual notes after the final re-review (fix later)

- The purity test misses an aliased global (`const c = console; c.log(1)`).
- `nationalsExcluded` cites the law text; the u.ae end-of-service page that
  states the rule was fetched and is the better source id.
- Which status ranks weaker (secondary or convention) decides whether the
  one-year and seven-year cases are "secondary" or "convention"; settle it with
  counsel or a stated rule.
- The not-eligible line lists only the one-year minimum, although the end-date
  and leap-day conventions also decide the boundary.
- Package exports point at `.ts` files: fine under tsx, vitest or a bundler,
  not plain Node; revisit when Plan 2 picks a runtime.
- `NO_PACK_FOR_DATE` does not yet say that leavers before 2022-02-02 are not
  modelled; Arabic status words are joined with "," instead of "،".
- All Arabic text needs a native speaker's review before any employee sees it.

## 8. Plan 2 sourcing notes (2026-11-25)

- CBUAE guide V2018-001 read: no EDR/EVP/SCR tables; confirms 14-digit
  person id, 9-digit routing code, one month and one employer per file.
  V2015-01 (section 7.6.2) not found. Resolutions 340/2026 and 598/2022
  PDFs unreadable through the proxy; a human download is the next step.
- u.ae wages page (updated 14 Oct 2026): 85% paid on time; currency may be
  non-AED if the contract says so, which conflicts with the 2018 guide
  (AED only). The SIF generator keeps AED only (parameter) until sourced.

## 9. Rulings made during the Plan 2 build (Claude's calls)

The owner can overrule any of these. Source: the Plan 2 build ledger and
task reports (2026-11-25 to 2026-11-26). The product name is still
undecided.

- Task 1: the layout is data only (`layout.ts`) with its source (DIB and
  Emirates Islamic guides) and status `secondary`. The package has a pure
  barrel. Costs one file if a third source disagrees.
- Task 2: every written field must be printable ASCII without commas
  (`FIELD_NOT_ASCII`, `FIELD_HAS_COMMA`); days and counts are whole
  numbers of 0 or more (`INVALID_COUNT`). A missing SCR reference is
  written as an empty last field. Only the reference has a length cap
  (35, `layout.referenceMaxLength`, used by the generator and the
  validator alike since the final fix round).
- Task 3: an EVP given while variable pay is zero is refused
  (`EVP_WITHOUT_VARIABLE`): inconsistent input is an error. Extra codes
  `EVP_MISMATCH` and `INVALID_TIME`. Person ids are compared without
  leading zeros. The file name year is the year mod 100.
- Task 4: ids must be digits and exactly 14 (person) or 13 (employer)
  long, as the generator writes them; the DIB guide allows 14 to 35 and
  13 to 35. Extra codes `AMOUNT_FORMAT`, `COUNT_FORMAT`, `CURRENCY` and
  `PAY_START_TOO_EARLY`, because no planned code fitted.
- Task 4: an account of the right length that fails the IBAN mod 97
  check gives an `IBAN_CHECKSUM` warning, not an error. The DIB sample's
  own account fails it.
- Task 4: one root cause gives one finding (for example no total check
  when an EDR cannot be read). Only the last line counts as the SCR. A
  bad `today` is a caller error (`INVALID_DATE`), not a file finding. An
  EVP under a zero-variable EDR is not a validator error.
- Task 4: the Emirates Islamic test sample is reconstructed from the
  guide's description; the guide text is not in the repo.
- Task 5: the routing code table holds six banks from the research note
  (partial, old, `secondary`). `ROUTING_UNKNOWN` is a warning, once per
  code, not on EVP lines. `FIELD_TOO_LONG` for an SCR reference over 35.
- Task 5: the report echoes file values quoted, with control and
  non-ASCII characters as "?", cut at 40 characters. After an unknown
  record type, count and total mismatches are reported only when the SCR
  is smaller than what was read.
- Task 6: `sif:check` always passes a `today`: `--today`, else the
  Dubai calendar date read by the shell, never the core. `sif` checks
  the file it made the same way and writes nothing on any error. Output
  goes to `/out/` by default, which git ignores. (Corrected in the final
  fix round: the clock was first the host's local date, and `sif` had no
  `--today`. A UTC host would have refused a Dubai-dated batch as a
  future date from 00:00 to 04:00 Dubai time, not late in the Dubai
  day.) Task 6 had no task review (speed ruling); the whole-branch
  review covered it.
- Task 6: batch amounts are strings read by the engine's `parseAed`, so
  "4000" and "4000.5" are accepted as well as "4000.00". zod stays in
  shell files (`batch-schema.ts`); a bad field is named by its path, such
  as `employees.0.edr.fixed`, under `INVALID_BATCH_FILE`.
- Task 6: the purity scanner (`tests/purity.test.ts`) was rewritten in
  the final fix round as one tokenising pass. It removes line and
  multi-line block comments, and empties "..." and '...' strings,
  template literals (their `${}` code is still scanned) and regex
  literals, so words in messages are not code and a quote in a regex or
  a comment marker in a string cannot hide code. It reads import
  strings (single, double or backtick quotes, and `import(`). It bans
  `Date`, `Intl`, `performance`, `Temporal`, timers, `crypto`,
  `globalThis`/`global`, `process`, `console`, `Math.random`, `fetch(`,
  `require(` and dynamic `import(` in the core. It does not catch: a
  regex-versus-division guess that is wrong (it uses the previous
  token), a global reached through an alias (`const g = self`) or
  computed string (`globalThis[k]` is caught by the name, `self` and
  `window` are not banned), or code outside `src/`.

Rulings made in the Plan 2 final fix round (2026-11-26). The owner can
overrule any of these.

- Ruling: the generator throws `EVP_REQUIRED` when variable pay is above
  zero and no EVP is given. Why: the Emirates Islamic guide says the EVP
  is mandatory when variable pay is given. Cost if wrong: a batch with
  variable pay and no breakdown is refused; relax one check in
  `generate.ts`. The validator still gives `EVP_MISSING` as a warning for
  third-party files.
- Ruling: a period must have days of 1 or more: pay end on or after pay
  start (`PAY_END_BEFORE_START`, generator and validator). Why: the DIB
  guide has the end after the start; days 0 with a reversed period
  passed both checks before. Cost if wrong: a one-off zero-day line is
  refused; relax one check in each place.
- Ruling: `generate` takes `--today YYYY-MM-DD` like `check`. Without
  it the shell uses the Asia/Dubai calendar date
  (`toLocaleDateString('en-CA', { timeZone: 'Asia/Dubai' })`, in
  `shell.ts` only). Why: a UTC host judged a Dubai-dated batch as a
  future date from 00:00 to 04:00 Dubai time. Cost if wrong: none for
  UAE use; a future non-UAE market needs a time zone setting.
- Ruling: the purity scanner is one tokenising pass (see the Task 6
  scanner bullet). Why: the old two-step stripping could be bypassed.
  Cost if wrong: a rare false alarm in the core, fixed in the test.
- Ruling: the SCR EDR count stays unpadded (`1`). Why: the two guides
  disagree (DIB sample `01`, Emirates Islamic sample `1`) and the field
  is numeric; the validator accepts both. Cost if wrong: a bank that
  wants `01` rejects the file; add a layout parameter and pad. The first
  bank test upload should confirm it.
- Ruling: the reference cap is only `layout.referenceMaxLength`
  (`REFERENCE_MAX` deleted). Why: one source of truth. Cost if wrong:
  none; a smaller cap in a layout now also stops the generator.
- Ruling: `ROUTING_UNKNOWN` is deduplicated per code per file. When an
  EDR and the SCR share an unknown code, only the first (the EDR) gets
  the warning. Why: the warning is about the code, and the first line
  names it. Cost if wrong: the SCR line shows no warning of its own;
  pinned by a test, change both together.

## 10. Rulings made during the Plan 5 build (Claude's calls)

The owner can overrule any of these. Dated 2026-11-26. Rulings 1 to 22
are the plan's (`docs/superpowers/plans/2026-11-26-plan-5-monthly-payroll.md`,
section "Rulings", with the cost of each if wrong); B1 to B6 were made
while building (`docs/superpowers/plans/plan-5-build-report.md`).

- Ruling 1: two packs with keys unique across both, `ae-payroll` (from
  2022-02-02) and `ae-gpssa` (from 2023-10-31), selected on the month's
  first day: first payroll month March 2022, first for nationals
  November 2023.
- Ruling 2: one source id per article (`DL33_ART19` and so on), not a
  new `article` field on `RuleSource`.
- Ruling 3: calendar-day proration (`convention`), rounded HALF_UP once
  per line.
- Ruling 4: sick and maternity pay reduce earnings, not deductions, so
  they do not use the 50% cap; "full pay" is read as the wage.
- Ruling 5: the sick-leave year and the days already used are inputs;
  probation sick days are unpaid and do not use up the 90.
- Ruling 6: leave beyond the law (sick over 90, maternity over 105) is
  unpaid and flagged, never refused.
- Ruling 7: overtime hourly rate = contractual basic / 30 / the
  contract's daily hours (at most 8); minutes, not hours.
- Ruling 8: the 2-hour daily overtime cap flags and never cuts pay; the
  144-hour three-week limit is cited but not checked.
- Ruling 9: rest-day and holiday work pays an extra day's wage plus 50%
  of basic; "premium only" is a supported override; shift workers get
  25% at night; days off in lieu pay 0.
- Ruling 10: the GPSSA regime (`dl57-2023` or `law7-1999`) is an input,
  never inferred.
- Ruling 11: the GPSSA contribution salary base is unsourced: every UAE
  national's payslip throws `UNSOURCED_PARAM` until the caller passes
  `gpssaContributionSalaryBase`, and then flags `OVERRIDE_USED`.
- Ruling 12: GPSSA is not prorated (DL57 Art 11(3)); Law 7 skips a
  partial last month; the salary is fixed in January or the joining
  month and passed in, and a wrong month is refused; unpaid leave does
  not reduce it.
- Ruling 13: GCC nationals are refused, as in the gratuity.
- Ruling 14: the deduction cap base is the earned wage (basic and
  allowances after proration); "five days' wage" uses the contractual
  wage / 30; caps round DOWN.
- Ruling 15: violation cap conflict (Art 25(1)(f) 5% against Art
  39(1)(c) five days): the stricter is used and flagged.
- Ruling 16: when the 50% cap binds the order is GPSSA, court debt,
  overpayment, violation, damage, scheme, loan (a param); remainders are
  deferred and reported.
- Ruling 17: the GPSSA employee share counts towards the 50% cap and can
  be deferred; the caller resubmits it as `GpssaInput.arrears`.
- Ruling 18: loans need written consent; "scheme" (Art 25(1)(d) and
  (e)) always needs consent; no interest is computed.
- Ruling 19: WPS split: fixed = earned basic, variable = everything
  else itemised in the EVP; deductions come off fixed first, then other
  allowances, overtime, encashment, passage, medical, conveyance,
  housing; the adapter lives in `packages/wps`.
- Ruling 20: exit leave pay belongs to `calculateSettlement`; the
  payslip refuses encashment in a leaving month (`ENCASHMENT_AT_EXIT`).
- Ruling 21: ILOE and the WPS 85% test are not computed and are listed
  on every payslip; no demo command in Plan 5.
- Ruling 22: Law 7 rates and the 2.5% government support are `official`
  (read in the official site's English text; amendments unread).
- Ruling B1: `calculatePayslip` checks the period (`INVALID_PERIOD`)
  before it selects a pack, so month 13 is reported as a bad period and
  not as `selectPack`'s `INVALID_DATE`. Cost if wrong: none.
- Ruling B2: overtime and rest-day work may share a date (extra hours on
  a worked rest day); only a date listed twice in one list, or work on
  an absence date, is refused. Cost if wrong: one more check.
- Ruling B3: a deferred remainder is `kind-cap` when the kind cap left
  was not more than the overall cap left, else `overall-cap`. Cost if
  wrong: a label only; amounts do not change.
- Ruling B4: the `ded.scheme` message says "savings or welfare scheme"
  instead of the plan's "approved scheme", to keep approval words out of
  product text. Cost if wrong: one string.
- Ruling B5: override keys that no pack uses are ignored, as in the
  gratuity (no new error code). Cost if wrong: a typo in an override
  name is silently unused; `OVERRIDE_USED` lists only keys used.
- Ruling B6: `deductionOrder` is loaded as text and parsed by
  `applyDeductions`, which refuses anything but the seven kinds once
  each (`INVALID_PARAM`). Cost if wrong: none.
- Review fixes (2026-11-26, after the whole-branch review, READY AFTER
  FIXES). Ruling B5 is replaced by B7.
- Ruling B7: overrides are recorded when params load, so
  `OVERRIDE_USED` lists every overridden key read, traced or not. An
  override key that no payroll or GPSSA pack defines is refused
  (`UNKNOWN_OVERRIDE`); a known key this payslip did not read is shown
  in an `OVERRIDE_UNUSED` flag. Cost if wrong: a caller that sends extra
  keys must drop them.
- Ruling B8: the GPSSA employee share has its own trace line
  (`gpssa.employee-share`); `ded.gpssa` shows the share and the arrears
  as inputs; the pension lines carry the salary-base rule, and
  explanations show any overridden rule as "overridden". Cost: none.
- Ruling B9: in a leaving month a deferred remainder raises
  `DEDUCTION_DUE_AT_EXIT` ("must be settled at exit in the final
  settlement, which this engine does not compute") instead of
  `DEDUCTION_DEFERRED`. Whether the 50% cap applies at final settlement
  is not found. Cost if wrong: wording only.
- Ruling B10: the employer GPSSA share is rounded once: payable =
  round(salary x (employer rate - support rate)), support = gross -
  payable. Salary 300,100 fils gives gross 45,015, payable 37,513 and
  support 7,502 (before: 37,512 and 7,503). Cost if GPSSA invoices round
  the support instead: 1 fils a month on some salaries.
- Ruling B11: night overtime minutes above the night window (360 for
  22:00-04:00) on one date are refused (`INVALID_MINUTES`), not
  clamped, so nothing is silently changed. Cost if wrong: an input
  error for a night that spans two dates; the caller splits it.
- Ruling B12 (review M13): the government's "(2.5%) of its share" (DL57
  Art 4(1)(b), L7 Art 2(2)) is read as 2.5 percentage points of the
  contribution salary, so a private employer pays 12.5% below AED
  20,000. The other reading (2.5% of the 15%, 0.375% of salary) is not
  coded. Cost if wrong: the employer share is 2.125% of salary too low.
- Ruling B13: case files declare the weakest status among the rules in
  their trace, and the runner fails a case that claims more; the two
  national cases are `unsourced` (they depend on the salary-base
  override). Cost: none.
- Open from the review, not fixed: M1 (Law 7, joining and leaving in
  one month drops the whole contribution), M5 (no flag when probation
  makes sick days unpaid), M10 (two daily bases: calendar days for
  proration, 30 for overtime and caps), M11 (WPS fixed can be 0 when
  deductions take all of basic; half-pay days are not in
  `unpaidLeaveDays`).
- Task 6: the purity scanner ignores words inside string literals for
  `Date` and the other globals (a message said "Date must be ..."); it
  still reads import strings.

## 11. Rulings made during the Plan 3 build (Claude's calls)

The owner can overrule any of these. Full list with reasons:
`docs/superpowers/plans/plan-3-build-report-1.md`.

- Contract: list responses are `{ items }`; audit events page with
  `nextBefore`. Error detail and audit data allow one level of nested
  objects (pay-run problems, period). Pay trace results are integer
  fils strings (`PAY_TRACE_RESULT`). Additive after Task 1: role change
  route, `PayRun.sifFileId`, `serviceUnpaidLeaveDays`, a leave year
  filter, MFA password fields (breaking), new error codes.
- Tenancy: one transaction per request; handlers get `ctx.tx` and never
  the raw database; inside a tenant, the "my companies" policy arm is
  off. Foreign keys carry `company_id`.
- Security: sign-in locks the user row and counts failures in one
  UPDATE; TOTP steps are claimed by one conditional UPDATE; audit data
  is an allowlist of keys and safe shapes; scrypt N = 2^16; 1 MiB body
  limit; TRUNCATE of the audit log is blocked.
- Pay runs: every problem is returned (including SALARY_MISSING); an
  idempotency key is looked up before computing, and a key reused
  after a void returns the void run; approval re-hashes the inputs and
  refuses a changed draft (RUN_INPUTS_CHANGED); the leaver's gratuity
  uses the stored basic, never a run override.
- SIF: one file per approved run; the text and findings are sealed;
  finding values that look like IBANs, amounts or ids are hidden on
  the metadata route (no MFA); the download needs MFA and is audited.
- Migrations were renumbered: 003 single-use TOTP, 004 security
  hardening, 005 people, 006 leave and attendance, 007 payroll, 008
  SIF.

## 12. Arabic review (2026-11-26)

- Ruling: until a native speaker has reviewed `docs/review/arabic-review-pack.md`
  (215 strings, 89 rated HIGH), Arabic stays available only as a labelled
  preview (banner "awaiting native review"; API sends `arReviewed: false`).
  Nothing forces the gate today (a user can switch language); the owner
  wants Arabic from the start for design review. Cost if wrong: an employee
  could read unreviewed legal wording. Before real customers: enforce the
  flag in web and API and fix the HIGH items (for example "(رسمي)" after
  figures, "غير مستحقة", consent wording).
- Review fixes (2026-11-26, money review of Task 7 and data-protection
  review of Tasks 5 and 6; full list in the build report): a leaver's
  unpaid leave over service is required; SIF files use the bank
  details and labour ids frozen in the approved run (live changes are
  reported, never used); a run lists who changed since the last
  approved run; salary and bank writes need MFA and nobody but an
  owner edits their own; nobody decides their own leave or one they
  filed; leave reasons are sealed; salary and bank cipher text is
  bound to its version; one user per employee record; manager cycles
  refused; attendance corrections at most 24 hours and not in the
  future, lists at most 366 days; runs with nobody in the period are
  refused; amounts above the wire cap are problems; the real-
  PostgreSQL suite runs inside `pnpm check` when a server binary is
  installed. Costs: a sole owner linked to an employee needs an hr
  user to approve their leave; cipher text from before migrations 010
  and 012 is unreadable (no real data existed).


## 13. Design direction and skills (2026-11-26)

- Owner: of concepts A, B, C, **C (Northline Pipeline) is the winner**,
  but "way too far still" from what they want. Round 2 started: three
  agents push C in different directions (Cinematic, Kinetic Control
  Room, Fluid Luxe), each browser-checked with screenshots. The owner
  still picks; web screens wait for that choice.
- Owner asked whether installed skills are actually used. Standing
  rule (Claude's call): load the relevant skill before design, merge,
  review and verification work; name required skills in every agent
  brief; handover lists which skills each piece of work used.
- Third-party skills installed from the owner's list (pinned, skill
  files only, no hooks or MCP): see `docs/third-party-skills.md`.
  Headroom (prompt proxy) and 21st magic-mcp (needs an account and
  key) were not installed; owner decision.
- WPS Resolution 340/2026 primary text is still unread (law-firm
  summaries only; the legislation portal blocks automated browsers and
  the MOHRE pages did not load). Day-16 condition sources disagree;
  nothing is encoded as official. Counsel item.

## 14. Render hosting rules (2026-11-26)

- Owner standing rule: **never touch the owner's other project on
  Render.** The workspace "My Workspace" (`tea-dbt39oek1f9s73ann1g0`)
  already holds an unrelated ERP project: web service `manar-erp`
  (`srv-dbt3bcoae00c739i42gg`), crons `manar-erp-jobs`
  (`crn-dc2lkpek1f9s738cub4g`) and `manar-erp-einvoicing`
  (`crn-dc24gqk9v7es73c8hfkg`), repo `ahmadmhdnabilalzain-bot/ERP`.
  Never update, redeploy, suspend, resume, delete, adopt, rename, query
  or change environment variables of anything not named `hr-payroll-*`.
  Blueprints must use `existingResources: create_new` and never `adopt`.
- Every agent brief that could reach Render must repeat this rule. Read-only
  listing is the only allowed action on resources not owned by this app.
- Demo first (owner): a seeded demo database behind the real API, shown
  to clients; the real production hosting comes later on another plan.
  Nothing is created on Render until the owner has seen the plan and
  the cost.
- 2026-11-26: Owner asked (twice) for a separate Render project. Created
  Blueprint `hr-payroll` (`exs-dc3urcui0phs738l6ol0`) from `render.yaml`
  on this branch, project `hr-payroll`, environment `demo`, with one
  free static placeholder `hr-payroll-demo-site-223y`
  (`srv-dc3urhajnfac73avp20g`). `autoSync` is OFF on purpose: pushes to
  `render.yaml` must never create resources by themselves.
  Every later addition (API, private Postgres, disks, paid plans) needs
  `plan_blueprint`, the plan and monthly cost shown to the owner, and
  their yes before `approve_blueprint`. Verified: Render Postgres has no
  superuser; static sites are free to deploy. Existing `manar-erp`
  resources were checked before and after and are unchanged.
- Advisor (owner set it to Fable 5.2 on 2026-11-26): consult it before
  decisions; it had lapsed for a long stretch and was resumed.

## 15. First client and demo scope (2026-11-26)

- Owner: the demo company is a fictional **bank**, "because that will be
  my first client to meet". The client's name is deliberately not
  recorded here or anywhere in the repo, searches or hosting; the
  fictional demo bank must not resemble it.
- Advisor-driven rules for a bank audience: no regulatory, certification
  or "compliant" claims; Emiratisation shown as headcount by nationality
  only (the bank regime is unverified; the pack rests on secondary
  research); pension only where the GPSSA pack covers the case, the rest
  listed as not computed; a bank's regulator requirements for outsourcing
  and data location are UNVERIFIED (treat like PDPL: primary sources and
  counsel); the Frankfurt hosting region is fine only for fictional demo
  data.
- Gates: no hosted demo until the idle-timeout crash fix (C-1, Plan 7
  R6 follow-up) is on main and re-tested; Plans 15 and 16 wait until the
  meeting date is known (screens are the critical path).
- Owner questions open: meeting date; the bank's size and whether it is
  mainland or DIFC/ADGM; who attends (IT security, compliance?); which HR
  and payroll system it uses today.
- Owner: the first client currently uses **Keka** and is "extremely
  frustrated" with it. The demo is built to win that comparison: a Keka
  deep dive (real screens plus mined public review pain points, mapped
  to demo scenes) is running; the demo storyline follows the pain list.

## 16. Demo sprint (2026-11-26)

- Meeting: **Fri 2026-11-27, 15:00 Dubai time**. Client: a small bank in
  Abu Dhabi, about 30 staff, currently on Keka and frustrated ("it cannot
  do the job properly", wants unspecified extra features and "a smarter
  system"). Attendees: the owner, the client's HR Manager, General
  Manager and IT Manager. The client is not named in the repo.
- Advisor plan (Fable 5.2): the demo runs entirely in the browser on the
  bank dataset (pure `@payroll/demo-data` with the real engine), served
  from the free static site; four scenes each working end to end (Home
  decisions; Pay run with real problems caught; Explain any number;
  Employee payslip and leave request landing in the manager's inbox).
  Seeded database and hosted API move to after the meeting. All backend
  plan work paused at clean commits (resume steps in each build report).
  One restrained screen first for the owner's yes/no before more scenes.
- Honesty rules for the demo: no simulated AI assistant, no pre-pay gate
  or other unmerged features; no compliance/approval claims; mainland
  rules labelled (free-zone status unconfirmed); Emiratisation = headcount
  by nationality only; pension for UAE nationals in Abu Dhabi = "not
  computed" (an Abu Dhabi pension fund may apply instead of the federal
  fund; unconfirmed); Arabic hidden unless reviewed.
- Done tonight before pausing: C-1 crash fix (idle-in-transaction
  timeout killed the API process) cherry-picked to main (c668f64).

## 17. Product name (2026-11-26)

- Owner chose the working name **MubinFlow** (Arabic *mubin*, "clear,
  evident", plus "flow"; reads "moo-BEEN-flow"). Backups from the same
  root: Mubinly (reads "clearly"), Mubinpay, Mubinio. Why it won: easy to
  say, Arabic-origin, matches "every number explained, problems caught
  plainly".
- Checked 2026-11-26: mubinflow.com not registered at the .com registry;
  search shows no company or product with the name (only people named
  Mubin). NOT done: UAE trademark register search, app stores, other
  TLDs, and a native-speaker check of the connotation (the word also
  appears in the Quran as "clear"). Domain purchase is the owner's call.
- The on-screen name lives in one place (`apps/web/src/brand.ts`).
- Owner confirmed (2026-11-26): the first client's entity is **mainland**
  (not DIFC/ADGM). Mainland rule labels in the demo are now accurate for
  the jurisdiction; the Abu Dhabi pension fund question stays open.
## 18. Demo data and demo environment (2026-11-26)

- Owner (via the coordinator): a clickable demo with fake data only,
  hosted later as a static site; then "a database of demo data so
  clients can actually browse and see how the features work". The
  demo data must also seed a real demo database behind the real API.
- Rulings (Claude's calls) for `packages/demo-data`:
  - One seed (default 2026) drives every variation; the finished month
    is October 2026, the draft month November 2026, "today" in the
    demo is 2026-10-31.
  - Fake identifiers: IBANs with check digits 00 or 01 (never issued)
    that also fail mod 97; Emirates IDs whose check digit fails Luhn;
    labour and employer ids starting 99; `.test` emails. The SIF report
    therefore shows one `IBAN_CHECKSUM` warning per line, on purpose.
  - `gpssaContributionSalaryBase` is unsourced: the demo passes
    "basic" as an override for nationals and lists it as an
    assumption (each national's payslip carries `OVERRIDE_USED`).
  - Back pay has no engine earning kind: the amount is owed minus paid
    gross from two engine payslips for September, carried in October
    as an `other` allowance with code `back-pay`.
  - The missing-IBAN case joins on 2026-12-01, so it has no October
    payslip and the SIF still sums to the run total; it is an issue.
  - The leaver's gratuity and leave pay come from
    `calculateSettlement` and stay outside the run total and the SIF.
  - No JSON snapshots in `apps/web/public/demo/`: the web mock builds
    its seed in-process, so the demo data stays a TypeScript import.
- 2026-11-26, owner via the coordinator (replaces the earlier demo
  size and the 120-staff bank brief): the demo company is a small
  FICTIONAL Abu Dhabi bank of about 30 staff for the first client
  meeting; the database seeder waits until after the meeting. No
  regulatory, certification or acceptance claim anywhere.
- Owner (verified tonight): a separate Abu Dhabi pension fund covers
  UAE nationals employed in Abu Dhabi; whether private-bank staff fall
  under it or GPSSA is unconfirmed. Nationals' pension is "not
  computed" with the agreed wording (one constant).
- Emiratisation in the bank demo: headcount by nationality only, no
  target, status or fine ("sample data, regime for banks to be
  confirmed").
- Rulings (Claude's calls): nationals' payslips use the engine's own
  steps (days, earnings, deductions) without the GPSSA step, because
  calculatePayslip requires GPSSA input for a national; IBANs are
  mod-97 valid in the fictional bank's 999 range so the SIF check
  reports only planted problems (one IBAN typo); the missing-IBAN
  payslip is computed and held out of the SIF; the demo's "today" is
  2026-10-27 with the run waiting for the GM; commit trailers follow
  the harness (Opus) line, as Plans 3 and 6 recorded.
- Owner confirmed the client is mainland: every figure says "UAE
  mainland rules"; the free-zone wording is dropped.
- Owner ruling (2026-11-26): domain purchase and trademark work are
  parked ("too early"); the product will not have a separate website.
  Do not raise either again until the owner does. Focus is the app
  itself (the client demo first). The name MubinFlow and the logo kit
  stand as working choices.
- Owner rule (2026-11-26): **no design goes onto the live site before the
  owner has seen previews in chat and approved them.** Previews are sent
  as screenshots via SendUserFile; the hosted site only changes after a
  yes. Correction logged: applying a Render Blueprint change triggers a
  deploy by itself even with `autoDeployTrigger: off`; at 09:07 UTC the
  site briefly served the unfinished groundwork web app (noindex, no real
  data) before it was put back to the placeholder. So: any Blueprint
  change that points the site at apps/web happens only after approval,
  and `trigger_deploy` is not needed for it (the sync itself deploys).
- Presenting setup (owner, 2026-11-26): a laptop connected to a big
  screen; the client also opens the demo on their own iPhones (iPhone
  13 or newer, Safari). Rules: design and test at 1920x1080 and 1280x720
  with light theme as the default; phone Home is its own composition
  with a bottom bar; offline single-file build as the fallback if the
  network fails; WebKit/Safari is not available in this sandbox, so the
  owner checks once on a real iPhone. Hosting the approved demo is
  needed for the clients' phones (a link or QR code) and happens only
  after the owner's yes.
- Owner's process for the client demo (2026-11-26): (1) owner approves the
  interface and UI; (2) I share the list of features not built
  (`docs/demo/pending-features.md`); (3) owner decides how much more to
  build before the demo; (4) I run a full browser check as if I were the
  client and fix every bug found; (5) the owner sends the client the
  live link tonight, and meets them tomorrow 15:00 Dubai time.

## 19. Quality bar and navigation rulings (2026-11-26)

- Owner (2026-11-26): the previous system (Manar One) is rated 3/10; the
  MubinFlow demo must be 10/10 and "the jump is not small". The standard
  is "Apple is developing this app". An independent critique scored the
  first screens about 5.5/10 (docs/design/2026-11-26-apple-standard-
  critique.md); the fixes (type scale, one grid, motion, copy, colour,
  Review and Fix steps) were ruled in as one design pass.
- Owner (2026-11-26): "no long menus" does not mean cancelling features.
  Ruling: **a short bar, every feature behind it.** Top bar of 5 to 7
  words plus search that never grows; each section opens a panel of
  short groups with live counts (phone: the tab's first screen is the
  same list); features live on the record they belong to (person, pay
  run); the command palette reaches every area, person and action. The
  earlier line "four scenes, not forty pages" was a scope limit, not a
  navigation rule, and is withdrawn. A navigation map
  (docs/design/2026-11-26-navigation-map.md) assigns every Manar HR and
  payroll area and every backend feature a home, a route of two clicks or
  fewer, and a status (live, hours to add, not built). Demo panels list
  only live areas (no dead ends); the owner decides how many unbuilt
  areas to add.
- Comparison with the owner's Manar One (read only through its own demo
  sign-in): Manar is broader and works on live data; ours is better
  edited but shows less. Claims of "better than the market" are limited
  to the screens actually compared.
- Build order for the design pass: tokens and grid first as one commit,
  then shell, section panels, command palette and Home; then the Pay run
  and People builders apply the critique to their own views. GSAP is a
  dependency only once added; the offline file and the
  no-outside-requests check must still pass.
- Owner target (2026-11-26): **HR and payroll must be 80% complete for
  tomorrow's meeting.** Definition (my ruling): coverage is measured on
  the navigation map's HR and payroll inventory (every Manar One HR and
  payroll area plus the 140+ market features), as the share of rows that
  open as a working screen in the demo on realistic data, with the key
  flows fully working. The percentage is reported honestly with the list
  of rows still missing. Manar One was built in 48 hours, so breadth is
  built in parallel (up to 10 builders) on shared screen templates once
  the shell and tokens have landed.
- Owner decision (2026-11-26): **accent colour = option C, ink only (no
  accent).** Primary actions are near-black ink in light and near-white in
  dark; links are ink with an underline; colour appears only as state
  (red stops pay, amber check, muted green done) and always with a word.
  Avatars use neutral tonal initials. Teal is retired.
- Owner instruction (2026-11-26): "if its not 10/10, then the advisor need
  to propose upgrades to make it 10/10". The advisor proposed: data-drawn
  hero (net pay trend), data cards in the strip, action-row section
  panels, avatars, motion into records, a dedicated phone first screen,
  status pills and a right column on records. Built as a preview
  (branch design10) for the owner's approval before any rollout; the
  coverage wave is held until the owner approves the direction.
- Owner sequencing (2026-11-26): HR and payroll features first (target 80%
  for the first client meeting); **after all HR features are done, move to
  the other list made initially** (the wider master and combined feature
  lists in docs/superpowers/specs/, beyond HR and payroll: spend and AP,
  VAT and e-invoicing, meetings, channels, intranet, assistant and so on).
  Duplicates against the HR rows will exist; a dedupe pass against the
  navigation map's 208 rows comes first, so nothing is built twice.
- Owner ruling (2026-11-26): **UAE only. Ignore Saudi** (and any other
  country: India payroll, GCC multi-country). Rows for other countries are
  removed from the coverage denominator and from every build list; the
  "not buildable" count for the 80% target is recomputed without them.

## 20. Cinematic design, e-signatures, sprint (2026-11-26, evening)

- Owner (2026-11-26): wants upgrades at the level of scroll-driven 3D
  designs, "of course where it is fitting, not everywhere". Advisor
  ruling: four cinematic moments only: the opening (ribbon resolving
  into the MubinFlow wordmark, preview on branch cine, laptop first),
  the bank-detail fix (held amount flows into the file total, one shared
  flight helper), "Why this number" (figure lifts into its working), and
  sign-off (name, role and time land as a stamp, reused by e-signing).
  Every other screen stays calm. No pointer tilt or parallax (clients'
  iPhones have no pointer). The Cinematic/Calm switch is withdrawn.
- Owner (2026-11-26): e-signatures are registered when a company brings in
  a new employee, and every document that needs a signature offers
  "Sign document electronically" (branch d5; demo of the workflow, no
  legal validity claimed).
- Palette: ink, paper and one cool grey family (owner); the brand is
  written MubinFlow (owner's logo choice) everywhere in text.
- Feature freeze (2026-11-26 15:30 UTC): no new feature packages after
  wave 4. Remaining work: design sprint (d1 to d4), e-signatures (d5),
  fixes (fix1, fix2, fix4), polish, merges, rescore, client-style walk,
  owner approval, then the Render plan with cost. UAE only.
- Coverage after wave 4 and fixes: about 160+ of 207 UAE-scope rows live
  (77 percent before wave 4); pension for UAE nationals stays "Not
  computed" by decision.
- Owner (2026-11-26): no more videos or screenshots of in-progress work in
  chat ("no need to burn tokens"); plain-text progress only. Exception: the
  final approval check on the finished build. After the full browser
  walkthrough passes and everything is approved, produce a 4 to 5 minute
  product-launch style promo video of the finished app covering all
  features (story and shot list approved first). Agents must not record
  videos for chat unless a task needs one for its own verification.

## 21. Status and rulings after the mobile stage (2026-11-26)

- Done: final merge of d1 to d5, polish, fix1 to fix4; mobile stage (audits
  mob-a and mob-b, fixes, verify: 254 e2e pass, 1824 light-theme route
  measurements with zero overflow, zero input problems, zero errors).
- Coverage 3: 176 of 207 UAE-scope rows live (85.0 percent). 31 pending: 6
  partial, 14 missing, 3 not for a bank, 8 skipped on purpose. Not built:
  WP20 pension, WP21 bonus, WP24 Arabic, WP29 assistant, WP30 commission.
- Remaining gates: design rescore; client-style walk; owner approval of the
  previews; Render plan with cost and the owner's yes; unlisted link;
  owner's check on a real iPhone; 3D opening decision (branch `cine`, not
  merged); promo video last.
- Ruling: no in-progress videos or screenshots go to the owner; plain-text
  progress only. Exception: the final approval check on the finished build.
- Ruling: the hosting decision is deferred until the Render plan (with cost)
  is approved by the owner.
- Ruling: sound is off by default in the demo and in any video.
- Ruling: the client is called "the bank" in every document.

## 22. The owner's verdict, 27 Nov 2026: MANDATORY (binding, none optional)

Recorded at 05:40 Dubai on the owner's instruction: "Whatever I have been
telling you should have been in the ledger, and it is mandatory to be done.
Everything you have to fix now in the next 2 to 3 hours, and then you will
redeploy." The full numbered list is `docs/design/2026-11-27-owner-verdict.md`
(points 1 to 24). Every point is binding. This section is the contract.

Ruling, deadline: builders hand back by 09:00 Dubai (phone and Safari fixes by
08:30); one combined merge and the full gate follow; the deploy freeze is
11:00 Dubai (meeting 15:00). The link live now stays up until the new build
passes the gate. Unfinished parts stay hidden behind a flag, never half-shown.

Binding requirements (summary; the verdict file is the full text):

1. Sign-in with named people; the role menu is "Demo: switch person"; every
   action and audit entry shows the real person; employees can request access
   or a role change through a signing chain.
2. HR Home is a priority board: KPIs, schedules, attendance, visa and labour
   card documents, expired insurance, government letters, staff requests; most
   urgent first; every tile clickable.
3. Staff schedules exist and are findable.
4. In-app chat and announcements instead of email.
5. GM sees what every staff member is doing today: tasks and deadlines.
6. Operations is a third area beside HR and Payroll (the "Time" word becomes
   "Operations": today, team today, schedules, tasks, messages,
   announcements, plus time and leave).
7. Org chart with reports-to and responsibilities per position.
8. KPIs, company guidelines, grades (for example 5C) beside every name;
   starting level by position.
9. Every leave type can be requested, maternity included.
10. Letters have a defined signing chain (HR manager, then GM where set); the
    employee never picks the signer.
11. Letter templates need no typing: drop-downs for purpose, embassy, bank;
    11b: HR can create and edit templates.
12. Competitive study of navigation and features; premium bar; the product
    must justify a controlled-process platform price for a bank.
14. Reports are fully clickable; 15. every report and document is
    generatable as an official PDF with letterhead and logo.
16. Hiring budget (budgeting per position) and hiring requests in the app.
17. Premium bar: craft, motion and "can each person finish a real job".
18. Every error, notification, decision, tile, row and chip is clickable and
    opens an item page: what it is, why, since when, how to fix it (with the
    action in place), owner, and HISTORY on the side.
19. Items are routed by who owns them (an expired visa is HR's; the GM sees
    "HR is handling: N"); actions follow who approves what.
20. No notification is a dead end; each opens its root with history.
21. Every item gives the next logical step in the app: assign, ask, remind,
    escalate, message, note; no phone calls, no email.
22. Purpose: organise the company, optimise and automate, cut email and
    calls, let management and owners see what is going on; a founder or
    chairman can sign in and monitor the whole status (read-only).
23. HR, Payroll and Operations; 24. the demo must be able to win the deal.

New gates added today (all must pass before the redeploy):
- Dead-click test: every role's Home, dashboards, bell, notices, reports and
  lists have no row, tile, chip or notification that does nothing.
- Fail-open: content is visible and clickable by default if any animation,
  View Transition, IntersectionObserver or requestIdleCallback is missing.
- Owner devices: Safari on iPhone 13 Pro Max (428 x 926) and an Asus Vivobook
  (Windows, 125 to 150 percent scaling, integrated graphics).
- Headline numbers unchanged; HR "Waiting for a decision" 4; IT sees no pay;
  Hide amounts masks everywhere including PDFs.

Standing: the audit evidence for the dead-click problem is in
scratchpad/deadclick; the item-page builder is branch item1; the order of
merge is Reports, GM dashboard, HR Home, letters, then the rest.

## 23. Scope ruling, 27 Nov 2026 (06:10 Dubai): wave 1 ships today; the rest is Monday

Owner ruling: "Anything post wave 1 keep it in ledger for monday." Also: laptop
first, phone second (the owner's laptop is an Asus Vivobook; the iPhone is a
13 Pro Max in Safari). Wave 1 is the only build for today's meeting (15:00
Dubai), deployed after it passes the full gate. Everything below is built or
partly built on branches and is NOT deployed today. It is the Monday list.

Wave 1 contains (merged on branch `wave1`): design rounds 3A to 3E (global
links and spelling, bonus and commission, hiring budget and Request a hire,
pay run Fix and sign-off and Documents to sign, Reports hub, dashboards, Setup
home), the fail-open fixes (a stalled animation or view transition can no
longer leave content hidden or unclickable), law wording, copy rulings, every
leave type, the phone fixes already merged, and the click script.

Monday list, with the branch that holds the work (all unmerged, none deployed):

| Item (owner's verdict point) | Branch | State |
| --- | --- | --- |
| 18, 20, 21 Item pages: every error, notification and decision opens a page with history and next steps | item2 (restart; the first attempt item1 was stopped by a platform safeguard: do not use item1) | in progress |
| 20 Every notice and notification clickable, notice detail page, RowLink | dc1 | in progress |
| 18 Leave, time off, documents rows lead somewhere | dc2 | in progress |
| 18 Payslips, profile rows, reviews, help lead somewhere | dc3 | in progress |
| 1 Sign-in with named people, "Demo: switch person", access or role request, chairman view | auth1 | done; typecheck, lines, targeted tests pass; full web unit run to repeat; every spec now seeds signedIn=hr |
| 15 Official PDFs with letterhead for every report, payslip, letter | pdf1 | in progress |
| 10, 11, 11b Letters: signing chains, request catalogue, template editor | bb1 | done, tested |
| 10 Expense claims follow the signing table | exp1 | done, tested |
| 2 HR Home priority board, GM board, Company status variant | bb2 | done, tested |
| 7, 8 Org chart, grades (5C), reports-to, profile hub, KPIs | bb3 | done, tested |
| 3, 5, 6 Schedules, Team today, tasks, Operations area | bb4 | in progress (task API done) |
| 4 In-app messages and announcements | bb5 | done, tested |
| 2 Expiry feed, government letters, Waiting on HR | bb6 | done, tested |
| Safari and Vivobook compatibility, fail-open walk | saf1 | in progress |

Known gaps to carry (from the audits and reports): about 42 to 46 percent of
manager and employee elements were dead on the live build (missing click
handlers on plain rows, numbers, names, chips); the HR/GM and IT audits are in
scratchpad/deadclick; grade chips inside sentences; PNG/PDF export of the org
chart; Home sign-off button without the confirmation sheet; three native
controls in hiring sheets; Arabic strings need a native reviewer; real Safari
never tested here; competitor menu counts marked [R] need verifying; WPS
Resolution 340/2026 details unverified; unemployment-insurance dates fixed
in wave 1.

Monday order of merge: Reports and dashboards are already in wave 1; then
item pages with the dead-click fixers (dc1 to dc3), sign-in, letters and
expenses, HR Home, org chart, schedules and tasks, messages, PDFs; then the
full gate; the cold test (eight real jobs as the person, no script) before
any new deploy; video last.

Rule held: nothing unfinished is shown half-built; nothing is deployed that
has not passed the full gate on the exact commit.

### 23a. Audit findings carried to Monday (live build before wave 1)

IT, bell and charts audit (partial; reports not walked): 4 of 29 bell items
dead (GM: Rashid Al Falasi's expense claim; manager: 2 self-assessments to
review; employee: October overtime recorded, self-assessment sent). Many bell
items land on a generic list (all five IT items and several HR and GM items go
to `#/people`) instead of the record. Home: the "Waiting for a decision" link
does nothing for HR and GM; notice rows are plain text for every role. IT:
14 real dead controls (audit chain "Check again", Jobs tab, KPI Library tab,
Auditor access tab, ERP regions, GL Test connection, Teams Test connection).
Charts: no tooltips on the 38 HR marks and tiles hovered; all 68 IT kiosk
marks dead. Audit-trail, access-review and key rows are plain list items.
HR and GM full audit is not complete. Manager and employee audit: 42 to 46
percent dead, cause is missing click handlers on plain elements.
Files: scratchpad/deadclick (CSV and summaries). Wave 1 fixes Reports and the
dashboards; the rest is the dc1 to dc3 and item2 branches.

### 23b. Branch state at wrap-up (06:15 Dubai), for Monday

- dc1: only the shared `RowLink` / `useRowLink` component (apps/web/src/ui) is
  built and documented in DEMO.md. Notice detail page, rewiring the bell,
  Notices, To do and Waiting rows, the Later chip and the guard test are not
  done. Cause of dead bell items: `targetHref()` in home/inbox/model.ts returns
  null when the target is not a route the role can reach; `HomeNotice` has no
  related-item field.
- item2: API commit and audit subject only (`#/item/<type>/<id>`, `itemHref`,
  `<ItemLink>`, 14 types; `ItemPage` is a stub; audit entry subject carries
  type and personId outside the hash). Page body, responsibility table
  (compatible with bb1 `ITEM_OWNERS`), wiring, "HR is handling" and "Nudge HR",
  and the guard test are not done. Typecheck not run on the API commit.
- bb4: built (shared task list, six weeks of schedules, Operations area,
  Attendance today, Team today, Tasks, Schedules, My schedule, My tasks).
  Attendance today changed in demo data (three people late or missing, so
  "Clock-ins today" goes 0 to 3; the October late list 3 to 5). Last three code
  commits not run in a browser; one leak-scan failure on comp-plan was
  intermittent. Open-shift board and Arabic not done.
- dc2, dc3: leave, documents, payslips and profile rows: still to be reported.
- pdf1: built. Real PDF files (own small writer, standard fonts, loaded only on
  click, about 13.5 kB) with letterhead, logo mark, reference, page numbers,
  verification code, signer block and stamp; Hide amounts and IT masking inside
  the file. On every shared report, payslip, "Why this number", letters,
  e-sign, salary file summary, settlement, bonus, commission, org chart. Not
  done: anomaly checks and error-remedy PDFs (in a git stash on pdf1), report
  templates, Ask, auditor view, mapping bb1's `LetterDoc` onto `PdfDoc`. Three
  e2e tests still fail and are unchecked against a clean d3e build (explain
  figures and GM leak scan on the executive dashboard, one a11y timeout).
  Wave 1 keeps d3e's Download PDF, which opens the print sheet.
