import { eatDate, formatEat, formatShortDate } from "../../shared/format";
import { api } from "./api";

export type HadithNote = {
  /** Server id. A note that has not been saved yet has none. */
  id: number | null;
  date: string;
  savedAt: string;
  body: string;
};

/** Where reflections used to live before they were given a table. */
const LEGACY_KEY = "markaz_hadith_notes";

type LegacyNote = { id?: string; date?: string; savedAt?: string; body?: string };

function sortNotes(notes: HadithNote[]): HadithNote[] {
  return [...notes].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

function readLegacy(): LegacyNote[] {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LegacyNote[]) : [];
  } catch {
    return [];
  }
}

function clearLegacy() {
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* private mode */
  }
}

function writeLegacy(notes: LegacyNote[]) {
  try {
    if (notes.length === 0) clearLegacy();
    else localStorage.setItem(LEGACY_KEY, JSON.stringify(notes));
  } catch {
    /* private mode */
  }
}

/**
 * Reflections written before this had a table still sit in the browser, so they
 * are pushed up once and then forgotten locally.
 *
 * Each note is dropped from the local copy the moment the server has it, rather
 * than clearing the lot at the end: a failure halfway through then leaves only
 * the notes that never made it, instead of sending the saved ones a second time
 * on the next load.
 */
async function runLift(): Promise<boolean> {
  const pending = readLegacy().filter((note) => (note.body ?? "").trim());
  if (pending.length === 0) {
    clearLegacy();
    return false;
  }
  const left = [...pending];
  while (left.length > 0) {
    const note = left[0];
    await api<{ note: HadithNote }>("/api/hadith-notes", {
      method: "POST",
      body: JSON.stringify({
        date: /^\d{4}-\d{2}-\d{2}$/.test(note.date ?? "") ? note.date : eatDate(),
        body: (note.body ?? "").trim(),
      }),
    });
    left.shift();
    writeLegacy(left);
  }
  return true;
}

/**
 * One lift per page load. Two mounts racing each other (React runs effects
 * twice in development) would otherwise both read the same local copy and
 * store every reflection twice.
 */
let lifting: Promise<boolean> | null = null;

function liftLegacyNotes(): Promise<boolean> {
  lifting ??= runLift().catch((error: unknown) => {
    lifting = null;
    throw error;
  });
  return lifting;
}

export async function loadHadithNotes(): Promise<HadithNote[]> {
  await liftLegacyNotes();
  const body = await api<{ notes: HadithNote[] }>("/api/hadith-notes");
  return sortNotes(body.notes);
}

export async function saveHadithNote(note: HadithNote): Promise<HadithNote> {
  const text = note.body.trim();
  if (note.id == null) {
    const body = await api<{ note: HadithNote }>("/api/hadith-notes", {
      method: "POST",
      body: JSON.stringify({ date: note.date, body: text }),
    });
    return body.note;
  }
  const body = await api<{ note: HadithNote }>(`/api/hadith-notes/${note.id}`, {
    method: "PUT",
    body: JSON.stringify({ body: text }),
  });
  return body.note;
}

export async function deleteHadithNote(id: number): Promise<void> {
  await api(`/api/hadith-notes/${id}`, { method: "DELETE" });
}

export function createDraft(): HadithNote {
  const now = new Date();
  return {
    id: null,
    date: eatDate(now),
    savedAt: now.toISOString(),
    body: "",
  };
}

export function noteDayLabel(note: HadithNote): string {
  return formatShortDate(note.date);
}

export function noteTimeLabel(note: HadithNote): string {
  return formatEat(note.savedAt);
}
