import { hrefOf } from "../../demo/route";
import { Icon } from "../../ui/Icon";
import { ReportPage } from "../../ui/templates";
import { MINUS } from "../../i18n/format";
import { percent, plural, useMoney } from "../fmt";
import { useReportsSource } from "../load";
import p from "../Pick.module.css";

function Stepper(p2: { prev: string | null;
  next: string | null; label: string }) {
  const link = (to: string | null, dir: "start" | "end", name: string) => {
    const icon = (
      <span className={dir === "start" ? p.flip : p.same}>
        <Icon name="chevronEnd" size={20} />
      </span>);
    return to === null
      ? <span className={`${p.step} ${p.off}`} aria-hidden="true">{icon}</span>
      : <a className={p.step} aria-label={name}
        href={hrefOf("reports", "variance", to)}>{icon}</a>;
  };
  return (
    <nav className={p.strip} aria-label="Month to compare">
      {link(p2.prev, "start", "Earlier month")}
      <span className={p.label} aria-live="polite">{p2.label}</span>
      {link(p2.next, "end", "Later month")}
    </nav>
  );
}

export function Variance(props: { rest: string[] }) {
  const src = useReportsSource();
  const { m, signed } = useMoney();
  const keys = src.months.map((x) => x.month);
  const asked = keys.indexOf(props.rest[1] ?? "");
  const at = asked > 0 ? asked : keys.length - 1;
  const v = src.variance(keys[at]!, keys[at - 1]!);
  const rows = [...v.drivers.map((d) => [d.label, d.people.join(", "),
    signed(d.amount)]), ["Change in gross", headcountText(v.headcountChange),
    signed(v.grossChange)]];
  return (
    <>
      <Stepper label={`${v.monthLabel} against ` +
        `${v.againstLabel}`} prev={at > 1 ? keys[at - 1]! : null}
      next={at < keys.length - 1 ? keys[at + 1]! : null} />
      <ReportPage title="Variance against last month"
        period={`${v.monthLabel} against ${v.againstLabel}`}
        figure={{ label: `Change in gross, ${percent(v.grossChange,
          v.grossBefore)}`, value: signed(v.grossChange),
        explanation: v.explanation }}
        explain={(r, c) => c !== 2 ? undefined
          : r < v.drivers.length ? v.driverExplain[v.drivers[r]!.key]
            : v.explanation}
        columns={[{ label: "Cause" }, { label: "Who" },
          { label: "Change in gross", end: true }]}
        rows={rows} csvName={`variance-${v.month}-against-` +
          `${v.against}.csv`}
        note={`${m(v.grossBefore)} became ${m(v.grossNow)}. Net pay ` +
          `changed by ${signed(v.netChange)}. The causes are read from ` +
          "each person's record and add up to the change."} />
    </>
  );
}

function headcountText(n: number): string {
  if (n === 0) return "Same number of people";
  return `${n > 0 ? "+" : MINUS}${plural(Math.abs(n), "person", "people")}`;
}
