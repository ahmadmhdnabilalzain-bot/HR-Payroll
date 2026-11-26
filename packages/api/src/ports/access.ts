/** Revoke the leaver's access in systems outside this app. */
export interface AccessRequest {
  companyId: string;
  exitId: string;
  employeeId: string;
}

export type AccessPortResult =
  | { status: "revoked" }
  | { status: "not-configured" };

/** External revocation is a port (Ruling 19): not configured yet. */
export interface AccessPort {
  revoke(r: AccessRequest): Promise<AccessPortResult>;
}

export const notConfiguredAccess: AccessPort = {
  revoke: async () => ({ status: "not-configured" }),
};
