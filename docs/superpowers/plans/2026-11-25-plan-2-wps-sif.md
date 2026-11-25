# WPS SIF Generator and Validator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development to implement this plan
> task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Generate and validate UAE WPS salary files (SIF) from pay
amounts, with findings that point at the exact line and field.

**Architecture:** A new pure package `packages/wps` next to the engine. It
imports money only from `@payroll/engine`. No clock, file, network or
zod in the core; a thin shell (`src/shell.ts`, `src/main.ts`) reads JSON
and writes files. Layout lengths are parameters with a source and a
status, so a bank difference is a data change.

**Tech Stack:** TypeScript 7, Vitest, fast-check, tsx (same pins as the
engine).

**Spec:** `docs/research/2026-11-25-wps-sif-layout.md` (layout and
conflicts), `docs/superpowers/specs/2026-11-25-master-feature-list.md`,
`docs/engineering-standards.md`.

## Global Constraints

- 80-character lines; files under about 300 lines; functions under 30.
- Money is `Fils` (bigint). Amounts print with exactly two decimals,
  never negative, no thousands separators.
- Output is ASCII, comma separated, one record per line, EDR (then EVP
  when variable pay exists) per employee, one SCR last.
- Dates `YYYY-MM-DD`; creation time `HHMM`; salary month `MMYYYY`.
- Person id 14 digits and employer id 13 digits, zero padded; account 23
  chars; routing codes 9 digits. All lengths come from `SifLayout`.
- File name: employer id (13) + `YYMMDD` + `HHMMSS` + `.SIF`.
- Never say "WPS compliant". The report says: layout matches two bank
  guides, unconfirmed by MOHRE or a bank test.
- Errors are `EngineError` with a stable code and the offending value.
- No clock: creation date and time are inputs.

## Review Focus

- Arabic employer reference or employee name pasted into free text:
  must be rejected with a clear finding, not written as garbage.
- A comma inside any free text field: rejected (no quoting exists).
- Employee paid in two months or two EDRs for one person: rejected.
- Zero-amount employee (fixed 0.00, variable 0.00): reported, not
  silently dropped.
- Pay period crossing a month, or month differing from the SCR month.
- Totals: SCR total must equal the sum over EDRs to the fils, for
  thousands of employees (no float drift).

---

### Task 1: Package, layout parameters and format primitives

**Files:**
- Create: `packages/wps/package.json`, `packages/wps/tsconfig.json`
  (copy the engine's), `packages/wps/src/layout.ts`,
  `packages/wps/src/format.ts`, `packages/wps/src/findings.ts`
- Test: `packages/wps/tests/format.test.ts`

**Interfaces:**
- Produces `SifLayout` (readonly): `personIdLength: 14`,
  `employerIdLength: 13`, `accountLength: 23`, `routingLength: 9`,
  `minPayStart: "2010-10-01"`, `lineEnding: "\r\n"`, `currency: "AED"`,
  `source: string`, `status: "secondary"`; `defaultLayout`.
- Produces `Finding { code: string; severity: "error" | "warning";
  line: number; field: number | null; message: string; value: string }`.
- Produces `formatAmount(f: Fils): string` ("2345.87", "23.00"),
  `padId(id: string, len: number): string`,
  `formatMonth(y: number, m: number): string` ("012016"),
  `isAscii(s: string): boolean`, `isoDate(y,m,d): string`.

- [ ] Write failing tests: `formatAmount(fils(234587n))` is `"2345.87"`,
  `fils(2300n)` is `"23.00"`, `fils(0n)` is `"0.00"`, a negative amount
  throws `NEGATIVE_AMOUNT`; `padId("915012345663", 14)` is
  `"00915012345663"`; an id longer than 14 throws `ID_TOO_LONG`;
  `formatMonth(2016, 1)` is `"012016"`; `isAscii("abc")` true,
  `isAscii("شركة")` false.
- [ ] Run `pnpm --filter @payroll/wps test`; expect failures.
- [ ] Implement the files above (`layout.ts` holds data only).
- [ ] Run tests and `pnpm check`; expect pass.
- [ ] Commit: `feat(wps): layout parameters and format primitives`.

### Task 2: Record builders

**Files:**
- Create: `packages/wps/src/records.ts`
- Test: `packages/wps/tests/records.test.ts`

**Interfaces:**
- Consumes: Task 1 exports.
- Produces types `EdrInput { personId; routingCode; account; payStart;
  payEnd; days; fixed: Fils; variable: Fils; unpaidLeaveDays: number }`,
  `EvpInput { personId; routingCode; housing; conveyance; medical;
  passage; overtime; otherAllowances; leaveEncashment: Fils }`,
  `ScrInput { employerId; bankRoutingCode; createdDate; createdTime:
  "HHMM"; month: string; edrCount: number; total: Fils; reference?:
  string }`.
- Produces `edrLine(e, layout): string`, `evpLine`, `scrLine`.

- [ ] Write failing tests using the DIB guide sample: building an EDR with
  person `915012345663`, routing `802420101`, account
  `AE160240043520123456701`, `2016-01-01`, `2016-01-31`, 31, fixed
  400000n, variable 250000n, leave 0 gives exactly
  `EDR,00915012345663,802420101,AE160240043520123456701,2016-01-01,2016-01-31,31,4000.00,2500.00,0`.
  The matching EVP (50000n, 20000n, 30000n, 0n, 40000n, 110000n, 0n)
  gives `EVP,00915012345663,802420101,500.00,200.00,300.00,0.00,400.00,1100.00,0.00`.
  SCR with employer `123456`, routing `802420101`, `2016-01-26`, `1130`,
  month `012016`, count 1, total 650000n, reference `abc company` gives
  `SCR,0000000123456,802420101,2016-01-26,1130,012016,1,6500.00,AED,abc company`
  (EDR count is printed without padding; ruling recorded in ledger).
- [ ] Also test: a comma in `reference` throws `FIELD_HAS_COMMA`;
  Arabic text throws `FIELD_NOT_ASCII`; reference over 35 chars throws
  `FIELD_TOO_LONG`.
- [ ] Implement builders; each field goes through one `field()` helper.
- [ ] Run tests; expect pass. Commit `feat(wps): record builders`.

### Task 3: File generator

**Files:**
- Create: `packages/wps/src/generate.ts`, `packages/wps/src/filename.ts`
- Test: `packages/wps/tests/generate.test.ts`

**Interfaces:**
- Produces `SifBatch { employerId; bankRoutingCode; createdDate;
  createdTime: "HHMMSS"; month: {year; month}; reference?; employees:
  Array<{ edr; evp?: EvpInput }> }`.
- Produces `generateSif(batch, layout?): { fileName: string; text:
  string; lines: string[]; total: Fils }`.
- Produces `sifFileName(employerId, createdDate, createdTime, layout)`.

- [ ] Failing tests: the DIB sample batch produces the three sample lines
  in order with SCR last; the total is the sum of fixed and variable;
  file name for employer `965625`, `2009-10-25`, `163000` is
  `0000000965625091025163000.SIF`; SCR time is the first four digits of
  the file time; an EVP is emitted only when variable is greater than
  zero; zero employees throws `EMPTY_BATCH`; two EDRs for one person
  throw `DUPLICATE_EMPLOYEE`; pay dates outside the batch month throw
  `PAY_PERIOD_MONTH_MISMATCH`; `days` that is not end minus start plus 1
  throws `DAYS_MISMATCH`; start before 2010-10-01 throws
  `PAY_START_TOO_EARLY`.
- [ ] A fast-check property: for random batches (1 to 200 employees,
  amounts up to 10,000,000 fils) the SCR total text equals the exact
  bigint sum.
- [ ] Implement; generation throws `EngineError` on the first problem and
  never writes a partial file.
- [ ] Run tests; commit `feat(wps): file generator`.

### Task 4: Parser and validator

**Files:**
- Create: `packages/wps/src/parse.ts`, `packages/wps/src/validate.ts`,
  `packages/wps/src/iban.ts`
- Test: `packages/wps/tests/validate.test.ts`

**Interfaces:**
- Produces `parseSif(text): { records: ParsedRecord[]; findings:
  Finding[] }` (accepts `\n` and `\r\n`, trims spaces around fields and
  reports `FIELD_HAS_SPACES` as a warning).
- Produces `validateSif(text, layout?, today?): Finding[]` (`today` is
  an input, an ISO date).
- Produces `ibanChecksumOk(iban: string): boolean` (mod 97).

Findings (code: severity): `NO_SCR` error; `SCR_NOT_LAST` error;
`RECORD_TYPE` error; `FIELD_COUNT` error; `ID_FORMAT` error;
`ROUTING_FORMAT` error; `ACCOUNT_LENGTH` error; `IBAN_CHECKSUM`
warning; `ROUTING_IBAN_BANK_MISMATCH` warning (IBAN digits 5 to 7,
routing digits 2 to 4); `DATE_FORMAT` error; `DAYS_MISMATCH` error;
`NEGATIVE_AMOUNT` error; `DUPLICATE_EMPLOYEE` error;
`MONTH_MISMATCH` error (SCR month vs every EDR); `EDR_COUNT_MISMATCH`
error; `TOTAL_MISMATCH` error; `EVP_WITHOUT_EDR` error;
`EVP_MISSING` warning (variable greater than zero but no EVP);
`EVP_SUM_MISMATCH` warning (inferred rule, samples only);
`FUTURE_CREATION_DATE` error; `NON_ASCII` error; `ZERO_PAY` warning.

- [ ] Failing tests: the DIB sample text returns no errors; the Emirates
  Islamic sample (`DUMMYEMP` ids, spaces after commas) returns
  `ID_FORMAT` errors and `FIELD_HAS_SPACES` warnings but parses;
  one test per finding code above with a minimal broken file, asserting
  code, line number and field number.
- [ ] Failing test: `generateSif` output of any valid batch validates
  with zero errors (round trip, fast-check, 100 runs).
- [ ] Implement. Parser never throws on bad input; it reports findings.
- [ ] Run tests; commit `feat(wps): parser and validator`.

### Task 5: Routing code table and report

**Files:**
- Create: `packages/wps/src/routing-codes.ts`,
  `packages/wps/src/report.ts`
- Test: `packages/wps/tests/routing.test.ts`, `packages/wps/tests/report.test.ts`

**Interfaces:**
- Produces `ROUTING_CODES: readonly { entityId: string; name: string;
  code: string }[]` (banks only, from the Emirates Islamic guide table in
  the research note; header comment: source, date, `secondary`, table is
  old and some banks have merged) and `lookupRouting(code): string |
  null`.
- Produces `renderReport(findings, fileName): string` in plain English:
  counts, each finding with line and field, and the closing statement:
  "Layout matches two bank guides. Not confirmed by MOHRE or a bank
  test."

- [ ] Failing tests: `lookupRouting("802420101")` is Dubai Islamic Bank;
  unknown code returns null; a routing code not in the table is a
  warning `ROUTING_UNKNOWN` in the validator, not an error; report for
  a clean file starts with "No errors" and contains the closing
  statement, never the words "compliant" or "approved".
- [ ] Implement; wire `ROUTING_UNKNOWN` into `validateSif`.
- [ ] Run tests; commit `feat(wps): routing codes and report`.

### Task 6: Demo command, sample and handover

**Files:**
- Create: `packages/wps/src/shell.ts`, `packages/wps/src/main.ts`,
  `packages/wps/samples/batch.json`, `packages/wps/src/batch-schema.ts`
  (zod, shell only)
- Modify: root `package.json` (scripts `sif` and `sif:check`),
  `HANDOVER.md`, `LEDGER.md`
- Test: `packages/wps/tests/cli.test.ts`, `packages/wps/tests/purity.test.ts`

**Interfaces:**
- `pnpm sif -- <batch.json> [--out dir]` writes the `.SIF` file and
  prints the report; `pnpm sif:check -- <file.SIF>` validates a file.
- Batch JSON amounts are strings ("4000.00"), parsed with `parseAed`.

- [ ] Failing tests: the sample batch writes a file whose validation has
  no errors; a purity test (same method as the engine's) shows no
  `Date`, `fs`, `process`, `fetch` or zod import under the pure core
  files; invalid JSON gives a clear error with the field path.
- [ ] Implement shell and main; keep the pure core free of I/O.
- [ ] Run `pnpm check` and both commands; expect pass.
- [ ] Update `HANDOVER.md` (state, commands, layout, limits: layout
  unconfirmed by MOHRE, routing table old, amounts are inputs) and
  `LEDGER.md` (done, rulings).
- [ ] Commit `feat(wps): demo command and handover`.
