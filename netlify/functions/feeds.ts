import type { Config, Context } from "@netlify/functions";
import { desc, eq } from "drizzle-orm";
import { db } from "../../db/index";
import { posts } from "../../db/schema";
import { handleError } from "./_shared/http";

const FEED_MAX = 200;
const TITLE = "The سلفية mindset";
const TAGLINE = "Your daily dose of salafiyyah — essays printed digitally, read slowly.";

/**
 * Cached at the edge and served stale while it refreshes, so a crawler hitting
 * the feed does not wake a database. Purge the `posts` tag on publish.
 */
const FEED_HEADERS = {
  "Netlify-CDN-Cache-Control": "public, durable, s-maxage=300, stale-while-revalidate=604800",
  "Netlify-Cache-Tag": "posts",
  "Cache-Control": "public, max-age=0, must-revalidate",
  "X-Content-Type-Options": "nosniff",
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function published(row: { publishedAt: Date | null; createdAt: Date }): Date {
  return row.publishedAt ?? row.createdAt;
}

export default async (req: Request, _context: Context) => {
  try {
    const url = new URL(req.url);
    const origin = url.origin;
    const rows = await db
      .select({
        slug: posts.slug,
        title: posts.title,
        excerpt: posts.excerpt,
        publishedAt: posts.publishedAt,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
      })
      .from(posts)
      .where(eq(posts.published, true))
      .orderBy(desc(posts.publishedAt), desc(posts.createdAt))
      .limit(FEED_MAX);

    if (url.pathname.endsWith("sitemap.xml")) {
      const entries = [
        `<url><loc>${origin}/read</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
        ...rows.map(
          (row) =>
            `<url><loc>${origin}/read/${escapeXml(row.slug)}</loc>` +
            `<lastmod>${row.updatedAt.toISOString()}</lastmod>` +
            `<changefreq>monthly</changefreq><priority>0.8</priority></url>`,
        ),
      ];
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`,
        { headers: { ...FEED_HEADERS, "Content-Type": "application/xml; charset=utf-8" } },
      );
    }

    const latest = rows.length ? published(rows[0]) : new Date();
    const items = rows.map((row) => {
      const link = `${origin}/read/${row.slug}`;
      return (
        `<item>` +
        `<title>${escapeXml(row.title)}</title>` +
        `<link>${escapeXml(link)}</link>` +
        `<guid isPermaLink="true">${escapeXml(link)}</guid>` +
        `<pubDate>${published(row).toUTCString()}</pubDate>` +
        `<description>${escapeXml(row.excerpt ?? "")}</description>` +
        `</item>`
      );
    });

    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n` +
        `<title>${escapeXml(TITLE)}</title>\n` +
        `<link>${origin}/read</link>\n` +
        `<description>${escapeXml(TAGLINE)}</description>\n` +
        `<language>en</language>\n` +
        `<lastBuildDate>${latest.toUTCString()}</lastBuildDate>\n` +
        `<atom:link href="${origin}/rss.xml" rel="self" type="application/rss+xml"/>\n` +
        `${items.join("\n")}\n</channel>\n</rss>\n`,
      { headers: { ...FEED_HEADERS, "Content-Type": "application/rss+xml; charset=utf-8" } },
    );
  } catch (error) {
    return handleError(error);
  }
};

export const config: Config = {
  path: ["/sitemap.xml", "/rss.xml"],
  method: "GET",
};
