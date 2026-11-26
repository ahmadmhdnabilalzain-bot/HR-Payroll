import { ROUTES } from "@payroll/contract";
import { beforeAll, describe, expect, it } from "vitest";
import { dubaiDate } from "../src/time/dubai";
import { TIME_QUERY } from "./helpers/leak-time";
import { seedCompany, type Seeded, type SeedUser } from "./helpers/seed";
import { asUser, linkUser, seedTime } from "./helpers/seed-time";
import { seedWfh } from "./helpers/seed-wfh";
import { makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
const COORDS = /1\.234|1\.432/;
const getRoutes = ROUTES.filter((r) => r.method === "GET" &&
  r.auth === "tenant");

/**
 * Review Focus 1: no coordinate or per-minute timeline reaches anyone
 * but the employee; owner and hr see coordinates only on the MFA
 * locations route.
 */
describe("wfh_leak_manager_and_peer_see_no_coordinates", () => {
  let ctx: Ctx;
  let s: Seeded;
  let peer: SeedUser;
  let query: Record<string, string>;
  beforeAll(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "wleak");
    await seedTime(ctx, s);
    const w = await seedWfh(ctx, s);
    peer = await linkUser(ctx, s, s.emp.report2, "wleakpeer");
    const d = dubaiDate(w.first);
    const r = `from=${d}&to=${d}`;
    query = { ...TIME_QUERY, listAttendance: `?${r}`,
      getLeaveBalances: "?year=2026", getMyWfhDays: `?${r}`,
      getWfhSummary: `?${r}`,
      listWfhLocations: `?${r}&employeeId=${s.emp.report}` };
  });
  const bodies = async (who: SeedUser) => {
    const as = asUser(ctx, s);
    const out: { id: string; text: string }[] = [];
    for (const r of getRoutes) {
      const path = r.path.replace("{id}", s.emp.report) +
        (query[r.id] ?? "");
      out.push({ id: r.id, text: (await as(who, "GET", path)).text });
    }
    return out;
  };

  it("manager and peer: no coordinate and no hourly detail", async () => {
    for (const who of [s.manager, peer]) {
      for (const b of await bodies(who)) {
        expect(COORDS.test(b.text), b.id).toBe(false);
        expect(b.text.includes("\"hours\""), b.id).toBe(false);
      }
    }
  });

  it("owner and hr: coordinates only on listWfhLocations", async () => {
    for (const who of [s.owner, s.hr]) {
      const all = await bodies(who);
      const hits = all.filter((b) => COORDS.test(b.text)).map((b) => b.id);
      expect(hits).toEqual(["listWfhLocations"]);
      for (const b of all) {
        expect(b.text.includes("\"hours\""), b.id).toBe(false);
      }
    }
  });

  it("the employee sees their own detail (the test is not vacuous)",
    async () => {
      const own = await bodies(s.employee);
      const days = own.find((b) => b.id === "getMyWfhDays")!;
      expect(COORDS.test(days.text)).toBe(true);
      expect(days.text).toContain("\"hours\"");
    });
});
