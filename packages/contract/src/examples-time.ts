/**
 * Plan 9 examples. Fixture names only ("Company Day A"), arbitrary
 * dates and coordinates; no real calendar data and no legal value.
 */
const id = (n: number) =>
  `00000000-0000-4000-8000-9${String(n).padStart(11, "0")}`;
export const TIME_IDS = { holiday: id(1), period: id(2), site: id(3),
  employee: id(4) };

const holiday = { id: TIME_IDS.holiday, date: "2026-03-20",
  name: "Company Day A", nameAr: null, kind: "company", status: "active" };
const period = { id: TIME_IDS.period, kind: "ramadan",
  name: "Test period", start: "2026-02-18", end: "2026-03-19",
  status: "active" };
const site = { id: TIME_IDS.site, name: "Site A",
  point: { lat: 1.5, lng: 1.5 }, radiusM: 200, status: "active" };

const shift = { id: id(5), name: "Shift A", nameAr: null, start: "09:00",
  end: "17:00", breakMinutes: 60, crossesMidnight: false, netMinutes: 420,
  status: "active" };
const slot = { kind: "shift", shiftTemplateId: id(5), start: "09:00",
  end: "17:00", breakMinutes: 60, netMinutes: 420 };
const rosterDay = { employeeId: TIME_IDS.employee, date: "2026-03-02",
  draft: slot, published: slot, publishedAt: "2026-03-01T08:00:00.000Z",
  changedSincePublish: false, version: 1 };
const flag = { employeeId: TIME_IDS.employee, code: "NO_WEEKLY_REST",
  dates: ["2026-03-02"], detail: {}, rule: null };
const swap = { id: id(6), requesterEmployeeId: TIME_IDS.employee,
  date: "2026-03-02", peerEmployeeId: id(7), peerDate: "2026-03-02",
  status: "pending-peer", requesterSlot: slot, peerSlot: { kind: "rest" },
  flagsAfter: [], decidedBy: null, decidedAt: null,
  createdAt: "2026-03-01T08:00:00.000Z" };

const ROSTER_EXAMPLES = {
  ShiftTemplate: shift,
  ShiftTemplateList: { items: [shift] },
  RosterDayList: { items: [rosterDay] },
  RosterResult: { days: [rosterDay], flags: [flag] },
  PublishResult: { published: 1, flags: [flag] },
  SwapRequest: swap,
  SwapRequestList: { items: [swap] },
};

export const TIME_EXAMPLES: Readonly<Record<string, unknown>> = {
  ...ROSTER_EXAMPLES,
  TimeSettings: { restDays: [], graceMinutes: 5, lateFlagThreshold: 3,
    restAdjacentAbsenceThreshold: 2, shortSickSpellThreshold: 3,
    accuracyAllowanceM: 50, productDefaults: ["graceMinutes"] },
  Holiday: holiday,
  HolidayList: { items: [holiday] },
  SpecialPeriod: period,
  SpecialPeriodList: { items: [period] },
  WorkSite: site,
  WorkSiteList: { items: [site] },
  TimeProfile: { employeeId: TIME_IDS.employee, workMode: "site",
    geofenceMode: "off", workSiteIds: [], wfhTracked: false,
    shiftWorker: false },
};
