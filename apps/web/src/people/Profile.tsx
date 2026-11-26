import type { ReactNode } from "react";
import type { Person } from "../demo/data/people-types";
import type { Issue } from "../demo/data/types";
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
import b from "../ui/button.module.css";
import { Icon } from "../ui/Icon";
import { Money } from "../ui/Money";
import { shortBranch } from "./filter";
import {
  countryName,
  dayText,
  daysText,
  expiryWord,
  initials,
  statusLong,
  statusTone,
} from "./words";
import p from "./page.module.css";
import s from "./Profile.module.css";

/** One person: who they are, their pay, papers, time off, open items. */
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
            <p className={p.lead}>
              {x.role[lang]} · {x.department[lang]}
              {me && <span className={s.you}> · {t("people.you")}</span>}
            </p>
            <p className={s.statusLine}>
              <span className={p.status} data-tone={statusTone(x)}>
                {statusLong(x, t, lang)}
              </span>
              <span className={s.branch}>{shortBranch(x.branch[lang])}</span>
            </p>
          </div>
        </div>
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

function Fact(q: { label: string; children: ReactNode;
  tabular?: boolean }) {
  return (
    <div className={s.fact}>
      <dt>{q.label}</dt>
      <dd className={q.tabular === true ? "tabular" : undefined}>
        {q.children}
      </dd>
    </div>
  );
}

function years(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const y = (ty ?? 0) - (fy ?? 0);
  const before = (tm ?? 0) < (fm ?? 0) ||
    ((tm ?? 0) === (fm ?? 0) && (td ?? 0) < (fd ?? 0));
  return before ? y - 1 : y;
}

function Employment(q: { person: Person }) {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const x = q.person;
  const end = x.leftOn !== null && x.leftOn < data.people.asOf ? x.leftOn
    : data.people.asOf;
  const n = years(x.joinedOn, end);
  const approver = data.people.person(x.approverId);
  const seeApprover = approver !== null && canSee(data, state, approver.id);
  return (
    <section className={p.section} aria-labelledby="emp-title">
      <header className={p.sectionHead}>
        <h2 id="emp-title" className={p.sectionTitle}>
          {t("people.employment")}
        </h2>
      </header>
      <dl className={s.facts}>
        <Fact label={t("people.staffNumber")} tabular>{x.number}</Fact>
        <Fact label={t("people.joined")}>
          {dayText(x.joinedOn, lang)}
          <span className={s.factSub}>
            {n < 1 ? t("people.serviceUnder")
              : t("people.service", { count: n })}
          </span>
        </Fact>
        {x.probationEndsOn !== null && x.status === "probation" && (
          <Fact label={t("people.probationEnds")}>
            {dayText(x.probationEndsOn, lang)}
          </Fact>
        )}
        {x.leftOn !== null && (
          <Fact label={t("people.lastDay")}>{dayText(x.leftOn, lang)}</Fact>
        )}
        <Fact label={t("people.grade")} tabular>
          {t("people.gradeValue", { grade: x.grade })}
        </Fact>
        <Fact label={t("people.nationality")}>
          {countryName(x.nationality, lang)}
        </Fact>
        <Fact label={t("people.email")}>
          <span className={s.email}>{x.email}</span>
        </Fact>
        <Fact label={t("people.emiratesId")} tabular>
          <span dir="ltr">{x.emiratesIdMasked}</span>
        </Fact>
        {canSeePay(data, state, x.id) && (
          <Fact label={t("people.iban")} tabular>
            {x.ibanMasked === null
              ? <span className={s.warn}>{t("people.ibanMissing")}</span>
              : <span dir="ltr">{x.ibanMasked}</span>}
          </Fact>
        )}
        {approver !== null && (
          <Fact label={t("people.requestsGoTo")}>
            {seeApprover
              ? <a className={s.link} href={hrefOf("people", approver.id)}>
                {approver.name[lang]}</a>
              : approver.name[lang]}
            <span className={s.factSub}>{approver.role[lang]}</span>
          </Fact>
        )}
      </dl>
    </section>
  );
}

function Pay(q: { person: Person }) {
  const { lang, t } = useLocale();
  const { data } = useDemo();
  const slip = data.people.payslip(q.person.id);
  const month = formatMonth(data.headline().runMonth, lang);
  return (
    <section className={p.section} aria-labelledby="pay-title">
      <header className={p.sectionHead}>
        <h2 id="pay-title" className={p.sectionTitle}>{t("people.pay")}</h2>
        <span className={p.muted}>{data.people.payslip(q.person.id)
          ?.rulesScope[lang] ?? ""}</span>
      </header>
      {slip === null ? (
        <p className={p.empty}>{t("people.noPayslip", { month })}</p>
      ) : (
        <div className={s.pay}>
          <div className={s.net}>
            <span className={s.netLabel}>
              {t("people.netFor", { month })}
            </span>
            <Money value={slip.netFils} size="hero" />
          </div>
          <dl className={s.payParts}>
            <div>
              <dt>{t("people.gross")}</dt>
              <dd><Money value={slip.grossFils} /></dd>
            </div>
            <div>
              <dt>{t("people.deductions")}</dt>
              <dd><Money value={slip.deductionsFils} /></dd>
            </div>
          </dl>
          {slip.pension !== null && (
            <p className={s.notice}>
              <strong>{t("people.pensionNote")}: </strong>
              {t("people.notComputed").toLowerCase()}.{" "}
              {slip.pension.text[lang]}
            </p>
          )}
          {slip.held !== null && (
            <p className={s.notice} data-tone="warn">
              <strong>{t("people.held")}. </strong>{slip.held}
            </p>
          )}
          <a className={`${b.btn} ${b.secondary} ${p.tall} ${s.open}`}
            href={hrefOf("people", q.person.id, "payslip")}>
            {t("people.openPayslip", { month })}
            <Icon name="arrowEnd" size={16} />
          </a>
        </div>
      )}
    </section>
  );
}

function Documents(q: { person: Person }) {
  const { lang, t } = useLocale();
  const { data } = useDemo();
  const docs = data.people.documentsOf(q.person.id);
  return (
    <section className={p.section} aria-labelledby="docs-title">
      <header className={p.sectionHead}>
        <h2 id="docs-title" className={p.sectionTitle}>
          {t("people.documents")}
        </h2>
      </header>
      {docs.length === 0 ? (
        <p className={p.empty}>{t("people.noDocuments")}</p>
      ) : (
        <ul className={s.items}>
          {docs.map((d) => {
            const [word, tone] = expiryWord(d, t);
            const when = d.daysLeft >= 0
              ? t("people.inDays", { count: d.daysLeft })
              : t("people.agoDays", { count: -d.daysLeft });
            return (
              <li key={d.id} className={s.item}>
                <div className={s.itemMain}>
                  <span className={s.itemTitle}>{d.kind[lang]}</span>
                  <span className={s.itemSub}>
                    {t("people.expires", { date: dayText(d.expiresOn,
                      lang) })}, {when}
                  </span>
                </div>
                <span className={p.status} data-tone={tone}>{word}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
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
    <section className={p.section} aria-labelledby="leave-title">
      <header className={p.sectionHead}>
        <h2 id="leave-title" className={p.sectionTitle}>
          {t("people.timeOff")}
        </h2>
        <a className={s.link} href={hrefOf("time-off")}>
          {t("people.seeTimeOff")}
        </a>
      </header>
      <dl className={s.leave}>
        <div className={s.leaveMain}>
          <dt>{t("people.annualLeft")}</dt>
          <dd>
            <span className={`${s.big} tabular`}>
              {bal === null ? "–" : daysText(bal.availableHalves, t, lang)}
            </span>
            {bal !== null && (
              <span className={s.factSub}>
                {t("people.annualOf", {
                  taken: daysText(bal.takenHalves, t, lang),
                  pending: daysText(bal.pendingHalves, t, lang) })}
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt>{t("people.sickUsed")}</dt>
          <dd className="tabular">{daysText(sick, t, lang)}</dd>
        </div>
        <div>
          <dt>{t("people.unpaidUsed")}</dt>
          <dd className="tabular">{daysText(unpaid, t, lang)}</dd>
        </div>
      </dl>
    </section>
  );
}

const NOTE_KEY: Record<Issue["kind"], MessageKey> = {
  issue: "people.noteIssue", "needs-confirmation": "people.noteConfirm",
  note: "people.noteInfo",
};

/** The package's open items about this person, in its own words. */
function Notes(q: { person: Person }) {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const notes = data.issues().filter((n) =>
    n.employeeId === q.person.id && state.resolved[n.id] === undefined);
  if (notes.length === 0) return null;
  return (
    <section className={p.section} aria-labelledby="notes-title">
      <header className={p.sectionHead}>
        <h2 id="notes-title" className={p.sectionTitle}>
          {t("people.notes")}
        </h2>
      </header>
      <ul className={s.items}>
        {notes.map((n) => (
          <li key={n.id} className={s.note}>
            <span className={p.status}
              data-tone={n.kind === "issue" ? "warn" : "info"}>
              {t(NOTE_KEY[n.kind])}
            </span>
            <span className={s.itemTitle}>{n.title[lang]}</span>
            <span className={s.noteText}>{n.reason[lang]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
