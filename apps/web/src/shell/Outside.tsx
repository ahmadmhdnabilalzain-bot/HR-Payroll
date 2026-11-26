import { hrefOf } from "../demo/route";
import { useLocale } from "../i18n/LocaleProvider";
import b from "../ui/button.module.css";
import { PageHead } from "../ui/templates";
import t from "../ui/templates/templates.module.css";

/**
 * What a deep link shows when the role may not open the page (the
 * shell's route guard, nav/registry.ts `mayOpen`): plain words and a
 * way back to the role's Home.
 */
export function Outside() {
  const { t: tr } = useLocale();
  return (
    <div className={t.page}>
      <PageHead title={tr("shell.outsideTitle")}
        lede={tr("shell.outsideHelp")} />
      <p>
        <a className={`${b.btn} ${b.secondary}`} href={hrefOf("home")}>
          {tr("shell.outsideBack")}</a>
      </p>
    </div>
  );
}
