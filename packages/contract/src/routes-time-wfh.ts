import {
  ALL_ROLES,
  OWNER,
  PAYROLL,
  ten,
  type RouteDef,
} from "./route-def";
import {
  WfhConsent,
  WfhConsentCreate,
  WfhNotice,
  WfhNoticePublish,
  WfhSettings,
  WfhSettingsUpdate,
  WfhStatus,
  WfhWithdraw,
  WfhWithdrawResult,
} from "./time-wfh";

/** Plan 9 Task 9: WFH settings, notice, consent, pause. */
export const TIME_WFH_ROUTES: readonly RouteDef[] = [
  ten(ALL_ROLES, { id: "getWfhSettings", method: "GET",
    path: "/v1/wfh/settings", response: WfhSettings }),
  ten(OWNER, { id: "updateWfhSettings", method: "PUT",
    path: "/v1/wfh/settings", body: WfhSettingsUpdate,
    response: WfhSettings, mfa: true }),
  ten(PAYROLL, { id: "publishWfhNotice", method: "POST",
    path: "/v1/wfh/notices", body: WfhNoticePublish, response: WfhNotice,
    status: 201 }),
  ten(ALL_ROLES, { id: "getCurrentWfhNotice", method: "GET",
    path: "/v1/wfh/notices/current", response: WfhNotice }),
  ten(ALL_ROLES, { id: "recordWfhConsent", method: "POST",
    path: "/v1/wfh/consent", body: WfhConsentCreate,
    response: WfhConsent }),
  ten(ALL_ROLES, { id: "withdrawWfhConsent", method: "POST",
    path: "/v1/wfh/consent/withdraw", body: WfhWithdraw,
    response: WfhWithdrawResult }),
  ten(ALL_ROLES, { id: "getWfhStatus", method: "GET",
    path: "/v1/wfh/me/status", response: WfhStatus }),
  ten(ALL_ROLES, { id: "pauseWfh", method: "POST",
    path: "/v1/wfh/me/pause", response: WfhStatus }),
  ten(ALL_ROLES, { id: "resumeWfh", method: "POST",
    path: "/v1/wfh/me/resume", response: WfhStatus }),
];
