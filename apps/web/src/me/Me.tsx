import type { ViewProps } from "../views";
import { Cover } from "../home/extra/Cover";
import { MyDocuments } from "./MyDocuments";
import { MyLeave, MyRequests } from "./MyLeave";
import { MyPayslips } from "./MyPayslips";
import { MyProfile } from "./MyProfile";

/**
 * `#/me/<page>`: the viewer's own pages (WP10, map rows E02 to E07):
 * payslips, documents, leave, requests and profile. Each reads the
 * person the current role stands for, never anyone else.
 */
export function Me(p: ViewProps) {
  switch (p.rest[0]) {
    case "documents": return <MyDocuments />;
    case "leave": return <MyLeave />;
    case "requests": return <MyRequests />;
    case "profile": return <MyProfile />;
    case "cover": return <Cover />;
    default: return <MyPayslips />;
  }
}
