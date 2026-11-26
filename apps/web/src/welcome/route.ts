import { useEffect, useState } from "react";

/**
 * The opening lives at #/welcome, outside the product's sections: not
 * in the bar, the panels or the registry. It is reached by URL and by
 * "Replay opening" in the search palette.
 */
export const WELCOME_HASH = "#/welcome";

export const isWelcome = (hash: string): boolean =>
  /^#\/?welcome(\/|$)/.test(hash);

export function useWelcome(): boolean {
  const [on, setOn] = useState(() => isWelcome(location.hash));
  useEffect(() => {
    const read = (): void => setOn(isWelcome(location.hash));
    addEventListener("hashchange", read);
    return () => removeEventListener("hashchange", read);
  }, []);
  return on;
}
