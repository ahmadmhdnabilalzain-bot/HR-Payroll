import { describe, expect, it } from "vitest";
import { buildAccessData } from "../../src/setup/access/data";
import { AREAS } from "../../src/nav/areas/setup-access";
import { INITIAL, reduce } from "../../src/demo/state";

const d = buildAccessData();
const stamp = { by: "A", role: "HR manager", on: "27 Oct 2026" };

describe("setup access data", () => {
  it("lists the users and their roles", () => {
    expect(d.users).toHaveLength(12);
    expect(d.permissions.find((p) => p.id === "pay.approve")!.people
      .map((w) => w.name)).toHaveLength(1);
  });

  it("masks every key and secret", () => {
    for (const k of d.keys) expect(k.masked).toMatch(/\*{16}[0-9a-f]{4}$/);
    for (const h of d.hooks) expect(h.secretMasked).toMatch(/^\*{12}/);
  });

  it("checks the import sample: ready, to review, to fix", () => {
    const s = d.sample.summary;
    expect(s.ready + s.warnings + s.errors).toBe(s.rows);
    expect(s.errors).toBeGreaterThan(0);
    expect(d.sample.note).toMatch(/nothing is imported/i);
  });

  it("claims no certification", () => {
    expect(d.location.certifications).toEqual([]);
    const all = JSON.stringify(d.location.statements);
    expect(all).not.toMatch(/\b(compliant|certified)\b/i);
  });

  it("registers live areas with unique ids", () => {
    expect(new Set(AREAS.map((a) => a.id)).size).toBe(AREAS.length);
    expect(AREAS.every((a) => a.status === "live")).toBe(true);
  });
});

describe("setup access actions", () => {
  it("keeps, signs off and undoes", () => {
    let s = reduce(INITIAL, { type: "access-keep", ids: ["usr-001"],
      stamp });
    s = reduce(s, { type: "access-signoff", stamp });
    expect(s.accessSignoff).toEqual(stamp);
    s = reduce(s, { type: "access-unkeep", ids: ["usr-001"] });
    expect(s.accessKept).toEqual({});
    expect(s.accessSignoff).toBeNull();
  });

  it("revokes and restores a key", () => {
    let s = reduce(INITIAL, { type: "key-revoke", id: "key-001", stamp });
    expect(s.keysRevoked["key-001"]).toEqual(stamp);
    s = reduce(s, { type: "key-restore", id: "key-001" });
    expect(s.keysRevoked).toEqual({});
  });
});
