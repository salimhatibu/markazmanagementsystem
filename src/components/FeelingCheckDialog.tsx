import { FormEvent, useEffect, useRef, useState } from "react";
import type { QuranVerse } from "../data/quran-verses";
import {
  classifyFeeling,
  moodForAnswer,
  nextVerse,
  type FeelingAnswer,
} from "../lib/feeling-check";
import { CloseIcon } from "./Motifs";

type Step = "ask" | "verse";

export function FeelingCheckDialog({
  prompt,
  onClose,
}: {
  prompt: string;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [step, setStep] = useState<Step>("ask");
  const [draft, setDraft] = useState("");
  const [answer, setAnswer] = useState<FeelingAnswer | null>(null);
  const [verse, setVerse] = useState<QuranVerse | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function openVerse(next: FeelingAnswer) {
    const mood = moodForAnswer(next);
    setAnswer(next);
    setVerse(nextVerse(mood));
    setStep("verse");
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const classified = classifyFeeling(draft);
    openVerse(classified === "other" ? "good" : classified);
  }

  return (
    <div className="modal-veil">
      <div className="modal feeling-modal" role="dialog" aria-modal="true" aria-labelledby="feeling-title">
        <button
          ref={closeRef}
          type="button"
          className="modal-close"
          aria-label="Close"
          onClick={onClose}
        >
          <CloseIcon />
        </button>

        {step === "ask" ? (
          <>
            <p className="kicker">A quiet check-in</p>
            <h2 id="feeling-title">{prompt}</h2>
            <p className="feeling-lede">
              Answer in a word or two, or choose one of the paths below. A verse will meet you where you are.
            </p>
            <div className="actions feeling-choices">
              <button type="button" className="solid" onClick={() => openVerse("good")}>
                I&rsquo;m doing well
              </button>
              <button type="button" className="ghost" onClick={() => openVerse("down")}>
                I&rsquo;m feeling down
              </button>
            </div>
            <form className="feeling-form" onSubmit={onSubmit}>
              <label className="field-label" htmlFor="feeling-reply">
                Or write it in your own words
              </label>
              <input
                id="feeling-reply"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Good, a bit tired, grateful…"
                autoComplete="off"
              />
              <button type="submit" className="ghost" disabled={!draft.trim()}>
                Share &amp; receive a verse
              </button>
            </form>
          </>
        ) : verse ? (
          <>
            <p className="kicker">
              {answer === "down" ? "For steadiness and courage" : "For hope and ease"}
            </p>
            <h2 id="feeling-title">{verse.surah}</h2>
            <p className="arabic-line feeling-arabic" lang="ar" dir="rtl">
              {verse.arabic}
            </p>
            <p className="feeling-english">{verse.english}</p>
            <p className="hadith-ref">{verse.reference}</p>
            <div className="actions">
              <button type="button" className="solid" onClick={onClose}>
                Amen — close
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
