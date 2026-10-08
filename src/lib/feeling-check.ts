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
const INTERVAL_MS = 30 * 60 * 1000;
const MAX_ASKS_PER_DAY = 3;

export const FEELING_PROMPTS = [
  "Hey — how are you feeling today?",
  "Hello. Before the day runs on, how is your heart?",
  "Assalamu alaikum. How are you holding up today?",
  "ding ding ding. How are you not holding up today FH?",
  "Forget spirit, are you still breathing fine?",
  "Hey, it's KFC here. Checking in — how are things with you today?",
  "Meemy. How are you feeling this hour?",
  "A soft question for you: how is your heart today?",
  "I'm still here with you, so how you holding up so far?",
  ];

export type FeelingAnswer = "good" | "down" | "other";

type AskState = {
  date: string;
  count: number;
  lastAt: number;
};

function emptyAskState(date = eatDate()): AskState {
  return { date, count: 0, lastAt: 0 };
}

function readAskState(date = eatDate()): AskState {
  try {
    const raw = localStorage.getItem(ASKED_KEY);
    if (!raw) return emptyAskState(date);
    // Legacy: plain YYYY-MM-DD meant one ask that day.
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw === date ? { date, count: 1, lastAt: 0 } : emptyAskState(date);
    }
    const parsed = JSON.parse(raw) as Partial<AskState>;
    if (parsed.date !== date) return emptyAskState(date);
    const count = typeof parsed.count === "number" ? Math.max(0, Math.floor(parsed.count)) : 0;
    const lastAt = typeof parsed.lastAt === "number" ? parsed.lastAt : 0;
    return { date, count, lastAt };
  } catch {
    return emptyAskState(date);
  }
}

function writeAskState(state: AskState) {
  localStorage.setItem(ASKED_KEY, JSON.stringify(state));
}

export function ensureSessionStart(now = Date.now()): number {
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing && /^\d+$/.test(existing)) return Number(existing);
  sessionStorage.setItem(SESSION_KEY, String(now));
  return now;
}

/** Milliseconds until the next checkup, or Infinity when today's limit is reached. */
export function msUntilFeelingCheck(now = Date.now()): number {
  const state = readAskState();
  if (state.count >= MAX_ASKS_PER_DAY) return Number.POSITIVE_INFINITY;
  const start = ensureSessionStart(now);
  const anchor = state.lastAt > 0 ? state.lastAt : start;
  return Math.max(0, anchor + INTERVAL_MS - now);
}

export function feelingCheckDue(now = Date.now()): boolean {
  const wait = msUntilFeelingCheck(now);
  return Number.isFinite(wait) && wait === 0;
}

export function canAskFeelingToday(date = eatDate()): boolean {
  return readAskState(date).count < MAX_ASKS_PER_DAY;
}

/** True when today's two checkups have already been used. */
export function wasFeelingAskedToday(date = eatDate()): boolean {
  return !canAskFeelingToday(date);
}

/** Record one checkup. Returns false if today's limit is already reached. */
export function claimFeelingAsk(date = eatDate(), now = Date.now()): boolean {
  const state = readAskState(date);
  if (state.count >= MAX_ASKS_PER_DAY) return false;
  writeAskState({ date, count: state.count + 1, lastAt: now });
  return true;
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
