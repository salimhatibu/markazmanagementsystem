import { asc, desc, eq } from "drizzle-orm";
import { db } from "../../db/index";
import { feedbackTickets } from "../../db/schema";
import { asIso } from "../../shared/format";
import { requireAdmin } from "../_shared/auth";
import { fail, handleError, json, parseId, readBody } from "../_shared/http";
import { feedbackFields, parseBoolean } from "../_shared/validate";

function present(row: typeof feedbackTickets.$inferSelect) {
  return {
    id: row.id,
    kind: row.kind,
    body: row.body,
    done: Boolean(row.done),
    doneAt: row.doneAt ? asIso(row.doneAt) : null,
    createdAt: asIso(row.createdAt),
  };
}

export default async (req: Request, context: Context) => {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    if (req.method === "GET") {
      const rows = await db
        .select()
        .from(feedbackTickets)
        .orderBy(asc(feedbackTickets.done), desc(feedbackTickets.createdAt));
      return json({ tickets: rows.map(present) });
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const input = feedbackFields(body);
      const [created] = await db.insert(feedbackTickets).values(input).returning();
      return json({ ticket: present(created) }, 201);
    }

    if (req.method === "PUT" || req.method === "PATCH") {
      const id = parseId(context.params.id);
      if (id == null) return fail("Ticket not found.", 404);
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const done = parseBoolean(body.done, "Done");
      const [existing] = await db.select().from(feedbackTickets).where(eq(feedbackTickets.id, id)).limit(1);
      if (!existing) return fail("Ticket not found.", 404);
      const [updated] = await db
        .update(feedbackTickets)
        .set({
          done,
          doneAt: done ? existing.doneAt ?? new Date().toISOString() : null,
        })
        .where(eq(feedbackTickets.id, id))
        .returning();
      return json({ ticket: present(updated) });
    }

    if (req.method === "DELETE") {
      const id = parseId(context.params.id);
      if (id == null) return fail("Ticket not found.", 404);
      const [removed] = await db.delete(feedbackTickets).where(eq(feedbackTickets.id, id)).returning();
      if (!removed) return fail("Ticket not found.", 404);
      return json({ ok: true });
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    return handleError(error);
  }
};
