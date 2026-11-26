import { Company, CompanyUpdate, SignupRequest } from "./company";
import { CompanyUserList } from "./lists";
import { Health, IdParams, NoContent } from "./primitives";
import { ALL_ROLES, OWNER, pub, ten, usr, type RouteDef } from "./route-def";
import {
  AcceptInviteRequest,
  CompanyUser,
  InviteRequest,
  InviteResponse,
  LoginRequest,
  LoginResponse,
  Me,
  MfaConfirmRequest,
  MfaEnrolResponse,
  RoleChange,
} from "./user";

export const ACCOUNT_ROUTES: readonly RouteDef[] = [
  pub({ id: "signup", method: "POST", path: "/v1/signup",
    body: SignupRequest, response: LoginResponse, status: 201 }),
  pub({ id: "login", method: "POST", path: "/v1/auth/login",
    body: LoginRequest, response: LoginResponse }),
  pub({ id: "acceptInvite", method: "POST",
    path: "/v1/auth/accept-invite", body: AcceptInviteRequest,
    response: LoginResponse }),
  pub({ id: "health", method: "GET", path: "/v1/health",
    response: Health }),
  usr({ id: "logout", method: "POST", path: "/v1/auth/logout",
    response: NoContent, status: 204 }),
  usr({ id: "getMe", method: "GET", path: "/v1/me", response: Me }),
  usr({ id: "enrolMfa", method: "POST", path: "/v1/auth/mfa/enrol",
    response: MfaEnrolResponse }),
  usr({ id: "confirmMfa", method: "POST", path: "/v1/auth/mfa/confirm",
    body: MfaConfirmRequest, response: Me }),
  ten(ALL_ROLES, { id: "getCompany", method: "GET", path: "/v1/company",
    response: Company }),
  ten(OWNER, { id: "updateCompany", method: "PATCH",
    path: "/v1/company", body: CompanyUpdate, response: Company }),
  ten(OWNER, { id: "listUsers", method: "GET", path: "/v1/users",
    response: CompanyUserList }),
  ten(OWNER, { id: "changeUserRole", method: "PATCH",
    path: "/v1/users/{id}", params: IdParams, body: RoleChange,
    response: CompanyUser, mfa: true }),
  ten(OWNER, { id: "inviteUser", method: "POST",
    path: "/v1/users/invite", body: InviteRequest,
    response: InviteResponse, status: 201 }),
];
