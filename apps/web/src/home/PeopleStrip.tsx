import { Suspense } from "react";
import { Explainable } from "../components/explain";
import type { Explanation } from "../components/explain/types";
import { pendingApprovals } from "../demo/derive";
import { useRunApproval } from "../demo/actions";
import { useLiveExplain } from "../demo/live-explain-load";
import { hrefOf } from "../demo/route";
import type { Section } from "../demo/state";
import { useDemo } from "../demo/state";
import { offOn, requestRows } from "../demo/time-off";
import { useTweenedNumber } from "../demo/motion";
import { useRunDetail } from "../demo/useRunDetail";
import type { MessageKey } from "../i18n/t";
import { useLocale } from "../i18n/LocaleProvider";
import { VIEWS } from "../views";
import s from "./PeopleStrip.module.css";

/** Expiries counted as "soon" in the strip, in days. */
const SOON_DAYS = 30;

interface Tile {
  key: MessageKey;
  value: number;
  sub: string;
  href: string;
  why?: Explanation | undefined;
}

type Lists = ReturnType<typeof useLists>;

/** What each tile counts, from the data and the demo state. */
function useLists() {
  const { data, state } = useDemo();
  const run = useRunApproval();
  const asOf = data.payCalendar().asOf;
  return {
    away: offOn(requestRows(data, state), asOf),
    docs: data.documents().filter((d) => d.daysLeft <= SOON_DAYS),
    sent: pendingApprovals(data, state).filter((a) =>
      a.kind !== "pay-run" || run.blockedBy.length === 0),
  };
}

/**
 * The whole company at a glance, above the fold: people on the
 * payroll, on leave today, documents expiring and approvals waiting.
 * Each number opens how it is counted (the dotted rule), and each
 * label is a link to the view that holds them. All counts come from
 * the data and the demo state; the working loads as its own chunk,
 * and until then the numbers show plain.
 */
export function PeopleStrip() {
  const lists = useLists();
  return (
    <Suspense fallback={<Strip lists={lists} />}>
      <Explained lists={lists} />
    </Suspense>
  );
}

function Explained(p: { lists: Lists }) {
  const live = useLiveExplain();
  const { scope } = useRunDetail();
  const { data } = useDemo();
  return (
    <Strip lists={p.lists} why={[live.headcountExplain(data, scope),
      live.onLeaveExplain(data, p.lists.away, scope),
      live.docsExplain(data, p.lists.docs, "Documents expiring soon",
        `ends within ${SOON_DAYS} days or has already ended`, scope),
      live.waitingExplain(data, p.lists.sent, scope)]} />
  );
}

function Strip(p: { lists: Lists; why?: Explanation[] }) {
  const { t } = useLocale();
  const { data } = useDemo();
  const link = (sec: Section, anchor: string): string =>
    VIEWS[sec] !== undefined ? hrefOf(sec) : anchor;
  const tiles: Tile[] = [
    { key: "home.stripHeadcount", value: data.headline().headcount,
      sub: "", href: link("people", "#/home") },
    { key: "home.stripOnLeave", value: p.lists.away.length, sub: "",
      href: link("time-off", "#/home") },
    { key: "home.stripDocs", value: p.lists.docs.length,
      sub: t("home.stripDocsSub"), href: link("people", "#/home") },
    { key: "home.stripApprovals", value: p.lists.sent.length, sub: "",
      href: "#approvals-title" },
  ];
  return (
    <ul className={s.strip}>
      {tiles.map((x, i) => <TileView key={x.key}
        tile={{ ...x, why: p.why?.[i] }} />)}
    </ul>
  );
}

function TileView(p: { tile: Tile }) {
  const { t } = useLocale();
  const n = useTweenedNumber(p.tile.value);
  const inPage = p.tile.href.startsWith("#approvals");
  return (
    <li className={s.tile}>
      <span className={`${s.value} tabular`}>
        <Explainable explanation={p.tile.why} className={s.why}>
          {n}
        </Explainable>
      </span>
      <a className={s.link} href={p.tile.href} onClick={inPage ? (e) => {
        e.preventDefault();
        document.getElementById("approvals-title")
          ?.scrollIntoView({ block: "start", behavior: "smooth" });
      } : undefined}>
        <span className={s.label}>{t(p.tile.key)}</span>
        {p.tile.sub !== "" && <span className={s.sub}>{p.tile.sub}</span>}
      </a>
    </li>
  );
}
