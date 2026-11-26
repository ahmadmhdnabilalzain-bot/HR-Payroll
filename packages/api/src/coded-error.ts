/** An internal failure with a stable code (never sent as an API code). */
export class CodedError extends Error {
  readonly code: string;
  readonly detail: Record<string, string>;

  constructor(
    code: string,
    message: string,
    detail: Record<string, string> = {},
  ) {
    super(`${code}: ${message}`);
    this.name = "CodedError";
    this.code = code;
    this.detail = detail;
  }
}
