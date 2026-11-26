import type {
  GeolocationLike,
  GeoReading,
  LocationSource,
  PhoneBridge,
} from "./ports";

export function phoneBridgeSource(b: PhoneBridge): LocationSource {
  return { kind: "phone", available: () => b.isAvailable(),
    current: () => b.getLocation() };
}

/** A fresh, coarse reading while the page is open (no background). */
const OPTIONS = { enableHighAccuracy: false, maximumAge: 0,
  timeout: 20000 };

export function browserLocationSource(g: GeolocationLike | undefined)
  : LocationSource {
  return {
    kind: "browser",
    available: async () => g !== undefined,
    current: () => new Promise<GeoReading>((ok, fail) => {
      if (g === undefined) return fail(new Error("no geolocation"));
      g.getCurrentPosition((p) => ok({ lat: p.coords.latitude,
        lng: p.coords.longitude, accuracyM: p.coords.accuracy }), fail,
      OPTIONS);
    }),
  };
}

/** The phone first, then the browser, else none. */
export async function chooseLocationSource(phone: LocationSource,
  browser: LocationSource): Promise<LocationSource | null> {
  if (await phone.available()) return phone;
  return await browser.available() ? browser : null;
}
