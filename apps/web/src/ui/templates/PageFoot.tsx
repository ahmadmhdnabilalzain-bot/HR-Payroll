import { useLocale } from "../../i18n/LocaleProvider";
import s from "./templates.module.css";

/**
 * The page's one sources line, quiet, at the foot: provenance lives
 * here, never in body copy, letters or anything a third party gets.
 * `extra` goes before it (a row count, a scope).
 */
export function PageFoot(p: { extra?: string | undefined }) {
  const { t } = useLocale();
  return (
    <footer className={s.foot}>
      {p.extra !== undefined && <span>{p.extra}</span>}
      <span>{t("tpl.sources")}</span>
    </footer>
  );
}
