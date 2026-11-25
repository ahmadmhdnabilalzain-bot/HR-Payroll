# Documents Module: Research (25 Nov 2026)

One researcher, ten searches, snippets only. Official-source coverage was thin;
treat letter contents as UNVERIFIED unless a source says otherwise.

## UAE letters and documents

- Experience certificate: owed on request at contract end; customary contents
  are dates, period and job title; free. Article number differs by source
  (13(11), 84, old-law 56): confirm in Decree-Law 33 of 2021.
- Salary certificate: name, ID, job title, joining date, salary breakdown,
  addressee, signatory and stamp (customary, UNVERIFIED).
- NOC: whether it is mandatory for permit cancellation is disputed; do not
  hard-code it as required.
- Offer and contract: u.ae says Arabic and English is usual and the signed
  offer is registered with MOHRE as the binding contract; the official unified
  form text was not found.
- Warning and termination: Article 44 lists no-notice dismissal grounds;
  procedural requirements possibly old-law wording (UNVERIFIED). Final dues
  within 14 days (secondary source).
- Not found: salary transfer letter, relieving letter, visa and Emirates ID
  letters, leave approval specifics.

## Rivals

Bayzat: letter-request workflow with signed letters in the app. Zoho People:
templates, mail merge (1,000 per month cap), Zoho Sign integration claimed.
ZenHR: default and custom templates; Arabic not confirmed. Keka: not found.

## Design patterns (engineering judgment unless cited)

- Templates with whitelisted merge fields, per-language variants (English,
  Arabic, bilingual), approved template version pinned to each generated
  document, immutable stored PDF with a hash.
- Arabic PDF: headless Chromium shapes Arabic correctly (one source; verify with
  a test); some PDF libraries lack right-to-left support.
- E-signature: Federal Decree-Law 46 of 2021 (executive regulation: Cabinet
  Decision 28 of 2023). Signatures cannot be rejected as evidence merely for
  being electronic; "qualified" needs a licensed trust service provider.
  Sources disagree on the practical difference. Keep a full audit trail and
  get legal advice before claiming a signed letter is binding.
- Standard controls: versions, expiry reminders, per-document permissions,
  expiring share links, virus scan with quarantine, size and type allowlist,
  encryption at rest, audit log.
- Retention: employee records at least two years after employment ends (MOHRE
  guidance, secondary); longer tax and accounting periods not found. PDPL
  Articles 22 and 23 govern export of personal data.
