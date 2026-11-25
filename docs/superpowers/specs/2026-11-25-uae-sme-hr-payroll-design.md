# UAE SME HR & Payroll: Design and Build Plan (v2, DRAFT for approval)

Status: **draft, not approved. No code has been written.** v2 incorporates three independent reviews (builder check, failure modes, payroll-law) and a second verification batch on 25 Nov 2026. Evidence: `docs/research/2026-11-25-competitor-analysis.md` and the links in section 13. Anything not confirmed is marked **UNVERIFIED** and resolved in Phase 0.

## 1. Intent and the honest starting point

Build the HR and payroll product UAE SMEs (about 10 to 250 employees, mainland first) trust most for getting people paid correctly and legally, and make that trust **provable rather than claimed**.

What the verification changed: **Bayzat is a serious incumbent, not a thin one.** Its own homepage claims 4,000+ companies and 250,000+ employees, ISO 27001:2022 and SOC 2 Type 2, Arabic and English, mobile app, AI assistant and knowledge hub, workflows, Microsoft and Google SSO, biometric integration, group health insurance, accounts payable and host-to-host payments, and 2 to 4 week setup (all vendor claims). Zoho's AED 45 plan is already feature-rich and cheap. ZenHR claims 150+ reviews on GetApp and Capterra, SOC 2 Type II and ISO 27001. NeuralHR.AI claims Emiratisation, visa tracking and pre-run payroll checks. So **claiming WPS, gratuity or Emiratisation support is not a differentiator; every rival claims them.** What none of them offers publicly is independently checkable proof. That is the wedge, and it is narrower than first thought.

## 2. Goals, non-goals, anti-goals

**Goals**
- Pay runs that are correct, explainable and reproducible, including edge cases.
- No WPS rejection caused by our file's format or our validation.
- Fast onboarding: import, then a parallel-run comparison against the customer's current payroll.
- Feature parity with the SME plans of Zoho, ZenHR and Bayzat on the things SMEs buy on (section 7), plus an open API and webhooks on every plan.
- Arabic and English everywhere, including payslips.

**Non-goals for v1**
- Moving or holding salary money (files-only; risk R1). Note Bayzat advertises payments, so this is a gap we accept and revisit.
- Group health insurance brokerage, accounts payable, spend management.
- Recruiting and performance management at launch (reasons in section 7).
- Saudi Arabia and other GCC countries; native mobile app.

**Anti-goals**
- Any number on a payslip we cannot trace to inputs and a rule version.
- AI that computes or changes pay.
- Marketing claims ("fully compliant", "100% accurate") that the evidence does not back.

## 3. Constraints and open inputs

- Statutory rules change (WPS changed 1 June 2026). Old runs must stay reproducible.
- No public MoHRE API for third-party HR software was found (UNVERIFIED); v1 works through files and the customer's bank.
- Salary, bank and ID data are sensitive; UAE PDPL applies (executive regulations reportedly pending, UNVERIFIED).
- **Unknown, and set by you (section 10):** who builds and by when, funding, counsel, bank contact, pilot customers, liability and insurance. Plans below give **no week counts** until the team is known.

## 4. Approaches considered

| Approach | Verdict |
|---|---|
| **1. Deterministic UAE engine with counsel-signed rule-packs, files-only, AI explains (chosen)** | Makes correctness provable, avoids licensing, buildable by a small team |
| 2. AI-first agentic HRMS | NeuralHR.AI already claims this without independent proof; payroll must be deterministic |
| 3. Thin layer over another payroll provider | No UAE embedded-payroll provider found; gives up the correctness advantage |

## 5. "Strongest" as a scorecard

| # | Dimension | Verified or claimed baseline | Target |
|---|---|---|---|
| 1 | Payroll correctness | Nobody publishes proof | A **public case library** of counsel-signed UAE payroll cases (coverage defined by the case list in Appendix A, not a number) with results published per release; every payslip line shows its inputs and rule-pack id |
| 2 | WPS files | none public | Zero rejections caused by our file's format or validation, tracked per customer. (Rejections for customer data mismatches, such as labour card or IBAN, are caught by our pre-checks where possible but are not promised away) |
| 3 | Onboarding | Bayzat claims 2 to 4 weeks; NeuralHR.AI claims first parallel run in the demo (unproven) | Import plus parallel-run comparison within days for up to 50 employees; the exact promise is set after pilots |
| 4 | Price and support | Zoho published; Bayzat and ZenHR quote-only; NeuralHR.AI $10/user/month (vendor) | **Not set yet.** Published flat pricing and support response times are set only after a cost and staffing model exists (see section 10) |
| 5 | API | Zoho webhooks only in its top plan | Full REST API and signed webhooks on every plan |
| 6 | Arabic | ZenHR and Bayzat claim bilingual web and mobile | Full RTL UI, Arabic payslips and documents, Arabic self-service |
| 7 | Security | Bayzat: ISO 27001:2022 and SOC 2 Type 2 (vendor). ZenHR: SOC 2 Type II, ISO 27001 (vendor). Zoho: ISO and SOC listings | We start with **no certifications**, which is a gap. Strong baseline first; ISO 27001 and SOC 2 as a funded roadmap item |
| 8 | Explainability | NeuralHR.AI claims "explainable AI" (vendor) | Deterministic trace per payslip line (no AI needed) |
| 9 | Independence | Bayzat's pricing is reportedly bundled with its insurance brokerage (UNVERIFIED) | No cross-selling conflict; accountant and PRO friendly |

## 6. Technical design

**Rule-packs (revised after review).** Statutory rules are both numbers and logic (tier switches, caps, forfeiture, exclusions). So a **rule-pack is versioned code plus parameter data under one immutable id**, and every payslip line stores the rule-pack id and inputs. Packs are effective-dated. A rule-pack goes into **real pay runs only after counsel signs it**; engineering of everything else does not wait on that.

**Payroll engine.** Pure library, no database or network access; integer fils for money with documented rounding; proration divisor an explicit, versioned parameter (a known dispute source); finalised runs immutable; corrections are new linked runs. **How a correction interacts with a file already sent to a bank is a Phase 0 question for the banks and counsel, not a design guess.**

**Definition of correct (oracle).** Not "whatever we compute". Counsel-signed cases, plus an official calculator where one exists (the search surfaced <https://dda.gov.ae/en/gratuity-calculator/gratuity-calculator>; its coverage, likely Dubai Development Authority free zones, must be checked before use as an oracle). Coverage is defined by the case list in Appendix A.

**WPS.** SIF generator and pre-submission validator built from at least two banks' written specs. Rules from Ministerial Resolution 340 of 2026 are encoded after the primary text is read (the MOHRE page fetch failed with a proxy error; summaries agree on a first-of-the-month deadline and escalating consequences but disagree on details, UNVERIFIED).

**Security, in the first milestone that stores salary data.** Per-tenant data keys with envelope encryption; PostgreSQL row-level security; **all workers run as roles that cannot bypass tenant isolation**; a cross-tenant leak test in CI; append-only hash-chained audit log; mandatory MFA for payroll roles; separation of duties (preparer cannot approve); an **external penetration test before any real employee data**; a breach-notification and data-retention policy (PDPL). UAE-region hosting (AWS me-central-1 and Azure UAE North exist; availability and certification to be confirmed).

**API.** OpenAPI-first REST API that the web app itself uses, plus signed webhooks, tenant model that supports accountants and PROs managing many companies, and a stated versioning policy.

**Arabic.** Logical CSS and i18n from the first screen; Arabic payslip templates.

**Stack.** TypeScript end to end, PostgreSQL, Postgres-backed job queue, mobile-first web app first. A means, not a selling point.

**AI (explain and flag only).** Payslip explanation from the engine trace, pre-run anomaly flags, policy Q&A from the customer's documents, document reading. Never computes or alters pay. Not in the first milestone; the data-residency basis for any model provider is decided first.

## 7. Feature parity and plan

Columns: what rivals' own pages list, our decision. "M1" = pilot-ready milestone, "M2" = launch-parity milestone, "M3" = expand.

| Capability | Zoho (AED 45 plan unless noted) | ZenHR | Bayzat | Our plan |
|---|---|---|---|---|
| WPS SIF, bank advice | yes | claimed | claimed | **M1** |
| Gratuity, final settlement, exit process | yes | claimed | claimed | **M1** (rule-pack signed by counsel) |
| Pension for Emirati and GCC nationals (GPSSA and others) | yes, all plans | GOSI reports | claimed | **M1** for GPSSA (an Emiratisation tracker without Emirati payroll contradicts itself); other GCC pension schemes M3 |
| Salary revisions, arrears, joiner arrears, LOP and reversal | yes | ? | ? | **M1** |
| Pay run reversal and corrections | yes | ? | ? | **M1**, after the Phase 0 bank answer |
| Pay-run and salary-revision approvals | Professional and up | ? | workflows | **M1** |
| Audit trail | yes | claimed | ? | **M1** (hash-chained) |
| Document and visa expiry alerts | yes | doc mgmt | ? | **M1** |
| Excel import and parallel-run comparison | import supported | ? | migration service | **M1** |
| Payslips, salary certificates, letter templates | yes | HR letters | ? | payslips **M1**; letters **M2** |
| Loans and salary advances | yes | ? | ? | **M2** |
| Leave management and attendance | Premium only | yes; GPS or QR, ZKTeco, rosters | yes | **M2** (included in the base price) |
| Employee self-service (web and mobile web) | yes | native apps | native apps | **M2** (native app M3) |
| Reports: payroll summary, salary register, LOP, journal, gratuity liability | yes | custom builder | AI reporting | **M2** |
| DIFC-DEWS summary | yes | ? | ? | **M3** (with free-zone work) |
| Accounting integrations | Zoho Books | QuickBooks, Xero, Odoo, NetSuite, SAP | ERPs, accounting | **M2**: Zoho Books, QuickBooks, Xero first |
| SSO and MFA | SAML and MFA, all plans | ? | Microsoft and Google SSO | MFA **M1**; SSO **M2** |
| Webhooks and API | Premium only | marketplace integrations | integrations | **M2**, all plans |
| Emiratisation tracking | not listed | ? | claimed | **M2** (definitions from counsel: Appendix A) |
| ILOE tracking | ? | ? | ? | **M2** (rules from primary source) |
| Performance (OKRs, 360), ATS | no | yes | yes | **Deferred**: does not decide whether payroll is trusted; revisit after launch on pilot demand |
| Group health insurance | no | partner | core business | **Deferred**: avoids a broker conflict; premium deductions only |
| AP, spend, payments, global payouts | no | no | yes | **Deferred**: licensing (R1) |
| Multi-currency payroll, roster-heavy shift workforces | ? | yes | ? | **M3** |
| AI explain, flag, knowledge hub | Zia (details ?) | ATS AI | AI assistant and hub | **M3** |
| SOC 2 and ISO 27001 | listed | claimed | claimed | **Roadmap**, funded in M2 |

Segment note: the plan targets 10 to 250 employees, but onboarding and pricing were sized for up to 50. Larger SMEs need approvals depth, multi-entity and reporting; those are sized in M3, not ignored.

## 8. Milestones and exits

Exits are separated by kind, because calendar-bound validation takes months whatever the team size.

| Milestone | Scope | **Build exit** (testable now) | **Validation exit** (calendar-bound) | **Business outcome** (not a phase exit) |
|---|---|---|---|---|
| **Phase 0: Verify** | Primary texts; two bank SIF specs and the correction-after-submission answer; counsel opinion (files-only, PDPL, liability); cloud region; trials of Zoho, Bayzat, ZenHR; pilots recruited | Written outputs for each item | Counsel's signed rule cases exist for gratuity and WPS validation | At least 5 pilot SMEs agreed in writing |
| **M1: Pilot-ready** | Engine and rule-packs, WPS generate and validate, records, import and parallel-run, payslips, approvals, audit log, GPSSA, security baseline and pen test | Case library passes 100% on all signed cases; cross-tenant CI test green; pen test findings closed; generated SIF accepted by a real bank in a test run | Two consecutive pay cycles run in parallel at pilot SMEs with no unexplained variance | none |
| **M2: Launch parity** | Everything marked M2 in section 7, billing, onboarding flow, API and webhooks, support operations, compliance calendar | Parity checklist 100% (no unexplained gaps); published API reference | Three consecutive cycles at paying customers with no rejections caused by our files | Paying customers, onboarding time, support response times |
| **M3: Expand** | Section 7 M3 items, multi-entity, accountant console, free zones | Per item | Per item | Set after M2 data |

## 9. Risks and kill rule

- **R1 licensing**: moving salary money needs a licence or licensed partner. Files-only in v1; counsel confirms. Bayzat advertises payments, so this is a competitive gap, accepted for now.
- **R2 rule drift and secondary sources**: gratuity, ILOE, Emiratisation and WPS details come from press summaries; nothing is a rule until counsel signs it.
- **R3 liability**: a wrong gratuity or a missed deadline can hurt customers and us. Needs a contract position, an error-remedy commitment and professional indemnity insurance (your decision, section 10).
- **R4 tenant leak**: mitigated by section 6 security design, CI test and pen test.
- **R5 pilot and bank dependence**: the M1 validation exit cannot happen without bank access and pilots. Mitigation: they are Phase 0 gates for real pay runs.
- **R6 price floor and certification gap**: Zoho is cheap; Bayzat and ZenHR hold certifications and have far more customers. Our edge must be provable correctness, open API and independence, not breadth alone.
- **R7 evidence gaps**: Zoho People, ZenHR pricing pages returned 404; Bayzat pricing is quote-only; vendor claims are unverified.
- **Kill or re-scope rule**: in Phase 0, run the counsel-signed cases through the Zoho, Bayzat and ZenHR trials. If **at least two of the three compute every case correctly and show their working**, the correctness wedge is gone: stop and re-scope (for example, toward the accountant and PRO channel or toward a different segment) before building M1.

## 10. What I need from you (the questions that change the plan)

1. **Who builds, and by when?** If you plan to build with me alone, say so; milestones are then sequenced, not parallel. Team size, runway and target date decide how much of M2 can ship together.
2. **Can you get a UAE employment and data-protection lawyer, a contact at one or two banks, and 5 pilot SMEs?** Phase 0 cannot finish without them.
3. **Liability and insurance:** who is the legal entity, and are you willing to commit to an error-remedy promise backed by professional indemnity insurance?
4. **Price and support:** I have removed the earlier price guess and the one-hour response target. They are set after a cost and staffing model; tell me your margin and support expectations.
5. **Channel timing:** the accountant and PRO channel may be the real route to customers. I kept your SME decision and placed the console in M3; say if you want it earlier.

## 11. Calls I made (check these)

Files-only v1; UAE mainland first; counsel-signed rule-packs; TypeScript and PostgreSQL; web app before native; AI never computes pay and arrives after launch parity; no week counts or price until inputs exist; Zoho, ZenHR and Bayzat as the parity baseline; performance, ATS, insurance and payments deferred; certifications as a funded roadmap item.

## 12. Appendix A: counsel question list (questions, not rules)

These come from a practitioner-style review that worked from memory. **None is a rule in this plan.** Each must be answered from primary sources or by counsel before it enters the case library.

- Contract type and the effect of Decree-Law 33/2021 (fixed-term only) on service before and after 2 February 2022.
- Emirati and GCC nationals: GPSSA instead of gratuity; contribution bases and caps; GCC nationals' home-country rules.
- Gratuity inputs: basic wage only; unpaid-leave days excluded from service; probation; forfeiture on dismissal; proportional years; tier switch at year five; cap.
- Final settlement: payment timing, notice in lieu, leave encashment, deductions (loans, ILOE premiums).
- Leave: annual leave accrual and first-six-months rule; sick leave tiers and pay base; maternity, parental, bereavement, Hajj, study leave.
- Overtime: daily cap, day, night and rest-day or holiday premiums, Ramadan hours, pay base.
- Deductions: caps and stacking.
- ILOE: premium amount by category, deduction mechanics, penalties, treatment at exit.
- Emiratisation: which sectors and roles count, which salaries, the 20 to 49 band's sector scope, penalty amounts, historical versus current thresholds.
- Part-time, flexible and temporary contracts.
- Free zones: which follow federal law and WPS (DMCC, IFZA and others), versus DIFC and ADGM's own regimes. This sizes the market.
- Proration divisor (30 days, calendar days, working days), mid-month joiners and leavers, February.
- WPS data defects: expired labour card, IBAN or routing errors, unbanked staff, mid-cycle salary change, leave-days field.
- Fixed-term early termination compensation.
- Health insurance premium deductions and any emirate-level mandates.

Highest-risk cases to include first: gratuity spanning 2 Feb 2022; unpaid-leave crossing the one-year and five-year thresholds; basic versus total wage; mid-month joiners and leavers; overtime stacking; deduction caps; resignation versus dismissal; Emirati or GCC employees; WPS data defects; fixed-term early termination.

## 13. Evidence (verified 25 Nov 2026)

- Zoho Payroll UAE pricing and full plan comparison: <https://www.zoho.com/en-ae/payroll/pricing/>, <https://www.zoho.com/en-ae/payroll/pricing-comparison/>
- Bayzat homepage (vendor claims; product pages and pricing not fetched): <https://www.bayzat.com/>
- ZenHR UAE: <https://www.zenhr.com/en/hr-software-uae> (vendor claims)
- NeuralHR.AI: <https://neuralhr.ai/en/ai-powered-hrms> (vendor claims; no independent reviews found)
- WPS 2026 resolution: [Baker McKenzie](https://www.bakermckenzie.com/en/insight/publications/2026/06/uae-new-resolution-impacting-payroll-immediate-action-required), [LexisNexis](https://www.lexisnexis.com/blogs/ae-legal/b/insights/posts/uae-mohre-enforces-unified-salary-deadline-new-wage-protection-system), [KPMG](https://kpmg.com/xx/en/our-insights/gms-flash-alert/2026/flash-alert-2026-128.html); MOHRE page fetch failed
- Gratuity: [Arabian Business summarising a MOHRE post](https://www.arabianbusiness.com/business/uae-gratuity-rules-how-to-calculate-end-of-service-pay)
- Research background: `docs/research/2026-11-25-competitor-analysis.md`
