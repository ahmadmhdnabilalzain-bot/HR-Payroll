import { SettingsPage } from "../../ui/templates";
import { formatDate } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import type { StructureData } from "./data";

/** S02: which papers are tracked, and when a reminder goes out. */
export function Documents(p: { d: StructureData }) {
  const { lang } = useLocale();
  const { d } = p;
  const day = (iso: string): string => formatDate(iso, lang);
  return (
    <SettingsPage title="Document types and reminders"
      lede="The papers kept for each person, and how early a reminder
        is raised before one ends."
      groups={[
        { title: "Document types", items: d.docTypes.map((t) => ({
          key: t.id, label: t.label, value: t.display.reminders,
          help: `${t.appliesTo}. ${t.display.onFile}` +
            (t.expiringSoon > 0 ? `; ${t.expiringSoon} ending soon`
              : "") })) },
        { title: "Reminders coming up", items: d.docsSoon.map((x) => ({
          key: x.id, label: `${x.who}, ${x.label}`,
          value: `Ends ${day(x.expiresOn)}`,
          help: "Reminders on " + x.reminders.map(day).join(" and ") +
            (x.reminders[1]! <= d.asOf ? ". Both are already due."
              : "") })) }]}
      log={[]} />
  );
}
