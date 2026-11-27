import { useDemo } from "../demo/state";
import { useLocale } from "../i18n/LocaleProvider";
import { barFor, WORD } from "../nav/registry";
import type { SectionId } from "../nav/types";
import type { ViewProps } from "../views";
import { phoneMore } from "../nav/phone";
import { hrefOf } from "../demo/route";
import { AreaRows, SectionList } from "./SectionList";
import s from "./SectionPage.module.css";

const IDS: readonly SectionId[] = ["people", "time", "pay", "reports",
  "setup", "requests", "me"];

/**
 * `#/s/<section>`: a section's areas as a page, the first screen of a
 * phone tab ("More" lists the words the phone bar has no room for).
 */
export function SectionPage(p: ViewProps) {
  const { t } = useLocale();
  const { state } = useDemo();
  const id = IDS.find((x) => x === p.rest[0]);
  const words = id === undefined ? barFor(state.role).slice(4) : [id];
  // More shows the places the role uses most; "More areas" (`#/s/all`)
  // lists every area, grouped, as before.
  const more = phoneMore(state.role);
  if (id === undefined && p.rest[0] !== "all" && more.top.length > 0) {
    return (
      <div className={s.page}>
        <h1 className={s.title}>{t("shell.navMore")}</h1>
        <AreaRows areas={more.top} label={t("shell.navMore")}
          more={more.rest === 0 ? undefined : {
            label: t("shell.moreAreas"), href: hrefOf("s", "all") }} />
      </div>
    );
  }
  return (
    <div className={s.page}>
      <h1 className={s.title}>
        {id === undefined ? t("shell.navMore") : t(WORD[id])}
      </h1>
      {words.map((w) => (
        <div key={w} className={s.block}>
          {id === undefined && <h2 className={s.word}>{t(WORD[w])}</h2>}
          <SectionList section={w} variant="page"
            level={id === undefined ? 3 : 2} />
        </div>
      ))}
    </div>
  );
}
