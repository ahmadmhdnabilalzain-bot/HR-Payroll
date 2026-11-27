# Copy and claims audit 2

Read on 2026-11-27, branch `release` (top 4df6771; f2ba9fd is an
ancestor). Read only except the small fixes listed under "Applied".
`ft5`, `ft6`, `mfa` and `mfb` hold no commit that `release` lacks (0
ahead, 51 to 95 behind), so one read of `release` covers all five.

Scope: user-visible strings in `apps/web/src` (English catalogues and
inline strings) and `packages/demo-data/src`, the nav labels, toasts,
empty states, explain text, help cards, policy library, hiring, bonus,
commission, anomaly, sandbox and referral screens, and the demo docs
(click script, cheat sheet, discovery questions, IT note, personas).
Arabic was not read. About 13,300 string literals were extracted and
checked by pattern, then the flagged screens were read in context.
`apps/web/src/api/mock` was not extracted: no screen imports it (the
demo screens read `src/demo`), so none of its text is user-visible.

The client is not named anywhere in the repo (`LEDGER.md` section 16
says so). So rule 2 was checked as: the vendor name (no hit in any app
string; hits only in docs, see N08) and the client's sector noun used as
if it were the client (M27 and M28). The demo company is by design a
fictional bank, so those two are medium, not embarrassing.

Paths: `web/` is `apps/web/src/`, `data/` is `packages/demo-data/src/`.
`{CLIENT}` stands for the client's sector noun, which this document does
not write out; to find the text, `grep -n bank <file>` at the line given.
Fix type: `A` sed-safe, no test asserts the old text. `B` sed-safe, tests
assert the old text (listed). `M` manual.

## Counts

| Severity | Found | Fixed here | Left |
|---|---|---|---|
| Embarrassing | 8 | 5 | 3 |
| Medium | 30 | 2 | 28 |
| Nit | 10 | 2 | 8 |
| Total | 48 | 9 | 39 |

There are 8 embarrassing items, not 15. The reply lists them plus the
most visible mediums.

Clean: no "compliant", "certified", "guaranteed", "audit-proof", "MOHRE
approved" or "WPS compliant" in any app string (they appear only in docs
that forbid them). No US spelling (one input matcher,
`web/reports/ask/interpret.ts:56`, accepts "cost center" on purpose). No
ISO date or `dd/mm` date in prose (dense rows use "30 Oct", see N10). No
hyphen-minus in `web/` amounts (`formatMoney` uses U+2212; CSV keeps a
hyphen on purpose), but see M29 for strings pre-formatted in
`packages/demo-data`. No AI claim in the app (`data/wpe-checks.ts:161`
says the checks "do not learn and do not predict"); one doc mentions an
AI assistant, see M30. No lorem, TODO, stub, seed or placeholder text. No
vendor name in any app string. No Title Case button. Pension for UAE
nationals never shows 0: every screen says "Not computed" (wording
varies, see M20).

## Applied in this branch (`copyaudit2`)

Four fix commits and this document. `pnpm lines` passes, nothing built.
No test asserts the old text (grep of `apps/web/e2e`, `apps/web/tests`,
`packages/*/tests`, case-insensitive for the engine and rule-pack words).
A fifth commit (a real ellipsis in shortened hashes, a neutral embassy
name) was reverted: `packages/demo-data/tests/wp7.test.ts:179` asserts
three dots. Both stay as findings, N04 and N05.

- E01 `web/pay/variable/source.ts:67,150` "the engine takes" and "the
  engine's deduction rules" now say "the payroll".
- E02 `data/wpe-checks.ts:379,383` "the payroll engine" and "engine's
  figures" now say "the payroll" and "payroll figures".
- E03 `data/wpe-sandbox.ts:53` "the engine computed" now "the payroll
  computed" (matches `web/pay/sandbox/explain.ts:64`).
- E04 `web/setup/rule-change/RuleChange.tsx:85,87,149` "rule pack" now
  "The rules in force keep ...", "The rules in force are unchanged." and
  the label "Rules".
- E05 `web/me/MyHelp.tsx:84` "The toast offers an undo." now "A message
  offers an undo."
- M00 `web/me/ask/line.ts:51-53` "approved hours/work" now "signed-off".
- M19 `data/wpe-bonus.ts:47,121` and `data/wpe-commission.ts:42-66`
  "80 percent" now "80%" (and "80% to 100% of target").
- N02 `web/nav/areas/setup-rules.ts:34` "Deductions rules" now "Deduction
  rules".
- N08 demo docs: vendor name removed from `coverage-2.md`,
  `pending-features.md`, `qa-persona-hr.md`, `qa-persona-it.md`; the
  product name spelled "MubinFlow" in four docs; U+2212 minus in the
  cheat sheet (line 27) and click script (line 117).

Still naming the vendor (manual; history or research): `LEDGER.md` lines
23, 590, 591, 598; `docs/design/2026-11-26-navigation-map.md` lines 201,
394, 912; `docs/demo/copy-audit.md` lines 50-57 (the old audit quotes
it); `docs/research/*` (competitor notes, fine to keep); and
`packages/demo-data/tests/wpe-policies.test.ts:34` (a guard that forbids
the name, keep).

## Embarrassing

E06 `web/setup/rules/data.ts:145-146` (M)
- now: the rounding setting shows "Half up" and "Down".
- to: "Halves round up" and "Round down".

E07 `web/time/more/words.ts:89`, shown at `web/time/more/Clock.tsx:147`
(M)
- now: "Face check-in is not built yet."
- to: delete the sentence (an unfinished state shown in a lede).

E10 `data/wpe-connect.ts:66,70`, `web/nav/areas/sweep-pay.ts:49`,
`data/wpe-erp.ts:341,342,347,348,359` (B; e2e `sweep-wp19-more.spec.ts:
40,49,52` and `setup-erp.spec.ts:72` assert them)
- now: "Decisions by WhatsApp", "Teams messages", "Messages in Teams", "in
  a Teams channel". Real company names on screen.
- to: "Decisions by message", "Chat messages", "Messages in chat", "in a
  chat channel".

E01 to E05 are in "Applied". (E08 and E09 were moved to M27 and M28.)

## Medium

Overclaim and hedging
- M11 `data/wpe-policies.ts:59,70,89,120,138,156,199`: seven "As we read
  it, the Labour Law ..." sentences sit in the page body. Rule: hedge only
  in explain text plus one footnote per page. to: move each into the
  explain text, or drop the clause and rely on the footnote. M.
- M12 `web/setup/rules/data.ts:30,38`, `web/me/ask/line.ts:65`,
  `web/i18n/en/explain.ts:11`: "From the law", "Read from the text of the
  law or regulation.", "from the law", "Official source". These are page
  labels, so keep the hedge out of them. to: "Law", "Taken from the text
  of the law.", "law", "Primary source"; the explain text and the page
  footnote carry "as we read it". M.
- M13 `web/demo/data/run-explain.ts:160-162,168-169`: "The law gives 21
  days ..." and "Deductions the law allows from the gratuity". This is
  explain text, where the hedge belongs; its sibling
  `web/reports/cost/source.ts:102` says "As we read the law:". to: "As we
  read the law, it gives 21 days ...", "Deductions the law allows, as we
  read it, ...". M.
- M14 `web/setup/rules/pages.ts:21,22,46`: "The law gives at least",
  "The law allows at most", "At least, by law" (page labels, no hedge).
  to: "At least", "At most", "At least"; the status pill beside each rule
  already says where it comes from. `tests/unit/setup-rules.test.ts:54`
  builds its own literal, so it does not break. M.
- M15 `web/reports/screens/Audit.tsx:15-19`: "a fingerprint (SHA-256)",
  "when the chain is checked", "runs in your browser". to: "Each entry
  is linked to the one before it, so an edit or removal shows up when
  the trail is checked. The check detects a change; it does not prevent
  one. It is not a legal proof." M.

Unfinished states
- M17 `data/wpe-erp.ts:48`: "Test connection: not available yet. No
  request was made." Asserted by e2e `setup-erp.spec.ts:44` and
  `tests/wpe-erp.test.ts:26`. to: "Not connected. No request was made."
  B.
- M18 `web/pay/Fines.tsx:59`: "recovering a fine from pay is not worked
  out yet". to: delete the clause. M.
- M25 `web/setup/rules/RuleList.tsx:51` "Pending change" (JSX text; e2e
  `rule-change.spec.ts:11` asserts it) and `data/time.ts:81` "Leave
  (pending)"; the app says "Waiting" everywhere else. to: "Change
  waiting", "Leave (waiting)". B.
- M30 `docs/demo/2026-11-27-click-script.md:508` lists "an AI assistant"
  under "Not built yet"; `docs/demo/pending-features.md:31` lists "AI
  assistant and cited policy Q&A". The product is rule-based and says so.
  to: delete both mentions. M.

Inconsistent terms
- M01 Decisions are "Sign off" (pay run), "Book" (leave) and "Agree"
  (claims): `web/pay/Expenses.tsx:56,62,118,137,164`, `web/pay/parts.tsx:
  80,118,168,174`, `data/wpe-connect.ts:60` ("Reply YES to agree"). to:
  "Sign off", "Signed off by", toast "Claim signed off". e2e
  `pay.spec.ts:23,24,66,67` assert "Agree" and "Agreed by". B.
- M02 "Ticket" means an air ticket and a help-desk case:
  `web/people/requests/HelpDesk.tsx:20,35,47,59,77`,
  `web/people/requests/Thread.tsx:27`, `web/me/MyAsks.tsx:191`,
  `web/me/MyHelp.tsx:41,71,72`. to: "Question" for the help desk ("No
  questions.", "Open the question later ...", "Answer an HR question").
  Keep "Ticket" for travel. M.
- M03 Noun "sign-off" without the hyphen: "Waiting for sign off"
  (`web/pay/variable/Commission.tsx:29`, `bonus-parts.tsx:8`,
  `web/pay/Ledger.tsx:63`), "Take back from sign off" (`Commission.tsx:
  73`, `Bonus.tsx:178`), "Send for sign off" (`Bonus.tsx:159`), "Sent
  for sign off by" (`Bonus.tsx:199`), `web/demo/audit-actions.ts:278,280`.
  Elsewhere "Waiting for sign-off" (`data/labels-en.ts:42`,
  `data/wpe-hiring.ts:361`). to: hyphenate the noun. e2e
  `variable-pay.spec.ts:28,53` assert the old text. B.
- M04 The leave section has two names. `web/i18n/en/shell.ts:12`
  `navTimeOff` "Time off", `:14` `navTime` "Time"; `web/i18n/en/
  timeoff.ts:5` "Time off", `:9,49` "Request time off";
  `web/i18n/en/shell.ts:60` "Request time off"; `web/i18n/en/home.ts:146`
  "Open Time off"; pages are "Leave requests", "My leave". to: "Leave" in
  all of these ("Request leave", "Open leave"). e2e `time-finish.spec.ts:
  15` asserts "Request time off". B.
- M05 One status, three phrasings: "Held: no IBAN"
  (`web/i18n/en/payrun.ts:59`), "Held out (no IBAN)"
  (`web/i18n/en/home.ts:35`), "Held: bank details"
  (`web/i18n/en/me.ts:11`). to: "Held out: no IBAN" everywhere. M.
- M06 `web/i18n/en/home.ts:6,7`: "1 bank detail holds {month} pay" (the
  headline on Home, quoted in the click script at line 99). to: "1 bank
  detail is holding up {month} pay". M.
- M07 Three names for what-if tools: `web/nav/areas/sandbox.ts:9`
  "Pay-structure sandbox" (also `web/pay/sandbox/Sandbox.tsx:191,231`;
  e2e `sandbox-ledger.spec.ts:50`), `web/nav/areas/payroll-extras.ts:19`
  "What-if", `web/nav/areas/rule-change.ts:11` "Rule change preview".
  to: "What-if: pay structure", "What-if: pay checks", "What-if: rule
  change". B.
- M08 The Hiring group has "Requisitions" (`web/nav/areas/people-moves.ts:
  10`), "Hiring requests" (`hiring.ts:27`), "Request a hire"
  (`hiring.ts:33`) and "Vacancies" (`people-moves.ts:28`). to: replace
  "Requisitions" with "Open positions". M.
- M09 Leaving has four names: "Resignations" (`web/nav/areas/
  people-moves.ts:48`), "End employment" (`web/nav/short.ts:30`),
  "People leaving" (`web/nav/areas/sweep-pay.ts:27`), "Leavers"
  (`people-moves.ts:38`). to: "Leavers" for the lists, "End employment"
  for the action; rename "Resignations" and "People leaving". M.
- M10 One file, three names: "Salary file", "WPS file" (`web/nav/short.ts:
  76`, `web/setup/rules/pages.ts:175,183`, `data/payroll.ts:34`,
  `data/wpd-structure.ts:248`), "Bank advice". to: "Salary file" on
  screen, "(WPS)" once in the explain text. M.
- M20 Pension wording varies: "is not included" (`web/i18n/en/payrun.ts:
  21`), "is not computed" (`web/reports/more/source.ts:97`), "Pension: not
  computed" (`data/pension.ts:78`), "stays not computed"
  (`data/wpe-bonus.ts:52`, `data/wpe-commission.ts:62`); and "is Not
  computed" with a capital mid-sentence (`data/wpe-sandbox.ts:54`,
  `web/pay/sandbox/explain.ts:25,26`). to: "Not computed" as a label,
  "not computed" in a sentence. e2e match "Not computed" as a substring
  without case, so they hold. M.
- M26 `web/i18n/en/home.ts:108,116,167`: "Decisions", "Waiting for you",
  "Waiting for a decision" label one list. to: "Waiting for you". M.
- M27 (was E08) the sector noun in a vague rule line: `data/
  compliance.ts:21`, `data/types.ts:235`, `data/labels-en.ts:63`,
  `web/i18n/en/reports.ts:22`; `packages/demo-data/tests/content.test.ts:
  113` asserts it. now: "The rules for {CLIENT}s are not confirmed yet"
  (four copies); it does not say which rule. to: "Emiratisation targets
  for this company are not confirmed yet." B.
- M28 (was E09) the sector noun for the employer. e2e `pay.spec.ts:31,
  32,34` asserts "The {CLIENT} pays". B for the first, M for the rest.
  - `web/pay/Fines.tsx:23,39,45,58,102`: "The {CLIENT} pays", "Fines on
    {CLIENT} cars". to: "The company pays", "Fines on company cars".
  - `data/pay.ts:365,366,371`: "Speeding, {CLIENT} car", "The {CLIENT}
    pays". to: "company car", "The company pays".
  - `web/pay/Loans.tsx:153`: "the {CLIENT}'s own limits apply". to: "the
    company's own limits apply".
  - `web/people/exit/words.ts:13`: "The {CLIENT} has one leaver in this
    sample." to: "One leaver in this sample."
  - `data/wpe-requests.ts:104`: "{CLIENT}'s own ticket policy". to: "the
    company's own ticket policy".
  - Keep "bank" where it means the bank that receives the file (IBAN,
    routing code, bank details, the salary file's bank).
- M29 Hyphen-minus in strings pre-formatted in the data package (the web
  `formatMoney` uses U+2212, these bypass it): `data/wpe-sandbox.ts:
  187-189` (`signedAed`, shown as "Net pay moves by -AED ..." at `:309`),
  `data/pay.ts:32-33`, `data/wpe-rule-change.ts:124-125`, `data/wp7.ts:
  40,46` (`"-"` before `formatAed` and before the percent). The engine's
  `formatAed` (`packages/engine/src/money.ts:32`) emits "-AED". to: build
  the sign as "−" plus `formatAed` of the absolute value, as
  `data/wpe-payroll-extras.ts:35` already does. Assertions on these strings
  need a check first. M.

Length on mobile
- M21 Buttons over 4 words: "Take back from sign off" (`Bonus.tsx:178`,
  `Commission.tsx:73`; to "Take back"), "Give a loan or advance"
  (`web/pay/Loans.tsx:134`; to "New loan"; e2e `pay.spec.ts:7`), "Plan
  for the next run" (`RuleChange.tsx:126`; to "Plan it"; e2e
  `rule-change.spec.ts:21,26`), "Keep for a legal duty"
  (`web/setup/privacy/Requests.tsx:73`; to "Keep"; e2e `privacy.spec.ts:
  23`), "Fill from the engagement letter" (`web/setup/auditor/
  AuditorAccess.tsx:82`; to "Fill from letter"; e2e `audit-room.spec.ts:
  22,27`), "See what this role can do" (`web/people/requests/
  Access.tsx:117`; to "What it allows"), "Start again from the template"
  (`web/people/hiring/RequestForm.tsx:242`; to "Use the template"),
  "Print or save as PDF" (`web/reports/inspection/Inspection.tsx:34`; to
  "Print or PDF"). B for the five with e2e, M for the rest.
- M22 Labels over 4 words that a narrow table wraps. to: three words.
  `data/wp9.ts:21` "See own payslips and leave" to "Own pay and leave",
  `:23` "See the people who report to them" to "Their team", `:31`
  "Prepare a pay run and settlements" to "Prepare pay runs", `:33` "Sign
  off a pay run" to "Sign off pay", `:34` "Create and send the salary
  file" to "Send salary file", `:38` "Add users and change roles" to
  "Manage users", `:40` "Sign off the access review" to "Sign off
  access", `:42` "Manage API keys and webhooks" to "Manage API keys";
  `data/wpe-commission.ts:42-48` "Up to 80% of target" to "Under 80%";
  `web/reports/analysis/Elements.tsx:21` "Earnings in October, which is
  gross pay" to "Gross pay, October"; `web/reports/cost/Employer.tsx:29`
  "Gross plus computed employer cost, partial" to "Gross plus employer
  cost"; `web/setup/migration/Parallel.tsx:29` "Net pay for these people,
  ours" to "Net pay, ours"; `data/wpe-prior.ts:27` "Salary certificate
  from the employer" to "Salary certificate", `:29` "Letter of offer or
  contract" to "Offer or contract", `:30` "Told to HR, no paper yet" to
  "Told to HR". M. (The nav labels themselves are all 3 words or fewer
  once `web/nav/short.ts` applies.)
- M23 Docs name the client noun in titles and prose:
  `docs/demo/2026-11-27-click-script.md:1,6,15,54,99` and others (seven
  lines), `2026-11-27-discovery-questions.md:1,8` and others (four
  lines), `2026-11-27-it-manager-note.md:38,68`, `qa-persona-hr.md:1`.
  to: "the client" or "your team". M.
- M24 Placeholder data is called "Demo", "Sample", "Example" and
  "Fictional": "Demo terms" (`web/people/referrals/explain.ts:18,22`,
  `data/wpe-referrals.ts:41`), "Sample, to confirm with counsel"
  (`web/setup/privacy/Settings.tsx:7`), "Example policy". to: use
  "Sample". M.

## Nit

- N01 `web/i18n/en/home.ts:20` "vs {month}" and `web/nav/areas/time.ts:49`
  "Attendance vs shifts". to: "against {month}", "Attendance against
  shifts". M.
- N03 "End of service" against "End-of-service" for the noun:
  `web/setup/rules/pages.ts:123`, `web/i18n/en/welcome.ts:16`. Noun: "End
  of service"; adjective: "End-of-service gratuity". e2e
  `people-moves.spec.ts:24` matches the adjective. M.
- N04 `web/people/esign/Sign.tsx:271`, `data/wp7.ts:447`,
  `data/wpe-audit.ts:176`: "..." in a shortened hash. to: "…". B:
  `packages/demo-data/tests/wp7.test.ts:179` asserts three dots (update
  the regex first).
- N05 `web/setup/structure/Letters.tsx:48` "The Embassy of Sample Land"
  is a placeholder default. to: leave blank with the hint "Addressee".
  M.
- N06 Dead catalogue strings: `web/i18n/en/shell.ts:23` "Not built yet"
  (`notInDemo`), `web/i18n/en/common.ts:16` "This app is being built. The
  screens come next." (`building`). to: delete both keys and their `ar`
  twins. M.
- N07 `data/labels-en.ts:40,41` ("Approved", "Rejected", "Pending") have
  no reader found, but four regex masks (`web/demo/data/home.ts:23`,
  `web/demo/data/moves.ts:23`, `web/demo/data/pay.ts:47`,
  `web/reports/source.ts:105`) rewrite "approved" in package text, which
  means the source still says it. to: relabel at source ("Signed off",
  "Declined", "Waiting") and delete the masks. M.
- N09 `data/wpe-erp.ts:263,358` hard-code "MubinFlow"; `web/brand.ts`
  says it is the only file allowed to. to: pass the name in. M.
- N10 Date and amount forms differ from the standard ("27 October 2026",
  "AED 933,730.94"): dense rows show "30 Oct" (`formatDayMonth` in
  `web/i18n/format.ts`, used by `web/payrun/RunBar.tsx` and Home lists), prose drops the year
  (`shortDateText`), `data/wpe-more.ts:232` says "AED 50,000", and
  `web/ui/templates/Chart.tsx:270` writes a compact "AED 1.2m" axis. Fine
  for dense UI; to: keep the year in any date a person might copy into a
  letter, and write "AED 50,000.00" in prose. M.

Applied nits: N02, N08.

## Which tests assert old text

Only the B items. Update these when the fix is applied:
- M27: `packages/demo-data/tests/content.test.ts:113`.
- M28: `apps/web/e2e/pay.spec.ts:31,32,34`.
- E10: `apps/web/e2e/sweep-wp19-more.spec.ts:40,49,52`,
  `apps/web/e2e/setup-erp.spec.ts:72`.
- M01: `apps/web/e2e/pay.spec.ts:23,24,66,67`.
- M03: `apps/web/e2e/variable-pay.spec.ts:28,53`.
- M04: `apps/web/e2e/time-finish.spec.ts:15`.
- M07: `apps/web/e2e/sandbox-ledger.spec.ts:50`.
- M17: `apps/web/e2e/setup-erp.spec.ts:44`,
  `packages/demo-data/tests/wpe-erp.test.ts:26`.
- M21: `pay.spec.ts:7`, `rule-change.spec.ts:21,26`, `privacy.spec.ts:23`,
  `audit-room.spec.ts:22,27`.
- M25: `apps/web/e2e/rule-change.spec.ts:11`.
- N04: `packages/demo-data/tests/wp7.test.ts:179`.

## Automatic fix list

A (sed-safe, no test impact): all applied already (E01 to E05, M00, M19,
N02, N08). Nothing is left in this class.

B (sed-safe, with the test edits above). Dry-run each with `sed -n
's/.../.../p'` first.

```sh
# M03: hyphenate the noun sign-off (every hit below is the noun)
sed -i 's/for sign off\b/for sign-off/g; s/from sign off\b/from sign-off/g' \
  apps/web/src/pay/variable/Commission.tsx \
  apps/web/src/pay/variable/Bonus.tsx \
  apps/web/src/pay/variable/bonus-parts.tsx apps/web/src/pay/Ledger.tsx \
  apps/web/src/demo/audit-actions.ts
sed -i 's/Send for sign off/Send for sign-off/; s/Waiting for sign off/Waiting for sign-off/' \
  apps/web/e2e/variable-pay.spec.ts
# M17 (source, then the two tests)
sed -i 's/Test connection: not available yet\./Not connected./' \
  packages/demo-data/src/wpe-erp.ts
sed -i 's/not available yet/Not connected/' apps/web/e2e/setup-erp.spec.ts
sed -i 's/not available yet/Not connected/' \
  packages/demo-data/tests/wpe-erp.test.ts
# M25: the source is JSX text, the e2e is a quoted name
sed -i 's/>Pending change</>Change waiting</' \
  apps/web/src/setup/rules/RuleList.tsx
sed -i 's/"Pending change"/"Change waiting"/' apps/web/e2e/rule-change.spec.ts
```

The M17 test edits change a regex and a string, so keep the capital "N"
consistent with the app. M (manual): everything else. Needs an owner
decision first: M27 (what to say about the target), E10 (feature names),
M04, M08, M09, M10 (one word for each thing), M12 (page label wording).
