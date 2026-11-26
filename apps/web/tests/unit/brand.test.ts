import { describe, expect, it } from "vitest";
import { documentTitle, PRODUCT_NAME } from "../../src/brand";
import { filesUnder, readWeb } from "../helpers/files";

describe("brand", () => {
  it("name-defined-once", () => {
    const files = [
      ...filesUnder("src", [".ts", ".tsx", ".css"]),
      ...filesUnder("e2e", [".ts"]),
      "index.html",
    ].filter((f) => f !== "src/brand.ts");
    const names = Object.values(PRODUCT_NAME);
    const hits = files.filter((f) =>
      names.some((n) => readWeb(f).includes(n)));
    expect(hits).toEqual([]);
  });

  it("title-from-product-name", () => {
    expect(documentTitle("en")).toBe(PRODUCT_NAME.en);
    expect(documentTitle("ar")).toBe(PRODUCT_NAME.ar);
    expect(documentTitle("en", " Pay  groups. "))
      .toBe(`Pay groups · ${PRODUCT_NAME.en}`);
  });
});
