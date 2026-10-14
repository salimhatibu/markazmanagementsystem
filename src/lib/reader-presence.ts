import { api } from "./api";
import { blogSessionId } from "./blog-track";

/** Often enough to feel live, rarely enough to stay cheap. */
export const READER_POLL_MS = 30 * 1000;

/** Beat once for this reader and return how many are on the papers now. */
export async function beatReaderPresence(): Promise<number> {
  const body = await api<{ reading: number }>("/api/reader-presence", {
    method: "POST",
    body: JSON.stringify({ sessionId: blogSessionId() }),
  });
  return body.reading;
}

export function readingLine(reading: number): string {
  if (reading <= 1) return "You have the paper to yourself";
  if (reading === 2) return "One other reader is here";
  return `${reading - 1} others are reading now`;
}
