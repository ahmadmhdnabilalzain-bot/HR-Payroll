import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdfSync,
} from "node:crypto";

/**
 * Field encryption: one AES-256-GCM data key (DEK) per company, wrapped
 * by a key derived from the master key (KEK). Cipher text is
 * `v1.<keyId>.<base64url iv|tag|ct>`; the key id names the master key
 * so a later rotation can tell old from new. AAD is
 * `<companyId>:<table>:<column>:<rowId>`, so a value cannot be moved
 * to another row, column or company.
 */
/** One company's data key, unwrapped once. */
export interface CompanyKey {
  encrypt(aad: string, plain: string): string;
  decrypt(aad: string, cipher: string): string;
  /** Keyed fingerprint (HMAC-SHA256 under a key derived from the DEK). */
  mac(label: string, data: string): string;
}

export interface Keyring {
  wrapNewDek(companyId: string): { dekWrapped: string };
  companyKey(dekWrapped: string, companyId: string): CompanyKey;
  encrypt(dekWrapped: string, aad: string, plain: string): string;
  decrypt(dekWrapped: string, aad: string, cipher: string): string;
  encryptGlobal(aad: string, plain: string): string;
  decryptGlobal(aad: string, cipher: string): string;
}

const IV_LEN = 12;
const TAG_LEN = 16;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type Random = (n: number) => Uint8Array;

function seal(key: Uint8Array, kid: string, aad: string,
  plain: Uint8Array, iv: Uint8Array): string {
  const c = createCipheriv("aes-256-gcm", key, iv);
  c.setAAD(Buffer.from(aad, "utf8"));
  const ct = Buffer.concat([c.update(plain), c.final()]);
  const packed = Buffer.concat([iv, c.getAuthTag(), ct]);
  return `v1.${kid}.${packed.toString("base64url")}`;
}

function open(key: Uint8Array, kid: string, aad: string,
  cipher: string): Buffer {
  const [v, id, body] = cipher.split(".");
  if (v !== "v1" || body === undefined) {
    throw new Error("unknown cipher format");
  }
  if (id !== kid) throw new Error("cipher made with another master key");
  const packed = Buffer.from(body, "base64url");
  if (packed.length < IV_LEN + TAG_LEN) throw new Error("cipher too short");
  // The tag length is pinned: a shorter tag is never accepted.
  const d = createDecipheriv("aes-256-gcm", key,
    packed.subarray(0, IV_LEN), { authTagLength: TAG_LEN });
  d.setAAD(Buffer.from(aad, "utf8"));
  d.setAuthTag(packed.subarray(IV_LEN, IV_LEN + TAG_LEN));
  return Buffer.concat([d.update(packed.subarray(IV_LEN + TAG_LEN)),
    d.final()]);
}

function companyOf(aad: string): string {
  const id = aad.split(":")[0] ?? "";
  if (!UUID.test(id)) throw new Error("AAD must start with a company id");
  return id;
}

/** HKDF-SHA256 subkeys: one for wrapping DEKs, one for global values. */
function subkey(kek: Uint8Array, info: string): Uint8Array {
  return new Uint8Array(hkdfSync("sha256", kek, new Uint8Array(0),
    `payroll:${info}`, 32));
}

export function keyringFromKey(kek: Uint8Array, random: Random): Keyring {
  if (kek.length !== 32) throw new Error("master key must be 32 bytes");
  const kid = createHash("sha256").update(kek).digest("hex").slice(0, 8);
  const wrapKey = subkey(kek, "kek-wrap");
  const globalKey = subkey(kek, "kek-global");
  const dekAad = (aad: string) => `${companyOf(aad)}:dek`;
  const unwrap = (wrapped: string, aad: string) =>
    open(wrapKey, kid, dekAad(aad), wrapped);
  const companyKey = (wrapped: string, companyId: string): CompanyKey => {
    const dek = unwrap(wrapped, companyId);
    const macKey = subkey(dek, "company-mac");
    const own = (aad: string) => {
      if (companyOf(aad) !== companyId) throw new Error("AAD company");
      return aad;
    };
    return {
      encrypt: (aad, plain) => seal(dek, kid, own(aad),
        Buffer.from(plain, "utf8"), random(IV_LEN)),
      decrypt: (aad, cipher) =>
        open(dek, kid, own(aad), cipher).toString("utf8"),
      mac: (label, data) => createHmac("sha256", macKey)
        .update(`${label}:${data}`, "utf8").digest("hex"),
    };
  };
  return {
    wrapNewDek: (companyId) => ({ dekWrapped: seal(wrapKey, kid,
      dekAad(companyId), random(32), random(IV_LEN)) }),
    companyKey,
    encrypt: (wrapped, aad, plain) => seal(unwrap(wrapped, aad), kid, aad,
      Buffer.from(plain, "utf8"), random(IV_LEN)),
    decrypt: (wrapped, aad, cipher) =>
      open(unwrap(wrapped, aad), kid, aad, cipher).toString("utf8"),
    encryptGlobal: (aad, plain) => seal(globalKey, kid, aad,
      Buffer.from(plain, "utf8"), random(IV_LEN)),
    decryptGlobal: (aad, cipher) =>
      open(globalKey, kid, aad, cipher).toString("utf8"),
  };
}
