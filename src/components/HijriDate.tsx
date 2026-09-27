import { hijriDate } from "../../shared/format";
import { useCountUp } from "../lib/use-count-up";

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
