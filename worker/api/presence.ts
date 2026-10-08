import { desc } from "drizzle-orm";
import { db } from "../../db/index";
import { adminPresence } from "../../db/schema";
import { readAccessIdentity, requireAdmin } from "../_shared/auth";
import { fail, handleError, json } from "../_shared/http";

/** Online while a heartbeat arrived within three 30s polls. */
const ONLINE_MS = 90 * 1000;

function displayLabel(email: string, name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (trimmed) return trimmed;
  const local = email.split("@")[0]?.trim();
  return local || email;
}

export default async (req: Request) => {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    if (req.method === "POST") {
      const identity = await readAccessIdentity(req);
      if (!identity?.email) return fail("Sign in to continue.", 401);
      const now = new Date().toISOString();
      const name = identity.name?.trim() || null;
      await db
        .insert(adminPresence)
        .values({
          email: identity.email.toLowerCase(),
          name,
          lastSeenAt: now,
        })
        .onConflictDoUpdate({
          target: adminPresence.email,
          set: {
            name,
            lastSeenAt: now,
          },
        });
      return json({ ok: true, lastSeenAt: now });
    }

    if (req.method === "GET") {
      const rows = await db
        .select()
        .from(adminPresence)
        .orderBy(desc(adminPresence.lastSeenAt));
      const now = Date.now();
      const keepers = rows.map((row) => {
        const lastSeenMs = Date.parse(row.lastSeenAt);
        const online = Number.isFinite(lastSeenMs) && now - lastSeenMs <= ONLINE_MS;
        return {
          email: row.email,
          label: displayLabel(row.email, row.name),
          lastSeenAt: row.lastSeenAt,
          online,
        };
      });
      return json({ keepers });
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    return handleError(error);
  }
};
