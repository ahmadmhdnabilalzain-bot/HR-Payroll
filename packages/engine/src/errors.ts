export class EngineError extends Error {
  readonly code: string;
  readonly detail: Record<string, string>;

  constructor(
    code: string,
    message: string,
    detail: Record<string, string> = {},
  ) {
    super(message);
    this.name = "EngineError";
    this.code = code;
    this.detail = detail;
  }
}
