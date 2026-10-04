import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/index";
import { blogSaves, posts, series } from "../../db/schema";
import { commentSessionId } from "../../shared/comment";
import { handleError, json } from "../_shared/http";
import { presentPostCard } from "../_shared/posts";

export default async (req: Request) => {
  try {
    if (req.method !== "GET") return json({ error: "Method not allowed." }, 405);
    const url = new URL(req.url);
    const sessionId = commentSessionId(url.searchParams.get("sessionId"));
    if (!sessionId) return json({ posts: [] });
    const rows = await db
      .select({
        id: posts.id,
        slug: posts.slug,
        title: posts.title,
        excerpt: posts.excerpt,
        coverKey: posts.coverKey,
        seriesId: posts.seriesId,
        seriesSlug: series.slug,
        seriesTitle: series.title,
        published: posts.published,
        publishedAt: posts.publishedAt,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
      })
      .from(blogSaves)
      .innerJoin(posts, eq(blogSaves.postId, posts.id))
      .leftJoin(series, eq(posts.seriesId, series.id))
      .where(and(eq(blogSaves.sessionId, sessionId), eq(posts.published, true)))
      .orderBy(desc(blogSaves.createdAt))
      .limit(100);
    return json({ posts: rows.map(presentPostCard) });
  } catch (error) {
    return handleError(error);
  }
};

