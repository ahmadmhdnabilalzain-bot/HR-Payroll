import { fils, type Fils } from "@payroll/engine";
import { useEffect, useState } from "react";
import { ExplainLink, Explainable } from "../components/explain";
import { reducedMotion, ROLL_MS } from "../demo/motion";
import { useDemo } from "../demo/state";
import { useRunDetail } from "../demo/useRunDetail";
import { formatDayMonth } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { Icon } from "../ui/Icon";
import { Money } from "../ui/Money";
import { StepTracker } from "./StepTracker";
import s from "./PayRunHero.module.css";

/**
 * The figure that supports the headline: net pay, one line under it
 * (people, payday, and what is held out of the salary file, which
 * rolls into the file when an IBAN passes), the pension caveat as a
 * small line, "Why this number", and the progress. The make-up sits
 * below the fold (MakeUp).
 */
export function PayRunHero() {
  const { lang, t } = useLocale();
  const { data } = useDemo();
  const run = useRunDetail();
  const h = data.headline();
  const cal = data.payCalendar();
  const net = run.explain["run:net"];
  return (
    <section className={s.hero} aria-labelledby="run-title">
      <h2 id="run-title" className="visually-hidden">{t("home.net")}</h2>
      <div className={s.lead}>
        <p className={s.figure}>
          <Explainable explanation={net}>
            <Money value={h.netTotalFils} size="hero" countUp />
          </Explainable>
        </p>
        <p className={s.line}>
          <span>{t("home.netTo", { count: h.headcount })}</span>
          <span className={s.dot} aria-hidden="true" />
          <span>{t("home.paysOn", { date: formatDayMonth(cal.payday,
            lang) })}</span>
          <span className={s.dot} aria-hidden="true" />
          <HeldOut value={h.heldNetFils} />
          <ExplainLink explanation={net} className={s.why}>
            <Icon name="info" size={16} />
            {t("home.whyNumber")}
          </ExplainLink>
        </p>
        <p className={s.caveat}>{h.netNote[lang]}</p>
      </div>
      <StepTracker />
    </section>
  );
}

/**
 * What is held out of the salary file. When the last IBAN passes, the
 * amount rolls down to zero first (the money visibly moves into the
 * file), and only then does the line say everyone is in the file.
 */
function HeldOut(p: { value: Fils }) {
  const { t } = useLocale();
  // Derived during render (React's "previous value" pattern), so the
  // amount stays mounted and rolls from its last value to zero.
  const [prev, setPrev] = useState(p.value);
  const [rolling, setRolling] = useState(false);
  if (prev !== p.value) {
    setPrev(p.value);
    if (prev > 0n && p.value === 0n && !reducedMotion()) setRolling(true);
  }
  useEffect(() => {
    if (!rolling) return undefined;
    const h = setTimeout(() => setRolling(false), ROLL_MS + 150);
    return () => clearTimeout(h);
  }, [rolling]);
  const zero = p.value === 0n && !rolling;
  return (
    <span className={s.held} data-zero={zero}>
      {zero ? t("home.allInFile") : (
        <>
          <Money value={fils(p.value)} size="sm" />
          {" "}{t("home.heldOut")}
        </>
      )}
    </span>
  );
}
