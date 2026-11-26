import { describe, expect, it } from "vitest";
import { buildDemoData } from "../../src/demo/data/adapter";
import { INITIAL, reduce } from "../../src/demo/state";
import { allApprovals } from "../../src/demo/time-off";
import { ALL_AREAS } from "../../src/nav/areas";
import { roleAllows } from "../../src/nav/registry";
import { logRows } from "../../src/time/finish/views";

const d = buildDemoData();
const grant = { employeeId: "emp-017", days: 2, reason: "Worked the audit",
  makerId: "emp-002", checkerId: "emp-001", requestedOn: "2026-10-27" };
const report = { what: "Wet floor by the lift.", place: "hq-abu-dhabi",
  severity: "low" as const, reporterId: "emp-017",
  reportedOn: "2026-10-27" };

describe("WP31 store", () => {
  it("a grant is one approval for the General manager, with a way back",
    () => {
      const a = reduce(INITIAL, { type: "finish-grant", draft: grant });
      const ap = allApprovals(d, a).find((x) => x.id === a.grants[0]!
        .approvalId);
      expect(ap?.checkerId).toBe("emp-001");
      expect(ap?.employeeId).toBe("emp-017");
      expect(a.grants[0]!.approvalId).toMatch(/^fin-ap-/);
      const b = reduce(a, { type: "finish-grant-withdraw",
        id: a.grants[0]!.id });
      expect(allApprovals(d, b).some((x) => x.id === a.grants[0]!
        .approvalId)).toBe(false);
      expect(reduce(b, { type: "finish-grant-restore",
        id: a.grants[0]!.id }).grants[0]!.withdrawn).toBe(false);
    });

  it("ids come from the counter", () => {
    let s = reduce(INITIAL, { type: "finish-grant", draft: grant });
    s = reduce(s, { type: "finish-incident", draft: report });
    s = reduce(s, { type: "finish-incident", draft: report });
    expect(s.incidentReports.map((r) => r.id)).toEqual(["inc-new-3",
      "inc-new-2"]);
  });

  it("a report lands first in the HR log and the report counts it", () => {
    const base = logRows(d, INITIAL).length;
    const a = reduce(INITIAL, { type: "finish-incident", draft: report });
    const rows = logRows(d, a);
    expect(rows.length).toBe(base + 1);
    expect(rows[0]!.status).toBe("open");
    expect(rows[0]!.reportedById).toBe("emp-017");
    const months = d.finish.byMonthWith([], rows.slice(0, 1));
    const was = d.finish.byMonthWith([], []);
    expect(months.at(-1)!.total).toBe(was.at(-1)!.total + 1);
    const b = reduce(a, { type: "finish-incident-withdraw",
      id: a.incidentReports[0]!.id });
    expect(logRows(d, b).length).toBe(base);
  });
});

describe("WP31 registry", () => {
  const find = (id: string) => ALL_AREAS.find((a) => a.id === id)!;
  it("comp-off and grants are HR and General manager; the report is staff",
    () => {
      for (const id of ["time.comp-off", "time.grants"]) {
        expect(roleAllows(find(id), "hr")).toBe(true);
        expect(roleAllows(find(id), "gm")).toBe(true);
        expect(roleAllows(find(id), "it")).toBe(false);
        expect(roleAllows(find(id), "employee")).toBe(false);
      }
      const r = find("me.report-incident");
      expect(roleAllows(r, "employee")).toBe(true);
      expect(roleAllows(r, "manager")).toBe(true);
      expect(roleAllows(r, "hr")).toBe(false);
      expect(find("reports.safety-incidents").keywords).not.toMatch(/E14/);
      expect(r.keywords).toMatch(/E14/);
    });
});
