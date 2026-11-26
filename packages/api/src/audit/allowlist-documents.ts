import {
  AllowedMime,
  DocumentType,
  EMIRATISATION_OVERRIDABLE,
  Lang,
  LetterKind,
  RetentionClass,
  Role,
} from "@payroll/contract";

/**
 * Plan 7 audit keys: ids, types, counts and closed sets only. Never a
 * file name, document number, merge value, letter input, reviewer
 * name or template text.
 */
type Check = (v: unknown) => boolean;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const uuid: Check = (v) => typeof v === "string" && UUID_RE.test(v);
const isInt: Check = (v) => Number.isSafeInteger(v);
const oneOf = (values: readonly string[]): Check => (v) =>
  typeof v === "string" && values.includes(v);
const listOf = (c: Check): Check => (v) => Array.isArray(v) &&
  v.length <= 64 && v.every(c);

/** Dotted keys a settings change may name (closed sets, not text). */
export const SETTINGS_KEYS: readonly string[] = [
  ...DocumentType.options.map((t) => `leadDays.${t}`),
  ...RetentionClass.options.map((t) => `retention.${t}`),
  ...EMIRATISATION_OVERRIDABLE.map((k) => `overrides.${k}`),
  "sectorInScope",
  "skilled", "workPermitValid", "paidViaWps", "gpssaRegistered",
];

export const DOCUMENT_AUDIT_CHECKS: Record<string, Check> = {
  fileId: uuid,
  documentId: uuid,
  templateId: uuid,
  letterId: uuid,
  versionId: uuid,
  mime: oneOf(AllowedMime.options),
  type: oneOf(DocumentType.options),
  kind: oneOf(LetterKind.options),
  lang: oneOf(Lang.options),
  templateVersion: isInt,
  sha256: (v) => typeof v === "string" && /^[0-9a-f]{64}$/.test(v),
  settingsChanged: listOf(oneOf(SETTINGS_KEYS)),
  allStaff: (v) => typeof v === "boolean",
  departmentCount: isInt,
  employeeCount: isInt,
  roles: listOf(oneOf(Role.options)),
};
