import s from "./Avatar.module.css";

/** Two initials ("Jose Reyes" is "JR"; short particles are skipped). */
export function initialsOf(name: string): string {
  const w = name.split(" ").filter((x) => x.length > 2);
  const pick = w.length > 0 ? w : name.split(" ");
  return [pick[0], pick.length > 1 ? pick.at(-1) : undefined]
    .map((x) => x?.[0] ?? "").join("").toUpperCase();
}

/**
 * One of eight neutral tints, always the same for a person: a small
 * string hash of the person's id (never of the name, so a rename keeps
 * the face).
 */
export function toneOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return (h % 8) + 1;
}

/**
 * The owner compares two sets: neutral tints (the default) and a
 * restrained colour set, shown with `?avatars=colour` in the address.
 */
const PALETTE = typeof location !== "undefined" &&
  new URLSearchParams(location.search).get("avatars") === "colour"
  ? "colour" : "neutral";

/**
 * A face for a person: initials on a neutral grey or warm-grey tint
 * (tokens --color-avatar-1 to 8, ink text, light and dark). Decorative:
 * the name always sits beside it, so it is hidden from screen readers.
 */
export function Avatar(p: { id: string; name: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string | undefined }) {
  return (
    <span className={`${s.avatar} ${p.className ?? ""}`}
      data-size={p.size ?? "md"} data-tone={toneOf(p.id)}
      data-palette={PALETTE} data-face=""
      aria-hidden="true">
      {initialsOf(p.name)}
    </span>
  );
}
