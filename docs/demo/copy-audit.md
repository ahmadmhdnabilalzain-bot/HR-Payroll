# MubinFlow demo: copy audit

Branch `integ`, read on 2026-11-26. Read only; no file was changed.
Scope: `apps/web/src` (i18n `en` and `ar`, `words.ts`, strings in
components) and `packages/demo-data/src` (labels, notes, reasons).

Paths: `web/` is `apps/web/src/`, `data/` is `packages/demo-data/src/`.
Each entry gives `file:line`, the text now, and a one-line fix. Where
one phrase repeats, the fix is a find and replace pair.

## How it was checked

- Each rule was grepped against the string literals in both trees:
  claims (compliant, certified, accepted, regulator, guarantee),
  approve/approved, WPS/MOHRE/pension, provenance ((demo), (sample),
  (fictional), "in this demo", demo receipt), jargon (engine, trace,
  fils, pack, codes such as `ABC_DEF`), ISO dates in prose, brand,
  other countries, competitor names, US spelling, AI filler, status
  terms, role casing and day counts. Bare JSX text was grepped too.
- Read in full: `en/home`, `en/payrun`, `en/people`, `en/timeoff`,
  `en/me`, `en/shell`, `en/explain`, `setup/rules/words.ts`. Every
  other catalogue and `words.ts` file was checked by grep only.
- Section 4 items, plus the research note's NOT FOUND and DISCREPANCY
  lines, were compared with
  `docs/research/2026-11-26-labour-law-primary.md` and the statuses in
  `packages/engine/src/rules/*-pack.ts`. Other rule sentences were not
  checked one by one; Setup shows each rule's status beside it.
- Clean: no AI filler, no US spelling, no ISO date inside prose (only
  in CSV file names), no other country except one line (S12).
- Masks: `web/demo/data/home.ts:23` `clean()`, `moves.ts:23`,
  `demo/data/pay.ts:47` and `reports/source.ts:65` rewrite "approved"
  in some package text; `web/people/filter.ts:24` strips a trailing
  "(...)" from branch names in the People list and Profile only.
  Masked lines are listed once (S3), to fix at the source.

## Counts

| Severity | Entries |
|---|---|
| Must fix before a bank sees it | 11 |
| Should fix | 26 |
| Nit | 7 |
| UAE-law flags (verify; three are contradictions) | 7 |
| Arabic (if the switch were shown) | 9 |
| Total | 60 |

## 1. Must fix before a bank sees it (11)

M1. `web/brand.ts:12-13`
- now: `en: "Mubinflow"`, `ar: "Mubinflow"`
- fix: set both to "MubinFlow" (the only file that holds the name).
- note: LEDGER section 17 writes "Mubinflow"; the owner's brief says
  MubinFlow. `tests/unit/brand.test.ts` guards this file; update it.

M2. `web/setup/migration/Parallel.tsx:44`
- now: `Our run against the old system (vendor name). ...`
- fix: delete the vendor name: never name the client's current vendor.

M3. `web/i18n/en/home.ts:81`
- now: "Pension: confirm the fund with the client"
- fix: "Pension: confirm the fund" (the title `data/issues.ts:220`
  already uses).

M4. `web/setup/access/Connections.tsx:85`
- now: "Pay run: approval given"
- fix: "Pay run: signed off".

M5. Two screens give the same date two names.
- `web/setup/rules/PayCalendar.tsx:38` now "Approve by"
- `web/people/papers/Calendar.tsx:28` now "Approve by"
- `data/summaries.ts:43` now "Approve by"
- `data/wpe-brief.ts:141` rewrites it to "Sign off by"
- fix: use "Sign off by" in all three and drop the rewrite.

M6. Holidays: the leave form contradicts Setup and My calendar.
- `web/i18n/en/timeoff.ts:61` now "Public holidays are not loaded in
  this demo."
- `data/wpd-templates.ts:276-285` holds dated holidays shown in
  `web/setup/structure/Holidays.tsx` and `web/me/MyCalendar.tsx`
- fix: "Public holidays are not taken off this count yet." (or take
  them off the count and delete the note).

M7. `data/labels-en.ts:59-60` (expense titles)
- now: "Client lunch (demo receipt)", "Taxi and parking, client
  visits (demo receipt)"
- fix: drop " (demo receipt)" from both.

M8. "(demo)" device names
- `data/time.ts:177`, `:194`, `:196`; `data/wpd-templates.ts:228-232`
- now: "Head office reader (demo)", "Branch reader (demo)", "Al Ain
  branch reader (demo)"
- fix: replace " (demo)" with "" in every label and feed name.

M9. "(fictional)" and "(sample...)" tags in body copy
- `data/labels-en.ts:13-15` "Head office, Abu Dhabi (fictional)",
  "Khalidiya branch, Abu Dhabi (fictional)", "Al Ain branch
  (fictional)" (stripped only in the People list and Profile)
- `data/wpe-safety.ts:45` "Zarqan Demo Insurance (fictional)"
- `data/wpd-talent.ts:127` "Zarqan Demo Academy (fictional)"
- `data/papers.ts:43`, `:45` "Demo Bank (fictional)", "Demo
  Properties (fictional)"
- `data/pay.ts:409`, `:411` "Last working day (sample)"
- `data/wp10.ts:443`, `:521` "(sample date)"; `:540` "10:00 (sample)"
- `web/setup/rules/pages.ts:282` "Payday {date} (sample date)."
- `web/time/Against.tsx:30`, `web/time/Register.tsx:95` "(sample
  grace)"
- fix: replace " (fictional)", " (sample date)", " (sample)" and
  " (sample grace)" with ""; the top ribbon already says the data is
  invented. Keep `shortBranch` in `web/people/filter.ts:24` (it also
  cuts the name at the first comma).

M10. Letters carry provenance in the letter body
- `data/wpd-templates.ts:49`, `:53`, `:57-58` "Zarqan Demo Bank
  (fictional)"
- `data/wpd-templates.ts:51`, `:55`, `:59` "Demo letter, not an
  official document."
- fix: "Zarqan Demo Bank" without the tag; move the one disclaimer to
  the letter preview's footnote.

M11. Pension for UAE nationals is not "Not computed" everywhere
- `data/labels-en.ts:62` "Needs confirmation"
- `web/setup/structure/Exclusions.tsx:6` "Not worked out" (pension row)
- `web/reports/cost/Employer.tsx:17`, `data/wpd-cost.ts:146` "Not
  computed (pension)"
- `web/people/more/words.ts:52`, `data/wpe-more.ts:177-178` "...is
  not computed in this demo."
- `data/wpe-exit.ts:88-89` "...computed in this demo, so it is not in
  the settlement."
- fix: status word "Not computed"; any sentence reads "Pension for
  UAE nationals: Not computed."

## 2. Should fix (26)

S1. Pay run step says "Approve"; the agreed term is "Signed off".
- `web/i18n/en/payrun.ts:11` "Approve"; `:55` "Fix before approval";
  `:82` "Approve the pay run"; `:83` "...another approves it."; `:85`
  "Approval"; `:89` "Approval recorded: {name}, {role}"; `:93` "What
  the approval covers"; `:97` "Approve pay run"; `:41`, `:60`,
  `:106`, `:116` "approves"/"approve"
- `web/i18n/en/home.ts:8-9` "ready for approval", "waits for your
  approval"; `:13` "Approve {month} pay"; `:14` "Go to approval";
  `:26` "Approve waits for..."; `:39` "{name} approves"; `:48`
  "Approve"; `:53` "Before approval"; `:56-57` "blocks approval"
- `web/i18n/en/shell.ts:50` "Approve {month} pay"
- `web/pay/gate/Checks.tsx:52` "Go to approval"
- `web/reports/screens/Trend.tsx:31` "...waiting for approval."
- fix: verb "Sign off", noun "sign-off", past "Signed off"; e.g.
  "Sign off pay run", "Signed off: {name}, {role}".

S2. Other "Approve"/"approval" labels
- `web/i18n/en/timeoff.ts:38` "Approve" (the result is "Booked")
- `web/i18n/en/people.ts:58` "Approves time off"
- `web/i18n/en/home.ts:24` "Approvals waiting"; `:103` "Approvals";
  `:104-106` "{count} approval waiting", "Approve"
- `web/pay/Expenses.tsx:112` "...in their approvals on Home."
- `web/reports/screens/Dashboards.tsx:38`, `:49` "approvals inbox"
- `data/wp9.ts:33` "Approve a pay run"; `:69`, `:84`, `:253-281`
  "approves"; `data/wpe-more.ts:307` "...does not approve anything."
- `data/wp10.ts:136` "Approve the October pay run"; `:219` "Approve
  and send the..."; `:340` "...has it for approval"
- `data/wp3.ts:485` "...approval before it goes out."; `:527`
  "Approve and send the offer"
- fix: leave button "Book"; "Decides time off"; "Waiting for you";
  "Decisions"; replace "approve" with "sign off" and "approval" with
  "sign-off" in the rest.

S3. Package text that says "approved" (masked now; fix at source)
- `data/wp10.ts:389` "You approved the offer for ..."
- `data/pay.ts:312` "Salary advance approved on 26 October..."
- `data/pay.ts:345` "...were approved but not paid."
- `data/pay.ts:433` "...from approved hours"
- `data/wp3.ts:663` "Approved, starts later"; `:770` "Approved by"
- `data/wp2.ts:427` "Pay runs approved before the cut-off" (no mask
  found on its path; check the goals screen)
- fix: write "signed off" / "agreed" at the source; then delete the
  rewrites listed under "Masks".

S4. `web/i18n/en/errors.ts` (if shown by the in-browser mock API)
- `:24-25` "You cannot approve something you created. Another person
  must approve it."; `:41` "Approve the pay run before..."; `:81-98`
  approver and approval chain messages; `:103` "...an approved
  claim."; `:107` "Only approved claims..."; `:119` "The offer is not
  approved yet."; `:124` "Approve the exit first."
- fix: replace "approve" with "sign off", "approved claim" with
  "agreed claim", "approver" with "person who signs off".

S5. Overtime decisions say "accepted"
- `web/time/Overtime.tsx:28` "`${text} accepted.`"
- `web/time/decisions.ts:37` "Accepted by ..."
- fix: "signed off" / "Signed off by ...".

S6. "Compliance" as a page or group name (the page itself disclaims,
but a bank reads the title)
- `web/nav/groups.ts:18` "Compliance and safety"
- `web/nav/areas/people-papers.ts:48` "Compliance"
- `web/people/papers/Compliance.tsx:12` "Compliance overview"
- `web/people/papers/Calendar.tsx:43` "Compliance calendar"
- fix: "Papers and safety", "Due dates", "Due dates overview", "Due
  dates calendar".

S7. `web/i18n/en/payrun.ts:113`
- now: "The salary file for the bank's wage protection upload."
- fix: "The salary file to upload to the bank under the Wage
  Protection System."

S8. "engine" in user copy
- "the engine works the run out again": `web/pay/gate/WhatIf.tsx:89`
  -> "the run is worked out again"
- "What the engine worked out": `WhatIf.tsx:125` -> "What changes"
- "the same engine": `WhatIf.tsx:147`, `web/pay/PastRuns.tsx:41`,
  `web/pay/Corrections.tsx:158` -> "the same calculation"
- "the payroll engine": `web/time/Overtime.tsx:16`,
  `web/time/Against.tsx:28-29` (split across two string pieces:
  "...by the payroll " + "engine.") -> "the payroll"
- "the engine's checks": `web/time/Roster.tsx:130` -> "the checks"
- "the difference the engine gets": `Parallel.tsx:53` -> "the
  difference we get"
- "by the engine": `web/demo/data/run-explain.ts:330`,
  `web/demo/data/pay.ts:63`, `:88`, `data/pay.ts:432`,
  `data/wpe-payroll-extras.ts:298` -> "by the payroll"
- "from the engine": `data/wpe-payroll-extras.ts:253`,
  `data/wp3.ts:597` -> "from the payroll"
- "the engine's overtime rate": `data/wpe-exit-files.ts:449` -> "the
  overtime rate"
- source word "engine" and "as the engine's leave rules say":
  `data/wpd-structure.ts:242-254` -> "Payroll rules" / "as the leave
  rules say"

S9. "fils" in user copy
- "in whole fils": `web/i18n/en/home.ts:43`, `en/reports.ts:15`,
  `web/demo/data/run-explain.ts:331`, `web/demo/data/pay.ts:88` ->
  "exactly"
- "rounded once, to the fils": `run-explain.ts:145`,
  `web/reports/cost/source.ts:87` -> "rounded once, to two decimals"
- "to the nearest fils": `web/demo/data/run-rules.ts:38`,
  `web/setup/rules/words.ts:35-36` -> "to two decimal places"
- "rounded down to the fils": `run-rules.ts:58`, `words.ts:98` ->
  "rounded down to two decimals"
- "balance, to the fils": `web/reports/analysis/Journal.tsx:24-25` ->
  "balance exactly"
- "match to the fils": `data/wpe-payroll-extras.ts:715` -> "match
  exactly"

S10. "pack" in user copy
- "Board pack": `web/nav/areas/sweep-pay.ts:36`,
  `web/reports/more/Board.tsx:11` -> "Board report"
- "Rule pack": `web/setup/rules/RuleRecord.tsx:41`,
  `RuleSettings.tsx:150`, `RuleList.tsx:45` -> "Rule set"
- "Rule packs in force": `RuleList.tsx:54` -> "Rule sets in use"

S11. Rule provenance and "as we read it" outside the explain panel
- `web/people/growth/words.ts:66` "secondary-sourced, as we read it"
  -> "Secondary source, as we read it"
- `web/people/growth/words.ts:67-68` "...(our notes cite Article 9;
  the primary text is not yet checked)" -> "UAE Labour Law, Article
  9" (the research note above says Article 9 was read)
- `data/explain.ts:37` "secondary-sourced, as we read it" ->
  "Secondary source, as we read it"
- `data/calendar.ts:24-25` "...(WPS rule, secondary source; primary
  text not yet read)" -> "As we read the rules, wages are due by the
  1st of the next month."
- `data/calendar.ts:29-30`, `data/wp2.ts:544-545` "as read in our
  notes" -> "as we read it"
- `data/settlement.ts:16` "our reading: the law gives leave for parts
  of the last year but no method" -> "As we read it, the law gives
  leave for part of the last year but sets no method."
- body copy, move into the explain panel or the page footnote:
  `data/wpe-payroll-extras.ts:555`, `:562`; `data/wpe-safety.ts:246`,
  `:249`; `data/wpe-exit.ts:65`; `data/wp3.ts:690` ("our reading, to
  confirm")

S12. `web/setup/rules/words.ts:37-38` (UAE only)
- now: "Gratuity for other Gulf nationals has no source yet, so no
  value is held."
- fix: hide this rule row.

S13. `data/issues.ts:104-106`
- now: "Deductions are limited to 50% of the wage in our rules
  (secondary-sourced; the 85% payment test is not applied in this
  demo)."
- fix: "Deductions are kept to half of the wage, as we read the law."

S14. `data/wp9.ts:594-595`
- now: "...We have not assessed UAE rules for this demo."
- fix: "We have not yet assessed UAE data-protection rules."

S15. "in this demo" / "in the demo" in body copy (one pair per line)
- `web/pay/parts.tsx:48` "This {what} is not in the demo." -> "This
  {what} was not found."
- `web/pay/Ledger.tsx:17` "...not recovered from pay in the demo." ->
  "...not recovered from pay."
- `web/pay/Ledger.tsx:64` "There is no bonus run in the demo data." ->
  "There is no bonus run this year."
- `web/pay/gate/Advice.tsx:44` "in the demo the file is not made
  again, so tell..." -> "the file is not made again, so tell..."
- `web/pay/Fines.tsx:34` "...is not worked out in the demo." -> "...is
  not worked out yet."
- `web/time/more/words.ts:58` "...the October run in this demo." ->
  "...the October run."
- `web/setup/more/Connect.tsx:62` "Nothing is connected in this
  demo." -> "Nothing is connected yet."
- `web/setup/rules/pages.ts:197` "The demo bank's routing code is
  invented, so it is not found in that table." -> "This bank's
  routing code is not in that table."
- `web/setup/rules/pages.ts:211-212` "How the company is set up in
  this demo. The company is fictional." -> "How the company is set
  up."
- `web/setup/access/Data.tsx:108` "Demo only. Data region of this
  site: ..." -> "Data region of this site: ..."
- `web/i18n/en/shell.ts:22` "Nothing here yet in this demo." ->
  "Nothing here yet."
- `web/i18n/en/inbox.ts:62` "Demo only: each entry's fingerprint..."
  -> "Each entry's fingerprint..."
- `web/people/files/words.ts:14` "...for the signature in this
  demo." -> "...for the signature."
- `web/people/files/words.ts:32` "Added in the demo" -> "Added
  recently"
- `data/iban-fix.ts:26` "Entered in the demo" -> "Entered by hand"
- `data/iban-fix.ts:41` "There is no such employee in the demo." ->
  "There is no such employee."
- `data/wpd-structure.ts:131` "No copies on file in the demo" -> "No
  copies on file"
- `data/wpe-payroll-extras.ts:128` "...is not computed in the demo."
  -> "...is not computed."
- `data/wpe-payroll-extras.ts:807-808` "Sample fields: no values are
  held in the demo (as of {date})." -> "No values are held yet (as
  of {date})."
- `data/wp9.ts:314` "Single sign-on: not set up in the demo." ->
  "Single sign-on: not set up."
- `data/wpe-connect.ts:42-43` "Nothing is connected in this demo,
  which runs in your browser." -> "Nothing is connected yet."
- `data/wpe-connect.ts:88` "Built from a real request in this
  demo." -> "Built from a request on this page."
- `data/wpe-exit-files.ts:335-336` "Air tickets are not set up in
  this demo, so..." -> "Air tickets are not set up, so..."
- `data/wpe-brief.ts:143` "...from the records in this demo." ->
  "...from the records."
- `data/papers.ts:152-153` "No deduction: the demo records warnings
  only; any penalty is not computed." -> "No deduction: warnings are
  recorded only; any penalty is not computed."
- `data/pay.ts:362-363` "...is not computed: the demo has no sourced
  rule for it..." -> "...is not computed: there is no sourced rule
  for it..."

S16. "Sample ..." in body copy
- `web/i18n/en/home.ts:45` "Sample dates"; `web/pay/Rules.tsx:10`
  "...the payday is a sample date."
- `web/setup/rules/PayCalendar.tsx:48-49` "The dates are samples."
- `web/setup/migration/Parallel.tsx:54-55` "Sample files made for the
  demo..."; `web/people/talent/words.ts:27` "Sample course"
- `data/wp3.ts:621` "Sample date: confirm the deadline..."
- `data/wpe-requests.ts:344` "Sample date."
- fix: delete these; the ribbon covers it ("Planned dates" where a
  label is needed).

S17. Bank routing note in body copy
- `web/i18n/en/home.ts:36-37` "The demo bank's routing code is
  invented, so the file check cannot find it in its table."
- `data/issues.ts:160` title "Demo bank code"
- fix: "The bank's routing code is not in the code list, so this
  line is a note, not a problem."; title "Bank code not listed".

S18. `web/api/mock/seed.ts:24` "Sample Trading LLC (demo)"
- fix: confirm the bank demo never shows it; else rename to the bank.

S19. "Fake:" notes (check where shown)
- `data/papers.ts:17`; `data/fake-ids.ts:27-28`; `data/pay.ts:358`;
  `data/workplace.ts:25`
- fix: if any reaches a screen, drop it (the ribbon covers it).

S20. `web/i18n/en/home.ts:78` (rule stated in body copy)
- now: "Sick days during probation are unpaid. Tell them before
  payday."
- fix: "This sick day is unpaid. Tell them before payday." (the rule
  is in the explain panel).

S21. "Fictional data." repeated beside the rules line
- `web/i18n/en/explain.ts:15`, `en/reports.ts:12`, `en/payrun.ts:42`
- fix: one footnote per page; drop "Fictional data." where the
  ribbon shows.

S22. `web/i18n/en/reports.ts:21`, `data/labels-en.ts:63`
- now: "...Sample data, regime for banks to be confirmed"
- fix: "Headcount by nationality only, as of {date}. The rules for
  banks are not confirmed yet." (keep `{date}` in `reports.ts`)

S23. Disclaimer words differ: `web/i18n/en/common.ts:12-13` "Sample
data", "Demo data in this browser only..."; `data/labels-en.ts:4-5`
"Fictional demo"; `en/shell.ts:5` "{product} demo: fictional data"
- fix: one wording everywhere, the ribbon's.

S24. `web/home/extra/words.ts:4`, `web/nav/areas/sweep-people.ts:58`
- now: "Approval cover" (and "approver" at `words.ts:5`, `:8`, `:35`)
- fix: "Decision cover"; "approver" -> "person who decides".

S25. `web/setup/access/Rules.tsx:7`, `web/nav/areas/setup-access.ts:22`
- now: "Approval rules and limits", "Approval rules"
- fix: "Sign-off rules and limits", "Sign-off rules".

S26. `web/people/requests/Splits.tsx:46`, `web/me/MyHelp.tsx:65`
- now: "Approval splits and resets"
- fix: "Sign-off splits and resets".

## 3. Nits (7)

N1. Role casing: "General Manager" 9 times, "General manager" 45.
- `web/i18n/en/payrun.ts:41`, `:60`, `:106-107`, `:116`;
  `web/pay/Expenses.tsx:116`; `web/pay/parts.tsx:130`;
  `data/wp10.ts:140-141`
- fix: "General manager", as in `shell.ts` ("HR manager").

N2. Bank result for a bad IBAN has two verbs
- `web/i18n/en/home.ts:69-70` "would return the payment"
- `data/issues.ts:169-170` "would reject this payment"
- fix: "would return the payment" in both.

N3. `web/i18n/en/home.ts:26` "Approve waits for bank details..."
- fix: "Sign-off waits for bank details for {names}...".

N4. Gratuity days show two decimals ("78.08") while leave shows "½"
- `web/demo/data/run-explain.ts:46-50`, `web/reports/cost/source.ts:48`
- fix: keep two decimals; label them "days of basic wage" once.

N5. `data/company.ts:22`, `data/labels-en.ts:7` "Based on UAE
mainland rules, as we read them" vs `en/payrun.ts:42` "UAE mainland
rules, as we read them."
- fix: one wording, from the constant.

N6. `data/wpd-structure.ts:212` source word "demo check"
- fix: "Check" (only if shown).

N7. `web/i18n/en/shell.ts:23` "Not part of this demo"
- fix: "Not built yet" (plainer, and true after the demo too).

## 4. UAE-law statements to verify (7)

Not a legal opinion. L1, L2 and L6 are contradictions inside the demo.

L1. 144 hours: two meanings on one page.
- `web/setup/rules/words.ts:49-50` "Overtime and normal hours
  together: at most 144 hours in three weeks."
- `web/setup/rules/words.ts:110-111` "At most 144 hours of overtime
  in three weeks."
- fix: use the first sentence for both keys (Art 19, research note
  line 39).

L2. Annual leave: the rule says 30 days, requests count working days.
- `web/setup/rules/words.ts:118` "At least 30 days of annual leave a
  year."
- `web/i18n/en/timeoff.ts:56-59` counts working days, skips weekends
- note: Art 29(7) counts rest days inside a leave as leave (research
  note line 157), which points to calendar days.
- fix: counsel to confirm; until then say "working days" on the rule
  line or count calendar days.

L3. Violation deduction: two limits, one page.
- `web/setup/rules/words.ts:80-83` "at most 5% of the wage" and "may
  not pass five days of wage a month"
- note: both are in the law's text (Art 25(1)(f) and Art 39(1)(c));
  the research note asks for a legal ruling.
- fix: keep both lines; add "as we read it" in the explain panel only.

L4. Weekend Saturday and Sunday (`data/calendar.ts:37-40`) is used to
count leave; the law sets one paid weekly rest day (`words.ts:115`).
- fix: show "Company weekend: Saturday and Sunday" as a company choice.

L5. Settlement due date status.
- the 14 days are "From the law" (Art 53, engine pack), but
  `web/demo/data/pay.ts:153` labels the whole rule "as we read it"
- fix: status "From the law" for the 14 days; keep "Our reading"
  only for counting from the last working day (`words.ts:154`).

L6. 50% deduction limit status differs by screen.
- `web/demo/data/run-rules.ts:52-53` and the research note (Art
  25(2)) read it from the law; `web/setup/rules/data.ts:52` shows it
  as "Secondary source" on purpose; `data/issues.ts:104-106` calls it
  "our rules" (S13).
- fix: owner to pick one status; then use it on every screen.

L7. Public holiday dates have no source.
- `data/wpd-templates.ts:276-285` lists 2026 holidays (Eid al-Adha,
  Islamic New Year, Prophet's Birthday, National Day...) as fixed
  dates; the research note (line 76) did not find the Cabinet list.
- fix: label the list "Expected dates; the Cabinet announces the
  final ones."

## 5. Arabic, if the switch were shown (9)

The default hides Arabic; `?ar=1` shows it (`web/demo/flags.ts:8`).
Every Arabic fix below is a draft for native review.

A1. Mixed language: 11 `words.ts` files and every package note are
English only, so screens would mix Arabic and English.
- fix: keep `?ar=1` out of the presenter's links.

A2. "اعتماد" (formal approval or accreditation) for the pay run.
- `web/i18n/ar/payrun.ts:16`, `:80`, `:83`, `:87`, `:94`, `:110`;
  `ar/home.ts:16-17`, `:21-22`, `:62`, `:67`, `:77`; `ar/shell.ts:52`;
  `ar/reports.ts:53`
- fix (draft): after S1, use "التوقيع" forms (e.g. "وقّع على الرواتب").

A3. Two words for one action: "موافقة" in `ar/home.ts:129` and
`ar/timeoff.ts:49`, "الاعتماد" on the pay run.
- fix: one term per action, as in S1-S2.

A4. `web/i18n/ar/payrun.ts:107` "نظام حماية الأجور في البنك" says WPS
belongs to the bank.
- fix (draft): "ملف الرواتب لرفعه إلى البنك ضمن نظام حماية الأجور".

A5. `web/i18n/ar/home.ts:100` "...مع العميل" (same as M3).
- fix (draft): "المعاش: تأكيد الصندوق".

A6. `web/i18n/ar/home.ts:57`, `ar/reports.ts:16` "بالفلس الصحيح"
reads oddly.
- fix: drop the phrase (as S9).

A7. `data/issues.ts:54` `AR_TBD = ""`: issue reasons would be blank.
- fix: fill the Arabic or fall back to English.

A8. `ar/errors.ts:97`, `:101` "معتمدة" (approved) for claims;
`data/pension.ts:34-36` Arabic marked NEEDS NATIVE REVIEW.
- fix (draft): "مطالبة متفق عليها" for an agreed claim; native review
  of the pension sentence.

A9. `web/nav/groups.ts:18` "الامتثال والسلامة" (compliance)
- fix (draft): "الوثائق والسلامة", to match S6.
