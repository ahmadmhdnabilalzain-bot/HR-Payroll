import { fils, type Fils } from "@payroll/engine";
import { Suspense, useState } from "react";
import { ExplainLink, Explainable } from "../components/explain";
import { useDemo } from "../demo/state";
import { useRunDetail } from "../demo/useRunDetail";
import { formatDayMonth } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { Icon } from "../ui/Icon";
import { NetTrend } from "./NetTrend";
import { useRunApproval } from "../demo/actions";
import type { Issue } from "../demo/data/types";
import { RollDigits } from "../ui/RollDigits";
import { CardIban } from "./CardIban";
import { StatusAction, StatusSentence } from "./StatusLead";
import { StepTracker } from "./StepTracker";
import { usePhone } from "./usePhone";
import { WaitingList } from "./WaitingList";
import nt from "./NetTrend.module.css";
import s from "./PayRunHero.module.css";

/**
 * The top of Home as one statement. Left: the sentence, net pay with
 * its line (people, payday, "Why this number"), a slim bar of who is
 * ready against who is held for bank details (with the amount held
 * out of the salary file, which rolls into the file when an IBAN
 * passes), the one action, the step line and the pension caveat.
 * Right: net pay June to October and what moved it (NetTrend).
 */
export function PayRunHero() {
  const { lang, t } = useLocale();
  const { data } = useDemo();
  const run = useRunDetail();
  const h = data.headline();
  const cal = data.payCalendar();
  const net = run.explain["run:net"];
  const [editing, setEditing] = useState<Issue | null>(null);
  // While bank details hold the run, and for the rest of the visit
  // once the form has opened, the action slot keeps the bank form's
  // height, so opening, saving and closing it (the last save included)
  // never moves what sits below.
  const [opened, setOpened] = useState(false);
  const reserve = useRunApproval().blockedBy.length > 0 || opened;
  const edit = (i: Issue): void => {
    setOpened(true);
    setEditing(i);
  };
  // Phones: the chart moves below the strip (Home) and a short
  // "Waiting for you" list joins the first screen.
  const phone = usePhone();
  return (
    <>
    <StatusSentence />
    <section className={s.hero} aria-labelledby="run-title" data-card="">
      <div className={s.top}>
        <div className={s.lead}>
          <div className={s.netCard}>
            <p className={s.figure} data-hero-figure="">
              <Explainable explanation={net}>
                <RollDigits value={h.netTotalFils} size="hero" />
              </Explainable>
            </p>
            <p className={s.line}>
              <span>{t("home.netTo", { count: h.headcount })}</span>
              <span className={s.dot} aria-hidden="true" />
              <span>{t("home.paysOn", { date: formatDayMonth(cal.payday,
                lang) })}</span>
              <ExplainLink explanation={net} className={s.why}>
                <Icon name="info" size={16} />
                {t("home.whyNumber")}
              </ExplainLink>
            </p>
          </div>
          <ReadyBar total={h.headcount} file={h.sifTotalFils}
            held={h.heldNetFils} />
          <div className={s.slot} data-reserve={reserve}>
            {editing !== null ? (
              <CardIban issue={editing} onDone={() => setEditing(null)} />
            ) : (
              <>
                <div className={s.act}>
                  <StatusAction onIban={edit} />
                  <StepTracker />
                </div>
                <p className={s.caveat}>{h.netNote[lang]}</p>
              </>
            )}
          </div>
          {phone && <WaitingList />}
        </div>
        {!phone && (
          <Suspense fallback={<div className={nt.placeholder} />}>
            <NetTrend />
          </Suspense>
        )}
      </div>
    </section>
    </>
  );
}

/**
 * Who is ready against who is held for bank details, as one slim bar
 * (counts from the run's own blockers), with the amount held out of
 * the salary file beside it.
 */
function ReadyBar(p: { total: number; file: Fils; held: Fils }) {
  const { t } = useLocale();
  const run = useRunApproval();
  const blocked = run.blockedBy.length;
  const ready = p.total - blocked;
  return (
    <div className={s.ready}>
      <div className={s.bar} aria-hidden="true">
        <span className={s.barHeld} style={{ "--h":
          p.total === 0 ? 0 : blocked / p.total } as object} />
        <span className={s.barReady} style={{ "--k":
          p.total === 0 ? 1 : ready / p.total } as object} />
      </div>
      <p className={s.readyLine}>
        <span className={s.readyCount}>
          {t("home.readyBar", { ready })}
        </span>
        {blocked > 0 && (
          <span className={s.heldCount}>
            <span className={s.heldDot} aria-hidden="true" />
            {t("home.heldBar", { count: blocked })}
          </span>
        )}
      </p>
      <dl className={s.totals}>
        <div data-fly-target="">
          <dt>{t("home.inFile")}</dt>
          <dd><RollDigits value={p.file} size="lg" /></dd>
        </div>
        <div>
          <dt>{t("home.heldOutLabel")}</dt>
          <dd><HeldOut value={p.held} /></dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * What is held out of the salary file. When the last IBAN passes it
 * goes straight to "None" with a short cross-fade (no roll through
 * 0.00), in a line of the same height, so nothing below moves.
 */
function HeldOut(p: { value: Fils }) {
  const { t } = useLocale();
  const zero = p.value === 0n;
  return (
    <span key={zero ? "none" : "amount"} className={s.held}
      data-zero={zero}>
      {zero ? t("home.heldNone")
        : <RollDigits value={fils(p.value)} size="lg" />}
    </span>
  );
}
