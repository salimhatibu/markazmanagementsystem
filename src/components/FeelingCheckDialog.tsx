import { FormEvent, useEffect, useRef, useState } from "react";
import type { QuranVerse } from "../data/quran-verses";
import { api } from "../lib/api";
import { formatEat } from "../../shared/format";
import { moodForAnswer, nextVerse, type FeelingAnswer } from "../lib/feeling-check";
import type { FeelingEntry } from "../types";
import { CloseIcon } from "./Motifs";

type Step = "ask" | "verse" | "history";

export function FeelingCheckDialog({
  prompt,
  onClose,
}: {
  prompt: string;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [step, setStep] = useState<Step>("ask");
  const [answer, setAnswer] = useState<FeelingAnswer | null>(null);
  const [verse, setVerse] = useState<QuranVerse | null>(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [entries, setEntries] = useState<FeelingEntry[] | null>(null);
  const [historyError, setHistoryError] = useState("");
  const [historyBusy, setHistoryBusy] = useState(false);

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
    setNote("");
    setSaved(false);
    setSaveError("");
    setStep("verse");
  }

  async function openHistory() {
    setStep("history");
    if (entries != null) return;
    setHistoryBusy(true);
    setHistoryError("");
    try {
      const body = await api<{ entries: FeelingEntry[] }>("/api/feeling-entries");
      setEntries(body.entries);
    } catch (caught) {
      setHistoryError(caught instanceof Error ? caught.message : "Your past entries could not be opened.");
    } finally {
      setHistoryBusy(false);
    }
  }

  async function saveNote(event: FormEvent) {
    event.preventDefault();
    if (!answer || !note.trim()) return;
    setSaving(true);
    setSaveError("");
    try {
      const body = await api<{ entries: FeelingEntry[] }>("/api/feeling-entries", {
        method: "POST",
        body: JSON.stringify({ mood: answer, note: note.trim() }),
      });
      setEntries(body.entries);
      setSaved(true);
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : "That could not be saved just now.");
    } finally {
      setSaving(false);
    }
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
            <p className="feeling-lede">Choose the path that fits. A verse will meet you where you are.</p>
            <div className="actions feeling-choices">
              <button type="button" className="solid" onClick={() => openVerse("good")}>
                I&rsquo;m doing well
              </button>
              <button type="button" className="ghost" onClick={() => openVerse("down")}>
                I&rsquo;m feeling down
              </button>
            </div>
            <button type="button" className="text-button feeling-history-link" onClick={() => void openHistory()}>
              See your past records
            </button>
          </>
        ) : step === "verse" && verse ? (
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

            <form className="feeling-form" onSubmit={(event) => void saveNote(event)}>
              <label className="field-label" htmlFor="feeling-note">
                Write how you feel, in your own words
              </label>
              <textarea
                id="feeling-note"
                rows={3}
                value={note}
                onChange={(event) => {
                  setNote(event.target.value);
                  setSaved(false);
                }}
                placeholder="Today I feel…"
              />
              <div className="actions feeling-save-row">
                <button type="submit" className="ghost" disabled={!note.trim() || saving}>
                  {saving ? "Saving…" : "Save this"}
                </button>
                {saved ? <span className="feeling-saved-note">Saved.</span> : null}
              </div>
              {saveError ? <p className="status">{saveError}</p> : null}
            </form>

            <button type="button" className="text-button feeling-history-link" onClick={() => void openHistory()}>
              See your past records
            </button>
            <div className="actions">
              <button type="button" className="solid" onClick={onClose}>
                Amen — close
              </button>
            </div>
          </>
        ) : step === "history" ? (
          <>
            <p className="kicker">Your own record</p>
            <h2 id="feeling-title">What you&rsquo;ve written before</h2>
            {historyBusy ? <p className="loading-line">Opening your past records…</p> : null}
            {historyError ? <p className="status">{historyError}</p> : null}
            {!historyBusy && !historyError && entries?.length === 0 ? (
              <p className="feeling-lede">Nothing saved yet. Once you write a note, it will show up here.</p>
            ) : null}
            {entries && entries.length > 0 ? (
              <ul className="feeling-history-list">
                {entries.map((entry) => (
                  <li key={entry.id} className="feeling-history-item">
                    <span className="feeling-history-meta">
                      <span className={entry.mood === "down" ? "feeling-mood is-down" : "feeling-mood is-good"}>
                        {entry.mood === "down" ? "Feeling down" : "Doing well"}
                      </span>
                      <time>{formatEat(entry.createdAt)}</time>
                    </span>
                    <p className="feeling-history-note">{entry.note}</p>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="actions">
              <button type="button" className="ghost" onClick={() => setStep(verse ? "verse" : "ask")}>
                Back
              </button>
              <button type="button" className="solid" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
