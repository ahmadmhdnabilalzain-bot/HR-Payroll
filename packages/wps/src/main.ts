import { nodeIo, runCli } from "./shell";

const result = await runCli(process.argv.slice(2), nodeIo);
console.log(result.out);
process.exitCode = result.code;
