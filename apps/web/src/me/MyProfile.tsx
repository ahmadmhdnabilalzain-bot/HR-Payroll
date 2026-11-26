import { hrefOf } from "../demo/route";
import { dayCountVars } from "../people/words";
import { useDemo } from "../demo/state";
import { annualNow, personFor } from "../demo/time-off";
import { formatDate } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { countryName } from "../people/words";
import b from "../ui/button.module.css";
import { KeyValues, RecordTabs } from "../ui/templates";
import { signTab } from "../people/esign/Sign";

/** E06: the viewer's own record (RT): details, and pay with the slip. */
export function MyProfile() {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const me = personFor(data, state.role);
  const x = data.people.person(me);
  if (x === null) return null;
  const balance = annualNow(data, state, me);
  const approver = data.people.person(x.approverId);
  return (
    <RecordTabs title={x.name[lang]}
      lede={`${x.role[lang]} · ${x.department[lang]}`}
      stats={[
        { label: t("me.joined"), value: formatDate(x.joinedOn, lang) },
        ...(balance === null ? [] : [{ label: t("me.leaveLeft"),
          value: t("timeoff.annualLeft",
              dayCountVars(balance.availableDays, lang)) }]),
        { label: t("me.documents"),
          value: String(data.home.documents(me).length) }]}
      tabs={[
        { id: "details", label: t("me.tabDetails"), render: () => (
          <KeyValues items={[
            { label: t("me.number"), value: x.number },
            { label: t("me.job"), value: x.role[lang] },
            { label: t("me.department"), value: x.department[lang] },
            { label: t("me.branch"), value: x.branch[lang] },
            { label: t("me.email"), value: x.email },
            { label: t("me.emiratesId"), value: x.emiratesIdMasked },
            { label: t("me.nationality"),
              value: countryName(x.nationality, lang) },
            { label: t("me.approver"),
              value: approver?.name[lang] ?? "" }]} />) },
        { id: "pay", label: t("me.tabPay"), render: () => (
          <>
            <KeyValues items={[{ label: t("me.iban"),
              value: x.ibanMasked ?? t("me.noIban") }]} />
            <a className={`${b.btn} ${b.secondary}`}
              href={hrefOf("people", me, "payslip")}>
              {t("me.openPayslip")}
            </a>
          </>) }, signTab(`bank:${me}`, `privacy:${me}`)]} />
  );
}
