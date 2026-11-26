import { isValidElement, useRef, useState, type ReactNode }
  from "react";
import { useLocale } from "../../i18n/LocaleProvider";
import { Avatar } from "../Avatar";
import { useGlide } from "../glide";
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

function Tabbed(p: { tabs: RecordTab[]; current: RecordTab | undefined;
  onTab(id: string): void }) {
  const current = p.current;
  const row = useRef<HTMLDivElement>(null);
  useGlide(row, "line");
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
        <div role="tabpanel" id={`tabpanel-${current.id}`}
          aria-labelledby={`tab-${current.id}`} className={s.tabPanel}>
          {current.render()}
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
