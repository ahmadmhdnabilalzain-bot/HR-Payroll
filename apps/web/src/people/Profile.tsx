import type { ReactNode } from "react";
import type { Person } from "../demo/data/people-types";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import {
  annualNow,
  canSee,
  canSeePay,
  personFor,
  requestRows,
  usedHalves,
} from "../demo/time-off";
import { formatMonth } from "../i18n/format";
import type { MessageKey } from "../i18n/t";
import { useLocale } from "../i18n/LocaleProvider";
import { Icon } from "../ui/Icon";
import { Money } from "../ui/Money";
import { openItemsOf, severityOf } from "./attention";
import { shortBranch } from "./filter";
import { EmiratesId } from "./EmiratesId";
import { useRoll } from "./useRoll";
import {
  countryName,
  dayCountText,
  dayText,
  daysText,
  expiryWord,
  initials,
  statusLong,
  statusTone,
} from "./words";
import p from "./page.module.css";
import s from "./Profile.module.css";

function years(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const y = (ty ?? 0) - (fy ?? 0);
  const before = (tm ?? 0) < (fm ?? 0) ||
    ((tm ?? 0) === (fm ?? 0) && (td ?? 0) < (fd ?? 0));
  return before ? y - 1 : y;
}

/**
 * One person. Under the name, three facts in a row (net pay, annual
 * leave left, years of service); then open items, pay, time off and
 * the employment details as grouped lists. Pay only for HR, the GM
 * and the person.
 */
export function Profile(q: { id: string }) {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const x = data.people.person(q.id);
  if (x === null) return null;
  const me = personFor(data, state.role) === x.id;
  const backKey: MessageKey = state.role === "manager" ? "people.backTeam"
    : "people.back";
  return (
    <div className={p.page}>
      <header className={s.header}>
        {state.role !== "employee" && (
          <nav aria-label={t("shell.breadcrumb")} className={p.crumbs}>
            <a href={hrefOf("people")}>{t(backKey)}</a>
            <span aria-hidden="true" className={p.sep}>/</span>
            <span aria-current="page">{x.name[lang]}</span>
          </nav>
        )}
        <div className={s.who}>
          <span className={p.avatar} data-size="lg" aria-hidden="true">
            {initials(x.name.en)}
          </span>
          <div className={s.whoText}>
            <h1 className={p.title}>{x.name[lang]}</h1>
            <p className={s.sub}>
              {x.role[lang]} · {x.department[lang]} ·{" "}
              {shortBranch(x.branch[lang])}
              {me && <> · {t("people.you")}</>}
            </p>
            {x.status !== "active" && (
              <p className={s.sub}>
                <span className={p.status} data-tone={statusTone(x)}>
                  {statusLong(x, t, lang)}
                </span>
              </p>
            )}
          </div>
        </div>
        <Summary person={x} />
      </header>
      <div className={s.grid}>
        <div className={s.main}>
          <Notes person={x} />
          {canSeePay(data, state, x.id) && <Pay person={x} />}
          <Leave person={x} />
        </div>
        <div className={s.side}>
          <Employment person={x} />
          <Documents person={x} />
        </div>
      </div>
    </div>
  );
}

/** Three facts, no boxes: 13 px label over a 28 px figure. */
function Summary(q: { person: Person }) {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const x = q.person;
  const slip = canSeePay(data, state, x.id) ? data.people.payslip(x.id)
    : null;
  const bal = annualNow(data, state, x.id);
  const end = x.leftOn !== null && x.leftOn < data.people.asOf ? x.leftOn
    : data.people.asOf;
  const n = years(x.joinedOn, end);
  const whole = bal !== null && Number.isInteger(bal.availableDays * 2);
  const rolled = useRoll(whole ? (bal?.availableDays ?? 0) * 2 : 0);
  const month = formatMonth(data.headline().runMonth, lang);
  return (
    <dl className={s.summary}>
      {slip !== null && (
        <div>
          <dt>{t("people.sumNet", { month })}</dt>
          <dd><Money value={slip.netFils} size="lg" /></dd>
        </div>
      )}
      {bal !== null && (
        <div>
          <dt>{t("people.sumLeave")}</dt>
          <dd className="tabular">
            {whole ? daysText(rolled, t, lang)
              : dayCountText(bal.availableDays, t, lang)}
          </dd>
        </div>
      )}
      <div>
        <dt>{t("people.sumService")}</dt>
        <dd className="tabular">
          {n < 1 ? t("people.serviceUnder")
            : t("people.service", { count: n })}
        </dd>
      </div>
    </dl>
  );
}

function Section(q: { id: string; title: string; end?: ReactNode;
  children: ReactNode }) {
  return (
    <section className={p.section} aria-labelledby={q.id}>
      <header className={s.head}>
        <h2 id={q.id} className={s.title}>{q.title}</h2>
        {q.end}
      </header>
      {q.children}
    </section>
  );
}

function Fact(q: { label: string; children: ReactNode }) {
  return (
    <div className={s.fact}>
      <dt>{q.label}</dt>
      <dd>{q.children}</dd>
    </div>
  );
}

function Employment(q: { person: Person }) {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const x = q.person;
  const approver = data.people.person(x.approverId);
  const seeApprover = approver !== null && canSee(data, state, approver.id);
  return (
    <Section id="emp-title" title={t("people.employment")}>
      <dl className={s.group}>
        <Fact label={t("people.staffNumber")}>
          <span className="tabular">{x.number}</span>
        </Fact>
        <Fact label={t("people.joined")}>{dayText(x.joinedOn, lang)}</Fact>
        {x.probationEndsOn !== null && x.status === "probation" && (
          <Fact label={t("people.probationEnds")}>
            {dayText(x.probationEndsOn, lang)}
          </Fact>
        )}
        {x.leftOn !== null && (
          <Fact label={t("people.lastDay")}>{dayText(x.leftOn, lang)}</Fact>
        )}
        <Fact label={t("people.grade")}>
          <span className="tabular">{x.grade}</span>
        </Fact>
        <Fact label={t("people.nationality")}>
          {countryName(x.nationality, lang)}
        </Fact>
        <Fact label={t("people.email")}>
          <span className={s.email}>{x.email}</span>
        </Fact>
        <Fact label={t("people.emiratesId")}>
          <EmiratesId person={x} />
        </Fact>
        {canSeePay(data, state, x.id) && (
          <Fact label={t("people.iban")}>
            {x.ibanMasked === null ? t("people.ibanMissing")
              : <span dir="ltr" className="tabular">{x.ibanMasked}</span>}
          </Fact>
        )}
        {approver !== null && (
          <Fact label={t("people.requestsGoTo")}>
            {seeApprover
              ? <a className={s.link} href={hrefOf("people", approver.id)}>
                {approver.name[lang]}</a>
              : approver.name[lang]}
          </Fact>
        )}
      </dl>
    </Section>
  );
}

function Pay(q: { person: Person }) {
  const { lang, t } = useLocale();
  const { data } = useDemo();
  const slip = data.people.payslip(q.person.id);
  const month = formatMonth(data.headline().runMonth, lang);
  if (slip === null) {
    return (
      <Section id="pay-title" title={t("people.pay")}>
        <p className={p.empty}>{t("people.noPayslip", { month })}</p>
      </Section>
    );
  }
  return (
    <Section id="pay-title" title={t("people.pay")}>
      <ul className={s.group}>
        <li className={s.line}>
          <span>{t("people.gross")}</span>
          <Money value={slip.grossFils} />
        </li>
        <li className={s.line}>
          <span>{t("people.deductions")}</span>
          <Money value={slip.deductionsFils} />
        </li>
        <li>
          <a className={s.rowLink}
            href={hrefOf("people", q.person.id, "payslip")}>
            <span>{t("people.openPayslip", { month })}</span>
            <Icon name="chevronEnd" size={16} />
          </a>
        </li>
      </ul>
      {slip.pension !== null && (
        <p className={s.foot}>{slip.pension.text[lang]}</p>
      )}
      {slip.held !== null && (
        <p className={s.foot}>{t("people.held")}. {slip.held}</p>
      )}
    </Section>
  );
}

function Documents(q: { person: Person }) {
  const { lang, t } = useLocale();
  const { data } = useDemo();
  const docs = data.people.documentsOf(q.person.id);
  return (
    <Section id="docs-title" title={t("people.documents")}>
      {docs.length === 0 ? (
        <p className={p.empty}>{t("people.noDocuments")}</p>
      ) : (
        <ul className={s.group}>
          {docs.map((d) => {
            const [word, tone] = expiryWord(d, t);
            const when = d.daysLeft >= 0
              ? t("people.inDays", { count: d.daysLeft })
              : t("people.agoDays", { count: -d.daysLeft });
            return (
              <li key={d.id} className={s.item}>
                <span className={s.dot} data-tone={tone} aria-hidden="true" />
                <span className={s.itemMain}>
                  <span className={s.itemTitle}>{d.kind[lang]}</span>
                  <span className={s.itemSub}>
                    {t("people.expires", { date: dayText(d.expiresOn,
                      lang) })}, {when}
                  </span>
                </span>
                <span className={s.itemEnd}>{word}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

function Leave(q: { person: Person }) {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const rows = requestRows(data, state);
  const bal = annualNow(data, state, q.person.id);
  const sick = usedHalves(rows, q.person.id, "lt-sick");
  const unpaid = usedHalves(rows, q.person.id, "lt-unpaid");
  return (
    <Section id="leave-title" title={t("people.timeOff")}
      end={<a className={s.link} href={hrefOf("time-off")}>
        {t("people.seeTimeOff")}</a>}>
      <ul className={s.group}>
        {bal !== null && bal.basis === null && (
          <li className={s.line}>
            <span>{t("timeoff.annual")}</span>
            <span className={s.lineEnd}>
              {t("people.annualOf", {
                taken: daysText(bal.takenHalves, t, lang),
                pending: daysText(bal.pendingHalves, t, lang) })}
            </span>
          </li>
        )}
        <li className={s.line}>
          <span>{t("people.sickUsed")}</span>
          <span className="tabular">{daysText(sick, t, lang)}</span>
        </li>
        <li className={s.line}>
          <span>{t("people.unpaidUsed")}</span>
          <span className="tabular">{daysText(unpaid, t, lang)}</span>
        </li>
      </ul>
      {bal !== null && bal.basis !== null && (
        <p className={s.foot}>
          {bal.basis.charAt(0).toUpperCase() + bal.basis.slice(1)}.
        </p>
      )}
    </Section>
  );
}

/** Open items: an 8 px dot for severity, "Stops pay" or "Check". */
function Notes(q: { person: Person }) {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  // Expiring papers are said once, under Documents.
  const notes = openItemsOf(data, state, q.person.id)
    .filter((n) => n.fixKind !== "renew-document");
  if (notes.length === 0) return null;
  return (
    <Section id="notes-title" title={t("people.notes")}>
      <ul className={s.group}>
        {notes.map((n) => {
          const sev = severityOf(data, n);
          return (
            <li key={n.id} className={s.item}>
              <span className={s.dot} aria-hidden="true"
                data-tone={sev === "stops-pay" ? "danger" : "warn"} />
              <span className={s.itemMain}>
                <span className={s.itemTitle}>{n.title[lang]}</span>
                <span className={s.itemSub}>{n.reason[lang]}</span>
              </span>
              <span className={s.itemEnd}>
                {sev === "stops-pay" ? t("people.stopsPay")
                  : t("people.check")}
              </span>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
