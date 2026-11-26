import { createCipheriv, createDecipheriv } from "node:crypto";

/**
 * Field encryption: one AES-256-GCM data key (DEK) per company, wrapped
 * by the master key (KEK). Cipher text is `v1.<base64url iv|tag|ct>`.
 * AAD is `<companyId>:<table>:<column>:<rowId>`, so a value cannot be
 * moved to another row, column or company.
 */
export interface Keyring {
  wrapNewDek(companyId: string): { dekWrapped: string };
  encrypt(dekWrapped: string, aad: string, plain: string): string;
  decrypt(dekWrapped: string, aad: string, cipher: string): string;
  encryptGlobal(aad: string, plain: string): string;
  decryptGlobal(aad: string, cipher: string): string;
}

const IV_LEN = 12;
const TAG_LEN = 16;

type Random = (n: number) => Uint8Array;

function seal(key: Uint8Array, aad: string, plain: Uint8Array,
  iv: Uint8Array): string {
  const c = createCipheriv("aes-256-gcm", key, iv);
  c.setAAD(Buffer.from(aad, "utf8"));
  const ct = Buffer.concat([c.update(plain), c.final()]);
  const packed = Buffer.concat([iv, c.getAuthTag(), ct]);
  return `v1.${packed.toString("base64url")}`;
}

function open(key: Uint8Array, aad: string, cipher: string): Buffer {
  if (!cipher.startsWith("v1.")) throw new Error("unknown cipher format");
  const packed = Buffer.from(cipher.slice(3), "base64url");
  const d = createDecipheriv("aes-256-gcm", key,
    packed.subarray(0, IV_LEN));
  d.setAAD(Buffer.from(aad, "utf8"));
  d.setAuthTag(packed.subarray(IV_LEN, IV_LEN + TAG_LEN));
  return Buffer.concat([d.update(packed.subarray(IV_LEN + TAG_LEN)),
    d.final()]);
}

const dekAad = (companyId: string) => `${companyId}:dek`;

function companyOf(aad: string): string {
  const id = aad.split(":")[0];
  if (id === undefined || id === "") throw new Error("AAD has no company");
  return id;
}

export function keyringFromKey(kek: Uint8Array, random: Random): Keyring {
  if (kek.length !== 32) throw new Error("master key must be 32 bytes");
  const unwrap = (wrapped: string, aad: string) =>
    open(kek, dekAad(companyOf(aad)), wrapped);
  return {
    wrapNewDek: (companyId) => ({ dekWrapped: seal(kek, dekAad(companyId),
      random(32), random(IV_LEN)) }),
    encrypt: (wrapped, aad, plain) => seal(unwrap(wrapped, aad), aad,
      Buffer.from(plain, "utf8"), random(IV_LEN)),
    decrypt: (wrapped, aad, cipher) =>
      open(unwrap(wrapped, aad), aad, cipher).toString("utf8"),
    encryptGlobal: (aad, plain) => seal(kek, `global:${aad}`,
      Buffer.from(plain, "utf8"), random(IV_LEN)),
    decryptGlobal: (aad, cipher) =>
      open(kek, `global:${aad}`, cipher).toString("utf8"),
  };
}
