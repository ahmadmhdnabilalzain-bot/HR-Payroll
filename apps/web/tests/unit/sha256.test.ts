import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { canonical, sha256 } from "../../src/api/mock/sha256";

const node = (s: string): string =>
  createHash("sha256").update(s, "utf8").digest("hex");

describe("mock sha256", () => {
  it("matches-node-crypto", () => {
    for (const s of ["", "abc", "a".repeat(55), "a".repeat(56),
      "x".repeat(1000), "سارة علي ⁦AED⁩"]) {
      expect(sha256(s)).toBe(node(s));
    }
  });

  it("canonical-sorts-keys", () => {
    expect(canonical({ b: 1, a: [2, { d: 3, c: 4n }] }))
      .toBe('{"a":[2,{"c":"4","d":3}],"b":1}');
  });
});
