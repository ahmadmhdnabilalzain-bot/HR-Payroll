import type { ErrorCode, PayRunProblem } from "../contract";
import { encodeProblems, type ErrorDetail } from "../errors";

/** A refusal inside the mock; becomes the server's error body. */
export class MockFail extends Error {
  readonly code: ErrorCode;
  readonly detail: ErrorDetail | undefined;

  constructor(code: ErrorCode, message: string, detail?: ErrorDetail) {
    super(message);
    this.name = "MockFail";
    this.code = code;
    this.detail = detail;
  }

  static problems(ps: readonly PayRunProblem[]): MockFail {
    return new MockFail("PAY_RUN_PROBLEMS",
      "some employees need more details", { problems: encodeProblems(ps) });
  }
}

export const notFound = (what: string): MockFail =>
  new MockFail("NOT_FOUND", `${what} not found`);
