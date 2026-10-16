import { asIso } from "../../shared/format";
import { sanitizePostHtml } from "../../shared/post-html";
import type { Post } from "../../db/schema";

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
    visibility: row.visibility,
    accessCode: row.accessCode ?? null,
    fontFamily: row.fontFamily ?? null,
    createdAt: asIso(row.createdAt),
    updatedAt: asIso(row.updatedAt),
  };
}

// Listing cards never carry the access code: index pages are public.
type PostCard = Omit<Post, "bodyHtml" | "fontFamily" | "accessCode"> & { seriesSlug?: string | null; seriesTitle?: string | null };

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
    visibility: row.visibility,
    createdAt: asIso(row.createdAt),
    updatedAt: asIso(row.updatedAt),
  };
}

/**
 * The same card plus the private paper's code. Only for the desk's own
 * listing, which sits behind requireAdmin — deliberately a separate function
 * rather than a flag, since `rows.map(presentPostCard)` would otherwise hand
 * the array index in as the flag and leak codes.
 */
export function presentDeskCard(row: PostCard & { accessCode?: string | null }) {
  return { ...presentPostCard(row), accessCode: row.accessCode ?? null };
}
