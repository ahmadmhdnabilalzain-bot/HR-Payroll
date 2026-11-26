import { describe, expect, it } from "vitest";
import {
  appointmentFineExposure,
  EINVOICING_PACKS,
  einvoiceIssueBy,
  einvoicingDeadlines,
  fils,
  missingDocumentFineExposure,
  participantIdFor,
  tinFromTrn,
} from "../src/index";

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    return (e as { code: string }).code;
  }
  return "NONE";
}

const AS_OF = "2026-11-26";

describe("e-invoicing rules", () => {
  it("bands", () => {
    expect(einvoicingDeadlines(fils(5000000000n), AS_OF).value).toEqual({
      band: "large", appointBy: "2026-10-30", goLive: "2027-01-01" });
    expect(einvoicingDeadlines(fils(4999999999n), AS_OF).value).toEqual({
      band: "small", appointBy: "2027-03-31", goLive: "2027-07-01" });
    expect(einvoicingDeadlines(null, AS_OF).value).toEqual({
      band: "unknown", appointBy: null, goLive: null });
    expect(einvoicingDeadlines(null, AS_OF).trace[0]!.id)
      .toBe("einv.deadlines");
  });
  it("appointment_fine_part_month", () => {
    const run = (asOf: string, on: string | null = null) =>
      appointmentFineExposure("2027-03-31", on, asOf).value;
    expect(run("2027-04-01")).toEqual({ monthsLate: 1, amount: 500000n });
    expect(run("2027-04-30").monthsLate).toBe(1);
    expect(run("2027-05-01")).toEqual({ monthsLate: 2,
      amount: 1000000n });
    expect(run("2027-04-01", "2027-03-31")).toEqual({ monthsLate: 0,
      amount: 0n });
    expect(run("2027-03-01")).toEqual({ monthsLate: 0, amount: 0n });
  });
  it("appointment_fine_stops_at_appointment", () => {
    expect(appointmentFineExposure("2027-03-31", "2027-04-15",
      "2027-09-01").value.monthsLate).toBe(1);
    expect(codeOf(() => appointmentFineExposure("2027-03-31",
      "2027-09-02", "2027-09-01"))).toBe("INVALID_PERIOD");
  });
  it("missing_documents_capped", () => {
    const r = missingDocumentFineExposure([
      { month: "2027-08", invoices: 60, creditNotes: 2 },
      { month: "2027-09", invoices: 3, creditNotes: 0 },
    ]);
    expect(r.value.byMonth).toEqual([
      { month: "2027-08", amount: 520000n },
      { month: "2027-09", amount: 30000n }]);
    expect(r.value.amount).toBe(550000n);
    expect(r.trace[0]!.id).toBe("einv.fine.missing");
    expect(codeOf(() => missingDocumentFineExposure([
      { month: "2027-08", invoices: -1, creditNotes: 0 }])))
      .toBe("INVALID_COUNT");
    expect(codeOf(() => missingDocumentFineExposure([
      { month: "2027-08", invoices: 1, creditNotes: 0 },
      { month: "2027-08", invoices: 1, creditNotes: 0 }])))
      .toBe("INVALID_PERIOD");
    expect(codeOf(() => missingDocumentFineExposure([
      { month: "2027-13", invoices: 1, creditNotes: 0 }])))
      .toBe("INVALID_DATE");
  });
  it("issue_by_business_days", () => {
    const r = einvoiceIssueBy("2027-07-01", []);
    expect(r.value).toBe("2027-07-21");
    expect(r.trace[0]!.id).toBe("einv.issue-by");
    expect(einvoiceIssueBy("2027-07-01", ["2027-07-02"]).value)
      .toBe("2027-07-22");
  });
  it("participant_id", () => {
    expect(participantIdFor("100123456700003")).toEqual({
      scheme: "0235", id: "1001234567" });
    expect(tinFromTrn("100123456700003")).toBe("1001234567");
    expect(codeOf(() => tinFromTrn("12345"))).toBe("INVALID_TRN");
    expect(codeOf(() => tinFromTrn("10012345670000A")))
      .toBe("INVALID_TRN");
  });
  it("fines_secondary", () => {
    const r = appointmentFineExposure("2027-03-31", null, "2027-04-01");
    expect(r.trace[0]!.id).toBe("einv.fine.appointment");
    const rule = r.trace[0]!.rules
      .find((x) => x.key === "notImplementedFinePerMonthFils")!;
    expect(rule.status).toBe("secondary");
    expect(EINVOICING_PACKS[0]!.params.ftaReportingDeadline!.value)
      .toBeNull();
  });
});
