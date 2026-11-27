import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { useLocale } from "../../i18n/LocaleProvider";
import { amountsHidden, maskMoney } from "../../ui/mask";
import { inboxNotices } from "./model";
import s from "./inbox.module.css";

/** Notices for the viewer's place: pinned first, then newest. */
export function NoticeList(p: { limit: number }) {
  const { t } = useLocale();
  const { data, state } = useDemo();
  const all = inboxNotices(data, state);
  const shown = all.slice(0, p.limit);
  return (
    <section className={s.panel} aria-labelledby="notices-title">
      <header className={s.head}>
        <h2 id="notices-title" className={s.title}>{t("inbox.notices")}</h2>
        {all.length > shown.length && (
          <a className={s.more} href={hrefOf("home", "notices")}>
            {t("inbox.allNotices")}
          </a>
        )}
      </header>
      {shown.length === 0 ? (
        <p className={s.empty}>{t("inbox.noticesEmpty")}</p>
      ) : (
        <ul className={s.list}>
          {shown.map((n) => (
            <li key={n.id} className={`${s.row} ${s.linkRow} ${s.stretch}`}>
              {/* The title's link covers the notice: its record. */}
              <div className={s.main}>
                <a className={`${s.what} ${s.stretched}`}
                  href={n.href}>{n.title}</a>
                <span className={s.body}>{amountsHidden(state)
                  ? maskMoney(n.body) : n.body}</span>
                <span className={s.meta}>
                  {t("inbox.postedBy", { name: n.postedBy.name,
                    date: n.postedOn.display })}
                  {n.pinned && ` · ${t("inbox.pinned")}`}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
