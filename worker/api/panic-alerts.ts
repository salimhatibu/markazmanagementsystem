import { desc, eq } from "drizzle-orm";
import { db } from "../../db/index";
import { notificationReads, notifications, panicAlerts } from "../../db/schema";
import { asIso, eatDate } from "../../shared/format";
import { readAccessIdentity, requireAdmin } from "../_shared/auth";
import { fail, handleError, json, readBody } from "../_shared/http";
import { panicAlertFields } from "../_shared/validate";

const LIST_MAX = 50;

/** Kept in step with PANIC_LEVELS in src/lib/panic.ts; the worker cannot import the client. */
const LEVEL_LABELS = ["", "Unsettled", "Worried", "Serious", "Severe", "Critical"];

/**
 * Put the alert on every keeper's bell. An emergency must never fail because the
 * notice behind it did, so this swallows its own errors.
 */
async function tellTheKeepers(alert: typeof panicAlerts.$inferSelect) {
  try {
    const label = LEVEL_LABELS[alert.level] ?? "Raised";
    const [created] = await db
      .insert(notifications)
      .values({
        kind: "panic",
        title: `Panic raised \u2014 level ${alert.level} \u00b7 ${label}`,
        body: alert.note,
        author: alert.email,
      })
      .returning();
    // The keeper who raised it has plainly read their own alert.
    await db
      .insert(notificationReads)
      .values({ notificationId: created.id, email: alert.email })
      .onConflictDoNothing();
  } catch {
    // Deliberately quiet.
  }
}

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
      await tellTheKeepers(created);
      return json({ alert: present(created) }, 201);
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    return handleError(error);
  }
};
