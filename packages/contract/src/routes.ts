import type { RouteDef } from "./route-def";
import { ACCOUNT_ROUTES } from "./routes-account";
import { CHANNEL_ROUTES } from "./routes-channels";
import { EXPENSE_ROUTES } from "./routes-expenses";
import { PAY_ROUTES } from "./routes-pay";
import { PEOPLE_ROUTES } from "./routes-people";
import { TIME_ROUTES } from "./routes-time";

export type { Auth, Method, RouteDef } from "./route-def";
export { CHANNEL_ROUTES } from "./routes-channels";

/**
 * Route groups, one per plan area, in registration order. A plan adds
 * its group here; `ROUTES` is their concatenation.
 */
export const ROUTE_GROUPS: readonly (readonly RouteDef[])[] = [
  ACCOUNT_ROUTES,
  PEOPLE_ROUTES,
  TIME_ROUTES,
  PAY_ROUTES,
  EXPENSE_ROUTES,
  CHANNEL_ROUTES,
];

/** Every HTTP route of the API. The server registers exactly these. */
export const ROUTES: readonly RouteDef[] = ROUTE_GROUPS.flat();

export function routeById(id: string): RouteDef {
  const r = ROUTES.find((x) => x.id === id);
  if (r === undefined) throw new Error(`unknown route id ${id}`);
  return r;
}
