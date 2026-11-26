import { useState } from "react";
import { useDemo } from "../demo/state";
import {
  annualNow,
  personFor,
  requestRows,
  usedHalves,
  visibleIds,
} from "../demo/time-off";
import { useLocale } from "../i18n/LocaleProvider";
import { dayCountText, dayCountVars, dayVars } from "../people/words";
import b from "../ui/button.module.css";
import type { ViewProps } from "../views";
import { RequestSheet } from "./RequestSheet";
import { Requests } from "./Requests";
import { TeamCalendar } from "./TeamCalendar";
import p from "../people/page.module.css";
import s from "./timeoff.module.css";

/**
 * Time off: your balance, the requests you may see (yours, your
 * team's, or everyone's), and who is off. One primary action.
 */
export function TimeOff(_p: ViewProps) {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const [open, setOpen] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);
  const me = personFor(data, state.role);
  const who = data.people.person(me);
  const lead = state.role === "employee"
    ? t("timeoff.leadMine", { name: who?.name[lang].split(" ")[0] ?? "" })
    : state.role === "manager" ? t("timeoff.leadTeam")
      : t("timeoff.leadAll");
  return (
    <div className={p.page}>
      <header className={p.headRow}>
        <div className={p.header}>
          <h1 className={p.title}>{t("timeoff.title")}</h1>
          <p className={p.lead}>{lead}</p>
        </div>
        <button type="button" className={`${b.btn} ${b.primary} ${p.tall}`}
          onClick={() => setOpen(true)}>{t("timeoff.request")}</button>
      </header>
      <Balances id={me} />
      <Requests fresh={fresh} />
      {visibleIds(data, state).length > 1 && <TeamCalendar />}
      <RequestSheet open={open} onClose={() => setOpen(false)}
        onSent={(id) => setFresh(id)} />
    </div>
  );
}

function Balances(q: { id: string }) {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const rows = requestRows(data, state);
  const bal = annualNow(data, state, q.id);
  const sick = usedHalves(rows, q.id, "lt-sick");
  const unpaid = usedHalves(rows, q.id, "lt-unpaid");
  const d = (h: number): string => dayCountText(h / 2, t, lang);
  return (
    <section className={p.section} aria-labelledby="bal-title">
      <header className={p.sectionHead}>
        <h2 id="bal-title" className={p.sectionTitle}>
          {t("timeoff.balances")}
        </h2>
      </header>
      <div className={s.balances}>
        <div className={s.balance} data-main="">
          <h3 className={s.balanceName}>{t("timeoff.annual")}</h3>
          {bal === null ? (
            <p className={s.balanceNote}>{t("timeoff.notJoined")}</p>
          ) : (
            <>
              <p className={`${s.balanceBig} tabular`}>
                {t("timeoff.annualLeft",
                  dayCountVars(bal.availableDays, lang))}
              </p>
              <p className={s.balanceNote}>
                {bal.basis ?? t("timeoff.annualMade", {
                  accrued: d(bal.accruedHalves), taken: d(bal.takenHalves),
                  pending: d(bal.pendingHalves) })}
              </p>
            </>
          )}
        </div>
        <div className={s.balance}>
          <h3 className={s.balanceName}>{t("timeoff.sick")}</h3>
          <p className={`${s.balanceMid} tabular`}>
            {t("timeoff.sickUsed", dayVars(sick, lang))}
          </p>
          <p className={s.balanceNote}>{t("timeoff.sickNote")}</p>
        </div>
        <div className={s.balance}>
          <h3 className={s.balanceName}>{t("timeoff.unpaid")}</h3>
          <p className={`${s.balanceMid} tabular`}>
            {t("timeoff.unpaidUsed", dayVars(unpaid, lang))}
          </p>
          <p className={s.balanceNote}>{t("timeoff.unpaidNote")}</p>
        </div>
      </div>
    </section>
  );
}
