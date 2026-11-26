import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config";

const KEY = Buffer.alloc(32, 7).toString("base64");

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
  it("needs a receipts directory", () => {
    expect(() => loadConfig({ DATABASE_URL: "postgres://runtime@h/db",
      PAYROLL_MASTER_KEY: KEY })).toThrow("RECEIPTS_DIR is required");
  });
});
