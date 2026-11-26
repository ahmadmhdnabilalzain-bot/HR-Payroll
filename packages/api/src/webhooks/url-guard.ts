import { isIP } from "node:net";

const BAD_SUFFIX = [".localhost", ".local", ".internal", ".home.arpa"];

/**
 * Pure: https only, no credentials, port 443, a dotted DNS name (no IP
 * literal, no localhost or private suffix), at most 500 characters.
 */
export function checkWebhookUrl(url: string)
  : { ok: true; host: string } | { ok: false } {
  if (url.length > 500) return { ok: false };
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { ok: false };
  }
  // A trailing dot is the same name (`localhost.`; review M1).
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  const bare = host.replace(/^\[|\]$/g, "");
  const ok = u.protocol === "https:" && u.username === "" &&
    u.password === "" && (u.port === "" || u.port === "443") &&
    isIP(bare) === 0 && host !== "localhost" && host.includes(".") &&
    !BAD_SUFFIX.some((s) => host.endsWith(s));
  return ok ? { ok: true, host } : { ok: false };
}

const V4_BLOCKS: [string, number][] = [["0.0.0.0", 8], ["10.0.0.0", 8],
  ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4]];

const v4 = (ip: string) => ip.split(".").reduce((n, p) =>
  n * 256 + Number(p), 0);

function publicV4(ip: string): boolean {
  const x = v4(ip);
  return !V4_BLOCKS.some(([base, bits]) => {
    const size = 2 ** (32 - bits);
    return Math.floor(x / size) === Math.floor(v4(base) / size);
  });
}

/** Eight 16-bit words; a dotted IPv4 tail becomes the last two. */
function expandV6(text: string): number[] {
  const dotted = /^(.*:)(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(text);
  const ip = dotted === null ? text : `${dotted[1]}${
    ((+dotted[2]! << 8) | +dotted[3]!).toString(16)}:${
    ((+dotted[4]! << 8) | +dotted[5]!).toString(16)}`;
  const [head, tail = ""] = ip.split("::");
  const parts = (s: string) => s === "" ? [] : s.split(":");
  const h = parts(head!);
  const t = parts(tail);
  const fill = ip.includes("::") ? 8 - h.length - t.length : 0;
  return [...h, ...Array(fill).fill("0"), ...t].map((p) => parseInt(p, 16));
}

/** Pure: false for private, loopback, link-local and reserved ranges. */
export function isPublicAddress(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return publicV4(ip);
  if (kind !== 6) return false;
  const low = ip.toLowerCase();
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(low);
  if (mapped !== null) return publicV4(mapped[1]!);
  return publicV6(expandV6(low));
}

const v4Of = (hi: number, lo: number) =>
  `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;

/**
 * IPv6 words. Embedded IPv4 (mapped, NAT64 64:ff9b::/96, 6to4
 * 2002::/16) is judged as IPv4; IPv4-compatible ::/96, NAT64
 * local-use 64:ff9b:1::/48, site-local fec0::/10, Teredo 2001::/32,
 * ULA, link-local, multicast and documentation are refused (M1).
 */
function publicV6(w: number[]): boolean {
  const zero = (a: number, b: number) =>
    w.slice(a, b).every((x) => x === 0);
  if (zero(0, 5) && w[5] === 0xffff) return publicV4(v4Of(w[6]!, w[7]!));
  if (zero(0, 6)) return false;
  const [first, second] = [w[0]!, w[1]!];
  if (first === 0x64 && second === 0xff9b) {
    return zero(2, 6) && publicV4(v4Of(w[6]!, w[7]!));
  }
  if (first === 0x2002) return publicV4(v4Of(second, w[2]!));
  if ((first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80 ||
    (first & 0xffc0) === 0xfec0 || (first & 0xff00) === 0xff00) {
    return false;
  }
  return !(first === 0x2001 && (second === 0x0db8 || second === 0));
}
