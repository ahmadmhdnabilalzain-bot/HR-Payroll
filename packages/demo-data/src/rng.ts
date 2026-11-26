/**
 * Seeded generator (mulberry32): the only source of variation in the
 * demo data. Same seed, same sequence, on every machine.
 */
export interface Rng {
  /** A float in [0, 1). */
  next(): number;
  /** A whole number from `min` to `max`, both included. */
  int(min: number, max: number): number;
  /** A copy of `items` in a seeded order. */
  shuffle<T>(items: readonly T[]): T[];
}

export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number): number =>
    min + Math.floor(next() * (max - min + 1));
  const shuffle = <T>(items: readonly T[]): T[] => {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(0, i);
      const x = out[i]!;
      out[i] = out[j]!;
      out[j] = x;
    }
    return out;
  };
  return { next, int, shuffle };
}
