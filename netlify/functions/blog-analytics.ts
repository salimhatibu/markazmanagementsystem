import type { Config } from "@netlify/functions";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/index";
import { blogEvents, posts } from "../../db/schema";
import { requireAdmin } from "./_shared/auth";
import { fail, handleError, json } from "./_shared/http";

const BAR_COLORS = ["#42623e", "#bc4129", "#ad7d36", "#6e7262", "#78647d", "#788893"];

type CountRow = {
  post_id: number;
  views: number;
  unique_readers: number;
  impressions: number;
  clicks: number;
};

type DwellRow = {
  post_id: number;
  session_id: string;
  dwell: number;
};

function asInt(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown[] }).rows;
    if (Array.isArray(rows)) return rows as T[];
  }
  return [];
}

export default async (req: Request) => {
  try {
    if (req.method !== "GET") return fail("Method not allowed.", 405);
    const denied = await requireAdmin();
    if (denied) return denied;

    const published = await db
      .select({
        id: posts.id,
        slug: posts.slug,
        title: posts.title,
        published: posts.published,
        publishedAt: posts.publishedAt,
      })
      .from(posts)
      .orderBy(desc(posts.publishedAt), desc(posts.createdAt));

    const counts = rowsOf<CountRow>(
      await db.execute(sql`
      SELECT
        post_id,
        COUNT(DISTINCT session_id) FILTER (WHERE kind = 'view')::int AS views,
        COUNT(DISTINCT session_id) FILTER (WHERE kind = 'view')::int AS unique_readers,
        COUNT(DISTINCT session_id) FILTER (WHERE kind = 'impression')::int AS impressions,
        COUNT(DISTINCT session_id) FILTER (
          WHERE kind = 'click'
            AND EXISTS (
              SELECT 1
              FROM blog_events seen
              WHERE seen.post_id = blog_events.post_id
                AND seen.session_id = blog_events.session_id
                AND seen.kind = 'impression'
            )
        )::int AS clicks
      FROM blog_events
      GROUP BY post_id
    `),
    );

    const dwells = rowsOf<DwellRow>(
      await db.execute(sql`
      SELECT post_id, session_id, MAX(dwell_ms)::int AS dwell
      FROM blog_events
      WHERE kind = 'dwell'
      GROUP BY post_id, session_id
    `),
    );

    const countMap = new Map<number, CountRow>();
    for (const row of counts) {
      const record = row as CountRow & { postId?: number };
      countMap.set(asInt(record.post_id ?? record.postId), record);
    }

    const dwellByPost = new Map<number, number[]>();
    for (const row of dwells) {
      const record = row as DwellRow & { postId?: number; sessionId?: string };
      const id = asInt(record.post_id ?? record.postId);
      const list = dwellByPost.get(id) ?? [];
      list.push(asInt(record.dwell));
      dwellByPost.set(id, list);
    }

    const postStats = published.map((post, index) => {
      const row = countMap.get(post.id);
      const views = asInt(row?.views);
      const uniqueReaders = asInt(row?.unique_readers);
      const impressions = asInt(row?.impressions);
      const clicks = asInt(row?.clicks);
      const sessionDwells = dwellByPost.get(post.id) ?? [];
      const totalDwellMs = sessionDwells.reduce((sum, ms) => sum + ms, 0);
      const dwellSessions = sessionDwells.length;
      const avgDwellMs = dwellSessions ? Math.round(totalDwellMs / dwellSessions) : 0;
      const bounces = sessionDwells.filter((ms) => ms < 15_000).length;
      const bounceRate = sessionDwells.length ? bounces / sessionDwells.length : 0;
      const ctr = impressions > 0 ? clicks / impressions : 0;
      return {
        id: post.id,
        slug: post.slug,
        title: post.title,
        published: post.published,
        views,
        uniqueReaders,
        impressions,
        clicks,
        ctr,
        avgDwellMs,
        bounceRate,
        totalDwellMs,
        dwellSessions,
        color: BAR_COLORS[index % BAR_COLORS.length],
      };
    });

    const totals = postStats.reduce(
      (acc, post) => {
        acc.views += post.views;
        acc.uniqueReaders += post.uniqueReaders;
        acc.impressions += post.impressions;
        acc.clicks += post.clicks;
        acc.totalDwellMs += post.totalDwellMs;
        acc.dwellSessions += post.dwellSessions;
        if (post.published) acc.postsPublished += 1;
        return acc;
      },
      { views: 0, uniqueReaders: 0, impressions: 0, clicks: 0, totalDwellMs: 0, dwellSessions: 0, postsPublished: 0 },
    );

    const recentRows = await db
      .select({
        kind: blogEvents.kind,
        dwellMs: blogEvents.dwellMs,
        createdAt: blogEvents.createdAt,
        title: posts.title,
      })
      .from(blogEvents)
      .innerJoin(posts, eq(posts.id, blogEvents.postId))
      .orderBy(desc(blogEvents.createdAt))
      .limit(8);

    return json({
      totals: {
        ...totals,
        ctr: totals.impressions > 0 ? totals.clicks / totals.impressions : 0,
        avgDwellMs: totals.dwellSessions > 0 ? Math.round(totals.totalDwellMs / totals.dwellSessions) : 0,
        drafts: published.filter((post) => !post.published).length,
      },
      posts: postStats,
      recent: recentRows.map((row) => ({
        kind: row.kind,
        title: row.title,
        dwellMs: row.dwellMs,
        at: row.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleError(error);
  }
};

export const config: Config = {
  path: "/api/blog-analytics",
  method: "GET",
};
