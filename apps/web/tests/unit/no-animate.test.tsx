// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { App } from "../../src/App";
import { loadDemoSource } from "../../src/demo/data/load";
import { loadRunSource } from "../../src/demo/data/run-load";
import { DemoProvider } from "../../src/demo/state";
import { LocaleProvider } from "../../src/i18n/LocaleProvider";
import { ThemeProvider } from "../../src/theme/ThemeProvider";
import { safeAnimate, safeGetAnimations } from "../../src/ui/safeAnimate";
import { ToastProvider } from "../../src/ui/Toast";

/**
 * Without Element.animate the app must still draw (it used to go
 * white: "t.animate is not a function"). Every call goes through
 * ui/safeAnimate.ts; this file checks both.
 */
const SRC = join(__dirname, "../../src");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p)
      : /\.tsx?$/.test(n) ? [p] : [];
  });
}

describe("no animate call outside safeAnimate", () => {
  it("finds-none-even-split-across-lines", () => {
    const bad = files(SRC).filter((p) => !p.endsWith("safeAnimate.ts"))
      .flatMap((p) => {
        const code = readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/\/\/.*$/gm, "");
        return /\.\s*(animate|getAnimations)\s*\(/.test(code) ? [p] : [];
      });
    expect(bad).toEqual([]);
  });
});

describe("the stand-in when the API is missing", () => {
  it("is-finished-and-runs-finish-handlers-once", async () => {
    const el = document.createElement("div");
    const a = safeAnimate(el, [{ opacity: 0 }, { opacity: 1 }], 200);
    await expect(a.finished).resolves.toBe(a);
    expect(() => {
      a.cancel();
      a.commitStyles();
    }).not.toThrow();
    const onfinish = vi.fn();
    const listener = vi.fn();
    a.onfinish = onfinish;
    a.addEventListener("finish", listener);
    await Promise.resolve();
    expect(onfinish).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(safeAnimate(null, []).playState).toBe("finished");
    expect(safeGetAnimations(el)).toEqual([]);
  });

  it("passes-through-when-the-browser-has-it", () => {
    const el = document.createElement("div");
    const real = { finished: Promise.resolve() };
    (el as unknown as { animate: unknown }).animate = vi.fn(() => real);
    expect(safeAnimate(el, [], 1)).toBe(real);
    (el as unknown as { animate: unknown }).animate = () => {
      throw new Error("pseudo-element refused");
    };
    expect(safeAnimate(el, [], 1).playState).toBe("finished");
  });
});

describe("Home and Reports draw with Element.animate removed", () => {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  const saved = { animate: proto["animate"],
    getAnimations: proto["getAnimations"] };
  beforeAll(() => {
    delete proto["animate"];
    delete proto["getAnimations"];
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q,
      onchange: null, addListener: () => undefined,
      removeListener: () => undefined, addEventListener: () => undefined,
      removeEventListener: () => undefined, dispatchEvent: () => false }));
    class Observer {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
      takeRecords(): [] {
        return [];
      }
    }
    vi.stubGlobal("IntersectionObserver", Observer);
    vi.stubGlobal("ResizeObserver", Observer);
    vi.stubGlobal("scrollTo", () => undefined);
    localStorage.setItem("opening", "seen");
  });
  afterAll(() => {
    cleanup();
    vi.unstubAllGlobals();
    Object.assign(proto, saved);
  });

  const draw = async (hash: string, name: RegExp): Promise<unknown[]> => {
    location.hash = hash;
    const [source] = await Promise.all([loadDemoSource(), loadRunSource()]);
    const errors: unknown[] = [];
    const onError = (e: ErrorEvent): void => {
      errors.push(e.error);
    };
    addEventListener("error", onError);
    render(
      <LocaleProvider>
        <ThemeProvider>
          <DemoProvider source={source}>
            <ToastProvider>
              <App />
            </ToastProvider>
          </DemoProvider>
        </ThemeProvider>
      </LocaleProvider>);
    expect(await screen.findByRole("heading", { level: 1, name }, {
      timeout: 10000 })).toBeTruthy();
    // Let the entrance motion and its clean-up run.
    await act(() => new Promise((r) => setTimeout(r, 300)));
    removeEventListener("error", onError);
    cleanup();
    return errors;
  };

  it("renders-home", async () => {
    expect(typeof (document.body as unknown as { animate?: unknown })
      .animate).toBe("undefined");
    expect(await draw("#/home", /./)).toEqual([]);
  }, 30000);

  it("renders-reports", async () => {
    expect(await draw("#/reports/summary", /^Payroll summary$/))
      .toEqual([]);
    expect(await draw("#/reports", /^Reports$/)).toEqual([]);
  }, 30000);
});
