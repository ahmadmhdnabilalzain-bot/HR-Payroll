import type { ViewProps } from "../views";
import { MeMore, MORE_PAGES } from "./MeMore";
import { Cover } from "../home/extra/Cover";
import { MyExpenses } from "../home/extra/MyExpenses";
import { MyKpis } from "../home/extra/MyKpis";
import { TeamReviews } from "../home/extra/TeamReviews";
import { MyTimeCard } from "../time/extra/MyTimeCard";
import { ReportIncident } from "../time/finish/ReportIncident";
import { MyDocuments } from "./MyDocuments";
import { MySign } from "../people/esign/Esign";
import { MyLeave, MyRequests } from "./MyLeave";
import { MyPayslips } from "./MyPayslips";
import { MyProfile } from "./MyProfile";

/**
 * `#/me/<page>`: the viewer's own pages (WP10, map rows E02 to E07):
 * payslips, documents, leave, requests and profile. Each reads the
 * person the current role stands for, never anyone else.
 */
export function Me(p: ViewProps) {
  if (MORE_PAGES.includes(p.rest[0] ?? "")) return <MeMore {...p} />;
  switch (p.rest[0]) {
    case "documents": return <MyDocuments />;
    case "sign": return <MySign />;
    case "leave": return <MyLeave />;
    case "requests": return <MyRequests />;
    case "profile": return <MyProfile />;
    case "cover": return <Cover />;
    case "expenses": return <MyExpenses />;
    case "timecard": return <MyTimeCard />;
    case "kpis": return <MyKpis />;
    case "report-incident": return <ReportIncident />;
    case "team-reviews": return <TeamReviews />;
    default: return <MyPayslips />;
  }
}
