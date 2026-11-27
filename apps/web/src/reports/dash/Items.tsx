import { isBlocking, openIssues } from "../../demo/derive";
import { useDemo } from "../../demo/state";
import { useLocale } from "../../i18n/LocaleProvider";
import { useMaskText } from "../../ui/mask";
import { itemHref } from "./itemSeam";
import s from "./dash.module.css";

/**
 * Before sign-off, item by item: every open problem as a link to the
 * page where it is dealt with (the item page once it lands; the pay
 * run's Fix step until then), with what it is and a state word: stops
 * pay first, then the checks.
 */
export function BeforeSignOffItems() {
  const { lang } = useLocale();
  const { data, state } = useDemo();
  const mask = useMaskText();
  const list = openIssues(data, state);
  if (list.length === 0) {
    return <p className={s.itemMeta}>Nothing open before sign-off.</p>;
  }
  return (
    <ul className={s.items} aria-label="Before sign-off, item by item">
      {list.map((i) => {
        const stops = isBlocking(i);
        return (
          <li key={i.id}>
            <a className={s.item} href={itemHref("issue", i.id)}>
              <span className={s.itemText}>
                <span className={s.itemTitle}>
                  {i.employeeId === null ? i.title[lang]
                    : `${data.employee(i.employeeId).name[lang]}: ` +
                      i.title[lang]}</span>
                <span className={s.itemMeta}>{mask(i.reason[lang])}</span>
              </span>
              <span className={s.state} data-tone={stops ? "bad" : "warn"}>
                {stops ? "Stops pay" : "To check"}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
