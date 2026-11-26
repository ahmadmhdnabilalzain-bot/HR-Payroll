/** A proposed interview invite; ids and times only. */
export interface CalendarEvent {
  companyId: string;
  interviewId: string;
  startsAt: string;
  endsAt: string;
  attendeeUserIds: string[];
  title: string;
}

export type CalendarResult =
  | { status: "not-connected" }
  | { status: "sent"; externalRef: string };

/**
 * Interview scheduling is an interface (Ruling 17): no calendar is
 * connected yet, so interviews are only stored locally.
 */
export interface CalendarPort {
  proposeEvent(e: CalendarEvent): Promise<CalendarResult>;
}

export const notConnectedCalendar: CalendarPort = {
  proposeEvent: async () => ({ status: "not-connected" }),
};
