import {
  AS_OF,
  CHANGE_FIELDS,
  REQUESTABLE_ROLES,
  REQUESTS_OWNER,
  TICKET_BASIS,
  TICKET_CATEGORIES,
  accessRequests,
  calendarMarks,
  helpTickets,
  profileChanges,
  ticketEntitlements,
  travelRequests,
  type DemoCompany,
} from "@payroll/demo-data";
import type { RequestsData } from "./requests-types";

/** The Requests view over the demo company. Imported only by adapter.ts. */
export function adaptRequests(c: DemoCompany): RequestsData {
  return {
    asOf: AS_OF, ownerId: REQUESTS_OWNER, changeFields: CHANGE_FIELDS,
    profileChanges: () => profileChanges(c), ticketBasis: TICKET_BASIS,
    entitlements: () => ticketEntitlements(c),
    travelRequests: () => travelRequests(c),
    ticketCategories: TICKET_CATEGORIES, tickets: () => helpTickets(c),
    requestableRoles: REQUESTABLE_ROLES,
    accessRequests: () => accessRequests(c),
    marks: (ym) => calendarMarks(c, ym),
  };
}
