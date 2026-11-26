import type { ViewProps } from "../views";
import { MyAccess } from "./MyAccess";
import { MyAsks, MyTicket } from "./MyAsks";
import { MyCalendar } from "./MyCalendar";
import { MyChange } from "./MyChange";
import { MyHelp } from "./MyHelp";

/** The pages WP14 added to Me: change details, requests and letters,
 * calendar, access request and help (map rows E06, E07, E12, E15, H12). */
export const MORE_PAGES = ["change-details", "hr-requests", "calendar",
  "access-request", "help"];

export function MeMore(p: ViewProps) {
  switch (p.rest[0]) {
    case "change-details": return <MyChange />;
    case "hr-requests":
      return p.rest[1] === undefined ? <MyAsks />
        : <MyTicket id={p.rest[1]} />;
    case "calendar": return <MyCalendar />;
    case "access-request": return <MyAccess />;
    default: return <MyHelp />;
  }
}
