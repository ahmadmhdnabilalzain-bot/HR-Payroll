import { fils, type Fils } from "@payroll/engine";
import { formatMonth } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { Money } from "../ui/Money";
import s from "./PayRun.module.css";

const abs = (x: bigint): Fils => fils(x < 0n ? -x : x);

/** "AED 1,000.00 more than September", as a word and a colour. */
export function ChangeNote(p: { now: Fils; prev: Fils; month: string }) {
  const { lang, t } = useLocale();
  const d = p.now - p.prev;
  const month = formatMonth(p.month, lang).split(" ")[0] ?? "";
  if (d === 0n) {
    return <span className={s.change} data-dir="same">
      {t("payrun.same", { month })}</span>;
  }
  return (
    <span className={s.change} data-dir={d > 0n ? "up" : "down"}>
      <Money value={abs(d)} size="sm" />{" "}
      {d > 0n ? t("payrun.more", { month }) : t("payrun.less", { month })}
    </span>
  );
}

/** The same for a count of people. */
export function CountChange(p: { now: number; prev: number;
  month: string }) {
  const { lang, t } = useLocale();
  const d = p.now - p.prev;
  const month = formatMonth(p.month, lang).split(" ")[0] ?? "";
  if (d === 0) {
    return <span className={s.change} data-dir="same">
      {t("payrun.same", { month })}</span>;
  }
  return (
    <span className={s.change} data-dir={d > 0 ? "up" : "down"}>
      {d > 0 ? t("payrun.morePeople", { count: d, month })
        : t("payrun.fewerPeople", { count: -d, month })}
    </span>
  );
}

/** A signed amount for a table cell: "+AED 1,000.00". */
export function SignedMoney(p: { value: Fils }) {
  const { t } = useLocale();
  if (p.value === 0n) {
    return <span className={s.muted}>{t("payrun.noChange")}</span>;
  }
  return (
    <span className={s.signed} data-dir={p.value > 0n ? "up" : "down"}>
      <Money value={p.value} size="sm" signed />
    </span>
  );
}

/** The month's name alone ("September"), for short labels. */
export function monthName(ym: string, lang: "en" | "ar"): string {
  return formatMonth(ym, lang).split(" ")[0] ?? "";
}
