/**
 * File names from users are display text only: they never decide a
 * type, a path or a header's structure.
 */
const CONTROL = /[\u0000-\u001f\u007f]/g;
const EDGES = /^[ .]+|[ .]+$/g;
const MAX_POINTS = 200;

/**
 * (1) drop control characters, (2) `/`, `\` and `"` become `_`,
 * (3) trim spaces and dots at both ends, (4) at most 200 code points,
 * (5) empty gives "file".
 */
export function safeFileName(name: string): string {
  const cleaned = name.replace(CONTROL, "").replace(/[/\\"]/g, "_")
    .replace(EDGES, "");
  const cut = [...cleaned].slice(0, MAX_POINTS).join("")
    .replace(EDGES, "");
  return cut === "" ? "file" : cut;
}

const ASCII_SAFE = /[^A-Za-z0-9._ -]/g;

/** Lone surrogates become U+FFFD (encodeURIComponent refuses them). */
const LONE = new RegExp("[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|" +
  "(?<![\\uD800-\\uDBFF])[\\uDC00-\\uDFFF]", "g");
const wellFormed = (s: string) => s.replace(LONE, "\uFFFD");

/** RFC 5987 value: encodeURIComponent plus `'()*`. */
function pct(s: string): string {
  return encodeURIComponent(s).replace(/['()*]/g,
    (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`);
}

/**
 * `attachment; filename="<ascii>"; filename*=UTF-8''<pct>`. The ASCII
 * form replaces every character outside `[A-Za-z0-9._ -]` with `_`;
 * the extended form is left out when the name is already that plain.
 * Lone surrogates (which encodeURIComponent refuses) become U+FFFD.
 */
export function contentDisposition(name: string): string {
  const ascii = name.replace(ASCII_SAFE, "_");
  const head = `attachment; filename="${ascii}"`;
  if (ascii === name) return head;
  return `${head}; filename*=UTF-8''${pct(wellFormed(name))}`;
}
