import { currentRequest } from "../../../db/index";
import { currentAccount } from "./accounts";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

export function fail(message: string, status: number): Response {
  return json({ error: message }, status);
}

export async function requireUser(): Promise<Response | null> {
  const user = await currentAccount(currentRequest());
  if (!user) return fail("Unauthorized", 401);
  return null;
}

export async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function parseId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

export function isUniqueViolation(error: unknown): boolean {
  const cause = error instanceof Error && "cause" in error ? String(error.cause) : "";
  const message = error instanceof Error ? error.message : String(error);
  const text = `${message} ${cause}`;
  const lower = text.toLowerCase();
  return text.includes("23505") || lower.includes("unique");
}

export function handleError(error: unknown): Response {
  if (error instanceof ValidationError) return fail(error.message, 400);
  if (isUniqueViolation(error)) return fail("Admission number is already in use.", 409);
  console.error(error);
  return fail("Something went wrong.", 500);
}
