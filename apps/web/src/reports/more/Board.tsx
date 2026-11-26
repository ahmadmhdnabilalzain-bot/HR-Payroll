import { Money } from "../../ui/Money";
import { ReportPage } from "../../ui/templates";
import { useTableMoney } from "./nb";
import { useMoreSource } from "./load";

/** X26: the period's figures for a board; each repeats its own report. */
export function BoardPackScreen() {
  const { board } = useMoreSource();
  const m = useTableMoney();
  return (
    <ReportPage title="Board report" period={board.period}
      figure={{ label: "Gross pay, January to October",
        value: <Money value={board.ytdGross} size="lg" tween={false} /> }}
      columns={[{ label: "Measure" }, { label: "Note" },
        { label: "Figure", end: true }]}
      rows={board.rows.map((r) => [`${r.topic}: ${r.measure}`, r.note,
        r.amount !== null ? m(r.amount) : (r.text ?? "")])}
      csvName="board-pack-2026-10.csv" note={board.note} />
  );
}
