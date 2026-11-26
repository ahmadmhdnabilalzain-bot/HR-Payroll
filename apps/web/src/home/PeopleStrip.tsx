import { pendingApprovals } from "../demo/derive";
import { useRunApproval } from "../demo/actions";
import { hrefOf } from "../demo/route";
import type { Section } from "../demo/state";
import { useDemo } from "../demo/state";
import { offOn, requestRows } from "../demo/time-off";
import { useTweenedNumber } from "../demo/motion";
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
}

/**
 * The whole company at a glance, above the fold: people on the
 * payroll, on leave today, documents expiring and approvals waiting,
 * each a link to the view that holds them. All counts come from the
 * data and the demo state.
 */
export function PeopleStrip() {
  const { t } = useLocale();
  const { data, state } = useDemo();
  const run = useRunApproval();
  const asOf = data.payCalendar().asOf;
  const link = (sec: Section, anchor: string): string =>
    VIEWS[sec] !== undefined ? hrefOf(sec) : anchor;
  const sent = pendingApprovals(data, state).filter((a) =>
    a.kind !== "pay-run" || run.blockedBy.length === 0).length;
  const tiles: Tile[] = [
    { key: "home.stripHeadcount", value: data.headline().headcount,
      sub: "", href: link("people", "#/home") },
    { key: "home.stripOnLeave",
      value: offOn(requestRows(data, state), asOf).length, sub: "",
      href: link("time-off", "#/home") },
    { key: "home.stripDocs", value: data.documents().filter((d) =>
      d.daysLeft <= SOON_DAYS).length, sub: t("home.stripDocsSub"),
    href: link("people", "#/home") },
    { key: "home.stripApprovals", value: sent, sub: "",
      href: "#approvals-title" },
  ];
  return (
    <ul className={s.strip}>
      {tiles.map((x) => <TileView key={x.key} tile={x} />)}
    </ul>
  );
}

function TileView(p: { tile: Tile }) {
  const { t } = useLocale();
  const n = useTweenedNumber(p.tile.value);
  const inPage = p.tile.href.startsWith("#approvals");
  return (
    <li>
      <a className={s.tile} href={p.tile.href} onClick={inPage ? (e) => {
        e.preventDefault();
        document.getElementById("approvals-title")
          ?.scrollIntoView({ block: "start", behavior: "smooth" });
      } : undefined}>
        <span className={`${s.value} tabular`}>{n}</span>
        <span className={s.label}>{t(p.tile.key)}</span>
        {p.tile.sub !== "" && <span className={s.sub}>{p.tile.sub}</span>}
      </a>
    </li>
  );
}
