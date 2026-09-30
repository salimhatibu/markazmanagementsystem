import { useEffect } from "react";

export type PageMeta = {
  title: string;
  description?: string;
  /** Absolute URL. Relative paths are silently dropped by link scrapers. */
  image?: string | null;
  url?: string;
  type?: "website" | "article";
  publishedAt?: string | null;
};

const MANAGED = "data-paper-meta";

function setTag(attr: "name" | "property", key: string, content: string | null | undefined) {
  const selector = `meta[${attr}="${key}"]`;
  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  if (!content) {
    if (existing?.hasAttribute(MANAGED)) existing.remove();
    return;
  }
  const tag = existing ?? document.head.appendChild(document.createElement("meta"));
  tag.setAttribute(attr, key);
  tag.setAttribute(MANAGED, "");
  tag.content = content;
}

function setCanonical(url: string | undefined) {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!url) {
    existing?.remove();
    return;
  }
  const link = existing ?? document.head.appendChild(document.createElement("link"));
  link.rel = "canonical";
  link.href = url;
}

/**
 * Writes the per-page title, Open Graph and Twitter tags.
 *
 * WhatsApp, Telegram and the Meta scrapers do not run JavaScript, so these only
 * reach them once prerendering is enabled — but they also fix the browser tab,
 * bookmarks and anything that does render the page first.
 */
export function usePageMeta(meta: PageMeta | null) {
  useEffect(() => {
    if (!meta) return;
    const url = meta.url ?? window.location.href;
    const image = meta.image ? new URL(meta.image, window.location.origin).href : null;

    document.title = meta.title;
    setTag("name", "description", meta.description);
    setTag("property", "og:site_name", "The سلفية mindset");
    setTag("property", "og:title", meta.title);
    setTag("property", "og:description", meta.description);
    setTag("property", "og:type", meta.type ?? "website");
    setTag("property", "og:url", url);
    setTag("property", "og:image", image);
    setTag("property", "article:published_time", meta.publishedAt);
    setTag("name", "twitter:card", image ? "summary_large_image" : "summary");
    setTag("name", "twitter:title", meta.title);
    setTag("name", "twitter:description", meta.description);
    setTag("name", "twitter:image", image);
    setCanonical(url);
  }, [meta?.title, meta?.description, meta?.image, meta?.url, meta?.type, meta?.publishedAt]);
}
