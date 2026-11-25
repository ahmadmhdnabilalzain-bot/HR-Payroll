// Minimal ambient declarations: the project has no @types/node.
declare module "node:fs/promises" {
  export function readdir(path: string): Promise<string[]>;
  export function readFile(path: string, enc: "utf8"): Promise<string>;
  export function writeFile(path: string, data: string): Promise<void>;
  export function mkdtemp(prefix: string): Promise<string>;
  export function rm(
    path: string,
    options?: { recursive?: boolean },
  ): Promise<void>;
}
declare module "node:os" {
  export function tmpdir(): string;
}
declare module "node:path" {
  export function join(...parts: string[]): string;
}
interface ImportMeta {
  readonly dirname: string;
}
declare const process: {
  argv: string[];
  exitCode: number | undefined;
};
declare const console: { log(message: string): void };
