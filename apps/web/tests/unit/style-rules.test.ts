import { describe, expect, it } from "vitest";
import { filesUnder, readWeb } from "../helpers/files";

const STYLED = filesUnder("src", [".css", ".tsx"]);

const PHYSICAL = [
  /(margin|padding|border)-(left|right)/,
  /\b(left|right)\s*:/,
  /text-align:\s*(left|right)/,
  /float:\s*(left|right)/,
];

const COLOUR =
  /#[0-9a-f]{3}(?:[0-9a-f]{3})?(?:[0-9a-f]{2})?\b|rgba?\(|hsla?\(/i;

/** In-page anchors (`href="#id"`) are not colours. */
const stripAnchors = (s: string): string => s.replace(/href="#[^"]*"/g, "");

describe("style rules", () => {
  it("finds the styled files", () => {
    expect(STYLED.length).toBeGreaterThan(0);
  });

  it("no-physical-direction", () => {
    const hits = STYLED.filter((f) =>
      PHYSICAL.some((re) => re.test(readWeb(f))));
    expect(hits).toEqual([]);
  });

  it("no-colour-literals", () => {
    const hits = STYLED.filter((f) => !f.endsWith("theme/tokens.css"))
      .filter((f) => COLOUR.test(stripAnchors(readWeb(f))));
    expect(hits).toEqual([]);
  });
});
