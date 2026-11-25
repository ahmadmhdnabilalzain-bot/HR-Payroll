import { describe, expect, it } from "vitest";
import { TraceBuilder, traceRule } from "../src/trace";
import type { TraceLine } from "../src/trace-types";
import type { ResolvedParam } from "../src/rules/types";

const rule = {
  key: "k",
  value: "1",
  status: "official" as const,
  packId: "p",
  packVersion: "1",
  overridden: false,
};

const line = (id: string): TraceLine => ({
  id,
  label: `L ${id}`,
  formula: "a + b",
  inputs: { a: "1" },
  result: "2",
  rules: [rule],
});

describe("TraceBuilder", () => {
  it("keeps insertion order", () => {
    const t = new TraceBuilder();
    t.add(line("b"));
    t.add(line("a"));
    expect(t.lines().map((l) => l.id)).toEqual(["b", "a"]);
  });
  it("returns a defensive copy", () => {
    const t = new TraceBuilder();
    t.add(line("a"));
    const out = t.lines();
    out.push(line("z"));
    out[0]!.inputs["a"] = "99";
    out[0]!.rules[0]!.value = "99";
    out[0]!.rules.push(rule);
    out[0]!.result = "x";
    const again = t.lines();
    expect(again).toEqual([line("a")]);
  });
  it("does not alias the added line", () => {
    const t = new TraceBuilder();
    const l = line("a");
    t.add(l);
    l.inputs["a"] = "99";
    expect(t.lines()[0]!.inputs["a"]).toBe("1");
  });
  it("rejects a duplicate id", () => {
    const t = new TraceBuilder();
    t.add(line("a"));
    expect(() => t.add(line("a"))).toThrowError(
      expect.objectContaining({
        code: "DUPLICATE_TRACE_ID",
        detail: { id: "a" },
      }),
    );
  });
});

describe("traceRule", () => {
  it("stringifies the value and keeps metadata", () => {
    const p: ResolvedParam = {
      key: "rate",
      value: 0.05,
      status: "secondary",
      source: null,
      packId: "uae",
      packVersion: "2026.1",
      overridden: true,
    };
    expect(traceRule(p)).toEqual({
      key: "rate",
      value: "0.05",
      status: "secondary",
      packId: "uae",
      packVersion: "2026.1",
      overridden: true,
    });
  });
});
