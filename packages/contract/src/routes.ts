import type { RouteDef } from "./route-def";
import { ACCOUNT_ROUTES } from "./routes-account";
import { CHANNEL_ROUTES } from "./routes-channels";
import { DOCUMENT_ROUTES } from "./routes-documents";
import { EXPENSE_ROUTES } from "./routes-expenses";
import { HR_ROUTES } from "./routes-hr";
import { PAY_ROUTES } from "./routes-pay";
import { PEOPLE_ROUTES } from "./routes-people";
import { LEAVE_ATTENDANCE_ROUTES, TIME_ROUTES } from "./routes-time";

export type { Auth, Method, RouteDef } from "./route-def";
export { CHANNEL_ROUTES } from "./routes-channels";
export { DOCUMENT_ROUTES, HR_ROUTES };
export { LEAVE_ATTENDANCE_ROUTES, TIME_ROUTES } from "./routes-time";

/** Plan 3's and Plan 6's routes. */
export const CORE_ROUTES: readonly RouteDef[] = [
  ...ACCOUNT_ROUTES,
  ...PEOPLE_ROUTES,
  ...LEAVE_ATTENDANCE_ROUTES,
  ...PAY_ROUTES,
  ...EXPENSE_ROUTES,
];

/**
 * Route groups, one per plan area, in registration order. A plan adds
 * its group here; `ROUTES` is their concatenation.
 */
export const ROUTE_GROUPS: readonly (readonly RouteDef[])[] = [
  CORE_ROUTES,
  HR_ROUTES,
  DOCUMENT_ROUTES,
  TIME_ROUTES,
  CHANNEL_ROUTES,
];

/** Every HTTP route of the API. The server registers exactly these. */
export const ROUTES: readonly RouteDef[] = ROUTE_GROUPS.flat();

export function routeById(id: string): RouteDef {
  const r = ROUTES.find((x) => x.id === id);
  if (r === undefined) throw new Error(`unknown route id ${id}`);
  return r;
}
