import { useDemo } from "../demo/state";
import { useLocale } from "../i18n/LocaleProvider";
import s from "./PayRunHero.module.css";

/** Where the figures come from: opened from "Sources" by the number. */
export function Sources() {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const b = data.basis();
  return (
    <div id="sources" className={s.sources} data-open={state.sourcesOpen}
      hidden={!state.sourcesOpen}>
      <h3 className={s.sourcesTitle}>{t("home.sourcesTitle")}</h3>
      <ul className={s.sourcesList}>
        <li>{b.ruleSet[lang]}</li>
        <li>{b.pension[lang]}</li>
        <li>{b.engine[lang]}</li>
      </ul>
    </div>
  );
}
