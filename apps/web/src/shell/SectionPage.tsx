import { useDemo } from "../demo/state";
import { useLocale } from "../i18n/LocaleProvider";
import { barFor, WORD } from "../nav/registry";
import type { SectionId } from "../nav/types";
import type { ViewProps } from "../views";
import { SectionList } from "./SectionList";
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
  return (
    <div className={s.page}>
      <h1 className={s.title}>
        {id === undefined ? t("shell.navMore") : t(WORD[id])}
      </h1>
      {words.map((w) => (
        <div key={w} className={s.block}>
          {id === undefined && <h2 className={s.word}>{t(WORD[w])}</h2>}
          <SectionList section={w} variant="page" />
        </div>
      ))}
    </div>
  );
}
