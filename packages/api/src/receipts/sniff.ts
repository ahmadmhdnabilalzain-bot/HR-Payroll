import type { ReceiptContentType } from "@payroll/contract";

const MAGIC: [ReceiptContentType, number[]][] = [
  ["image/jpeg", [0xff, 0xd8, 0xff]],
  ["image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  ["application/pdf", [0x25, 0x50, 0x44, 0x46, 0x2d]],
];

/**
 * The file type from its first bytes, or null. The declared type is
 * never trusted: HTML, SVG, GIF, HEIC and anything else give null.
 */
export function sniffContentType(b: Uint8Array): ReceiptContentType | null {
  for (const [type, magic] of MAGIC) {
    if (b.length > magic.length && magic.every((x, i) => b[i] === x)) {
      return type;
    }
  }
  return null;
}
