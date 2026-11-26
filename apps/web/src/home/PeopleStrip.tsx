import { approvalsShown, isSent } from "../demo/approvals";
import { figures } from "../demo/figures";
import { hrefOf } from "../demo/route";
import type { Section } from "../demo/state";
import { useDemo } from "../demo/state";
import { offOn, requestRows } from "../demo/time-off";
import { useTweenedNumber } from "../demo/motion";
import { formatMonthName } from "../i18n/format";
import type { MessageKey, Vars } from "../i18n/t";
import { useLocale } from "../i18n/LocaleProvider";
import { VIEWS } from "../views";
import s from "./PeopleStrip.module.css";

/** Expiries counted as "soon" in the strip, in days. */
const SOON_DAYS = 30;

interface Tile {
  key: MessageKey;
  value: number;
  vars?: Vars;
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
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const asOf = data.payCalendar().asOf;
  const link = (sec: Section, anchor: string): string =>
    VIEWS[sec] !== undefined ? hrefOf(sec) : anchor;
  const sent = approvalsShown(data, state).filter((a) =>
    isSent(data, state, a)).length;
  const tiles: Tile[] = [
    { key: "home.stripHeadcount", value: figures(data, state).onPayroll,
      vars: { month: formatMonthName(data.headline().runMonth, lang) },
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
        <span className={s.label}>{t(p.tile.key, p.tile.vars)}</span>
        {p.tile.sub !== "" && <span className={s.sub}>{p.tile.sub}</span>}
      </a>
    </li>
  );
}
