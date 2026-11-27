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

Paths: `web/` is `apps/web/src/`, `data/` is `packages/demo-data/src/`.
`{CLIENT}` stands for the client's sector noun, which this document does
not write out. Fix type: `A` sed-safe, no test asserts the old text.
`B` sed-safe, tests assert the old text (listed). `M` manual.

## Counts

| Severity | Found | Fixed here | Left |
|---|---|---|---|
| Embarrassing | 10 | 5 | 5 |
| Medium | 27 | 2 | 25 |
| Nit | 8 | 4 | 4 |
| Total | 45 | 11 | 34 |

Clean: no "compliant", "certified", "guaranteed", "audit-proof", "MOHRE
approved" or "WPS compliant" in any app string (they appear only in docs
that forbid them). No US spelling (one input matcher,
`web/reports/ask/interpret.ts:56`, accepts "cost center" on purpose). No
ISO date or `dd/mm` date in prose. No hyphen-minus before an amount in the
app (U+2212 is used; CSV keeps a hyphen on purpose). No AI claim
(`data/wpe-checks.ts:161` says the checks "do not learn and do not
predict"). No lorem, TODO, stub, seed or placeholder text. No vendor name
in any app string. No Title Case button. Pension for UAE nationals never
shows 0: every screen says "Not computed" (wording varies, see M20).

## Applied in this branch (`copyaudit2`)

Five commits, `pnpm lines` passes, nothing built. No test asserts the old
text (grep of `apps/web/e2e`, `apps/web/tests`, `packages/*/tests`).

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
- N04 `web/people/esign/Sign.tsx:271`, `data/wp7.ts:447`,
  `data/wpe-audit.ts:176`: "..." in a shortened hash is now "…".
- N05 `web/setup/structure/Letters.tsx:48` "The Embassy of Sample Land"
  now "The Embassy of the Addressee".
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

E08 `data/compliance.ts:21`, `data/types.ts:235`, `data/labels-en.ts:63`,
`web/i18n/en/reports.ts:22` (B; `packages/demo-data/tests/content.test.ts:
113` asserts it)
- now: "The rules for {CLIENT}s are not confirmed yet" (four copies). It
  names the sector and does not say which rule.
- to: "Emiratisation targets for this company are not confirmed yet."

E09 {CLIENT} used for the employer in staff-facing copy (B; e2e
`pay.spec.ts:31,32,34` asserts "The {CLIENT} pays")
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

E10 `data/wpe-connect.ts:66,70`, `web/nav/areas/sweep-pay.ts:49`,
`data/wpe-erp.ts:341,342,347,348,359` (B; e2e `sweep-wp19-more.spec.ts:
40,49,52` and `setup-erp.spec.ts:72` assert them)
- now: "Decisions by WhatsApp", "Teams messages", "Messages in Teams", "in
  a Teams channel". Real company names on screen.
- to: "Decisions by message", "Chat messages", "Messages in chat", "in a
  chat channel".

E01 to E05 are in "Applied".

## Medium

Overclaim and hedging
- M11 `data/wpe-policies.ts:59,70,89,120,138,156,199`: seven "As we read
  it, the Labour Law ..." sentences sit in the page body. Rule: hedge only
  in explain text plus one footnote per page. to: move each into the
  explain text, or drop the clause and rely on the footnote. M.
- M12 `web/setup/rules/data.ts:30,38`, `web/me/ask/line.ts:65`,
  `web/i18n/en/explain.ts:11`: "From the law", "Read from the text of the
  law or regulation.", "from the law", "Official source". to: "From the
  law, as we read it", "Read from the law's text, as we read it.", "Law,
  as we read it", "Primary source". M.
- M13 `web/demo/data/run-explain.ts:160-162,168-169`: "The law gives 21
  days ..." and "Deductions the law allows from the gratuity". Its
  sibling `web/reports/cost/source.ts:102` says "As we read the law:".
  to: "As we read the law, it gives 21 days ...", "Deductions the law
  allows, as we read it, ...". M.
- M14 `web/setup/rules/pages.ts:21,22,46`: "The law gives at least",
  "The law allows at most", "At least, by law". to: "At least, as we read
  the law", "At most, as we read the law". `tests/unit/setup-rules.test.ts:
  54` builds its own literal, so it does not break. M.
- M15 `web/reports/screens/Audit.tsx:15-19`: "a fingerprint (SHA-256)",
  "when the chain is checked", "runs in your browser". to: "Each entry
  is linked to the one before it, so an edit or removal shows up when
  the trail is checked. The check detects a change; it does not prevent
  one. It is not a legal proof." M.
- M16 `data/labels-en.ts:40,41` ("Approved", "Rejected", "Pending") are
  hidden only by regex masks at `web/demo/data/home.ts:23`,
  `web/demo/data/moves.ts:23`, `web/demo/data/pay.ts:47`,
  `web/reports/source.ts:105`. to: relabel at source ("Signed off",
  "Declined", "Waiting") and delete the masks. M.

Unfinished states
- M17 `data/wpe-erp.ts:48`: "Test connection: not available yet. No
  request was made." Asserted by e2e `setup-erp.spec.ts:44` and
  `tests/wpe-erp.test.ts:26`. to: "Not connected. No request was made."
  B.
- M18 `web/pay/Fines.tsx:59`: "recovering a fine from pay is not worked
  out yet". to: delete the clause. M.
- M25 `web/setup/rules/RuleList.tsx:51` "Pending change" (e2e
  `rule-change.spec.ts:11`) and `data/time.ts:81` "Leave (pending)"; the
  app says "Waiting" everywhere else. to: "Change waiting", "Leave
  (waiting)". B.

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
- M04 Sections "Time" and "Time off", pages "Leave ...":
  `web/i18n/en/shell.ts:12,14`, `web/i18n/en/timeoff.ts:5`,
  `web/i18n/en/home.ts:146` ("Open Time off"). to: one word per thing.
  M.
- M05 One status, three phrasings: "Held: no IBAN"
  (`web/i18n/en/payrun.ts:59`), "Held out (no IBAN)"
  (`web/i18n/en/home.ts:35`), "Held: bank details"
  (`web/i18n/en/me.ts:11`). to: "Held out: no IBAN" everywhere. M.
- M06 `web/i18n/en/home.ts:6,7`: "1 bank detail holds {month} pay" (the
  headline on Home, quoted in the click script at line 99). to: "1 bank
  detail is holding up {month} pay". M.
- M07 Three names for what-if tools: nav "Pay-structure sandbox"
  (`web/pay/sandbox/Sandbox.tsx:191,231`; e2e `sandbox-ledger.spec.ts:50`),
  "What-if", "Rule change preview". to: "What-if: pay structure". B.
- M08 The Hiring group has "Requisitions" (`web/nav/areas/people-moves.ts:
  10`), "Hiring requests" (`hiring.ts:27`), "Request a hire"
  (`hiring.ts:33`) and "Vacancies" (`people-moves.ts:28`). to: replace
  "Requisitions" with "Open positions". M.
- M09 Leaving has four names: "Resignations" (`people.end`, full label),
  "End employment" (`web/nav/short.ts:30`), "People leaving" (`pay.exit`),
  "Leavers". to: "Leavers" for lists, "End employment" for the action.
  M.
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

Length on mobile
- M21 Buttons over 4 words: "Take back from sign off" (`Bonus.tsx:178`,
  `Commission.tsx:73`; to "Take back"), "Give a loan or advance"
  (`web/pay/Loans.tsx:134`; to "New loan"; e2e `pay.spec.ts:7`), "Plan
  for the next run" (`RuleChange.tsx:126`; to "Plan it"; e2e
  `rule-change.spec.ts:21,26`), "Keep for a legal duty"
  (`web/setup/privacy/Requests.tsx:73`; to "Keep"; e2e `privacy.spec.ts:
  23`), "Fill from the engagement letter" (`web/setup/auditor/
  AuditorAccess.tsx`; to "Fill from letter"; e2e `audit-room.spec.ts:22,
  27`), "See what this role can do" (`web/people/requests/Access.tsx:117`;
  to "What it allows"), "Start again from the template"
  (`web/people/hiring/RequestForm.tsx:242`; to "Use the template"),
  "Print or save as PDF" (`web/reports/inspection/Inspection.tsx:34`; to
  "Print or PDF"). B for the five with e2e, M for the rest.
- M22 Labels over 4 words that a narrow table wraps: `data/wp9.ts:21,23,
  31,33,34,38,40,42` (role powers), `data/wpe-commission.ts:42-48`,
  `web/reports/analysis/Elements.tsx:21` ("Earnings in October, which is
  gross pay"), `web/reports/cost/Employer.tsx:29` ("Gross plus computed
  employer cost, partial"), `web/setup/migration/Parallel.tsx:29` ("Net
  pay for these people, ours"), `data/wpe-prior.ts:27-30`. to: three
  words each; the longer text goes in help text. M. (The nav labels
  themselves are all 3 words or fewer once `web/nav/short.ts` applies.)
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

- N01 `web/i18n/en/home.ts:20` "vs {month}" and the nav label
  "Attendance vs shifts". to: "against". M.
- N03 "End of service" against "End-of-service" for the noun:
  `web/setup/rules/pages.ts:123`, `web/i18n/en/welcome.ts:16`. Noun: "End
  of service"; adjective: "End-of-service gratuity". e2e
  `people-moves.spec.ts:24` matches the adjective. M.
- N06 Dead catalogue strings: `web/i18n/en/shell.ts:23` "Not built yet"
  (`notInDemo`), `web/i18n/en/common.ts:16` "This app is being built. The
  screens come next." (`building`). to: delete both keys and their `ar`
  twins. M.
- N09 `data/wpe-erp.ts:263,358` hard-code "MubinFlow"; `web/brand.ts`
  says it is the only file allowed to. to: pass the name in. M.

Applied nits: N02, N04, N05, N08.

## Which tests assert old text

Only the B items. Update these when the fix is applied:
- E08: `packages/demo-data/tests/content.test.ts:113`.
- E09: `apps/web/e2e/pay.spec.ts:31,32,34`.
- E10: `apps/web/e2e/sweep-wp19-more.spec.ts:40,49,52`,
  `apps/web/e2e/setup-erp.spec.ts:72`.
- M01: `apps/web/e2e/pay.spec.ts:23,24,66,67`.
- M03: `apps/web/e2e/variable-pay.spec.ts:28,53`.
- M07: `apps/web/e2e/sandbox-ledger.spec.ts:50`.
- M17: `apps/web/e2e/setup-erp.spec.ts:44`,
  `packages/demo-data/tests/wpe-erp.test.ts:26`.
- M21: `pay.spec.ts:7`, `rule-change.spec.ts:21,26`, `privacy.spec.ts:23`,
  `audit-room.spec.ts:22,27`.
- M25: `apps/web/e2e/rule-change.spec.ts:11`.

## Automatic fix list

A (sed-safe, no test impact): all applied already (E01 to E05, M00, M19,
N02, N04, N05, N08). Nothing is left in this class.

B (sed-safe, with the test edits above):

```sh
# M03: hyphenate the noun sign-off (review git diff for any verb hit)
sed -i 's/for sign off\b/for sign-off/g; s/from sign off\b/from sign-off/g' \
  apps/web/src/pay/variable/Commission.tsx \
  apps/web/src/pay/variable/Bonus.tsx \
  apps/web/src/pay/variable/bonus-parts.tsx apps/web/src/pay/Ledger.tsx \
  apps/web/src/demo/audit-actions.ts
sed -i 's/Send for sign off/Send for sign-off/; s/Waiting for sign off/Waiting for sign-off/' \
  apps/web/e2e/variable-pay.spec.ts
# M17
sed -i 's/Test connection: not available yet\./Not connected./' \
  packages/demo-data/src/wpe-erp.ts
sed -i 's/not available yet/Not connected/' apps/web/e2e/setup-erp.spec.ts
sed -i 's/not available yet/Not connected/' \
  packages/demo-data/tests/wpe-erp.test.ts
# M25
sed -i 's/"Pending change"/"Change waiting"/' \
  apps/web/src/setup/rules/RuleList.tsx apps/web/e2e/rule-change.spec.ts
```

The M17 test lines are a regex and a substring (`/not available yet/`
and `"not available yet"`); the seds above change both, keep the case of
the new text in step with the app. In the M03 command, "to sign off" (the
verb) does not match, so check the diff only for the `for sign off` hits
in sentences.

M (manual): everything else. Needs an owner decision first: E08 (what to
say about the target), E10 (feature names), M04, M08, M09, M10 (one word
for each thing), M12 (how strong "from the law" may read).
