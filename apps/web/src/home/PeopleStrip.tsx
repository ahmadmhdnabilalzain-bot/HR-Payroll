import type { MouseEvent, ReactNode } from "react";
import { pendingApprovals } from "../demo/derive";
import { useRunApproval } from "../demo/actions";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { offOn, requestRows } from "../demo/time-off";
import { useTweenedNumber } from "../demo/motion";
import { formatDayMonth } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { Avatar } from "../ui/Avatar";
import s from "./PeopleStrip.module.css";

/** Days ahead the leave card looks, today included. */
const DAYS = 7;
/** Dots drawn per day before "+n". */
const DOTS = 4;
/** Faces shown before "+n". */
const FACES = 4;

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * The company at a glance, drawn from the data: the nationality split
 * (headcount only, from the package's own nationality count), who is
 * off over the next seven days (a dot per person per day), the nearest
 * expiring documents by name and date, and the faces of whoever waits
 * for an approval. Each card links to the view that holds the rest.
 * Every card reads the same way: the figure and its label, one picture
 * under them at one y, and a footnote line on one baseline at the
 * bottom.
 */
export function PeopleStrip() {
  return (
    <ul className={s.strip}>
      <Nationals />
      <LeaveWeek />
      <Expiring />
      <Waiting />
    </ul>
  );
}

function Card(p: { href: string; label: string; value: number;
  children: ReactNode; onClick?(e: MouseEvent): void }) {
  const n = useTweenedNumber(p.value);
  return (
    <li>
      <a className={s.card} href={p.href} onClick={p.onClick}>
        <span className={s.head}>
          <span className={`${s.value} tabular`}>{n}</span>
          <span className={s.label}>{p.label}</span>
        </span>
        {p.children}
      </a>
    </li>
  );
}

function Nationals() {
  const { t } = useLocale();
  const { data } = useDemo();
  const n = data.papers.nationalities();
  const share = n.headcount > 0 ? n.uaeNationals / n.headcount : 0;
  return (
    <Card href={hrefOf("reports", "nationality")} value={n.uaeNationals}
      label={t("home.cardNationals", { total: n.headcount })}>
      <span className={s.split} aria-hidden="true">
        <span style={{ flexGrow: share }} />
        <span style={{ flexGrow: 1 - share }} />
      </span>
      <span className={s.sub}>{t("home.cardNationalsSub")}</span>
    </Card>
  );
}

function LeaveWeek() {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const rows = requestRows(data, state);
  const asOf = data.payCalendar().asOf;
  const days = Array.from({ length: DAYS }, (_, i) => {
    const date = addDays(asOf, i);
    return { date, off: offOn(rows, date) };
  });
  const people = new Set(days.flatMap((d) => d.off.map((r) =>
    r.employeeId)));
  const last = days.at(-1)?.date ?? asOf;
  const next = rows.filter((r) => (r.state === "booked" ||
    r.state === "waiting") && r.startDate > last)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  const wd = new Intl.DateTimeFormat(lang === "ar" ? "ar-AE" : "en-GB",
    { timeZone: "UTC", weekday: "narrow" });
  return (
    <Card href={hrefOf("time-off")} value={people.size}
      label={t("home.cardLeave")}>
      <span className={s.week} aria-hidden="true">
        {days.map((d) => (
          <span key={d.date} className={s.day}
            data-weekend={[0, 6].includes(new Date(`${d.date}T00:00:00Z`)
              .getUTCDay())}>
            <span className={s.dots}>
              {d.off.slice(0, DOTS).map((r) => (
                <span key={r.id} className={s.dot}
                  data-state={r.state} />
              ))}
            </span>
            <span className={s.wd}>
              {wd.format(new Date(`${d.date}T00:00:00Z`))}
            </span>
          </span>
        ))}
      </span>
      <span className="visually-hidden">
        {days.map((d) => `${formatDayMonth(d.date, lang)}: ` +
          `${d.off.length}`).join(", ")}
      </span>
      {next !== undefined && (
        <span className={s.sub}>
          {t("home.cardLeaveNext", { name: data.employee(next.employeeId)
            .name[lang], date: formatDayMonth(next.startDate, lang) })}
        </span>
      )}
    </Card>
  );
}

function Expiring() {
  const { lang, t } = useLocale();
  const { data } = useDemo();
  const docs = [...data.documents()].sort((a, b) => a.daysLeft -
    b.daysLeft);
  const soon = docs.filter((d) => d.daysLeft <= 30).length;
  const [first, then] = docs;
  return (
    <Card href={hrefOf("reports", "documents")} value={soon}
      label={t("home.cardDocs")}>
      {first !== undefined && (
        <span className={s.doc}>
          <span className={s.who}>{data.employee(first.employeeId)
            .name[lang]}</span>
          <span className={s.when}>
            {first.kind[lang]}, {formatDayMonth(first.expiresOn, lang)}
          </span>
        </span>
      )}
      {then !== undefined && (
        <span className={s.sub}>
          {t("home.cardDocsNext", { name: data.employee(then.employeeId)
            .name[lang], date: formatDayMonth(then.expiresOn, lang) })}
        </span>
      )}
    </Card>
  );
}

function Waiting() {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const run = useRunApproval();
  const open = pendingApprovals(data, state).filter((a) =>
    a.kind !== "pay-run" || run.blockedBy.length === 0);
  const ids = [...new Set(open.map((a) => a.employeeId ?? a.makerId))];
  const names = ids.map((id) => data.employee(id).name[lang]);
  return (
    <Card href="#approvals-title" value={open.length}
      label={t("home.cardWaiting")} onClick={(e) => {
        e.preventDefault();
        document.getElementById("approvals-title")
          ?.scrollIntoView({ block: "start", behavior: "smooth" });
      }}>
      <span className={s.faces}>
        {ids.slice(0, FACES).map((id, i) => (
          <Avatar key={id} id={id} name={names[i] ?? ""}
            className={s.face} />
        ))}
        {ids.length > FACES && (
          <span className={s.more}>+{ids.length - FACES}</span>
        )}
      </span>
      <span className={s.sub}>{names.slice(0, 2).join(", ")}
        {names.length > 2 ? ` +${names.length - 2}` : ""}</span>
    </Card>
  );
}
