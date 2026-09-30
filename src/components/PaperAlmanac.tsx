import { formatEatLongDate, hijriDate } from "../../shared/format";
import { usePaperIssue } from "./PublicBlogLayout";

export function PaperAlmanac({ note }: { note?: string }) {
  const today = new Date();
  const hijri = hijriDate(today);
  const issue = usePaperIssue();

  return (
    <div>
      <p className="paper-section-kicker paper-section-kicker--mute">
        Almanac · <span lang="ar" dir="rtl">تقويم</span>
      </p>
      <div className="paper-almanac">
        <p className="paper-almanac-label">This issue</p>
        <p className="paper-almanac-title">{hijri.english}</p>
        <p className="paper-almanac-ar" lang="ar">
          {hijri.arabic}
        </p>
        {note ? <p className="paper-almanac-note">{note}</p> : null}
        <p className="paper-almanac-foot">
          {formatEatLongDate(today)}
          {issue != null ? ` · Issue No. ${issue}` : ""}
        </p>
      </div>
    </div>
  );
}
