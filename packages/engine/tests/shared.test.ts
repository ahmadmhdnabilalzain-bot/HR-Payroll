import { describe, expect, it } from "vitest";
import { EngineError } from "../src/errors";
import { SOURCES, sourceOf } from "../src/sources";

describe("EngineError", () => {
  it("keeps code, message and detail", () => {
    const err = new EngineError("X", "m", { k: "v" });
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe("X");
    expect(err.message).toBe("m");
    expect(err.detail).toEqual({ k: "v" });
  });
});

describe("sources", () => {
  it("throws UNKNOWN_SOURCE for an unknown id", () => {
    expect(() => sourceOf("NOPE")).toThrowError(
      expect.objectContaining({ code: "UNKNOWN_SOURCE" }),
    );
  });

  it("reports the offending id in detail", () => {
    expect.assertions(2);
    try {
      sourceOf("NOPE");
    } catch (err) {
      expect(err).toBeInstanceOf(EngineError);
      expect((err as EngineError).detail).toEqual({ id: "NOPE" });
    }
  });

  it.each(["constructor", "toString", "__proto__"])(
    "rejects inherited member %s",
    (id) => {
      expect.assertions(3);
      try {
        sourceOf(id);
      } catch (err) {
        expect(err).toBeInstanceOf(EngineError);
        expect((err as EngineError).code).toBe("UNKNOWN_SOURCE");
        expect((err as EngineError).detail).toEqual({ id });
      }
    },
  );

  it("gives every source a non-empty note", () => {
    for (const source of Object.values(SOURCES)) {
      expect(source.note.length).toBeGreaterThan(0);
    }
  });

  it("points the law source at uaelegislation.gov.ae", () => {
    const url = sourceOf("LAW_33_2021").url;
    expect(url.startsWith("https://uaelegislation.gov.ae")).toBe(true);
  });
});
