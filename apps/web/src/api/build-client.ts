import type { ApiClient, ApiMethod } from "./client";
import {
  fromWireEmployee,
  fromWirePayRun,
  fromWirePayslip,
  fromWireSifFile,
  toWirePayRunCreate,
  type WireAuditPage,
  type WireEmployee,
  type WirePayRun,
  type WirePayslip,
  type WireSifFile,
} from "./contract";
import type { Transport, WireRequest } from "./transport";

type Items<T> = { items: T[] };

/**
 * The ApiClient over any transport. Bodies arrive already checked
 * against the contract, so the casts below only name what was checked.
 */
export function buildClient(send: Transport): ApiClient {
  const call = <T>(m: ApiMethod, req: WireRequest = {}): Promise<T> =>
    send(m, req) as Promise<T>;
  const items = async <T>(m: ApiMethod, req?: WireRequest) =>
    (await call<Items<T>>(m, req)).items;
  const byId = (id: string): WireRequest => ({ params: { id } });
  return {
    ...accountMethods(call, items),
    ...peopleMethods(call, items, byId),
    ...timeMethods(call, items, byId),
    ...payMethods(call, items, byId),
  };
}

type Call = <T>(m: ApiMethod, req?: WireRequest) => Promise<T>;
type ItemsFn = <T>(m: ApiMethod, req?: WireRequest) => Promise<T[]>;
type ById = (id: string) => WireRequest;

function accountMethods(call: Call, items: ItemsFn) {
  return {
    login: (r) => call("login", { body: r }),
    logout: async () => {
      await call("logout");
    },
    me: () => call("me"),
    mfaEnrol: (password) => call("mfaEnrol", { body: { password } }),
    mfaConfirm: (code, password) => call("mfaConfirm",
      { body: { code, password } }),
    getCompany: () => call("getCompany"),
    updateCompany: (u) => call("updateCompany", { body: u }),
    listUsers: () => items("listUsers"),
    inviteUser: (r) => call("inviteUser", { body: r }),
  } satisfies Partial<ApiClient>;
}

function peopleMethods(call: Call, items: ItemsFn, byId: ById) {
  return {
    listDepartments: () => items("listDepartments"),
    listEmployees: async () =>
      (await items<WireEmployee>("listEmployees")).map(fromWireEmployee),
    getEmployee: async (id) =>
      fromWireEmployee(await call<WireEmployee>("getEmployee", byId(id))),
    revealBank: (id) => call("revealBank", byId(id)),
  } satisfies Partial<ApiClient>;
}

function timeMethods(call: Call, items: ItemsFn, byId: ById) {
  return {
    listLeaveTypes: () => items("listLeaveTypes"),
    listLeaveRequests: async (q = {}) => {
      const { year, ...query } = q;
      const all = await items<{ startDate: string }>("listLeaveRequests",
        { query });
      return (year === undefined ? all : all.filter((r) =>
        r.startDate.startsWith(`${year}-`))) as never;
    },
    createLeaveRequest: (r) => call("createLeaveRequest", { body: r }),
    approveLeave: (id, d) => call("approveLeave", { ...byId(id), body: d }),
    rejectLeave: (id, d) => call("rejectLeave", { ...byId(id), body: d }),
    cancelLeave: (id) => call("cancelLeave", byId(id)),
    listLeaveBalances: (employeeId, year) => items("listLeaveBalances",
      { ...byId(employeeId), query: { year } }),
    listAttendance: (q) => items("listAttendance", { query: q }),
  } satisfies Partial<ApiClient>;
}

function payMethods(call: Call, items: ItemsFn, byId: ById) {
  const run = async (m: ApiMethod, req: WireRequest) =>
    fromWirePayRun(await call<WirePayRun>(m, req));
  const sif = async (m: ApiMethod, req: WireRequest) =>
    fromWireSifFile(await call<WireSifFile>(m, req));
  return {
    listPayRuns: async () =>
      (await items<WirePayRun>("listPayRuns")).map(fromWirePayRun),
    getPayRun: (id) => run("getPayRun", byId(id)),
    createPayRun: (body, key) => run("createPayRun", {
      body: toWirePayRunCreate(body),
      headers: { "idempotency-key": key },
    }),
    approvePayRun: (id) => run("approvePayRun", byId(id)),
    voidPayRun: (id) => run("voidPayRun", byId(id)),
    listPayslips: async (runId) => (await items<WirePayslip>(
      "listPayslips", byId(runId))).map(fromWirePayslip),
    getPayslip: async (id) =>
      fromWirePayslip(await call<WirePayslip>("getPayslip", byId(id))),
    createSif: (runId) => sif("createSif", byId(runId)),
    getSifFile: (id) => sif("getSifFile", byId(id)),
    downloadSif: (id) => call<string>("downloadSif", byId(id)),
    listAuditEvents: async (q = {}) => {
      const page = await call<WireAuditPage>("listAuditEvents",
        { query: q });
      return { events: page.items, nextBefore: page.nextBefore };
    },
    verifyAudit: () => call("verifyAudit"),
  } satisfies Partial<ApiClient>;
}
