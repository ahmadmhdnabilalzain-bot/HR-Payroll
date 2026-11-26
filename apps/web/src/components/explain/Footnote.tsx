import { useLocale } from "../../i18n/LocaleProvider";
import s from "./Explain.module.css";

/**
 * Provenance, said once per page and quietly: "Fictional demo data.
 * Rules as we read them." Source statuses for each rule live only in
 * the explain panel. A stand-in until the shared templates carry one.
 */
export function Footnote(p: { className?: string | undefined }) {
  const { t } = useLocale();
  return (
    <p className={`${s.footnote} ${p.className ?? ""}`}>
      {t("explain.footnote")}
    </p>
  );
}
