import { afterEach, describe, expect, it, vi } from "vitest";
import { copyLink, shareReport, sheetShare }
  from "../../src/ui/templates/reportPdf";

/** Report pages: Share is a real "Copy link" on a laptop. */
const coarse = (on: boolean): void => {
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: on &&
    q.includes("coarse"), media: q, addEventListener: () => undefined,
  removeEventListener: () => undefined }));
};

describe("copy link", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("copies-the-address-with-the-clipboard", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    coarse(false);
    expect(await shareReport("Payroll summary")).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(location.href);
  });

  it("falls-back-to-a-hidden-box-when-the-clipboard-refuses", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: () =>
      Promise.reject(new Error("denied")) } });
    const exec = vi.fn(() => true);
    Object.defineProperty(document, "execCommand", { value: exec,
      configurable: true });
    expect(await copyLink("https://demo.test/#/reports/files")).toBe(true);
    expect(exec).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("says-so-when-nothing-can-copy", async () => {
    vi.stubGlobal("navigator", {});
    Object.defineProperty(document, "execCommand", { value: () => false,
      configurable: true });
    coarse(false);
    expect(await shareReport("Payroll summary")).toBe("none");
  });

  it("uses-the-share-sheet-only-on-touch", async () => {
    const share = vi.fn(() => Promise.resolve());
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { share, clipboard: { writeText } });
    coarse(false);
    expect(sheetShare()).toBe(false);
    expect(await shareReport("Payroll summary")).toBe("copied");
    expect(share).not.toHaveBeenCalled();
    coarse(true);
    expect(sheetShare()).toBe(true);
    expect(await shareReport("Payroll summary")).toBe("shared");
    expect(share).toHaveBeenCalledTimes(1);
  });
});
