/**
 * Plan 9's GET routes for the leak test: `{id}` kind per route (a
 * route missing here fails the test) and the query each one needs.
 */
export const TIME_ID_KIND: Record<string, "employee" | null> = {
  getTimeSettings: null, listHolidays: null, listSpecialPeriods: null,
  listWorkSites: null, getTimeProfile: "employee",
  listShiftTemplates: null, getRoster: null, listSwapRequests: null,
};

export const TIME_QUERY: Record<string, string> = {
  getRoster: "?from=2026-03-01&to=2026-03-31",
  listHolidays: "?year=2026",
  listSpecialPeriods: "?year=2026",
};
