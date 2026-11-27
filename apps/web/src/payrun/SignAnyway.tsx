import type { Issue } from "../demo/data/types";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { useLocale } from "../i18n/LocaleProvider";
import b from "../ui/button.module.css";
import { Sheet } from "../ui/templates";
import s from "./PayRun.module.css";

/**
 * Before the General manager signs over open checks: a sheet that
 * says how many are not marked reviewed and what they are, with
 * "Sign off anyway" and a way back to the checks. Pay is never held
 * by a check; this only makes the choice a conscious one.
 */
export function SignAnyway(p: { open: boolean; checks: Issue[];
  onClose(): void; onSign(): void; onReview(): void }) {
  const { lang, t } = useLocale();
  const { data } = useDemo();
  const n = p.checks.length;
  return (
    <Sheet open={p.open} title={t("payrun.anywayTitle", { count: n })}
      onClose={p.onClose}>
      <p className={s.anywayLede}>{t("payrun.anywayLede", { count: n })}</p>
      <ul className={s.anywayList}>
        {p.checks.map((i) => (
          <li key={i.id}>
            <span className={s.name}>{i.title[lang]}</span>
            {i.employeeId !== null && (
              <span className={s.who}>
                {" "}· {data.employee(i.employeeId).name[lang]}</span>)}
          </li>
        ))}
      </ul>
      <div className={s.anywayActions}>
        <button type="button" className={`${b.btn} ${b.primary} ${s.act}`}
          onClick={p.onSign}>{t("payrun.anywayBtn")}</button>
        <a href={hrefOf("pay-run", "fix")}
          className={`${b.btn} ${b.secondary} ${s.act}`}
          onClick={(e) => {
            e.preventDefault();
            p.onReview();
          }}>{t("payrun.anywayReview")}</a>
      </div>
    </Sheet>
  );
}
