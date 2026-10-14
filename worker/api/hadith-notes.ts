import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/index";
import { hadithNotes } from "../../db/schema";
import { asIso } from "../../shared/format";
import { readAccessIdentity, requireAdmin } from "../_shared/auth";
import { fail, handleError, json, parseId, readBody } from "../_shared/http";
import { parseDate, requiredMessage } from "../_shared/validate";

const LIST_MAX = 200;

function present(row: typeof hadithNotes.$inferSelect) {
  return {
    id: row.id,
    date: row.noteDate,
    body: row.body,
    savedAt: asIso(row.updatedAt),
    createdAt: asIso(row.createdAt),
  };
}

export default async (req: Request, context: { params: Record<string, string> }) => {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const identity = await readAccessIdentity(req);
    if (!identity?.email) return fail("Sign in to continue.", 401);
    const email = identity.email.toLowerCase();
    const id = parseId(context.params.id);

    if (req.method === "GET") {
      const rows = await db
        .select()
        .from(hadithNotes)
        .where(eq(hadithNotes.email, email))
        .orderBy(desc(hadithNotes.updatedAt))
        .limit(LIST_MAX);
      return json({ notes: rows.map(present) });
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const noteDate = parseDate(body.date, "Date");
      const text = requiredMessage(body.body, "Note", 4000);
      const [created] = await db
        .insert(hadithNotes)
        .values({ email, noteDate, body: text })
        .returning();
      return json({ note: present(created) }, 201);
    }

    if (req.method === "PUT") {
      if (id == null) return fail("Note not found.", 404);
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const text = requiredMessage(body.body, "Note", 4000);
      const [updated] = await db
        .update(hadithNotes)
        .set({ body: text, updatedAt: new Date().toISOString() })
        // Scoped by email as well as id, so one keeper cannot reach another's notes.
        .where(and(eq(hadithNotes.id, id), eq(hadithNotes.email, email)))
        .returning();
      if (!updated) return fail("Note not found.", 404);
      return json({ note: present(updated) });
    }

    if (req.method === "DELETE") {
      if (id == null) return fail("Note not found.", 404);
      const [removed] = await db
        .delete(hadithNotes)
        .where(and(eq(hadithNotes.id, id), eq(hadithNotes.email, email)))
        .returning();
      if (!removed) return fail("Note not found.", 404);
      return json({ ok: true });
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    return handleError(error);
  }
};
