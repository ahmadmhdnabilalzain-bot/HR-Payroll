import {
  httpsUrl,
  loadChannelConfig,
  type ChannelConfig,
} from "./config-channels";

export interface Config {
  /** Runtime login role: no superuser, no BYPASSRLS, owns no table. */
  databaseUrl: string;
  /** Migration (table owner) role; defaults to databaseUrl. */
  migrateUrl: string;
  masterKey: Uint8Array;
  port: number;
  /** Directory for encrypted receipt files (local-disk blob store). */
  receiptsDir: string;
  /** Plan 13 provider groups (null: not configured). */
  channels: ChannelConfig;
  publicApiBaseUrl: string | null;
  publicAppBaseUrl: string | null;
  /** Chrome or Chromium for letter PDFs; null: letters answer 503. */
  chromePath: string | null;
  /** CHROME_NO_SANDBOX=1: Chrome's sandbox off (needed as root). */
  chromeNoSandbox: boolean;
  /**
   * JOBS_LIST_DATABASE_URL: a role that reads every company past RLS
   * (payroll_backup), for jobs that visit every tenant.
   */
  jobsListUrl: string | null;
}

const KEY_MESSAGE = "PAYROLL_MASTER_KEY must be 32 bytes base64";

function masterKey(text: string | undefined): Uint8Array {
  const ok = text !== undefined && /^[A-Za-z0-9+/]+={0,2}$/.test(text);
  const key = ok ? Buffer.from(text, "base64") : Buffer.alloc(0);
  if (key.length !== 32) throw new Error(KEY_MESSAGE);
  return new Uint8Array(key);
}

/** Pure: the environment is passed in (only main.ts reads it). */
export function loadConfig(env: Record<string, string | undefined>)
  : Config {
  const key = masterKey(env.PAYROLL_MASTER_KEY);
  const databaseUrl = env.DATABASE_URL;
  if (databaseUrl === undefined || databaseUrl === "") {
    throw new Error("DATABASE_URL is required");
  }
  const port = Number(env.PORT ?? "8787");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a whole number from 1 to 65535");
  }
  const receiptsDir = env.RECEIPTS_DIR;
  if (receiptsDir === undefined || receiptsDir === "") {
    throw new Error("RECEIPTS_DIR is required");
  }
  return { databaseUrl, migrateUrl: env.MIGRATE_DATABASE_URL ?? databaseUrl,
    masterKey: key, port, receiptsDir, channels: loadChannelConfig(env),
    publicApiBaseUrl: httpsUrl(env, "PUBLIC_API_BASE_URL"),
    publicAppBaseUrl: httpsUrl(env, "PUBLIC_APP_BASE_URL"),
    chromePath: env.CHROME_PATH === undefined || env.CHROME_PATH === ""
      ? null : env.CHROME_PATH,
    chromeNoSandbox: env.CHROME_NO_SANDBOX === "1",
    jobsListUrl: env.JOBS_LIST_DATABASE_URL === undefined ||
      env.JOBS_LIST_DATABASE_URL === "" ? null
      : env.JOBS_LIST_DATABASE_URL };
}
