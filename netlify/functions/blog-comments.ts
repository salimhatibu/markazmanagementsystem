import type { Config, Context } from "@netlify/functions";
import { and, asc, count, eq } from "drizzle-orm";
import { db } from "../../db/index";
import { blogComments, posts } from "../../db/schema";
import { asIso } from "../../shared/format";
import { commentSessionId, sanitizeComment } from "../../shared/comment";
import { fail, handleError, json, parseId, readBody, ValidationError } from "./_shared/http";

async function publishedPost(id: number) {
  const [row] = await db
    .select({ id: posts.id, published: posts.published })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);
  if (!row || !row.published) return null;
  return row;
}

function present(row: typeof blogComments.$inferSelect) {
  return {
    id: row.id,
    body: row.body,
    createdAt: asIso(row.createdAt),
  };
}

export default async (req: Request, context: Context) => {
  try {
    const postId = parseId(context.params.postId);
    if (postId == null) return fail("Post not found.", 404);
    const post = await publishedPost(postId);
    if (!post) return fail("Post not found.", 404);

    if (req.method === "GET") {
      const rows = await db
        .select()
        .from(blogComments)
        .where(eq(blogComments.postId, postId))
        .orderBy(asc(blogComments.createdAt));
      return json({ comments: rows.map(present) });
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const sessionId = commentSessionId(body.sessionId);
      if (!sessionId) throw new ValidationError("Could not leave that note.");
      const text = sanitizeComment(String(body.body ?? ""));
      if (text.length < 2) throw new ValidationError("Write a little more.");
      if (text.length > 2000) throw new ValidationError("That note is too long.");
      const [tally] = await db
        .select({ value: count() })
        .from(blogComments)
        .where(and(eq(blogComments.postId, postId), eq(blogComments.sessionId, sessionId)));
      if ((tally?.value ?? 0) >= 30) throw new ValidationError("That is quite enough notes on this piece.");
      const [created] = await db
        .insert(blogComments)
        .values({ postId, sessionId, body: text })
        .returning();
      return json({ comment: present(created) }, 201);
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    return handleError(error);
  }
};

export const config: Config = {
  path: "/api/blog-comments/:postId",
  method: ["GET", "POST"],
  rateLimit: { windowSize: 60, windowLimit: 30, aggregateBy: "ip" },
};
