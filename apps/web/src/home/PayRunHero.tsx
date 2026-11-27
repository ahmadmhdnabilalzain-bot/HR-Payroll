import { fils, type Fils } from "@payroll/engine";
import { Suspense, useRef, useState, type ReactNode } from "react";
import { runApprovalId } from "../demo/derive";
import { formatDate, formatTime } from "../i18n/format";
import { decisionTime, demoClockIso, nowMs } from "../payrun/model";
import { hrefOf } from "../demo/route";
import { useHeightTween } from "../ui/heightTween";
import { useRowLink } from "../ui/RowLink";
import { SignStamp } from "../ui/SignStamp";
import { ExplainLink, Explainable } from "../components/explain";
import { useDemo } from "../demo/state";
import { useRunDetail } from "../demo/useRunDetail";
import { formatDayMonth } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { Icon } from "../ui/Icon";
import { NetTrend } from "./NetTrend";
import { useRunApproval } from "../demo/actions";
import type { Issue } from "../demo/data/types";
import { useFirstReveal } from "../ui/firstReveal";
import { RollDigits } from "../ui/RollDigits";
import { CardIban } from "./CardIban";
import { StatusAction, StatusSentence } from "./StatusLead";
import { currentStepHref, StepTracker } from "./StepTracker";
import tl from "./TextLink.module.css";
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
  // Once per load: a slow soft light crosses the card and the rails
  // fill; after that the card is simply there.
  const first = useFirstReveal("home-hero");
  const phase = useRunApproval().phase;
  // The card's height eases as the action under it changes (250 ms).
  const card = useRef<HTMLElement>(null);
  useHeightTween(card, phase);
  return (
    <>
    <StatusSentence />
    <section ref={card} className={s.hero} aria-labelledby="run-title"
      data-card=""
      data-hero-first={first}>
      {first && !phone && (
        <span className={s.sheen} aria-hidden="true" />
      )}
      <div className={s.top}>
        <div className={s.lead}>
          <div className={s.netCard}>
            <div className={s.figureRow}>
              <p className={s.figure} data-hero-figure="">
                <Explainable explanation={net}>
                  <RollDigits value={h.netTotalFils} size="hero" />
                </Explainable>
              </p>
              {phase === "file" && <HeroStamp />}
            </div>
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
  const { data, state } = useDemo();
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
      <a className={`${s.readyLine} ${tl.link}`}
        href={currentStepHref(data, state)}>
        <span className={s.readyCount}>
          {t("home.readyBar", { ready })}
        </span>
        {blocked > 0 && (
          <span className={s.heldCount}>
            <span className={s.heldDot} aria-hidden="true" />
            {t("home.heldBar", { count: blocked })}
          </span>
        )}
      </a>
      <dl className={s.totals}>
        <Total href={hrefOf("pay-run", "pay")} fly>
          <dt>{t("home.inFile")}</dt>
          <dd><RollDigits value={p.file} size="lg" /></dd>
        </Total>
        <Total href={hrefOf("pay-run", "fix")}>
          <dt>{t("home.heldOutLabel")}</dt>
          <dd><HeldOut value={p.held} /></dd>
        </Total>
      </dl>
    </div>
  );
}

/** One total under the bar: the whole of it opens where it is made. */
function Total(p: { href: string; fly?: boolean; children: ReactNode }) {
  const link = useRowLink({ href: p.href });
  return (
    <div {...link} className={`${link.className} ${s.total}`}
      data-fly-target={p.fly === true ? "" : undefined}>
      {p.children}
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

/**
 * Once the General manager has signed the run off, the sign-off sits
 * beside the figure as the shared stamp (name, role, when). Signed
 * here a moment ago, it lands (320 ms, 1.08 to 1, the ring 600 ms)
 * before the sentence above changes.
 */
function HeroStamp() {
  const { lang, t } = useLocale();
  const { data } = useDemo();
  const detail = useRunDetail();
  const checker = data.employee(data.runPeople().checkerId);
  const id = runApprovalId(data);
  const at = id === null ? null : decisionTime(id);
  const day = data.payCalendar().asOf;
  const when = at === null ? formatDate(day, lang)
    : t("payrun.recordedWhen", { date: formatDate(day, lang),
      time: formatTime(demoClockIso(at, detail.preparedOn,
        detail.preparedAt), lang) });
  return (
    <SignStamp className={s.heroStamp} compact
      label={t("payrun.chainRecorded")}
      name={checker.name[lang]} role={checker.role[lang]} when={when}
      fresh={at !== null && nowMs() - at < 2000} />
  );
}
