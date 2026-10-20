import { eatDate } from "../../shared/format";
import {
  encouragementVerses,
  motivationVerses,
  type QuranVerse,
  type VerseMood,
} from "../data/quran-verses";

const SESSION_KEY = "markaz_feeling_session_start";
const ASKED_KEY = "markaz_feeling_asked";
const ACTIVE_KEY = "markaz_feeling_active_ms";
const TICK_KEY = "markaz_feeling_last_tick";
const SEEN_PREFIX = "markaz_verse_seen_";
/** A checkup is earned for every 5 minutes actually spent working. */
const WORK_BEFORE_ASK_MS = 5 * 60 * 1000;
const MAX_ASKS_PER_DAY = 4;
/** Gaps longer than this mean the desk was left, not worked at. */
const IDLE_GAP_MS = 2 * 60 * 1000;

export const FEELING_PROMPTS = [
  "Hey — how are you feeling today?",
  "I hope you're not feeling bad today, if you are, close your eyes and take a deep breath, then write everything that's on your mind.",
  "Meemy! Before the day runs on, how is your heart?",
  "Assalamu alaikum. How are you holding up today?",
  "ding ding ding. How are you not holding up today FH?",
  "Forget spirit, are you still breathing fine?",
  "Hey, it's KFC here. Checking in — how are things with you today?",
  "Meemy. How are you feeling this hour?",
  "A soft question for you: how is your heart today?",
  "I'm still here with you, so how you holding up so far?",
  ];

export type FeelingAnswer = "good" | "down";

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

function readNumber(store: Storage, key: string): number {
  try {
    const raw = store.getItem(key);
    const value = raw == null ? 0 : Number(raw);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

/** Minutes actually spent at the desk today, across reloads. */
export function activeWorkMs(): number {
  const state = readAskState();
  // The tally belongs to a single day; a new day starts the count again.
  if (localStorage.getItem(`${ACTIVE_KEY}_date`) !== state.date) return 0;
  return readNumber(localStorage, ACTIVE_KEY);
}

/**
 * Add the time since the last tick, but only when the desk was genuinely in
 * use: a hidden tab does not tick, and a long gap is treated as time away
 * rather than work.
 */
export function recordWork(now = Date.now()): number {
  const date = eatDate();
  try {
    if (localStorage.getItem(`${ACTIVE_KEY}_date`) !== date) {
      localStorage.setItem(`${ACTIVE_KEY}_date`, date);
      localStorage.setItem(ACTIVE_KEY, "0");
    }
    const last = readNumber(sessionStorage, TICK_KEY);
    sessionStorage.setItem(TICK_KEY, String(now));
    if (last === 0) return activeWorkMs();
    const gap = now - last;
    if (gap <= 0 || gap > IDLE_GAP_MS) return activeWorkMs();
    const next = readNumber(localStorage, ACTIVE_KEY) + gap;
    localStorage.setItem(ACTIVE_KEY, String(Math.round(next)));
    return next;
  } catch {
    return 0;
  }
}

/** How many checkups the work done so far has earned, capped at the daily limit. */
function asksEarned(now = Date.now()): number {
  void now;
  return Math.min(MAX_ASKS_PER_DAY, Math.floor(activeWorkMs() / WORK_BEFORE_ASK_MS));
}

/** Milliseconds of further work before the next checkup, or Infinity when done for the day. */
export function msUntilFeelingCheck(now = Date.now()): number {
  const state = readAskState();
  if (state.count >= MAX_ASKS_PER_DAY) return Number.POSITIVE_INFINITY;
  ensureSessionStart(now);
  if (asksEarned(now) > state.count) return 0;
  const target = (state.count + 1) * WORK_BEFORE_ASK_MS;
  return Math.max(0, target - activeWorkMs());
}

export function feelingCheckDue(now = Date.now()): boolean {
  const wait = msUntilFeelingCheck(now);
  return Number.isFinite(wait) && wait === 0;
}

export function canAskFeelingToday(date = eatDate()): boolean {
  return readAskState(date).count < MAX_ASKS_PER_DAY;
}

/** True when today's checkups have all been used. */
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

export function moodForAnswer(answer: FeelingAnswer): VerseMood {
  return answer === "down" ? "motivation" : "encouragement";
}
