import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { areaHref } from "../dash/itemSeam";
import { Icon } from "../../ui/Icon";
import { MINUS } from "../../i18n/format";
import { Money } from "../../ui/Money";
import { ReportPage, Waterfall, type Cell } from "../../ui/templates";
import { percent, plural, useMoney, useReportCrumbs } from "../fmt";
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
  const crumbs = useReportCrumbs();
  const { m, signed } = useMoney();
  const keys = src.months.map((x) => x.month);
  const asked = keys.indexOf(props.rest[1] ?? "");
  const at = asked > 0 ? asked : keys.length - 1;
  const v = src.variance(keys[at]!, keys[at - 1]!);
  const rows: Cell[][] = v.drivers.map((d) => [d.label,
    d.people.join(", "), { fils: d.amount, signed: true }]);
  const short = (label: string): string => label.split(" ")[0] ?? label;
  // A cause opens the person it is about; one spread over several
  // people opens the report of its kind, else its first person.
  const { data } = useDemo();
  const personHref = (name: string | undefined): string | undefined => {
    const x = data.people.people().find((q) => q.name.en === name);
    return x === undefined ? undefined : hrefOf("people", x.id);
  };
  const rowHref = (r: number): string | undefined => {
    const d = v.drivers[r];
    if (d === undefined) return undefined;
    // Never this report itself: a cause named a "change" is not a page.
    const area = areaHref(d.label);
    return (d.people.length === 1 ? personHref(d.people[0]) : undefined)
      ?? (area?.startsWith(hrefOf("reports", "variance")) === true
        ? undefined : area) ?? personHref(d.people[0]);
  };
  return (
    <ReportPage crumbs={crumbs} title="Variance against last month"
      period=""
      meta={<Stepper label={`${v.monthLabel} against ${v.againstLabel}`}
        prev={at > 1 ? keys[at - 1]! : null}
        next={at < keys.length - 1 ? keys[at + 1]! : null} />}
      figure={{ label: `Change in gross, ${percent(v.grossChange,
        v.grossBefore)}`, value: (
        <Money value={v.grossChange} signed tween={false} />),
      explanation: v.explanation, swap: v.month }}
      explain={(r, c) => c !== 2 ? undefined
        : r < v.drivers.length ? v.driverExplain[v.drivers[r]!.key]
          : v.explanation}
      chart={<Waterfall label={`Gross pay, ${
        v.againstLabel} to ${v.monthLabel}, by cause`} steps={[
        { label: `${short(v.againstLabel)} gross`, kind: "total",
          value: v.grossBefore },
        ...v.drivers.map((d) => ({ label: d.label, kind: "change" as const,
          value: d.amount })),
        { label: `${short(v.monthLabel)} gross`, kind: "total",
          value: v.grossNow }]} />}
      columns={[{ label: "Cause" }, { label: "Who" },
        { label: "Change in gross", end: true }]}
      rows={rows} rowHref={rowHref}
      total={["Change in gross", headcountText(v.headcountChange),
        { fils: v.grossChange, signed: true }]}
      csvName={`variance-${v.month}-against-${v.against}.csv`}
      note={`${m(v.grossBefore)} became ${m(v.grossNow)}. Net pay ` +
        `changed by ${signed(v.netChange)}. The causes are read from ` +
        "each person's record and add up to the change."} />
  );
}

function headcountText(n: number): string {
  if (n === 0) return "Same number of people";
  return `${n > 0 ? "+" : MINUS}${plural(Math.abs(n), "person", "people")}`;
}
