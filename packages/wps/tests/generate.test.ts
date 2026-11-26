import { EngineError, fils, parseAed } from "@payroll/engine";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { sifFileName } from "../src/filename";
import { generateSif, type SifBatch, type SifEmployee } from "../src/generate";
import { defaultLayout as L } from "../src/layout";
import type { EdrInput, EvpInput } from "../src/records";

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
const batch: SifBatch = {
  employerId: "123456",
  bankRoutingCode: "802420101",
  createdDate: "2016-01-26",
  createdTime: "113000",
  month: { year: 2016, month: 1 },
  reference: "abc company",
  employees: [{ edr, evp }],
};

function codeOf(b: SifBatch): string {
  try {
    generateSif(b, L);
  } catch (e) {
    if (e instanceof EngineError) return e.code;
    throw e;
  }
  return "NONE";
}
const withEdr = (o: Partial<EdrInput>): SifBatch => ({
  ...batch,
  employees: [{ edr: { ...edr, ...o }, evp }],
});

describe("generateSif", () => {
  it("produces the DIB sample lines with SCR last", () => {
    const r = generateSif(batch, L);
    expect(r.lines).toEqual([
      "EDR,00915012345663,802420101,AE160240043520123456701," +
        "2016-01-01,2016-01-31,31,4000.00,2500.00,0",
      "EVP,00915012345663,802420101,500.00,200.00,300.00,0.00,400.00," +
        "1100.00,0.00",
      "SCR,0000000123456,802420101,2016-01-26,1130,012016,1,6500.00," +
        "AED,abc company",
    ]);
    expect(r.text).toBe(r.lines.join("\r\n") + "\r\n");
    expect(r.total).toBe(650000n);
    expect(r.fileName).toBe("0000000123456160126113000.SIF");
  });
  it("emits no EVP when variable is zero", () => {
    const b: SifBatch = {
      ...batch,
      employees: [{ edr: { ...edr, variable: fils(0n) } }],
    };
    const r = generateSif(b, L);
    expect(r.lines.map((l) => l.slice(0, 3))).toEqual(["EDR", "SCR"]);
    expect(r.total).toBe(400000n);
  });
  it("rejects variable pay without an EVP (EVP_REQUIRED)", () => {
    const b: SifBatch = { ...batch, employees: [{ edr }] };
    expect(codeOf(b)).toBe("EVP_REQUIRED");
  });
  it("rejects an EVP when variable is zero", () => {
    const b: SifBatch = {
      ...batch,
      employees: [{ edr: { ...edr, variable: fils(0n) }, evp }],
    };
    expect(codeOf(b)).toBe("EVP_WITHOUT_VARIABLE");
  });
  it("rejects an EVP for another person", () => {
    const other = { ...evp, personId: "915012345664" };
    const b: SifBatch = { ...batch, employees: [{ edr, evp: other }] };
    expect(codeOf(b)).toBe("EVP_MISMATCH");
  });
  it("a layout with a smaller reference cap makes the SCR throw", () => {
    const small = { ...L, referenceMaxLength: 5 };
    expect(() => generateSif(batch, small)).toThrowError(
      expect.objectContaining({ code: "FIELD_TOO_LONG" }));
    expect(generateSif({ ...batch, reference: "abcde" }, small).lines)
      .toHaveLength(3);
  });
  it("rejects an empty batch", () => {
    expect(codeOf({ ...batch, employees: [] })).toBe("EMPTY_BATCH");
  });
  it("rejects two EDRs for one person", () => {
    const b: SifBatch = {
      ...batch,
      employees: [
        { edr, evp },
        { edr: { ...edr, personId: "0" + edr.personId } },
      ],
    };
    expect(codeOf(b)).toBe("DUPLICATE_EMPLOYEE");
  });
  it("rejects pay dates outside the batch month", () => {
    expect(codeOf(withEdr({ payEnd: "2016-02-01", days: 32 }))).toBe(
      "PAY_PERIOD_MONTH_MISMATCH",
    );
    expect(codeOf(withEdr({ payStart: "2015-12-31", days: 32 }))).toBe(
      "PAY_PERIOD_MONTH_MISMATCH",
    );
  });
  it("rejects wrong day counts", () => {
    expect(codeOf(withEdr({ days: 30 }))).toBe("DAYS_MISMATCH");
    expect(codeOf(withEdr({ payStart: "2016-01-31", payEnd: "2016-01-01" })))
      .toBe("PAY_END_BEFORE_START");
  });
  it("rejects pay end the day before pay start with days 0", () => {
    const b = withEdr({ payStart: "2016-01-02", payEnd: "2016-01-01",
      days: 0, unpaidLeaveDays: 99 });
    expect(codeOf(b)).toBe("PAY_END_BEFORE_START");
  });
  it("rejects a pay start before 2010-10-01", () => {
    const b: SifBatch = {
      ...batch,
      month: { year: 2010, month: 9 },
      employees: [
        {
          edr: {
            ...edr,
            payStart: "2010-09-01",
            payEnd: "2010-09-30",
            days: 30,
            variable: fils(0n),
          },
        },
      ],
    };
    expect(codeOf(b)).toBe("PAY_START_TOO_EARLY");
  });
  it("propagates field errors and returns nothing", () => {
    const later: SifBatch = {
      ...batch,
      employees: [
        { edr: { ...edr, personId: "1" } },
        { edr: { ...edr, personId: "2", account: "AE,1" } },
      ],
    };
    let result: unknown;
    expect(() => {
      result = generateSif(later, L);
    }).toThrow(EngineError);
    expect(result).toBeUndefined();
    expect(codeOf(withEdr({ account: "AE,1" }))).toBe("ACCOUNT_LENGTH");
  });
  it("writes an EDR with zero amounts", () => {
    const zero = withEdr({ fixed: fils(0n), variable: fils(0n) });
    const r = generateSif(
      { ...zero, employees: [{ edr: { ...edr, fixed: fils(0n),
        variable: fils(0n) } }] },
      L,
    );
    expect(r.lines[0]).toContain(",31,0.00,0.00,0");
    expect(r.total).toBe(0n);
  });
  it("rejects a comma or Arabic text in the reference", () => {
    expect(codeOf({ ...batch, reference: "a,b" })).toBe("FIELD_HAS_COMMA");
    expect(codeOf({ ...batch, reference: "\u0634\u0631\u0643\u0629" }))
      .toBe("FIELD_NOT_ASCII");
  });
  it("accepts month-end periods in leap and century years", () => {
    const mk = (y: number, end: number): SifBatch => ({
      ...batch,
      month: { year: y, month: 2 },
      employees: [{ edr: { ...edr, payStart: `${y}-02-01`,
        payEnd: `${y}-02-${end}`, days: end, variable: fils(0n) } }],
    });
    expect(generateSif(mk(2016, 29), L).lines).toHaveLength(2);
    expect(generateSif(mk(2100, 28), L).lines).toHaveLength(2);
    expect(codeOf(mk(2100, 29))).toBe("INVALID_DATE");
  });
  it("rejects a bad created time", () => {
    expect(codeOf({ ...batch, createdTime: "1130" })).toBe("INVALID_TIME");
  });
  it("rejects an invalid pay date", () => {
    expect(codeOf(withEdr({ payStart: "2016-13-01" }))).toBe("INVALID_DATE");
  });
});

describe("sifFileName", () => {
  it("pads the employer id and uses YYMMDD and HHMMSS", () => {
    expect(sifFileName("965625", "2009-10-25", "163000", L)).toBe(
      "0000000965625091025163000.SIF",
    );
  });
});

describe("sifFileName year", () => {
  it("uses 00 for year 2000", () => {
    expect(sifFileName("1", "2000-01-02", "000000", L)).toBe(
      "0000000000001000102000000.SIF",
    );
  });
});

describe("total property", () => {
  it("SCR total text equals the exact bigint sum", () => {
    const amt = fc.bigInt({ min: 0n, max: 10_000_000n });
    const emp = fc.record({ fixed: amt, variable: amt });
    fc.assert(
      fc.property(fc.array(emp, { minLength: 1, maxLength: 200 }), (xs) => {
        const employees = xs.map((x, i): SifEmployee => {
          const personId = String(i + 1);
          const e = {
            ...edr,
            personId,
            fixed: fils(x.fixed),
            variable: fils(x.variable),
          };
          return x.variable === 0n
            ? { edr: e }
            : { edr: e, evp: { ...evp, personId, housing: e.variable } };
        });
        const r = generateSif({ ...batch, employees }, L);
        const sum = xs.reduce((s, x) => s + x.fixed + x.variable, 0n);
        const scr = r.lines[r.lines.length - 1]!.split(",");
        expect(r.total).toBe(sum);
        expect(parseAed(scr[7]!)).toBe(sum);
        expect(scr[6]).toBe(String(xs.length));
      }),
    );
  });
});
