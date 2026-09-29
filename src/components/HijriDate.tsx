import { hijriDate } from "../../shared/format";

export function HijriDate() {
  const today = hijriDate();

  return (
    <section className="hijri" aria-label="Islamic date">
      <p className="kicker">Hijri date · East Africa Time</p>
      <p className="hijri-line">
        <span className="hijri-count">{today.day}</span>
        <span> {today.month} </span>
        <span className="hijri-count">{today.year}</span>
        <span> AH</span>
      </p>
      <p className="hijri-gregorian">{today.gregorian}</p>
      <p className="arabic-line hijri-arabic" lang="ar" dir="rtl">
        {today.arabic}
      </p>
    </section>
  );
}
