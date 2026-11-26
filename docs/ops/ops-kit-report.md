# Ops kit build report

Date: 2026-11-26. Branch `ops-kit` (from `claude/quirky-wozniak-b7xkvr`
at 47a165f), worktree
`/home/user/HR-Payroll/.claude/worktrees/agent-a3770e8bcba3011b4`.
Not pushed. Only new files, plus three scripts and a longer `check` in
the root `package.json`. No change to `packages/*/src`, `apps/*/src`,
`LEDGER.md` or `HANDOVER.md`.

## Commits

| Commit | What |
|---|---|
| `chore(ops): deployment kit` | `deploy/`, ops line check, root scripts |
| `chore(ops): CI workflow` | `.github/`, `scripts/assert-tests-ran.mjs` |
| `chore(ops): operations runbook` | `docs/ops/runbook.md`, verify fixes |
| `chore(ops): security checklist` | checklist and this report |

## What was built

- `deploy/Dockerfile`: multi-stage, `node:22-bookworm-slim`, pnpm
  10.28.0 through corepack, frozen-lockfile install of the root and the
  API's workspace closure only, non-root `node` user, root-owned code,
  a `fetch` healthcheck on `/v1/health`. `Dockerfile.dockerignore`
  keeps `.env` files, `.git` and `node_modules` out of the context.
- `deploy/docker-compose.yml`: PostgreSQL 16 (scram-sha-256, data
  checksums, not published), one-shot `migrate` (owner role),
  serve-only `api` (runtime role; read-only root, `cap_drop: ALL`,
  `no-new-privileges`, bound to 127.0.0.1), and a `verify` tool
  (profile `tools`, backup role).
- `deploy/init-roles.sql` with `init-roles.sh` (initdb wrapper, because
  `.sql` files there get no psql variables): `payroll_owner`,
  `payroll_runtime` (granted `payroll_app WITH INHERIT FALSE, SET
  TRUE`), `payroll_app` (pre-created, so the owner needs no CREATEROLE)
  and `payroll_backup` (`pg_read_all_data` + BYPASSRLS). Idempotent.
- `deploy/.env.example`, `deploy/.gitignore`.
- `deploy/check-env.mjs` (+ 10 node:test tests): targets `compose`,
  `api`, `migrate`, `serve`, `verify`. Runs before every container
  command (`deploy/entrypoint.sh`).
- `deploy/serve.ts`: serve without migrating (see decisions).
- `deploy/verify-audit-chain.ts`: every company's chain, read-only,
  through the API's own `verifyChain`; exit 0, 1 (broken) or 2.
- `deploy/smoke-test.sh`: health, signup, tenant write, audit verify,
  foreign company refused.
- `deploy/tsconfig.json`, root scripts `lines:ops`, `ops:test`,
  `ops:typecheck` (all three now part of `pnpm check`), and
  `scripts/check-ops-line-length.mjs` (80 columns for every file under
  `deploy/`, `docs/ops/`, `.github/`, which the repo checker skips).
- `.github/workflows/ci.yml` with `.github/actions/setup`: lint, ops
  tests, typecheck, unit tests per package (matrix of five), the
  real-PostgreSQL suite on a `postgres:16` service, and a docker build
  and compose smoke job.
- `docs/ops/runbook.md`, `docs/ops/security-checklist.md`.

## Tested

Docker was installed but its daemon was not running; I started
`dockerd` in the sandbox. Builds went through the sandbox proxy using a
local base image that only adds the proxy CA
(`--build-arg NODE_IMAGE=...`, `--network host`); nothing
proxy-specific is in the committed files.

- Image build: passes; runs as uid 1000; 571 MB.
- Compose from an empty volume: roles created, migrations 001 to 008
  applied by `migrate`, API healthy. Role attributes and memberships
  checked in `pg_roles` and `pg_auth_members`; the owner owns the
  database and all 17 tables; the API container has no
  `MIGRATE_DATABASE_URL`.
- `deploy/smoke-test.sh`: PASS (signup is a real write through RLS as
  the runtime role; a foreign company id gets 403).
- `verify`: all companies, one company, unknown company (exit 2), and
  a tampered row in a scratch copy (`ok: false`, `firstBadSeq: 2`,
  exit 1).
- Backup as `payroll_backup`: works. As `payroll_owner`: fails (FORCE
  RLS), which is why the backup role exists.
- Restore into a scratch database: counts match, chains verify, and an
  API container on the restored database served a sign-in.
- Re-running `init-roles.sql` on a live, migrated database: the API
  keeps working.
- Every command block in the runbook marked as tested was run as
  written against the stack (key fingerprint matched the stored key id,
  RLS and trigger queries, session update, log capture, `up -d api`).
- `check-env`: 10 unit tests (a hex password containing `1234` was
  wrongly refused; the word list no longer has hex-spellable words,
  and a test pins it); `.env.example` refused (exit 1); a
  container started with weak secrets refuses before Node starts the
  API.
- The CI docker job, simulated step by step with a prebuilt image
  (`up` without `--build`): passes.
- The CI postgres job, reproduced with the `postgres:16-bookworm`
  image (Docker Hub rate-limited the `postgres:16` tag), trust auth as
  in the workflow: 18 of 18 passed; `assert-tests-ran.mjs` passes on
  that report and fails on a skipped run.
- Locally, per package: contract 81, engine 550, wps 173, web 103, api
  179 passed (18 skipped: the PostgreSQL suite). Typecheck, line
  checks and `pnpm check` pass.

## Not tested

- GitHub Actions itself: the workflow has not run on GitHub. YAML was
  parsed and the commands run locally; `actionlint` could not be
  installed here (download refused by the sandbox).
- `docker compose up --build` inside the sandbox without the proxy CA
  base (the in-build network needs it here; GitHub runners do not).
- Managed databases (RDS, Cloud SQL, Azure), a password change, the
  upgrade rollback end to end, the effect of the session revoke SQL.

## Decisions

1. **tsx in the image, no bundle.** The workspace packages export
   `./src/*.ts`, the migrations are found relative to the source, and
   `tsx` is the only tested way to run the API. The image therefore
   installs dev dependencies (tsx is a root devDependency).
2. **Serve-only shim.** `main.ts` always migrates first and, with only
   the runtime URL, fails ("no schema has been selected to create in";
   tested). Rather than give the API container the owner password,
   `deploy/serve.ts` repeats the serve half of `main.ts` (load config,
   open pool, role check, create app, serve). It imports
   `@hono/node-server` by path because `deploy/` has no package.json.
3. **`payroll_app` pre-created** by `init-roles.sql` so the grant to
   the runtime role exists before the API starts and the owner needs no
   CREATEROLE. Migration 001 skips it.
4. **A backup role with BYPASSRLS** (`payroll_backup`): FORCE RLS
   makes the owner's `pg_dump` fail, and a superuser is too much for a
   nightly job. It also runs the audit check.
5. **`public` schema owned by `payroll_owner`**, `REVOKE ALL ... FROM
   PUBLIC` on the schema and the database; the runtime role gets
   CONNECT only.
6. **Passwords limited to `A-Z a-z 0-9 _ -`, 24+ characters**, because
   compose puts them into URLs.
7. **pnpm 10.28.0 pinned** in the Dockerfile and the setup action (the
   version installed here). The root `package.json` has no
   `packageManager` field; adding one is outside "scripts", so I did
   not.
8. **Actions pinned to major versions** (`actions/checkout@v5`,
   `actions/setup-node@v5`, `pnpm/action-setup@v4`), not SHAs: the SHAs
   could not be verified offline. The workflow header says so. The
   major tags themselves were not checked to exist either (from
   memory); the first CI run will show it.
9. **CI postgres job uses a superuser `DATABASE_URL` with trust auth**:
   the test harness needs a superuser to create roles and schemas, and
   logs its roles in without a password. Every query under test runs
   as `plan3_runtime`.
10. **Commit trailers**: the task's Sonnet 5.5 trailer matches the
    repo's existing commits, so I used it (a session reminder suggested
    a different model name).

## Concerns (for the owner or other agents)

- `packages/api/src/main.ts` needs a serve-only mode (for example
  `main.ts serve`); then delete `deploy/serve.ts`. Until then a change
  to the serve steps in `main.ts` must be copied to `serve.ts`.
- No rate limiting anywhere, and each sign-in is a 64 MiB scrypt hash:
  a burst of sign-in or sign-up calls can exhaust API memory, and
  anyone can lock any account. Edge limits are needed before go-live.
- The image is 571 MB and carries compilers and test tools. A build
  step (bundle or `tsc` emit) would cut size and attack surface.
- Backups are not encrypted or shipped off-host automatically.
- `verifyChain` loads a whole chain into memory; fine for SMEs, watch
  it as audit logs grow.
- The `postgres` superuser password sits in the same `.env` as the
  application secrets; split it out on real hosts.
- `HANDOVER.md` should gain a line pointing at `deploy/` and
  `docs/ops/` (I was asked not to edit it).
