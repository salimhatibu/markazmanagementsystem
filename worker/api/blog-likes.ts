import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "../../db/index";
import { blogLikes, notificationReads, notifications, posts } from "../../db/schema";
import { commentSessionId } from "../../shared/comment";
import { fail, handleError, json, parseId, readBody, ValidationError } from "../_shared/http";

async function publishedPost(id: number) {
  const [row] = await db
    .select({ id: posts.id, title: posts.title, published: posts.published })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);
  if (!row || !row.published) return null;
  return row;
}

/**
 * One live tally per paper rather than a row per tap: while a like notice is
 * still unread by everyone it is refreshed in place, so toggling a like on and
 * off cannot flood the bell. Once the keepers have read it, the next like
 * starts a fresh one.
 */
async function noteLike(postId: number, title: string, total: number) {
  const [standing] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .leftJoin(notificationReads, eq(notificationReads.notificationId, notifications.id))
    .where(
      and(
        eq(notifications.kind, "like"),
        eq(notifications.postId, postId),
        isNull(notifications.readAt),
        isNull(notificationReads.notificationId),
      ),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(1);

  const headline = total === 1 ? `Someone liked “${title}”` : `${total} readers liked “${title}”`;
  if (standing) {
    await db
      .update(notifications)
      .set({ title: headline, createdAt: new Date().toISOString() })
      .where(eq(notifications.id, standing.id));
    return;
  }
  await db.insert(notifications).values({ kind: "like", title: headline, postId });
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
      const state = await likeState(postId, sessionId);
      if (!existing) {
        // A reader's like must never fail because the desk alert did.
        try {
          await noteLike(postId, post.title, state.likes);
        } catch {
          /* best effort */
        }
      }
      return json(state);
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    return handleError(error);
  }
};

