import { lookup, resolveTxt } from "node:dns/promises";

/** Every address the host resolves to (none on failure). */
export async function nodeResolveHost(host: string): Promise<string[]> {
  try {
    const all = await lookup(host, { all: true });
    return all.map((a) => a.address);
  } catch {
    return [];
  }
}

/**
 * The TXT strings at `name`, each record's chunks joined (none on
 * failure). UNVERIFIED against a real domain here: only the fake is
 * exercised in tests.
 */
export async function nodeResolveTxt(name: string): Promise<string[]> {
  try {
    return (await resolveTxt(name)).map((r) => r.join(""));
  } catch {
    return [];
  }
}
