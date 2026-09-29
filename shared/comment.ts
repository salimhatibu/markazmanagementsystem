export function sanitizeComment(raw: string): string {
  const text = raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

export function commentSessionId(raw: unknown): string {
  const value = String(raw ?? "").trim();
  if (!/^[A-Za-z0-9._-]{8,64}$/.test(value)) return "";
  return value;
}
