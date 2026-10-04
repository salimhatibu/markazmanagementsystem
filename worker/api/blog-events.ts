import { and, eq, isNull, lt, or } from "drizzle-orm";
import { db } from "../../db/index";
import { blogEvents, posts } from "../../db/schema";
import { fail, handleError, json, parseId, readBody, ValidationError } from "../_shared/http";

const KINDS = new Set(["impression", "click", "view", "dwell"]);

export default async (req: Request) => {
  try {
    if (req.method !== "POST") return fail("Method not allowed.", 405);
    const body = await readBody(req);
    if (!body) return fail("Request body must be an object.", 400);
    const postId = parseId(String(body.postId ?? ""));
    if (postId == null) throw new ValidationError("That post could not be recorded.");
    const kind = String(body.kind ?? "");
    if (!KINDS.has(kind)) throw new ValidationError("Unknown event.");
    const sessionId = String(body.sessionId ?? "").trim();
    if (sessionId.length < 8 || sessionId.length > 64) throw new ValidationError("Session is missing.");
    const dwellMsRaw = body.dwellMs;
    const dwellMs =
      kind === "dwell"
        ? Math.max(0, Math.min(86_400_000, Number(dwellMsRaw) || 0))
        : null;

    const [post] = await db.select({ id: posts.id }).from(posts).where(eq(posts.id, postId)).limit(1);
    if (!post) return fail("Post not found.", 404);

    // One impression, click, or view per device for the life of that browser.
    // A later visit from the same device must not raise the count again.
    if (kind === "impression" || kind === "view" || kind === "click") {
      const [existing] = await db
        .select({ id: blogEvents.id })
        .from(blogEvents)
        .where(
          and(
            eq(blogEvents.postId, postId),
            eq(blogEvents.sessionId, sessionId),
            eq(blogEvents.kind, kind),
          ),
        )
        .limit(1);
      if (existing) return json({ ok: true, skipped: true });
    }

    // Readers heartbeat while a post is open, but the report only ever reads
    // MAX(dwell_ms) per session. Keep one row per reader and raise it instead
    // of appending a row every beat.
    if (kind === "dwell") {
      const [existing] = await db
        .select({ id: blogEvents.id })
        .from(blogEvents)
        .where(
          and(
            eq(blogEvents.postId, postId),
            eq(blogEvents.sessionId, sessionId),
            eq(blogEvents.kind, "dwell"),
          ),
        )
        .limit(1);
      if (existing) {
        await db
          .update(blogEvents)
          .set({ dwellMs })
          // Only ever raise the figure; `lt` alone would skip a NULL row.
          .where(
            and(
              eq(blogEvents.id, existing.id),
              or(isNull(blogEvents.dwellMs), lt(blogEvents.dwellMs, dwellMs ?? 0)),
            ),
          );
        return json({ ok: true });
      }
    }

    await db
      .insert(blogEvents)
      .values({
        postId,
        kind,
        sessionId,
        dwellMs,
      })
      .onConflictDoNothing({
        target: [blogEvents.postId, blogEvents.sessionId, blogEvents.kind],
      });
    return json({ ok: true }, 201);
  } catch (error) {
    return handleError(error);
  }
};

