import { describe, expect, it } from "vitest";
import {
  PAY_INPUTS_STATEMENT,
  PayInputAbsence,
  PayInputOvertime,
  PayInputRestDayWork,
} from "../src/index";

/** Literal copies of Plan 5's OvertimeEntry, RestDayWork and Absence. */
describe("pay inputs mirror Plan 5's shapes", () => {
  it("keys equal Plan 5's", () => {
    expect(Object.keys(PayInputOvertime.shape))
      .toEqual(["date", "minutes", "nightMinutes"]);
    expect(Object.keys(PayInputRestDayWork.shape))
      .toEqual(["date", "kind", "compensation"]);
    expect(Object.keys(PayInputAbsence.shape)).toEqual(["date", "kind"]);
  });
  it("enums equal Plan 5's", () => {
    expect(PayInputRestDayWork.shape.kind.options)
      .toEqual(["rest-day", "holiday"]);
    expect(PayInputRestDayWork.shape.compensation.options)
      .toEqual(["pay", "day-off"]);
    expect(PayInputAbsence.shape.kind.options)
      .toEqual(["unpaid", "sick", "maternity"]);
  });
  it("the statement is exact", () => {
    expect(PAY_INPUTS_STATEMENT).toBe("Time inputs for review. Nothing " +
      "here is paid until HR enters it in a pay run and an owner " +
      "approves the run. Work-from-home tracking data is never included.");
  });
});
