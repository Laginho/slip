import { useEffect, useState } from "react";

/**
 * One live media query. Reads the current match once, then follows "change"
 * events -- a desktop window being resized, a phone rotated, the OS theme
 * flipping at sunset. The handler trusts `event.matches` rather than
 * re-reading the query, so a stub reporting a static snapshot still drives
 * updates through its recorded listeners.
 *
 * Where matchMedia is absent (jsdom without a stub) there is no subscription
 * and the value stays false: the touch-device profile.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window.matchMedia === "function" ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
