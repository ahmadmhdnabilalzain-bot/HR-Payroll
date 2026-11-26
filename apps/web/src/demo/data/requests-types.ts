import type {
  AccessRequest,
  CalendarMark,
  HelpTicket,
  ProfileChange,
  TicketEntitlement,
  TicketMessage,
  TravelRequest,
} from "@payroll/demo-data";

/**
 * Requests (WP14): profile changes, travel and tickets, the help desk,
 * access requests and the calendar feed, as the screens read them.
 * Built in requests.ts, which only adapter.ts imports. The shapes are
 * the package's own, re-exported so screens never import the package.
 */
export type {
  AccessRequest,
  CalendarMark,
  HelpTicket,
  ProfileChange,
  TicketEntitlement,
  TicketMessage,
  TravelRequest,
};

export interface RequestsData {
  asOf: string;
  /** The HR officer the queues are assigned to. */
  ownerId: string;
  changeFields: readonly { id: string; label: string; proof: string }[];
  profileChanges(): ProfileChange[];
  ticketBasis: string;
  entitlements(): TicketEntitlement[];
  travelRequests(): TravelRequest[];
  ticketCategories: readonly string[];
  tickets(): HelpTicket[];
  requestableRoles: readonly { id: string; label: string }[];
  accessRequests(): AccessRequest[];
  /** Marks that touch a month (YYYY-MM). */
  marks(month: string): CalendarMark[];
}
