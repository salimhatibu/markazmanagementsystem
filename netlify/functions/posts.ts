import type { Config, Context } from "@netlify/functions";
import { desc, eq } from "drizzle-orm";
import { db } from "../../db/index";
import { posts } from "../../db/schema";
import { excerptFromHtml, sanitizePostHtml } from "../../shared/post-html";
import { slugFromTitle } from "../../shared/slug";
import { requireAdmin } from "./_shared/auth";
import { fail, handleError, isUniqueViolation, json, parseId, readBody, ValidationError } from "./_shared/http";
import { presentPost, presentPostCard } from "./_shared/posts";

const POST_BODY_MAX = 400_000;

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
  return { title, bodyHtml, excerpt, coverKey, published };
}

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
      return json({ post: presentPost(row) });
    }

    if (req.method === "GET") {
      const slug = url.searchParams.get("slug")?.trim();
      if (slug) {
        const [row] = await db.select().from(posts).where(eq(posts.slug, slug)).limit(1);
        if (!row || !row.published) return fail("Post not found.", 404);
        return json({ post: presentPost(row) });
      }
      const rows = includeDrafts
        ? await db.select().from(posts).orderBy(desc(posts.updatedAt))
        : await db
            .select()
            .from(posts)
            .where(eq(posts.published, true))
            .orderBy(desc(posts.publishedAt), desc(posts.createdAt));
      return json({ posts: rows.map(presentPostCard) });
    }

    if (req.method === "POST") {
      const body = await readBody(req, POST_BODY_MAX);
      if (!body) return fail("Request body must be an object.", 400);
      const input = fields(body);
      const slug = await uniqueSlug(slugFromTitle(input.title));
      const now = new Date();
      const [created] = await db
        .insert(posts)
        .values({
          slug,
          title: input.title,
          excerpt: input.excerpt,
          coverKey: input.coverKey ?? null,
          bodyHtml: input.bodyHtml,
          published: input.published,
          publishedAt: input.published ? now : null,
        })
        .returning();
      return json({ post: presentPost(created) }, 201);
    }

    if (req.method === "PUT" && id != null) {
      const [existing] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
      if (!existing) return fail("Post not found.", 404);
      const body = await readBody(req, POST_BODY_MAX);
      if (!body) return fail("Request body must be an object.", 400);
      const input = fields(body, existing.title);
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
          published: input.published,
          publishedAt: input.published ? existing.publishedAt ?? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(posts.id, id))
        .returning();
      return json({ post: presentPost(updated), posted: becomingPublic });
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

export const config: Config = {
  path: ["/api/posts", "/api/posts/:id"],
  method: ["GET", "POST", "PUT", "DELETE"],
};
