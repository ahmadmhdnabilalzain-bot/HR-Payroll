import { describe, expect, it } from "vitest";
import { buildDemoData } from "../../src/demo/data/adapter";
import { INITIAL, type DemoState } from "../../src/demo/state";
import { reduceVerify } from "../../src/demo/verify-state";
import { ALL_AREAS } from "../../src/nav/areas";
import { roleAllows } from "../../src/nav/registry";
import {
  codeRows,
  expiryRows,
  intakeRows,
} from "../../src/people/verify/model";
import { V } from "../../src/people/verify/words";

const d = buildDemoData();
const BANNED = /\b(approved|certified|compliant|legally valid)\b/i;
const who = { by: "emp-029", role: "hr" as const, on: d.verify.asOf };

describe("verifiable letters in the app", () => {
  it("a right code reads issued by, date and person, with no pay", () => {
    const rows = codeRows(d, INITIAL);
    const r = rows.find((x) => x.status === "valid")!;
    const hit = d.verify.lookup(rows, r.code);
    expect(hit.found && hit.letter.statement).toMatch(
      /^Issued by .+ on .+ for .+, (salary certificate|no-objection)/);
    expect(JSON.stringify(rows)).not.toMatch(/AED|monthlySalary/);
  });
  it("a wrong code is not found", () => {
    expect(d.verify.lookup(codeRows(d, INITIAL), "VL-ZZZZ-ZZZZ").found)
      .toBe(false);
  });
  it("withdrawing a code changes the answer, restoring undoes it", () => {
    const id = codeRows(d, INITIAL).find((x) => x.status === "valid")!.id;
    const s1 = reduceVerify<DemoState>(INITIAL, { type: "verify-withdraw",
      id, who });
    const r = codeRows(d, s1).find((x) => x.id === id)!;
    expect(r.status).toBe("withdrawn");
    expect(r.statement).toMatch(/Withdrawn by/);
    const s2 = reduceVerify<DemoState>(s1, { type: "verify-restore", id });
    expect(codeRows(d, s2).find((x) => x.id === id)!.status).toBe("valid");
  });
});

describe("document intake in the app", () => {
  const draft = { ...who, employeeId: "emp-017", docType: "Certificate",
    expires: "2027-01-05", fileName: "scan.pdf", bytes: 10, version: 1 };
  it("a taken-in scan shows in intake and in the expiry list", () => {
    const s = reduceVerify<DemoState>(INITIAL, { type: "verify-intake",
      draft });
    expect(intakeRows(d, s, "en")[0]!.filedTo).toMatch(/^Certificate, /);
    const e = expiryRows(d, s, "en").filter((x) => x.via === "Taken in");
    expect(e.some((x) => x.expiresIso === "2027-01-05")).toBe(true);
    const back = reduceVerify<DemoState>(s, { type: "verify-unintake",
      id: s.intakes[0]!.id });
    expect(back.intakes).toHaveLength(0);
  });
  it("the expiry list is sorted soonest first", () => {
    const days = expiryRows(d, INITIAL, "en").map((x) => x.daysLeft);
    expect(days).toEqual([...days].sort((a, b) => a - b));
  });
});

describe("registry and words", () => {
  it("rows are live; lists are HR and GM; the check opens for all", () => {
    const mine = ALL_AREAS.filter((a) => /^P(34|54)/.test(a.keywords ?? ""));
    expect(mine).toHaveLength(4);
    expect(mine.every((a) => a.status === "live")).toBe(true);
    const check = mine.find((a) => a.id === "people.letter-check")!;
    expect(roleAllows(check, "employee")).toBe(true);
    const intake = mine.find((a) => a.id === "people.doc-intake")!;
    expect(roleAllows(intake, "employee")).toBe(false);
    expect(roleAllows(intake, "hr")).toBe(true);
  });
  it("no authority or legal claims in the words", () => {
    expect(JSON.stringify(V)).not.toMatch(BANNED);
    expect(V.hereNote).toMatch(/browser tab only/);
    expect(V.hereNote).toMatch(/does not read the text/);
  });
});
