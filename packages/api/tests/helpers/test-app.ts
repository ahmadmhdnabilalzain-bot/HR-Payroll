import { randomBytes } from "node:crypto";
import type { App as Hono } from "../../src/http/context";
import { createApp } from "../../src/app";
import { keyringFromKey } from "../../src/crypto/keyring";
import type { AppDeps } from "../../src/deps";
import { createTestDb } from "./test-db";

export const TEST_KEK = new Uint8Array(32).fill(7);
export const PASSWORD = "correct horse battery staple";

export interface Clock {
  now: Date;
  advance(ms: number): void;
}

export function sequentialId(n: number): string {
  return `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
}

export async function makeApp(opts: { start?: string } = {}) {
  const clock: Clock = {
    now: new Date(opts.start ?? "2026-03-01T08:00:00.000Z"),
    advance(ms) {
      this.now = new Date(this.now.getTime() + ms);
    },
  };
  let n = 0x1000;
  const logs: Record<string, unknown>[] = [];
  const rand = (k: number) => new Uint8Array(randomBytes(k));
  const deps: AppDeps = {
    db: await createTestDb(),
    now: () => clock.now,
    newId: () => sequentialId(n++),
    randomBytes: rand,
    keyring: keyringFromKey(TEST_KEK, rand),
    log: (line) => logs.push(line),
    passwordCost: { N: 1024 },
  };
  return { app: createApp(deps), deps, clock, logs };
}

export interface Res {
  status: number;
  body: any;
  text: string;
  headers: Headers;
}

async function toRes(r: Response): Promise<Res> {
  const text = await r.text();
  let body: unknown = null;
  try {
    body = text === "" ? null : JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: r.status, body, text, headers: r.headers };
}

export async function call(
  app: Hono,
  token: string | null,
  companyId: string | null,
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<Res> {
  const h: Record<string, string> = { ...headers };
  if (token !== null) h.authorization = `Bearer ${token}`;
  if (companyId !== null) h["x-company-id"] = companyId;
  if (body !== undefined) h["content-type"] = "application/json";
  const init: RequestInit = { method, headers: h };
  if (body !== undefined) init.body = JSON.stringify(body);
  return toRes(await app.request(path, init));
}

export interface Account {
  token: string;
  companyId: string;
  userId: string;
  email: string;
  password: string;
}

export async function signup(app: Hono, name: string): Promise<Account> {
  const email = `${name}@example.com`;
  const r = await call(app, null, null, "POST", "/v1/signup", {
    companyName: `${name} Trading LLC`, email, password: PASSWORD,
    displayName: `${name} Owner` });
  if (r.status !== 201) throw new Error(`signup ${r.status} ${r.text}`);
  return { token: r.body.token, companyId: r.body.memberships[0].companyId,
    userId: r.body.user.id, email, password: PASSWORD };
}

export function login(app: Hono, email: string, password: string,
  totp?: string): Promise<Res> {
  const body: Record<string, string> = { email, password };
  if (totp !== undefined) body.totp = totp;
  return call(app, null, null, "POST", "/v1/auth/login", body);
}
