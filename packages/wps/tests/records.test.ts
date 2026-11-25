import { EngineError, fils } from "@payroll/engine";
import { describe, expect, it } from "vitest";
import { defaultLayout as L } from "../src/layout";
import {
  edrLine,
  evpLine,
  scrLine,
  type EdrInput,
  type EvpInput,
  type ScrInput,
} from "../src/records";

const edr: EdrInput = {
  personId: "915012345663",
  routingCode: "802420101",
  account: "AE160240043520123456701",
  payStart: "2016-01-01",
  payEnd: "2016-01-31",
  days: 31,
  fixed: fils(400000n),
  variable: fils(250000n),
  unpaidLeaveDays: 0,
};
const evp: EvpInput = {
  personId: "915012345663",
  routingCode: "802420101",
  housing: fils(50000n),
  conveyance: fils(20000n),
  medical: fils(30000n),
  passage: fils(0n),
  overtime: fils(40000n),
  otherAllowances: fils(110000n),
  leaveEncashment: fils(0n),
};
const scr: ScrInput = {
  employerId: "123456",
  bankRoutingCode: "802420101",
  createdDate: "2016-01-26",
  createdTime: "1130",
  month: "012016",
  edrCount: 1,
  total: fils(650000n),
  reference: "abc company",
};

type Got = { code: string; value: string | undefined };

function codeOf(fn: () => unknown): Got {
  try {
    fn();
  } catch (e) {
    const err = e as EngineError;
    return { code: err.code, value: err.detail.value };
  }
  return { code: "NONE", value: undefined };
}

describe("record builders", () => {
  it("builds the DIB sample EDR", () => {
    expect(edrLine(edr, L)).toBe(
      "EDR,00915012345663,802420101,AE160240043520123456701," +
        "2016-01-01,2016-01-31,31,4000.00,2500.00,0",
    );
  });
  it("builds the DIB sample EVP", () => {
    expect(evpLine(evp, L)).toBe(
      "EVP,00915012345663,802420101,500.00,200.00,300.00,0.00," +
        "400.00,1100.00,0.00",
    );
  });
  it("builds the DIB sample SCR with unpadded count", () => {
    expect(scrLine(scr, L)).toBe(
      "SCR,0000000123456,802420101,2016-01-26,1130,012016,1,6500.00," +
        "AED,abc company",
    );
  });
  it("leaves the reference empty when absent", () => {
    const { reference: _r, ...rest } = scr;
    expect(scrLine(rest, L).endsWith(",AED,")).toBe(true);
  });
});

describe("field rules", () => {
  it("rejects a comma in the reference", () => {
    const r = codeOf(() => scrLine({ ...scr, reference: "a,b" }, L));
    expect(r).toEqual({ code: "FIELD_HAS_COMMA", value: "a,b" });
  });
  it("rejects non-ASCII text", () => {
    const r = codeOf(() => scrLine({ ...scr, reference: "شركة" }, L));
    expect(r).toEqual({ code: "FIELD_NOT_ASCII", value: "شركة" });
  });
  it("rejects control characters such as newlines", () => {
    for (const bad of ["a\nb", "a\r\nEDR", "a\tb", "a\x00b"]) {
      expect(
        codeOf(() => scrLine({ ...scr, reference: bad }, L)),
      ).toEqual({ code: "FIELD_NOT_ASCII", value: bad });
    }
  });
  it("checks comma, then ASCII, then length", () => {
    const both = "شركة,x";
    const ref = (r: string) =>
      codeOf(() => scrLine({ ...scr, reference: r }, L));
    expect(ref(both).code).toBe("FIELD_HAS_COMMA");
    expect(ref("ش".repeat(40)).code).toBe("FIELD_NOT_ASCII");
  });
  it("rejects counts that are not whole numbers >= 0", () => {
    for (const n of [-1, 1.5, NaN]) {
      const want = { code: "INVALID_COUNT", value: String(n) };
      expect(codeOf(() => edrLine({ ...edr, days: n }, L))).toEqual(want);
      expect(
        codeOf(() => edrLine({ ...edr, unpaidLeaveDays: n }, L)),
      ).toEqual(want);
      expect(codeOf(() => scrLine({ ...scr, edrCount: n }, L))).toEqual(want);
    }
  });
  it("rejects a reference over 35 characters", () => {
    const long = "x".repeat(36);
    const r = codeOf(() => scrLine({ ...scr, reference: long }, L));
    expect(r).toEqual({ code: "FIELD_TOO_LONG", value: long });
  });
  it("accepts a 35 character reference", () => {
    expect(() =>
      scrLine({ ...scr, reference: "x".repeat(35) }, L),
    ).not.toThrow();
  });
  it("rejects a comma in the account", () => {
    const bad = "AE,60240043520123456701";
    const r = codeOf(() => edrLine({ ...edr, account: bad }, L));
    expect(r.code).toBe("FIELD_HAS_COMMA");
  });
  it("requires the exact account length", () => {
    const short = "AE1602400435201234567";
    expect(codeOf(() => edrLine({ ...edr, account: short }, L))).toEqual({
      code: "ACCOUNT_LENGTH",
      value: short,
    });
    const long = edr.account + "0";
    expect(codeOf(() => edrLine({ ...edr, account: long }, L)).code).toBe(
      "ACCOUNT_LENGTH",
    );
  });
  it("requires 9 digit routing codes", () => {
    expect(
      codeOf(() => edrLine({ ...edr, routingCode: "80242010" }, L)),
    ).toEqual({ code: "ROUTING_FORMAT", value: "80242010" });
    expect(
      codeOf(() => evpLine({ ...evp, routingCode: "80242010X" }, L)).code,
    ).toBe("ROUTING_FORMAT");
    expect(
      codeOf(() => scrLine({ ...scr, bankRoutingCode: "1234" }, L)).code,
    ).toBe("ROUTING_FORMAT");
  });
  it("requires digit-only ids", () => {
    expect(
      codeOf(() => edrLine({ ...edr, personId: "9150A2345663" }, L)),
    ).toEqual({ code: "ID_FORMAT", value: "9150A2345663" });
    expect(
      codeOf(() => scrLine({ ...scr, employerId: "12 456" }, L)).code,
    ).toBe("ID_FORMAT");
  });
  it("propagates id length and negative amount errors", () => {
    expect(
      codeOf(() => edrLine({ ...edr, personId: "1".repeat(15) }, L)).code,
    ).toBe("ID_TOO_LONG");
    expect(
      codeOf(() => edrLine({ ...edr, fixed: fils(-1n) }, L)).code,
    ).toBe("NEGATIVE_AMOUNT");
  });
});
