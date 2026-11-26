# Security checklist: payroll API deployment

State on 2026-11-26, for the API in `packages/api` deployed with
`deploy/`. "Done" means it exists in code or configuration and was
checked as noted; it does not mean an outside party has reviewed it.
Nothing here has had an external penetration test.

## Done

### Data isolation

- [x] Row-level security on every tenant table, `FORCE`d, so even the
  table owner is filtered. Global tables without RLS: only
  `schema_migrations`, `users`, `sessions` (checked on the compose
  database, runbook section 7.1).
- [x] The API's login (`payroll_runtime`) is not a superuser, has no
  BYPASSRLS, owns no table and has no schema usage of its own; it only
  reaches data through `SET LOCAL ROLE payroll_app` per transaction.
  The API refuses to start otherwise (`UNSAFE_DB_ROLE`).
- [x] Migrations run as a separate owner role (`payroll_owner`, no
  superuser, no CREATEROLE). In compose the API container never holds
  the owner password (`deploy/serve.ts`; checked with `env` in the
  running container).
- [x] Real-PostgreSQL test suite (tenancy, role checks, whole-API flow,
  concurrency) runs as the non-superuser role, in CI, and fails if it
  is skipped.
- [x] Smoke test checks that a foreign `X-Company-Id` is refused (403).

### Secrets and encryption

- [x] Field encryption: AES-256-GCM, one data key per company wrapped by
  a key derived from the master key (HKDF-SHA256), with associated data
  binding each value to its company, table, column and row. Sealed:
  salaries, IBANs, Emirates IDs, labour person ids, payslip bodies, SIF
  files, TOTP secrets.
- [x] `deploy/check-env.mjs` runs before every container command and
  refuses missing, short, low-variety, placeholder or reused passwords,
  superuser-style account names, a shared runtime and owner role, and
  a master key that is not 32 random-looking bytes. It never prints a
  value. The shipped `.env.example` is refused (tested in CI).
- [x] `deploy/.env` is git-ignored; the image build context excludes
  `.env` files.
- [x] Passwords are hashed with scrypt (N = 2^16, 64 MiB); only the
  SHA-256 of a session token is stored; sessions last 8 hours.
- [x] PostgreSQL uses scram-sha-256 for network logins and data
  checksums (compose `POSTGRES_INITDB_ARGS`).

### Accounts

- [x] TOTP multi-factor sign-in; each code is accepted once. Routes
  marked `mfa` in the contract need an MFA session.
- [x] Five wrong passwords lock an account for 15 minutes.

### Audit

- [x] Hash-chained, append-only audit log per company; `UPDATE`,
  `DELETE` and `TRUNCATE` are refused by triggers. Audit data is
  allowlisted so secrets are not written into it.
- [x] Chain verification over HTTP and as an operator tool
  (`docker compose ... run --rm verify`); a deliberately edited row was
  detected (runbook section 7.2).

### Runtime and container

- [x] Container runs as the `node` user (uid 1000); code and modules
  are owned by root and read-only to it. Compose adds a read-only root
  file system, `cap_drop: ALL` and `no-new-privileges`.
- [x] The database port is not published; the API is bound to
  `127.0.0.1` on the host.
- [x] Request bodies over 1 MiB are refused. Logs are one JSON line per
  request with fixed keys: no bodies, headers, tokens, paths or query
  strings (runbook section 6).
- [x] Dependencies are pinned to exact versions; installs use the
  frozen lockfile in the image and in CI.
- [x] Backups use a read-only role (`payroll_backup`); a restore into a
  scratch database was tested, including audit chain checks and an API
  sign-in against the restored data.

## Not done (open)

Each item is a known gap, not an oversight to discover later.

- [ ] **External penetration test.** None. Needed before real payroll
  data.
- [ ] **KMS or HSM for the master key.** The key is an environment
  variable on the host; anyone with root or Docker access there can
  read it. No envelope encryption with a cloud KMS.
- [ ] **Master key rotation.** No re-wrap tool. Changing the key breaks
  every sealed field (runbook section 5).
- [ ] **Email verification.** Sign-up does not verify the address; an
  invite is accepted by whoever holds the token.
- [ ] **WAF.** None in front of the API.
- [ ] **Rate limiting at the edge (and in the app).** None. Two
  consequences: password guessing is slowed only by the per-account
  lockout, and anyone can lock any account for 15 minutes with five
  wrong passwords. Also, each sign-in costs a 64 MiB scrypt hash, so a
  burst of sign-in or sign-up requests can exhaust the API's memory.
  Put per-IP limits on `/v1/auth/login`, `/v1/signup` and invite
  acceptance in the reverse proxy before going live.
- [ ] **Backup encryption.** Dumps are written in clear on the host.
  Encryption (for example `age`), off-host copies, retention and
  scheduling are documented in the runbook but not automated.
- [ ] **TLS.** Not part of `deploy/`. The operator must put a TLS
  reverse proxy in front of port 8787. The compose network between the
  API and PostgreSQL is not encrypted (one host, private network); a
  database across a network needs `sslmode=require` or stricter.
- [ ] **Security headers and CORS policy.** The API sets neither; the
  reverse proxy or the web app host must (HSTS at least).
- [ ] **Session revocation tooling.** No admin command; the runbook
  gives a manual SQL update (untested in effect).
- [ ] **Alerting.** The runbook lists signals and thresholds; no alert
  rules or log shipping are configured.
- [ ] **Supply chain.** GitHub Actions are pinned to major versions, not
  commit SHAs; no image signing, SBOM, vulnerability scan,
  `pnpm audit` or secret scanning in CI. The base images are pinned by
  tag, not digest.
- [ ] **Image size and contents.** The image runs TypeScript through
  tsx and includes dev dependencies (compilers, test tools), which
  widens what an attacker inside the container could use.
- [ ] **Database role hardening beyond the basics.** No
  `statement_timeout`, connection limits or `pg_hba` restrictions per
  role; the `postgres` superuser password is in the same `.env` file
  as the application secrets.
- [ ] **Data protection law.** No PDPL (Federal Decree-Law 45 of 2021)
  assessment, retention schedule or breach-notification procedure
  beyond "involve counsel" in the runbook.
- [ ] **Managed database path.** `init-roles.sql` on RDS, Cloud SQL or
  Azure is untested; BYPASSRLS and `pg_read_all_data` may be reserved.
