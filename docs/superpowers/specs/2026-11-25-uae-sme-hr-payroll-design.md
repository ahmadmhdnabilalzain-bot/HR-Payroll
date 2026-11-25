# UAE SME HR & Payroll: Design and Build Plan (DRAFT for approval)

Status: **draft, not approved. No code has been written.** Evidence base: `docs/research/2026-11-25-competitor-analysis.md` plus a verification batch on 25 Nov 2026 (links below). Where a fact is not confirmed, it is marked **UNVERIFIED** and is checked in Phase 0.

## 1. Intent

Build the HR and payroll product UAE SMEs (about 10 to 250 employees, mainland first) trust most for **getting people paid correctly and legally**, and make that trust provable. The plan below defines "strongest" as a scorecard we can measure against Zoho, Bayzat, ZenHR and NeuralHR.AI, then orders the work so every phase moves a row.

Why this is the right target: the competitor research shows the open gaps are trust and operations (opaque pricing, slow support, payroll errors with no ownership, no public proof of UAE depth). Compliance claims are cheap (NeuralHR.AI, ZenHR and Bayzat all claim WPS, gratuity and MOHRE support), so the winning move is **proof, not claims**.

## 2. Goals, non-goals, anti-goals

**Goals**
- Pay runs that are correct, explainable and reproducible, including edge cases (mid-month joiners and leavers, unpaid leave, overtime, final settlement).
- Zero WPS file rejections for customers.
- Setup from signup to a first parallel-run payroll in one business day for a company of up to 50 employees.
- Published, flat, all-in AED pricing. Full API and webhooks on every plan.
- Arabic and English from the first screen, including payslips.

**Non-goals for v1**
- Moving or holding salary money (files-only, see section 6 and risk R1).
- Recruiting, performance management, learning, benefits and insurance brokerage.
- Free zones (DIFC/ADGM), Saudi Arabia and other GCC countries.
- A native mobile app (a mobile-first web app first).

**Anti-goals (a failure even if it technically works)**
- A product that looks complete but cannot show how a payslip number was derived.
- AI that computes or changes pay.
- Quote-only pricing or a feature matrix that hides the gaps.

## 3. Constraints

- Statutory rules change (WPS changed on 1 June 2026). Rules must be data, not code scattered across the app.
- No public MoHRE API for third-party HR software was found, so v1 integrates through files and the customer's own bank, not through government systems.
- Salary, bank and ID data are sensitive. UAE PDPL applies; its executive regulations were reportedly still pending in mid-2026 (UNVERIFIED).
- Unknown inputs: team size, funding and timeline (section 9). Durations below are indicative and assume 2 to 3 engineers.

## 4. Approaches considered

| Approach | What it is | Verdict |
|---|---|---|
| **1. Deterministic UAE-first engine, files-only, AI explains (chosen)** | Own the payroll engine and rules as versioned data; generate and validate WPS files; customer submits via their bank; AI only explains and flags | Fits the evidence: it makes correctness provable, avoids licensing, and is buildable by a small team |
| 2. AI-first "agentic" HRMS | Agents execute workflows end to end | NeuralHR.AI already claims this, with no independent proof; payroll must be deterministic and auditable, so AI cannot be the core |
| 3. Thin layer over an existing payroll provider | White-label another engine | No UAE embedded-payroll provider was found; it would give up the correctness advantage and the margin |

Chosen: **approach 1.** (My call; you approve or change it.)

## 5. "Strongest" as a scorecard

Baselines come from the 25 Nov 2026 verification batch; "none public" means no competitor publishes it.

| # | Dimension | Competitor baseline | Our target |
|---|---|---|---|
| 1 | Payroll correctness, measured by a **published golden-scenario suite** (gratuity, WPS, overtime, joiners, leavers, unpaid leave, final settlement) | None published by anyone | 100% pass on 300+ scenarios at launch; the suite and results are public |
| 2 | WPS file rejections by banks | none public | 0 in pilots and at launch; tracked per customer |
| 3 | Signup to first parallel-run payroll (up to 50 employees) | NeuralHR.AI claims "inside the demo" (vendor, unproven); others not stated | at most 1 business day via Excel import |
| 4 | Price | Zoho Payroll AED 45 to 90/org/month incl. 5 staff, plus AED 9 to 18 per extra employee (verified); leave/attendance only in Premium; NeuralHR.AI $10/user/month (about AED 37 at the AED 3.6725/USD peg, vendor-stated); others quote-only | one flat all-in price per employee, hypothesis AED 15 to 20 per month with no base fee. **To be validated with pilots** |
| 5 | API and webhooks | Zoho: webhooks only in Premium; others unknown | full API and webhooks on every plan |
| 6 | Arabic | ZenHR strong (bilingual web and mobile, vendor-stated) | full RTL UI, Arabic payslips and Arabic self-service from the first screen |
| 7 | Support | slow or email-only complaints across vendors | published response times; first response within one business hour on WPS deadline days |
| 8 | Security and certification | ZenHR claims SOC 2 Type II and ISO 27001; Zoho lists SOC and ISO 27001 | start with a strong baseline (section 6); target ISO 27001 and SOC 2 Type I within 12 months of launch. This is a gap we close, not a lead we have |
| 9 | Explainability | NeuralHR.AI claims explainable AI (vendor) | every payslip line traces to its inputs and the rule version that produced it |

## 6. Technical design

Each call is mine, with one line of reasoning. You approve the set, not each line.

**Payroll engine**
- A pure library with no database or network access, so it can be tested exhaustively. *Reason: correctness is the product.*
- Money in integer fils (no floating point), with explicit, documented rounding rules. *Reason: reproducibility.*
- Statutory rules (gratuity tiers, overtime multipliers, WPS validation, Emiratisation thresholds) stored as **versioned, effective-dated data**, never hard-coded. *Reason: laws change on a date, and old runs must stay reproducible.*
- A finalised pay run is immutable. Corrections are new, linked runs. Every payslip line records its inputs and the rule version used. *Reason: audit and dispute resolution.*
- Definition of correct: the golden suite in section 5, built from official sources (the MOHRE gratuity formula is confirmed: 21 days' basic wage per year for the first five years, 30 days thereafter, capped at two years' wages, proportional after one full year) and reviewed by UAE counsel.

**WPS**
- A SIF generator plus a **pre-submission validator**, built from at least two banks' written specifications, not from summaries. The first-of-the-month salary deadline and escalating penalties in Ministerial Resolution 340 of 2026 are encoded as validation and calendar rules once the primary text is read.
- v1 prepares and validates files; the customer submits through their bank or exchange house.

**Security and data**
- PostgreSQL with row-level security for tenant isolation; field-level encryption (envelope keys in a managed KMS) for salary, bank and ID data; an append-only, hash-chained audit log; mandatory MFA for payroll roles; role-based access with separation of duties (the preparer cannot approve).
- Host in a UAE region (AWS me-central-1 and Azure UAE North exist; availability and certification status to be confirmed in Phase 0). Backups and logs stay in-region.
- Data minimisation toward any AI service: no salary or ID data leaves the region without a documented basis (Phase 3 decision).

**API**
- OpenAPI-first REST API that the web app itself consumes, plus signed webhooks. *Reason: one surface, one source of truth, and a visible differentiator against Zoho's plan-gated webhooks.*

**Arabic and RTL**
- Logical CSS properties and an i18n layer from the first screen; Arabic payslip templates; Arabic-English bilingual documents. *Reason: retrofitting RTL is expensive.*

**Stack**
- TypeScript end to end (engine, API, web); PostgreSQL; a Postgres-backed job queue to keep infrastructure small; a mobile-first responsive web app for employee self-service in v1. *Reason: one language, a small team, fewer moving parts. The stack is a means, not a selling point.*

**AI (limited and provable)**
- Explains a payslip from the engine's trace, flags anomalies before a run (unusual overtime, missed deductions, expiring documents), answers policy questions from the customer's own documents, and reads uploaded documents. It never computes or alters pay. Every AI output links to the data that produced it.

## 7. Features, in order

**Launch (Phases 1 to 3)**
- Employee records with document and visa expiry alerts; payroll with UAE rules; WPS generate and validate; gratuity and final settlement; leave; attendance (web and mobile check-in, ZKTeco-class device import); employee self-service in Arabic and English; payslips; approvals and separation of duties; accounting export (Zoho Books, QuickBooks, Xero); Excel import with **parallel-run comparison** against the customer's current payroll; audit log; published API and webhooks.
- Emiratisation tracker for the 20 to 49 and 50+ bands (MoHRE rules reported: one Emirati by end-2024 and a second by end-2025 for 20 to 49 staff; 2 points a year to 10% by end-2026 for 50+; checked 30 June and 31 December); ILOE tracking; compliance calendar.

**Next (Phase 4)**
- Multi-entity, accountant and PRO console, AI explain and flag, DIFC/ADGM variants (DEWS and ADGM rules), compliance certifications.

**Deferred, with reasons (visible by design)**
- **Salary payment through a bank partner:** needs a licence or a licensed partner (risk R1).
- **Free zones:** separate legal regimes; after mainland is proven.
- **Recruiting and performance:** competitors have them, but they do not decide whether payroll is trusted. Revisit after Phase 3 based on pilot demand.
- **Saudi Arabia (Mudad, Qiwa, GOSI):** limited public APIs and a different compliance regime.
- **Native mobile app:** after the web app proves the flows.

## 8. Phases and exit criteria

Indicative sizes assume 2 to 3 engineers; they change with the team.

| Phase | Scope | Size | Exit criterion (must be demonstrable) |
|---|---|---|---|
| **0. Verify** | Read the WPS resolution; get SIF specs from at least two banks; UAE counsel opinion on files-only and PDPL; confirm cloud region; trial Zoho, Bayzat and ZenHR and record gaps; recruit pilot SMEs | 3 to 4 weeks | Counsel's written opinion in hand; SIF specs from 2 banks; at least 5 pilot SMEs committed; competitor trial notes written |
| **1. Engine and WPS core** | Data model, engine, rules-as-data, golden suite, SIF generator and validator, employee records, Excel import | 8 to 10 weeks | Golden suite 100%; a generated SIF accepted by a real bank in a pilot company; gratuity matches counsel-reviewed cases |
| **2. Product shell** | Leave, attendance, self-service (Arabic and English), approvals, payslips, accounting export, audit log, security baseline | 8 to 10 weeks | Two pay cycles run in parallel at 5 pilot SMEs with no unexplained variance |
| **3. Launch** | Billing, published pricing, onboarding flow, API and webhooks, Emiratisation and ILOE, compliance calendar, support operations | 6 to 8 weeks | 20 paying SMEs; median signup to first parallel run at most 1 business day; three consecutive cycles with 0 WPS rejections |
| **4. Expand** | Multi-entity, accountant console, AI explain and flag, DIFC/ADGM, certifications | ongoing | Set after Phase 3 data |

## 9. What only you can do

- Engage a UAE employment and data-protection lawyer.
- Introduce a contact at one or two banks for the SIF specification.
- Recruit pilot SMEs and sign up for competitor trials (Zoho, Bayzat, ZenHR).
- Decide pricing after pilot feedback.
- Tell me the team size, funding runway and target launch date; these change the phase sizes.
- Allow the blocked vendor sites in this environment's network settings so I can finish the Bayzat, Zoho People and ZenHR pricing checks.

## 10. Risks

- **R1 licensing:** moving salary money needs a licence or licensed partner. Mitigation: files-only in v1; counsel confirms in Phase 0. Salary payment is a later, separate project.
- **R2 rule drift:** WPS changed in June 2026, and summaries disagree on due dates, grace periods and fines. Mitigation: read the primary text in Phase 0; rules are dated data.
- **R3 competitors may be stronger than they look:** the research relied on snippets and vendor pages. Mitigation: the Phase 0 trials; re-scope if Bayzat or Zoho already deliver provable compliance.
- **R4 price floor:** Zoho is cheap and widely trusted. Mitigation: compete on provable correctness and bundled features, not on price alone.
- **R5 certifications gap:** competitors list SOC 2 or ISO 27001. Mitigation: strong baseline now, certification roadmap.
- **R6 evidence gaps:** Bayzat, Zoho People and ZenHR pricing pages returned 404; DIFC/ADGM, ILOE and leave rules rest on secondary sources.

## 11. Calls I made (check these)

Files-only v1; UAE mainland only; TypeScript and PostgreSQL stack; web app before native; AI never computes pay; hypothesis price of AED 15 to 20 per employee per month; certifications as a 12-month roadmap item; Phase sizes as indicative.

## 12. Evidence (verified 25 Nov 2026)

- Zoho Payroll UAE pricing and plan comparison: <https://www.zoho.com/en-ae/payroll/pricing/> and <https://www.zoho.com/en-ae/payroll/pricing-comparison/>
- ZenHR UAE: <https://www.zenhr.com/en/hr-software-uae> (vendor claims)
- NeuralHR.AI: <https://neuralhr.ai/en/ai-powered-hrms> (vendor claims, no independent reviews found)
- WPS 2026 resolution: [Baker McKenzie](https://www.bakermckenzie.com/en/insight/publications/2026/06/uae-new-resolution-impacting-payroll-immediate-action-required), [LexisNexis](https://www.lexisnexis.com/blogs/ae-legal/b/insights/posts/uae-mohre-enforces-unified-salary-deadline-new-wage-protection-system), [KPMG](https://kpmg.com/xx/en/our-insights/gms-flash-alert/2026/flash-alert-2026-128.html), [MOHRE WPS page](https://www.mohre.gov.ae/en/guidance-and-awareness-portal-new/wages-protection-system)
- Gratuity: [Arabian Business summarising a MOHRE post](https://www.arabianbusiness.com/business/uae-gratuity-rules-how-to-calculate-end-of-service-pay)
- Competitor background: `docs/research/2026-11-25-competitor-analysis.md`
