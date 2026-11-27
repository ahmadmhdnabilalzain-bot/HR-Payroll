import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { canSee, personFor } from "../demo/time-off";
import { useLocale } from "../i18n/LocaleProvider";
import type { ViewProps } from "../views";
import { Exit } from "./exit/Exit";
import { Files } from "./files/Files";
import { Papers } from "./papers/Papers";
import { Growth } from "./growth/Growth";
import { Hiring } from "./hiring/Hiring";
import { Moves } from "./moves/Moves";
import { Requests } from "./requests/Requests";
import { More } from "./more/More";
import { Payslip } from "./Payslip";
import { PeopleList } from "./PeopleList";
import { Profile } from "./Profile";
import { Safety } from "./safety/Safety";
import { Talent } from "./talent/Talent";
import { Team } from "./team/Team";
import { Verify } from "./verify/Verify";
import { Esign } from "./esign/Esign";
import s from "./page.module.css";

/**
 * People: `#/people` lists (`#/people/department/<id>` opens it on one
 * department), `#/people/<id>` is a profile and
 * `#/people/<id>/payslip` the month's payslip. What a role may see is
 * checked here for every path, so a deep link or a role switch on a
 * page falls back cleanly. An employee's People is their own profile.
 */
export function People(p: ViewProps) {
  const { data, state } = useDemo();
  const me = personFor(data, state.role);
  const [id, sub] = p.rest;
  if (id === "papers") return <Papers rest={p.rest} />;
  if (id === "team") return <Team rest={p.rest.slice(1)} />;
  if (id === "growth") return <Growth rest={p.rest.slice(1)} />;
  if (id === "talent") return <Talent rest={p.rest.slice(1)} />;
  if (id === "safety") return <Safety rest={p.rest.slice(1)} />;
  if (id === "exit") return <Exit rest={p.rest.slice(1)} />;
  if (id === "verify") return <Verify rest={p.rest.slice(1)} />;
  if (id === "esign") return <Esign rest={p.rest.slice(1)} />;
  if (id === "files") return <Files rest={p.rest.slice(1)} />;
  if (id === "moves") return <Moves rest={p.rest} />;
  if (id === "hiring") return <Hiring rest={p.rest.slice(1)} />;
  if (id === "requests") return <Requests rest={p.rest} />;
  if (id === "more") return <More rest={p.rest.slice(1)} />;
  if (id === "department" && state.role !== "employee") {
    return <PeopleList key={sub ?? ""} dept={sub} />;
  }
  const who = id ?? (state.role === "employee" ? me : undefined);
  if (who === undefined) return <PeopleList />;
  if (data.people.person(who) === null) {
    return <Outside text="notFound" />;
  }
  if (!canSee(data, state, who)) return <Outside text="notVisible" />;
  return sub === "payslip" ? <Payslip id={who} /> : <Profile id={who} />;
}

function Outside(p: { text: "notFound" | "notVisible" }) {
  const { t } = useLocale();
  return (
    <div className={s.page}>
      <header className={s.header}>
        <nav aria-label={t("shell.breadcrumb")} className={s.crumbs}>
          <a href={hrefOf("people")}>{t("people.back")}</a>
        </nav>
        <h1 className={s.title}>{t(`people.${p.text}`)}</h1>
        {p.text === "notVisible" && (
          <p className={s.lead}>{t("people.notVisibleHint")}</p>
        )}
      </header>
    </div>
  );
}
