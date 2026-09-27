import { useEffect, useState } from "react";

/** Eases from 0 to a target so dashboard figures and dates can count into place. */
export function useCountUp(target: number, duration = 1100, decimals = 0): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || target === 0) {
      setValue(target);
      return;
    }

    let cancelled = false;
    const start = performance.now();
    const factor = 10 ** decimals;

    const apply = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const next = Math.round(target * eased * factor) / factor;
      if (!cancelled) setValue(next);
      return t >= 1;
    };

    setValue(0);
    let frame = requestAnimationFrame(function tick(now: number) {
      if (cancelled) return;
      if (!apply(now)) frame = requestAnimationFrame(tick);
    });

    const pulse = window.setInterval(() => {
      if (apply(performance.now())) window.clearInterval(pulse);
    }, 32);

    const finish = window.setTimeout(() => {
      if (!cancelled) setValue(target);
    }, duration + 40);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.clearInterval(pulse);
      window.clearTimeout(finish);
    };
  }, [target, duration, decimals]);

  return value;
}
