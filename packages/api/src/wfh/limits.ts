/**
 * Work-from-home limits. None is law.
 * - LOCATION_INTERVAL_MINUTES: the owner's decision ("Location
 *   service will just record once every hour", LEDGER 2026-11-25),
 *   enforced by the server on both sides of every sample.
 * - The others are product bounds.
 */
export const LOCATION_INTERVAL_MINUTES = 60;
export const MAX_CLOCK_SKEW_MINUTES = 2;
export const MAX_LATE_UPLOAD_HOURS = 24;
export const MAX_MINUTES_PER_UPLOAD = 240;
/** Product default for the tracked-hours bound (16 hours), not law. */
export const DEFAULT_MAX_TRACKED_MINUTES = 960;
