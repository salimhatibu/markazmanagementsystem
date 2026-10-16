import { useEffect, useRef, useState } from "react";
import {
  createDraft,
  deleteHadithNote,
  loadHadithNotes,
  noteDayLabel,
  noteTimeLabel,
  saveHadithNote,
  type HadithNote,
} from "../lib/hadith-notes";
import { FeatherIcon, PlusIcon, TrashIcon } from "./Motifs";

const LONG_PRESS_MS = 520;

export function HadithNotes() {
  const rootRef = useRef<HTMLDivElement>(null);
  const pressTimer = useRef<number | null>(null);
  const skipClick = useRef(false);
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<HadithNote[]>([]);
  const [draft, setDraft] = useState<HadithNote>(createDraft);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [armedId, setArmedId] = useState<number | null>(null);

  useEffect(() => {
    let cancel = false;
    loadHadithNotes()
      .then((rows) => {
        if (!cancel) setNotes(rows);
      })
      .catch((caught: unknown) => {
        if (!cancel) setError(caught instanceof Error ? caught.message : "Your notes could not be opened.");
      });
    return () => {
      cancel = true;
    };
  }, []);

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

  function arm(id: number) {
    skipClick.current = true;
    setArmedId(id);
  }

  function openPad(note?: HadithNote) {
    setArmedId(null);
    setDraft(note ?? createDraft());
    setSaved(false);
    setOpen(true);
  }

  async function save() {
    if (!draft.body.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const stored = await saveHadithNote(draft);
      setNotes((rows) => {
        const others = rows.filter((note) => note.id !== stored.id);
        return [stored, ...others].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
      });
      setDraft(stored);
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That note could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    setError("");
    try {
      await deleteHadithNote(id);
      const left = notes.filter((note) => note.id !== id);
      setNotes(left);
      setArmedId(null);
      if (draft.id === id) {
        setDraft(left[0] ?? createDraft());
        setSaved(false);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That note could not be removed.");
    }
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
        <FeatherIcon />
      </button>
      {open ? (
        <div className="hadith-notepad" id="hadith-notepad">
          <p className="kicker">Reflections</p>
          <ul className="hadith-note-days">
            {notes.map((note) => (
              <li key={note.id ?? "draft"} className={armedId === note.id ? "is-armed" : undefined}>
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
                    arm(note.id!);
                  }}
                  onPointerDown={(event) => {
                    if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
                    clearPress();
                    pressTimer.current = window.setTimeout(() => arm(note.id!), LONG_PRESS_MS);
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
                    onClick={() => void remove(note.id!)}
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
            <button
              type="button"
              className="solid"
              onClick={() => void save()}
              disabled={!draft.body.trim() || saving}
            >
              {saving ? "Saving…" : "Save note"}
            </button>
            {saved ? <p className="field-hint">Kept for later.</p> : null}
            {error ? <p className="status">{error}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
