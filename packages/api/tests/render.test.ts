import { describe, expect, it } from "vitest";
import { renderTemplate, whatsappParams } from "../src/channels/render";

const vars = { requester: "Sara A", subject: "subject.expense-claim" };

describe("renderTemplate", () => {
  it("render_english", () => {
    const r = renderTemplate("approval-pending", "en", vars);
    expect(r.subject).toBe("Approval waiting: expense claim");
    expect(r.body).toBe("Sara A asked you to approve: expense claim. " +
      "Open the app to review it.");
    expect(r.languageFallback).toBe(false);
  });
  it("render_arabic_falls_back", () => {
    const r = renderTemplate("approval-pending", "ar", vars);
    expect(r.subject).toBe("Approval waiting: expense claim");
    expect(r.language).toBe("en");
    expect(r.languageFallback).toBe(true);
  });
  it("render_refuses_money_and_ids", () => {
    for (const bad of ["4000.00", "AE07 0331", "12345678901234",
      "784199012345678"]) {
      expect(() => renderTemplate("approval-pending", "en",
        { ...vars, requester: bad }), bad).toThrow(
        expect.objectContaining({ code: "TEMPLATE_VAR_FORBIDDEN" }));
    }
    expect(() => renderTemplate("approval-pending", "en",
      { subject: vars.subject })).toThrow(
      expect.objectContaining({ code: "TEMPLATE_VAR_MISSING" }));
    expect(() => renderTemplate("approval-pending", "en",
      { ...vars, amount: "1" })).toThrow(
      expect.objectContaining({ code: "TEMPLATE_VAR_FORBIDDEN" }));
    expect(() => renderTemplate("approval-pending", "en",
      { ...vars, code: "123456" })).toThrow(
      expect.objectContaining({ code: "TEMPLATE_VAR_FORBIDDEN" }));
    expect(() => renderTemplate("approval-closed", "en",
      { subject: "subject.expense-claim", outcome: "subject.expense-claim" }))
      .toThrow(expect.objectContaining({ code: "TEMPLATE_VAR_FORBIDDEN" }));
  });
  it("render_strips_controls", () => {
    const r = renderTemplate("approval-pending", "en",
      { ...vars, requester: "A\u0000B\nC" });
    expect(r.body.startsWith("ABC asked")).toBe(true);
    const long = renderTemplate("approval-pending", "en",
      { ...vars, requester: "x".repeat(200) });
    expect(long.body.startsWith(`${"x".repeat(80)} asked`)).toBe(true);
  });
  it("whatsapp params are the values in declared order", () => {
    expect(whatsappParams("approval-pending", "en", vars))
      .toEqual(["Sara A", "expense claim"]);
    expect(whatsappParams("channel-verify-code", "en", { code: "012345" }))
      .toEqual(["012345"]);
  });
});
