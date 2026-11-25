# WPS / SIF primary-source check (2026-11-25)

Scope: only what was actually read is quoted or relied on. Anything
else is marked NOT READ.

## 1. Central bank Corporate Responsibility Guide

### V2018-001 (CBUAE, doc code UAEWPS-CRG01, Feb 2018) - READ
URL (copy hosted by GCAA, not CBUAE):
https://www.gcaa.gov.ae/en/epublication/EPublications/Forms%20Download/Safety%20Affairs/General%20Publications/UAE%20Central%20Bank%20Wages%20Protection%20System%20(WPS)/UAEWPS%20AUX998%20-%20V2018-001%20-%20CORPORATE%20RESPONSIBILITY%20GUIDE.pdf

Read all 29 pages. It is an overview guide only. It has NO section
7.6.2 and NO EDR/EVP/SCR field tables (its section 7 is "Leave
Salaries & Compliance in LRA Records"). So it does not settle field
layouts. What it does state (read):
- Person Id for the Ministry of Labour is "NUMERIC 14 DIGITS Prefixed
  with leading zeros". Employer Id is 13 digits for MOL.
- Banked employees: routing code is a "9 digit number"; account
  number is the employee's account at the agent bank.
- "In UAEWPS, salary files [SIF] can only have salaries for the same
  MONTH & YEAR." Leave salaries for other months go in separate SIFs.
- One employer per file; files with mixed employers are rejected.
- No limit on the number of SIF files per month.
- Fixed/variable split: a company that cannot split may put one total
  in either field; burden of proof is on the company.
- EOSB must not be paid through UAEWPS.
- All pay in AED through a WPS agent (note: this 2018 text conflicts
  with the u.ae 2026 page below, which allows other currencies).

### V2015-01 (the doc DIB cites, section 7.6.2) - NOT FOUND
Search returned no copy. DIB's guide only cites it. Not read.
No CBUAE/MOHRE page with a standalone official SIF spec was found.

## 2. MOHRE resolutions and u.ae

### u.ae payment-of-wages page - READ (HTML, updated 14 Oct 2026)
https://u.ae/en/information-and-services/jobs/Sector-of-employment/employment-in-the-private-sector/payment-of-wages
Read facts: wages paid per Ministerial Resolution 340 of 2026;
salaries due on the 1st day of the next Gregorian month; employers
must transfer at least 85 per cent of wages due on time (where
lawful deductions apply); payment may be in AED or another currency
if agreed in the contract; penalty ladder from day 2 to day 21;
exclusions include workers on unpaid leave with documents filed.
It has no SIF field detail.

### Resolution 340 of 2026 PDF - NOT READ
https://www.mohre.gov.ae/assets/download/9e530b2e/Ministerial%20Resolution%20No.%200340%20of%202026.pdf.aspx
First scrape failed (ERR_TUNNEL_CONNECTION_FAILED). A retry with the
stealth proxy option was blocked by the permission system, and I did
not try further workarounds. Nothing here is from the PDF text.
Secondary only (search snippets, not verified against the PDF): EY
says issued 12 May 2026, effective 1 June 2026, repeals Resolution
598 of 2022.

### Resolution 598 of 2022 PDF - NOT READ
https://www.mohre.gov.ae/assets/download/c9a61f1a/Ministerial%20Resolution%20No.%20598%20of%202022%20Regarding%20the%20Wages%20Protection%20System%20and%20Its%20Amendment.pdf.aspx
Scrape failed with the same tunnel error; not retried.

## 3. Bank SIF guides

### DIB v1.1 and Emirates Islamic - already known; re-seen in search
excerpts only, not re-scraped.
https://www.dib.ae/docs/default-source/wps-guidelines/wps-file-format-reference-guide_v1-1.pdf
https://www.emiratesislamic.ae/-/media/ei/pdfs/business-online/salary-and-utility-payments/ei_businessonline_salary_wps_file_creation_user_guide.pdf
Excerpt observations vs your 10/10/10 layout (excerpts, not full read):
- DIB SCR field 06 label says "MM-YYYY" but its own sample uses
  012016 (MMYYYY). Internal inconsistency in DIB text.
- DIB SCR has a 10th optional field, Employer Reference (35 AN);
  sample line ends with a free-text name. Excerpt of DIB EDR table
  shows 10 fields; EDR 10 is "Days on Leave" (unpaid leave days).
- DIB SCR field 04/05: date YYYY-MM-DD, time HHMM. SCR field 08 is
  total salary = sum of fixed + variable across EDRs; 09 is AED.
- DIB sample EDR (read): EDR,00915012345663,802420101,
  AE160240043520123456701,2016-01-01,2016-01-31,31,4000.00,2500.00,0
- EI excerpt sample SCR (read): SCR,0002569698756,302265895,
  2009-10-25,1630,102009,10,14603.91,AED, ... and the EI EDR rows
  carry 10 fields ending in unpaid leave days. EI also says EVP is
  mandatory only if variable pay is given in the EDR.
- EI sample file name pattern in excerpt: employer id + YYMMDDHHMMSS
  + ".SIF".

### Third bank (Mashreq, ENBD, ADCB, FAB, RAKBANK) - NOT FOUND
Two searches returned no bank-hosted guide from these banks. Not read.

### Non-bank, NOT primary (read as search excerpts only)
Zoho Payroll academy (https://www.zoho.com/en-ae/payroll/academy/
compliance/wps-sif-file-format.html, Apr 2026). It DIFFERS from the
bank guides and should not be trusted as the spec:
- It says SCR is the FIRST line and EDRs follow; DIB/EI put SCR last.
- Its EDR field 10 is "Leave / reference" free text, not unpaid
  leave days; its SCR example has 9 fields (no employer reference).
- It says no EVP record exists in the file.
Treat as secondary; conflicts with DIB and EI on line order and EDR
field 10.

## Open items for the next pass
- Obtain Resolution 340/2026 and 598/2022 text (try a browser or
  manual download; Firecrawl tunnel failed for mohre.gov.ae).
- Find the V2015-01 guide section 7.6.2, or a bank-hosted guide
  from ENBD/Mashreq/ADCB/FAB/RAKBANK.
- Decide how to handle the 2018-guide vs u.ae currency conflict
  (AED-only vs contract currency) before encoding validation rules.
