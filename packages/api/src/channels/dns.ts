import { lookup } from "node:dns/promises";

/** Every address the host resolves to (none on failure). */
export async function nodeResolveHost(host: string): Promise<string[]> {
  try {
    const all = await lookup(host, { all: true });
    return all.map((a) => a.address);
  } catch {
    return [];
  }
}
