import { useDemo } from "../demo/state";
import { useLocale } from "../i18n/LocaleProvider";
import s from "./PayRunHero.module.css";

/**
 * Where the figures come from, opened from "Sources": the rule scope,
 * the pension wording (one place, from the data), how totals are made,
 * and the one note about the invented demo bank.
 */
export function Sources(p: { note: string | null }) {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const b = data.basis();
  return (
    <div id="sources" className={s.sources} hidden={!state.sourcesOpen}>
      <h3 className={s.sourcesTitle}>{t("home.sourcesTitle")}</h3>
      <ul className={s.sourcesList}>
        <li>{b.ruleSet[lang]}</li>
        <li>{b.pension[lang]}</li>
        <li>{t("home.basisEngine")}</li>
        {p.note !== null && <li>{p.note}</li>}
      </ul>
    </div>
  );
}
