import type { z } from "zod";
import * as settingsRoutes from "./routes-time-settings";
import * as settings from "./time-settings";

function named(mod: Record<string, unknown>, names: readonly string[]) {
  const out: Record<string, z.ZodType> = {};
  for (const n of names) {
    const s = mod[n];
    if (s === undefined) throw new Error(`no schema ${n}`);
    out[n] = s as z.ZodType;
  }
  return out;
}

/** Plan 9's named schemas (OpenAPI components and EXAMPLES keys). */
export const TIME_SCHEMAS: Readonly<Record<string, z.ZodType>> = {
  ...named(settings, ["GeoPoint", "TimeFlagView", "TimeSettings",
    "TimeSettingsUpdate", "Holiday", "HolidayCreate", "HolidayUpdate",
    "SpecialPeriod", "SpecialPeriodCreate", "SpecialPeriodUpdate",
    "WorkSite", "WorkSiteCreate", "WorkSiteUpdate", "TimeProfile",
    "TimeProfileUpdate"]),
  ...named(settingsRoutes, ["HolidayList", "SpecialPeriodList",
    "WorkSiteList"]),
};
