import { useState } from "react";
import { useDemo } from "../../demo/state";
import { formatDayMonth } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import { MonthCalendar, type CalEvent } from "../../ui/templates";
import { ruleOf } from "./data";

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

function shift(ym: string, step: number): string {
  const [y = 0, m = 1] = ym.split("-").map(Number);
  const at = y * 12 + (m - 1) + step;
  return `${Math.floor(at / 12)}-${String((at % 12) + 1).padStart(2, "0")}`;
}

const monthName = (ym: string): string => {
  const [y = "", m = "1"] = ym.split("-");
  return `${MONTHS[Number(m) - 1] ?? ""} ${y}`;
};

/**
 * S15: the pay month as a calendar. The dates are the demo's sample
 * dates; the salary due date is the rule's (secondary source).
 */
export function PayCalendar() {
  const { lang } = useLocale();
  const { data } = useDemo();
  const run = data.headline().runMonth;
  const [month, setMonth] = useState(run);
  const cal = data.payCalendar();
  const dueDay = Number(ruleOf("ae-deadlines", "wpsDueDayOfNextMonth").raw);
  const due = `${shift(run, 1)}-${String(dueDay).padStart(2, "0")}`;
  const steps: { id: string; label: string; on: string;
    tone: CalEvent["tone"] }[] = [
    { id: "cut", label: "Cut-off for changes", on: cal.cutOff,
      tone: "booked" },
    { id: "approve", label: "Sign off by", on: cal.approveBy,
      tone: "booked" },
    { id: "file", label: "Salary file sent", on: cal.sifDue,
      tone: "booked" },
    { id: "pay", label: "Payday", on: cal.payday, tone: "booked" },
    { id: "due", label: "Salary due, by the rule", on: due,
      tone: "waiting" },
  ];
  return (
    <MonthCalendar title="Pay calendar"
      lede={`The dates of the ${monthName(run)} pay run. The dates ` +
        "are planned. The due date is the rule's, from a secondary source."}
      month={month} monthLabel={monthName(month)}
      rows={steps.map((x) => ({ id: x.id,
        label: `${x.label}, ${formatDayMonth(x.on, lang)}` }))}
      events={steps.map((x) => ({ rowId: x.id, start: x.on, end: x.on,
        tone: x.tone, label: `${x.label}, ${formatDayMonth(x.on, lang)}` }))}
      onMonth={(step) => {
        const next = shift(month, step);
        if (next >= run && next <= shift(run, 1)) setMonth(next);
      }} />
  );
}
