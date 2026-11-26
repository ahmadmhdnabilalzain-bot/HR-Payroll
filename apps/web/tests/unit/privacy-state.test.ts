import { describe, expect, it } from "vitest";
import {
  PRIVACY_INITIAL,
  privacyValue,
  reducePrivacy,
} from "../../src/setup/privacy/state";

const who = { who: "Rana Haddad", role: "HR manager", on: "2026-10-27" };

describe("privacy choices", () => {
  it("edits are newest first and undo restores the older value", () => {
    let s = reducePrivacy(PRIVACY_INITIAL, { type: "privacy-edit",
      edit: { key: "days", value: 20, what: "Days set to 20", ...who } });
    s = reducePrivacy(s, { type: "privacy-edit",
      edit: { key: "days", value: 25, what: "Days set to 25", ...who } });
    expect(privacyValue(s.privacyEdits, "days")).toBe(25);
    s = reducePrivacy(s, { type: "privacy-undo", id: 2 });
    expect(privacyValue(s.privacyEdits, "days")).toBe(20);
    expect(s.privacyEdits[0]).toMatchObject({ ...who, undone: true });
  });

  it("a decision names who, role and day, and undoes", () => {
    let s = reducePrivacy(PRIVACY_INITIAL, { type: "dsr-decide",
      id: "dsr-001", decision: { outcome: "answered", ...who } });
    expect(s.requestDecisions["dsr-001"]).toMatchObject(who);
    s = reducePrivacy(s, { type: "dsr-undo", id: "dsr-001" });
    expect(s.requestDecisions).toEqual({});
  });

  it("the run sign-off undoes", () => {
    let s = reducePrivacy(PRIVACY_INITIAL,
      { type: "retention-sign", stamp: who });
    expect(s.retentionSignoff).toEqual(who);
    s = reducePrivacy(s, { type: "retention-unsign" });
    expect(s.retentionSignoff).toBeNull();
  });
});
