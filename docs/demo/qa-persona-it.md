# QA persona: the suspicious IT Manager (26 Nov 2026)

Tested on a private clone of branch `integ` (commit 0448198), built and
served with `vite preview` on port 5403, driven by Playwright (Chromium).
No repository file was edited. Screenshots and raw output are in
`/tmp/claude-0/-home-user-HR-Payroll/55600167-2f81-585b-8597-bc047d967ec5/
scratchpad/persona-it/` (it-*.png, audit-*.png, keys-*.png,
hook-*.png, offline-it.png, and the text dump it-text.txt).

## Verdict in four lines

- The hard edges hold: no outside requests, nothing stored but language
  and theme, no secrets in the page, route guard blocks every deep link
  we tried, and the offline file works from file://.
- The weak spots are claims, not code: "IT sees no salaries" is not true
  on screen, and the audit text promises more than the demo shows.
- All role limits in the demo are a browser filter on data that every
  role already holds in the page. The demo cannot prove enforcement.
- Nothing is certified, tested externally or hosted in the UAE. Say so
  first; the written pages already do.

## What was tested

- 5 roles; 228 page loads over the three roles that matter (HR, IT,
  employee), plus 25 hand-picked deep links per role (employee, manager,
  IT, HR), with Arabic switched on (`?ar=1`) for one pass.
- Interaction: audit chain check and "Edit one entry", API key revoke and
  undo, webhook pages and settings tab, user and role pages, data import
  and its downloads, data location downloads, IT dashboard CSV.
- Storage and network after those actions; page source of the build.
- Offline build (`build:offline`, 2.0 MB single file) opened by file://.
- `pnpm audit --prod` (it worked: registry reachable).

## Findings, ranked

### High (will be noticed in the first ten minutes)

H1. IT is told it "sees no salaries" but sees pay figures.
Evidence, logged in as IT manager (Vikram Rao):
- `#/reports/audit`: monthly net pay totals ("net AED 951,900.00, 30
  people"), "raise of AED 1,000.00 to Omar Farouk's basic salary", "Final
  settlement drafted for James Whitfield: AED 191,702.27", expense
  amounts, and who took sick or unpaid leave and when.
- `#/people/requests/splits`: "October pay run ... AED 933,730.94".
- `#/setup/data/import`: "The basic salary in the file is AED 1,000.00
  lower than in the October pay run" (names the person).
- Download sample file on `#/setup/data/import` gives
  `people-from-old-system-sample.csv` with basic salary and a full IBAN
  for 11 people (invented numbers, but it is the IT role pulling them).
- `#/people/emp-002` shows nationality and sick-leave days to IT.
- Contradicts the role text "Runs access and connections; sees no
  salaries." (`packages/demo-data/src/wp9.ts:89`, shown on `#/setup/
  access/roles`) and the owner note ("IT administrator sees no
  salaries"). IT salary-field access (profile, payslip, pay run) is
  correctly blocked; the leak is through audit, splits and import.
Fix: remove amounts and names of pay changes from what IT sees, or
change the sentence to say what IT does see.

H2. The audit page promises more than the demo does.
- `apps/web/src/reports/screens/Audit.tsx:12`: "Every action is written
  down once and cannot be changed quietly." The same page has an "Edit
  one entry" button that changes an entry in the copy.
- Revoking an API key (Revoke, then Undo is offered) added no audit
  entry: the trail stayed at 58 entries. Key created and webhook created
  are logged, key revoked is not. A suspicious reader tries exactly this.
- The IT dashboard and the CSV say "Audit trail chain: 58 entries
  checked, none changed since they were written. OK"
  (`packages/demo-data/src/wpe-brief.ts:325`) while the Audit page says
  "Not checked yet" until the button is pressed. Nobody checked.
- "Chain checked: all 58 entries fit" is worked out in the browser from
  the same data; the page does say it is not a legal proof (good).
Fix: soften the lede (see claims list), log the revoke, and make the
dashboard say "Not checked in this session" until the check is run.

H3. The demo cannot show that access is enforced.
- The role menu is open to everyone: any viewer can switch to General
  manager. Guards are a client-side route filter (`mayOpen` in
  `nav/registry.ts`); demo data is built in the browser for all roles.
- Within that limit the filter is good. Blocked with "This page is
  outside your view" for employee and manager: `#/pay-run` and every
  sub-page, `#/reports` and every report, `#/setup/*`, other people's
  profile, payslip, `/salary`, `/bank`. Employee and manager reach only
  their own payslip. For IT: pay run, every report except the audit
  trail and IT dashboard, `#/me/payslips`, `#/me/profile`, encashment.
- Real enforcement (permissions, row-level security) exists in the
  backend, not in what was shown, and has had no outside test.

### Medium

M1. Second sign-in step is optional for roles that read sensitive data.
Roles page: Finance read only (sees pay runs), IT support (reads the
audit trail, which holds the amounts in H1), Auditor read only,
Line manager are "Optional". Three of 12 users have no second step
(Hamdan Al Dhaheri, Arjun Menon, Emily Carter, IT support). The sign-in
page says "None of them holds an admin role", true but it hides that
Emily reads the audit trail. Single sign-on: "not set up in the demo".

M2. Hosting claim cannot be checked from the repository.
"The page is served from a server in Frankfurt, Germany"
(`packages/demo-data/src/wp9.ts:589`, also the IT note and click script)
but `render.yaml` sets no region, and the file still points at a
placeholder page. A static site is normally delivered through a CDN, so
"a server in Frankfurt" may be wrong. Check in the host's dashboard or
soften.

M3. No browser security headers beyond the basics.
`render.yaml` sets only X-Robots-Tag, X-Content-Type-Options and
Referrer-Policy. No Content-Security-Policy, X-Frame-Options
(click-jacking) or HSTS in the repo, and `index.html` has no CSP meta.
The API code does set a strict CSP on letter output; the web site does not.

M4. Master key is an environment variable.
`PAYROLL_MASTER_KEY` (32 bytes, base64) wraps one data key per company
(AES-256-GCM, key id for rotation, `packages/api/src/crypto/keyring.ts`).
No key vault, HSM or tested rotation procedure in the repo. A bank
will ask. Not tested by this review.

M5. Bearer-link features a bank may reject. Calendar feeds
(`#/setup/more/calendar`): "Anyone with the address can read it, so
keep it secret", and the Team leave feed lists staff leave. WhatsApp
decisions and email-in (`#/setup/more/whatsapp`, `/email-in`) put
approvals and documents through outside channels. All off in the demo.

M6. Role change has no second person named. The audit trail shows
the IT administrator changing a user to HR officer on his own
(9 Feb 2026) and narrowing a role. Separation-of-duties checks only
compare today's roles; they do not stop IT granting itself a role.

M7. Webhook payload is not shown. The pages show name, address
(`https://hooks.finance.zarqan-demo.test/payroll`), masked secret
(`************5e2b`) and delivery log, but not what data a "pay run
signed off" call carries (amounts? names?).

### Low

L1. Raw codes in the UI: `payrun.signed-off`, `salary.signed-off`,
`leave.signed-off` in the audit trail and webhook list.
L2. `#/setup` on its own shows "We could not find that" for IT and HR.
L3. A revoked API key can be restored with Undo. For a security control
say that revoke is final or that undo is a demo convenience.
L4. No key create, rotate, expiry or IP limit is shown (keys are
read-only, masked `zbk_demo_****************a91f`).
L5. "Compliance" appears as a screen name ("Compliance overview",
"Compliance calendar", "Compliance and safety"). Reads as a claim to a
bank; say "checks" or keep with the existing "not a compliance finding".
L6. "Security patches applied on time ... 100 %" is a sample KPI of the
fictional bank's IT department (`wp2.ts:432`). Not a Mubinflow claim,
but a skimmer may think it is.
L7. "Import the ready rows" does nothing ("Nothing imported. 4 ready
rows would be added; 5 rows need a fix first."). Honest; say so.

### Passed (evidence)

- Requests to other hosts: none. 229 requests over 228 page loads, all
  `localhost:5403`; offline file made only `file://` requests.
  Fonts are bundled (no Google Fonts). Rule-source links are plain text,
  no clickable external link found.
- Browser storage: localStorage holds only `{"lang":null,"theme":"dark"}`
  (set by the theme button). sessionStorage empty (one hint flag
  exists in code), no cookies, no IndexedDB, no service worker, no
  caches. A reload resets the demo (role back to HR manager).
- Secrets: bundle holds no keys, tokens or bank IBANs. "zbk_demo_" plus
  four hardcoded fake last digits (`a91f`, `3c07`); only the masked form
  is ever built. URLs in the bundle: legislation sources, `.test` demo
  domains, w3.org namespaces, react.dev error pages, gsap.com.
- Dependencies: web app has 12 direct runtime packages, all pinned
  exact (react 19.3.1, react-router 7.18.7, @tanstack/react-query
  5.108.4, zod 4.6.7, gsap 3.15.0, two Fontsource packages, four
  internal). API: hono 4.13.17, @hono/node-server 2.1.6, pg 8.23.1,
  puppeteer-core 25.16.0 (drives a Chromium for PDFs; extra surface),
  dejavu-fonts-ttf. `pnpm audit --prod`: "No known vulnerabilities
  found". Run again before any real data.
- Offline build: opens by file://, role switch, audit check, guard
  ("IT to pay run" outside view) all work; no console errors.
- Data location page claims no certification and says so.

## Claims to remove or soften

Searched the source and the rendered text of all pages (EN, plus
Arabic strings) for SOC, ISO, certified, compliant, approved by,
guaranteed, bank-grade, encrypted, secure, tamper, immutable,
penetration, GDPR, PDPL, residency, backup. No SOC, ISO, certified,
compliant, bank-grade, guaranteed or encrypted claim appears in the
screens. Judged hits:

- Audit lede, `apps/web/src/reports/screens/Audit.tsx:12`: "Every action
  is written down once and cannot be changed quietly."
  Soften to: "Each action is written down as an entry linked to the one
  before it, so an edited or removed entry shows up when the chain is
  checked. In this demo the check runs in your browser."
- Dashboard row, `packages/demo-data/src/wpe-brief.ts:325`: "58 entries
  checked, none changed since they were written." (state OK).
  Soften to "Not checked yet in this session" until the check is run.
- Role text, `packages/demo-data/src/wp9.ts:89`: "Runs access and
  connections; sees no salaries." Remove, or make it true (H1).
- Role text, `packages/demo-data/src/wp9.ts:64` (HR officer): "Keeps
  people's records; sees no salaries." Re-check the same way as H1.
- IT note, `docs/demo/2026-11-27-it-manager-note.md`: "IT administrator
  sees no salaries". Remove the "for example" clause.
- Hosting, `packages/demo-data/src/wp9.ts:589`, the IT note and the click
  script: "served from a server in Frankfurt, Germany". Verify the
  region; else "hosted by our provider; region not yet confirmed".
- IT note: row-level security, and "the database refuses UPDATE, DELETE
  and TRUNCATE". Keep only as "designed and tested by us, not by anyone
  else" (already close).
- "Compliance overview", "Compliance calendar", "Compliance and safety"
  (`nav/groups.ts`, `people/papers/*`). Optional: rename to "Checks" for
  a bank audience.
- Keep as they are: "Nothing here says a security standard is met"
  (`wpe-brief.ts:331`) and Data location "What we do not claim"
  (`wp9.ts:594`).

"Approved by" never reaches the screen (`demo/data/moves.ts:27` turns it
into "Signed off by"). "Backup" on the location page says "Not part of
the demo", which is honest.

## Honest answers for the owner (questions 18 to 25, and the rest)

18. Regulator rules on outsourcing and data location? "We do not know
yet and have not checked. We want yours. We will not load real data
until it is agreed in writing, with counsel. UAE hosting is our goal, not
a fact today." Do not say Frankfurt is fine for real data.

19. What does your vendor review need? "We hold no SOC 2 report, no ISO
27001 certificate and have had no external penetration test. A pen test
is planned before real payroll data and we will share it. Send the
questionnaire and the deadline." Do not say "in progress" or give a date.

20. Sign-in provider and MFA? "Single sign-on (Entra ID, Google) is
written in the backend but never run with a client and not in the demo.
Second step by authenticator app exists; in the demo it is required for
admin roles only." Admit that read-only finance and IT support roles
are optional today and could be made required.

21. Systems needing data? "REST API with a documented contract, read-only
keys, webhooks, calendar feeds, WPS SIF file, CSV import and export.
Accounting connectors are planned, not built." Do not promise core
banking. Webhook payload contents: say you will send the exact fields.

22. Keka exports and history? "Our migration tool is not built. Give us
anonymised samples and your retention years first." Do not say we import
Keka today (the import screen shows a sample and imports nothing).

23. Attendance devices? "Kiosk, phone clock-in and feeds are designed;
we have not connected a real device. Tell us the device and how
punches reach Keka."

24. Who sees salaries, audit retention, access review? "Today: HR manager,
General manager, finance roles. IT does not see salary fields, but in
this demo the audit trail and the import sample show some pay amounts to
IT; we will fix that." Audit retention period: not decided.

25. Devices, VPN, allow-lists, Arabic? "Runs in a browser; no install, no
outside calls from the demo, so a strict allow-list works. We have not
tested managed iPhones or Safari. Arabic screens exist, hidden until a
native speaker reviews them."

Likely extra IT questions:

- Is it encrypted? "Sensitive fields (salary, IBAN, Emirates ID,
  payslips) are encrypted field by field in the backend, AES-256-GCM,
  one key per company. The master key is held in a server setting today,
  not a vault or HSM. The demo has no backend, so you cannot see it."
- Can you prove roles are enforced? "The demo only hides pages. The
  enforcement is in the backend and has not been externally tested."
- Where are backups? "Restore is tested including the audit-chain check.
  Encrypted, off-site, scheduled backups are designed, not automated."
- Is the audit trail tamper-proof? "It is hash-chained and the database
  refuses edits and deletes; a check tool finds an edited row. It is not
  a legal proof and has not been independently verified."
- Who are your sub-processors, DR targets, SLA, breach procedure?
  "Not written yet. No formal data-protection assessment, retention
  schedule or breach procedure under Decree-Law 45 of 2021."
- Can IT give itself HR or General manager rights? "Role changes are
  logged. We have not set a second approver; we can add one."
- Can the demo see our data? "No. Nothing leaves the browser and nothing
  is saved. Reload and it starts again. You can prove it with the
  offline file and your network tools."
