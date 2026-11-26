import { EngineError, type Fils } from "@payroll/engine";
import { formatAmount, padId } from "./format";
import type { SifLayout } from "./layout";

export interface EdrInput {
  readonly personId: string;
  readonly routingCode: string;
  readonly account: string;
  readonly payStart: string;
  readonly payEnd: string;
  readonly days: number;
  readonly fixed: Fils;
  readonly variable: Fils;
  readonly unpaidLeaveDays: number;
}

export interface EvpInput {
  readonly personId: string;
  readonly routingCode: string;
  readonly housing: Fils;
  readonly conveyance: Fils;
  readonly medical: Fils;
  readonly passage: Fils;
  readonly overtime: Fils;
  readonly otherAllowances: Fils;
  readonly leaveEncashment: Fils;
}

export interface ScrInput {
  readonly employerId: string;
  readonly bankRoutingCode: string;
  readonly createdDate: string;
  readonly createdTime: string;
  readonly month: string;
  readonly edrCount: number;
  readonly total: Fils;
  readonly reference?: string;
}

/** Every value written to a line passes through here. */
function field(value: string, max?: number): string {
  const detail = { value };
  if (value.includes(",")) {
    throw new EngineError("FIELD_HAS_COMMA", "Field contains a comma", detail);
  }
  if (/[^\x20-\x7e]/.test(value)) {
    throw new EngineError(
      "FIELD_NOT_ASCII",
      "Field is not printable ASCII",
      detail,
    );
  }
  if (max !== undefined && value.length > max) {
    throw new EngineError("FIELD_TOO_LONG", "Field is too long", {
      value,
      max: String(max),
    });
  }
  return value;
}

const text = (v: string): string => field(v);
const amount = (f: Fils): string => text(formatAmount(f));
function count(n: number): string {
  if (!Number.isInteger(n) || n < 0) {
    throw new EngineError("INVALID_COUNT", "Count must be a whole number", {
      value: String(n),
    });
  }
  return String(n);
}

function id(value: string, len: number): string {
  if (!/^[0-9]+$/.test(value)) {
    throw new EngineError("ID_FORMAT", "Id must be digits only", { value });
  }
  return field(padId(value, len), len);
}

function routing(value: string, len: number): string {
  if (!/^[0-9]+$/.test(value) || value.length !== len) {
    throw new EngineError("ROUTING_FORMAT", "Routing code must be digits", {
      value,
      length: String(len),
    });
  }
  return field(value, len);
}

function account(value: string, len: number): string {
  if (value.length !== len) {
    throw new EngineError("ACCOUNT_LENGTH", "Account length is wrong", {
      value,
      length: String(len),
    });
  }
  return field(value, len);
}

const join = (parts: readonly string[]): string => parts.join(",");

export function edrLine(e: EdrInput, l: SifLayout): string {
  return join([
    "EDR",
    id(e.personId, l.personIdLength),
    routing(e.routingCode, l.routingLength),
    account(e.account, l.accountLength),
    text(e.payStart),
    text(e.payEnd),
    count(e.days),
    amount(e.fixed),
    amount(e.variable),
    count(e.unpaidLeaveDays),
  ]);
}

export function evpLine(e: EvpInput, l: SifLayout): string {
  return join([
    "EVP",
    id(e.personId, l.personIdLength),
    routing(e.routingCode, l.routingLength),
    amount(e.housing),
    amount(e.conveyance),
    amount(e.medical),
    amount(e.passage),
    amount(e.overtime),
    amount(e.otherAllowances),
    amount(e.leaveEncashment),
  ]);
}

export function scrLine(s: ScrInput, l: SifLayout): string {
  return join([
    "SCR",
    id(s.employerId, l.employerIdLength),
    routing(s.bankRoutingCode, l.routingLength),
    text(s.createdDate),
    text(s.createdTime),
    text(s.month),
    count(s.edrCount),
    amount(s.total),
    text(l.currency),
    field(s.reference ?? "", l.referenceMaxLength),
  ]);
}
