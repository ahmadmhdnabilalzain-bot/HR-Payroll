import { describe, expect, it } from "vitest";
import { requireParam, selectPack } from "../src/rules/select";
import type { RulePack } from "../src/rules/types";

const SRC = { url: "https://example.test/law", note: "n" };

function pack(
  version: string,
  from: string,
  to: string | null,
): RulePack {
  return {
    id: "ae",
    version,
    effectiveFrom: from,
    effectiveTo: to,
    params: {
      rate: { value: 5, status: "official", source: SRC },
      cap: { value: null, status: "unsourced", source: null },
      stale: { value: 7, status: "unsourced", source: null },
    },
  };
}

const p1 = pack("1", "2024-01-01", "2025-01-01");
const p2 = pack("2", "2025-01-01", null);

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (err) {
    return (err as { code?: string }).code;
  }
  return undefined;
}

describe("selectPack", () => {
  it("picks by date, start inclusive, end exclusive", () => {
    expect(selectPack([p1, p2], "2024-12-31").version).toBe("1");
    expect(selectPack([p1, p2], "2025-01-01").version).toBe("2");
    expect(selectPack([p1, p2], "2024-01-01").version).toBe("1");
  });

  it("treats effectiveTo null as open-ended", () => {
    expect(selectPack([p2], "2099-12-31").version).toBe("2");
  });

  it("throws NO_PACK_FOR_DATE when nothing matches", () => {
    expect(codeOf(() => selectPack([p1, p2], "2023-12-31"))).toBe(
      "NO_PACK_FOR_DATE",
    );
  });

  it("throws OVERLAPPING_PACKS when two match", () => {
    const wide = pack("3", "2024-06-01", null);
    expect(codeOf(() => selectPack([p1, wide], "2024-07-01"))).toBe(
      "OVERLAPPING_PACKS",
    );
  });

  it("throws INVALID_DATE for non-ISO dates", () => {
    for (const bad of ["2024-1-1", "01/01/2024", "2024-02-30", ""]) {
      expect(codeOf(() => selectPack([p1], bad))).toBe("INVALID_DATE");
    }
  });

  it("throws INVALID_DATE for a pack with a bad date", () => {
    const bad = pack("9", "2024/01/01", null);
    expect(codeOf(() => selectPack([bad], "2024-05-01"))).toBe(
      "INVALID_DATE",
    );
  });
});

describe("requireParam", () => {
  it("resolves an official param with its source", () => {
    const r = requireParam(p1, "rate");
    expect(r).toEqual({
      key: "rate",
      value: 5,
      status: "official",
      source: SRC,
      packId: "ae",
      packVersion: "1",
      overridden: false,
    });
  });

  it("refuses an unsourced param with detail.key", () => {
    expect.assertions(2);
    try {
      requireParam(p1, "cap");
    } catch (err) {
      expect((err as { code: string }).code).toBe("UNSOURCED_PARAM");
      expect((err as { detail: object }).detail).toMatchObject({
        key: "cap",
      });
    }
  });

  it("refuses an unsourced param even when it has a value", () => {
    expect(codeOf(() => requireParam(p1, "stale"))).toBe(
      "UNSOURCED_PARAM",
    );
  });

  it("resolves an unsourced param with an override", () => {
    const r = requireParam(p1, "cap", { cap: 100 });
    expect(r.value).toBe(100);
    expect(r.overridden).toBe(true);
    expect(r.status).toBe("unsourced");
  });

  it("allows an override on a sourced param", () => {
    const r = requireParam(p1, "rate", { rate: 9 });
    expect(r.value).toBe(9);
    expect(r.overridden).toBe(true);
    expect(r.source).toEqual(SRC);
  });

  it("throws MISSING_PARAM for an unknown key", () => {
    expect(codeOf(() => requireParam(p1, "nope"))).toBe("MISSING_PARAM");
  });

  it("throws MISSING_PARAM for prototype keys", () => {
    for (const key of ["constructor", "toString", "__proto__"]) {
      expect(codeOf(() => requireParam(p1, key))).toBe("MISSING_PARAM");
    }
  });

  it("ignores an inherited override key", () => {
    expect(
      codeOf(() => requireParam(p1, "cap", Object.create({ cap: 1 }))),
    ).toBe("UNSOURCED_PARAM");
  });
});
