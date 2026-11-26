import { useDemo } from "../../demo/state";
import { useLocale } from "../../i18n/LocaleProvider";
import { hrefOf } from "../../demo/route";
import { PageHead } from "../../ui/templates";
import { PayCalendar } from "./PayCalendar";
import {
  companyPage,
  deductionsPage,
  elementsPage,
  endOfServicePage,
  groupsPage,
  holidaysPage,
  hoursPage,
  leavePage,
  wpsPage,
} from "./pages";
import s from "./rules.module.css";
import { RuleList } from "./RuleList";
import { RuleRecord } from "./RuleRecord";
import { RuleSettings, type PageSpec } from "./RuleSettings";

function Missing() {
  return (
    <div className={s.page}>
      <PageHead title="Not found"
        lede="There is no setup page at that address."
        back={{ label: "Rules and sources",
          href: hrefOf("setup", "rules", "packs") }} />
    </div>
  );
}

/** The setup rule screens, from `#/setup/rules/<page>`. */
export default function Screens(p: { rest: string[] }) {
  const { data } = useDemo();
  const { lang } = useLocale();
  const [area, page, id] = p.rest;
  if (area !== "rules") return <Missing />;
  const specs: Record<string, PageSpec> = {
    leave: leavePage(data), hours: hoursPage(),
    holidays: holidaysPage(), "end-of-service": endOfServicePage(),
    deductions: deductionsPage(), elements: elementsPage(data),
    groups: groupsPage(data, lang), wps: wpsPage(data),
    company: companyPage(data),
  };
  if (page === "packs") {
    return id === undefined ? <RuleList /> : <RuleRecord id={id} />;
  }
  if (page === "calendar") return <PayCalendar />;
  const spec = page === undefined ? undefined : specs[page];
  return spec === undefined ? <Missing /> : <RuleSettings spec={spec} />;
}
