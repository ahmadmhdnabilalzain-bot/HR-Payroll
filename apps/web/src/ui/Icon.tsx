/**
 * One stroke icon set, drawn for this product: 24 px grid, 1.5 px
 * stroke, round joins, `currentColor`. Directional icons carry the
 * `data-dir` attribute so CSS mirrors them in right-to-left.
 */
const PATHS = {
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM15.5 15.5 20 20",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 2.5v2M12 19.5v2M4.6 " +
    "4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4" +
    "-1.4",
  moon: "M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10Z",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 " +
    "12ZM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  eyeOff: "M3.5 3.5l17 17M10 6c.6-.1 1.3-.2 2-.2 6 0 9.5 6.2 9.5 6.2a16" +
    " 16 0 0 1-2.6 3.3M6.4 7.4A15.6 15.6 0 0 0 2.5 12s3.5 6.5 9.5 6.5c" +
    "1.6 0 3-.4 4.2-1M9.9 10a2.5 2.5 0 0 0 3.6 3.5",
  check: "M5 12.5l4.5 4.5L19 7.5",
  alert: "M12 9v4.5M12 17h.01M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a" +
    "2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5.5M12 7.5h.01",
  chevronDown: "M6 9.5l6 6 6-6",
  chevronEnd: "M9.5 6l6 6-6 6",
  arrowEnd: "M4.5 12h15M13.5 6l6 6-6 6",
  undo: "M9 14.5 4 9.5l5-5M4.5 9.5h10a5 5 0 0 1 0 10H11",
  x: "M6 6l12 12M18 6 6 18",
  file: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5" +
    "-5ZM14 3v5h5",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20.5a7.5 7.5 0 0 1 15 0",
  home: "M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1" +
    "-1v-9.5Z",
  wallet: "M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3M4 7.5V18a2 2 0 0 0 2 2h13a1 1" +
    " 0 0 0 1-1v-9a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 7.5ZM16 14.5h.01",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20a6.5 6.5 0 0 1" +
    " 13 0M16 4.3a3.5 3.5 0 0 1 0 6.4M18.5 20a6.5 6.5 0 0 0-2.7-5.3",
  calendar: "M5 5.5h14a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6.5" +
    "a1 1 0 0 1 1-1ZM4 10h16M8.5 3.5v4M15.5 3.5v4",
  chart: "M4 20h16M7 16.5v-5M12 16.5V7M17 16.5v-8",
} as const;

export type IconName = keyof typeof PATHS;

const DIRECTIONAL = new Set<IconName>(["chevronEnd", "arrowEnd", "undo"]);

export function Icon(p: { name: IconName; size?: number }) {
  const size = p.size ?? 16;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true" focusable="false"
      data-dir={DIRECTIONAL.has(p.name) ? "" : undefined}>
      <path d={PATHS[p.name]} />
    </svg>
  );
}
