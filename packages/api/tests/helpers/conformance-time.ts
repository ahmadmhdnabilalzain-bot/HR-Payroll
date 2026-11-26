import type { Res } from "./test-app";

/** The conformance recorder: calls one route by id. */
export type Hitter = (id: string, token: string | null,
  company: string | null, params?: Record<string, string>, body?: unknown,
  extra?: { query?: string; headers?: Record<string, string> }) =>
  Promise<Res>;

export interface TimeFlowCtx {
  hit: Hitter;
  owner: string;
  emp: string;
  c: string;
  empId: string;
}

/** One happy-path call per Plan 9 Task 3 route. */
async function settingsFlow(f: TimeFlowCtx): Promise<string> {
  const { hit, owner, emp, c, empId } = f;
  await hit("getTimeSettings", emp, c);
  await hit("updateTimeSettings", owner, c, {}, { restDays: ["wed"] });
  const year = { query: "?year=2026" };
  const h = await hit("createHoliday", owner, c, {}, { date: "2026-03-20",
    name: "Company Day A", kind: "company" });
  await hit("updateHoliday", owner, c, { id: h.body.id }, { nameAr: null });
  await hit("listHolidays", emp, c, {}, undefined, year);
  const p = await hit("createSpecialPeriod", owner, c, {}, {
    kind: "ramadan", name: "Test period", start: "2026-02-18",
    end: "2026-02-20" });
  await hit("updateSpecialPeriod", owner, c, { id: p.body.id },
    { name: "Test period B" });
  await hit("listSpecialPeriods", emp, c, {}, undefined, year);
  const s = await hit("createWorkSite", owner, c, {}, { name: "Site A",
    point: { lat: 1.5, lng: 1.5 }, radiusM: 200 });
  await hit("updateWorkSite", owner, c, { id: s.body.id }, { radiusM: 300 });
  await hit("listWorkSites", owner, c);
  await hit("updateTimeProfile", owner, c, { id: empId }, {
    workMode: "hybrid", geofenceMode: "record", workSiteIds: [s.body.id],
    wfhTracked: false, shiftWorker: false });
  await hit("getTimeProfile", emp, c, { id: empId });
  return s.body.id as string;
}

/** Every Plan 9 route, in task order. */
export async function timeFlow(f: TimeFlowCtx): Promise<void> {
  await settingsFlow(f);
}
