import type { z } from "zod";
import type { Role } from "./roles";

export type Method = "GET" | "POST" | "PUT" | "PATCH";
export type Auth = "public" | "user" | "tenant";

export interface RouteDef {
  id: string;
  method: Method;
  path: string;
  auth: Auth;
  roles: readonly Role[];
  mfa: boolean;
  params?: z.ZodObject;
  query?: z.ZodObject;
  body?: z.ZodType;
  /** Lower-case header names, as Hono reports them. */
  headers?: z.ZodObject;
  response: z.ZodType;
  status: 200 | 201 | 204;
  /**
   * text/plain: a text attachment. text/csv-optional: JSON, or CSV
   * when the query has `format=csv`. binary: raw bytes with the stored
   * content type, always as an attachment. text/calendar: an ICS feed.
   */
  contentType?: "text/plain" | "text/csv-optional" | "binary" |
    "text/calendar";
  /** Request body limit in bytes when above the default 1 MiB. */
  bodyLimit?: number;
  /**
   * The handler gets the request text as `ctx.rawBody` (signed
   * webhooks); a `body` schema, if any, applies to its JSON.
   */
  rawBody?: boolean;
}

type Spec = Omit<RouteDef, "auth" | "roles" | "mfa" | "status"> & {
  mfa?: boolean;
  status?: 200 | 201 | 204;
};

export const ALL_ROLES: readonly Role[] = [
  "owner", "hr", "manager", "employee",
];
export const DECIDERS: readonly Role[] = ["owner", "hr", "manager"];
export const PAYROLL: readonly Role[] = ["owner", "hr"];
export const OWNER: readonly Role[] = ["owner"];

function build(auth: Auth, roles: readonly Role[], s: Spec): RouteDef {
  return { ...s, auth, roles, mfa: s.mfa ?? false, status: s.status ?? 200 };
}

export const pub = (s: Spec): RouteDef => build("public", [], s);
export const usr = (s: Spec): RouteDef => build("user", [], s);
export const ten = (roles: readonly Role[], s: Spec): RouteDef =>
  build("tenant", roles, s);
