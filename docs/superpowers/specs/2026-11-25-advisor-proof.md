# Advisor's Proof: Features, Technical Superiority, Market

Requested by the owner on 2026-11-25 before any build. Nothing is built.

**What this can and cannot prove.** The evidence supports the feature list
and the design. Part of the technical case is shown by pages we read; the
rest is shown by demos we have not run yet. **The evidence does not prove we
will dominate the market, and no document could.** Section 3 states what
would have to be true and sets targets, not predictions.

**Tags used below**
- **[PAGE]** shown by a rival page we read on 25 Nov 2026 (vendor claim, not
  independently verified).
- **[DEMO@M1]** to be shown by something the owner can run, at a named
  milestone.
- **[BET]** a judgment with no evidence yet.
- "Not on the pages we read" never means "the rival cannot". We have not
  used any rival product.

## Scope (owner decisions)

- 25 Nov: "We are doing HR and payroll. Not a full ERP."
- Later the same day: expense management, accounts payable and spend,
  corporate cards, project billing, the task manager, and intranet and
  chat are **in scope**. **Insurance stays out.** This supersedes the
  earlier fence.

**Build order:** HR and payroll core first. HR-adjacent modules next
(expenses feeding payroll, task manager, intranet and chat). Finance
modules last (accounts payable, spend, corporate cards, project billing),
because cards and payments need licensed partners. That dependency is a
risk to price and plan, not a reason to drop them.

## 1. The feature list, in build order

Rivals read: Bayzat (home, payroll and HR pages), Zoho Payroll (plan
comparison), Zoho People (global pricing page), ZenHR (UAE page), NeuralHR.AI
(AI HRMS page). M1 = pilot-ready, M2 = launch parity, M3 = expand.

### M1: the engine and pay run

| # | Feature | Rivals list it? | Ours |
|---|---|---|---|
| F1 | Employee records with salary breakdown (basic and allowances) | All [PAGE] | Same, basic wage kept separate (gratuity needs it) |
| F2 | Payroll engine with a **per-line trace** | Calculation: all [PAGE]. Per-line trace: not on the pages we read | Every payslip line shows inputs and the rule-pack id |
| F3 | Salary components, revisions, arrears, joiner arrears, unpaid-leave deduction and reversal | Zoho [PAGE] | Same |
| F4 | Gratuity, final settlement, exit process | Zoho, Bayzat, ZenHR [PAGE] | Formula from MOHRE's own post (21 days basic per year for years 1 to 5, 30 after, capped at two years' wages) |
| F5 | GPSSA pension for Emirati and GCC nationals | Zoho lists GPSSA and other schemes [PAGE]; Bayzat's page names GOSI | Required before an Emiratisation tracker makes sense |
| F6 | WPS SIF generator and **pre-submission validator** | All claim a generator; Bayzat says "validated before submission"; NeuralHR.AI claims pre-run checks [PAGE] | Rules cited to sources; format once two documents agree |
| F7 | Excel import and **parallel-run comparison** | Zoho: import [PAGE]; Bayzat: a migration team [PAGE]. Comparison: not on the pages we read | Import, run beside the customer's current payroll, show line-by-line differences |
| F8 | Payslips in Arabic and English | All [PAGE] | Same |
| F9 | Pay-run and salary-revision approvals, separation of duties | Zoho (Professional and up), Bayzat workflows [PAGE] | Preparer cannot approve |
| F10 | Audit trail | Zoho [PAGE]; Bayzat "audit-ready controls" [PAGE] | Hash-chained, append-only |
| F11 | Security baseline: MFA, per-tenant keys, tenant isolation tested on every build | Bayzat holds ISO 27001 and SOC 2 Type 2, ZenHR claims SOC 2 [PAGE] | Strong baseline; **certifications are a gap** |
| F12 | Document and visa expiry alerts | Zoho, Bayzat [PAGE] | Same |

### M2: launch parity

| # | Feature | Rivals list it? | Ours |
|---|---|---|---|
| F13 | Leave management (UAE rules) | Zoho People from its second plan, Bayzat, ZenHR [PAGE] | In the base price |
| F14 | Attendance: web and mobile check-in, GPS, biometric-device import | Zoho People (third plan), Bayzat (GPS, biometric, facial recognition), ZenHR (GPS, QR, ZKTeco) [PAGE] | GPS, geofence and device import first |
| F15 | Shift rostering | All three [PAGE] | Same |
| F16 | Employee self-service, mobile-first web, Arabic and English | All [PAGE] | Same (native app in M3) |
| F17 | Loans, advances, expense reimbursement into payroll | Zoho loans; Bayzat loans and expenses; Keka and Yomly expenses [PAGE] | Loans and advances M2; full expense management M3 (owner scope decision) |
| F18 | HR letters and salary certificates | Zoho; Bayzat with e-signing [PAGE] | Same |
| F19 | Reports: payroll summary, salary register, journal, gratuity liability | Zoho [PAGE]; Bayzat AI reports [PAGE] | Same |
| F20 | Accounting export: Zoho Books, QuickBooks, Xero | Zoho; Bayzat (QuickBooks, Xero); ZenHR (plus Odoo, NetSuite, SAP) [PAGE] | Same, in that order |
| F21 | **Open REST API and signed webhooks on every plan** | Zoho Payroll: webhooks only in Premium [PAGE]. Bayzat and ZenHR APIs: not on the pages we read | All plans |
| F22 | SSO (Google, Microsoft, Okta) and MFA | Bayzat SSO [PAGE]; Zoho SAML and MFA [PAGE] | Same |
| F23 | Emiratisation tracker | Bayzat and NeuralHR.AI claim; Zoho: not listed [PAGE] | Rules from MoHRE sources |
| F24 | ILOE tracking | Not on the pages we read | Rules from the official page |
| F25 | Compliance calendar (WPS dates, document expiries, quota checkpoints) | Not on the pages we read | Included |
| F26 | Billing, published pricing, self-serve onboarding | Zoho publishes prices [PAGE]; others quote-only | Set after a cost model |
| F35 | Air ticket entitlement tracking | Keka [PAGE] | Added after Keka review; M2 |
| F36 | Annual leave salary advance and sick leave payout rules | Keka [PAGE] | Added after Keka review; rules need sources; M2 |

### M3: expand

| # | Feature | Rivals list it? |
|---|---|---|
| F27 | Recruiting and ATS | ZenHR, Bayzat [PAGE] |
| F28 | Performance: goals, 360 feedback | Zoho People (higher plans), Bayzat, ZenHR [PAGE] |
| F29 | AI: explain a payslip, pre-run flags, policy Q&A | Bayzat knowledge hub, NeuralHR.AI, Zoho Zia [PAGE] |
| F30 | Native mobile app | Bayzat, ZenHR [PAGE] |
| F31 | Multi-entity; accountant and PRO console | Zoho multi-entity; Bayzat entities and cost centres [PAGE] |
| F32 | Multi-currency payroll | Bayzat (130 currencies), ZenHR [PAGE] |
| F33 | DIFC (DEWS) and free-zone variants | Zoho DEWS report [PAGE] |
| F34 | Saudi Arabia and other GCC payroll | Bayzat, ZenHR, NeuralHR.AI [PAGE] |

### Owner business decisions (code cannot deliver these)

- **O1 Paying salaries through a bank.** Bayzat advertises bank connections
  for direct transfers and host-to-host payments [PAGE]. Needs a licensed
  partner. Not planned.
- **O2 Insurance brokerage.** Bayzat's core business [PAGE]. Not planned.
- **O3 Security certifications** (ISO 27001, SOC 2). Needs time and money;
  Bayzat holds both [PAGE].

## 2. Why this makes us technically superior

| # | Claim | Tag | How it gets proven |
|---|---|---|---|
| T1 | Every payslip line carries a deterministic trace to inputs and rule version. Per-line trace is not on the pages we read | [PAGE] for the gap; [DEMO@M1] for ours | Run the traced payslip from a sample file |
| T2 | Every statutory value has a source URL and a status; unsourced values refuse to run. Rival pages do not show sources | [PAGE] for the gap; [DEMO@M1] | The engine fails loudly on an unsourced value |
| T3 | Reproducibility: an old pay run re-runs identically under its old rule-pack | [DEMO@M1] | Automated test |
| T4 | Parallel-run onboarding with a line-by-line difference report. **Not unique:** Keka's UAE page also offers parallel payroll runs [PAGE]; our difference is the line-by-line report with sources | [DEMO@M1] | Import a sample, compare against Zoho's free trial output for the same employee |
| T5 | One API for the app and customers; webhooks on every plan. Zoho Payroll gates webhooks to Premium | [PAGE] for Zoho; [DEMO@M2] | Published API reference and live calls |
| T6 | Tenant isolation proven on every build, not by policy | [DEMO@M1] | Automated cross-tenant test; outside penetration test later |
| T7 | AI explains from the trace and never computes pay | [BET] | Built after M2 |

**Where we are not superior, stated plainly.** Breadth today (Bayzat and Zoho
already list most of section 1), certifications, customer count, payments,
insurance, and brand. We start behind on all of them.

**The first proof the owner can run:** at the end of Plan 1, a single command
prints a traced payslip and gratuity for a sample employee. Enter the same
employee in Zoho Payroll's free trial and compare the numbers and the
explanation. If our numbers or our explanation are not better, we know in
days, not months.

## 3. How we win the market (what has to be true)

### What the evidence says

| Fact | Source |
|---|---|
| About 405,733 private establishments and 5.48M workers registered with MOHRE at end-2022; 2025 growth +7.8% establishments and +12.4% workforce | Gulf Today, Gulf News (press, linked in the research notes) |
| 1.4M registered companies at end-2025; SMEs are about 94 to 95% of companies | The National, Gulf News |
| Count of firms with 10 to 250 employees: **not found** | UNVERIFIED |
| Bayzat claims 4,000+ companies and 250,000+ employees: about 1% of the 2022 establishment count | Bayzat (vendor) |
| 64% of surveyed SMEs rely on spreadsheets (130 firms, vendor-run); Bayzat claims 70%+ use no HR software | Vendor-run, small samples |
| Zoho HR plus payroll for 50 employees: about AED 14 to 16 per employee per month (Payroll Standard AED 350 to 450 plus People Professional US$2 per user at the AED 3.6725 peg; People pricing is the global USD page, UAE edition not checked) | Zoho pages, our arithmetic |
| Zoho People is free forever for up to 53 users (employee database, leave, documents) | Zoho People page |
| Routes to customers seen: banks (Zoho with Mashreq, Emirates Development Bank, Wio), free-zone company setup (Bayzat with Creative Zone), accounting integrations, direct sales | Press releases |

**What it means.** The market is large and mostly unpenetrated: the leader
claims about 1% of registered establishments, and many SMEs use spreadsheets.
So the main competitor is the spreadsheet, not only Bayzat. But the price floor
is low (Zoho's bundle, and Zoho People's free tier), so we cannot win on
price, and the leaders already hold certifications and distribution.

### What has to be true for us to win

1. **Parity plus an edge (ours to build).** Section 1 reaches parity by M2;
   the edge is T1 to T6.
2. **Time and money (outside the code).** Public reviews, certifications and
   a track record take months to years.
3. **A route to customers (the owner's).** The evidence shows partnership
   channels (banks, free zones, accountants) matter more than product
   pages. Whether the owner's ERP customers include UAE SMEs is a possible
   channel [BET].

### Staged targets (anchored to the numbers above, not predictions)

| Stage | Target | Anchor |
|---|---|---|
| 1 | 20 paying companies | 0.5% of Bayzat's claimed count |
| 2 | 200 paying companies | 5% of Bayzat's claimed count |
| 3 | 1,000 paying companies | A quarter of Bayzat's claimed count; roughly 0.25% of 2022 establishments |

**Kill or re-scope signal:** if our traced payslip is not clearly better than
Zoho's and Bayzat's for the same employee in the Plan 1 demo, stop and
re-scope before building M2.

## 4. One question for the owner

How do you plan to sell it, and do your ERP customers include UAE SMEs? The
route to customers is the part the code cannot supply.

## 5. Evidence read on 25 Nov 2026 (vendor claims unless noted)

- Bayzat: <https://www.bayzat.com/>, <https://www.bayzat.com/payroll>,
  <https://www.bayzat.com/hr-software>
- Zoho Payroll UAE: <https://www.zoho.com/en-ae/payroll/pricing-comparison/>
- Zoho People (global USD pricing): <https://www.zoho.com/people/zohopeople-pricing.html>
- ZenHR UAE: <https://www.zenhr.com/en/hr-software-uae>
- NeuralHR.AI: <https://neuralhr.ai/en/ai-powered-hrms>
- Labour law and executive regulation (official legislation site):
  <https://uaelegislation.gov.ae/en/legislations/1541/download>,
  <https://uaelegislation.gov.ae/en/legislations/1547/download>
- Gratuity formula: <https://www.arabianbusiness.com/business/uae-gratuity-rules-how-to-calculate-end-of-service-pay>
- Market figures: Gulf News, The National and Gulf Today articles listed in
  the market researcher's report (search-snippet level; not primary datasets)

Open: primary text of Ministerial Resolution 340 of 2026; the SIF layout from
bank documents; the count of firms with 10 to 250 employees.
