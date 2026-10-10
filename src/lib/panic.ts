import {
  encouragementVerses,
  motivationVerses,
  type QuranVerse,
} from "../data/quran-verses";

const SEEN_KEY = "markaz_panic_verse_seen";

export const PANIC_LEVELS = [
  { level: 1, label: "Unsettled", blurb: "Something is off, but it can wait." },
  { level: 2, label: "Worried", blurb: "It needs looking at today." },
  { level: 3, label: "Serious", blurb: "It needs looking at now." },
  { level: 4, label: "Severe", blurb: "People or property are at risk." },
  { level: 5, label: "Critical", blurb: "Danger right now. Call for help too." },
] as const;

/** Every verse kept in this project, both collections together. */
export const allVerses: QuranVerse[] = [...encouragementVerses, ...motivationVerses];

function readSeen(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeSeen(ids: string[]) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
  } catch {
    /* a verse still shows even if it cannot be remembered */
  }
}

/** One of the saved verses, cycling through the whole set before repeating. */
export function panicVerse(): QuranVerse {
  let seen = readSeen();
  let unused = allVerses.filter((verse) => !seen.includes(verse.id));
  if (unused.length === 0) {
    seen = [];
    unused = [...allVerses];
  }
  const verse = unused[Math.floor(Math.random() * unused.length)];
  writeSeen([...seen, verse.id]);
  return verse;
}
