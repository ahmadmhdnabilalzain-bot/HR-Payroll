import { describe, expect, it } from "vitest";
import { ranked, type Command } from "../../src/shell/commands";
import { readWeb } from "../helpers/files";

const go = (id: string, label: string, keywords: string): Command =>
  ({ id, group: "go", label, hint: "", icon: "file", keywords,
    run: () => undefined });

describe("palette ranking", () => {
  const all = [
    go("pay.offcycle", "Extra pay run", "off cycle advance bonus"),
    go("pay.bonus", "Bonus runs", "bonus run off cycle"),
  ];

  it("puts Bonus runs above Extra pay run for bonus", () => {
    expect(ranked(all, "bonus").map((c) => c.id))
      .toEqual(["pay.bonus", "pay.offcycle"]);
  });

  it("keeps the given order for ties and an empty query", () => {
    expect(ranked(all, "").map((c) => c.id))
      .toEqual(["pay.offcycle", "pay.bonus"]);
  });
});

describe("links and dotted rules", () => {
  it("a bare link is ink, never browser blue", () => {
    const css = readWeb("src/theme/base.css");
    expect(css).toMatch(/:where\(a\)[^{]*\{\s*color:\s*inherit/);
    expect(css).toContain(":where(a:visited)");
  });

  it("the dotted rule is only for worked-out figures", () => {
    const css = readWeb("src/components/explain/Explain.module.css");
    expect(css).toContain('.trigger[data-worked="true"]');
    expect(css).toContain("dotted transparent");
  });
});
