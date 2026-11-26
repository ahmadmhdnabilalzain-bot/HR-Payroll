import { describe, expect, it } from "vitest";
import { nameForType, safeFileName } from "../src/files/names";
import { seedCompany } from "./helpers/seed";
import { call, callBytes, makeApp, upload } from "./helpers/test-app";

/** Review I-1: the saved file's extension always matches its bytes. */
describe("file names follow the sniffed type", () => {
  it("replaces or adds the extension", () => {
    expect(nameForType("visa.html", "application/pdf")).toBe("visa.pdf");
    expect(nameForType("visa.hta", "application/pdf")).toBe("visa.pdf");
    expect(nameForType("scan", "image/png")).toBe("scan.png");
    expect(nameForType("photo.JPEG", "image/jpeg")).toBe("photo.jpg");
    expect(nameForType("a.tar.gz", "application/pdf")).toBe("a.tar.pdf");
    expect(nameForType(".html", "application/pdf")).toBe("file.pdf");
    expect([...nameForType("x".repeat(200), "image/png")].length)
      .toBeLessThanOrEqual(200);
  });
  it("strips bidi controls from names", () => {
    expect(safeFileName("invoice\u202efdp.exe")).toBe("invoicefdp.exe");
    for (const c of ["\u200e", "\u200f", "\u202a", "\u202b", "\u202c",
      "\u202d", "\u2066", "\u2067", "\u2068", "\u2069"]) {
      expect(safeFileName(`a${c}b.pdf`)).toBe("ab.pdf");
    }
  });
  it("a PDF polyglot named .html is stored and served as .pdf",
    async () => {
      const ctx = await makeApp({ start: "2026-11-26T08:00:00.000Z" });
      const s = await seedCompany(ctx, "r1");
      const bytes = new TextEncoder().encode(
        "%PDF-1.4\n<html><script>alert(1)</script></html>");
      const f = await upload(ctx.app, s.employee.token, s.companyId,
        "visa.html", bytes);
      expect(f.name).toBe("visa.pdf");
      const d = await call(ctx.app, s.employee.token, s.companyId, "POST",
        `/v1/employees/${s.emp.report}/documents`, { type: "visa",
          expiryDate: "2030-01-01", fileId: f.id });
      expect(d.status, d.text).toBe(201);
      const r = await callBytes(ctx.app, s.hr.token, s.companyId,
        `/v1/employee-documents/${d.body.id}/versions/` +
        `${d.body.current.id}/download`);
      expect(r.headers.get("content-disposition"))
        .toBe("attachment; filename=\"visa.pdf\"");
    });
});
