import { useEffect, useRef, useState } from "react";
import {
  createDraft,
  deleteHadithNote,
  loadHadithNotes,
  noteDayLabel,
  noteTimeLabel,
  saveHadithNotes,
  type HadithNote,
} from "../lib/hadith-notes";
import { FeatherIcon, PlusIcon, TrashIcon } from "./Motifs";

const LONG_PRESS_MS = 520;

export function HadithNotes() {
  const rootRef = useRef<HTMLDivElement>(null);
  const pressTimer = useRef<number | null>(null);
  const skipClick = useRef(false);
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<HadithNote[]>(loadHadithNotes);
  const [draft, setDraft] = useState<HadithNote>(createDraft);
  const [saved, setSaved] = useState(false);
  const [armedId, setArmedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setArmedId(null);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setArmedId(null);
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function clearPress() {
    if (pressTimer.current != null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }

  function arm(id: string) {
    skipClick.current = true;
    setArmedId(id);
  }

  function openPad(note?: HadithNote) {
    setArmedId(null);
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

  function remove(id: string) {
    const stored = deleteHadithNote(id);
    setNotes(stored);
    setArmedId(null);
    if (draft.id === id) {
      setDraft(stored[0] ?? createDraft());
      setSaved(false);
    }
  }

  return (
    <div className="hadith-notes" ref={rootRef}>
      <button
        type="button"
        className={`hadith-pen${open ? " is-open" : ""}`}
        data-guide="hadith-notes"
        aria-expanded={open}
        aria-controls="hadith-notepad"
        aria-label={open ? "Close notes" : "Open notes"}
        onClick={() => (open ? setOpen(false) : openPad())}
      >
        <FeatherIcon />
      </button>
      {open ? (
        <div className="hadith-notepad" id="hadith-notepad">
          <p className="kicker">Reflections</p>
          <ul className="hadith-note-days">
            {notes.map((note) => (
              <li key={note.id} className={armedId === note.id ? "is-armed" : undefined}>
                <button
                  type="button"
                  className={`hadith-note-open${note.id === draft.id ? " is-active" : ""}`}
                  onClick={() => {
                    if (skipClick.current) {
                      skipClick.current = false;
                      return;
                    }
                    if (armedId === note.id) {
                      setArmedId(null);
                      return;
                    }
                    openPad(note);
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    arm(note.id);
                  }}
                  onPointerDown={(event) => {
                    if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
                    clearPress();
                    pressTimer.current = window.setTimeout(() => arm(note.id), LONG_PRESS_MS);
                  }}
                  onPointerUp={clearPress}
                  onPointerCancel={clearPress}
                  onPointerLeave={clearPress}
                >
                  <span>{noteDayLabel(note)}</span>
                  <small>{noteTimeLabel(note)}</small>
                </button>
                {armedId === note.id ? (
                  <button
                    type="button"
                    className="hadith-note-delete"
                    aria-label="Delete note"
                    onClick={() => remove(note.id)}
                  >
                    <TrashIcon />
                  </button>
                ) : null}
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
