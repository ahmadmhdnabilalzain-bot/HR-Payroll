import { useDemo } from "../demo/state";
import type { ViewProps } from "../views";
import { Approvals } from "./Approvals";
import { Departments } from "./Departments";
import { EmployeeHome } from "./EmployeeHome";
import { Expiries } from "./Expiries";
import { Inbox } from "./inbox/Inbox";
import { NoticesPage, TasksPage } from "./inbox/InboxPages";
import { IssueList } from "./IssueList";
import { ItHome } from "./ItHome";
import { MakeUp } from "./MakeUp";
import { ManagerHome } from "./ManagerHome";
import { PayRunHero } from "./PayRunHero";
import { PeopleStrip } from "./PeopleStrip";
import { Setup } from "./Setup";
import s from "./Home.module.css";

/**
 * Home, per role. HR and the GM: can October be paid, and what is the
 * one next step (the sentence leads, the figure supports it, progress,
 * at most three issues, approvals). The IT manager: access, connections
 * and the audit chain. The team manager: the requests waiting for them
 * and their team today. The employee: their own pay day, payslip and
 * leave. Only HR and the GM see company pay. Every Home ends with the
 * role's tasks and notices (`#/home/tasks`, `#/home/notices`).
 */
export function Home(p: Partial<ViewProps>) {
  const { state } = useDemo();
  const page = p.rest?.[0];
  if (page === "tasks") return <TasksPage />;
  if (page === "notices") return <NoticesPage />;
  if (state.role === "employee") return <EmployeeHome />;
  if (state.role === "manager") return <ManagerHome />;
  if (state.role === "it") return <ItHome />;
  return (
    <div className={s.page}>
      <PayRunHero />
      <PeopleStrip />
      <div className={s.grid}>
        <IssueList />
        <Approvals />
      </div>
      <div className={s.below}>
        <MakeUp />
        <div className={s.side}>
          <Setup />
          <Expiries />
        </div>
      </div>
      <Inbox />
      <Departments />
    </div>
  );
}
