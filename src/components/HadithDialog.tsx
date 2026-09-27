import { useEffect, useRef } from "react";
import type { DailyHadith } from "../lib/hadith";
import { BookIcon, CloseIcon } from "./Motifs";

export function HadithDialog({ daily, onClose }: { daily: DailyHadith; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const { hadith } = daily;

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-veil">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="hadith-title">
        <button
          ref={closeRef}
          type="button"
          className="modal-close"
          aria-label="Close today's reading"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
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
      </div>
    </div>
  );
}
