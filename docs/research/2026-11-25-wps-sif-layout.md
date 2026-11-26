# WPS SIF file layout (sourced from two bank guides)

Read on 2026-11-25. Sources:

- S1: Dubai Islamic Bank, "WPS file format reference guide" v1.1
  (dib.ae PDF, 4 pages). Read in full.
- S2: Emirates Islamic, "Salary WPS file creation user guide"
  (emiratesislamic.ae PDF, 12 of 13 pages). Read.
- S3: Mashreq page: not reachable (DNS failure). Unread.

The primary MOHRE/CBUAE text is still unread. Treat this layout as
`secondary` until a primary document or a bank test confirms it.

## File shape

- ASCII, comma separated, one record per line, no header.
- One file per employer. Name: `EEEEEEEEEEEEE YYMMDD HHMMSS` joined
  without spaces, extension `.SIF` (S1 and S2 agree).
- Per employee: one `EDR` line, then an `EVP` line only when the
  employee has variable pay. The last line is one `SCR`.
- Not more than one EDR per employee per file (S1).
- A file that breaks the rules is rejected whole (S1).

## EDR (employee detail), 10 fields

| # | Field | Rule |
|---|---|---|
| 1 | Record type | `EDR` |
| 2 | Employee unique ID | Person ID. S1: 14 to 35 chars. S2: 14, zero-padded |
| 3 | Agent routing code | 9 digits, the employee's bank |
| 4 | Employee account | S1: 23 (IBAN). S2 table says 16, its text says IBAN of 23; samples use 23 |
| 5 | Pay start date | `YYYY-MM-DD`, not before 2010-10-01 |
| 6 | Pay end date | after start, same month as start |
| 7 | Days in period | end minus start plus 1 |
| 8 | Fixed income | amount, `0.00` if none, never negative |
| 9 | Variable income | amount, `0.00` if none, never negative |
| 10 | Days on unpaid leave | whole number, `0` if none |

## EVP (variable pay detail), 10 fields

1 `EVP`; 2 employee ID (same as EDR); 3 routing code (same as EDR);
4 housing; 5 conveyance; 6 medical; 7 annual passage; 8 overtime;
9 all other allowances; 10 leave encashment. Amounts, never negative.

## SCR (salary control), 10 fields

| # | Field | Rule |
|---|---|---|
| 1 | Record type | `SCR` |
| 2 | Employer unique ID | S1: 13 to 35 chars. S2: 13, zero-padded |
| 3 | Employer bank routing code | 9 digits |
| 4 | File creation date | `YYYY-MM-DD`, not after processing date |
| 5 | File creation time | `HHMM` |
| 6 | Salary month | `MMYYYY` (S1 says `MM-YYYY` but max size is 6, so it cannot fit) |
| 7 | EDR count | number of EDR lines |
| 8 | Total salary | sum of all fixed and variable in all EDRs |
| 9 | Currency | `AED` |
| 10 | Employer reference | optional, 35 chars |

Month must match the month of EDR fields 5 and 6 on every EDR (S1).

## Where the two guides differ

- Employee ID and employer ID length (flexible 14 to 35 and 13 to 35
  in S1, fixed 14 and 13 in S2).
- Account length (S2 table 16, but its text and samples use the 23
  character IBAN).
- Salary month: `MMYYYY` wins, since `MM-YYYY` exceeds the max size 6.
- S2 says salary month may be equal to or one more than the WPS
  processing month; S1 says it must match the pay dates.

Decision for the generator: emit the strictest common form (14 digit
zero-padded person ID, 13 digit zero-padded employer ID, 23 character
IBAN account, `MMYYYY`) and make every length a rule-pack parameter so
a bank can override it. See Plan 2.

## Routing codes (S2 table, subset)

The full table is in S2. The generator ships a small, dated table of
codes as data, flagged `secondary`, and refuses to guess a code.

| Bank | Code |
|---|---|
| Dubai Islamic Bank | 802420101 |
| Emirates Islamic | 703420114 |
| Emirates NBD (also NBD) | 302620122 |
| Mashreq | 203320101 |
| Abu Dhabi Commercial Bank | 600310101 |
| RAK Bank | 604060101 |

A routing code and IBAN bank-id may not match. Real bank-code table
lookups must come from the bank or the central bank before production.

## Samples (from the guides; the S1 SCR line is shortened)

```
EDR,00915012345663,802420101,AE160240043520123456701,2016-01-01,2016-01-31,31,4000.00,2500.00,0
EVP,00915012345663,802420101,500.00,200.00,300.00,0.00,400.00,1100.00,0.00
SCR,0000000123456,802420101,2016-01-26,1130,012016,01,6500.00,AED,abc company
```

Note: in both samples the EVP allowances add up to the EDR variable
component, and the SCR total equals fixed plus variable. Only the
second is a stated rule (SCR total = sum of fixed and variable over all
EDRs): a hard error. The EVP sum is inferred from samples only: a
warning or a parameter, never a hard error.

Further points the validator must handle: free text may not contain
commas or non-ASCII (no quoting exists); the file name needs seconds
(HHMMSS) while the SCR has HHMM; EDR count appears as `01` and `1`;
the S2 sample has spaces after commas (trim or reject, decided in
Plan 2); line endings are unspecified (parameter); one month per file.
IBAN bank digits, entity id and routing-code digits 2 to 4 agree in the
samples (024 for DIB, 034 for Emirates Islamic): a warning check.

## Open items

- Primary text: the central bank spec named in the DIB guide, "UAEWPS
  ENTAUX 998 Corporate Responsibility Guide V2015-01", section 7.6.2.
  Page 13 of the Emirates Islamic guide is unread.
- Real acceptance by a bank (a test upload) is the only proof.
- Refund file (RFR with FDR and FCR records) is out of scope for now.
