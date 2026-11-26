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

/** A second employee with a user (a swap peer); returns both. */
async function peer(f: TimeFlowCtx) {
  const { hit, owner, c } = f;
  const e = await hit("createEmployee", owner, c, {}, { number: "E-9",
    fullName: "Peer Nine", jobTitle: "Clerk", nationality: "IN",
    workerClass: "expat-full-time", joiningDate: "2019-01-01" });
  const inv = await hit("inviteUser", owner, c, {}, {
    email: "peer9@example.com", role: "employee", employeeId: e.body.id });
  const acc = await hit("acceptInvite", null, null, {}, {
    setupToken: inv.body.setupToken, password: "correct horse battery " +
      "staple", displayName: "Peer" });
  return { id: e.body.id as string, token: acc.body.token as string };
}

async function rosterFlow(f: TimeFlowCtx, p: { id: string }) {
  const { hit, owner, emp, c, empId } = f;
  const t = await hit("createShiftTemplate", owner, c, {}, {
    name: "Shift A", start: "09:00", end: "17:00", breakMinutes: 60 });
  await hit("updateShiftTemplate", owner, c, { id: t.body.id },
    { nameAr: null });
  await hit("listShiftTemplates", emp, c);
  const slot = { kind: "shift", shiftTemplateId: t.body.id };
  await hit("putRosterEntries", owner, c, {}, { entries: [
    { employeeId: empId, date: "2026-03-10", slot },
    { employeeId: empId, date: "2026-03-11", slot },
    { employeeId: empId, date: "2026-03-12", slot }] });
  await hit("applyRotation", owner, c, {}, { employeeIds: [p.id],
    from: "2026-03-10", to: "2026-03-12", pattern: [null] });
  await hit("publishRoster", owner, c, {}, { from: "2026-03-10",
    to: "2026-03-12" });
  await hit("getRoster", emp, c, {}, undefined,
    { query: "?from=2026-03-10&to=2026-03-12" });
}

async function swapFlow(f: TimeFlowCtx, p: { id: string; token: string }) {
  const { hit, owner, emp, c } = f;
  const ask = (date: string) => hit("createSwapRequest", emp, c, {},
    { date, withEmployeeId: p.id });
  const a = await ask("2026-03-10");
  await hit("respondSwapRequest", p.token, c, { id: a.body.id },
    { accept: true });
  await hit("approveSwapRequest", owner, c, { id: a.body.id }, {});
  const b = await ask("2026-03-11");
  await hit("respondSwapRequest", p.token, c, { id: b.body.id },
    { accept: true });
  await hit("rejectSwapRequest", owner, c, { id: b.body.id }, {});
  const d = await ask("2026-03-12");
  await hit("cancelSwapRequest", emp, c, { id: d.body.id });
  await hit("listSwapRequests", emp, c);
}

async function correctionFlow(f: TimeFlowCtx) {
  const { hit, owner, emp, c } = f;
  const ask = (d: string) => hit("createCorrectionRequest", emp, c, {}, {
    date: d, clockIn: `${d}T05:00:00.000Z`, clockOut: `${d}T13:00:00.000Z`,
    reason: "Forgot to clock in" });
  const a = await ask("2026-03-02");
  await hit("approveCorrectionRequest", owner, c, { id: a.body.id });
  const b = await ask("2026-03-03");
  await hit("rejectCorrectionRequest", owner, c, { id: b.body.id }, {});
  const d = await ask("2026-03-04");
  await hit("cancelCorrectionRequest", emp, c, { id: d.body.id });
  await hit("listCorrectionRequests", emp, c);
}

/** Every Plan 9 route, in task order. */
export async function timeFlow(f: TimeFlowCtx): Promise<void> {
  await settingsFlow(f);
  const p = await peer(f);
  await rosterFlow(f, p);
  await swapFlow(f, p);
  await correctionFlow(f);
}
