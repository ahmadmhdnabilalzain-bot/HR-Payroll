import { describe, expect, it } from "vitest";
import { buildDemoData } from "../../src/demo/data/adapter";
import { leavePage } from "../../src/setup/rules/pages";
import { mayTake, typesFor } from "../../src/timeoff/eligibility";

const d = buildDemoData();
const byName = (n: string) => d.people.people()
  .find((p) => p.name.en === n)!;
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe("leave types follow the person's file", () => {
  const types = d.people.leaveTypes();

  it("keeps-maternity-from-a-man-and-says-why", () => {
    const jose = byName("Jose Reyes");
    expect(jose.gender).toBe("male");
    const t = typesFor(types, jose);
    expect(ids(t.open)).not.toContain("lt-maternity");
    expect(ids(t.closed)).toEqual(["lt-maternity"]);
    expect(t.closed[0]!.rule.who?.en).toBe("For female employees.");
    // Parental is for either parent; the rest are for everyone.
    expect(ids(t.open)).toEqual(["lt-annual", "lt-sick", "lt-parental",
      "lt-bereavement", "lt-study", "lt-unpaid"]);
  });

  it("offers-every-type-to-a-woman", () => {
    const fatima = byName("Fatima Al Ketbi");
    expect(fatima.gender).toBe("female");
    expect(typesFor(types, fatima).closed).toEqual([]);
    expect(types.every((t) => mayTake(t, fatima))).toBe(true);
  });

  it("keeps-the-whole-list-for-naming-requests", () => {
    expect(ids(types)).toContain("lt-maternity");
  });

  it("shows-who-may-take-it-in-setup", () => {
    const items = leavePage(d).groups[0]!.items;
    const mat = items.find((x) => x.key === "type:lt-maternity")!;
    expect(mat.value).toBe("Paid, up to 60 days, female employees");
    expect(mat.help).toMatch(/For female employees\. Federal Decree-Law/);
    const par = items.find((x) => x.key === "type:lt-parental")!;
    expect(par.value).toBe("Paid, up to 5 days");
  });
});
