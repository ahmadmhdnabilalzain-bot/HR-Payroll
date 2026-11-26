import type { AppDeps } from "../deps";
import { register, type App } from "../http/context";
import {
  acknowledgeLibrary,
  addLibraryVersion,
  createLibrary,
  downloadLibrary,
  getLibrary,
  listLibrary,
  putAudience,
} from "../library/library";
import { receiptReport } from "../library/receipts";

export function registerLibraryRoutes(app: App, deps: AppDeps): void {
  register(app, deps, "libraryList", listLibrary);
  register(app, deps, "libraryCreate", createLibrary);
  register(app, deps, "libraryGet", getLibrary);
  register(app, deps, "libraryVersionAdd", addLibraryVersion);
  register(app, deps, "libraryAudiencePut", putAudience);
  register(app, deps, "libraryDownload", downloadLibrary);
  register(app, deps, "libraryAcknowledge", acknowledgeLibrary);
  register(app, deps, "libraryReceipts", receiptReport);
}
