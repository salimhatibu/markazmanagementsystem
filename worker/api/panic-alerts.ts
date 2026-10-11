import { desc, eq } from "drizzle-orm";
import { db } from "../../db/index";
import { panicAlerts } from "../../db/schema";
import { asIso, eatDate } from "../../shared/format";
import { readAccessIdentity, requireAdmin } from "../_shared/auth";
import { fail, handleError, json, readBody } from "../_shared/http";
import { panicAlertFields } from "../_shared/validate";

const LIST_MAX = 50;

/** The button is deliberately a once-a-day call, counted on the East Africa calendar. */
async function raisedToday(email: string): Promise<boolean> {
  const [latest] = await db
    .select({ createdAt: panicAlerts.createdAt })
    .from(panicAlerts)
    .where(eq(panicAlerts.email, email))
    .orderBy(desc(panicAlerts.createdAt))
    .limit(1);
  if (!latest) return false;
  return eatDate(new Date(asIso(latest.createdAt))) === eatDate();
}

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
      return json({ alerts: rows.map(present), usedToday: await raisedToday(email) });
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const input = panicAlertFields(body);
      if (await raisedToday(email)) {
        return fail("The panic button has already been raised today. It opens again tomorrow.", 429);
      }
      const [created] = await db.insert(panicAlerts).values({ email, ...input }).returning();
      return json({ alert: present(created) }, 201);
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    return handleError(error);
  }
};
