import {
  loadTimeParams,
  selectPack,
  TIME_PACKS,
  type TimeParams,
} from "@payroll/engine";

/**
 * The `ae-time` pack's values for a date. The API holds no statutory
 * number: every legal value comes from the engine pack.
 */
export function timeParams(date: string): TimeParams {
  return loadTimeParams(selectPack(TIME_PACKS, date), undefined);
}
