import { type RefObject, useEffect, useState } from "react";

/** Collapses the header links only when the full pill row cannot sit in the bar. */
export function useNavFit(
  barRef: RefObject<HTMLElement | null>,
  measureRef: RefObject<HTMLElement | null>,
): { compact: boolean; ready: boolean } {
  const [compact, setCompact] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const bar = barRef.current;
    const measure = measureRef.current;
    if (!bar || !measure) return;

    const check = () => {
      const brand = bar.querySelector<HTMLElement>(".brand");
      const toggle = bar.querySelector<HTMLElement>(".theme-toggle");
      const alert = bar.querySelector<HTMLElement>(".alert-pill");
      const styles = getComputedStyle(bar);
      const pad = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      const gap = parseFloat(styles.columnGap || styles.gap) || 0;
      const actions = (toggle?.offsetWidth ?? 0) + (alert ? alert.offsetWidth + gap : 0);
      const reserved = (brand?.offsetWidth ?? 0) + actions + pad + gap * 2;
      const available = bar.clientWidth - reserved;
      setCompact(measure.scrollWidth > available - 4);
      setReady(true);
    };

    const observer = new ResizeObserver(check);
    observer.observe(bar);
    observer.observe(measure);
    void document.fonts?.ready.then(check);
    check();
    return () => observer.disconnect();
  }, [barRef, measureRef]);

  return { compact, ready };
}
