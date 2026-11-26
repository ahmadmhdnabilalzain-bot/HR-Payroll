import { Money } from "../../ui/Money";
import { RecordTabs } from "../../ui/templates";
import type { StructureData } from "./data";
import { Rows, useMaySeePay } from "./ui";

/** S01: the jobs in use and the pay grades behind them. */
export function Jobs(p: { d: StructureData }) {
  const { d } = p;
  const pay = useMaySeePay();
  const grade = (n: number) => d.grades.find((g) => g.grade === n)!;
  const people = d.jobs.reduce((n, j) => n + j.holderIds.length, 0);
  return (
    <RecordTabs title="Jobs and grades"
      lede="The job titles in use and the pay grades behind them. A
        grade sets the range a person's basic pay sits in."
      stats={[{ label: "Jobs", value: String(d.jobs.length) },
        { label: "Grades", value: String(d.grades.length) },
        { label: "People in a job", value: String(people) }]}
      tabs={[
        { id: "jobs", label: "Jobs", render: () => (
          <Rows label="Jobs" rows={d.jobs.map((j) => ({ key: j.jobKey,
            title: j.title,
            help: `${j.departmentText}. ${j.display.grades}, ${
              j.display.headcount}`,
            value: pay ? (
              <span>
                <Money value={grade(j.gradeMin).basicMin} size="sm" />
                {" to "}
                <Money value={grade(j.gradeMax).basicMax} size="sm" />
              </span>) : "Pay not shown" }))} />) },
        { id: "grades", label: "Grades", render: () => (
          <Rows label="Grades" rows={d.grades.map((g) => ({
            key: String(g.grade), title: `Grade ${g.grade}`,
            help: pay ? (
              <span>{g.display.headcount}. Transport{" "}
                <Money value={g.transport} size="sm" /> a month</span>)
              : g.display.headcount,
            value: pay ? (
              <span>
                <Money value={g.basicMin} size="sm" />
                {" to "}
                <Money value={g.basicMax} size="sm" />
              </span>) : "Pay not shown" }))} />) },
      ]} />
  );
}
