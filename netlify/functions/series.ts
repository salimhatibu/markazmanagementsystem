import type { Config, Context } from "@netlify/functions";
import { asc, count, desc, eq } from "drizzle-orm";
import { db } from "../../db/index";
import { posts, series } from "../../db/schema";
import { slugFromTitle } from "../../shared/slug";
import { requireAdmin } from "./_shared/auth";
import { fail, handleError, isUniqueViolation, json, parseId, readBody, ValidationError } from "./_shared/http";
import { presentPostCard } from "./_shared/posts";

async function uniqueSlug(base: string, exceptId?: number) {
  let slug = base.slice(0, 80);
  let n = 2;
  for (;;) {
    const [row] = await db.select({ id: series.id }).from(series).where(eq(series.slug, slug)).limit(1);
    if (!row || row.id === exceptId) return slug;
    slug = `${base.slice(0, 70)}-${n}`;
    n += 1;
  }
}

function fields(body: Record<string, unknown>) {
  const title = String(body.title ?? "").trim();
  if (title.length < 2) throw new ValidationError("Give the series a title.");
  if (title.length > 120) throw new ValidationError("The series title is too long.");
  const blurb = String(body.blurb ?? "").trim().slice(0, 400);
  return { title, blurb: blurb || null };
}

async function listSeries() {
  const rows = await db.select().from(series).orderBy(asc(series.title));
  const tallies = await db
    .select({ seriesId: posts.seriesId, value: count() })
    .from(posts)
    .where(eq(posts.published, true))
    .groupBy(posts.seriesId);
  const counts = new Map(tallies.map((row) => [row.seriesId, row.value]));
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    blurb: row.blurb ?? "",
    publishedCount: counts.get(row.id) ?? 0,
  }));
}

export default async (req: Request, context: Context) => {
  try {
    const key = context.params.key?.trim() ?? "";
    const id = key && /^\d+$/.test(key) ? parseId(key) : null;
    const writing = req.method === "POST" || req.method === "PUT" || req.method === "DELETE";
    if (writing) {
      const denied = await requireAdmin();
      if (denied) return denied;
    }

    if (req.method === "GET" && !key) {
      return json({ series: await listSeries() });
    }

    if (req.method === "GET" && key && id == null) {
      const [row] = await db.select().from(series).where(eq(series.slug, key)).limit(1);
      if (!row) return fail("That series is not on the paper.", 404);
      const papers = await db
        .select({
          id: posts.id,
          slug: posts.slug,
          title: posts.title,
          excerpt: posts.excerpt,
          coverKey: posts.coverKey,
          seriesId: posts.seriesId,
          published: posts.published,
          publishedAt: posts.publishedAt,
          createdAt: posts.createdAt,
          updatedAt: posts.updatedAt,
        })
        .from(posts)
        .where(eq(posts.seriesId, row.id))
        .orderBy(desc(posts.publishedAt), desc(posts.createdAt));
      const published = papers.filter((post) => post.published);
      return json({
        series: { id: row.id, slug: row.slug, title: row.title, blurb: row.blurb ?? "" },
        posts: published.map((post) =>
          presentPostCard({ ...post, seriesSlug: row.slug, seriesTitle: row.title }),
        ),
      });
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const input = fields(body);
      const slug = await uniqueSlug(slugFromTitle(input.title));
      const [created] = await db.insert(series).values({ slug, title: input.title, blurb: input.blurb }).returning();
      return json({ series: { id: created.id, slug: created.slug, title: created.title, blurb: created.blurb ?? "" } }, 201);
    }

    if (req.method === "PUT" && id != null) {
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const input = fields(body);
      const [existing] = await db.select().from(series).where(eq(series.id, id)).limit(1);
      if (!existing) return fail("That series is not on the desk.", 404);
      const slug = input.title !== existing.title ? await uniqueSlug(slugFromTitle(input.title), id) : existing.slug;
      const [updated] = await db
        .update(series)
        .set({ title: input.title, blurb: input.blurb, slug })
        .where(eq(series.id, id))
        .returning();
      return json({ series: { id: updated.id, slug: updated.slug, title: updated.title, blurb: updated.blurb ?? "" } });
    }

    if (req.method === "DELETE" && id != null) {
      const [existing] = await db.select({ id: series.id }).from(series).where(eq(series.id, id)).limit(1);
      if (!existing) return fail("That series is not on the desk.", 404);
      await db.delete(series).where(eq(series.id, id));
      return json({ ok: true });
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    if (isUniqueViolation(error)) return fail("Another series already uses that title.", 409);
    return handleError(error);
  }
};

export const config: Config = {
  path: ["/api/series", "/api/series/:key"],
  method: ["GET", "POST", "PUT", "DELETE"],
  rateLimit: { windowSize: 60, windowLimit: 60, aggregateBy: "ip" },
};
