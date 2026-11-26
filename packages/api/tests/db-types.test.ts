import { describe, expect, it } from "vitest";
import { fils } from "@payroll/engine";
import { isoTimestamp } from "../src/db/db";
import { parseAed, toMoney } from "../src/db/money";
import { createTestDb } from "./helpers/test-db";

describe("isoTimestamp", () => {
  it("normalises PostgreSQL text to ISO with Z and milliseconds", () => {
    expect(isoTimestamp("2026-01-02 03:04:05.678+00"))
      .toBe("2026-01-02T03:04:05.678Z");
    expect(isoTimestamp("2026-01-02 03:04:05+00"))
      .toBe("2026-01-02T03:04:05.000Z");
    expect(isoTimestamp("2026-01-02 03:04:05.6789+00"))
      .toBe("2026-01-02T03:04:05.678Z");
    expect(isoTimestamp("2026-01-02 07:04:05.5+04"))
      .toBe("2026-01-02T03:04:05.500Z");
  });
});

describe("pglite adapter types", () => {
  it("int8 as bigint, date as text, timestamptz as ISO Z", async () => {
    const db = await createTestDb();
    const [row] = await db.query<{ n: bigint; d: string; t: string }>(
      `SELECT 9007199254740993::int8 AS n, '2026-02-28'::date AS d,
       '2026-03-01T20:30:00.123Z'::timestamptz AS t`);
    expect(row).toEqual({ n: 9007199254740993n, d: "2026-02-28",
      t: "2026-03-01T20:30:00.123Z" });
  });
  it("clones do not share data", async () => {
    const a = await createTestDb();
    const b = await createTestDb();
    await a.query("CREATE TABLE only_a (id int)");
    const t = await b.query("SELECT to_regclass('only_a') AS t");
    expect(t).toEqual([{ t: null }]);
  });
});

describe("money", () => {
  it("formats fils as two decimals", () => {
    expect(toMoney(fils(0n))).toBe("0.00");
    expect(toMoney(fils(5n))).toBe("0.05");
    expect(toMoney(fils(400000n))).toBe("4000.00");
    expect(toMoney(fils(99999999999n))).toBe("999999999.99");
  });
  it("refuses negatives and amounts beyond the wire format", () => {
    expect(() => toMoney(fils(-1n))).toThrow(
      expect.objectContaining({ code: "NEGATIVE_AMOUNT" }));
    expect(() => toMoney(fils(100000000000n))).toThrow(
      expect.objectContaining({ code: "AMOUNT_TOO_LARGE" }));
  });
  it("round-trips through parseAed", () => {
    expect(toMoney(parseAed("7777.77"))).toBe("7777.77");
  });
});
