import { asIso } from "../../../shared/format";
import type { Post } from "../../../db/schema";

export function mediaUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  return `/api/blog-media/${key}`;
}

export function presentPost(row: Post) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? "",
    coverKey: row.coverKey ?? null,
    coverUrl: mediaUrl(row.coverKey),
    bodyHtml: row.bodyHtml,
    published: row.published,
    publishedAt: row.publishedAt ? asIso(row.publishedAt) : null,
    createdAt: asIso(row.createdAt),
    updatedAt: asIso(row.updatedAt),
  };
}

export function presentPostCard(row: Post) {
  const full = presentPost(row);
  return {
    id: full.id,
    slug: full.slug,
    title: full.title,
    excerpt: full.excerpt,
    coverKey: full.coverKey,
    coverUrl: full.coverUrl,
    published: full.published,
    publishedAt: full.publishedAt,
    createdAt: full.createdAt,
    updatedAt: full.updatedAt,
  };
}
