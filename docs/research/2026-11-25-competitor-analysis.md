# HR & Payroll: Top-10 Competitor Analysis (Nov 2026)

**Status:** research only. No product decisions made. No code written.
**Method:** five parallel researchers, one fixed grid per vendor. Evidence is mostly search snippets of vendor pages, G2, Capterra, TrustRadius and press. g2.com, gusto.com and rippling.com could not be fetched directly; Reddit and Gartner Peer Insights were largely not reached. Everything not confirmed is marked **UNVERIFIED**. Vendor blogs and competitor-written comparisons are treated as marketing.

## 1. How the ten were chosen

Rule: market presence plus review volume, spread across four segments so the gaps are visible from every angle.

| Segment | Picked |
|---|---|
| Enterprise suites | Workday, SAP SuccessFactors, ADP (Vantage/Lyric) |
| Mid-market | ADP Workforce Now, UKG, Dayforce, Paylocity |
| SMB / modern | Gusto, Rippling |
| Global payroll / EOR | Deel, Papaya Global |

Near misses: Oracle HCM, Paychex, Paycom, BambooHR, Remote, HiBob, Personio, Globalization Partners. A follow-up pass could swap any of these in.

## 2. Comparison grid

| Vendor | Core segment | Native payroll footprint | Pricing | G2 (approx.) | Headline praise | Headline complaints |
|---|---|---|---|---|---|---|
| ADP | Mid to enterprise; RUN for 1-49 | Claims 140+ countries; native split UNVERIFIED | Quote-only; API access is a paid add-on | WFN ~4.2 | Ease of use, tax/compliance breadth | Slow support, weak escalation, dated reporting |
| Workday | Large enterprise | US, CA, UK, IE, FR, AU, plus 7 new markets announced 18 Nov 2026; rest via partners | Quote-only | ~4.1-4.2 | Integrations, employee transparency | Navigation, learning curve, consultant dependence, 9-15 month rollouts (UNVERIFIED) |
| SAP SuccessFactors | Enterprise, SAP-centric | EC Payroll 60 countries on the legacy SAP engine | Quote-only, modular | ~3.9-4.1 | Localization breadth (inferred) | Navigation, limited customization, 12-18 month rollouts (UNVERIFIED) |
| UKG | Upper-mid to enterprise | Claims 160+; native split UNVERIFIED | Quote-only | Pro 4.3, Ready 4.4 | Time and workforce management depth | Review text not captured (gap) |
| Dayforce | Mid to enterprise; now PE-owned (Thoma Bravo, Feb 2026) | Help docs: "only a few" native (AU, CA, MX, US) | Quote-only | ~4.2 | Single-database pitch | Support, limited customization, paid integrations, long implementations |
| Paylocity | US SMB to mid | US only | Quote-only | not captured | Helpful staff, ease of use | Support holds of 20-30+ min, hard implementation, occasional payroll errors |
| Gusto | US SMB | US only; international via Remote referral | Published: from $49 + $6/person (snippet, UNVERIFIED) | ~4.6 (11k+ reviews) | Ease of use, simple payroll | Support unreachable, payroll/tax errors, fee creep |
| Rippling | SMB to mid, global | Claims 185+ countries combined; native vs partner UNVERIFIED | Opaque, modular, ~$15-35 PEPM all-in (third-party, UNVERIFIED) | ~4.8 (13k reviews) | Setup, time saved, one-system breadth | AI-bot-gated support, opaque pricing, payroll errors, missing features |
| Deel | Startup to enterprise, remote-first | Claims 150+ EOR, 100+ payroll; owned-entity count UNVERIFIED | Contractors from $49 (confirmed); EOR ~$499-599 (UNVERIFIED) | ~4.8 | Fast hiring, one platform | Payment delays (top theme), support, fees; Rippling lawsuit, reported DOJ probe, AML allegations (Deel denies) |
| Papaya Global | Mid to enterprise multinationals | Partner/aggregator model | Not published | ~4.5 (~55 reviews) | Support and payroll experts | Invoicing errors, support waits, layoffs reported |

## 3. Where every competitor is weak

1. **Support and accountability.** Named as a top complaint for nearly every vendor. Payroll errors rarely come with ownership or guarantees.
2. **Implementation.** Enterprise suites take 9-18 months and 1-2x annual license in services (consultant benchmarks, UNVERIFIED). Mid-market complaints are similar in kind.
3. **Pricing opacity.** Eight of the ten are quote-only or modular. Add-ons, including API access, inflate bills.
4. **Global payroll is mostly delivered by partners.** Real native depth is thin outside a few countries. Workday is only now adding seven markets.
5. **UI and integration debt.** Legacy-shaped cores with AI layered on top. Every vendor announced AI agents in 2025-26. Most appear to explain or flag, not act (GA status often UNVERIFIED), so AI is not yet a durable moat for anyone.
6. **Payout reliability.** Deel's top complaint is delayed payments, a payout-rail problem.

## 4. What technology can and cannot win

**Can win:** payroll-engine correctness (effective-dated rules, retro pay, deterministic re-runs, full audit trail), a single data model, an API-first design, setup in weeks not months, transparent pricing, and an AI layer that takes governed actions with approvals.

**Cannot shortcut:** per-country tax and statutory content, agency filings and registrations, and money-movement licensing. Incumbents hold these as sunk assets.

## 5. Build vs partner (preliminary)

Evidence is search-snippet level and pricing is unverified.

- **Partner:** tax content, filings, deposits, licensing, money movement.
  - US embedded payroll APIs: Check, Gusto Embedded, ADP Embedded, Sage Embedded (alive; prices quote-only). Rollfi and Salsa status UNVERIFIED.
  - US/CA tax engines: Symmetry, Vertex.
  - Global: Neeyamo, Deel's partner API. Others UNVERIFIED.
  - Money movement: Column, Increase, Modern Treasury (bank-partner model). Money-transmitter exposure differs by state; needs counsel.
  - Registration APIs: Middesk, Avalara, CorpNet.
- **Realistic to build:** HR core, pay-run workflow, double-entry ledger, immutable audit trail, approvals, reporting, integration to a tax engine.
- **Not realistic early:** tax-content maintenance, filings and registrations, bank or transmitter licensing, global per-country compliance.

## 6. Open questions before any plan

1. **Launch market.** Which country and company size first? Payroll is jurisdiction-specific, so this decides scope, compliance work and architecture.
2. **Who is the buyer?** The clearest wedges differ by segment (see the summary message).
3. **Gaps to close:** Reddit and Gartner Peer Insights complaint themes, UKG and Paylocity review text, Oracle/Paychex/Paycom coverage, primary-source pricing for Rippling, Deel and the embedded providers.

## 7. Source notes

Key primary or near-primary sources used: Thoma Bravo's Dayforce close announcement; Workday newsroom (18 Nov 2026 payroll expansion); Dayforce help docs (native payroll list); Deel pricing page; Gusto Remote referral support article; Paylocity and UKG newsroom releases. All other figures: see the researcher notes in-session; treat as directional until re-verified.
