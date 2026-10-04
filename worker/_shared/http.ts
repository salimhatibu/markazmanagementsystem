export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const MAX_BODY_BYTES = 32_768;

export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
  "X-Frame-Options": "DENY",
  "Cache-Control": "no-store",
};

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: SECURITY_HEADERS });
}

export function fail(message: string, status: number): Response {
  return json({ error: message }, status);
}

export async function readBody(req: Request, maxBytes = MAX_BODY_BYTES): Promise<Record<string, unknown> | null> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.toLowerCase().includes("application/json")) return null;
  const length = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > maxBytes) {
    throw new ValidationError("Request is too large.");
  }
  try {
    const raw = await req.text();
    if (raw.length > maxBytes) throw new ValidationError("Request is too large.");
    const body: unknown = raw ? JSON.parse(raw) : null;
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    return null;
  }
}

export function parseId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function errorText(error: unknown): string {
  const cause = error instanceof Error && "cause" in error ? String(error.cause) : "";
  const message = error instanceof Error ? error.message : String(error);
  return `${message} ${cause}`;
}

export function isUniqueViolation(error: unknown): boolean {
  const text = errorText(error).toLowerCase();
  return text.includes("unique") || text.includes("constraint failed");
}

function isMissingRelation(error: unknown): boolean {
  const text = errorText(error).toLowerCase();
  return text.includes("no such table") || text.includes("does not exist");
}

export function handleError(error: unknown): Response {
  if (error instanceof ValidationError) return fail(error.message, 400);
  if (isUniqueViolation(error)) {
    const text = errorText(error).toLowerCase();
    if (text.includes("admission")) return fail("That admission number is already in use.", 409);
    return fail("This record already exists.", 409);
  }
  if (isMissingRelation(error)) {
    return fail("The records list is still being set up. Try again in a moment.", 503);
  }
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(message);
  return fail("Something went wrong. Please try again.", 500);
}
