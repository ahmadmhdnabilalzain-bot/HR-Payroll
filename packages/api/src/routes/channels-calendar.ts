import {
  createFeed,
  listFeeds,
  revokeFeed,
  serveFeed,
} from "../calendar/feeds";
import type { AppDeps } from "../deps";
import { register, type App } from "../http/context";

export function registerCalendarRoutes(app: App, deps: AppDeps): void {
  register(app, deps, "listCalendarFeeds", listFeeds);
  register(app, deps, "createCalendarFeed", createFeed);
  register(app, deps, "revokeCalendarFeed", revokeFeed);
  register(app, deps, "getCalendarFeed", serveFeed);
}
