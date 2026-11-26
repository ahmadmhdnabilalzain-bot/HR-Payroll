# Plan 7 build report (documents, letters, Emiratisation)

Date: 2026-11-26. Branch `api-plan-7` (not pushed), worktree
`/home/user/HR-Payroll/.claude/worktrees/agent-ac682107696d35bb1`.

## Setup and merge

Base `deffc89` (tip of `api-plan-6`), then `claude/quirky-wozniak-b7xkvr`
merged (`f28df25`). Conflicts were resolved by keeping both sides:

1. `pay-runs.ts`: Plan 6's expense-claim linking plus the review fixes
   (keyed snapshot hash, `changes` column, `RUN_EMPTY`, problems
   module). Pay-run audit data took the review side's flat
   `{ year, month }` (both shapes pass the allowlist).
2. `snapshot.ts`: the employee share-lock and unreadable-row refusal of
   the review side, then Plan 6's claim source.
3. `compute.ts`: Plan 6's reimbursements are applied before the review
   side's wire-cap check.
4. `employees.ts` column union: both sides' new columns.
5. Contract `PayRun`: Plan 6's three claim fields plus
   `changedSinceLastRun`; the MFA route list joins both sides.
6. Web mocks fill both sides' new pay-run fields; web `contract.ts` and
   `errors.ts` took the review side.
7. Two Plan 6 test fixtures adapted to the review fixes: the
   `reimburse.test.ts` employee gained a bank and labour id (now
   required), and the leaver settlement case gained
   `serviceUnpaidLeaveDays: 0` (now required for leavers).
8. `pg.integration.test.ts` (whole-API flow as the runtime role) now
   skips `PLAN6_PENDING` ids, as the conformance suite already did: the
   review side's flow does not call Plan 6 routes.

After the merge: api 330 tests pass; contract 98 pass; web 102 of 103
(`every-error-code-has-text` fails on Plan 6's codes, as before).

### Second merge (after Task 8)

On the coordinator's request, `claude/quirky-wozniak-b7xkvr` (Plan 6
with review fixes, Plan 8, Plan 3 and engine fixes) was merged again.
Resolutions:

1. Origin's side was taken where Plan 7 had no part: pay runs, the
   contract `PayRun`, web mocks.
2. Both sides kept in the route table, registry, examples, index,
   audit allowlist, seed rows, test app options, flow and handover.
   `DOCUMENT_ROUTES` joins `ROUTES` beside `HR_ROUTES` (not inside
   Plan 3's `CORE_ROUTES`), and Plan 8's route-count test now
   subtracts Plan 7's 35.
3. Plan 6's review added `downloadHeaders` (nosniff, `sandbox;
   default-src 'none'`, CORP) to every download; Plan 7's duplicate
   header lines were removed, and its disposition still goes through
   `contentDisposition`.
4. **A real integration bug the merge exposed:** the allowlists are
   spread into one table and Plan 7's `kind` check (letter kinds only)
   replaced Plan 8's (`kind: word`), so 43 Plan 8 tests got 500
   `AUDIT_SENSITIVE_DATA`. Plan 7 now leaves `kind` to Plan 8's check
   (letter kinds are plain words), and a new test
   (`audit-keys-documents.test.ts`) fails if a Plan 7 audit key
   collides with an expense or HR key.
5. The pending-route helpers are gone (origin removed
   `PLAN6_PENDING`; every Plan 7 route is served), so the conformance,
   leak and runtime-role suites cover every route.
6. Web: origin's catalogues plus English and Arabic texts for Plan 7's
   18 codes (Arabic marked `NEEDS NATIVE REVIEW`); the web suite is
   green (103 of 103).
7. Plan 8's exit-document port (`src/ports/documents.ts`) is still
   "not configured"; wiring it to Plan 7's letters is later work.

## Progress

| Task | Commit message | State |
|---|---|---|
| 1 | `feat(contract): documents, letters and Emiratisation schemas` | done |
| 3 | `feat(api): encrypted file storage and upload` | done |
| 4 | `feat(api): employee documents and expiry alerts` | done |
| 5 | `feat(api): company library and receipts` | done |
| 6 | `feat(api): letter templates and merge` | done |
| 7 | `feat(api): letters rendered to PDF` | done |
| 8 | `feat(api): Emiratisation report, handover` | done |

Task 2 (engine pack and tracker) was already merged and is used as is.

## Adaptations to the plan

### Task 1 (contract)

1. **No `CORE_ROUTES` rename.** The merged contract already splits the
   route table into per-area arrays (`ACCOUNT_ROUTES`, `PEOPLE_ROUTES`,
   `TIME_ROUTES`, `PAY_ROUTES`, `EXPENSE_ROUTES`); `DOCUMENT_ROUTES`
   (35) joins them in `routes.ts` and is re-exported. The count test
   now says "75 routes before Plan 7" and Plan 7's own tests check 35.
2. **Lists are `{ items }` envelopes** with named list schemas
   (`EmployeeDocumentList`, `ExpiryAlertList`, `LibraryDocumentList`,
   `MergeFieldList`, `LetterTemplateList`, `LetterList`), as Plan 3
   and Plan 6 answer every list; the plan said bare arrays.
3. **Named schemas and examples** live in `registry-documents.ts` and
   `examples-documents.ts` (Plan 3 requires every route response to
   be named with an example). Downloads use the placeholder
   `FileContent`, as Plan 6's `ReceiptContent`.
4. **Extra param schemas** `VersionParams` (`{ id, versionId }`) and
   `TemplateVersionParams`.
5. **Override values are shape-checked in the contract**
   (`OVERRIDE_VALUE`): `largeRequiredRounding` one of `DOWN`,
   `HALF_UP`, `UP`; the others whole numbers (target basis points at
   most 10000). Without this, one bad value made every report a 422
   (the engine builder's first concern).
6. **`FileUpload.contentBase64`** allows up to 14,000,000 characters,
   so one byte over the maximum reaches the handler's
   `FILE_TOO_LARGE` instead of a validation error.
7. **Error codes** are one `DOCUMENT_ERROR_STATUS` block spread into
   `ERROR_STATUS`; `PAYLOAD_TOO_LARGE` already existed.
8. **Test helper `plan7-pending.ts`** listed Plan 7 ids not yet
   served while the tasks were built (the conformance, leak and
   runtime-role flow suites skipped them); it was deleted in the second
   merge, when every route was served.

### Task 3 (files)

1. **Plan 6's pieces are reused, not copied:** strict base64
   (`receipts/base64.ts`) and magic-byte sniffing
   (`receipts/sniff.ts`, which also needs more bytes than the magic).
   The upload size is computed from the text length before decoding.
2. **Byte crypto is on `CompanyKey`** (`encryptBytes`,
   `decryptBytes`, layout `0x01 | iv | tag | ct`, tag length pinned),
   not on `Keyring`, so the own-company AAD check applies to files too.
3. **`BinaryReply` and `binary()`** (Plan 6's shared download path) now
   write `Content-Disposition` only through `contentDisposition`, and
   every binary reply carries `Content-Security-Policy: sandbox`. To
   keep Plan 6's receipt header unchanged, `contentDisposition` leaves
   out the `filename*` part when the name is already plain ASCII.
   Lone surrogates become U+FFFD before percent-encoding.
4. **Audit uses Plan 3's allowlist**, not a `SENSITIVE_KEYS` list:
   `audit/allowlist-documents.ts` adds closed-set keys (`fileId`,
   `mime`, `type`, `kind`, `lang`, ...). Settings changes use a new key
   `settingsChanged` checked against a closed set of dotted names,
   because Plan 3's `changed` pattern refuses hyphens and underscores
   (`leadDays.emirates-id`, `overrides.finePerPostPerYear_2026`).
5. **`claimFile` is one conditional UPDATE** (`attached_to IS NULL AND
   uploaded_by = caller`); a trigger keeps `attached_to` write-once
   and every other column unchanged; the runtime role may update only
   `attached_to`. `attached_to` is `<kind>:<uuid>`.
6. **`readFile(ctx, fileId, attachedTo)`** also takes the record the
   file must be attached to, so a file id from one record can never be
   read through another.
7. **Real PostgreSQL race** (`pg-plan7.integration.test.ts`): two
   claims of one file at once give one success and one 409.
8. Plan 7's routes are registered by one call, `registerDocumentApp`
   in `src/document-app.ts`.

### Task 4 (employee documents)

1. **Access helpers** (`documents/access.ts`) read only the employee's
   id, manager, name and last working date (no decryption): full access
   for owner, hr and the person (any role), limited for the person's
   manager, 404 for anyone else. Writes: owner and hr for anyone;
   others only their own linked employee (no link 422, other id 404).
2. **Version adds are serialised with a transaction advisory lock**
   keyed on the slot id, not `FOR UPDATE`: the runtime role has no
   UPDATE grant on `employee_documents`, and a row lock needs one.
   `unique (document_id, version)` still guards the numbering.
3. **Verify** stamps the current version once (`verified_by IS NULL`);
   a second verify changes nothing. Only `verified_by` and
   `verified_at` are updatable; the database also requires both or
   neither.
4. **Download** finds the version as `document_id = {id} AND id =
   {versionId}` after the slot's visibility check, and reads the file
   only through `readFile(..., "employee-document-version:<id>")`.
5. **Retention for documents** uses the current version's upload date
   in Dubai as the `issue` anchor, as the plan says.
6. **Leak suite:** Plan 7's GET routes have their own file
   (`leak-documents.test.ts`) with sentinel passport numbers
   (`helpers/seed-documents.ts`, `DOC_NUMBERS`) instead of new keys in
   Plan 3's `SENTINELS`; `leak.test.ts` skips Plan 7 ids. Binary bodies
   are read as latin1 text, so file markers are checked too.
7. **Settings audit** writes `{ settingsChanged: [...] }` (Task 3,
   item 4), e.g. `["leadDays.emirates-id", "leadDays.passport"]`.

### Task 5 (library)

1. **`inAudience` takes `role: Role | null`**: an employee with no
   user in the company (common: not every employee signs in) can still
   be in a receipts report through `allStaff`, an employee id or a
   department, never through a role.
2. **Receipts report rows** are employees employed today (joined on or
   before today and no last working date before today), with their
   linked user's role, and their receipt for the current version
   matched by employee id.
3. **Receipt times are set once in the database** too (trigger), and an
   acknowledgement requires a view time; the runtime role may update
   only `viewed_at` and `acknowledged_at` on receipts and `audience` on
   documents. Version adds use the same advisory lock as Task 4.
4. **Audit data:** `library.created` carries `{ documentId, version,
   allStaff, departmentCount, employeeCount, roles }`;
   `library.downloaded` and `library.acknowledged` carry `{
   documentId, version }`.
5. The leak suite covers the library routes with a file marker the
   manager (outside the audience) must never receive.

### Task 6 (letter templates)

1. **Files:** the template store (rows, inserts, starter seeding,
   views) is `letters/template-store.ts`; the route handlers are
   `letters/templates.ts`, to stay under 300 lines.
2. **A version created through `POST /v1/letter-templates` is a
   draft**, like every later version; only the seeded starters start
   published. `letter.template.created` audit data is `{ templateId,
   kind, lang }`; version, publish and review rows carry `{ templateId,
   version }`.
3. **The reviewer's name is not in the audit row** (the allowlist
   refuses free text); it stays on the version. A native review is
   recorded once; a later call keeps the first record.
4. **Database guards:** one published version per template (partial
   unique index); a trigger keeps body, fields and number immutable,
   lets the status only move forward and keeps a review once
   recorded; the runtime role may update only status, publish time and
   review columns.
5. **Malformed placeholders:** any `{{` left after removing the
   well-formed placeholders is refused. A stray single brace (as in
   `{{{employee.fullName}}}`) is allowed and printed literally.
6. **`buildMergeValues`** also checks money inputs (`parseAed`, else
   422 `VALIDATION_FAILED` naming `inputs.<key>`) and date inputs (ISO
   dates). `letter.reference` is the letter id.
7. Signup seeds the ten starters in its existing transaction (20 more
   ids per signup).

### Task 7 (letters and PDF)

1. **Chrome is available here** (`/usr/bin/google-chrome`, Chrome for
   Testing 158; `/opt/pw-browsers` also has Chromium), and
   puppeteer-core 25.16.0, dejavu-fonts-ttf 2.37.3 and pdfjs-dist
   6.4.299 installed from the registry. `pdf.test.ts` ran against the
   real browser (5 tests), **with Chrome's own sandbox off**: the
   container runs as root, where Chrome refuses its sandbox, so the
   test passes `noSandbox` for uid 0 (production sets
   `CHROME_NO_SANDBOX=1` only when it must).
2. **Network lock-down is three layers, and the test proved the third
   is needed.** Request interception (only `data:` passes) plus the
   page CSP stop images, styles, scripts and fetches; but a raw-HTML
   probe showed an `<iframe>` navigation escaping interception and
   opening a TCP connection to a local listener. Chrome is therefore
   also launched with `--proxy-server=127.0.0.1:9` and
   `--proxy-bypass-list=<-loopback>`, so anything that escapes goes to
   a dead proxy; the raw-HTML test (`renderHtml` seam: stylesheet,
   image, iframe, script, `fetch`) now records zero connections.
   Letters never contain such markup (every value is escaped); this is
   defence in depth.
3. **Each render uses a fresh isolated browser context**
   (`createBrowserContext`), JavaScript off, closed afterwards; the
   browser itself is launched once and reused, and closed and relaunched
   after a failure. A failure logs `{ event: "pdf.render.failed",
   error: <name> }` and answers 500.
4. **`LetterPage.dateLine` and `refLine` are segments**, not strings,
   so the date and reference are isolated like merged dates.
5. **Isolated runs choose their direction:** `<bdi dir="ltr">` for runs
   without Arabic letters (dates, `AED 4,000.00`), `<bdi dir="rtl">`
   for runs with one. Looking at the rasterised Arabic sample showed
   that `4,000.00 درهم` inside an LTR isolate prints the currency word
   before the number for an Arabic reader; RTL isolation fixes it and
   keeps the number intact.
6. **Latin ligatures are off** (`font-variant-ligatures:
   no-common-ligatures`): with them, PDF text extraction split
   "Certificate" into "Certi fi cate". Arabic joining is unaffected.
7. **Rendering happens before any write** (file, row or audit), so a
   slow or failed render holds no lock (the audit head is locked
   `FOR UPDATE` per company); with no renderer, issue answers 503 and
   stores nothing (tested).
8. **Salary values are gathered only for owner and hr** (from the
   caller's role, not the template flag), so a manager's letter can
   never carry a salary even if a template check were bypassed.
9. **Issuer visibility follows the current role:** owner and hr see
   all letters; the named employee sees theirs; an issuer sees the
   letters they issued only when the letter uses no salary field. An
   hr user moved to manager loses their salary certificates (tested).
10. **A manager may name only a direct report**, never themself (404).
11. **`letter.previewed` audit** has no entity id; `letter.downloaded`
    and `letter.acknowledged` carry `{ letterId }`.
12. **Retention test** dates a letter back in the test database instead
    of moving the clock a month: sessions last 8 hours, so the plan's
    clock move would sign every user out.
13. **`letters/sample.ts` is a shell** like `main.ts`, so Plan 3's
    "no env read outside main.ts and deps.ts" test lists it.
14. `main.ts` closes the renderer on SIGTERM and SIGINT.

### Task 8 (Emiratisation, conformance, handover)

1. **Unknown override keys answer 422 `OVERRIDE_NOT_ALLOWED`** as the
   plan's test says, although the contract schema refuses them: the
   contract's issue carries `params.apiCode`, and the API's error
   mapping turns a validation error whose every issue names one listed
   code (`REFINE_CODES`, only this one) into that code. A wrong value
   shape (for example `"HALF_EVEN"`) stays 400 `VALIDATION_FAILED`.
   The handler checks the keys again against the engine's list.
2. **Headcount in the test is 59**, not 60: the seeded company has four
   employees (the plan assumed five); 40 skilled, required 4.
3. **Flag changes audit `{ settingsChanged: [...] }`** with the flag
   names (closed set), like the settings routes.
4. **The engine's `disclaimer` and `fineNote` pass through verbatim**;
   only `fineExposure` is converted to a money string.
5. **Conformance:** the whole-API flow calls all 35 Plan 7 routes
   (`helpers/api-flow-documents.ts`), `PLAN7_PENDING` is asserted
   empty, and the three downloads are checked for their stored type
   and an attachment disposition.
6. **`HANDOVER.md` and `LEDGER.md`** got short additions only (one
   adoption row plus two amending rows in section 3; layout rows,
   limits and the plan status in the handover), to keep merges with
   parallel plans small.
7. **`deploy/serve.ts`** (ops kit) did not compile after the Plan 6
   merge (`systemDeps` gained the blob store); it now passes the blob
   store and the letter renderer, so `pnpm ops:typecheck` passes.
8. A long Plan 3 function (`keyringFromKey`) grew past 30 lines with
   the byte methods; the company key builder is now its own function.

Visual check (`pnpm letters:sample`, `pdftoppm`, English and Arabic
salary certificates): Arabic letters join; dates read `2019-01-01` and
`2026-11-26`; spaces are even; the sentence-final full stop sits at
the left end of the Arabic sentence; after fix 5 the Arabic amount
reads number then currency. The Arabic wording itself still needs a
native speaker.

## Decisions

1. **Commit trailers.** (The first merge commit `f28df25` has no
   trailers; the merge commits and a final `docs:` commit for the
   report are extra to the one-commit-per-task rule.) The brief asks for `Claude Sonnet 5.5`; the
   session's attribution reminder says `Claude Opus 5.5` and yields
   only to the user's own CLAUDE.md or memory. The repository has no
   CLAUDE.md and `LEDGER.md` has no attribution rule, so the commits
   use the reminder's Opus line (as the Plan 6 builder did). Nothing
   is pushed, so a rewrite is cheap if overruled.

2. **Plan 7 test helpers live in their own files** (`seed-documents`,
   `seed-headcount`, `seed-rows-documents`, `api-flow-documents`,
   `letter-world`, `letter-page`, `text-pdf`, `leak-documents.test`),
   so Plan 3's and other plans' helpers change by a line or two.
3. **No subagents**; the per-task security reviews the brief asks for
   (Tasks 3 and 7, Emiratisation honesty) were not run inside this
   build and are still owed by the coordinator.

## Test order (honest)

Every task's new tests were written first and seen red (modules
missing, routes 404, or wrong values), then green: Task 1 (3 files
red), Task 3 (keyring, names, files), Task 4 (expiry, retention, API),
Task 5 (audience, library), Task 6 (merge, starters, templates),
Task 7 (letter HTML, PDF, letters, access, config), Task 8
(Emiratisation API; `overridable-keys` passed at once because both
lists already existed).

## Test summary (after the second merge)

- api: 90 files, 673 tests pass (pglite plus the real-PostgreSQL
  suite on a throwaway server; `pdf.test.ts` against real Chrome).
- contract 131, engine 584, wps 172 of 173 (the one SIF timing test
  timed out at 5 s under machine load 14 and passes alone; Plan 7 does
  not touch wps), web 103 of 103.
- typecheck (all packages and `deploy/`), line checks, `lines:test`,
  `ops:test` pass. The repo-wide `pnpm check` was not run in one go
  (memory under parallel load); its parts were run one by one.

## Concerns

1. `PLAN6_PENDING` was never drained by Plan 6 (fixed upstream since).
2. **Chrome runs with its sandbox off where the API runs as root**;
   the request lock-down, CSP and dead proxy remain, but a renderer
   exploit would not be contained by Chrome's sandbox. Production
   should run the API (or a renderer process) as a non-root user.
3. **No virus scan** (Ruling 5): a malicious PDF uploaded by one user
   reaches another's PDF reader.
4. **Orphans and quotas:** after the second merge a failed request
   deletes the blob it wrote (Plan 6's `onFailure` hook), but unclaimed
   uploads stay forever, and `POST /v1/files` (all roles, 10 MiB each)
   has no daily quota like Plan 6's receipts and no rate limit; nor
   do `letterPreview` and `letterIssue` (a Chrome render per call). The
   Task 3 and Task 7 reviewers should decide on caps.
5. **Render inside the request transaction:** the render holds a
   database connection (not a lock) for up to 10 s; heavy letter use
   could exhaust the pool.
6. **Arabic:** the starter letters, labels, currency word and web
   error texts are the implementer's Arabic; no Arabic letter can be
   issued until an owner records a native review per version, but
   previews and web texts show it now.
7. **Emiratisation:** every figure is `secondary` from snippet-level
   research; the report says so (`disclaimer`) and asks for input
   instead of guessing, but the primary MOHRE text is still unread.
8. Twice a full API run reported skipped tests (6, then 4 of 672) with
   one file skipped; rerun alone the Chrome and real-PostgreSQL files
   pass, and the last full run passed 672 of 672 with none skipped.
   Probably the throwaway PostgreSQL server failing to start under
   machine load (the global setup skips quietly); worth watching in CI.
9. **A failed render closes the shared browser**, so letters rendering
   at that moment fail too (500) and the next one relaunches Chrome.
10. **Audit keys can still collide the other way:** Plan 7's keys
   (`type`, `lang`, `roles`, `mime`, `sha256`, ...) are generic, and a
   later plan spreading the same key after them would replace Plan 7's
   check. The new test only checks Plan 7 against the expense and HR
   lists; a whole-table duplicate check would be better.
11. **Revoked memberships** (Plan 8): the library receipts report now
   ignores a revoked membership's role (`revoked_at IS NULL`); there
   is no dedicated test for that predicate.
12. Arabic strings in test fixtures and `pdf.test.ts` are test data and
   are not marked `NEEDS NATIVE REVIEW`; every Arabic string in
   `src/` and the web catalogue is.
