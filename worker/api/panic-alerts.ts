import { desc } from "drizzle-orm";
import { db } from "../../db/index";
import { panicAlerts } from "../../db/schema";
import { asIso } from "../../shared/format";
import { readAccessIdentity, requireAdmin } from "../_shared/auth";
import { fail, handleError, json, readBody } from "../_shared/http";
import { panicAlertFields } from "../_shared/validate";

const LIST_MAX = 50;

function present(row: typeof panicAlerts.$inferSelect) {
  return {
    id: row.id,
    email: row.email,
    level: row.level,
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
        .from(panicAlerts)
        .orderBy(desc(panicAlerts.createdAt))
        .limit(LIST_MAX);
      return json({ alerts: rows.map(present) });
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const input = panicAlertFields(body);
      const [created] = await db.insert(panicAlerts).values({ email, ...input }).returning();
      return json({ alert: present(created) }, 201);
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    return handleError(error);
  }
};
