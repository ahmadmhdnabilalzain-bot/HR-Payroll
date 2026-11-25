# UAE HR & Payroll: Competitor Analysis and Market Gaps (Nov 2026)

**Status:** research only. No product decisions made, no code written.

**Scope:** the launch market is the UAE. The ten competitors are the ones the founder named: Yomly, HONO, Bayzat, GulfHR, ZenHR, NeuralHR.AI, StackHX, Zoho Payroll + Zoho People, Darwinbox, SAP SuccessFactors. A global benchmark (section 7) shows what the best international products do.

**Evidence quality (read this first).** Researchers worked from search snippets. g2.com, vendor sites (gusto, rippling, zenhr, gulfhr, neuralhr, hono, bayzat, yomly, remote, zoho) and capterra.com could not be fetched from this environment. Reddit and Gartner Peer Insights were largely unreachable. Anything not confirmed is marked **UNVERIFIED**. Vendor blogs and competitor-written comparisons are treated as marketing. Statements about UAE law come from law-firm and press summaries and need confirmation from primary texts and UAE counsel before anything is built on them.

## 1. The finding that tests the premise

The gaps competitors leave open are mostly **operational and trust gaps**, not raw-technology gaps: opaque pricing, slow or absent support, no accountability for payroll errors, slow implementation, and almost no public proof of UAE-specific depth. Technology helps indirectly: self-serve setup, validation that prevents errors before they reach WPS, an auditable payroll engine, and a documented API. "Beats them technically, easily" is therefore not the right frame. The realistic goal is to be **more trustworthy and more transparent** than the incumbents, and use engineering to make that cheap to deliver.

Also, no vendor in the UAE set publishes verifiable evidence of Emiratisation tracking, MOHRE/visa lifecycle handling, or DIFC/ADGM support. That means either the claims are thin or the research could not see them. **A demo or trial of each competitor is needed before anyone treats that as a confirmed gap.**

## 2. The UAE ten at a glance

| Vendor | Who it targets | UAE payroll compliance (as claimed) | Published pricing | Review base | Headline complaints |
|---|---|---|---|---|---|
| **Bayzat** | UAE SME to mid-market; bundles insurance | WPS SIF, EOSB (affiliate blogs); Emiratisation depth UNVERIFIED | Quote-only; third-party guesses AED 15-300 (UNVERIFIED) | G2 4.6 (14), Trustpilot 2.5 (8), App Store 4.6 (33) | Slow support (5h chat replies), insurance claim friction |
| **Zoho Payroll + People** | SMB to mid-market, global suite | Native UAE edition: WPS SIF, gratuity, pensions (vendor pages); no Emiratisation or MOHRE module found | AED 45-90/org/month incl. 5 staff, +7-18/extra employee (snippets, verify live) | People G2 4.4 (~400); Payroll G2 4.4 (19), Capterra 3.7 (10) | Limited customization, cluttered UI, weak mobile; Payroll: slow support, no batch runs |
| **ZenHR** | SMB to mid; Arabic-first; Saudi-centric HQ | MOHRE/WPS claimed; gratuity per third parties | "From $5" on Capterra (basis unstated) | G2 4.6 (~55) | Payroll errors and bugs, weak custom reports, weak integrations/mobile |
| **StackHX** | SMB to large, UAE/MENA | WPS, gratuity, leave claimed (marketing) | One-time cost; "from $1500" (Capterra) | Capterra 0, SoftwareFinder 1 | No user evidence; editorial cons: limited customization |
| **GulfHR** | Likely mid-market | WPS, EOSB claimed; improved WPS accuracy per 1 reviewer | Placeholder listings only | GetApp 4.4 (7), Software Advice 4.4 (8) | Thin evidence; opaque pricing |
| **NeuralHR.AI** | 5-50 employee teams (vendor claim) | WPS SIF with anomaly check (vendor) | $10/user/mo, or $22.99 with AI agents (vendor-stated) | None found | No independent proof; AI mostly marketing |
| **Yomly** | Enterprise, 250+ staff (vendor) | WPS, EOSB claimed; KSA depth to be checked | Quote-only | None found | No review corpus; "complex and costly for small firms" (one aggregator) |
| **HONO** | Mid to large enterprise; India-centric | WPS in MOHRE format, gratuity, Emiratisation tracking (vendor) | Quote-only; one listing $10/user/mo (UNVERIFIED) | Gartner 4.4 (84), mostly India | App reliability, limited analytics (one Gartner review) |
| **Darwinbox** | Enterprise (3,000+ typical) | Native payroll in 11 countries incl. 6 GCC (vendor-linked); Neeyamo connector for global | Quote-only; $8-15/employee/month (third-party, UNVERIFIED) | G2 4.4 (~190) | Learning curve, complex reporting, limited customization; 3-6 month rollouts (UNVERIFIED) |
| **SAP SuccessFactors** | Enterprise, SAP-centric | EC Payroll covers 60 countries on the legacy SAP engine | Quote-only; modular | G2 3.9-4.1 (760-1,500) | Navigation, limited customization, 12-18 month rollouts (UNVERIFIED consultant benchmark) |

## 3. Feature matrix (as publicly claimed; blank or "?" means not found)

| Capability | Bayzat | Zoho | ZenHR | StackHX | GulfHR | NeuralHR | Yomly | HONO | Darwinbox | SAP SF |
|---|---|---|---|---|---|---|---|---|---|---|
| WPS SIF generation | claimed | claimed | claimed | claimed | claimed | claimed | claimed | claimed | claimed | ? |
| Gratuity (EOSB) | claimed | claimed | 3rd-party | claimed | claimed | ? | claimed | claimed | claimed | ? |
| Emiratisation tracking | claimed, depth ? | none found | ? | ? | ? | ? | ? | claimed | ? | ? |
| MOHRE / visa / labor card | ? | none found | MOHRE claimed | ? | ? | claimed | ? | ? | ? | ? |
| DIFC / ADGM | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| Arabic UI | ? | ? (People) | strong | listed | ? | ? | claimed | ? | ? | ? |
| Attendance / biometrics | face clock-in; ZKTeco etc. | yes | yes | RFID/biometric | ? | ? | ? | time & attendance | yes | yes |
| Benefits / insurance | core strength | ? | ? | ? | ? | ? | benefits | ? | ? | ? |
| Accounting integrations | QuickBooks, Xero, NetSuite | Zoho Books | limited | ? | ? | ? | generic | ? | ? | ? |
| Public API | ? | likely | limited | exists, scope ? | ? | ? | claimed API-first | ? | connector | OData/SOAP |
| AI features | face clock-in | Zia, UAE AI ? | none found | none | none | 7 "AI co-workers" (mostly unproven) | none | "Zero UI" conversational | Super Agent | Joule, payroll agents |
| Multi-country GCC | KSA expansion | GCC page, Bahrain | 12 markets | ? | claims, gaps | KSA, India | KSA claimed | Saudi office | 6 GCC | yes |

### Table stakes a new UAE product must match to be credible
WPS-compliant SIF generation and bank/exchange-house submission support, correct gratuity under the mainland law (with free-zone variants), leave and overtime rules, an employee self-service mobile app, Arabic and English including right-to-left, attendance with biometric or geofenced check-in, accounting integrations (at least Zoho Books, QuickBooks, Xero), role-based approvals, payslips, and an audit trail.

## 4. Why users like and dislike the UAE set

| Theme | What it looks like |
|---|---|
| Liked | Ease of use, bilingual UX (ZenHR), insurance and HR in one place (Bayzat), value for money and the wider ecosystem (Zoho), breadth of suite (Darwinbox, SAP) |
| Disliked | Support that is slow or email-only; payroll errors and bugs (ZenHR); opaque, quote-only pricing; long implementations (Darwinbox, SAP); limited customization; weak mobile and integrations |
| Missing from public view | Verified customer reviews for most UAE-native vendors; proof of Emiratisation, MOHRE and DIFC/ADGM depth |

## 5. UAE regulatory and payments landscape (sources inline)

These facts drive scope. **All are UNVERIFIED against primary text unless stated; confirm with the resolutions themselves and UAE counsel.**

- **WPS changed on 1 June 2026** under Ministerial Resolution 340 of 2026 ([EY](https://www.ey.com/en_gl/technical/tax-alerts/uae-introduces-enhanced-wage-protection-system-effective-1-june-2026), [Baker McKenzie](https://www.bakermckenzie.com/en/insight/publications/2026/06/uae-new-resolution-impacting-payroll-immediate-action-required), [Morgan Lewis](https://www.morganlewis.com/pubs/2026/05/uae-introduces-new-wage-protection-system-resolution-effective-1-june-2026), [Deloitte](https://www.deloitte.com/middle-east/en/services/tax/perspectives/uae-introduces-a-new-rule-for-wps-effective-1-june-2026.html)). Summaries conflict on due dates, grace periods and fines; an 85% on-time threshold and escalating penalties were reported. Read the resolution first.
- **MoHRE-to-bank integration** was upgraded in Dec 2025 ([WAM](https://www.wam.ae/en/article/bn56c33-mohre-launches-new-update-for-wage-protection), [Khaleej Times](https://www.khaleejtimes.com/uae/uae-mohre-wage-protection-system-update)). Employee records must match MoHRE's database. The exact SIF layout and deadlines still need to be taken from a partner bank.
- **Gratuity, leave, overtime, ILOE:** the headline rules (21 days per year for years 1-5, 30 after, capped at two years' wage; ILOE mandatory) come from memory and secondary sources. See [u.ae ILOE page](https://u.ae/en/information-and-services/jobs/insurance/unemployment-insurance-scheme).
- **Emiratisation:** mainland firms with 50+ staff must raise Emirati share in skilled roles by 2 points a year to 10% by end-2026; fines were reported ([MoHRE](https://mohre.gov.ae/en/media-center/news/27/10/2025/mohre-urges-private-sector-companies-subject-to-emiratisation-policies-to-ensure-2025-targets-are)).
- **No official public MoHRE API** for third-party HR software was found. Bank-hosted sandboxes exist (e.g. [Mashreq](https://developer.mashreq.com/apihub/sandbox/product/3230/)). Ask MoHRE/ICP about partner access.
- **DIFC and ADGM** have separate employment and savings regimes (DEWS in DIFC). Not verified.
- **Data protection:** federal PDPL exists; executive regulations were reportedly still pending in mid-2026; DIFC and ADGM have their own laws ([Morgan Lewis](https://www.morganlewis.com/pubs/2026/06/uae-establishes-federal-authority-for-artificial-intelligence-and-data)). A UAE-region cloud is the safest default.
- **Open finance:** Central Bank Open Finance Regulation (Circular 3/2025) is live on ADCB, CBD and ADIB ([Pinsent Masons](https://www.pinsentmasons.com/out-law/guides/uae-open-finance)). No evidence that bulk salary payments are in scope.
- **Licensing hypothesis (analysis, not sourced):** generating SIF files for the customer to submit through their own bank probably needs no licence, as with existing payroll software. Holding or moving salary money likely needs a Central Bank licence or a licensed bank/exchange-house/PSP partner. Confirm with UAE counsel.

## 6. What technology can and cannot win

**Can win:** a payroll engine that validates against WPS and MoHRE rules **before** submission; deterministic, re-runnable pay runs with a full audit trail; published AED pricing; setup in days; a documented REST API and webhooks; a UAE-aware AI assistant that explains gratuity and flags anomalies (a provable subset, not seven "co-workers").

**Cannot shortcut:** the statutory content (it changes, as WPS did in June 2026), MoHRE and bank connectivity that the government has not opened, licensing for money movement, and the time it takes to earn public reviews and trust.

### Build vs partner, UAE view (preliminary)
- **Build:** HR core, payroll engine for UAE rules, SIF generator and validator, ledger and audit trail, approvals, self-service app, Arabic/RTL.
- **Partner:** salary payment execution (banks, exchange houses), insurance (a broker or insurer), accounting connectors, biometric hardware.
- **Check:** whether any WPS aggregator exists (none found); open-finance payment initiation for payroll (no evidence).

## 7. Global benchmark (secondary)

These show what the best international products do. Detailed findings, with the same evidence caveats:

- **Rippling** (G2 ~4.8, ~13k reviews): one system for HR, payroll, IT and spend; complaints are AI-gated support, opaque modular pricing and payroll errors.
- **Gusto** (G2 ~4.6): published pricing (from $49/month + $6/person, snippet, UNVERIFIED); US-only native payroll; complaints about support and payroll accountability. Review counts varied by source (about 11k to 13k).
- **Deel** (G2 ~4.7-4.8, UNVERIFIED rating): broad global coverage; top complaint is payment delays; legal and regulatory allegations that Deel denies.
- **Papaya Global:** partner-network model, small review base (~55), reported layoffs.
- **Remote:** EOR from $599 per employee per month, complaints about support delays and payment errors.
- **ADP, Workday, Oracle, UKG, Dayforce (now private, Thoma Bravo, Feb 2026), Paylocity:** enterprise and mid-market incumbents. Common complaints are support, long implementation, quote-only pricing and dated UI. Workday added seven native payroll markets on 18 Nov 2026 ([Workday newsroom](https://newsroom.workday.com/2026-11-18-Workday-Expands-Payroll-to-Seven-New-Markets,-Making-It-Easier-for-Global-Organizations-to-Pay-Employees)).
- **Lesson:** every vendor announced AI agents in 2025-26, and most look like explain-and-flag assistants, so AI alone is not a lasting advantage.

## 8. Candidate wedges (decision needed)

| Option | Who | Why it fits the evidence | Main risk |
|---|---|---|---|
| **A. UAE SME payroll you can trust** (recommended) | Mainland SMEs, roughly 10-250 staff | Thin, unproven rivals in this band (ZenHR, StackHX, GulfHR, NeuralHR, Zoho) plus quote-only Bayzat; the June 2026 WPS change gives a concrete "never get fined" story | Crowded low end; price pressure from Zoho; compliance accuracy must be provable |
| **B. Mid-market and enterprise, UAE + KSA** | 250-5,000 staff | Darwinbox and SAP are heavy and slow; Yomly and HONO have thin public proof | Long sales cycles; KSA (Mudad, Qiwa, GOSI) has limited APIs |
| **C. Accountant and PRO channel** | Firms running payroll for many SMEs | Multi-client product, built-in distribution | Smaller market; channel partners need a mature product |

Suggested path: **A as the product, C as the go-to-market**, UAE only until WPS accuracy is proven.

## 9. Open questions
1. Company size and buyer for launch (A, B or C).
2. Is the founder building solo, with a team, or funded? This sets the scope and the timeline.
3. Does the product need to move salary money, or only prepare and validate payroll files? This decides licensing.
4. Confirmation of primary legal texts and a UAE counsel review.
5. Trials or demos of Bayzat, Zoho and ZenHR to verify UAE-specific depth.
