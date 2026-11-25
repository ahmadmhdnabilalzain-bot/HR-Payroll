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
| **Bayzat** | UAE SME to mid-market; insurance-broker-led | WPS SIF, EOSB (affiliate blogs); Emiratisation depth UNVERIFIED | Quote-only; third-party guesses AED 15-300; reportedly free or discounted if you use Bayzat as your insurance broker (UNVERIFIED) | G2 4.6 (14), Trustpilot 2.5 (8), App Store 4.6 (33); 1,500+ customers in 2022 (vendor release); about $46M-60M raised | Slow support (5h chat replies), insurance claim friction |
| **Zoho Payroll + People** | SMB to mid-market, global suite | Native UAE edition: WPS SIF, gratuity, pensions (vendor pages); no Emiratisation or MOHRE module found | **Verified live 25 Nov 2026** ([pricing page](https://www.zoho.com/en-ae/payroll/pricing/), excl. VAT, includes 5 employees): Standard AED 45/month (35 annual) + AED 9 (7) per extra employee; Professional 65 (55) + 13 (11); Premium 90 (75) + 18 (15). Standard lists WPS, pension, gratuity, SIF files and an audit trail; leave and attendance, webhooks and custom workflows only in Premium; 14-day trial; one licence per legal entity. No Emiratisation or MOHRE feature is listed. | People G2 4.4 (~400); Payroll G2 4.4 (19), Capterra 3.7 (10) | Limited customization, cluttered UI, weak mobile; Payroll: slow support, no batch runs |
| **ZenHR** | SMB to mid; Arabic-first; Saudi-centric HQ | MOHRE/WPS claimed; gratuity per third parties | "From $5" on Capterra (basis unstated) | G2 4.6 (~55) | Payroll errors and bugs, weak custom reports, weak integrations/mobile |
| **StackHX** | SMB to large, UAE/MENA | WPS, gratuity, leave claimed (marketing) | One-time cost; "from $1500" (Capterra) | Capterra 0, SoftwareFinder 1 | No user evidence; editorial cons: limited customization |
| **GulfHR** | Likely mid-market | WPS, EOSB claimed; improved WPS accuracy per 1 reviewer | Placeholder listings only | GetApp 4.4 (7), Software Advice 4.4 (8) | Thin evidence; opaque pricing |
| **NeuralHR.AI** | 5-50 employee teams (vendor claim) | WPS SIF with anomaly check (vendor) | $10/user/mo, or $22.99 with AI agents (vendor-stated) | None found | No independent proof; AI mostly marketing |
| **Yomly** | Enterprise, 250+ staff (vendor) | WPS, EOSB claimed; KSA depth to be checked | Quote-only | None found | No review corpus; "complex and costly for small firms" (one aggregator) |
| **HONO** | Mid to large enterprise; India-centric | WPS in MOHRE format, gratuity, Emiratisation tracking (vendor) | Quote-only; one listing $10/user/mo (UNVERIFIED) | Gartner 4.4 (84), mostly India | App reliability, limited analytics (one Gartner review) |
| **Darwinbox** | Enterprise (3,000+ typical) | Native payroll in 11 countries incl. 6 GCC (vendor-linked); Neeyamo connector for global | Quote-only; $8-15/employee/month (third-party, UNVERIFIED) | G2 4.4 (~190) | Learning curve, complex reporting, limited customization; 3-6 month rollouts (UNVERIFIED) |
| **SAP SuccessFactors** (read "SAP" as SuccessFactors; S/4HANA HCM was not studied) | Enterprise, SAP-centric | Global: EC Payroll covers 60 countries on the legacy SAP engine. UAE: SAP support notes show a UAE end-of-service/gratuity schema exists ("AEOS") and a known issue where provisions were wrongly generated for GPSSA and GCC nationals ([SAP KBA 3672509](https://userapps.support.sap.com/sap/support/knowledge/en/3672509)); WPS support **not confirmed** | Quote-only; modular | G2 3.9-4.1 (760-1,500) | Navigation, limited customization, 12-18 month rollouts (UNVERIFIED consultant benchmark). Not researched for UAE customer reviews |

## 3. Feature matrix (as publicly claimed; blank or "?" means not found)

| Capability | Bayzat | Zoho | ZenHR | StackHX | GulfHR | NeuralHR | Yomly | HONO | Darwinbox | SAP SF |
|---|---|---|---|---|---|---|---|---|---|---|
| WPS SIF generation | claimed | claimed | claimed | claimed | claimed | claimed | claimed | claimed | claimed | ? |
| Gratuity (EOSB) | claimed | claimed | 3rd-party | claimed | claimed | ? | claimed | claimed | claimed | ? |
| Emiratisation tracking | claimed, depth ? | none found | ? | ? | ? | ? | ? | claimed | ? | ? |
| MOHRE / WPS "compliant" claim | ? | none found | claimed | ? | ? | claimed | ? | ? | ? | ? |
| Visa / labor card / Emirates ID lifecycle | ? | none found | ? | ? | ? | ? | ? | ? | ? | ? |
| Pre-submission WPS validation | ? | ? | ? | ? | ? | claimed (anomaly check) | ? | claimed (validation) | ? | ? |
| Leave management | ? | yes (People) | yes | yes | ? | claimed | ? | ? | gaps reported | ? |
| Recruiting / ATS | ? | ? | ATS | ? | ? | claimed | ? | ? | yes | yes |
| Performance management | ? | limited (reviewers) | yes | ? | ? | ? | ? | ? | yes | yes |
| Onboarding / offboarding | ? | ? | yes | ? | ? | ? | ? | ? | yes | yes |
| Mobile app | yes (App Store 4.6) | exists, UAE detail ? | exists, weak per reviewers | generic | ? | ? | ? | Play Store app | ? | ? |
| DIFC / ADGM | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| Arabic UI | ? | ? (People) | strong | listed | ? | ? | claimed | ? | ? | ? |
| Attendance / biometrics | face clock-in; ZKTeco etc. | yes | yes | RFID/biometric | ? | ? | ? | time & attendance | ? (not sourced) | time (global) |
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
- **Emiratisation:** mainland firms with 50+ staff must raise Emirati share in skilled roles by 2 points a year to 10% by end-2026, checked 30 June and 31 December; firms with 20-49 staff had to hire one Emirati by end-2024 and a second by end-2025; fines were reported ([MoHRE](https://mohre.gov.ae/en/media-center/news/27/10/2025/mohre-urges-private-sector-companies-subject-to-emiratisation-policies-to-ensure-2025-targets-are)). Both bands fall inside option A's range, so an Emirati flag and quota tracking per employee is product scope.
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
| **A. UAE SME payroll you can trust** (recommended) | Mainland SMEs, roughly 10-250 staff | Rivals in this band have little *public* proof (few reviews, no confirmed Emiratisation or MOHRE depth), and most price opaquely; the June 2026 WPS change gives a concrete "never get fined" story | Few reviews is not proof of a weak product, and no vendor site could be opened, so rivals may be stronger than they look. Price floor is real: Zoho is about AED 7-18 per extra employee, and Bayzat reportedly gives software free or discounted with its insurance brokerage and had 1,500+ customers in 2022. NeuralHR and HONO already claim pre-submission WPS checks, so validation alone is not a differentiator. |
| **B. Mid-market and enterprise, UAE + KSA** | 250-5,000 staff | Darwinbox and SAP are heavy and slow; Yomly and HONO have thin public proof | Long sales cycles; KSA (Mudad, Qiwa, GOSI) has limited APIs |
| **C. Accountant and PRO channel** | Firms running payroll for many SMEs | Multi-client product, built-in distribution | Smaller market; channel partners need a mature product |

**Differentiator for A that survives the counter-evidence:** *provable* compliance rather than claimed compliance. That means a public test suite of UAE payroll scenarios (gratuity, WPS, Emiratisation), a written commitment on payroll-error remedies, flat published AED pricing with no insurance lock-in, human support with a stated response time, and a documented API. This is a trust and operations advantage backed by engineering, not a pure technology lead, and it is **unconfirmed until phase 0** (primary legal texts and competitor demos). If demos show Bayzat or Zoho already deliver this, A should be re-scoped toward C or B.

Suggested path: **A as the product, C as the go-to-market**, UAE only until WPS accuracy is proven.

## 9. Open questions
1. Company size and buyer for launch (A, B or C).
2. Is the founder building solo, with a team, or funded? This sets the scope and the timeline.
3. Does the product need to move salary money, or only prepare and validate payroll files? This decides licensing.
4. Confirmation of primary legal texts and a UAE counsel review.
5. Trials or demos of Bayzat, Zoho and ZenHR to verify UAE-specific depth.

## Appendix A. Sources by UAE vendor

Vendor pages and review sites could not be fetched; these are the search-surfaced pages the figures come from. Re-check live before relying on any figure.

- **Bayzat:** [Series C, Wamda](https://www.wamda.com/index.php/2022/12/bayzat-raises-25-million-series-c-round); [Series B, BusinessWire](https://businesswire.com/news/home/20191021005534/en/Bayzat-Abu-Dhabi-Based-Tech-Startup-Raises-16M); [integrations](https://www.bayzat.com/integrations); [Trustpilot](https://www.trustpilot.com/review/www.bayzat.com); [affiliate review (marketing)](https://themiddleeastinsider.com/2026/03/02/bayzat-review-2026-hr-insurance-platform-uae/).
- **Zoho Payroll and People:** [UAE payroll blog](https://zoho.com/blog/payroll/payroll-software-for-uae.html); [WPS academy page](https://www.zoho.com/en-ae/payroll/academy/payroll-operations/wps-payroll-software.html); [AED pricing](https://www.zoho.com/en-ae/payroll/pricing/); [People + Payroll integration](https://www.zoho.com/en-ae/people/zoho-people-and-zoho-payroll-integration.html); [G2 People](https://www.g2.com/products/zoho-people/reviews); [Capterra Payroll](https://www.capterra.com/p/186299/Zoho-Payroll/reviews/).
- **ZenHR:** [UAE page (marketing)](https://www.zenhr.com/en/hr-software-uae); [funding, Wamda](https://www.wamda.com/2022/10/zenhr-successfully-raises-10Million-to-fuel-expansion-plans-arabic-english); [G2](https://www.g2.com/products/zenhr-solutions-zenhr/reviews); [Capterra UAE](https://www.capterra.ae/software/157129/zenhr).
- **StackHX:** [GoodFirms](https://www.goodfirms.co/software/stackhx-hr-software); [GetApp](https://www.getapp.com/hr-employee-management-software/a/stackhx); [Capterra](https://www.capterra.com/p/202668/StackHX/).
- **GulfHR:** [GetApp](https://www.getapp.com/hr-employee-management-software/a/gulfhr); [Software Advice](https://www.softwareadvice.com/hr/gulfhr-profile/); [Capterra UK](https://www.capterra.co.uk/software/128701/gulf-hr).
- **NeuralHR.AI:** [About](https://neuralhr.ai/en/about); [WPS page (vendor)](https://neuralhr.ai/en/wps-payroll-software-uae); [AI HRMS pricing page (vendor)](https://neuralhr.ai/en/ai-powered-hrms).
- **Yomly:** [FAQ (vendor)](https://www.yomly.com/faqs/); [aggregator review](https://www.hr.software/reviews/yomly); [competitor comparison (marketing)](https://www.greythr.com/middle-east/alternatives/yomly/).
- **HONO:** [UAE page (vendor)](https://www.hono.ai/solutions/middle-east/uae); [Zero UI launch](https://www.business-standard.com/content/press-releases-ani/hono-launches-the-world-s-first-headless-hrms-introducing-a-new-category-of-enterprise-hr-technology-126050700391_1.html); [Gartner](https://www.gartner.com/reviews/product/hono).
- **Darwinbox:** [Neeyamo partnership](https://www.gulftoday.ae/business/2026/07/08/darwinbox-and-neeyamo-partner-to-deliver-global-payroll-across-160-countries-through-one-unified-platform); [funding, TechCrunch](https://techcrunch.com/2025/03/05/darwinbox-the-hr-upstart-from-india-raises-140m-to-take-on-deel-and-rippling); [G2](https://www.g2.com/products/darwinbox/reviews).
- **SAP SuccessFactors:** [Employee Central Payroll](https://www.sap.com/products/hcm/employee-central-payroll.html); [UAE gratuity known issue](https://userapps.support.sap.com/sap/support/knowledge/en/3672509); [G2](https://www.g2.com/products/sap-successfactors).

## Appendix B. Global top-10 benchmark (the original request)

Selection rule: market presence plus review volume across segments. Same evidence caveats as above.

| Vendor | Segment | Native payroll | Pricing | G2 (approx.) | Praise | Complaints |
|---|---|---|---|---|---|---|
| ADP | Mid to enterprise; RUN 1-49 | Claims 140+ countries; native split UNVERIFIED | Quote-only; API access is a paid add-on | WFN ~4.2 | Ease of use, tax breadth | Slow support, weak escalation, dated reporting |
| Workday | Large enterprise | Historically US, CA, UK, IE, FR, AU (sources differ), plus 7 more announced 18 Nov 2026 | Quote-only | ~4.1-4.2 | Integrations, transparency | Navigation, learning curve, consultant dependence |
| Oracle Fusion HCM | Large enterprise | Native engine; country count not found (~20-30 from memory, UNVERIFIED) | Quote-only | ~3.5-3.8 (UNVERIFIED, fragmented listings) | Breadth, suite integration | Dated UI, slow performance, limited customization |
| SAP SuccessFactors | Enterprise | EC Payroll 60 countries | Quote-only | 3.9-4.1 | Localization breadth (inferred) | Navigation, customization, 12-18 month rollouts (UNVERIFIED) |
| UKG | Upper-mid to enterprise | Claims 160+; split UNVERIFIED | Quote-only | Pro 4.3, Ready 4.4 | Time and workforce management | Review text not captured |
| Dayforce | Mid to enterprise; private since Feb 2026 | "Only a few" native per help docs (AU, CA, MX; US native not confirmed in this pass) | Quote-only | ~4.2 | Single database | Support, customization, paid integrations |
| Paylocity | US SMB to mid | US only | Quote-only | not captured | Helpful staff, ease of use | Support holds, hard implementation |
| Gusto | US SMB | US only; international via Remote | From $49 + $6/person (snippet, UNVERIFIED) | ~4.6; 11k-13k reviews depending on snapshot | Ease of use | Support, payroll errors, fee creep |
| Rippling | SMB to mid, global | Claims 185+ (split UNVERIFIED) | Opaque, modular (~$15-35 PEPM, third-party, UNVERIFIED) | ~4.8 (~13k) | Setup, breadth | AI-gated support, opaque pricing, payroll errors |
| Deel | Startup to enterprise | Claims 150+ EOR, 100+ payroll; owned entities UNVERIFIED | Contractors from $49 (confirmed); EOR $499-599 (UNVERIFIED) | ~4.7-4.8 (rating UNVERIFIED, 6,839 reviews) | Fast hiring, one platform | Payment delays, support, legal allegations (Deel denies) |

Also studied: Papaya Global (partner model, ~55 G2 reviews, so excluded from the ten by the review-volume rule) and Remote (EOR from $599/employee/month; G2 ~4.5-4.6, UNVERIFIED; complaints about support, payment delays and cost). Not studied: Paychex, Paycom, BambooHR, HiBob, Personio, Globalization Partners.
