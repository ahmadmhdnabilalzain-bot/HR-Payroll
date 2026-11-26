import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CliIo } from "./cli";

/**
 * I/O shell: real files and the real clock for the demo command, plus
 * the shell barrel. Import the pure generator and validator from
 * "./index" instead.
 */

/**
 * The calendar date in Dubai (Asia/Dubai, UTC+4), whatever the host
 * time zone, so a file made just after midnight in Dubai is not judged
 * against yesterday. en-CA formats as YYYY-MM-DD.
 */
function dubaiToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
}

export const nodeIo: CliIo = {
  read: (path) => readFile(path, "utf8"),
  write: async (dir, name, text) => {
    await mkdir(dir, { recursive: true });
    const path = join(dir, name);
    await writeFile(path, text, "utf8");
    return path;
  },
  today: dubaiToday,
};

export { BatchSchema, parseBatch } from "./batch-schema";
export { runCli, type CliIo, type CliResult } from "./cli";
export { DEFAULT_OUT, parseArgs, type CliArgs } from "./cli-args";
