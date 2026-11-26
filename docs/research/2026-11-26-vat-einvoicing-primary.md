# UAE VAT return, e-invoicing, corporate tax: primary sources (26 Nov 2026)

Improves on docs/research/2026-11-25-vat-corporate-tax-einvoicing.md.
Method: Firecrawl scrapes of tax.gov.ae, mof.gov.ae, uaelegislation.gov.ae.
No host was blocked. "READ" = full or near-full primary text scraped.
"PARTIAL" = a targeted extract or search snippet of a primary page only.
All English texts are marked "not an official translation" by the FTA/MoF.

## 0. Corrections to the 25 Nov note (read first)

1. Decision 17 of 2026 EXISTS. Number, date and text verified (section 2).
   It is an FTA Board Chairman decision, not a "Ministerial" one.
2. Date CONFLICT on the large-business ASP deadline (section 3.3):
   MD 244/2025 as first issued says 31 Jul 2026. MD 66/2026 changed it to
   30 Oct 2026. Our note was right (30 Oct) but cited no amending
   instrument. Cite MD 66/2026.
3. The ASP accreditation rules moved: MD 64/2025 is REPEALED by MD 168/2026
   (effective 1 Oct 2026). Our note did not mention this.
4. MD 243/2025 was amended by MD 197/2026 (effective 1 Oct 2026): issue
   window changed from "14 days" to "14 Business Days"; Tax Group
   intra-group supplies excluded for 24 months from 1 Jan 2027.
5. The current MoF Guidelines version is V 2.1 dated 25 Nov 2026 (the
   mof.gov.ae link now redirects to ".../2026/10/UAE-Electronic-Invoicing-
   Guidelines_En.pdf"). Our note said v2.0 of 26 Oct. Not re-verified older.

## 1. VAT return (Form VAT 201)

Source: FTA "VAT User Guide | Returns", August 2021 (V4.0), pages 1-30.
URL: https://tax.gov.ae/DataFolder/Files/Pdf/VAT%20Returns%20User%20Guide
EnglishV40%2015%2008%202021%20SEP2021.pdf
Status: READ (30 pages). CAVEAT: the guide is dated 2021. The FTA site still
hosts it but I found no newer version; box layout may have changed. Verify in
EmaraTax before building. Penalties: see 1.4, partly superseded in 2026.

### 1.1 Boxes (from the guide)

Outputs section, columns Amount (AED) / VAT Amount (AED) / Adjustment (AED).
Box 1 is split per emirate (sub-box labels not confirmed). The guide says
supplies "should be
identified by the Emirate in which that supply was made".

- Box 1 Standard rated supplies: "net value of standard rated supplies made,
  and the VAT due". Example: "AED 100 under Amount and AED 5 under VAT
  Amount". Net of credit notes and correctable errors.
- Box 2 Tax refunds to tourists: pre-populated, "no longer editable".
- Box 3 Reverse charge supplies received: net value and output VAT, mostly
  imported services. Imported goods declared to customs go in Box 6.
- Box 4 Zero-rated supplies: "Only the net value ... is required".
- Box 5 Exempt supplies: net value only, no VAT.
- Box 6 Goods imported into the UAE: auto-populated from customs data
  (amount and import VAT).
- Box 7 Adjustments to goods imported: may be positive or negative.
- Box 8 Totals (outputs).
- Inputs section, columns Amount / Recoverable VAT amount / Adjustment:
- Box 9 Standard rated expenses: net amount, and recoverable VAT only.
- Box 10 Reverse charge supplies (input side): same value as Box 3 where
  the VAT is recoverable.
- Box 11 Totals (inputs): "total of the values declared in Box 9 and Box 10".
- Box 12 Total value of due tax for the period: sum of VAT + Adjustments
  in the Outputs section.
- Box 13 Total value of recoverable tax: sum of VAT + Adjustments in Inputs.
- Box 14 Payable tax = Box 12 minus Box 13. If Box 12 < Box 13 the person
  may request a refund.
- Box 15 Refund request (yes/no). "If Yes ... complete the VAT refund
  application (Form VAT311) after the VAT Return Form is submitted." If No,
  the excess carries forward to offset tax or penalties.
- "Additional Reporting Requirements" section also exists: NOT READ in
  detail; contents NOT CONFIRMED.
- Error correction rule: errors of AED 10,000 or less found this period may
  be fixed in the current return; above AED 10,000 needs a Voluntary
  Disclosure (guide, notes under Boxes 1 and 9).
- All amounts in AED.

NOT FOUND: an FTA file-upload or API format for VAT 201. The guide only
describes the EmaraTax web form. The 25 Nov gap stands. "FTA-ready" output
must mean boxes 1-15 values for manual entry unless an upload format is
found later.

### 1.2 Deadline (guide section 2.1)

"The VAT Return must be received by the FTA no later than the 28th day
following the end of the Tax Period concerned or by such other date as
directed by the FTA. Where a payment is due to the FTA, it must be received
by the FTA by the same deadline." Weekend or holiday: "extended to the first
business day thereafter". "If there is no business transaction for the Tax
Period, you are required to submit a 'nil' VAT Return."
Tax periods: stagger 1, 2, 3 are quarterly; stagger 4 (year end 31 Dec) is
monthly in the guide table; FTA may assign monthly to some persons.
Live evidence: the FTA site banner (read 26 Nov 2026) lists "30-11-2026
Final deadline for filing VAT returns". That fits the 28 Nov deadline
(a Saturday) moving to the next business day; this is MY INFERENCE, the
banner gives no reason.

### 1.3 Penalties as written in the 2021 guide (section 5)

- Late return: "AED 1,000 ... for the first time ... In case of repetitive
  non-compliance within 24 months, ... AED 2,000 for each offence."
- Late payment: 2% of unpaid tax the day after the due date; 4% monthly
  after one month on the unpaid amount; "maximum of (300%)".
- FTA may issue an estimated assessment for a missing return.

### 1.4 Possible 2026 changes (CONFLICT, not resolved)

FTA news of 15 Apr 2026 (PARTIAL: extract read, not the Decision itself):
Cabinet Decision No. 129 of 2025 amended Cabinet Decision 40 of 2017 on
penalties, in force 14 Apr 2026. It "reduced or had their calculation
mechanisms amended" for many violations, including "failure ... to pay the
payable tax within the time limits" and incorrect returns. Whether the late
filing fine of AED 1,000/2,000 and the 2%/4%/300% late payment scale changed:
NOT FOUND. Do not hard-code the 2021 figures. Read Cabinet Decision 129/2025.
URL: https://tax.gov.ae/en/media.centre/news/federal.tax.authority.announces.
entry.into.force.of.the.decision.amending.administrative.penalties.imposed.
for.violations.of.tax.legislation.and.calls.on.registrants.to.benefit.from.
the.advantages.of.the.new.decision.aspx

## 2. FTA Decision No. 17 of 2026 (input VAT on employee expenses)

URL (FTA legislation page lists it; Issue Date 09 Sep 2026, Publish Date
28 Sep 2026): https://tax.gov.ae//Datafolder/Files/Pdf/2026/legislation/FTA%
20Decision%20No.%2017%20of%202026%20on%20the%20Cases%20and%20Conditions%20
for%20the%20Recovery%20of%20Input%20Tax%20Incurred%20on%20Employee%20
Expenses%20-%20Publishing.pdf
Status: READ in full (4 pages, unofficial English translation).

Title: "Cases and Conditions for the Recovery of Input Tax on Employee
Expenses". "Federal Tax Authority Decision No. 17 of 2026 - Issued 9 Sep
2026 (Effective from 1 Oct 2026)". Issued by "The Chairman of the Board of
Directors of the Federal Tax Authority"; Board approval at its 45th meeting
on 23/06/2026.

Article 1 (scope): applies "when recovering or deducting the Input Tax
incurred on the purchase of Goods or Services to be used by employees for no
charge to them, where there is a contractual obligation or documented policy
to provide such Goods or Services", under Art. 53(1)(c)(2) of Cabinet
Decision 52 of 2017.

Article 2: recovery allowed in six cases; "all the following conditions"
per case:
1. Transportation: only home-to-work, to clients' premises, or other
   direct job purposes; not personal; employee "not able to opt to receive a
   cash allowance or any financial compensation in lieu".
2. Food and beverages: employee lives in a "remote, distant, or isolated
   area"; no food preparation facilities or nearby restaurants; linked to the
   work or residence period; no cash-in-lieu option.
3. Accommodation: no cash-in-lieu; tied to operational requirements and "does
   not form part of the employee's benefits or ordinary compensation";
   work needs the employee near the site; for the employee only (not family,
   unless required to live permanently near the workplace); commensurate
   with job needs, no significant recreational elements.
4. Accommodation for new employees: "temporary for a period no longer than
   30 days"; commensurate with job requirements.
5. Mobile phones, airtime, data, home internet (modem/router): necessary for
   job duties; work use, "any personal use is incidental and insignificant";
   "documented internal policy" with scope and consequences; "reasonable
   monitoring mechanisms" with records.
6. Parking fees for employee-allocated spaces: solely business purposes;
   "documented internal policy regulating the cases where employees may be
   reimbursed for parking fees along with the approval mechanism"; keep
   proof "such as receipts showing the date, time, amount of the fees and the
   Tax paid".
Article 3: published in the Official Gazette, effective 1 Oct 2026.

Differences from our 25 Nov note: it was not a "reimbursement policy" rule
for all six categories. Only cases 5 and 6 require a documented policy in
Article 2 itself; Article 1 requires a "contractual obligation or documented
policy" overall. Receipt details (date, time, amount, tax) are required only
for parking (case 6). Cases 1-4 turn on the no-cash-alternative test.
Product implication: an expense-VAT feature needs a per-employee flag for
"cash alternative offered" and per-category conditions, not a single
reimbursement-policy check.

## 3. E-invoicing (Ministry of Finance / FTA)

### 3.1 Instrument map (all tax.gov.ae or mof.gov.ae primary PDFs)

- MD 243 of 2025, Electronic Invoicing System. READ (all 6 pages).
  https://tax.gov.ae/Datafolder/Files/Pdf/2026/e-invoicing/Ministerial-
  Decision-no.-243-of-2025-on-the-Electronic-Invoicing-System.pdf
- MD 244 of 2025, Implementation (phases). Dated 17 Sep 2025. READ (3 pp).
  https://tax.gov.ae/datafolder/Files/Legislation/2025/Ministerial%20
  Decision%20No.%20244%20of%202025%20on%20The%20Implementation%20of%20
  The%20Electronic%20Invoicing%20System.pdf
- MD 66 of 2026, amends MD 244 Art. 5(1)(a). READ (1 page). The MoF PDF
  copy has blank issue-date placeholders ("[●] 2026"): a working copy, not a
  signed gazette text. URL:
  https://mof.gov.ae/wp-content/uploads/2026/05/Ministerial-Resolution-No.-
  66-of-2026-Amending-Certain-Provisions-of-Ministerial-Resolution-No.-244-
  of-2025-Regarding-the-Implementation-of-the-Electronic-Invoicing-System-
  En-20260514.pdf
- MD 197 of 2026, amends MD 243. READ (3 pp; marked CONFIDENTIAL, "come into
  force on 01 October" with no year, issue date blank; treat as unsigned
  working copy). URL:
  https://mof.gov.ae/wp-content/uploads/2026/10/Ministerial-Decision-No.-
  197-of-2026-%E2%80%93-Amending-Certain-Provisions-of-Ministerial-Decision-
  No.-243-of-2025-on-the-Electronic-Invoicing-System_En.pdf
- MD 168 of 2026, ASP eligibility and accreditation; repeals MD 64/2025.
  READ pages 1-10 of 12 (articles 1-20 were all in those pages; schedules
  not read). URL:
  https://mof.gov.ae/wp-content/uploads/2026/10/Ministerial-Decision-No-168-
  of-2026-on-Eligibility-criteria-and-Accreditation-Procedure-EN-FINAL.pdf
- Cabinet Decision 106 of 2025, violations and penalties. PARTIAL (search
  extract of the annexed table from tax.gov.ae, mof.gov.ae and
  uaelegislation.gov.ae; articles 1-4 text not read).
- MD 56 of 2026 amending MD 64 (white-label ASP model): NOT READ, mentioned
  only by consultancies; superseded anyway by MD 168 of 2026.
- MoF "UAE Electronic Invoicing Guidelines": PARTIAL (defined terms, pages
  3-10 of 59 as returned by a targeted extract; chapters on fields and timing
  NOT read). URL: https://mof.gov.ae/wp-content/uploads/2026/06/UAE-
  Electronic-Invoicing-Guidelines_V-1.1-01June2026.pdf (served V 2.1,
  25 Nov 2026).
- FTA e-invoicing page and FAQ (tax.gov.ae/en/content/uae.einvoicing.aspx):
  READ, last updated 17 Nov 2026 per the page.

### 3.2 Scope and obligations (MD 243/2025 as amended)

- Art. 3: applies to "Any Person conducting Business in the State in respect
  of every Business Transaction", unless excluded by Art. 4. FAQ: B2B and
  B2G, "regardless of the VAT registration status".
- Art. 4 (as replaced by MD 197/2026): exclusions include Government
  sovereign transactions; international airline passenger tickets and
  ancillaries; air cargo (24 months); "Financial services that are exempt
  from VAT or subject to VAT at the zero rate, in accordance with Article 42
  of the VAT Executive Regulation"; and "Business Transactions carried out
  between Persons who are members of the same Tax Group, for a period of
  twenty-four (24) months starting from 1 January 2027". Voluntary use
  allowed (Art. 4(3)).
- Art. 5: "the Issuer and the Recipient ... shall appoint an Accredited
  Service Provider". The Ministry publishes the ASP list. Both sides need an
  ASP; the FAQ says one ASP per entity for send and receive.
- Art. 6(1)-(2): issue an Electronic Invoice for any Business Transaction;
  Electronic Credit Note when the transaction is cancelled, the consideration
  is reduced or returned, or "an administrative or numerical error has
  occurred".
- Art. 6(5) as amended: issue and transmit "within fourteen (14) Business
  Days from the Date of Business Transaction". CONFLICT: original text said
  "within 14 days". Registrants also follow the VAT Law timeline (Art. 6(4)).
- Art. 6(6): report to the Authority "within the timeline prescribed by the
  Minister" (the timeline itself NOT FOUND in the texts read).
- Art. 7: data fields "as prescribed by the Ministry" (the Data Dictionary).
- Art. 9: self-billing only if both parties are Registrants.
- Art. 11 as amended: retain for the period under the Tax Procedures Law and
  be able to produce records on request. The original said "store ...
  within the State"; the amended text drops the in-State wording.
  The original Art. 12 (system-failure notice in 2 Business Days) is
  repealed by MD 197/2026 Art. 3.
- FAQ: B2C-only persons that buy from businesses are still in scope.
  MD 244 Art. 5(2): B2C transactions are not subject "until such time
  determined by a decision issued by the Minister".
- FAQ: no QR code required; credit note is the only correction route; no
  cancellation concept; a buyer cannot reject through the system for
  non-technical reasons; Arabic may be required by local rules.
- FAQ: each VAT Group member needs its own endpoint; "The Tax Group TIN
  cannot be used for e-Invoicing purposes".

### 3.3 Go-live dates per size (MD 244/2025 Art. 5, as amended)

Original Art. 5(1) text, read from tax.gov.ae PDF:
(a) Revenue "equal to or exceeds AED 50,000,000 shall appoint an Accredited
Service Provider by 31 July 2026 and shall implement ... by 1 January 2027".
(b) Revenue "less than AED 50,000,000 shall appoint an Accredited Service
Provider by 31 March 2027 and shall implement ... by 1 July 2027".
(c) Government Entity: ASP by 31 March 2027, implement by 1 October 2027.
MD 66/2026 Art. 1 replaces (a): "by 30 October 2026 ... implement ... by 1
January 2027". Only (a) changed.
Pilot and voluntary start: 1 July 2026 (MD 244 Arts. 3 and 4).
FTA news 25 Oct 2026 (READ) confirms both: "AED 50 million and above must
appoint ... by 30 October 2026 and implement ... by 1 January 2027"; "below
AED 50 million must appoint ... no later than 31 March 2027 and implement
... no later than 1 July 2027".
VERDICT: our note's dates (under AED 50m: ASP by 31 Mar 2027, go live
1 Jul 2027) are CONFIRMED by primary text. The only date conflict is the
large-business ASP date (31 Jul vs 30 Oct 2026); 30 Oct is the operative one.
Open conflict to watch: MD 66 and MD 197 PDFs on mof.gov.ae are unsigned
working copies. The tax.gov.ae MD 244 PDF still shows 31 Jul 2026 (stale).
"Revenue" (MD 244 Art. 1): "The gross income earned by a Person during the
most recent Accounting Period, based on the financial statements ... or, if
such financial statements are not available, ... other documentation
acceptable to the Authority."

### 3.4 Five-corner model and PINT AE

- FTA FAQ (READ): "The eInvoicing framework is a decentralized 5 corner
  model." A Service Provider validates all fields against the UAE data
  dictionary, exchanges over Peppol, and all tax data fields are reported to
  the FTA system (Corner 5). Transport is Peppol AS4 (C2-C3, C2-C5), with
  decentralized SMP per ASP.
- MoF Guidelines glossary (PARTIAL): Corner 1 Supplier; Corner 2 Supplier's
  ASP; Corner 3 Recipient's ASP; Corner 4 Recipient; Corner 5 FTA.
  "Corner 5 sends electronic confirmation to Corner 2 once the Tax Data has
  been successfully reported."
- Participant ID: "0235 followed by the 10-digit TIN". TIN is "the first 10
  digits of the TRN". A person in scope with no tax registration "must
  register with the FTA to obtain their TIN".
- PINT AE is defined in MD 168 Art. 1: a Peppol International family of
  specifications for Electronic Invoices and Credit Notes; "The State's
  requirements are defined in the corresponding Data Dictionary".
- Customer-facing format: structured data only. FTA page: "PDF, Word
  documents, images, scanned copies and emails are not considered
  e-Invoices".
- Branch invoices carry the registrant ID (IBT-030) and, for branches, the
  trade licence number (BTAE-15) (FAQ).
NOT FOUND: the Data Dictionary and the list of mandatory fields. The 25 Nov
note's "51 mandatory elements" and "Mandatory Field Requirements v1.1" were
NOT verified in this pass. Needs the Data Dictionary download from mof.gov.ae
(link not located; the Guidelines chapters on fields were not read).

### 3.5 Accredited Service Provider rules (MD 168/2026, effective 1 Oct 2026)

- Art. 3: only accredited providers may offer e-invoicing services; the
  Ministry keeps a Central Register of ASPs and onboarded End Users.
- Art. 4 eligibility: active Peppol-certified provider who passed OpenPeppol
  conformance tests; 2 years of operating experience of the product (third
  party products and outsourcing allowed if the ASP "retains full
  responsibility"); company, tax, security, self-declaration and insurance
  conditions. Minister may waive any condition.
- Art. 5: UAE entity, or a foreign entity licensed in the UAE; paid-up
  capital at least AED 50,000; audited accounts; ISO 22301.
- Art. 6: PINT AE compliance per the Data Dictionary; PASR (Peppol Authority
  Specific Requirements).
- Art. 7: must be registered for Corporate Tax and VAT where mandatory.
- Art. 8: MFA, encryption in transit and at rest, monitoring, ISO/IEC 27001
  for the product, data residency rules.
- Art. 9: must provide "(100) one hundred free eInvoice exchange and
  reporting services per annum to each End-User".
- Art. 10: insurance AED 2.5m professional indemnity; AED 5m crime; AED 5m
  cyber fraud.
- Arts. 11-13: decision within 90 Business Days (30 after extra info);
  testing (OpenPeppol interoperability, tax-data reporting, EmaraTax
  verification API, production trial); accreditation valid 2 years.
- Arts. 15-17: renewal at least 70 Business Days before expiry; termination
  and objection routes.
- Art. 19: pre-approved providers under MD 64 must complete accreditation
  "within a period not exceeding (30) thirty days from the effective date".
Product implication: becoming an ASP is a large, regulated undertaking
(Peppol membership, ISO 27001 and 22301, AED 12.5m insurance, 2 years of
product operation). An integration with existing ASPs is the realistic path.
The ASP list: https://mof.gov.ae/en/about-us/initiatives/einvoicing/pre-
approved-einvoicing-service-providers/ (page not read; naming "pre-approved"
may be stale after MD 168). Current accredited list: NOT FOUND.

### 3.6 Penalties (Cabinet Decision 106 of 2025 annexed table; PARTIAL)

1. Failure to implement the system, "including the failure to appoint an
   Accredited Service Provider within the timeline prescribed by the
   Minister": "AED 5,000 in case of delay for each month or part thereof".
2. Failure to issue and transmit an Electronic Invoice: "AED 100 for each
   Electronic Invoice up to a maximum of AED 5,000 per calendar month".
3. Same for an Electronic Credit Note: AED 100 each, max AED 5,000 per
   calendar month.
Source for exact words: tax.gov.ae/datafolder/Files/Legislation/2025/
Cabinet%20Decision%20No.%20106%20of%202025.pdf (search extract). Entry-into-
force date and any rows beyond 3: NOT READ.
The 25 Nov note said AED 5,000 per month only; rows 2 and 3 are new.
Voluntary users are exempt from penalties (MD 243 Art. 4(3)).

## 4. Corporate tax basics

All items here are PARTIAL: extracts or snippets of tax.gov.ae pages; the
Decree-Law (Federal Decree-Law 47 of 2022) was not read.

- Rate: FTA bulletin "Basic Tax Information Bulletin: Small Business" (search
  snippet): taxable income "not exceeding AED 375,000" at 0% (the 0% word was
  cut off in the snippet), "and 9% on the portion of the Taxable Income" above
  it. URL: https://tax.gov.ae/datafolder/Files/Pdf/2026/CT_TaxB_ulletin_EN_V5.pdf
  Full rate wording NOT READ; the AED 375,000 and 9% pair is consistent with
  the 25 Nov note.
- Filing and payment: FTA news 24 Sep 2025 (extract): submit returns "within a
  period not exceeding nine months from the end of their respective Tax
  Periods", else "late filing and late payment penalty fines". Payment is also
  due in that window. (A second FTA news page found by search says the same;
  not opened.) Example: a 31 Dec 2026 year end means due 30 Sep 2027 (my
  arithmetic from the nine-month rule).
- Small Business Relief: FTA topics page extract: "Revenue equal to or less
  than AED 3,000,000 in both the current and all previous Tax Periods";
  "Treated as not having derived any Taxable Income". An example on that page
  (Mr Y, Sharjah) uses a tax period ending 31 Dec 2026, so the relief is live
  for 2026. The last eligible tax period (our note: 31 Dec 2029): NOT
  VERIFIED here.
- Penalty amounts for late CT filing: NOT FOUND.
- Record retention (7 years in our note): NOT VERIFIED.

## 5. Gaps list

- VAT 201: current-year form layout and any upload format: NOT FOUND.
- VAT late-filing and late-payment penalties after Cabinet Decision 129/2025
  (in force 14 Apr 2026): NOT FOUND.
- E-invoicing Data Dictionary and mandatory field list: NOT FOUND.
- E-invoicing reporting timeline set by the Minister (MD 243 Art. 6(6)):
  NOT FOUND.
- Current list of accredited ASPs: NOT FOUND.
- Corporate tax Decree-Law text, late penalties, small business relief end
  date: NOT FOUND.
- Signed gazette copies of MD 66/2026 and MD 197/2026: only unsigned working
  copies seen on mof.gov.ae.
- Note: Boru Consulting and other consultancy pages that surfaced in
  search were used only to find instrument numbers, never as a source of rule
  text.
