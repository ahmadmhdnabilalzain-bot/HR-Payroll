import { describe, expect, it } from "vitest";
import { sniffContentType } from "../src/receipts/sniff";

const bytes = (...b: number[]) => new Uint8Array(b);
const text = (s: string) => new TextEncoder().encode(s);

describe("sniffContentType", () => {
  it("knows the three magic prefixes", () => {
    expect(sniffContentType(bytes(0xff, 0xd8, 0xff, 0xe0, 0)))
      .toBe("image/jpeg");
    expect(sniffContentType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a,
      0x1a, 0x0a, 0))).toBe("image/png");
    expect(sniffContentType(text("%PDF-1.7\n"))).toBe("application/pdf");
  });
  it("refuses HTML, empty input, GIF and short prefixes", () => {
    expect(sniffContentType(text("<html><script>alert(1)</script>")))
      .toBeNull();
    expect(sniffContentType(new Uint8Array(0))).toBeNull();
    expect(sniffContentType(text("GIF89a"))).toBeNull();
    expect(sniffContentType(bytes(0x89, 0x50, 0x4e, 0x47))).toBeNull();
    expect(sniffContentType(text("%PDF"))).toBeNull();
  });
});
