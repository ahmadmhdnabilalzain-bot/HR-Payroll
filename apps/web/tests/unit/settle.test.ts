import { afterEach, describe, expect, it, vi } from "vitest";
import {
  finishAll,
  observerWatchdog,
  SETTLE_SLACK_MS,
  settleAfter,
} from "../../src/ui/settle";

/** An animation whose timeline never moves (a stalled tab). */
function stuck(state = "running"): Animation {
  const a = { playState: state, finish: vi.fn(() => {
    a.playState = "finished";
  }), cancel: vi.fn() };
  return a as unknown as Animation;
}

afterEach(() => vi.useRealTimers());

describe("motion never gates content", () => {
  it("finishes a stalled entrance after its length plus slack", () => {
    vi.useFakeTimers();
    const a = stuck();
    const done = stuck("finished");
    settleAfter([a, done], 300);
    vi.advanceTimersByTime(300 + SETTLE_SLACK_MS - 1);
    expect(a.finish).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(a.finish).toHaveBeenCalledOnce();
    expect(done.finish).not.toHaveBeenCalled();
  });

  it("cancels one that cannot finish", () => {
    const a = stuck();
    (a.finish as unknown as ReturnType<typeof vi.fn>)
      .mockImplementation(() => { throw new Error("infinite"); });
    finishAll([a]);
    expect(a.cancel).toHaveBeenCalledOnce();
  });

  it("an unmount stops the settle", () => {
    vi.useFakeTimers();
    const a = stuck();
    settleAfter([a], 100)();
    vi.advanceTimersByTime(5000);
    expect(a.finish).not.toHaveBeenCalled();
  });

  it("shows everything when the observer never calls back", () => {
    vi.useFakeTimers();
    const show = vi.fn();
    observerWatchdog(show, 1000);
    vi.advanceTimersByTime(1000);
    expect(show).toHaveBeenCalledOnce();
  });

  it("leaves a working observer in charge", () => {
    vi.useFakeTimers();
    const show = vi.fn();
    observerWatchdog(show, 1000).seen();
    vi.advanceTimersByTime(5000);
    expect(show).not.toHaveBeenCalled();
  });
});

describe("the veil rests transparent", () => {
  it("only its animation raises it", async () => {
    const { readFileSync } = await import("node:fs");
    const css = readFileSync(
      "src/ui/templates/motion.module.css", "utf8");
    const rule = /\[data-veil\]\)::after\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(rule).toMatch(/opacity:\s*0;/);
    expect(rule).toMatch(/pointer-events:\s*none;/);
  });
});
