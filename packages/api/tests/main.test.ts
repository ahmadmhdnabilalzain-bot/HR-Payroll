import { describe, expect, it } from "vitest";
import { buildChannelPorts } from "../src/channels/wire";
import { loadConfig } from "../src/config";

const KEY = Buffer.alloc(32, 7).toString("base64");
const BASE_ENV = { DATABASE_URL: "postgres://runtime@h/db",
  PAYROLL_MASTER_KEY: KEY, RECEIPTS_DIR: "/r" };

describe("loadConfig", () => {
  it("refuses a missing or short master key", () => {
    expect(() => loadConfig({})).toThrow(
      "PAYROLL_MASTER_KEY must be 32 bytes base64");
    expect(() => loadConfig({ DATABASE_URL: "postgres://x",
      PAYROLL_MASTER_KEY: Buffer.alloc(16).toString("base64") }))
      .toThrow("PAYROLL_MASTER_KEY must be 32 bytes base64");
    expect(() => loadConfig({ DATABASE_URL: "postgres://x",
      PAYROLL_MASTER_KEY: "not base64 at all!!" }))
      .toThrow("PAYROLL_MASTER_KEY must be 32 bytes base64");
  });
  it("needs a database URL", () => {
    expect(() => loadConfig({ PAYROLL_MASTER_KEY: KEY }))
      .toThrow("DATABASE_URL is required");
  });
  it("defaults the port and the migration URL", () => {
    const c = loadConfig({ DATABASE_URL: "postgres://runtime@h/db",
      PAYROLL_MASTER_KEY: KEY, RECEIPTS_DIR: "/var/lib/payroll/receipts" });
    expect(c.port).toBe(8787);
    expect(c.migrateUrl).toBe("postgres://runtime@h/db");
    expect(c.masterKey.length).toBe(32);
  });
  it("reads MIGRATE_DATABASE_URL and PORT", () => {
    const c = loadConfig({ DATABASE_URL: "postgres://runtime@h/db",
      MIGRATE_DATABASE_URL: "postgres://owner@h/db",
      PAYROLL_MASTER_KEY: KEY, PORT: "9000", RECEIPTS_DIR: "/r" });
    expect(c.migrateUrl).toBe("postgres://owner@h/db");
    expect(c.port).toBe(9000);
    expect(c.receiptsDir).toBe("/r");
  });
  it("channel groups: none set means every provider not configured",
    () => {
      const c = loadConfig(BASE_ENV);
      expect(c.channels.email).toBeNull();
      expect(c.channels.whatsapp).toBeNull();
      expect(c.channels.inbound).toBeNull();
      expect(c.channels.google).toBeNull();
      expect(c.channels.microsoft).toBeNull();
      const ports = buildChannelPorts(c);
      expect(ports.email.configured).toBe(false);
      expect(ports.whatsapp.configured).toBe(false);
      expect(ports.inboundEmail.configured).toBe(false);
      expect(ports.oidc.configured("google")).toBe(false);
      expect(ports.oidc.configured("microsoft")).toBe(false);
    });
  it("a partial channel group names the missing variables", () => {
    expect(() => loadConfig({ ...BASE_ENV, POSTMARK_SERVER_TOKEN: "t" }))
      .toThrow(/EMAIL settings are incomplete: .*EMAIL_FROM/);
    expect(() => loadConfig({ ...BASE_ENV, WHATSAPP_APP_SECRET: "s" }))
      .toThrow(/WHATSAPP_PHONE_NUMBER_ID/);
  });
  it("public base URLs must be https", () => {
    expect(() => loadConfig({ ...BASE_ENV,
      PUBLIC_API_BASE_URL: "http://x" }))
      .toThrow("PUBLIC_API_BASE_URL must be an https URL");
    expect(() => loadConfig({ ...BASE_ENV,
      PUBLIC_APP_BASE_URL: "ftp://x" }))
      .toThrow("PUBLIC_APP_BASE_URL must be an https URL");
    const c = loadConfig({ ...BASE_ENV,
      PUBLIC_API_BASE_URL: "https://api.example.com/" });
    expect(c.publicApiBaseUrl).toBe("https://api.example.com");
  });
  it("needs a receipts directory", () => {
    expect(() => loadConfig({ DATABASE_URL: "postgres://runtime@h/db",
      PAYROLL_MASTER_KEY: KEY })).toThrow("RECEIPTS_DIR is required");
  });
  it("reads the Chrome settings for letters", () => {
    const base = { DATABASE_URL: "postgres://runtime@h/db",
      PAYROLL_MASTER_KEY: KEY, RECEIPTS_DIR: "/r" };
    expect(loadConfig({ ...base, CHROME_PATH: "/x" }).chromePath).toBe("/x");
    expect(loadConfig(base).chromePath).toBeNull();
    expect(loadConfig({ ...base, CHROME_PATH: "" }).chromePath).toBeNull();
    expect(loadConfig({ ...base, CHROME_NO_SANDBOX: "1" }).chromeNoSandbox)
      .toBe(true);
    expect(loadConfig(base).chromeNoSandbox).toBe(false);
  });
});
