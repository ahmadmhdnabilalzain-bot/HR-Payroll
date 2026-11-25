# UAE VAT, Corporate Tax and E-invoicing (25 Nov 2026)

One researcher, 13 searches, snippets only. OFFICIAL means seen on tax.gov.ae,
mof.gov.ae or u.ae in a snippet; SECONDARY is a firm or news summary;
UNVERIFIED is not confirmed. Read the official text before building any rule.

## E-invoicing (the dates that matter)

- Basis: Ministerial Decisions 243 and 244 of 2025 (OFFICIAL, mof.gov.ae).
  Covers any person doing business in the UAE regardless of VAT status, with
  exclusions in Article 4.
- Timeline (OFFICIAL, amended Decision 244): revenue AED 50 million or more:
  appoint an accredited service provider (ASP) by 30 Oct 2026 (already
  passed), go-live 1 Jan 2027. **Under AED 50 million: appoint an ASP by
  31 Mar 2027, go-live 1 Jul 2027.** Government: go-live 1 Oct 2027. Voluntary
  pilot from 1 Jul 2026 (SECONDARY).
- Fine: AED 5,000 per month for failing to implement or appoint an ASP
  (OFFICIAL, MoF news).
- Standard: Peppol PINT AE XML, 51 mandatory data elements (SECONDARY).
  Official documents: Electronic Invoicing Guidelines v2.0 (26 Oct 2026) and
  Mandatory Field Requirements v1.1 (28 Oct 2026) on mof.gov.ae.
- E-invoicing does not replace VAT tax invoice or credit note requirements
  (OFFICIAL).
- Businesses must use an ASP. Accreditation criteria for software vendors and
  the current ASP list: not found in these searches; check mof.gov.ae.

## VAT

- Standard rate 5% (OFFICIAL, FTA guide dated 2018; re-check).
- Full tax invoice (Cabinet Decision 52 of 2017, Article 59): "Tax Invoice"
  label, unique sequential number, issue date, supply date if different, unit
  price, quantity, rate and amount per line, VAT shown in AED with the
  exchange rate when not AED; supplier and recipient details with TRN are
  standard (full list UNVERIFIED in snippets). Buyer-created invoices need a
  written agreement and the label "buyer-created tax invoice".
- Simplified invoice: allowed when the buyer is unregistered, or registered and
  consideration is up to AED 10,000 (OFFICIAL).
- Credit note (Article 60): label "Tax Credit Note", party details, issue
  date, original and corrected values, VAT difference, reason, reference to the
  original supply (OFFICIAL).
- Foreign currency: VAT in AED at the Central Bank rate on the date of supply
  (OFFICIAL, Decree-Law 8 of 2017 Article 69 and FTA guidance).
- Registration: mandatory above AED 375,000 turnover (past 12 months or next
  30 days), voluntary from AED 187,500 (OFFICIAL).
- Return: usually quarterly, due by the 28th day after the period end; nil
  returns still required (OFFICIAL). **Full box layout of the VAT return was
  not found**; use the FTA VAT Returns User Guide. The FTA upload format
  (file or portal fields) was not found in these searches.
- Input VAT: needs a valid tax invoice; blocked for non-employee entertainment.
  New: FTA Decision 17 of 2026 sets conditions for input VAT recovery on
  employee expenses (SECONDARY summaries: six categories, a documented
  reimbursement policy, receipts with date, time and tax); read the official
  text before building expense VAT logic.
- Record retention: 5 years after the period end (OFFICIAL).

## Corporate tax

- 0% on taxable income up to AED 375,000, 9% above (OFFICIAL).
- Small business relief for revenue up to AED 3 million, extended to tax
  periods ending on or before 31 Dec 2029 (MoF announcement; the FTA page may
  still say 2026). Not for qualifying free zone persons or multinational group
  members.
- Return and payment due within 9 months of period end (OFFICIAL). Field list
  not found; use the FTA return guide. Records kept 7 years.
- Qualifying free zone persons: 0% on qualifying income, 9% on the rest.
- Entertainment 50% deductible; remuneration must be reasonable and for
  services (OFFICIAL).

## Payroll interaction

Gratuity deductibility on an accrual basis and VAT or WPS treatment of
salaries: SECONDARY or not found. No FTA statement found.

## What this means for the product (a bet)

- Because the owner's targets are SMEs, most customers fall in the group with
  an ASP deadline of 31 Mar 2027 and go-live on 1 Jul 2027. An e-invoicing
  integration through an accredited provider has a real deadline pulling
  customers in.
- "FTA-ready VAT reports" needs the official upload format, which is not yet
  found. First step: read the VAT Returns User Guide and the FTA portal's
  accepted formats.
- We integrate with an ASP at first; becoming an ASP needs accreditation
  criteria we have not found.
