import { Suspense } from "react";
import type { ViewProps } from "../../views";
import { Register } from "./Register";
import { RequestRecord, Requests } from "./Requests";
import { Run } from "./Run";
import { Settings } from "./Settings";
import { Loading } from "../../ui/templates";

/** `#/setup/privacy/<page>`: privacy and retention (S26, WP23). */
export function SetupPrivacy(p: ViewProps) {
  const [, page = "", id] = p.rest;
  return (
    <Suspense fallback={<Loading label="Loading…" page={false} />}>
      {page === "register" ? <Register />
        : page === "requests" ? (id === undefined ? <Requests />
          : <RequestRecord id={id} />)
          : page === "run" ? <Run /> : <Settings />}
    </Suspense>
  );
}
