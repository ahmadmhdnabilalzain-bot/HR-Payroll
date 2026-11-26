import fc from "fast-check";
import { beforeEach, describe, expect, it } from "vitest";
import {
  appendAudit,
  assertNoSensitive,
  verifyChain,
  type AuditInput,
} from "../src/audit/audit";
import {
  canonicalJson,
  eventHash,
  GENESIS_HASH,
  sha256Hex,
} from "../src/audit/canonical";
import type { Db } from "../src/db/db";
import { withTenant } from "../src/db/tenant";
import {
  COMPANY_A,
  COMPANY_B,
  USER_A,
  createTestDb,
  seedTwoBareCompanies,
} from "./helpers/test-db";

function input(n: number, companyId = COMPANY_A): AuditInput {
  return {
    companyId,
    at: `2026-03-01T08:00:0${n}.000Z`,
    actorUserId: USER_A,
    action: "company.updated",
    entityType: "company",
    entityId: companyId,
    data: { changed: ["name"], count: n },
  };
}

const append = (db: Db, e: AuditInput) =>
  withTenant(db, { companyId: e.companyId, userId: e.actorUserId },
    (tx) => appendAudit(tx, e));
const verify = (db: Db, companyId: string) =>
  withTenant(db, { companyId, userId: null },
    (tx) => verifyChain(tx, companyId));

describe("canonicalJson", () => {
  it("sorts keys, drops undefined, writes bigint as a string", () => {
    expect(canonicalJson({ b: 1, a: [2, { d: 1n, c: undefined }] }))
      .toBe('{"a":[2,{"d":"1"}],"b":1}');
  });
  it("throws on non-finite numbers", () => {
    expect(() => canonicalJson({ x: Number.NaN })).toThrow(
      expect.objectContaining({ code: "CANONICAL_NUMBER" }));
    expect(() => canonicalJson([Infinity])).toThrow(/CANONICAL_NUMBER/);
  });
  it("does not depend on key insertion order", () => {
    fc.assert(fc.property(fc.dictionary(fc.string(), fc.jsonValue()),
      (obj) => {
        const reversed = Object.fromEntries(Object.entries(obj).reverse());
        expect(canonicalJson(reversed)).toBe(canonicalJson(obj));
      }));
  });
  it("sha256Hex and eventHash", () => {
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(GENESIS_HASH).toBe("0".repeat(64));
    const e = { seq: 1, ...input(1) };
    expect(eventHash(GENESIS_HASH, e)).toBe(
      sha256Hex(`${GENESIS_HASH}\n${canonicalJson(e)}`));
  });
});

describe("audit log", () => {
  let db: Db;
  beforeEach(async () => {
    db = await createTestDb();
    await seedTwoBareCompanies(db);
  });

  it("chains events from the genesis hash and verifies", async () => {
    const a = await append(db, input(1));
    const b = await append(db, input(2));
    const c = await append(db, input(3));
    expect([a.seq, b.seq, c.seq]).toEqual([1, 2, 3]);
    expect(a.prevHash).toBe(GENESIS_HASH);
    expect(b.prevHash).toBe(a.hash);
    expect(a.at).toBe("2026-03-01T08:00:01.000Z");
    expect(await verify(db, COMPANY_A)).toEqual(
      { ok: true, checked: 3, firstBadSeq: null });
  });

  it("refuses updates for the app role and the owner", async () => {
    await append(db, input(1));
    const asApp = withTenant(db, { companyId: COMPANY_A, userId: null },
      (tx) => tx.query("UPDATE audit_events SET action = 'x.y'"));
    await expect(asApp).rejects.toThrow(/permission denied/);
    await expect(db.query("UPDATE audit_events SET action = 'x.y'"))
      .rejects.toThrow(/append-only/);
    await expect(db.query("DELETE FROM audit_events"))
      .rejects.toThrow(/append-only/);
  });

  it("detects an edited event", async () => {
    for (const n of [1, 2, 3]) await append(db, input(n));
    await db.exec(`ALTER TABLE audit_events DISABLE TRIGGER USER;
      UPDATE audit_events SET data = '{"changed":["wps"]}'
      WHERE seq = 2;`);
    expect(await verify(db, COMPANY_A)).toEqual(
      { ok: false, checked: 3, firstBadSeq: 2 });
  });

  it("concurrent appends get seq 1 and 2 with no gap", async () => {
    const out = await Promise.all([append(db, input(1)),
      append(db, input(2))]);
    expect(out.map((e) => e.seq).sort()).toEqual([1, 2]);
    expect((await verify(db, COMPANY_A)).ok).toBe(true);
  });

  it("each company has its own chain", async () => {
    await append(db, input(1));
    await append(db, input(2));
    const b = await append(db, input(3, COMPANY_B));
    expect(b.seq).toBe(1);
    expect(b.prevHash).toBe(GENESIS_HASH);
    const seen = await withTenant(db, { companyId: COMPANY_B,
      userId: null }, (tx) => tx.query("SELECT * FROM audit_events"));
    expect(seen.length).toBe(1);
  });

  it("refuses sensitive keys", async () => {
    const e = { ...input(1), data: { amount: "1.00" } };
    await expect(append(db, e)).rejects.toMatchObject(
      { code: "AUDIT_SENSITIVE_DATA" });
    expect(() => assertNoSensitive({ IBAN: "x" })).toThrow(
      /AUDIT_SENSITIVE_DATA/);
    expect(() => assertNoSensitive({ changed: ["salary"] })).not.toThrow();
  });

  it("allows only named keys with safe shapes", () => {
    const bad: Record<string, unknown>[] = [
      { basicSalary: "4000.00" }, { newAmount: "1.00" },
      { bankIban: "AE070331234567890123456" }, { emiratesId: "784" },
      { note: "AE070331234567890123456" },
      { changed: ["x"], before: "4000.00" },
      { changed: ["AE070331234567890123456"] },
      { changed: ["7777.77"] }, { role: "7777.77" },
      { fileName: "AE070331234567890123456" },
      { version: "7777.77" }, { period: { year: 2026, month: "x" } },
      { employeeCount: 1.5 }, { inputHash: "7777.77" },
    ];
    for (const d of bad) {
      expect(() => assertNoSensitive(d), JSON.stringify(d)).toThrow(
        /AUDIT_SENSITIVE_DATA/);
    }
    const good: Record<string, unknown>[] = [
      { changed: ["wps", "nameAr", "bank.routingCode"] },
      { role: "hr" }, { from: "hr", to: "manager" }, { version: 3 },
      { period: { year: 2026, month: 3 }, employeeCount: 2,
        inputHash: "a".repeat(64) },
      { employeeId: "00000000-0000-4000-8000-000000001023" },
      { fileName: "0000000123456260401010000.SIF", errorCount: 0,
        warningCount: 1 },
      { oldClockIn: "2026-03-01T20:30:00.000Z",
        newClockOut: "2026-03-01T22:00:00.000Z" },
    ];
    for (const d of good) {
      expect(() => assertNoSensitive(d), JSON.stringify(d)).not.toThrow();
    }
  });
});
