import { useEffect, useState } from "react";
import { EXPLAIN_OPEN } from "../components/explain";
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

function remember(): void {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    // Shows again next time; nothing else depends on it.
  }
}

/**
 * Teaches the dotted line once per visit: a small tooltip in the step
 * header, out of the figures' way (it never covers or moves one), and
 * gone after the first explanation is opened
 * (session storage, so a laptop shows it again at each showing;
 * `?reset=1` brings it back at once). A convenience, so storage
 * failing only means it shows again.
 */
export function ExplainHint() {
  const { t } = useLocale();
  const [open, setOpen] = useState(() => !seen());
  useEffect(() => {
    if (!open) return undefined;
    const done = (): void => {
      remember();
      setOpen(false);
    };
    addEventListener(EXPLAIN_OPEN, done);
    return () => removeEventListener(EXPLAIN_OPEN, done);
  }, [open]);
  if (!open) return null;
  return (
    <p className={s.hint} role="note">
      <span>{t("payrun.hint")}</span>
      <button type="button" className={s.hintBtn} onClick={() => {
        remember();
        setOpen(false);
      }}>{t("payrun.hintOk")}</button>
    </p>
  );
}
