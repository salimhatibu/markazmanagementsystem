import { eatDate } from "../../shared/format";
import {
  encouragementVerses,
  motivationVerses,
  type QuranVerse,
  type VerseMood,
} from "../data/quran-verses";

const SESSION_KEY = "markaz_feeling_session_start";
const ASKED_KEY = "markaz_feeling_asked";
const SEEN_PREFIX = "markaz_verse_seen_";
const HOUR_MS = 60 * 60 * 1000;

export const FEELING_PROMPTS = [
  "Hey — how are you feeling today?",
  "Hello. Before the day runs on, how is your heart?",
  "Assalamu alaikum. How are you holding up today?",
  "ding ding ding. How are you not holding up today FH?",
  "Forget spirit, are you still breathing fine?",
  "Hey, it's KFC here. Checking in — how are things with you today?",
  "Meemy. How are you feeling this hour?",
  "A soft question for you: how is your heart today?",
];

export type FeelingAnswer = "good" | "down" | "other";

export function ensureSessionStart(now = Date.now()): number {
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing && /^\d+$/.test(existing)) return Number(existing);
  sessionStorage.setItem(SESSION_KEY, String(now));
  return now;
}

export function msUntilFeelingCheck(now = Date.now()): number {
  const start = ensureSessionStart(now);
  return Math.max(0, start + HOUR_MS - now);
}

export function feelingCheckDue(now = Date.now()): boolean {
  return msUntilFeelingCheck(now) === 0;
}

/** True only the first time we ask on this East Africa calendar day. */
export function claimFeelingAsk(date = eatDate()): boolean {
  if (localStorage.getItem(ASKED_KEY) === date) return false;
  localStorage.setItem(ASKED_KEY, date);
  return true;
}

export function wasFeelingAskedToday(date = eatDate()): boolean {
  return localStorage.getItem(ASKED_KEY) === date;
}

export function pickFeelingPrompt(): string {
  const index = Math.floor(Math.random() * FEELING_PROMPTS.length);
  return FEELING_PROMPTS[index];
}

function readSeen(mood: VerseMood): string[] {
  try {
    const raw = localStorage.getItem(`${SEEN_PREFIX}${mood}`);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeSeen(mood: VerseMood, ids: string[]) {
  localStorage.setItem(`${SEEN_PREFIX}${mood}`, JSON.stringify(ids));
}

export function nextVerse(mood: VerseMood): QuranVerse {
  const pool = mood === "encouragement" ? encouragementVerses : motivationVerses;
  let seen = readSeen(mood);
  let unused = pool.filter((verse) => !seen.includes(verse.id));
  if (unused.length === 0) {
    seen = [];
    unused = [...pool];
  }
  const verse = unused[Math.floor(Math.random() * unused.length)];
  writeSeen(mood, [...seen, verse.id]);
  return verse;
}

export function classifyFeeling(raw: string): FeelingAnswer {
  const text = raw.trim().toLowerCase().replace(/['’]/g, "'");
  if (!text) return "other";

  if (
    /feeling down/.test(text) ||
    /not (so |that )?(good|great|well|ok|okay|fine)/.test(text) ||
    /i'?m not (ok|okay|fine|well)/.test(text) ||
    /\b(sad|down|low|bad|awful|terrible|depressed|upset|hurt|lonely|hopeless|anxious|worried|grief|grieving)\b/.test(
      text,
    )
  ) {
    return "down";
  }

  if (
    /\b(good|great|fine|well|ok|okay|alhamdulillah|happy|better|positive|grateful|content|peaceful|calm|strong|hopeful|blessed)\b/.test(
      text,
    )
  ) {
    return "good";
  }

  return "other";
}

export function moodForAnswer(answer: FeelingAnswer): VerseMood {
  return answer === "down" ? "motivation" : "encouragement";
}
