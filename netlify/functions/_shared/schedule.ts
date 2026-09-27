const NEXT_RUN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

/** Netlify posts `{ next_run }` as an ISO timestamp. Reject anything else. */
export function isScheduledNextRun(value: unknown): value is string {
  if (typeof value !== "string" || !NEXT_RUN.test(value)) return false;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return false;
  const now = Date.now();
  if (time < now - 36 * 60 * 60 * 1000) return false;
  if (time > now + 400 * 24 * 60 * 60 * 1000) return false;
  return true;
}
