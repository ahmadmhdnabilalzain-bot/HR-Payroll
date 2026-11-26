import type { AppDeps } from "../deps";
import { register, type App } from "../http/context";
import {
  acknowledgeLetter,
  downloadLetter,
  getLetter,
  issueLetter,
  listLetters,
  previewLetter,
} from "../letters/letters";

export function registerLetterRoutes(app: App, deps: AppDeps): void {
  register(app, deps, "letterPreview", previewLetter);
  register(app, deps, "letterIssue", issueLetter);
  register(app, deps, "lettersList", listLetters);
  register(app, deps, "letterGet", getLetter);
  register(app, deps, "letterDownload", downloadLetter);
  register(app, deps, "letterAcknowledge", acknowledgeLetter);
}
