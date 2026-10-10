import { desc, eq } from "drizzle-orm";
import { db } from "../../db/index";
import { feelingEntries } from "../../db/schema";
import { asIso } from "../../shared/format";
import { readAccessIdentity, requireAdmin } from "../_shared/auth";
import { fail, handleError, json, readBody } from "../_shared/http";
import { oneOf, requiredMessage } from "../_shared/validate";

const LIST_MAX = 50;

function present(row: typeof feelingEntries.$inferSelect) {
  return {
    id: row.id,
    mood: row.mood,
    note: row.note,
    createdAt: asIso(row.createdAt),
  };
}

export default async (req: Request) => {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const identity = await readAccessIdentity(req);
    if (!identity?.email) return fail("Sign in to continue.", 401);
    const email = identity.email.toLowerCase();

    if (req.method === "GET") {
      const rows = await db
        .select()
        .from(feelingEntries)
        .where(eq(feelingEntries.email, email))
        .orderBy(desc(feelingEntries.createdAt))
        .limit(LIST_MAX);
      return json({ entries: rows.map(present) });
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const mood = oneOf(body.mood, ["good", "down"] as const, "Mood");
      const note = requiredMessage(body.note, "Note", 2000);
      const [created] = await db.insert(feelingEntries).values({ email, mood, note }).returning();
      const rows = await db
        .select()
        .from(feelingEntries)
        .where(eq(feelingEntries.email, email))
        .orderBy(desc(feelingEntries.createdAt))
        .limit(LIST_MAX);
      return json({ entry: present(created), entries: rows.map(present) }, 201);
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    return handleError(error);
  }
};
