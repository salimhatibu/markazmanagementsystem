import { useEffect, useState } from "react";
import { hijriDate } from "../../shared/format";

function useCountUp(target: number, duration = 1100) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || target <= 0) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

export function HijriDate() {
  const today = hijriDate();
  const day = useCountUp(today.day, 700);
  const year = useCountUp(today.year, 1200);

  return (
    <section className="hijri" aria-label="Islamic date">
      <p className="kicker">Hijri date · East Africa Time</p>
      <p className="hijri-line">
        <span className="hijri-count">{day}</span>
        <span> {today.month} </span>
        <span className="hijri-count">{year}</span>
        <span> AH</span>
      </p>
      <p className="arabic-line hijri-arabic" lang="ar" dir="rtl">
        {today.arabic}
      </p>
    </section>
  );
}
