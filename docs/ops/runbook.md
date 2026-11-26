# Operations runbook: payroll API

For operators of the payroll API (`packages/api`) with PostgreSQL 16.
The reference deployment is `deploy/docker-compose.yml`; the same steps
apply on any host or platform. Commands are run from the repository
root. Command blocks were run against the compose stack on 2026-11-26
unless marked **untested**. In that test the image was prebuilt
(through a sandbox proxy), so `--build` and `$DC build` themselves
were not run as written.

Shorthand used below (set it in your shell):

```bash
DC="docker compose -f deploy/docker-compose.yml --env-file deploy/.env"
```

## 1. What runs

| Piece | Runs as | Notes |
|---|---|---|
| `db` | PostgreSQL 16 | data in the `pgdata` volume; not published |
| `migrate` | `payroll_owner` | one-shot; applies `packages/api/migrations` |
| `api` | `payroll_runtime` | serve only (`deploy/serve.ts`), port 8787 |
| `verify` | `payroll_backup` | tool profile; audit chain check, read-only |

Database roles (`deploy/init-roles.sql`):

- `payroll_owner`: owns the database, the `public` schema and every
  table. Not a superuser, no CREATEROLE, no BYPASSRLS.
- `payroll_runtime`: the API login. No superuser, no BYPASSRLS, owns
  nothing, no schema usage of its own. Granted `payroll_app WITH
  INHERIT FALSE, SET TRUE`; the API does `SET LOCAL ROLE payroll_app`
  per transaction and row-level security applies.
- `payroll_app`: NOLOGIN; holds the table grants from the migrations.
- `payroll_backup`: `pg_read_all_data` plus BYPASSRLS, for `pg_dump`
  and the audit chain check. Never give it to the API.

The API refuses to start if its login is a superuser, has BYPASSRLS,
owns a table, or cannot `SET ROLE payroll_app` (`UNSAFE_DB_ROLE`). Every
container command first runs `deploy/check-env.mjs`, which refuses weak,
default or placeholder secrets and prints variable names, never values.

## 2. First deploy

1. Host: Docker Engine with Compose v2, a TLS reverse proxy (Caddy,
   nginx or a cloud load balancer) in front of `127.0.0.1:8787`. The
   compose file binds the API to localhost only and does not publish
   the database.
2. Secrets. Copy the example and replace every `CHANGE_ME`:

   ```bash
   cp deploy/.env.example deploy/.env
   chmod 600 deploy/.env
   openssl rand -hex 24      # one per password, four in all
   openssl rand -base64 32   # PAYROLL_MASTER_KEY, once, ever
   node deploy/check-env.mjs --target compose --file deploy/.env
   ```

   `check-env` must print `ok (compose)`. Store the master key in your
   secret manager **and** in an offline copy before going further
   (section 5).
3. Build and start:

   ```bash
   $DC up -d --build      # tested as: docker build ..., then $DC up -d
   $DC ps -a
   ```

   Expect `db` healthy, `migrate` `Exited (0)` and `api` healthy. The
   first start of `db` runs `deploy/init-roles.sh`, which creates the
   roles. It runs only on an empty data volume.
4. Smoke test (creates a throwaway company, so only on a new stack you
   will wipe, or accept the extra company):

   ```bash
   sh deploy/smoke-test.sh http://127.0.0.1:8787
   $DC run --rm verify
   ```

5. Check the roles are as designed:

   ```bash
   $DC exec db psql -U postgres -d payroll -c "SELECT rolname,
     rolsuper, rolbypassrls, rolcreaterole FROM pg_roles
     WHERE rolname LIKE 'payroll%' ORDER BY 1"
   ```

   Only `payroll_backup` has `rolbypassrls = t`; nobody has `rolsuper`.

On a managed database (RDS, Cloud SQL, Azure) instead of the `db`
container: run `init-roles.sql` once as the platform's admin user with
the psql variables shown in its header (**untested**; some platforms
reserve BYPASSRLS or `pg_read_all_data` for their admin role, in which
case back up with the platform's snapshots and run the audit check as
that admin), then run the image with `migrate` and `serve` and set
`DATABASE_URL`, `MIGRATE_DATABASE_URL` (migrate job only),
`PAYROLL_MASTER_KEY`, `PORT` and `RECEIPTS_DIR` (an absolute,
persistent directory for encrypted receipt files; back it up with the
database). Add `?sslmode=require` (or stricter)
to the URLs when the database is across a network.

## 3. Migrations

- Files: `packages/api/migrations/NNN_name.sql`, applied in order, each
  in its own transaction, recorded in `schema_migrations`. They are
  forward-only: there are no down migrations. Roll back by restoring
  the backup taken before the upgrade (section 9).
- Run them with the one-shot job, as `payroll_owner`:

  ```bash
  $DC run --rm migrate
  ```

  It prints `{"event":"migrated","applied":[...]}`; an empty list means
  the schema was already current.
- See what is applied:

  ```bash
  $DC exec db psql -U postgres -d payroll \
    -c "SELECT name, applied_at FROM schema_migrations ORDER BY name"
  ```

- Without compose: `pnpm api:migrate` with `MIGRATE_DATABASE_URL` (the
  owner), `DATABASE_URL` and `RECEIPTS_DIR` set (all are read by the
  config loader).
  **Untested** with these roles.
- `pnpm api:dev` and the image's `main` command migrate and then serve,
  so they need the owner URL in the serving process. Production uses
  `serve` (no migrations, runtime role only) plus the `migrate` job.

## 4. Backups and the restore test

The tables FORCE row-level security, so `pg_dump` as the owner fails
("query would be affected by row-level security policy"). Back up as
`payroll_backup`:

```bash
set -a; . deploy/.env; set +a
$DC exec -T -e PGPASSWORD="$PAYROLL_BACKUP_PASSWORD" db \
  pg_dump -h 127.0.0.1 -U payroll_backup -d payroll --format=custom \
  > "payroll-$(date -u +%Y%m%dT%H%M%SZ).dump"
```

- Schedule it (cron or a systemd timer) at least daily and before every
  upgrade. Keep 30 daily and 12 monthly copies off the host.
- The dump holds the sealed fields (salaries, IBANs, Emirates IDs,
  labour person ids, payslip bodies, SIF files, TOTP secrets) as cipher
  text, but names, emails, nationalities, job titles, IBAN last four
  digits, SIF totals, password hashes and the audit log in clear.
  **Encrypt the dump before it leaves the host**
  (for example `age` or `gpg` to a recipient key held offline), and
  store it apart from the master key. Not automated here: see the
  security checklist.
- The dump carries no roles. A restore needs `init-roles.sql` first.
- Receipt files are not in the dump: they live in the `receipts`
  volume (`RECEIPTS_DIR`), encrypted with the company keys. Copy the
  volume with every dump (for example `docker run --rm -v
  payroll_receipts:/r -v "$PWD":/out alpine tar -C /r -czf
  /out/receipts.tgz .`, **untested**); a database restored without it
  lists receipts whose files are gone.

### Restore test (monthly, and after any backup change)

Restores into a scratch database next to the live one, then checks row
counts and every audit chain. As the `postgres` superuser, because
restoring rows into FORCE RLS tables needs it:

```bash
set -a; . deploy/.env; set +a
DUMP=payroll-YYYYMMDDTHHMMSSZ.dump
$DC exec -T db psql -U postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS payroll_restore" \
  -c "CREATE DATABASE payroll_restore"
$DC exec -T db psql -U postgres -d payroll_restore -v ON_ERROR_STOP=1 \
  -v owner_password="$PAYROLL_OWNER_PASSWORD" \
  -v runtime_password="$PAYROLL_RUNTIME_PASSWORD" \
  -v backup_password="$PAYROLL_BACKUP_PASSWORD" \
  -f /payroll/init-roles.sql
$DC exec -T db pg_restore -U postgres -d payroll_restore \
  --exit-on-error < "$DUMP"
for d in payroll payroll_restore; do
  $DC exec -T db psql -U postgres -d $d -At -c "SELECT '$d',
    (SELECT count(*) FROM companies),
    (SELECT count(*) FROM audit_events),
    (SELECT count(*) FROM schema_migrations)"
done
$DC run --rm -e VERIFY_DATABASE_URL="postgres://payroll_backup:\
$PAYROLL_BACKUP_PASSWORD@db:5432/payroll_restore" verify
```

Pass: the counts match the live database as of the dump, and `verify`
ends with `"broken":0`. Then prove the master key opens the restored
data (section 5, "Which key is this?") and drop the scratch database
(**untested** as written; the test dropped and recreated it instead):

```bash
$DC exec -T db psql -U postgres -c "DROP DATABASE payroll_restore"
```

A full disaster restore is the same into a new stack: start `db` on an
empty volume (init-roles runs by itself), `pg_restore` into `payroll`,
start `api` with the same `PAYROLL_MASTER_KEY`. The full sequence into
a new stack is **untested**; on 2026-11-26 an API container pointed at
the scratch restored database served a sign-in.

## 5. Key management

`PAYROLL_MASTER_KEY` (32 random bytes, base64) is the root of field
encryption. Each company has an AES-256-GCM data key wrapped by a key
derived from it (HKDF-SHA256); TOTP secrets are sealed with another
derived key. Cipher text looks like `v1.<keyId>.<data>`, where `keyId`
is the first 8 hex digits of SHA-256 of the master key.

- **Loss of the key = loss of every sealed field** (salaries, IBANs,
  Emirates IDs, labour person ids, payslips, SIF files, TOTP secrets)
  in the database and in every backup. Keep two
  copies: the secret manager the host reads from, and an offline copy
  (for example a sealed envelope or a hardware token in a safe) held by
  two named people. Never in git, chat, tickets or the database backup.
- The key lives in the API container's environment. Anyone who can run
  `docker inspect` or read `deploy/.env` on the host can read it: limit
  host access accordingly.
- **Which key is this?** Compare the fingerprint of a key with what the
  database was sealed with:

  ```bash
  set -a; . deploy/.env; set +a
  node -e 'const c = require("node:crypto");
    const k = Buffer.from(process.env.PAYROLL_MASTER_KEY, "base64");
    console.log(c.createHash("sha256").update(k).digest("hex")
      .slice(0, 8))'
  $DC exec -T db psql -U postgres -d payroll -At \
    -c "SELECT DISTINCT split_part(dek_wrapped, '.', 2) FROM companies"
  ```

  The two must match. A different value means the API will fail to
  open sealed fields ("cipher made with another master key").
- **Rotation is an open item.** There is no re-wrap command yet:
  changing the key makes every existing sealed field unreadable. Until
  a rotation tool exists (re-wrap each company data key and re-seal
  global values under a new key id, keeping the old key for reads
  during the change), do not change the key. If the key is exposed,
  treat it as an incident: restrict access, keep the key, and plan the
  rotation work; do not "rotate" by editing `.env`.
- Database passwords can be rotated: put the new value in
  `deploy/.env`, re-run `init-roles.sql` (it resets passwords; see the
  restore test for the psql call, with `-d payroll`), then
  `$DC up -d` to recreate the containers. Re-running `init-roles.sql`
  on a live, migrated database with unchanged passwords was tested
  (the API kept working); a password change itself is **untested**.

## 6. Monitoring and logs

The API writes one JSON object per line to stdout (`$DC logs api`, or
your platform's log collector):

- One line per request with exactly these keys: `requestId`, `method`,
  `routeId`, `status`, `ms`, `companyId`, `userId`.
- Server errors (5xx): `requestId`, `level: "error"`, `error` (the
  error's class name) and `code` (a stable code or null). No message,
  no stack.
- Security events: `mfa.enrolment-started`, `mfa.enrolled` with
  `requestId` and `userId`.
- Start-up: `{"event":"migrated",...}` (migrate job) and
  `{"event":"listening",...}`. Fatal start-up errors go to stderr as
  one line (for example `runtime role is a superuser`).

**Never logged** by the API: request or response bodies, headers
(including `Authorization` and session tokens), query strings and
paths, passwords, TOTP codes, salaries, bank details, IBANs, Emirates
IDs. Keep it that way: do not enable request-body logging in the
reverse proxy, and do not set PostgreSQL `log_statement = 'all'` or
`log_min_duration_statement` in production, because PostgreSQL then
logs statement parameters (emails, password hashes, cipher text).

Each response carries the same request id as the log line; ask users
for it when they report an error.

What to alert on:

| Signal | Source | Threshold (starting point) |
|---|---|---|
| Health check failing | probe on `/v1/health` | 2 checks in a row |
| 5xx lines | `level == "error"` | any |
| 401 and 403 responses per client IP | reverse proxy | spike vs baseline |
| `UNSAFE_DB_ROLE` or `check-env` refusals | stderr at start-up | any |
| Audit chain check | nightly `$DC run --rm verify` exit code | non-zero |
| Backup job | exit code and dump size | failure or size drop |
| Disk use on the `pgdata` volume | host monitoring | 80% |

The nightly audit check is cheap for an SME tenant count, but it loads
each company's whole chain into memory; watch its run time as the log
grows.

## 7. Incidents

Write down times (UTC), who did what and the request ids involved as you
go. Notify the owner. PDPL (Federal Decree-Law 45 of 2021) may require
notifying the UAE Data Office and affected people: involve counsel
early; this runbook does not decide that.

### 7.1 Suspected tenant leak (one company sees another's data)

1. **Contain.** If the leak is ongoing, stop the API: `$DC stop api`.
   A stopped payroll API is cheaper than a spreading leak.
2. **Preserve.** Save the logs before they rotate:
   `$DC logs --no-color api > incident-api-$(date -u +%s).log`, and
   take a backup (section 4) so the state is kept.
3. **Scope from the request log.** Each line has `companyId` (the
   company the request was scoped to) and `userId`. Find requests where
   a user acted on a company they are not a member of:

   ```bash
   $DC exec -T db psql -U postgres -d payroll -At \
     -c "SELECT company_id, user_id FROM memberships" > members.txt
   ```

   then compare with the `companyId`/`userId` pairs in the saved log.
4. **Check the database guards are intact** (a migration or manual
   change could have weakened them):

   ```bash
   $DC exec -T db psql -U postgres -d payroll -c "SELECT relname,
     relrowsecurity, relforcerowsecurity FROM pg_class
     WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'
     ORDER BY 1"
   $DC exec -T db psql -U postgres -d payroll -c "SELECT rolname,
     rolsuper, rolbypassrls FROM pg_roles WHERE rolname LIKE 'payroll%'"
   ```

   Every table except `schema_migrations`, `users` and `sessions` must
   show `t | t`. Only `payroll_backup` may have BYPASSRLS.
5. **Revoke sessions** of affected users if credentials may be
   involved (**untested**; sessions are rows, expired by time):

   ```bash
   $DC exec -T db psql -U postgres -d payroll -c "UPDATE sessions
     SET expires_at = now() WHERE user_id = '<uuid>'"
   ```

6. Fix forward with a failing test first (engineering standards), run
   the real-PostgreSQL suite, deploy, then restart the API.

### 7.2 Audit chain break

`verify` (or `GET /v1/audit-events/verify`) returns `ok: false` with
`firstBadSeq`: the first event whose sequence, previous hash or own hash
does not match, or a head that disagrees with the last event.

1. Do not "repair" rows. The log is append-only by trigger
   (`UPDATE`, `DELETE` and `TRUNCATE` are refused), so a break means
   someone with owner or superuser rights changed it, disabled the
   trigger, or restored a partial backup.
2. Preserve: backup now (section 4), save logs.
3. Look at the event and its neighbours (as the superuser):

   ```bash
   $DC exec -T db psql -U postgres -d payroll -c "SELECT seq, at,
     action, entity_type, prev_hash, hash FROM audit_events
     WHERE company_id = '<uuid>' AND seq BETWEEN <n-2> AND <n+2>
     ORDER BY seq"
   ```

4. Restore last known good backups into a scratch database (section 4)
   and run `verify` on each, newest first, to find when the chain was
   last intact. Compare the rows of the two versions.
5. Check who had owner or superuser access in that window (host access
   logs, PostgreSQL connection logs) and whether the trigger was
   disabled: `SELECT tgname, tgenabled FROM pg_trigger WHERE tgrelid =
   'audit_events'::regclass` (`O` means enabled).
6. Record the finding; the broken chain itself stays as evidence. Do
   not delete or rewrite it.

On 2026-11-26 a deliberate edit of one row (trigger disabled, `action`
changed) in a scratch copy made `verify` report `ok: false`,
`firstBadSeq: 2` and exit 1.

## 8. The audit chain verification command

Whole database, every company (read-only, as `payroll_backup`):

```bash
$DC run --rm verify                     # all companies
$DC run --rm verify <companyId> ...     # some companies
```

Output: one JSON line per company
(`{"event":"audit_chain","companyId":...,"ok":true,"checked":N,
"firstBadSeq":null}`) and a final `audit_chain_done` line with the
count of broken chains. Exit code 0 when all are intact, 1 when any is
broken, 2 on a setup error (including a company id that does not
exist). It reuses the API's own `verifyChain`.

Without compose (`VERIFY_DATABASE_URL` is the backup role;
**untested** outside the container, where it runs the same way):

```bash
VERIFY_DATABASE_URL=postgres://payroll_backup:...@host:5432/payroll \
  node --import tsx deploy/verify-audit-chain.ts
```

For one company over HTTP, as an owner or HR user of that company:
`GET /v1/audit-events/verify` with `Authorization: Bearer <token>` and
`X-Company-Id: <uuid>` (`deploy/smoke-test.sh` does this).

## 9. Upgrade procedure

1. Read the release notes and the migration files that are new since
   the running version (`git diff <old>..<new> --
   packages/api/migrations`).
2. Back up (section 4) and keep that file until the upgrade is
   accepted.
3. Get the new code and rebuild:

   ```bash
   git fetch && git checkout <new tag or commit>
   node deploy/check-env.mjs --target compose --file deploy/.env
   $DC build                 # untested as written (image prebuilt)
   ```

4. Apply migrations, then replace the API:

   ```bash
   $DC run --rm migrate
   $DC up -d api
   $DC ps -a
   ```

   The old API keeps serving while `migrate` runs; that is only safe
   for additive migrations. If the new migrations are not additive,
   stop the API first (`$DC stop api`) and accept the downtime.
5. Check: `curl -fsS http://127.0.0.1:8787/v1/health`, sign in through
   the web app, `$DC run --rm verify`.
6. Roll back: migrations are forward-only. Stop the API, restore the
   backup from step 2 into `payroll` (section 4, full disaster
   restore), check out the old version, `$DC build`, `$DC up -d`.
   **Untested** end to end.

PostgreSQL minor versions: `$DC pull db && $DC up -d db`
(**untested**).
Major versions (16 to 17) need `pg_dump`/`pg_restore` or `pg_upgrade`
into a new volume; plan it as its own change.

## 10. Known gaps

- `packages/api/src/main.ts` always migrates before serving, using
  `MIGRATE_DATABASE_URL` or, failing that, `DATABASE_URL`. With the
  runtime role alone it fails ("no schema has been selected to create
  in"). The image's `serve` command uses `deploy/serve.ts` instead,
  which duplicates the serve half of `main.ts`. A serve-only mode in
  `main.ts` would remove the duplicate.
- The image runs TypeScript through tsx and carries dev dependencies
  (about 570 MB). A compile or bundle step would shrink it.
- No rate limiting, WAF, email verification, KMS, key rotation or
  external pen test: see `docs/ops/security-checklist.md`.
