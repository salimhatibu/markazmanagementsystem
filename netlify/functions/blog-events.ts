import type { Config } from "@netlify/functions";
import { and, eq, gte } from "drizzle-orm";
import { db } from "../../db/index";
import { blogEvents, posts } from "../../db/schema";
import { fail, handleError, json, parseId, readBody, ValidationError } from "./_shared/http";

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

    if (kind === "impression" || kind === "view") {
      const since = new Date(Date.now() - 12 * 60 * 60 * 1000);
      const [existing] = await db
        .select({ id: blogEvents.id })
        .from(blogEvents)
        .where(
          and(
            eq(blogEvents.postId, postId),
            eq(blogEvents.sessionId, sessionId),
            eq(blogEvents.kind, kind),
            gte(blogEvents.createdAt, since),
          ),
        )
        .limit(1);
      if (existing) return json({ ok: true, skipped: true });
    }

    await db.insert(blogEvents).values({
      postId,
      kind,
      sessionId,
      dwellMs,
    });
    return json({ ok: true }, 201);
  } catch (error) {
    return handleError(error);
  }
};

export const config: Config = {
  path: "/api/blog-events",
  method: "POST",
};
