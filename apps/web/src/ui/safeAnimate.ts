/**
 * Every Web Animation in the app goes through here. A browser without
 * Element.animate (old engines, some test and kiosk shells) or one
 * that refuses a call gets a finished stand-in instead of a white
 * screen: the element simply shows in its final CSS state. The
 * stand-in says it has finished: `finished` is resolved, and a finish
 * handler or listener added to it runs once, on the next microtask, so
 * clean-up code (clones, overlays) still runs. A test checks no
 * `.animate(` call is left outside this file.
 */

type Handler = ((this: Animation, ev: AnimationPlaybackEvent) => unknown)
  | null;

class Done {
  readonly finished: Promise<Done> = Promise.resolve(this);
  readonly ready: Promise<Done> = Promise.resolve(this);
  readonly playState = "finished";
  readonly pending = false;
  readonly effect = null;
  readonly id = "";
  currentTime = null;
  playbackRate = 1;
  private finishHandler: Handler = null;
  oncancel: Handler = null;
  onremove: Handler = null;
  get onfinish(): Handler {
    return this.finishHandler;
  }
  set onfinish(fn: Handler) {
    this.finishHandler = fn;
    if (fn !== null) this.later(() => fn.call(this.self(), this.event()));
  }
  cancel(): void {}
  commitStyles(): void {}
  finish(): void {}
  pause(): void {}
  play(): void {}
  persist(): void {}
  reverse(): void {}
  updatePlaybackRate(): void {}
  addEventListener(type: string, fn: EventListenerOrEventListenerObject)
    : void {
    if (type !== "finish") return;
    this.later(() => typeof fn === "function" ? fn(this.event())
      : fn.handleEvent(this.event()));
  }
  removeEventListener(): void {}
  dispatchEvent(): boolean {
    return true;
  }
  private later(fn: () => void): void {
    queueMicrotask(() => {
      try {
        fn();
      } catch {
        // A handler's own error is not the animation's.
      }
    });
  }
  private self(): Animation {
    return this as unknown as Animation;
  }
  private event(): AnimationPlaybackEvent {
    return { type: "finish", currentTime: null, timelineTime: null,
      target: this } as unknown as AnimationPlaybackEvent;
  }
}

/** An animation that has already finished (nothing moves). */
export function doneAnimation(): Animation {
  return new Done() as unknown as Animation;
}

/** Whether this browser has Web Animations at all. */
export function canAnimate(): boolean {
  return typeof Element !== "undefined" &&
    typeof Element.prototype.animate === "function";
}

/** el.animate(...), or a finished stand-in when it cannot run. */
export function safeAnimate(el: Element | null | undefined,
  keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
  options?: number | KeyframeAnimationOptions): Animation {
  if (el === null || el === undefined ||
    typeof (el as { animate?: unknown }).animate !== "function") {
    return doneAnimation();
  }
  try {
    return el.animate(keyframes, options);
  } catch {
    return doneAnimation();
  }
}

/** el.getAnimations(...), or none where the API is missing. */
export function safeGetAnimations(el: Element | Document | null | undefined,
  options?: GetAnimationsOptions): Animation[] {
  if (el === null || el === undefined ||
    typeof (el as { getAnimations?: unknown }).getAnimations !== "function") {
    return [];
  }
  return el instanceof Document ? el.getAnimations()
    : el.getAnimations(options);
}
