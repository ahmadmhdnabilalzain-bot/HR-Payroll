import { confirmations } from "../demo/derive";
import { useDemo } from "../demo/state";
import { useLocale } from "../i18n/LocaleProvider";
import { RowLink } from "../ui/RowLink";
import { issueHref } from "./IssueRow";
import s from "./Side.module.css";

/**
 * Client setup to confirm (pension fund, settlement inputs): waiting on
 * someone outside the system, so never counted as issues.
 */
export function Setup() {
  const { lang, t } = useLocale();
  const { data } = useDemo();
  const list = confirmations(data);
  if (list.length === 0) return null;
  return (
    <section className={s.panel} aria-labelledby="setup-title">
      <header className={s.head}>
        <h2 id="setup-title" className={s.title}>{t("home.setupTitle")}</h2>
      </header>
      <p className={s.lede}>{t("home.setupSub")}</p>
      <ul className={s.list}>
        {list.map((i) => (
          <li key={i.id}>
            <RowLink href={issueHref(i)}
              className={`${s.row} ${s.linkRow}`}>
              <div className={s.main}>
                <span className={s.what}>{i.title[lang]}</span>
                <span className={s.meta}>{i.reason[lang]}</span>
              </div>
            </RowLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
