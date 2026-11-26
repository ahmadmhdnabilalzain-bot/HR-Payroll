import { Explainable } from "../../components/explain";
import { money, text, type Explanation }
  from "../../components/explain/types";
import { hrefOf } from "../../demo/route";
import { Icon } from "../../ui/Icon";
import { MINUS } from "../../i18n/format";
import { Money } from "../../ui/Money";
import { ReportPage, Waterfall, type Cell } from "../../ui/templates";
import { percent, plural, useMoney, useReportCrumbs } from "../fmt";
import { useReportsSource } from "../load";
import type { VarianceView } from "../types";
import p from "../Pick.module.css";

/** Why gross pay moved between two months; the causes add up exactly. */
export function explainVariance(v: VarianceView): Explanation {
  return { id: `variance:${v.month}`, title: "Change in gross pay",
    subject: `${v.monthLabel} against ${v.againstLabel}`,
    summary: "Each person's change is put under the one cause the " +
      "records show for them, so the causes add up to the whole change.",
    result: { label: "Change in gross", value: money(v.grossChange) },
    inputs: [{ label: `${v.againstLabel} gross`, value: money(
      v.grossBefore), from: "Pay run history, worked out again" },
    { label: `${v.monthLabel} gross`, value: money(v.grossNow),
      from: "Pay run history" }],
    rules: [{ text: "A cause is read from the person's record: joined, " +
      "left, unpaid leave, overtime, back pay or a salary raise.",
    status: "convention", statusLabel: "our convention, not a rule " +
      "of law", citation: null }],
    steps: [{ text: `${v.againstLabel} gross`, value: money(
      v.grossBefore) }, ...v.drivers.map((d) => ({ text: d.label,
      value: money(d.amount) })), { text: `${v.monthLabel} gross`,
    value: money(v.grossNow) }, { text: "Drivers add up to",
      value: text("the change shown") }],
    notComputed: [], scope: "Pay run history, January to October 2026" };
}

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
  return (
    <ReportPage crumbs={crumbs} title="Variance against last month"
      period=""
      meta={<Stepper label={`${v.monthLabel} against ${v.againstLabel}`}
        prev={at > 1 ? keys[at - 1]! : null}
        next={at < keys.length - 1 ? keys[at + 1]! : null} />}
      figure={{ label: `Change in gross, ${percent(v.grossChange,
        v.grossBefore)}`, value: (
        <Explainable explanation={explainVariance(v)}>
          <Money value={v.grossChange} signed tween={false} />
        </Explainable>) }}
      chart={<Waterfall key={v.month} label={`Gross pay, ${
        v.againstLabel} to ${v.monthLabel}, by cause`} steps={[
        { label: `${short(v.againstLabel)} gross`, kind: "total",
          value: v.grossBefore },
        ...v.drivers.map((d) => ({ label: d.label, kind: "change" as const,
          value: d.amount })),
        { label: `${short(v.monthLabel)} gross`, kind: "total",
          value: v.grossNow }]} />}
      columns={[{ label: "Cause" }, { label: "Who" },
        { label: "Change in gross", end: true }]}
      rows={rows}
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
