import { nodeIo, runCli } from "./shell";

const result = await runCli(process.argv.slice(2), nodeIo);
// Failures go to stderr, so a pipe of the success output stays clean.
if (result.code === 0) console.log(result.out);
else console.error(result.out);
process.exitCode = result.code;
