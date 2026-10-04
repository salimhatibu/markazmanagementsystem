import { desc, eq } from "drizzle-orm";
import { db } from "../../db/index";
import { posts, series } from "../../db/schema";
import { notifyNewPaper, siteOrigin } from "../_shared/newsletter";
import { excerptFromHtml, sanitizePostHtml } from "../../shared/post-html";
import { slugFromTitle } from "../../shared/slug";
import { requireAdmin } from "../_shared/auth";
import { fail, handleError, isUniqueViolation, json, parseId, readBody, ValidationError } from "../_shared/http";
import { presentPost, presentPostCard } from "../_shared/posts";

const POST_BODY_MAX = 400_000;
const POST_LIST_MAX = 200;

function isoNow(): string {
  return new Date().toISOString();
}

async function uniqueSlug(base: string, exceptId?: number) {
  let slug = base;
  let n = 2;
  for (;;) {
    const [row] = await db.select({ id: posts.id }).from(posts).where(eq(posts.slug, slug)).limit(1);
    if (!row || row.id === exceptId) return slug;
    slug = `${base.slice(0, 70)}-${n}`;
    n += 1;
  }
}

function fields(body: Record<string, unknown>, existingTitle?: string) {
  const title = String(body.title ?? existingTitle ?? "").trim();
  if (title.length < 2) throw new ValidationError("Give the post a title.");
  if (title.length > 255) throw new ValidationError("The title is too long.");
  const bodyHtml = sanitizePostHtml(String(body.bodyHtml ?? ""));
  const excerptRaw = String(body.excerpt ?? "").trim();
  const excerpt = (excerptRaw || excerptFromHtml(bodyHtml)).slice(0, 500);
  const coverKey =
    body.coverKey === null
      ? null
      : typeof body.coverKey === "string" && body.coverKey.startsWith("blog/")
        ? body.coverKey
        : undefined;
  const published = body.published === true;
  const seriesId = seriesIdOf(body);
  return { title, bodyHtml, excerpt, coverKey, published, seriesId };
}

function seriesIdOf(body: Record<string, unknown>): number | null {
  if (body.seriesId == null || body.seriesId === "" || body.seriesId === 0) return null;
  const id = Number(body.seriesId);
  if (!Number.isInteger(id) || id < 1) throw new ValidationError("Choose a series that exists.");
  return id;
}

async function assertSeries(id: number | null) {
  if (id == null) return;
  const [row] = await db.select({ id: series.id }).from(series).where(eq(series.id, id)).limit(1);
  if (!row) throw new ValidationError("That series is not on the desk.");
}

async function seriesLabel(id: number | null) {
  if (id == null) return null;
  const [row] = await db
    .select({ slug: series.slug, title: series.title })
    .from(series)
    .where(eq(series.id, id))
    .limit(1);
  return row ?? null;
}

const cardColumns = {
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
};

export default async (req: Request, context: Context) => {
  try {
    const id = parseId(context.params.id);
    const url = new URL(req.url);
    const includeDrafts = url.searchParams.get("all") === "1";
    const publicGet =
      req.method === "GET" && id == null && !includeDrafts;
    if (!publicGet) {
      const denied = await requireAdmin();
      if (denied) return denied;
    }

    if (req.method === "GET" && id != null) {
      const [row] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
      if (!row) return fail("Post not found.", 404);
      return json({ post: presentPost(row, await seriesLabel(row.seriesId)) });
    }

    if (req.method === "GET") {
      const slug = url.searchParams.get("slug")?.trim();
      if (slug) {
        const [row] = await db.select().from(posts).where(eq(posts.slug, slug)).limit(1);
        if (!row || !row.published) return fail("Post not found.", 404);
        return json({ post: presentPost(row, await seriesLabel(row.seriesId)) });
      }
      // Card columns only. `bodyHtml` can be 400 KB a row, and the index
      // pages never render it — selecting it pulled every post body out of
      // Postgres on each listing.
      const base = db.select(cardColumns).from(posts).leftJoin(series, eq(posts.seriesId, series.id));
      const rows = includeDrafts
        ? await base.orderBy(desc(posts.updatedAt)).limit(POST_LIST_MAX)
        : await base
            .where(eq(posts.published, true))
            .orderBy(desc(posts.publishedAt), desc(posts.createdAt))
            .limit(POST_LIST_MAX);
      return json({ posts: rows.map(presentPostCard) });
    }

    if (req.method === "POST") {
      const body = await readBody(req, POST_BODY_MAX);
      if (!body) return fail("Request body must be an object.", 400);
      const input = fields(body);
      await assertSeries(input.seriesId);
      const slug = await uniqueSlug(slugFromTitle(input.title));
      const now = isoNow();
      const [created] = await db
        .insert(posts)
        .values({
          slug,
          title: input.title,
          excerpt: input.excerpt,
          coverKey: input.coverKey ?? null,
          bodyHtml: input.bodyHtml,
          seriesId: input.seriesId,
          published: input.published,
          publishedAt: input.published ? now : null,
        })
        .returning();
      if (created.published) {
        await notifyNewPaper({
          title: created.title,
          excerpt: created.excerpt ?? "",
          slug: created.slug,
          origin: siteOrigin(req),
        });
      }
      return json({ post: presentPost(created, await seriesLabel(created.seriesId)) }, 201);
    }

    if (req.method === "PUT" && id != null) {
      const [existing] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
      if (!existing) return fail("Post not found.", 404);
      const body = await readBody(req, POST_BODY_MAX);
      if (!body) return fail("Request body must be an object.", 400);
      const input = fields(body, existing.title);
      await assertSeries(input.seriesId);
      const slug =
        input.title !== existing.title ? await uniqueSlug(slugFromTitle(input.title), id) : existing.slug;
      const becomingPublic = input.published && !existing.published;
      const [updated] = await db
        .update(posts)
        .set({
          slug,
          title: input.title,
          excerpt: input.excerpt,
          coverKey: input.coverKey === undefined ? existing.coverKey : input.coverKey,
          bodyHtml: input.bodyHtml,
          seriesId: input.seriesId,
          published: input.published,
          publishedAt: input.published ? existing.publishedAt ?? isoNow() : null,
          updatedAt: isoNow(),
        })
        .where(eq(posts.id, id))
        .returning();
      if (becomingPublic) {
        await notifyNewPaper({
          title: updated.title,
          excerpt: updated.excerpt ?? "",
          slug: updated.slug,
          origin: siteOrigin(req),
        });
      }
      return json({ post: presentPost(updated, await seriesLabel(updated.seriesId)), posted: becomingPublic });
    }

    if (req.method === "DELETE" && id != null) {
      const [existing] = await db.select({ id: posts.id }).from(posts).where(eq(posts.id, id)).limit(1);
      if (!existing) return fail("Post not found.", 404);
      await db.delete(posts).where(eq(posts.id, id));
      return json({ ok: true });
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    if (isUniqueViolation(error)) return fail("Another post already uses that title.", 409);
    return handleError(error);
  }
};

