import {
  isValidElement,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { reducedMotion } from "../../demo/motion";
import { useLocale } from "../../i18n/LocaleProvider";
import { Avatar } from "../Avatar";
import { tokenEase, tokenMs, useGlide } from "../glide";
import { StatusPill, type StatusTone } from "./StatusPill";
import { PageFoot } from "./PageFoot";
import { maskNode, useMaskText } from "../mask";
import { PageHead, type Crumb } from "./PageHead";
import s from "./templates.module.css";

export interface RecordStat {
  label: string;
  value: ReactNode;
}

export interface RecordTab {
  id: string;
  label: string;
  render(): ReactNode;
}

export interface RecordEvent {
  when: string;
  what: string;
}

const STATUS = /^(status|state)$/i;

/** A status as a pill: a dot and a word beside the title. */
function pillOf(v: ReactNode, tone: StatusTone): ReactNode {
  if (typeof v === "string") {
    return <StatusPill tone={tone} pill>{v}</StatusPill>;
  }
  if (isValidElement(v)) return <span className={s.pillWrap}>{v}</span>;
  return null;
}

/**
 * RT, record page: on desktop 8 columns of content (tabs, 44 px) and a
 * 4-column side panel: the summary figures, the next action (the
 * page's buttons, with a sentence), and the history. On phones the
 * panel comes first, under the title. A "Status" figure (or `status`)
 * becomes a pill beside the title: a dot and a word, not a figure.
 * Pass `tab` and `onTab` to drive the tab from the route.
 */
export function RecordTabs(p: {
  title: string;
  lede?: string;
  back?: { label: string; href: string };
  crumbs?: Crumb[];
  stats: RecordStat[];
  tabs: RecordTab[];
  tab?: string;
  onTab?(id: string): void;
  actions?: ReactNode;
  /** The record's state, beside the title. */
  status?: { word: string; tone: StatusTone };
  /** What happens next, in a sentence, above the actions. */
  next?: string;
  /** What happened so far, newest last. */
  history?: RecordEvent[];
  /** The person the record is about: their face before the title. */
  avatar?: { id: string; name: string } | undefined;
}) {
  const { t } = useLocale();
  const mask = useMaskText();
  const [own, setOwn] = useState(p.tabs[0]?.id ?? "");
  const at = p.tab ?? own;
  const current = p.tabs.find((x) => x.id === at) ?? p.tabs[0];
  const stat = p.stats.find((x) => STATUS.test(x.label));
  const badge = p.status !== undefined
    ? <StatusPill tone={p.status.tone} pill>{p.status.word}</StatusPill>
    : stat === undefined ? undefined : pillOf(stat.value, "neutral");
  const figures = p.stats.filter((x) => badge === undefined ||
    p.status !== undefined || x !== stat).slice(0, 3);
  const hasNext = p.next !== undefined || p.actions !== undefined;
  const hasPast = p.history !== undefined && p.history.length > 0;
  const side = figures.length > 0 || hasNext || hasPast;
  const panel = figures.length > 0 || hasNext;
  return (
    <div className={`${s.page} ${s.record}`} data-side={side}>
      <div className={s.recordHead} data-record-head="">
        <PageHead title={p.title} lede={p.lede} back={p.back}
          crumbs={p.crumbs} badge={badge} face={p.avatar === undefined
            ? undefined : <Avatar id={p.avatar.id} name={p.avatar.name}
              size="md" className={s.headFace} />} />
      </div>
      {panel && <aside className={s.aside} aria-label={t("tpl.summary")}>
        {figures.length > 0 && (
          <dl className={s.asideFigures}>
            {figures.map((x) => (
              <div key={x.label}>
                <dt>{x.label}</dt>
                <dd>{maskNode(mask, x.value)}</dd>
              </div>
            ))}
          </dl>
        )}
        {hasNext && (
          <section className={s.asideBlock} aria-label={t("tpl.next")}>
            {p.next !== undefined && <p className={s.nextText}>{p.next}</p>}
            {p.actions !== undefined && (
              <div className={s.asideActions}>{p.actions}</div>
            )}
          </section>
        )}
      </aside>}
      {hasPast && (
        <aside className={s.past} aria-label={t("tpl.history")}>
          <h2 className={s.asideTitle}>{t("tpl.history")}</h2>
          <ol className={s.timeline}>
            {p.history?.map((x, i) => (
              <li key={i}>
                <span>{x.what}</span>
                <small>{x.when}</small>
              </li>
            ))}
          </ol>
        </aside>
      )}
      <div className={s.recordMain}>
        {p.tabs.length === 1
          // One tab is not a choice: its content stands on its own.
          ? <div className={s.tabPanel}>{current?.render()}</div>
          : <Tabbed tabs={p.tabs} current={current}
            onTab={p.onTab ?? setOwn} />}
      </div>
      <PageFoot />
    </div>
  );
}

/** Whether the panel can move here (no: reduced motion, unit tests). */
const panelMoves = (): boolean => typeof Element !== "undefined" &&
  typeof Element.prototype.animate === "function" && !reducedMotion();

/**
 * The tab row and its panel. The underline glides (ui/glide.ts); the
 * panel goes with it: the old content slides 8 px against the way of
 * travel and fades out over --dur-fast, then the new one comes 8 px
 * from the way of travel and fades in over --dur-base. The panel's id
 * and label follow the chosen tab at once; only its content waits.
 * Without motion the content changes at once.
 */
function Tabbed(p: { tabs: RecordTab[]; current: RecordTab | undefined;
  onTab(id: string): void }) {
  const current = p.current;
  const row = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useGlide(row, "line");
  const [shownId, setShownId] = useState(current?.id);
  const moves = panelMoves();
  const shown = moves
    ? p.tabs.find((x) => x.id === shownId) ?? current : current;
  const want = useRef(current?.id);
  want.current = current?.id;
  const out = useRef<Animation | null>(null);
  const into = useRef<Animation | null>(null);
  const dir = useRef(0);
  const shownNow = useRef(shownId);
  shownNow.current = shownId;
  const bringIn = (): void => {
    const el = panel.current;
    const a = out.current;
    if (a === null || el === null) return;
    out.current = null;
    a.cancel();
    into.current = el.animate([
      { opacity: 0, transform: `translateX(${8 * dir.current}px)` },
      { opacity: 1, transform: "none" }],
    { duration: tokenMs("--dur-base", 200),
      easing: tokenEase("--ease-out", "cubic-bezier(0.2, 0, 0, 1)") });
  };
  const at = (id: string | undefined): number =>
    p.tabs.findIndex((x) => x.id === id);
  // The chosen tab changed: the old content leaves, then swaps.
  useLayoutEffect(() => {
    const el = panel.current;
    if (!moves || current?.id === shownId) return;
    if (el === null) {
      setShownId(current?.id);
      return;
    }
    if (out.current !== null) return; // already leaving: swaps to want
    into.current?.cancel();
    const rtl = getComputedStyle(el).direction === "rtl" ? -1 : 1;
    dir.current = Math.sign(at(current?.id) - at(shownId)) * rtl;
    const a = el.animate([{ opacity: 1, transform: "none" },
      { opacity: 0, transform: `translateX(${-8 * dir.current}px)` }],
    { duration: tokenMs("--dur-fast", 120), fill: "forwards",
      easing: tokenEase("--ease-in-out", "cubic-bezier(0.4, 0, 0.2, 1)") });
    out.current = a;
    // Back on the tab already shown: it simply comes back in.
    a.onfinish = () => want.current === shownNow.current ? bringIn()
      : setShownId(want.current);
  }, [current?.id, shownId, moves]);
  // The new content is in: it arrives, and the leaving fill goes.
  useLayoutEffect(bringIn, [shownId]);
  return (
    <>
      <div className={s.tabs} role="tablist" ref={row}>
        {p.tabs.map((x) => (
          <button key={x.id} type="button" role="tab" id={`tab-${x.id}`}
            aria-selected={x.id === current?.id}
            aria-controls={`tabpanel-${x.id}`}
            onClick={() => p.onTab(x.id)}>
            {x.label}
          </button>
        ))}
      </div>
      {current !== undefined && (
        <div role="tabpanel" id={`tabpanel-${current.id}`} ref={panel}
          aria-labelledby={`tab-${current.id}`} className={s.tabPanel}>
          {shown?.render()}
        </div>
      )}
    </>
  );
}

/** A two-column key-value grid (13 px labels, 15 px values). */
export function KeyValues(p: { items: { label: string; value: ReactNode }[] }) {
  const mask = useMaskText();
  return (
    <dl className={s.kv}>
      {p.items.map((x) => (
        <div key={x.label}>
          <dt>{x.label}</dt>
          <dd>{maskNode(mask, x.value)}</dd>
        </div>
      ))}
    </dl>
  );
}
