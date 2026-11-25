import { runCli } from "./cli";

const result = await runCli(process.argv.slice(2));
console.log(result.out);
process.exitCode = result.code;
