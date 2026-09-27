import { useEffect, useRef, useState } from "react";
import {
  createDraft,
  loadHadithNotes,
  noteDayLabel,
  noteTimeLabel,
  saveHadithNotes,
  type HadithNote,
} from "../lib/hadith-notes";
import { PenIcon, PlusIcon } from "./Motifs";

export function HadithNotes() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<HadithNote[]>(loadHadithNotes);
  const [draft, setDraft] = useState<HadithNote>(createDraft);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openPad(note?: HadithNote) {
    setDraft(note ?? createDraft());
    setSaved(false);
    setOpen(true);
  }

  function save() {
    const next = {
      ...draft,
      body: draft.body.trim(),
      savedAt: new Date().toISOString(),
    };
    if (!next.body) return;
    const others = notes.filter((note) => note.id !== next.id);
    const stored = saveHadithNotes([next, ...others]);
    setNotes(stored);
    setDraft(next);
    setSaved(true);
  }

  return (
    <div className="hadith-notes" ref={rootRef}>
      <button
        type="button"
        className={`hadith-pen${open ? " is-open" : ""}`}
        aria-expanded={open}
        aria-controls="hadith-notepad"
        aria-label={open ? "Close notes" : "Open notes"}
        onClick={() => (open ? setOpen(false) : openPad())}
      >
        <PenIcon />
      </button>
      {open ? (
        <div className="hadith-notepad" id="hadith-notepad">
          <p className="kicker">Reflections</p>
          <ul className="hadith-note-days">
            {notes.map((note) => (
              <li key={note.id}>
                <button
                  type="button"
                  className={note.id === draft.id ? "is-active" : ""}
                  onClick={() => openPad(note)}
                >
                  <span>{noteDayLabel(note)}</span>
                  <small>{noteTimeLabel(note)}</small>
                </button>
              </li>
            ))}
            <li>
              <button type="button" className="hadith-note-new" onClick={() => openPad()}>
                <PlusIcon />
                Add new
              </button>
            </li>
          </ul>
          <label className="field-label" htmlFor="hadith-note-body">
            Note for {noteDayLabel(draft)}
          </label>
          <textarea
            id="hadith-note-body"
            className="hadith-note-body"
            rows={5}
            placeholder="A short note or reflection on today’s reading."
            value={draft.body}
            onChange={(event) => {
              setDraft({ ...draft, body: event.target.value });
              setSaved(false);
            }}
          />
          <div className="hadith-note-actions">
            <button type="button" className="solid" onClick={save} disabled={!draft.body.trim()}>
              Save note
            </button>
            {saved ? <p className="field-hint">Kept for later.</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
