import { loadReportsSource } from "../reports/load";
import { loadRunSource } from "./data/run-load";
import { loadLiveExplain } from "./live-explain-load";

/**
 * Chunks a first click would otherwise wait for. A report or the pay
 * run suspends on its data the first time; React then holds the
 * revealed page for about 300 ms, and inside the route transition
 * nothing paints meanwhile (audit 2, item 9: Variance and Executive
 * answered after about 400 ms). Loaded ahead, the promise is already
 * marked fulfilled and the page renders in the same frame.
 *
 * - Idle: one loader per idle slot, once the opening has ended; last,
 *   the run detail before any IBAN is entered (cached by the source).
 * - Intent: a pointer over, a touch on or focus on a link to a report
 *   or the pay run loads what it needs at once.
 * Each loader runs once (the loaders cache their promise).
 */
const IDLE: (() => unknown)[] = [loadLiveExplain, loadReportsSource,
  // The run as first opened (no IBANs entered yet), worked out once.
  () => loadRunSource().then((x) => x.at({}))];

const LINKS: { prefix: string; load: (() => unknown)[] }[] = [
  { prefix: "#/reports", load: [loadReportsSource, loadLiveExplain] },
  { prefix: "#/pay-run", load: [loadLiveExplain] },
];

type Idle = (cb: () => void, o?: { timeout: number }) => number;

const whenIdle = (cb: () => void): void => {
  const ric = (globalThis as { requestIdleCallback?: Idle })
    .requestIdleCallback;
  if (typeof ric === "function") ric(cb, { timeout: 2000 });
  else setTimeout(cb, 200);
};

let started = false;

/** Starts the idle chain and the link listeners (once per page). */
export function startPrefetch(): void {
  if (started || typeof document === "undefined") return;
  started = true;
  const queue = [...IDLE];
  const next = (): void => {
    const load = queue.shift();
    if (load === undefined) return;
    void Promise.resolve(load()).catch(() => undefined)
      .finally(() => whenIdle(next));
  };
  whenIdle(next);
  const intent = (e: Event): void => {
    const a = (e.target as Element | null)?.closest?.("a[href]");
    const href = a?.getAttribute("href") ?? "";
    for (const x of LINKS) {
      if (href.startsWith(x.prefix)) x.load.forEach((f) => void f());
    }
  };
  const opts = { capture: true, passive: true };
  for (const ev of ["pointerover", "touchstart", "focusin"]) {
    document.addEventListener(ev, intent, opts);
  }
}
