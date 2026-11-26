import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  checkEnv,
  masterKeyProblem,
  parseEnvFile,
  passwordProblem,
} from "./check-env.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "check-env.mjs");
const pw = () => randomBytes(24).toString("hex");
const key = () => randomBytes(32).toString("base64");

function goodCompose() {
  return { POSTGRES_PASSWORD: pw(), PAYROLL_OWNER_PASSWORD: pw(),
    PAYROLL_RUNTIME_PASSWORD: pw(), PAYROLL_BACKUP_PASSWORD: pw(),
    PAYROLL_MASTER_KEY: key(), API_PORT: "8787" };
}

function goodApi() {
  return {
    DATABASE_URL: `postgres://payroll_runtime:${pw()}@db:5432/payroll`,
    MIGRATE_DATABASE_URL: `postgres://payroll_owner:${pw()}@db/payroll`,
    PAYROLL_MASTER_KEY: key(), PORT: "8787" };
}

function run(args) {
  try {
    const out = execFileSync("node", [SCRIPT, ...args],
      { encoding: "utf8", stdio: "pipe" });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status, out: `${e.stdout}${e.stderr}` };
  }
}

test("random secrets pass for every target", () => {
  assert.deepEqual(checkEnv(goodCompose(), "compose"), []);
  assert.deepEqual(checkEnv(goodApi(), "api"), []);
  assert.deepEqual(checkEnv(goodApi(), "migrate"), []);
  const v = `postgres://payroll_backup:${pw()}@db/payroll`;
  assert.deepEqual(checkEnv({ VERIFY_DATABASE_URL: v }, "verify"), []);
});

test("serve: runtime URL only; the owner URL is refused", () => {
  const env = goodApi();
  assert.ok(checkEnv(env, "serve").some((p) =>
    /MIGRATE_DATABASE_URL is set/.test(p)));
  delete env.MIGRATE_DATABASE_URL;
  assert.deepEqual(checkEnv(env, "serve"), []);
});

test("weak, short, placeholder and URL-unsafe passwords fail", () => {
  assert.match(passwordProblem("short"), /shorter/);
  assert.match(passwordProblem("a".repeat(30)), /too few/);
  assert.match(passwordProblem("CHANGE_ME_0123456789abcdefgh"),
    /placeholder/);
  assert.match(passwordProblem("Abcdefghijklmnopqrstuvwx@yz"), /URL/);
  assert.equal(passwordProblem(pw()), null);
});

test("weak master keys fail with the API's own rule", () => {
  assert.match(masterKeyProblem("not base64!!"), /base64/);
  assert.match(masterKeyProblem(randomBytes(16).toString("base64")),
    /32 bytes/);
  assert.match(masterKeyProblem(Buffer.alloc(32).toString("base64")),
    /not random/);
  assert.equal(masterKeyProblem(key()), null);
});

test("compose: missing and repeated passwords are refused", () => {
  const env = goodCompose();
  delete env.PAYROLL_BACKUP_PASSWORD;
  env.PAYROLL_RUNTIME_PASSWORD = env.PAYROLL_OWNER_PASSWORD;
  const problems = checkEnv(env, "compose");
  assert.ok(problems.includes("PAYROLL_BACKUP_PASSWORD is required"));
  assert.ok(problems.some((p) => /same as PAYROLL_OWNER/.test(p)));
});

test("api: one role for both URLs, or a superuser name, is refused",
  () => {
    const env = goodApi();
    env.MIGRATE_DATABASE_URL = env.DATABASE_URL;
    assert.ok(checkEnv(env, "api").some((p) => /same user/.test(p)));
    env.DATABASE_URL = `postgres://postgres:${pw()}@db/payroll`;
    assert.ok(checkEnv(env, "api").some((p) => /superuser/.test(p)));
    env.DATABASE_URL = "mysql://u:p@db/x";
    assert.ok(checkEnv(env, "api").some((p) => /postgres:\/\//.test(p)));
  });

test("the shipped .env.example is refused (exit 1)", () => {
  const r = run(["--target", "compose", "--file",
    join(HERE, ".env.example")]);
  assert.equal(r.code, 1);
  assert.match(r.out, /refusing/);
});

test("output names variables but never prints a value", () => {
  const file = join(HERE, ".env.example");
  const text = readFileSync(file, "utf8");
  const sample = parseEnvFile(text);
  const r = run(["--target", "compose", "--file", file]);
  for (const v of Object.values(sample)) {
    if (v.length >= 6) assert.ok(!r.out.includes(v), "value leaked");
  }
  assert.match(r.out, /POSTGRES_PASSWORD/);
});

test("dotenv parsing handles comments, quotes and export", () => {
  const env = parseEnvFile(
    "# c\nA=1\nexport B=\"two words\"\nC='x' \nD=v # note\n\n");
  assert.deepEqual(env, { A: "1", B: "two words", C: "x", D: "v" });
});

test("bad usage exits 2", () => {
  assert.equal(run(["--target", "nope"]).code, 2);
  assert.equal(run(["--bogus"]).code, 2);
});
