import { describe, expect, it } from "vitest";
import { buildDemoData } from "../../src/demo/data/adapter";
import { INITIAL, type DemoState } from "../../src/demo/state";
import { wordOfRoute } from "../../src/nav/registry";

const data = buildDemoData();
const as = (role: DemoState["role"]): DemoState => ({ ...INITIAL, role });

describe("the phone bar lights the right word", () => {
  it("the manager's hiring form belongs to Requests, not Pay", () => {
    const c = { data, state: as("manager") };
    expect(wordOfRoute("manager", { section: "people",
      rest: ["hiring", "requests", "new"] }, c)).toBe("requests");
  });
});
