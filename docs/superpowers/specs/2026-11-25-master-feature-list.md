# Master Feature List (the gate to Plan 1)

Merges the parity list with about 80 raw uniqueness ideas into 32 items, each
grouped by the capability it depends on. **This is the document the owner
approves before Plan 1.** Nothing is built yet.

**Inputs:** `2026-11-25-combined-feature-list.md` (parity),
`2026-11-25-unique-candidates.md` (six accepted ideas),
`2026-11-25-idea-pool.md` (raw ideas, kept for traceability).

## The plain answer: what makes us unique

Any single feature can be copied. Nine capabilities are the lasting edge, and
each rests on one engine design: a deterministic engine that can replay any
pay run, a per-line trace, a versioned rule library where every value cites a
source, one data model across HR, payroll, expenses, cards and projects, and a
hash-chained audit log.

1. **Trace and cited rules:** every number explained, in the employee's language.
2. **Replaying the engine:** what-if, rule-change preview, rule-dated deadlines.
3. **One gate before pay:** variances, open claims, contract mismatches, card spend.
4. **One exit flow:** settlement, bond, tickets, cards, tasks, visa cancellation.
5. **Evidence:** inspection pack, verifiable payslips, correction record.
6. **One approval spine** across HR, payroll and spend.
7. **Owner view:** brief, compliance score, fine exposure.
8. **Channels:** WhatsApp, email-in, calendar.
9. **Governed AI:** proposals only; humans confirm; every action traceable.

**Rival bases that already exist** (so none of the following is unique by
itself; our row says what we add on top): AI connectors (Gusto; Zoho has
announced one); WhatsApp approvals (Zoho People); air-ticket tracking and
project costing (Keka); appraisal-to-bonus links (Keka, Yomly, Darwinbox);
pre-run payroll checks (Keka, Bayzat, NeuralHR.AI, HONO); Emiratisation
scenarios (HONO); email-in invoices (Pemo, Wafeq); calendar sync (Bayzat);
card freeze on exit (Pleo, Ramp, Rippling, Rho); maker-checker and tiered
approvals (Keka, Zoho); letter acknowledgement (Pocket HRMS); policy Q&A with
citations (generic tools); free WPS file checkers (four sites).

**Tags**
- **[BET]** unproven until demoed.
- **SR** needs a sourced rule that we do not have yet (sources missing or
  conflicting). Where it takes money from an employee, the default is to
  **flag it, never deduct it automatically**.
- **P** needs a licensed partner.
- **O** an owner business decision, not code.

## Unique items

"Lands with" names the module the item ships inside; no unique item has its
own milestone.

### 1. Trace and cited rules
| ID | Item | Raw ideas | Base that exists | Tags | Lands with |
|---|---|---|---|---|---|
| UQ1 | Pay explained, line by line from the trace, in the employee's language including voice notes; Arabic and English first, then Urdu, Hindi, Bengali, Malayalam, Tagalog, Nepali | cand 4, G2, W2, W3 | Workday and Zoho explain payslips; UAE vendors list Arabic and English only | BET | Payslips and self-service (M2); more languages M3 |
| UQ2 | Cited answers and policy Q&A: answers only from trace, rules and the company's own policy, with rule id and version, refusing when no rule matches | A1, H6 | Policy Q&A with citations (generic) | BET | AI layer (M3) |
| UQ3 | Ticket with trace: "ask about this line" opens a support ticket with trace and inputs attached | C2 | Payslip breakdowns elsewhere, not ticket-linked | BET | Payslips (M2) |
| UQ4 | Public accuracy scoreboard: versioned case suite, pass rates per release, customers can rerun | A5 | Remote's global AI payroll benchmark | BET | Case library (M1), published at M2 |

### 2. Replaying the engine
| ID | Item | Raw ideas | Base that exists | Tags | Lands with |
|---|---|---|---|---|---|
| UQ5 | Rule-change preview and notice: which payslips change and by how much, with a draft staff notice, before a rule takes effect | cand 1, G5 | none found | BET | Rule library (M1 demo, M2 product) |
| UQ6 | What-if runs on live data: cost of a hire (offer to net), raise cost, settlement on a chosen date, ticket choice, hiring-plan cost, Emiratisation hire-or-fine | cand 3, G6, K2, T4, T8, H3 | Standalone calculators; HONO Emiratisation scenarios | BET, SR (penalties) | Engine (M1 settlement demo), rest M2 |
| UQ7 | Rule-computed due dates (probation end, settlement deadline, notice, renewals), re-dated with a reason when a rule changes; calendar feed; visa and ID case tracker | EM1, EM6, H2, K5, W5 | Bayzat event tasks without cited dates; calendar sync | BET, SR (14-day trigger conflicts) | Compliance calendar (M2) |
| UQ8 | Cost and budget view: true cost per employee and project from the engine's accruals, budget burn-down across pay, expenses and cards, project margin that includes leave and Ramadan, payroll-aware cash-flow forecast | U2, T3, U6, EM7, U3 | Keka project costing; ChartHop plan versus actuals | BET, P (cards) | Expenses and projects (M3 to M4) |

### 3. One gate before pay
| ID | Item | Raw ideas | Base that exists | Tags | Lands with |
|---|---|---|---|---|---|
| UQ9 | Pre-pay gate: variance with the cause named, open claims, unreconciled card spend, pending leave and loans, payroll salary versus the contract filed with MOHRE | G3, U5, C8, C1 | Generic pre-run checks (four vendors) | BET, SR (contract filing rule), P (cards) | Pay run (M1 checks, M2 gate) |
| UQ10 | Pay from evidence: bonus, commission and KPI payout computed from live records, each payslip line showing KPI value, source rows and clawback; lite goals pre-filled from data | K1, K8 | Appraisal-to-bonus links (Keka, Yomly, Darwinbox) | BET | Performance (M3) |
| UQ11 | Pay-structure sandbox (test formulas on sample employees with legal-conflict warnings, versioned, reversible) and batch runs by entity, project or nationality | C5, C4 | Zoho formula components; Keka payroll groups | BET | Payroll setup (M2) |

### 4. One exit flow
| ID | Item | Raw ideas | Base that exists | Tags | Lands with |
|---|---|---|---|---|---|
| UQ12 | Exit flow: one settlement with gratuity, leave pay, notice, loans, tickets, open claims, training-bond balance and card balance, each deduction tied to a legal basis with a "cannot lawfully deduct" flag; then labour card and visa cancellation steps, access revocation, task sweep and clearance letter | U1, U8, H8, K4 | Checklists at Keka and Bayzat | BET, SR (deduction limits, bond, deadlines), P (cards). **Default: flag, never deduct** | Final settlement (M1 gratuity, M2 settlement, M3 rest) |
| UQ13 | Ticket ledger: per-employee ticket balance accrued monthly as a liability, with the effect of encashment, forfeiture and exit; leave-linked choice (take, encash, carry over) | T1, T8 | Keka tickets; Odoo accrual | BET, SR (contract basis) | Leave and payroll (M2) |

### 5. Evidence
| ID | Item | Raw ideas | Base that exists | Tags | Lands with |
|---|---|---|---|---|---|
| UQ14 | Inspection pack and auditor room: one export for a MOHRE inspection, auditor or bank with traces, WPS proof, gratuity accrual and a chain-verification certificate; time-boxed read-only portal with a sampling log | G9, G14 | "Audit-ready" claims only | BET | Audit log (M2 pack, M3 portal) |
| UQ15 | Verifiable payslips, certificates and proof letters: a code a bank or landlord can check; letters with delivery, acknowledgement and witness trail, figures from the trace | cand 2, EM4, W8 | Letter acknowledgement (Pocket HRMS) | BET, SR (legal sufficiency of e-signature) | Payslips and letters (M2) |
| UQ16 | Error-remedy record: dated public correction record for any engine error, affected runs listed, corrected delta file | C3 | none found | BET, **O** (the promise to cover fines is the owner's decision) | Case library (M2) |
| UQ17 | Retention engine for PDPL: retention per data class, erasure that does not break the audit chain | G15 | Guides only | BET, SR (statutory deadlines) | Security (M3) |

### 6. One approval spine
| ID | Item | Raw ideas | Base that exists | Tags | Lands with |
|---|---|---|---|---|---|
| UQ18 | Cross-module approvals: separation of duties across payroll, expenses and cards, risk-adaptive chains, delegation that respects separation, aging and SLA analytics, leave-aware routing | G10, G11, G13, U4, A3 | Maker-checker, tiers (Keka, Zoho); separation of duties inside one module (Payhawk) | BET | Approvals (M2 basics, M3 full) |

### 7. Owner view
| ID | Item | Raw ideas | Base that exists | Tags | Lands with |
|---|---|---|---|---|---|
| UQ19 | Owner brief: weekly or monthly plain-language pack (cost, headcount, gratuity liability, approvals, compliance score with a dated fix list, setting changes), fine exposure in dirhams | cand 5, K7, G12, G16 | Payroll analytics (Keka), HR-only | BET, SR (penalty amounts) | Reports (M3) |
| UQ20 | Emiratisation and Nafis ledger with hiring planner | K6, H3 | HONO quota view | BET, SR (rules changing) | Compliance (M3) |

### 8. Channels
| ID | Item | Raw ideas | Base that exists | Tags | Lands with |
|---|---|---|---|---|---|
| UQ21 | WhatsApp self-service and approvals that show the engine's effect and the cited rule, with the same audit trail | W1, EM8 | Zoho People WhatsApp | BET, WhatsApp Business API | Self-service (M3) |
| UQ22 | Email-in to records (resignation, visa copy, receipt) and owner digest delivery | EM2, EM5 | Invoice email-in (Pemo, Wafeq) | BET | Tasks and expenses (M3) |
| UQ23 | Bureau console for accountants and PRO firms, with a multi-client assistant | W6, G7 | Gusto Pro multi-client connector | BET | Multi-entity (M3) |

### 9. Governed AI
| ID | Item | Raw ideas | Base that exists | Tags | Lands with |
|---|---|---|---|---|---|
| UQ24 | Scoped connector and agent actions: read-only default, writes only as proposals, humans confirm a diff, approvals bound to exact parameters with a receipt, correction proposals with a trace diff | G1, A2, A3, A4 | Gusto connector; Zoho MCP announced | BET | AI layer (M3) |
| UQ25 | Document intake with field provenance (ID, visa, contract, invoice, receipt) and injection-safe handling | A6, A8 | Bayzat OCR | BET | AI layer (M3) |
| UQ26 | Permission-aware natural-language reports that show the saved query and definitions | A7, C6 | Bayzat and ZenHR AI reports | BET | Reports (M3) |

### 10. Workforce and hiring
| ID | Item | Raw ideas | Base that exists | Tags | Lands with |
|---|---|---|---|---|---|
| UQ27 | Hiring flow: offer-to-everything (contract, permit tasks, payroll record, WPS setup), cost-of-hire preview with visa and ID fees as employer cost, referral and agency ledger | H1, H7 | Standalone calculators | BET, SR (14-day trigger), P (agency payments) | Recruiting (M3) |
| UQ28 | Policy and discipline: policy versions that propose leave, overtime and approval settings, acknowledgements tied to the version, disciplinary ladder with deduction caps checked | H5, H4 | Acknowledgement tools | BET, SR (Article 39 and 44 practice), route to counsel | Guidelines (M3) |
| UQ29 | Sector rule packs: licence and certificate gates for health, security, construction and food, and a labour-camp deduction ledger | K3, W7 | Clinical licence alerts (TrueBays) | BET, SR (no sources found yet) | Vertical packs (M4) |
| UQ30 | Leave-safe roster with live overtime cost per shift swap | EM3 | Generic rosters | BET, SR (overtime and Ramadan rules) | Rosters (M2) |

### 11. Money (all need partners)
| ID | Item | Raw ideas | Base that exists | Tags | Lands with |
|---|---|---|---|---|---|
| UQ31 | Trips and money: trip readiness gate (visa, passport, ID), per-diem split, trip card auto-reconcile, who-is-where map, card limits that follow employment state, earned-wage access, salary cards and remittance, pay-proof cash-out | T2, T5, T6, T7, U7, G8, W8 | Zoho Expense, Qashio, Alaan, Keka travel desk; salary cards (Al Fardan, Edenred) | BET, P, licensing | Cards, spend, trips (M4) |

### 12. Social media integrations (owner addition, 25 Nov 2026)
| ID | Item | Raw ideas | Base that exists | Tags | Lands with |
|---|---|---|---|---|---|
| UQ32 | Connect company pages (Instagram, TikTok, Snapchat, X, LinkedIn) and show insights inside the product: followers, reach, engagement, audience; employer-brand and recruitment-campaign results tied to hiring numbers; company reputation signals | owner request | Social tools (Zoho Social and others); to be confirmed | BET, **access risk**: each platform's API approval, cost and data rules (research in progress) | Recruiting and intranet (M3 to M4) |

## Plan 1 demo (unique items inside the first thing you run)

Plan 1 stays the payroll engine only. Its single demo command will already
show three unique items:
1. A final settlement for a chosen leave date, computed from a sample file
   (UQ6, UQ12 gratuity part).
2. Before and after of a hypothetical rule change on that sample (UQ5); the
   change is labelled hypothetical.
3. The payslip explanation in a second language (UQ1).

## Open items

- Expenses, cards and payables have UAE specialists outside your list: Qashio,
  Alaan, Pemo, Wafeq. They should be read before planning UQ8, UQ31 and the
  finance modules.
- StackHX appears to live at truebays.com (per one finder); verify.
- Sourced rules missing or conflicting (every SR tag): deduction limits and
  training bonds, the 14-day deadline triggers, ticket entitlement basis,
  Emiratisation penalties and Nafis changes, overtime and Ramadan hours,
  discipline procedure, accommodation charges, PDPL deadlines.
- A rule with an SR tag is never applied automatically to employee money until
  it has a fetched source.

## Approval

The owner approves this list as the gate to Plan 1, and adds or removes items.
Ideas from the owner's own ERP customers are welcome.
