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

export const TIME_EXAMPLES: Readonly<Record<string, unknown>> = {
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
