import { asIso } from "../../../shared/format";
import { sanitizePostHtml } from "../../../shared/post-html";
import type { Post } from "../../../db/schema";

export function mediaUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  return `/api/blog-media/${key}`;
}

export type SeriesLabel = { slug: string; title: string } | null;

function seriesFields(row: { seriesId?: number | null }, series?: SeriesLabel) {
  return {
    seriesId: row.seriesId ?? null,
    seriesSlug: series?.slug ?? null,
    seriesTitle: series?.title ?? null,
  };
}

export function presentPost(row: Post, series?: SeriesLabel) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? "",
    coverKey: row.coverKey ?? null,
    coverUrl: mediaUrl(row.coverKey),
    // Sanitised again on the way out: rows written before the escaping fix are
    // still in the table, and the reader renders this with innerHTML.
    bodyHtml: sanitizePostHtml(row.bodyHtml),
    ...seriesFields(row, series),
    published: row.published,
    publishedAt: row.publishedAt ? asIso(row.publishedAt) : null,
    createdAt: asIso(row.createdAt),
    updatedAt: asIso(row.updatedAt),
  };
}

type PostCard = Omit<Post, "bodyHtml"> & { seriesSlug?: string | null; seriesTitle?: string | null };

/** List card: skips the body entirely so index pages do not ship every post. */
export function presentPostCard(row: PostCard) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? "",
    coverKey: row.coverKey ?? null,
    coverUrl: mediaUrl(row.coverKey),
    seriesId: row.seriesId ?? null,
    seriesSlug: row.seriesSlug ?? null,
    seriesTitle: row.seriesTitle ?? null,
    published: row.published,
    publishedAt: row.publishedAt ? asIso(row.publishedAt) : null,
    createdAt: asIso(row.createdAt),
    updatedAt: asIso(row.updatedAt),
  };
}
