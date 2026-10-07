import { desc, eq } from "drizzle-orm";
import { db } from "../../db/index";
import { newsletterSubscribers } from "../../db/schema";
import { asIso } from "../../shared/format";
import { requireAdmin } from "../_shared/auth";
import { publicOriginFromEnv } from "../_shared/hosts";
import { fail, handleError, json, readBody } from "../_shared/http";
import { requiredEmail } from "../_shared/validate";

function leavePage(message: string, papersHref: string) {
  const safe = message.replace(/[&<>']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[char] ?? char);
  const href = papersHref.replace(/"/g, "&quot;");
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>The letter</title><body style="font-family:Georgia,serif;max-width:36rem;margin:4rem auto;padding:0 1.25rem"><p>${safe}</p><p><a href="${href}">Back to the papers</a></p></body>`,
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

export default async (req: Request) => {
  try {
    const url = new URL(req.url);
    if (url.pathname.endsWith("/leave")) {
      const papersHref = `${publicOriginFromEnv(req)}/`;
      const token = url.searchParams.get("token")?.trim() ?? "";
      if (!/^[A-Za-z0-9-]{8,64}$/.test(token)) return leavePage("That link could not be used.", papersHref);
      await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.token, token));
      return leavePage("You will not receive further letters.", papersHref);
    }

    if (req.method === "GET") {
      const denied = await requireAdmin();
      if (denied) return denied;
      const rows = await db
        .select({
          id: newsletterSubscribers.id,
          email: newsletterSubscribers.email,
          createdAt: newsletterSubscribers.createdAt,
        })
        .from(newsletterSubscribers)
        .orderBy(desc(newsletterSubscribers.createdAt))
        .limit(500);
      return json({
        subscribers: rows.map((row) => ({ id: row.id, email: row.email, createdAt: asIso(row.createdAt) })),
      });
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const email = requiredEmail(body.email, "Email").toLowerCase();
      const [existing] = await db
        .select({ id: newsletterSubscribers.id })
        .from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.email, email))
        .limit(1);
      if (existing) return json({ ok: true, already: true });
      await db.insert(newsletterSubscribers).values({ email, token: crypto.randomUUID() });
      return json({ ok: true }, 201);
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    return handleError(error);
  }
};
