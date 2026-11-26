#!/usr/bin/env node
/**
 * Validates the deployment environment and refuses weak, default or
 * placeholder secrets. Prints variable names only, never values.
 *
 *   node deploy/check-env.mjs --target compose --file deploy/.env
 *   node deploy/check-env.mjs --target serve      # reads process.env
 *
 * Targets:
 *   compose  the variables deploy/docker-compose.yml reads
 *   api      packages/api main.ts (migrates, then serves): DATABASE_URL,
 *            MIGRATE_DATABASE_URL, PAYROLL_MASTER_KEY, PORT
 *   migrate  the one-shot migration job (same variables as api)
 *   serve    deploy/serve.ts (serve only): DATABASE_URL, key, PORT;
 *            MIGRATE_DATABASE_URL must not be set
 *   verify   the audit chain check: VERIFY_DATABASE_URL
 *
 * Exit 0 when every check passes, 1 when any fails, 2 on bad usage.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const MIN_PASSWORD = 24;
const MIN_DISTINCT_CHARS = 10;
const MIN_DISTINCT_KEY_BYTES = 16;
const SAFE_PASSWORD = /^[A-Za-z0-9_-]+$/;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const WEAK_WORDS = [
  "change", "example", "placeholder", "password", "passwd", "secret",
  "default", "postgres", "payroll", "admin", "test", "dummy", "sample",
  "xxxx", "1234", "qwerty", "letmein",
];
const RESERVED_USERS = new Set(["postgres", "root", "admin", "rdsadmin"]);
const COMPOSE_PASSWORDS = [
  "POSTGRES_PASSWORD", "PAYROLL_OWNER_PASSWORD",
  "PAYROLL_RUNTIME_PASSWORD", "PAYROLL_BACKUP_PASSWORD",
];
export const TARGETS = ["compose", "api", "migrate", "serve", "verify"];

/** Why a password is weak, or null when it is acceptable. */
export function passwordProblem(value) {
  if (value.length < MIN_PASSWORD) {
    return `is shorter than ${MIN_PASSWORD} characters`;
  }
  if (!SAFE_PASSWORD.test(value)) {
    return "may only use A-Z a-z 0-9 _ - (it is put into a URL)";
  }
  if (new Set(value).size < MIN_DISTINCT_CHARS) {
    return "repeats too few characters";
  }
  const lower = value.toLowerCase();
  const word = WEAK_WORDS.find((w) => lower.includes(w));
  if (word !== undefined) return "contains a default or placeholder word";
  return null;
}

/** Same rule as packages/api/src/config.ts, plus a weak-key test. */
export function masterKeyProblem(value) {
  if (!BASE64.test(value)) return "is not base64";
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) return "must decode to exactly 32 bytes";
  if (new Set(key).size < MIN_DISTINCT_KEY_BYTES) {
    return "is not random (too few distinct bytes): " +
      "use `openssl rand -base64 32`";
  }
  return null;
}

function parseDbUrl(value) {
  let u;
  try {
    u = new URL(value);
  } catch {
    return { error: "is not a URL" };
  }
  if (u.protocol !== "postgres:" && u.protocol !== "postgresql:") {
    return { error: "must start with postgres:// or postgresql://" };
  }
  return { user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password), host: u.hostname,
    database: u.pathname.replace(/^\//, ""),
    sslmode: u.searchParams.get("sslmode") };
}

function checkDbUrl(env, name, problems) {
  const value = env[name];
  if (value === undefined || value === "") {
    problems.push(`${name} is required`);
    return null;
  }
  const url = parseDbUrl(value);
  if (url.error !== undefined) {
    problems.push(`${name} ${url.error}`);
    return null;
  }
  if (url.user === "") problems.push(`${name} has no user name`);
  if (RESERVED_USERS.has(url.user)) {
    problems.push(`${name} uses a superuser-style account name; ` +
      "use the roles from deploy/init-roles.sql");
  }
  if (url.database === "") problems.push(`${name} names no database`);
  if (url.password === "") {
    problems.push(`${name} has no password`);
  } else {
    const why = passwordProblem(url.password);
    if (why !== null) problems.push(`${name} password ${why}`);
  }
  return url;
}

function required(env, name, problems) {
  const value = env[name];
  if (value === undefined || value === "") {
    problems.push(`${name} is required`);
    return null;
  }
  return value;
}

function checkMasterKey(env, problems) {
  const key = required(env, "PAYROLL_MASTER_KEY", problems);
  if (key === null) return;
  const why = masterKeyProblem(key);
  if (why !== null) problems.push(`PAYROLL_MASTER_KEY ${why}`);
}

function checkPort(env, name, problems) {
  const value = env[name];
  if (value === undefined || value === "") return;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    problems.push(`${name} must be a whole number from 1 to 65535`);
  }
}

function checkCompose(env, problems) {
  const seen = new Map();
  for (const name of COMPOSE_PASSWORDS) {
    const value = required(env, name, problems);
    if (value === null) continue;
    const why = passwordProblem(value);
    if (why !== null) problems.push(`${name} ${why}`);
    const twin = seen.get(value);
    if (twin !== undefined) {
      problems.push(`${name} is the same as ${twin}; use one each`);
    }
    seen.set(value, name);
  }
  checkMasterKey(env, problems);
  checkPort(env, "API_PORT", problems);
}

function checkApi(env, problems) {
  const runtime = checkDbUrl(env, "DATABASE_URL", problems);
  const owner = checkDbUrl(env, "MIGRATE_DATABASE_URL", problems);
  if (runtime !== null && owner !== null && runtime.user !== "" &&
    runtime.user === owner.user) {
    problems.push("DATABASE_URL and MIGRATE_DATABASE_URL use the same " +
      "user; the runtime role must not own the tables");
  }
  if (runtime !== null && owner !== null && runtime.password !== "" &&
    runtime.password === owner.password) {
    problems.push("DATABASE_URL and MIGRATE_DATABASE_URL share a " +
      "password; use one each");
  }
  checkMasterKey(env, problems);
  checkPort(env, "PORT", problems);
}

function checkServe(env, problems) {
  checkDbUrl(env, "DATABASE_URL", problems);
  if (env.MIGRATE_DATABASE_URL !== undefined) {
    problems.push("MIGRATE_DATABASE_URL is set in a serve-only " +
      "container; keep the owner password in the migrate job only");
  }
  checkMasterKey(env, problems);
  checkPort(env, "PORT", problems);
}

/** Pure: returns the list of problems (empty when all is well). */
export function checkEnv(env, target) {
  const checks = {
    compose: checkCompose,
    api: checkApi,
    migrate: checkApi,
    serve: checkServe,
    verify: (e, p) => checkDbUrl(e, "VERIFY_DATABASE_URL", p),
  };
  const problems = [];
  const check = checks[target];
  if (check === undefined) problems.push(`unknown target ${target}`);
  else check(env, problems);
  return problems;
}

function unquote(v) {
  const q = v[0];
  if ((q === '"' || q === "'") && v.length >= 2 && v.endsWith(q)) {
    return v.slice(1, -1);
  }
  return v.replace(/\s+#.*$/, "");
}

/** Minimal dotenv reader: KEY=VALUE, # comments, optional quotes. */
export function parseEnvFile(text) {
  const env = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/
      .exec(line);
    if (m !== null) env[m[1]] = unquote(m[2]);
  }
  return env;
}

function parseArgs(argv) {
  const out = { target: "api", file: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--target") out.target = argv[++i];
    else if (a === "--file") out.file = argv[++i];
    else return { error: `unknown argument ${a}` };
  }
  if (!TARGETS.includes(out.target)) {
    return { error: `--target must be one of ${TARGETS.join(", ")}` };
  }
  if (out.file === undefined) return { error: "--file needs a path" };
  return out;
}

function main(argv) {
  const args = parseArgs(argv);
  if (args.error !== undefined) {
    process.stderr.write(`check-env: ${args.error}\n`);
    return 2;
  }
  const env = args.file === null ? process.env
    : parseEnvFile(readFileSync(args.file, "utf8"));
  const problems = checkEnv(env, args.target);
  for (const p of problems) process.stderr.write(`check-env: ${p}\n`);
  if (problems.length > 0) {
    process.stderr.write(`check-env: ${problems.length} problem(s); ` +
      `refusing (${args.target})\n`);
    return 1;
  }
  process.stdout.write(`check-env: ok (${args.target})\n`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
