import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { QuranVerse } from "../data/quran-verses";
import { api } from "../lib/api";
import { PANIC_LEVELS, panicVerse } from "../lib/panic";
import type { PanicAlert } from "../types";
import { CloseIcon } from "./Motifs";

type Step = "level" | "note" | "verse";

export function PanicDialog({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [step, setStep] = useState<Step>("level");
  const [level, setLevel] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [verse, setVerse] = useState<QuranVerse | null>(null);

  useEffect(() => {
    document.documentElement.dataset.panic = "on";
    return () => {
      delete document.documentElement.dataset.panic;
    };
  }, []);

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (step === "note") noteRef.current?.focus();
  }, [step]);

  function chooseLevel(next: number) {
    setLevel(next);
    setError("");
    setStep("note");
  }

  async function record(event: FormEvent) {
    event.preventDefault();
    if (level == null || !note.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      await api<{ alert: PanicAlert }>("/api/panic-alerts", {
        method: "POST",
        body: JSON.stringify({ level, note: note.trim() }),
      });
      setVerse(panicVerse());
      setStep("verse");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That could not be recorded just now.");
    } finally {
      setSaving(false);
    }
  }

  const chosen = PANIC_LEVELS.find((entry) => entry.level === level);

  return createPortal(
    <div className="panic-veil">
      <div className="modal panic-modal" role="dialog" aria-modal="true" aria-labelledby="panic-title">
        <button ref={closeRef} type="button" className="modal-close" aria-label="Close" onClick={onClose}>
          <CloseIcon />
        </button>

        {step === "level" ? (
          <>
            <p className="kicker panic-kicker">Emergency protocol · Active</p>
            <h2 id="panic-title">Threat level</h2>
            <p className="panic-lede">
              Select the severity of what is happening right now. The next screen records it.
            </p>
            <ul className="panic-levels">
              {PANIC_LEVELS.map((entry) => (
                <li key={entry.level}>
                  <button type="button" className="panic-level" onClick={() => chooseLevel(entry.level)}>
                    <span className="panic-level-num">{entry.level}</span>
                    <span className="panic-level-text">
                      <span className="panic-level-label">{entry.label}</span>
                      <span className="panic-level-blurb">{entry.blurb}</span>
                    </span>
                    <span className="panic-level-meter" aria-hidden="true">
                      {PANIC_LEVELS.map((bar) => (
                        <i key={bar.level} className={bar.level <= entry.level ? "on" : undefined} />
                      ))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : step === "note" ? (
          <>
            <p className="kicker panic-kicker">
              Level {level} · {chosen?.label}
            </p>
            <h2 id="panic-title">Incident report</h2>
            <p className="panic-lede">Write it down as plainly as you can. It is kept on the record.</p>
            <form className="panic-form" onSubmit={(event) => void record(event)}>
              <label className="field-label" htmlFor="panic-note">
                Note down the emergency
              </label>
              <textarea
                id="panic-note"
                ref={noteRef}
                rows={5}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="What happened, where, and who is involved…"
              />
              {error ? <p className="status">{error}</p> : null}
              <div className="actions panic-actions">
                <button type="button" className="ghost" onClick={() => setStep("level")} disabled={saving}>
                  Back
                </button>
                <button type="submit" className="solid panic-submit" disabled={!note.trim() || saving}>
                  {saving ? "Logging…" : "Log it"}
                </button>
              </div>
            </form>
          </>
        ) : verse ? (
          <>
            <p className="kicker panic-kicker">Logged · Level {level}</p>
            <h2 id="panic-title">{verse.surah}</h2>
            <div className="panic-verse-frame">
              <p className="arabic-line panic-arabic" lang="ar" dir="rtl">
                {verse.arabic}
              </p>
              <p className="panic-english">{verse.english}</p>
              <p className="hadith-ref">{verse.reference}</p>
            </div>
            <div className="actions panic-actions">
              <button type="button" className="solid panic-submit" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
