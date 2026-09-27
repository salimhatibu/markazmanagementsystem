import { useEffect, useRef, useState } from "react";
import type { DailyHadith } from "../lib/hadith";
import { BookIcon } from "./Motifs";

const HOLD_SECONDS = 30;

export function HadithDialog({ daily, onClose }: { daily: DailyHadith; onClose: () => void }) {
  const [remaining, setRemaining] = useState(HOLD_SECONDS);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const tick = setInterval(() => {
      setRemaining((seconds) => {
        if (seconds <= 1) {
          clearInterval(tick);
          close.current();
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const { hadith } = daily;

  return (
    <div className="modal-veil">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="hadith-title">
        <p className="kicker kicker-icon">
          <BookIcon /> A short reading for today · {daily.dayNumber} of {daily.total}
        </p>
        <h2 id="hadith-title">{hadith.chapter.replace(/^Chapter:\s*/, "")}</h2>
        <p className="arabic-line">{hadith.chapterArabic}</p>
        <p className="narrator">{hadith.narrator}</p>
        <p className="hadith-body">{hadith.english}</p>
        <p className="hadith-ref">
          {hadith.reference} · {hadith.inBook}
        </p>
        <p className="countdown" aria-live="polite">
          {remaining > 0
            ? `This stays on screen for ${remaining} seconds so you can read it.`
            : "You can close this now."}
        </p>
        {remaining === 0 ? (
          <button type="button" className="solid" onClick={onClose}>
            Continue
          </button>
        ) : null}
      </div>
    </div>
  );
}
