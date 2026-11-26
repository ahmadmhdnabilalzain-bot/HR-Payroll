import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CliIo } from "./cli";

/**
 * I/O shell: real files and the real clock for the demo command, plus
 * the shell barrel. Import the pure generator and validator from
 * "./index" instead.
 */

const two = (n: number): string => String(n).padStart(2, "0");

/**
 * The machine's local date (not UTC), so a file made just after
 * midnight in Dubai is not judged against yesterday.
 */
function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${two(now.getMonth() + 1)}-` +
    two(now.getDate());
}

export const nodeIo: CliIo = {
  read: (path) => readFile(path, "utf8"),
  write: async (dir, name, text) => {
    await mkdir(dir, { recursive: true });
    const path = join(dir, name);
    await writeFile(path, text, "utf8");
    return path;
  },
  today: localToday,
};

export { BatchSchema, parseBatch } from "./batch-schema";
export { runCli, type CliIo, type CliResult } from "./cli";
export { DEFAULT_OUT, parseArgs, type CliArgs } from "./cli-args";
