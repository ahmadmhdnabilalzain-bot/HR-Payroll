import { useState } from "react";
import { useLocale } from "../i18n/LocaleProvider";
import s from "./PayRun.module.css";

const KEY = "mubinflow.explainHint";

function seen(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Teaches the dotted line once, beside the first figure: closed for
 * good (this browser only) once dismissed. A convenience, so storage
 * failing only means it shows again.
 */
export function ExplainHint() {
  const { t } = useLocale();
  const [open, setOpen] = useState(() => !seen());
  if (!open) return null;
  return (
    <span className={s.hint} role="note">
      <span>{t("payrun.hint")}</span>
      <button type="button" className={s.hintBtn} onClick={() => {
        try {
          localStorage.setItem(KEY, "1");
        } catch {
          // Shows again next time; nothing else depends on it.
        }
        setOpen(false);
      }}>{t("payrun.hintOk")}</button>
    </span>
  );
}
