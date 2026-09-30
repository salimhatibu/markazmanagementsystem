import type { Config, Context } from "@netlify/functions";
import { and, count, eq } from "drizzle-orm";
import { db } from "../../db/index";
import { blogLikes, posts } from "../../db/schema";
import { commentSessionId } from "../../shared/comment";
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

async function likeState(postId: number, sessionId: string) {
  const [tally] = await db.select({ value: count() }).from(blogLikes).where(eq(blogLikes.postId, postId));
  const [mine] = sessionId
    ? await db
        .select({ id: blogLikes.id })
        .from(blogLikes)
        .where(and(eq(blogLikes.postId, postId), eq(blogLikes.sessionId, sessionId)))
        .limit(1)
    : [undefined];
  return { likes: tally?.value ?? 0, liked: Boolean(mine) };
}

export default async (req: Request, context: Context) => {
  try {
    const postId = parseId(context.params.postId);
    if (postId == null) return fail("Post not found.", 404);
    const post = await publishedPost(postId);
    if (!post) return fail("Post not found.", 404);

    if (req.method === "GET") {
      const url = new URL(req.url);
      const sessionId = commentSessionId(url.searchParams.get("sessionId"));
      return json(await likeState(postId, sessionId));
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const sessionId = commentSessionId(body.sessionId);
      if (!sessionId) throw new ValidationError("Could not record that.");
      const [existing] = await db
        .select({ id: blogLikes.id })
        .from(blogLikes)
        .where(and(eq(blogLikes.postId, postId), eq(blogLikes.sessionId, sessionId)))
        .limit(1);
      if (existing) await db.delete(blogLikes).where(eq(blogLikes.id, existing.id));
      else await db.insert(blogLikes).values({ postId, sessionId });
      return json(await likeState(postId, sessionId));
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    return handleError(error);
  }
};

export const config: Config = {
  path: "/api/blog-likes/:postId",
  method: ["GET", "POST"],
  rateLimit: { windowSize: 60, windowLimit: 60, aggregateBy: "ip" },
};
