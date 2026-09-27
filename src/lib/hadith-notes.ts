import { eatDate, formatEat, formatShortDate } from "../../shared/format";

export type HadithNote = {
  id: string;
  date: string;
  savedAt: string;
  body: string;
};

const KEY = "markaz_hadith_notes";

function sortNotes(notes: HadithNote[]): HadithNote[] {
  return [...notes].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function loadHadithNotes(): HadithNote[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HadithNote[];
    return sortNotes(parsed.filter((note) => note.id && note.body.trim()));
  } catch {
    return [];
  }
}

export function saveHadithNotes(notes: HadithNote[]): HadithNote[] {
  const next = sortNotes(notes.filter((note) => note.body.trim()));
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
  return next;
}

export function deleteHadithNote(id: string): HadithNote[] {
  return saveHadithNotes(loadHadithNotes().filter((note) => note.id !== id));
}

export function createDraft(): HadithNote {
  const now = new Date();
  return {
    id: `${eatDate(now)}-${now.getTime()}`,
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
