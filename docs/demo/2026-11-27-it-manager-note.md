# MubinFlow: a note for the IT Manager (27 Nov 2026)

MubinFlow is HR and payroll for UAE mainland companies. This page says
plainly what you saw today, what exists behind it, and what is still open.

## What the demo is, and is not

- It is a website that runs entirely in your browser on invented data (a
  fictional "Zarqan Demo Bank"). No server, no database, nothing saved; a
  reload starts again. The demo is hosted in Frankfurt; the hosting region
  for a live service is not decided.
- It is not a live account, a pilot or a security test of the product.
- Role limits in the demo are a filter in your browser: anyone can switch
  role, and all demo data is built in the browser for every role. Real
  enforcement belongs to the backend, which has had no outside test.
- We claim no certification or compliance. We hold no SOC 2 report, no
  ISO 27001 certificate and have had no external penetration test. No
  authority has reviewed the product.

## Where data would live (open items)

- A live account's hosting region is not decided. Hosting in the UAE is a
  design goal, not a fact today. The hosting plan and its cost are not
  decided either.
- The rules for a bank's staff data (data location, and outsourcing to a
  service provider) are unverified on our side. We will not load real
  data until your requirements and the law are checked with you and
  counsel, and the location is agreed in writing.
- Data protection law (Federal Decree-Law 45 of 2021): no formal
  assessment, retention schedule or breach procedure written yet.

## Controls as designed in the backend (built and tested by us)

- **Roles and access.** Each action needs a permission; roles bundle them.
  Each company's data is separated in the database by row-level security,
  designed and tested by us, not by anyone else.
- **Segregation of duties.** The person who prepares a pay run cannot
  sign it off. Nobody decides their own leave or edits their own salary or
  bank details (only the account owner can, with a second sign-in step).
  The second step (authenticator app) is required for salary and bank
  changes.
- **Audit trail.** Append-only and hash-chained per company, designed and
  tested by us, not by anyone else. The database refuses UPDATE, DELETE
  and TRUNCATE on it; a check tool finds an edited row.
- **Sealed sensitive fields.** Salaries, IBANs, Emirates IDs, payslips and
  salary files are encrypted field by field (AES-256-GCM, a key per
  company).
- **Pay run.** The server refuses a whole run with a missing or mistyped
  IBAN; the salary file uses the bank details frozen at sign-off.

## Integration points

REST API with a documented contract; read-only API keys; webhooks (for
example "pay run signed off" to a finance system); calendar feeds; WPS
salary file (SIF) for upload to your bank; CSV import and export. Single
sign-on (OpenID Connect, with Microsoft Entra ID or Google) is written in
the backend but not yet set up for any client. Accounting connectors and
a Keka migration tool are planned, not built.

## What we need from you

1. Your regulator's requirements for outsourcing and data location, and
   your vendor security questionnaire.
2. Your sign-in provider and MFA policy.
3. The systems that need HR or payroll data (finance, directory, service
   desk, branch attendance devices).
4. A sample of Keka exports with names removed, and how many years of
   history you must keep.
5. A named contact for the security review.

## Honest answers to likely questions

- **SSO?** Built in the backend for Entra ID and Google; not yet run with
  a client and not shown in the demo.
- **Hosting region?** Not decided. UAE is the goal; we decide it with you
  and counsel, in writing, before any real data.
- **Backups?** Restore is tested, including the audit-chain check.
  Encrypted, off-site, scheduled backups are designed but not automated.
- **Penetration test?** None yet. It is on our list before any real
  payroll data, and we will share the result.
- **Arabic?** The screens have an Arabic version, kept hidden until a
  native speaker has reviewed it. No date promised yet.
- **Support?** Hours, response times and a named contact will be in the
  written proposal. Nothing is promised in this meeting.
