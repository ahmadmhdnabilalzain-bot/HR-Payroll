import type {
  ActivityMinute,
  WfhLocationUpload,
  WfhStatus,
} from "@payroll/contract";
import type { IndicatorView } from "./indicator";

/** Everything with side effects is a port the app supplies. */
export interface Clock { now(): Date }
export interface GeoReading { lat: number; lng: number; accuracyM: number }
export interface LocationSource {
  kind: "phone" | "browser";
  available(): Promise<boolean>;
  current(): Promise<GeoReading>;
}
/** The native phone app implements this bridge. */
export interface PhoneBridge {
  isAvailable(): Promise<boolean>;
  getLocation(): Promise<GeoReading>;
}
/** The browser geolocation object fits this shape. */
export interface GeolocationLike {
  getCurrentPosition(
    ok: (p: { coords: { latitude: number; longitude: number;
      accuracy: number } }) => void,
    err: (e: unknown) => void,
    opts: { enableHighAccuracy: boolean; maximumAge: number;
      timeout: number },
  ): void;
}
export type { IndicatorView };
export interface Indicator { show(v: IndicatorView): void }
export interface TrackingApi {
  status(): Promise<WfhStatus>;
  postLocation(b: WfhLocationUpload): Promise<void>;
  postActivity(b: { attendanceId: string; minutes: ActivityMinute[] })
    : Promise<void>;
}
