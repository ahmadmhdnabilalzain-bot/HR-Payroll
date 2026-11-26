import { randomBytes as nodeRandomBytes, randomUUID } from "node:crypto";
import { notConfiguredPorts } from "./channels/not-configured";
import type { ChannelPorts } from "./channels/ports";
import { keyringFromKey, type Keyring } from "./crypto/keyring";
import type { Db } from "./db/db";
import { notConfiguredAccess, type AccessPort } from "./ports/access";
import { notConnectedCalendar, type CalendarPort } from "./ports/calendar";
import {
  notConfiguredDocuments,
  type DocumentPort,
} from "./ports/documents";
import { nullReceiptReader, type ReceiptReader } from "./receipts/reader";
import type { BlobStore } from "./storage/blob";

/** One structured log line. Never a request or response body. */
export type Logger = (line: Record<string, unknown>) => void;

/** Everything with side effects, injected so tests control it. */
export interface AppDeps {
  db: Db;
  now: () => Date;
  newId: () => string;
  randomBytes: (n: number) => Uint8Array;
  keyring: Keyring;
  log: Logger;
  passwordCost: { N: number };
  /** Plan 8 ports (Rulings 17 to 19): "not configured" by default. */
  calendar: CalendarPort;
  documents: DocumentPort;
  access: AccessPort;
  /** Encrypted receipt files. */
  blobs: BlobStore;
  /** OCR port (suggestions only). */
  receiptReader: ReceiptReader;
  /** Plan 13: email, WhatsApp, inbound mail, OIDC, HTTP and DNS. */
  channels: ChannelPorts;
}

/** What handlers get: everything but the raw database. */
export type HandlerDeps = Omit<AppDeps, "db">;

/** scrypt N = 2^16 for production (128 * N * r = 64 MiB per hash). */
export const PRODUCTION_PASSWORD_COST = { N: 65536 };

/** The real clock, ids, randomness and stdout JSON log. */
export function systemDeps(db: Db, kek: Uint8Array, blobs: BlobStore,
  channels?: ChannelPorts): AppDeps {
  const randomBytes = (n: number) => new Uint8Array(nodeRandomBytes(n));
  return {
    db,
    now: () => new Date(),
    newId: () => randomUUID(),
    randomBytes,
    keyring: keyringFromKey(kek, randomBytes),
    log: (line) => process.stdout.write(`${JSON.stringify(line)}\n`),
    passwordCost: PRODUCTION_PASSWORD_COST,
    calendar: notConnectedCalendar,
    documents: notConfiguredDocuments,
    access: notConfiguredAccess,
    blobs,
    receiptReader: nullReceiptReader,
    channels: channels ?? notConfiguredPorts({ publicApiBaseUrl: null,
      publicAppBaseUrl: null }),
  };
}
