import { describe, expect, it } from "vitest";
import {
  EXIT_FLAG_ONLY,
  EXIT_FLAG_ONLY_NOTE,
  ExitKind,
  NOTICE_FLAG_TEXT,
  NoticeFlag,
  SELF_SERVICE_KINDS,
} from "../src/index";

describe("exit schemas", () => {
  it("ExitKind is the engine's seven strings in order", () => {
    expect(ExitKind.options).toEqual(["resignation", "termination",
      "summary-dismissal", "worker-exit-without-notice",
      "probation-employer-termination", "probation-leave-state",
      "probation-new-employer"]);
  });
  it("every notice flag has its text", () => {
    expect(Object.keys(NOTICE_FLAG_TEXT).sort())
      .toEqual([...NoticeFlag.options].sort());
    expect(NOTICE_FLAG_TEXT["reduced-by-agreement"]).toContain("43(2)");
    expect(NOTICE_FLAG_TEXT["job-search-day"]).toContain("43(5)");
  });
  it("flag-only items are the six, never deducted", () => {
    expect([...EXIT_FLAG_ONLY]).toEqual(["loan balances",
      "air ticket entitlement", "training-bond balance",
      "open expense claims", "company card balance",
      "deductions from final pay"]);
    expect(EXIT_FLAG_ONLY_NOTE).toContain("never deducted");
  });
  it("self-service kinds are resignation and the worker's probation ones",
    () => {
      expect([...SELF_SERVICE_KINDS]).toEqual(["resignation",
        "probation-leave-state", "probation-new-employer"]);
    });
  it("no text claims compliance", () => {
    const all = JSON.stringify([NOTICE_FLAG_TEXT, EXIT_FLAG_ONLY,
      EXIT_FLAG_ONLY_NOTE]);
    expect(all.toLowerCase()).not.toContain("compliant");
  });
});
