import { count, gte, lt } from "drizzle-orm";
import { db } from "../../db/index";
import { readerPresence } from "../../db/schema";
import { commentSessionId } from "../../shared/comment";
import { fail, handleError, json, readBody } from "../_shared/http";

/** A reader counts as here while a heartbeat landed within three polls. */
const ONLINE_MS = 90 * 1000;
/** Sessions this stale are no use to anyone, so a write clears them out. */
const STALE_MS = 6 * 60 * 60 * 1000;

async function readingNow(): Promise<number> {
  const since = new Date(Date.now() - ONLINE_MS).toISOString();
  const [row] = await db
    .select({ value: count() })
    .from(readerPresence)
    .where(gte(readerPresence.lastSeenAt, since));
  return row?.value ?? 0;
}

export default async (req: Request) => {
  try {
    if (req.method === "GET") {
      return json({ reading: await readingNow() });
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const sessionId = commentSessionId(body.sessionId);
      if (!sessionId) return fail("That reader could not be counted.", 400);

      const now = new Date().toISOString();
      await db
        .insert(readerPresence)
        .values({ sessionId, lastSeenAt: now })
        .onConflictDoUpdate({
          target: readerPresence.sessionId,
          set: { lastSeenAt: now },
        });

      // Keep the table to live sessions; it is only ever a running tally.
      await db
        .delete(readerPresence)
        .where(lt(readerPresence.lastSeenAt, new Date(Date.now() - STALE_MS).toISOString()));

      return json({ reading: await readingNow() });
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    return handleError(error);
  }
};
