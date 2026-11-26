import { useDemo } from "../demo/state";
import { formatLongDay, formatNumber } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import b from "../ui/button.module.css";
import { Inbox } from "./inbox/Inbox";
import { areaHref } from "./inbox/model";
import i from "./inbox/inbox.module.css";
import s from "./Self.module.css";

function Open(p: { href: string | null; label: string }) {
  return p.href === null ? null : (
    <a className={`${b.btn} ${b.secondary}`} href={p.href}>{p.label}</a>
  );
}

/**
 * The IT manager's Home: is access and every connection working, how
 * far the import from the old system is, and the audit chain checked
 * on demand (the one action). No company pay. Links open the Setup
 * screens when they are reachable for the role.
 */
export function ItHome() {
  const { lang, t } = useLocale();
  const { data, state, dispatch } = useDemo();
  // The same check as the Audit trail page and the IT dashboard.
  const chain = state.auditCheck;
  const it = data.home.it();
  const c = { data, state };
  const failing = it.hooks.filter((h) => h.status === "failing").length;
  const imp = it.importSummary;
  return (
    <div className={s.page}>
      <header className={s.lead}>
        <p className={s.date}>
          {t("home.dateLine", { date: formatLongDay(data.payCalendar().asOf,
            lang), company: data.companyName[lang] })}
        </p>
        <h1 key={failing} className={s.sentence}>
          {failing === 0 ? t("inbox.itTitle") : failing === 1
            ? t("inbox.itFailingOne") : t("inbox.itFailing", {
              count: failing })}
        </h1>
      </header>
      <div className={i.cards2}>
        <section className={s.card} aria-labelledby="it-hooks">
          <h2 id="it-hooks" className={s.label}>{t("inbox.itConnections")}</h2>
          <ul className={i.list}>
            {it.hooks.map((h) => (
              <li key={h.id} className={i.row}>
                <div className={i.main}>
                  <span className={i.what}>{h.name}</span>
                  <span className={i.meta}>{h.statusText}</span>
                </div>
                <span className={i.status}
                  data-tone={h.status === "failing" ? "bad" : "good"}>
                  {h.status === "failing" ? t("inbox.hookFailing")
                    : t("inbox.hookWorking")}
                </span>
              </li>
            ))}
          </ul>
          <p className={s.meta}>
            {t("inbox.itKeys", { count: it.keys.length })}
            {it.keys[0] !== undefined && ` · ${t("inbox.itKeyUsed", {
              when: it.keys[0].lastUsedText })}`}
          </p>
          <Open href={areaHref(c, "setup.hooks")}
            label={t("inbox.itHooksOpen")} />
        </section>
        <section className={s.card} aria-labelledby="it-review">
          <h2 id="it-review" className={s.label}>{t("inbox.itReview")}</h2>
          <p className={s.big}>{formatLongDay(it.review.on, lang)}</p>
          <p className={s.meta}>{it.review.text}</p>
          <Open href={areaHref(c, "setup.review")}
            label={t("inbox.itReviewOpen")} />
        </section>
        <section className={s.card} aria-labelledby="it-import">
          <h2 id="it-import" className={s.label}>{t("inbox.itImport")}</h2>
          <p className={`${s.big} tabular`}>
            {t("inbox.itImportBig", { ready: formatNumber(imp.ready, lang),
              rows: formatNumber(imp.rows, lang) })}
          </p>
          <p className={s.meta}>{it.importText}</p>
          <Open href={areaHref(c, "setup.import")}
            label={t("inbox.itImportOpen")} />
        </section>
        <section className={s.card} aria-labelledby="it-audit">
          <h2 id="it-audit" className={s.label}>{t("inbox.itAudit")}</h2>
          <p className={`${s.big} tabular`}>
            {t("inbox.itAuditBig", { count: it.auditCount +
              state.auditAdded.length })}
          </p>
          <p className={s.meta} role="status">
            {chain === null ? t("inbox.itChainNote") : chain.ok
              ? t("inbox.itChainOk", { count: chain.checked })
              : t("inbox.itChainBroken", { at: chain.brokenAt ?? 0 })}
          </p>
          <button type="button" className={`${b.btn} ${b.primary}`}
            onClick={() => dispatch({ type: "audit-check",
              result: it.verifyChain(state.auditAdded,
                state.auditTampered) })}>
            {chain === null ? t("inbox.itCheck") : t("inbox.itCheckAgain")}
          </button>
        </section>
      </div>
      <Inbox />
    </div>
  );
}
