import { Suspense } from "react";
import type { ViewProps } from "../../views";
import { Register } from "./Register";
import { RequestRecord, Requests } from "./Requests";
import { Run } from "./Run";
import { Settings } from "./Settings";
import s from "./privacy.module.css";

/** `#/setup/privacy/<page>`: privacy and retention (S26, WP23). */
export function SetupPrivacy(p: ViewProps) {
  const [, page = "", id] = p.rest;
  return (
    <Suspense fallback={<p className={s.loading} role="status">Loading…</p>}>
      {page === "register" ? <Register />
        : page === "requests" ? (id === undefined ? <Requests />
          : <RequestRecord id={id} />)
          : page === "run" ? <Run /> : <Settings />}
    </Suspense>
  );
}
