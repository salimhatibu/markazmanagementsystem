import { eq } from "drizzle-orm";
import { db } from "../../../db/index";
import { sessions, users } from "../../../db/schema";
import { hashPassword, randomToken, sha256, verifyPassword } from "./passwords";

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

function fail(message: string, status: number): Response {
  return json({ error: message }, status);
}

const COOKIE = "markaz_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type Account = { email: string };

function emailOf(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) return null;
  return email;
}

function passwordOf(value: unknown): string | null {
  if (typeof value !== "string" || value.length < 6 || value.length > 200) return null;
  return value;
}

export function readSessionToken(request: Request): string | null {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function cookie(token: string, request: Request, maxAge: number): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function withCookie(response: Response, request: Request, token: string, maxAge: number): Response {
  const headers = new Headers(response.headers);
  headers.append("Set-Cookie", cookie(token, request, maxAge));
  return new Response(response.body, { status: response.status, headers });
}

export async function currentAccount(request: Request): Promise<Account | null> {
  const token = readSessionToken(request);
  if (!token) return null;
  const tokenHash = await sha256(token);
  const now = new Date().toISOString();
  const [row] = await db
    .select({ email: users.email, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);
  if (!row || row.expiresAt <= now) return null;
  return { email: row.email };
}

async function startSession(userId: number, email: string, request: Request): Promise<Response> {
  const token = randomToken();
  const expires = new Date(Date.now() + MAX_AGE_SECONDS * 1000).toISOString();
  await db.insert(sessions).values({
    userId,
    tokenHash: await sha256(token),
    expiresAt: expires,
  });
  return withCookie(json({ user: { email } }), request, token, MAX_AGE_SECONDS);
}

export async function registerAccount(request: Request, body: Record<string, unknown> | null): Promise<Response> {
  const email = emailOf(body?.email);
  const password = passwordOf(body?.password);
  if (!email) return fail("Enter a valid email address.", 400);
  if (!password) return fail("Password must be at least 6 characters.", 400);
  try {
    const [created] = await db
      .insert(users)
      .values({ email, passwordHash: await hashPassword(password) })
      .returning({ id: users.id, email: users.email });
    return startSession(created.id, created.email, request);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes("unique")) {
      return fail("An account with that email already exists.", 409);
    }
    throw error;
  }
}

export async function loginAccount(request: Request, body: Record<string, unknown> | null): Promise<Response> {
  const email = emailOf(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) return fail("Email or password is not valid.", 401);
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return fail("Email or password is not valid.", 401);
  }
  return startSession(user.id, user.email, request);
}

export async function logoutAccount(request: Request): Promise<Response> {
  const token = readSessionToken(request);
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, await sha256(token)));
  }
  return withCookie(json({ ok: true }), request, "", 0);
}
