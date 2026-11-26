/**
 * List to record motion. When a list row opens its record, the row's
 * face and name travel into the record's header (a shared-element view
 * transition, --dur-slow on --ease-in-out); going back runs
 * the same path the other way, to the same row, at the same scroll,
 * with the list's search and filter kept. Without the View Transitions
 * API, or with reduced motion, the page dissolves in over 120 ms.
 *
 * A dashboard tile or a Home card that opens a report grows into the
 * report (a container transform: the card's frame moves and resizes to
 * the report page while the card fades out and the report fades in,
 * each at its own size; `a[data-card]` inside a `[data-card-box]`;
 * Back shrinks the report into its card). A report
 * opened from the reports list takes its title along (the list row is
 * an `a[data-row]` too, and the report carries `[data-record-head]`).
 *
 * The seam is the hash change: the DOM still shows the old page when it
 * fires, so a click, Enter on a row, the back link and the browser's
 * Back button all take the same path.
 */

export const LIST_MS = 320;
export const FADE_MS = 120;
export const LIST_EASE = "cubic-bezier(0.4,0,0.2,1)";

const FACE = "list-face";
const NAME = "list-name";
const CARD = "list-card";

interface Transition {
  finished: Promise<void>;
  ready?: Promise<void>;
}
type Doc = Document & {
  startViewTransition?: (cb: () => Promise<void>) => Transition;
};

interface Parts {
  face: HTMLElement | null;
  name: HTMLElement | null;
  /** A card's frame, or the report head it grows into. */
  box?: HTMLElement | null;
}

type Kind = "row" | "card";

/** The last list-to-record trip, so Back can return along it. */
let trail: { list: string; record: string; kind: Kind } | null = null;
/** Scroll positions by list address. */
const scrolls = new Map<string, number>();

const hashOf = (url: string): string => {
  const i = url.indexOf("#");
  return i < 0 ? "" : url.slice(i);
};

const reduced = (): boolean => typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The deepest element under `root` whose text is exactly `text`. */
function exactText(root: HTMLElement, text: string): HTMLElement | null {
  let hit: HTMLElement | null = null;
  root.querySelectorAll<HTMLElement>("*").forEach((el) => {
    if (hit === null && el.childElementCount === 0 &&
      el.textContent?.trim() === text) hit = el;
  });
  return hit;
}

/** The tile or card that opens `record`. Only reports take a card
 * along (their head is where it lands). */
function cardParts(record: string): Parts | null {
  if (!record.startsWith("#/reports")) return null;
  const a = [...document.querySelectorAll<HTMLAnchorElement>(
    "a[data-card]")].find((x) => x.getAttribute("href") === record);
  if (a === undefined) return null;
  return { face: null, name: null,
    box: a.closest<HTMLElement>("[data-card-box]") ?? a };
}

/** The report a card grows into: the whole report page. */
function targetParts(): Parts | null {
  const page = document.querySelector<HTMLElement>("[data-record-head]");
  return page === null ? null : { face: null, name: null, box: page };
}

/** The source on the list side: a row, else a card. */
function sourceParts(record: string): { kind: Kind; parts: Parts } | null {
  const row = rowParts(record);
  if (row !== null) return { kind: "row", parts: row };
  const card = cardParts(record);
  return card === null ? null : { kind: "card", parts: card };
}

/** A list row's face and name, for the row that opens `record`. */
function rowParts(record: string): Parts | null {
  const row = [...document.querySelectorAll<HTMLAnchorElement>(
    "a[data-row]")].find((a) => a.getAttribute("href") === record);
  if (row === undefined) return null;
  const main = row.querySelector<HTMLElement>("[data-row-main]");
  const who = row.dataset["rowName"] ?? "";
  const name = main === null ? null
    : (who === "" ? null : exactText(main, who)) ?? main;
  return { face: row.querySelector<HTMLElement>("[data-face]"), name };
}

/** The record header's face and title. */
function recordParts(): Parts | null {
  const head = document.querySelector<HTMLElement>("[data-record-head]");
  if (head === null) return null;
  return { face: head.querySelector<HTMLElement>("[data-face]"),
    name: head.querySelector<HTMLElement>("h1") };
}

function nameParts(p: Parts | null): () => void {
  const set: HTMLElement[] = [];
  const put = (el: HTMLElement | null, name: string): void => {
    if (el === null) return;
    el.style.setProperty("view-transition-name", name);
    if (name === NAME) el.style.setProperty("inline-size", "fit-content");
    set.push(el);
  };
  put(p?.face ?? null, FACE);
  put(p?.name ?? null, NAME);
  put(p?.box ?? null, CARD);
  return () => set.forEach((el) => {
    el.style.removeProperty("view-transition-name");
    el.style.removeProperty("inline-size");
  });
}

/** Resolves once `find` returns parts (the record may still load). */
function until(find: () => Parts | null, ms = 400): Promise<Parts | null> {
  const end = performance.now() + ms;
  return new Promise((done) => {
    const tick = (): void => {
      const p = find();
      if ((p !== null && (p.name !== null || (p.box ?? null) !== null)) ||
        performance.now() > end) {
        done(p);
      } else requestAnimationFrame(tick);
    };
    tick();
  });
}

/** The 120 ms dissolve: the page's content fades in, nothing moves. */
function dissolve(): void {
  const main = document.querySelector("main");
  main?.animate([{ opacity: 0 }, { opacity: 1 }],
    { duration: FADE_MS, easing: "linear" });
}

/** The route listeners of one hash change, run as one change. */
let batch: { key: string; renders: (() => void)[]; done: boolean }
  | null = null;

/**
 * Runs a route change. `render` must commit the new page synchronously
 * (flushSync). Between a list and one of its records the change is
 * animated; anything else renders and goes to the top.
 *
 * Every hook that follows the route listens for the hash change (the
 * shell and each page head), so one change arrives several times in
 * the same task. The first one runs the change; the others join it
 * (they render with it, or at once if it has rendered already): two
 * view transitions in a row would cut the first one off mid-flight.
 */
export function changeRoute(oldUrl: string, render: () => void): void {
  const key = `${hashOf(oldUrl)}>${location.hash}`;
  if (batch !== null && batch.key === key) {
    if (batch.done) render();
    else batch.renders.push(render);
    return;
  }
  const mine = { key, renders: [render], done: false };
  batch = mine;
  setTimeout(() => {
    if (batch === mine) batch = null;
  }, 0);
  runRoute(oldUrl, () => {
    mine.done = true;
    mine.renders.forEach((r) => r());
  });
}

function runRoute(oldUrl: string, render: () => void): void {
  const from = hashOf(oldUrl);
  const to = location.hash;
  scrolls.set(from, scrollY);
  const src = sourceParts(to);
  const forward = src !== null;
  const kind: Kind = src?.kind ?? trail?.kind ?? "row";
  const dest = kind === "card" ? targetParts : recordParts;
  const list = (href: string): Parts | null =>
    kind === "card" ? cardParts(href) : rowParts(href);
  const back = !forward && trail !== null && trail.record === from &&
    trail.list === to && (kind === "card" || recordParts() !== null);
  if (!forward && !back) {
    render();
    scrollTo({ top: 0 });
    return;
  }
  if (forward) trail = { list: from, record: to, kind };
  const top = back ? scrolls.get(to) ?? 0 : 0;
  const swap = (): void => {
    render();
    scrollTo({ top, behavior: "instant" });
  };
  const doc = document as Doc;
  if (reduced() || typeof doc.startViewTransition !== "function") {
    swap();
    dissolve();
    return;
  }
  const html = document.documentElement;
  const old = forward ? src.parts : dest();
  const clearOld = nameParts(old);
  let clearNew = (): void => undefined;
  html.dataset["listMotion"] = back ? "back" : "open";
  const vt = doc.startViewTransition(async () => {
    clearOld();
    swap();
    // The list renders at once: look once (a decided row may have left
    // its filter). A record may still be loading: wait a moment for it.
    const parts = back ? list(from)
      : await until(dest, kind === "card" ? 240 : 400);
    // The name travels only into a title that carries it ("Rafiq
    // Hossain, 26 October"); otherwise only the face moves.
    const [row, rec] = back ? [parts, old] : [old, parts];
    const said = row?.name?.textContent?.trim() ?? "";
    const same = said !== "" &&
      (rec?.name?.textContent ?? "").includes(said);
    // A face travels only when both ends have one.
    const face = (row?.face ?? null) !== null &&
      (rec?.face ?? null) !== null;
    clearNew = nameParts(parts === null ? null
      : { face: face ? parts.face : null, name: same ? parts.name : null,
        box: parts.box ?? null });
  });
  // A transition skipped by the next one rejects `ready`; nothing waits.
  vt.ready?.catch(() => undefined);
  vt.finished.finally(() => {
    clearNew();
    delete html.dataset["listMotion"];
  }).catch(() => undefined);
}

/** The record opened last from a list: its row shows as selected. */
export function lastRecord(): string | null {
  return trail?.record ?? null;
}

/** A list's search and filter, kept while its records are open. */
const views = new Map<string, { q: string; seg: string }>();

export function savedView(): { q: string; seg: string } | undefined {
  return views.get(location.hash);
}

export function saveView(key: string, v: { q: string; seg: string }): void {
  views.set(key, v);
}
