import { ExplainProvider } from "../components/explain/Explain";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { canSee, personFor } from "../demo/time-off";
import { useLocale } from "../i18n/LocaleProvider";
import type { ViewProps } from "../views";
import { Payslip } from "./Payslip";
import { PeopleList } from "./PeopleList";
import { Profile } from "./Profile";
import s from "./page.module.css";

/**
 * People: `#/people` lists, `#/people/<id>` is a profile and
 * `#/people/<id>/payslip` the month's payslip. What a role may see is
 * checked here for every path, so a deep link or a role switch on a
 * page falls back cleanly. An employee's People is their own profile.
 */
export function People(p: ViewProps) {
  const { data, state } = useDemo();
  const me = personFor(data, state.role);
  const [id, sub] = p.rest;
  const who = id ?? (state.role === "employee" ? me : undefined);
  if (who === undefined) return <PeopleList />;
  if (data.people.person(who) === null) {
    return <Outside text="notFound" />;
  }
  if (!canSee(data, state, who)) return <Outside text="notVisible" />;
  return (
    <ExplainProvider>
      {sub === "payslip" ? <Payslip id={who} /> : <Profile id={who} />}
    </ExplainProvider>
  );
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
