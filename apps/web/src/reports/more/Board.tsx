import { fils } from "@payroll/engine";
import { useDemo } from "../../demo/state";
import { Money } from "../../ui/Money";
import { ReportPage } from "../../ui/templates";
import { beforeApproval } from "../dash/model";
import { useIssuePhrase, useIssueWords } from "../dash/Panel";
import { Count, Summary, useRunState, type Column } from "../dash/Summary";
import { useReportCrumbs } from "../fmt";
import { useReportsSource } from "../load";
import { useTableMoney } from "./nb";
import { useMoreSource } from "./load";

/** X26: the period's figures for a board; each repeats its own report. */
export function BoardPackScreen() {
  const { board } = useMoreSource();
  const src = useReportsSource();
  const { data, state } = useDemo();
  const m = useTableMoney();
  const words = useIssueWords();
  const phrase = useIssuePhrase();
  const run = useRunState();
  const h = data.headline();
  const sep = src.months.at(-2)!;
  const b = beforeApproval(data, state);
  const w = words(b);
  const row = (measure: string) => board.rows.find((r) =>
    r.measure.startsWith(measure));
  const amount = (measure: string): bigint => row(measure)?.amount ?? 0n;
  const people = row("On the October payroll");
  const cost = row("Gross plus employer cost");
  const columns: Column[] = [
    { id: "changed", title: "What changed", points: [
      { key: "gross", figure: <Money value={h.grossTotalFils}
        tween={false} />, text: "October gross pay",
      meta: <><Money value={fils(h.grossTotalFils - sep.gross)} size="sm"
        signed tween={false} /> against September</> },
      { key: "ytd", figure: <Money value={board.ytdGross} tween={false} />,
        text: "Gross pay, January to October" },
      { key: "people", figure: <Count n={Number(people?.text ?? 0)} />,
        text: "People on the October payroll" },
    ] },
    { id: "decide", title: "Needs a decision", points: [
      { key: "run", text: "October pay run", state: run,
        meta: run.meta },
      { key: "stops", figure: <Count n={b.stops} unit={w.unit} />,
        text: "Before sign-off", meta: w.sub },
    ] },
    { id: "risk", title: "At risk", points: [
      { key: "gratuity", figure: <Money value={fils(amount("Gratuity"))}
        tween={false} />, text: "Gratuity if everyone left today",
      meta: "An estimate, not a booked amount" },
      { key: "loans", figure: <Money value={fils(amount("Loans"))}
        tween={false} />, text: "Loans and advances still owed" },
      { key: "cost", figure: <Money value={fils(cost?.amount ?? 0n)}
        tween={false} />, text: "Gross plus the employer cost we can " +
        "work out", meta: "Partial: no pension figure for UAE nationals" },
    ] },
  ];
  return (
    <ReportPage title="Board report" period={board.period}
      crumbs={useReportCrumbs()}
      chart={<Summary label="The period in brief" columns={columns} />}
      columns={[{ label: "Measure" }, { label: "Note" },
        { label: "Figure", end: true }]}
      rows={board.rows.map((r) => [`${r.topic}: ${r.measure}`, r.note,
        r.measure === "Problems before sign-off" ? phrase(b)
          : r.amount !== null ? m(r.amount) : (r.text ?? "")])}
      csvName="board-pack-2026-10.csv" note={board.note} />
  );
}
