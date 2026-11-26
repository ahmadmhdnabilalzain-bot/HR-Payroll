# Coverage 3: the demo against the navigation map, after wave 4

Date 2026-11-26. Build: branch claude/quirky-wozniak-b7xkvr, HEAD 2d8e196.
Updated 2026-11-26 on branch features (ft1, ft2 and ft3 merged): 7 more rows
live, see section 3a; the counts below are the updated ones.
Updated 2026-11-26 on branch release (motion, features and ft4 merged): no
change to the count. P20 is now Hiring budget and stays live; hiring
requests sit under P10, which was live already. See section 3b.
Map: docs/design/2026-11-26-navigation-map.md, section 8 (207 UAE-scope rows:
208 less R45, Saudi payroll). Method as in docs/demo/coverage-2.md. Coverage 2
was counted at HEAD 0448198 (160 live).

## 1. Method

- The registry was read by importing ALL_AREAS from apps/web/src/nav/areas in
  a throwaway vitest run (scratch folder, not committed): 186 areas, all
  status "live" (coverage 2 had 160). No hand copy and no grep count.
- Each of the 207 rows was mapped to its area or host screen with the
  coverage-2 mapping. The 26 areas added since were mapped to the rows below.
- A fresh vite build went to a scratch folder and was served on port 4230.
  Every newly live row was opened by its route, as a role the area lists
  (HR manager, General manager, IT manager, Employee), in a Chromium page at
  1280 px. Each opened a real screen: the heading names the feature, the page
  has body text, and there were no page errors.
- Rows that name several things need all of them (coverage-2 rule). Sample
  data counts as demo data, not as a gap.

## 2. Headline

| Measure | Rows | Share |
|---|---|---|
| UAE-scope rows (base) | 207 | 100% |
| Live | 183 | 88.4% |
| Partial | 5 | 2.4% |
| Missing | 19 | 9.2% |
| of which skipped on purpose | 8 | |
| Target, 80% of 207 | 166 | met, 17 rows over |
| Live without the 8 skipped rows | 183 of 199 | 92.0% |

HR and payroll rows: the 207 are the HR and payroll rows already. The other
Manar One modules are section 9 of the map and are not in the base. So the HR
and payroll figure is 183 of 207, 88.4 percent. The 80 percent target was
reached at 166; coverage 2 stood at 160 (77.3 percent), so wave 4 added 16
live rows and moved 2 partial rows to live (176), and the features merge
added 7 more (183).

| Origin | Rows | Live | Share |
|---|---|---|---|
| Manar-origin (M and B) | 145 | 137 | 94.5% |
| Market-only (K), in scope | 62 | 46 | 74.2% |

If the 5 partial rows were finished: 188 of 207, 90.8 percent.

## 3. Rows that became live since coverage 2 (16)

All opened and checked on the 4230 build.

| ID | Row | Area id | Opened as | Heading seen |
|---|---|---|---|---|
| S25 | Auditor access | setup.auditor | IT manager | Auditor access |
| X33 | Inspection pack, auditor room | reports.inspection | General manager | Inspection pack |
| X37 | Error-remedy record | reports.error-remedies | General manager | Error-remedy record |
| S26 | Privacy office, retention | setup.privacy, privacy-register, privacy-requests, privacy-run | IT, HR | Privacy and retention; Personal data kept; Retention run |
| P67 | Compensation planning | people.comp-plan | HR manager | Compensation planning |
| P68 | Workforce planning | people.workforce-plan | General manager | Workforce planning |
| X13 | Cost and budget view | reports.cost-budget | General manager | Cost and budget |
| X35 | Payroll forecast, plan vs actual | reports.forecast | General manager | Payroll forecast |
| S43 | ERP integration | setup.erp | IT manager | ERP connection |
| S35 | Accounting sync (GL posting) | setup.gl | HR manager | General ledger |
| S36 | Slack and Teams | setup.teams | IT manager | Teams messages |
| P34 | Verifiable letters (code) | people.letter-codes, letter-check | HR manager | Verifiable letters |
| P54 | Document intake, provenance | people.doc-intake | HR manager | Document intake |
| S09 | Rule-change preview, notice | setup.rule-change | HR manager | Rule change preview |
| T07 | Holidays, comp-off, grants | setup.public-holidays, time.comp-off, time.grants | HR manager | Comp-off days; Leave grants |
| E14 | Report a safety incident | me.report-incident | Employee | Report a safety incident |

Work packages: WP22 (S25, X33, X37), WP23 (S26), WP25 (P67, P68, X13, X35),
WP26 (S43, S35, S36), WP27 (P34, P54), WP28 (S09), WP31 (T07, E14). Also
live now and not new rows: people.doc-expiry (expiry list) and the signing
areas (WP27 and the earlier e-signature work), which sit under rows already
counted.

Judgement call: H12 stays partial. WP31 added a "Video to record" marker to
each help card, but no card has a real clip, and the row says videos. If the
owner accepts markers, live is 177 (85.5 percent).

## 3a. Rows that became live in the features merge (7)

Branch features = claude/quirky-wozniak-b7xkvr plus ft1, ft2 and ft3. The
registry now has 193 areas, all live (186 plus the 7 below). Each was opened
as HR manager and General manager on a fresh build, at 1440 px and at 360,
393 and 430 px: the heading names the feature, no page errors, no page-level
overflow, and nothing shows a figure while amounts are hidden.

| ID | Row | Area id | Route | Heading seen |
|---|---|---|---|---|
| R13 | Off-cycle and bonus runs | pay.bonus | #/pay-run/bonus | Bonus runs |
| P66 | Sales commission statements | pay.commission | #/pay-run/commission | Sales commission |
| R43 | AI anomaly checks | reports.anomalies | #/reports/anomalies | Anomaly checks |
| P20 | Cost-of-hire preview | people.hiring-budget (was people.cost-of-hire) | #/people/hiring/budget (was #/reports/cost-of-hire) | Hiring budget |
| X12 | Report templates library | reports.templates | #/reports/templates | Report templates |
| R41 | Pay-structure sandbox | pay.sandbox | #/pay-run/more/sandbox | Pay-structure sandbox |
| P22 | Referral and agency ledger | people.referrals | #/people/moves/referrals | Referrals and agencies |

R13 moves from partial to live (the off-cycle list now has a bonus run with
prepare, review and GM sign off). The other six were missing. The employee
sees an own commission statement on My payslips once the month is signed off.
Judgement call: R43 is rule-based checks with a reason per flag, not a model;
it is counted live because the row asks for run-level flags before paying.

## 3b. The ft4 merge (hiring budget and hiring requests): still 183

Branch release = motion plus features plus ft4. ft4 removes the
people.cost-of-hire area and its route and adds three areas:
people.hiring-budget (P20, HR and GM), people.hiring-requests (P10, HR and
GM) and requests.hire (P10, "Request a hire" for a team manager). The
registry now has 195 areas (193 less 1 plus 3). The search still finds
"cost of hire".

- P20 Cost-of-hire preview: live, now Hiring budget at #/people/hiring/budget
  (one row per budgeted seat, first-year cost worked out like a payslip,
  committed, offered and left). Heading seen: "Hiring budget".
- P10 Hiring: requisitions: was live (people.requisitions) and stays live;
  hiring requests (#/people/hiring/requests, heading "Hiring requests") add
  raise, HR review, GM sign-off and a timeline to it. No new row.

So live stays 183 of 207 (88.4 percent); partial 5, missing 19.

## 4. Wave 4 work packages not yet landed

Update: WP21 (bonus run) and WP30 (commission) have landed (section 3a), and
the anomaly checks of WP29 have landed; the ask screens of WP29 have not. The
paragraph below is as counted at HEAD 2d8e196.


No registry area exists for WP20 (pension in the run), WP21 (bonus run),
WP24 (Arabic review), WP29 (ask and explain) or WP30 (commission). The code
agrees: pension still reads "Not computed" on the payslip, the pension
register and the employer cost report; the off-cycle screen says "There is no
bonus run this year"; DEMO_AR_REVIEWED is false, so Arabic stays behind
?ar=1; no ask screen or anomaly checks exist; no commission area exists.

## 5. Rows not live, 24 in all, by priority for the 80 percent target

Target already met, so the order is value to the bank HR manager, General
manager and IT manager: law and money first, then time saved, then nice to
have, then rows that do not fit a bank, then skipped on purpose. Status:
partial, missing (not built), not for a bank, skipped.

| # | ID | Row | Status | Reason |
|---|---|---|---|---|
| 1 | R08 | Pension in the run (GPSSA) | partial | pension shown as "Not computed"; fund rate unconfirmed (WP20) |
| 2 | P44 | Pension (GPSSA) register | partial | register of 14 nationals, no contribution figures (WP20) |
| 3 | X04 | Employer cost and costing | partial | employer cost leaves pension out and says so (WP20) |
| 4 | S41 | Arabic screens (switch) | partial | hidden unless ?ar=1; labels not native-reviewed (WP24) |
| 5 | H12 | Help and training videos | partial | how-to cards with a "Video to record" marker, no clips |
| 6 | H15 | AI assistant, cited policy Q&A | missing | not built (WP29) |
| 7 | E16 | Ask about a payslip line | missing | not built (WP29) |
| 8 | R47 | Direct WPS submission | missing | not built; file download only |
| 9 | X34 | Ask for a report in words | missing | not built |
| 10 | H16 | Agent actions you confirm | missing | not built |
| 11 | P21 | AI resume screening | missing | not built |
| 12 | R42 | Pay from evidence (KPI pay) | missing | not built |
| 13 | R46 | Earned wage access, cards | missing | not built |
| 14 | R40 | Multi-currency payroll | not for a bank | the bank pays in AED |
| 15 | R44 | DIFC DEWS, other GCC pensions | not for a bank | bank is mainland, not DIFC; GCC part dropped by owner ruling |
| 16 | X09 | Recharges between companies | not for a bank | one company in the data |
| 17 | H13 | Team chat and intranet | skipped | the bank has its own intranet and chat |
| 18 | H14 | Meetings with transcript | skipped | meeting tools sit outside HR |
| 19 | P49 | Labour crews and documents | skipped | labour crews, not a bank workforce |
| 20 | P50 | Accommodation (camps) | skipped | labour camps, not a bank workforce |
| 21 | P55 | Sector packs, licence gates | skipped | construction licence gates |
| 22 | S07 | Trades | skipped | not a bank workforce |
| 23 | S42 | Bureau console (accountants) | skipped | for accountancy firms |
| 24 | X36 | Public accuracy scoreboard | skipped | vendor marketing scoreboard |

Counts: 5 partial, 11 missing (rows 6 to 13 and
the 3 "not for a bank" rows), 8 skipped. 5 + 11 + 8 = 24, and
207 - 183 = 24.

Out of scope: R45, Saudi payroll: other country.

## 6. Notes

- The two registry faults from coverage 2 (setup.parallel and setup.cover
  are Setup areas that the IT manager is offered but the route refuses) were
  not re-tested here.
- Not re-opened: the 160 rows live at coverage 2 and unchanged. Only the
  registry and the 20 newly live routes plus me.help were opened.
- The built check used the HR manager as the default role and the role menu
  for others. Phone width was not part of this count.
