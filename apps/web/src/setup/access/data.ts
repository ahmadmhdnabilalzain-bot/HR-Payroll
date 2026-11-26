import {
  ACCESS_PERMISSIONS,
  ACCESS_ROLES,
  accessApiKeys,
  accessReview,
  accessSettings,
  accessUserRows,
  APPROVAL_RULES,
  AS_OF,
  buildDemoCompany,
  DATA_LOCATION,
  importSample,
  reportDate,
  roleMatrix,
  segregationChecks,
  whoCan,
  type AccessApiKey,
  type AccessReview,
  type AccessUserRow,
  type AccessWebhook,
  type ImportSample,
  type RoleMatrix,
  type SegregationCheck,
  accessWebhooks,
} from "@payroll/demo-data";

/**
 * Everything the Access, Connections and Data screens read, worked out
 * once from the demo company. This file imports the data package, so it
 * is only reached through the lazy chunk (useAccess.ts).
 */
export interface PermissionView {
  id: string;
  label: string;
  area: string;
  /** Names of the roles that hold it. */
  roleLabels: string[];
  people: { employeeId: string; name: string; rolesText: string }[];
}

export interface AccessData {
  asOfText: string;
  users: AccessUserRow[];
  /** Permission ids per user, for the "what they can do" tab. */
  userPermissions: Record<string, string[]>;
  matrix: RoleMatrix;
  roles: { id: string; label: string; description: string; admin: boolean;
    permissionIds: string[]; userCount: number; holders: AccessUserRow[] }[];
  permissions: PermissionView[];
  rules: { id: string; label: string; roleLabel: string; text: string }[];
  checks: SegregationCheck[];
  review: AccessReview;
  reviewerName: string;
  settings: { mfaText: string; ssoText: string };
  keys: AccessApiKey[];
  hooks: (AccessWebhook & { createdText: string })[];
  names: Record<string, string>;
  sample: ImportSample;
  location: typeof DATA_LOCATION;
  /** The sample's people list, as the export file would carry it. */
  usersCsvRows: string[][];
}

export function buildAccessData(): AccessData {
  const c = buildDemoCompany();
  const users = accessUserRows(c);
  const matrix = roleMatrix(c);
  const names = Object.fromEntries(c.employees.map((e) =>
    [e.id, e.fullName]));
  const roles = ACCESS_ROLES.map((r) => ({ id: r.id, label: r.label,
    description: r.description, admin: r.admin,
    permissionIds: [...r.permissions],
    userCount: matrix.roles.find((x) => x.id === r.id)!.userCount,
    holders: users.filter((u) => u.rolesText.split(", ")
      .includes(r.label)) }));
  const permissions = ACCESS_PERMISSIONS.map((p) => ({ id: p.id,
    label: p.label, area: p.area,
    roleLabels: ACCESS_ROLES.filter((r) => r.permissions.includes(p.id))
      .map((r) => r.label), people: whoCan(c, p.id) }));
  const userPermissions = Object.fromEntries(users.map((u) =>
    [u.id, ACCESS_PERMISSIONS.filter((p) => whoCan(c, p.id).some((w) =>
      w.employeeId === u.employeeId)).map((p) => p.id)]));
  const review = accessReview(c);
  return { asOfText: reportDate(AS_OF), users, userPermissions, matrix,
    roles, permissions,
    rules: APPROVAL_RULES.map((r) => ({ id: r.id, label: r.label,
      roleLabel: ACCESS_ROLES.find((x) => x.id === r.roleId)!.label,
      text: r.text })),
    checks: segregationChecks(c), review,
    reviewerName: names[review.byEmployeeId] ?? "", settings:
      accessSettings(c), keys: accessApiKeys(c),
    hooks: accessWebhooks(c).map((h) => ({ ...h,
      createdText: reportDate(h.createdOn) })),
    names, sample: importSample(c), location: DATA_LOCATION,
    usersCsvRows: users.map((u) => [u.name, u.email, u.jobText,
      u.rolesText, u.mfaText, u.lastSignInText]) };
}
