/**
 * I/O shell barrel: the parts that read files or parse untrusted input
 * with zod. Import the pure engine from "./index" instead.
 */
export { runCases, type CaseReport } from "./cases/runner";
export { CaseFileSchema, type CaseFile } from "./cases/schema";
export { runCli, type CliResult } from "./cli";
export { parseArgs, parseChange, type CliArgs } from "./cli-args";
export { SampleSchema, type Sample } from "./sample-schema";
