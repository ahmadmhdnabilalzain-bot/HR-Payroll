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
