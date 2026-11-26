import { useState } from "react";
import { useLocale } from "../i18n/LocaleProvider";
import s from "./PayRun.module.css";

const KEY = "mubinflow.explainHint";

function seen(): boolean {
  try {
    if (new URLSearchParams(location.search).get("reset") === "1") {
      sessionStorage.removeItem(KEY);
      return false;
    }
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Teaches the dotted line once per visit, beside the first figure
 * (session storage, so a laptop shows it again at each showing;
 * `?reset=1` brings it back at once). A convenience, so storage
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
          sessionStorage.setItem(KEY, "1");
        } catch {
          // Shows again next time; nothing else depends on it.
        }
        setOpen(false);
      }}>{t("payrun.hintOk")}</button>
    </span>
  );
}
