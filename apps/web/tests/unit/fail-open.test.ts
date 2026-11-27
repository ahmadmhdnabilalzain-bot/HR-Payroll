import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FAIL_OPEN_MS, onSeen } from "../../src/ui/seen";
import { tooSlow, GATE_FRAMES, GATE_SKIP } from "../../src/welcome/gate";
import { hasViewTransitions, isWebKit, safeTransition, TRANSITION_LIMIT_MS }
  from "../../src/ui/viewTransition";

/** The test's own stand-in for the API, shaped loosely on purpose. */
const doc = document as unknown as { startViewTransition?: unknown };
const never = (): Promise<never> => new Promise<never>(() => undefined);

describe("view transitions fail open", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => {
    delete doc.startViewTransition;
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("without-the-api-the-change-runs-at-once", async () => {
    const update = vi.fn();
    const end = vi.fn();
    expect(safeTransition(update, end)).toBe(false);
    expect(update).toHaveBeenCalledTimes(1);
    await vi.runAllTimersAsync();
    expect(end).toHaveBeenCalledTimes(1);
  });

  it("a-stalled-transition-is-skipped-and-cleared-at-the-cap", async () => {
    const skip = vi.fn();
    doc.startViewTransition = (cb: () => void) => {
      cb();
      return { finished: never(), ready: never(), skipTransition: skip };
    };
    const update = vi.fn();
    const end = vi.fn();
    expect(safeTransition(update, end)).toBe(true);
    await vi.advanceTimersByTimeAsync(TRANSITION_LIMIT_MS - 10);
    expect(end).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(20);
    expect(skip).toHaveBeenCalledTimes(1);
    expect(end).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("an-update-the-browser-never-runs-runs-at-the-cap", async () => {
    doc.startViewTransition = () => ({ finished: never() });
    const update = vi.fn();
    safeTransition(update);
    expect(update).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(TRANSITION_LIMIT_MS + 10);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("a-throw-from-the-browser-runs-the-change-plainly", () => {
    doc.startViewTransition = () => { throw new Error("InvalidState"); };
    const update = vi.fn();
    expect(safeTransition(update)).toBe(false);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("webkit-gets-none-unless-asked", () => {
    doc.startViewTransition = () => ({ finished: Promise.resolve() });
    expect(hasViewTransitions()).toBe(true);
    const ios = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) " +
      "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 " +
      "Mobile/15E148 Safari/604.1";
    vi.stubGlobal("navigator", { userAgent: ios, vendor: "Apple Computer, Inc." });
    expect(isWebKit()).toBe(true);
    expect(hasViewTransitions()).toBe(false);
    const edge = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" +
      " (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0";
    vi.stubGlobal("navigator", { userAgent: edge, vendor: "Google Inc." });
    expect(isWebKit()).toBe(false);
  });
});

describe("onSeen fails open", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("with-a-silent-observer-the-timer-checks-the-geometry", () => {
    vi.stubGlobal("IntersectionObserver", class {
      observe(): void { /* never reports */ }
      unobserve(): void { /* nothing */ }
      disconnect(): void { /* nothing */ }
    });
    const el = document.createElement("div");
    document.body.append(el);
    el.getBoundingClientRect = () => ({ top: 10, bottom: 50, left: 0,
      right: 100, width: 100, height: 40, x: 0, y: 10,
      toJSON: () => ({}) });
    const below = document.createElement("div");
    document.body.append(below);
    let top = 5000;
    below.getBoundingClientRect = () => ({ top, bottom: top + 40, left: 0,
      right: 100, width: 100, height: 40, x: 0, y: top,
      toJSON: () => ({}) });
    const cb = vi.fn();
    onSeen([el, below], cb);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(FAIL_OPEN_MS + 1);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(el);
    // Scrolled into view: a scroll anywhere wakes it.
    top = 100;
    document.dispatchEvent(new Event("scroll"));
    vi.advanceTimersByTime(150);
    expect(cb).toHaveBeenCalledTimes(2);
    el.remove();
    below.remove();
  });
});

describe("the opening's weak-graphics gate", () => {
  const gaps = (ms: number): number[] =>
    Array.from({ length: GATE_SKIP + GATE_FRAMES }, (_, i) =>
      i < GATE_SKIP ? 400 : ms);
  it("slow-frames-skip-fast-ones-play", () => {
    expect(tooSlow(gaps(55))).toBe(true);
    expect(tooSlow(gaps(17))).toBe(false);
    // Shader compiles in the first frames do not count.
    expect(tooSlow(gaps(20))).toBe(false);
    expect(tooSlow([60, 60])).toBe(false);
  });
});
