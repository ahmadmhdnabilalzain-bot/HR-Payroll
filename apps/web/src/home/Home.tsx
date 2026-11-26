import { useDemo } from "../demo/state";
import { Approvals } from "./Approvals";
import { Departments } from "./Departments";
import { EmployeeHome } from "./EmployeeHome";
import { Expiries } from "./Expiries";
import { IssueList } from "./IssueList";
import { ManagerHome } from "./ManagerHome";
import { PayRunHero } from "./PayRunHero";
import { PeopleStrip } from "./PeopleStrip";
import { Setup } from "./Setup";
import { StatusLead } from "./StatusLead";
import s from "./Home.module.css";

/**
 * Home, per role. HR and the GM: can October be paid, and what is the
 * one next step (the sentence leads, the figure supports it, progress,
 * at most three issues, approvals). The team manager: the requests
 * waiting for them and their team's leave. The employee: their own pay
 * day, payslip and leave. Only HR and the GM see company pay.
 */
export function Home() {
  const { state } = useDemo();
  if (state.role === "employee") return <EmployeeHome />;
  if (state.role === "manager") return <ManagerHome />;
  return (
    <div className={s.page}>
      <StatusLead />
      <PeopleStrip />
      <PayRunHero />
      <div className={s.grid}>
        <IssueList />
        <Approvals />
      </div>
      <div className={s.below}>
        <Setup />
        <Expiries />
      </div>
      <Departments />
    </div>
  );
}
