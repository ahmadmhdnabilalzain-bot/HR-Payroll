import { describe, expect, it } from "vitest";
import { INITIAL, reduce } from "../../src/demo/state";
import { AREAS } from "../../src/nav/areas/audit-room";
import { buildAuditData } from "../../src/reports/inspection/data";
import { externalUsers } from "../../src/setup/auditor/external";

const d = buildAuditData();
const stamp = { by: "Vikram Rao", role: "IT manager", on: "27 Oct 2026" };
const grant = { name: "Hana Rostami", firm: "Gulf Ledger", email: "h@x.test",
  fromIso: "2026-10-27", toIso: "2026-11-27", stamp };

describe("auditor access in the store", () => {
  it("gives, changes the end date, ends, and undoes each", () => {
    let s = reduce(INITIAL, { type: "auditor-grant", grant });
    expect(s.auditorGrant?.toIso).toBe("2026-11-27");
    const id = `aud-chg-${s.nextAuditor}`;
    s = reduce(s, { type: "auditor-end-date", toIso: "2026-11-10", stamp });
    expect(s.auditorGrant?.toIso).toBe("2026-11-10");
    s = reduce(s, { type: "auditor-end-date-undo", toIso: "2026-11-27", id });
    expect(s.auditorGrant?.toIso).toBe("2026-11-27");
    s = reduce(s, { type: "auditor-end", stamp });
    expect(s.auditorEnded).toEqual(stamp);
    s = reduce(s, { type: "auditor-reinstate" });
    expect(s.auditorEnded).toBeNull();
    expect(reduce(s, { type: "auditor-ungrant" }).auditorGrant).toBeNull();
  });

  it("logs every view in order, with the auditor's name", () => {
    let s = INITIAL;
    for (const label of ["Inspection pack, Oct 2026", "Audit trail"]) {
      s = reduce(s, { type: "auditor-view", page: "x", label,
        by: "Hana Rostami", on: "27 Oct 2026" });
    }
    expect(s.auditorViews.map((v) => v.n)).toEqual([1, 2]);
    expect(s.auditorViews.every((v) => v.by === "Hana Rostami")).toBe(true);
  });

  it("is a user row only while access is given", () => {
    const f = (iso: string) => iso;
    expect(externalUsers(null, false, null, f)).toEqual([]);
    expect(externalUsers(grant, true, null, f)).toEqual([]);
    expect(externalUsers(grant, false, null, f)[0]!.rolesText)
      .toMatch(/Auditor, read only \(ends/);
  });
});

describe("inspection data in the adapter", () => {
  it("checks windows and registers three live areas", () => {
    expect(d.problem("2026-10-27", "")).not.toBeNull();
    expect(d.problem("2026-10-27", "2026-11-27")).toBeNull();
    expect(AREAS.map((a) => a.id)).toEqual(["setup.auditor",
      "reports.inspection", "reports.error-remedies"]);
    expect(d.months).toHaveLength(10);
    expect(d.packs["2026-10"]!.note).toMatch(/not a filing/);
  });
});
