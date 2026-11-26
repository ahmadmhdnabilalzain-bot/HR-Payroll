import { use } from "react";

type Live = typeof import("./live-explain");

let pending: Promise<Live> | null = null;

/** The live explanations load as their own small chunk, once. */
export function loadLiveExplain(): Promise<Live> {
  if (pending === null) {
    const p = import("./live-explain");
    void p.then((value) => Object.assign(p, { status: "fulfilled", value }));
    pending = p;
  }
  return pending;
}

/** Suspends the first time; wrap the user in <Suspense>. */
export function useLiveExplain(): Live {
  return use(loadLiveExplain());
}
