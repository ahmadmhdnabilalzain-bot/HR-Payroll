import { z } from "zod";
import { Id, listOf, Timestamp } from "./primitives";

export const FeedScope = z.enum(["my", "team", "company-deadlines"]);
export type FeedScope = z.infer<typeof FeedScope>;

export const CalendarFeed = z.object({
  id: Id,
  scope: FeedScope,
  status: z.enum(["active", "revoked"]),
  createdAt: Timestamp,
  lastFetchedAt: Timestamp.nullable(),
  /** "…" and the token's last 6 characters. */
  urlHint: z.string(),
});
export type CalendarFeed = z.infer<typeof CalendarFeed>;
export const CalendarFeedList = listOf(CalendarFeed);

/** Shown once, at creation. */
export const CalendarFeedCreated = CalendarFeed.extend({ url: z.string() });
export type CalendarFeedCreated = z.infer<typeof CalendarFeedCreated>;

export const CalendarFeedCreate = z.object({ scope: FeedScope });
export type CalendarFeedCreate = z.infer<typeof CalendarFeedCreate>;

export const CALENDAR_FEED_NOTE = "Anyone with this link can see these " +
  "events. Keep it private. Revoke it here if it leaks.";

export const FEED_TOKEN_RE =
  /^cal1\.([0-9a-f]{32})\.([0-9a-f]{32})\.([A-Za-z0-9_-]{43})\.ics$/;

export const CalendarTokenParams = z.object({
  token: z.string().regex(FEED_TOKEN_RE),
});

/** An iCalendar text body (text/calendar). */
export const IcsText = z.string();
