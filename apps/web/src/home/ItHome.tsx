import { useState, type ReactNode } from "react";
import type { ChainCheck } from "../demo/data/home-types";
import { useDemo } from "../demo/state";
import { formatDayMonth, formatLongDay, formatNumber } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import b from "../ui/button.module.css";
import { Icon } from "../ui/Icon";
import { Inbox } from "./inbox/Inbox";
import { areaHref } from "./inbox/model";
import s from "./Self.module.css";
import it from "./ItHome.module.css";

/** The words the IT Home adds (English; the rest are inbox.* keys). */
const W = {
  tiles: "Access and connections",
  failing: "failing",
  of: "of {n}",
  reviewLabel: "Last access review",
  reviewSub: "{checked} users checked, {narrowed} role narrowed",
  keysLabel: "API keys", keysUnit: "read only",
  importUnit: "rows ready",
  importSub: "{warn} to review, {err} to fix",
  chainTitle: "Audit chain",
  chainSub: "Every entry carries a fingerprint of the one before it, so " +
    "an entry changed after the fact shows at once.",
  notChecked: "Not checked yet",
  open: "Open",
};

const fill = (t: string, v: Record<string, string | number>): string =>
  t.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));

type Tone = "bad" | "good" | "wait";

/** A tile: a 13 px label, a 34 px figure with its unit, a line under. */
function Tile(p: { id: string; label: string; figure: string;
  unit?: string; sub?: string; state?: { tone: Tone; word: string };
  meter?: number; href: string | null; children?: ReactNode }) {
  const body = (
    <>
      <span className={it.label} id={`${p.id}-label`}>{p.label}</span>
      <span className={it.figure}>
        <span className="tabular">{p.figure}</span>
        {p.unit !== undefined && <span className={it.unit}>{p.unit}</span>}
      </span>
      {p.state !== undefined && (
        <span className={it.state} data-tone={p.state.tone}>
          {p.state.word}</span>
      )}
      {p.sub !== undefined && <span className={it.sub}>{p.sub}</span>}
      {p.meter !== undefined && (
        <span className={it.meter} aria-hidden="true">
          <span style={{ inlineSize: `${Math.round(p.meter * 100)}%` }} />
        </span>
      )}
    </>
  );
  return (
    <li className={it.tile}>
      {p.href === null ? <div className={it.tileHead}>{body}</div> : (
        <a className={it.tileHead} href={p.href}>
          {body}
          <span className={it.go} aria-hidden="true">
            <Icon name="chevronEnd" size={16} /></span>
        </a>
      )}
      {p.children}
    </li>
  );
}

/**
 * The IT manager's Home: four tiles (connections, the last access
 * review, API keys, the import from the old system), then the audit
 * chain with its one action, the check, and its state in words: not
 * checked yet, every entry matches, or where it breaks. No company pay.
 */
export function ItHome() {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const [chain, setChain] = useState<ChainCheck | null>(null);
  const o = data.home.it();
  const c = { data, state };
  const failing = o.hooks.filter((h) => h.status === "failing");
  const imp = o.importSummary;
  const key = o.keys[0];
  const chainState: { tone: Tone; word: string } = chain === null
    ? { tone: "wait", word: W.notChecked }
    : chain.ok ? { tone: "good", word: t("inbox.itChainOk",
      { count: chain.checked }) }
      : { tone: "bad", word: t("inbox.itChainBroken",
        { at: chain.brokenAt ?? 0 }) };
  return (
    <div className={s.page}>
      <header className={s.lead}>
        <p className={s.date}>
          {t("home.dateLine", { date: formatLongDay(data.payCalendar().asOf,
            lang), company: data.companyName[lang] })}
        </p>
        <h1 key={failing.length} className={s.sentence}>
          {failing.length === 0 ? t("inbox.itTitle") : failing.length === 1
            ? t("inbox.itFailingOne") : t("inbox.itFailing", {
              count: failing.length })}
        </h1>
      </header>
      <ul className={it.tiles} aria-label={W.tiles}>
        <Tile id="it-hooks" label={t("inbox.itConnections")}
          figure={formatNumber(failing.length, lang)}
          unit={`${fill(W.of, { n: o.hooks.length })} ${W.failing}`}
          href={areaHref(c, "setup.hooks")}>
          <ul className={it.hooks}>
            {o.hooks.map((h) => (
              <li key={h.id}>
                <span className={it.state} data-tone={h.status === "failing"
                  ? "bad" : "good"}>
                  {h.status === "failing" ? t("inbox.hookFailing")
                    : t("inbox.hookWorking")}</span>
                <span className={it.hookName}>{h.name}</span>
              </li>
            ))}
          </ul>
        </Tile>
        <Tile id="it-review" label={W.reviewLabel}
          figure={formatDayMonth(o.review.on, lang)}
          sub={fill(W.reviewSub, { checked: o.review.checked,
            narrowed: o.review.narrowed })}
          href={areaHref(c, "setup.review")} />
        <Tile id="it-keys" label={W.keysLabel}
          figure={formatNumber(o.keys.length, lang)} unit={W.keysUnit}
          {...(key === undefined ? {} : { sub: t("inbox.itKeyUsed",
            { when: key.lastUsedText }) })}
          href={areaHref(c, "setup.keys")} />
        <Tile id="it-import" label={t("inbox.itImport")}
          figure={`${formatNumber(imp.ready, lang)} ` +
            fill(W.of, { n: formatNumber(imp.rows, lang) })}
          unit={W.importUnit} meter={imp.rows === 0 ? 0
            : imp.ready / imp.rows}
          sub={fill(W.importSub, { warn: imp.warnings, err: imp.errors })}
          href={areaHref(c, "setup.import")} />
      </ul>
      <section className={it.chain} aria-labelledby="it-chain">
        <div className={it.chainText}>
          <h2 id="it-chain" className={it.label}>{W.chainTitle}</h2>
          <p className={it.figure}>
            <span className="tabular">{formatNumber(o.auditCount, lang)}</span>
            <span className={it.unit}>
              {t("inbox.itAuditBig", { count: o.auditCount })
                .replace(/^\S+\s/, "")}</span>
          </p>
          <p className={it.state} data-tone={chainState.tone} role="status">
            {chainState.word}</p>
          <p className={it.sub}>{W.chainSub}</p>
        </div>
        <button type="button"
          className={`${b.btn} ${b.primary} ${b.large} ${it.check}`}
          onClick={() => setChain(o.verifyChain())}>
          {chain === null ? t("inbox.itCheck") : t("inbox.itCheckAgain")}
        </button>
      </section>
      <Inbox />
    </div>
  );
}
