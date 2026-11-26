import { describe, expect, it } from "vitest";
import {
  AS_OF,
  RESPONSE_DAYS_DEFAULT,
  buildDemoCompany,
  privacyCategories,
  retentionRun,
  subjectRequests,
  type DemoCompany,
} from "../src/index";
import { SEEDS, asText } from "./wpd-scan";

const each = (fn: (c: DemoCompany) => void) =>
  SEEDS.forEach((s) => fn(buildDemoCompany(s)));

/** The words that would claim the company or product meets the law. */
const CLAIMS =
  /\b(compliant|compliance|complies|certified|approved|approval|guarantee[sd]?)\b/i;

describe("WPE privacy and retention (S26)", () => {
  it("categories cover identity, pay, health and documents", () => each(
    (c) => {
      const cats = privacyCategories(c);
      for (const id of ["identity", "pay", "health", "documents"]) {
        expect(cats.map((x) => x.id)).toContain(id);
      }
      for (const x of cats) {
        expect(x.people).toBeGreaterThan(0);
        expect(x.seenBy.length).toBeGreaterThan(0);
        expect(x.sampleMonths).toBeGreaterThanOrEqual(0);
      }
    }));

  it("health is marked sensitive and seen by HR only", () => each((c) => {
    const h = privacyCategories(c).find((x) => x.id === "health")!;
    expect(h.sensitive).toBe(true);
    expect(h.seenBy).toEqual(["HR manager"]);
  }));

  it("requests: access, correction, erasure, due from the setting", () =>
    each((c) => {
      const r = subjectRequests(c, RESPONSE_DAYS_DEFAULT);
      expect(r.map((x) => x.kind).sort())
        .toEqual(["access", "correction", "erasure"]);
      for (const x of r) {
        expect(x.dueOn.iso > x.receivedOn.iso).toBe(true);
        expect(x.receivedOn.iso <= AS_OF).toBe(true);
      }
      const longer = subjectRequests(c, RESPONSE_DAYS_DEFAULT + 10);
      expect(longer[0]!.dueOn.iso > r[0]!.dueOn.iso).toBe(true);
    }));

  it("retention run lists the leaver and nothing is deleted", () => each(
    (c) => {
      const sample = Object.fromEntries(privacyCategories(c)
        .map((x) => [x.id, x.sampleMonths]));
      const run = retentionRun(c, sample);
      expect(run.length).toBeGreaterThan(0);
      expect(run.every((r) => r.state === "keep")).toBe(true);
      const zero = retentionRun(c, Object.fromEntries(Object.keys(sample)
        .map((k) => [k, 0])));
      expect(zero.every((r) => r.state === "due")).toBe(true);
      expect(zero.length).toBe(run.length);
    }));

  it("wording: no compliance claim, no raw date", () => each((c) => {
    const t = asText([privacyCategories(c), subjectRequests(c, 30),
      retentionRun(c, {})]);
    expect(t).not.toMatch(CLAIMS);
    expect(t).not.toMatch(/"display":"\d{4}-/);
    expect(t).toMatch(/to confirm with counsel/);
  }));
});
