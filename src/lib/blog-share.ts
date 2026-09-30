export function publicShelfPath() {
  return "/read";
}

export function publicPostPath(slug: string) {
  return `/read/${slug}`;
}

export function publicSeriesPath(slug: string) {
  return `/read/series/${slug}`;
}

export function publicSavedPath() {
  return "/read/saved";
}

export function publicShelfUrl() {
  return `${window.location.origin}${publicShelfPath()}`;
}

export function publicPostUrl(slug: string) {
  return `${window.location.origin}${publicPostPath(slug)}`;
}

/** The masthead card served when a post has no cover of its own. */
export const DEFAULT_SHARE_IMAGE = "/og-default.jpg";

/**
 * Link scrapers want a 1200x630 JPEG under ~300 KB, and they skip SVG and
 * sometimes WebP. Netlify's Image CDN does the crop and the format change, so
 * covers of any shape and size still preview correctly.
 */
export function shareImageUrl(coverUrl: string | null | undefined): string {
  if (!coverUrl) return DEFAULT_SHARE_IMAGE;
  const params = new URLSearchParams({
    url: coverUrl,
    w: "1200",
    h: "630",
    fit: "cover",
    fm: "jpg",
    q: "80",
  });
  return `/.netlify/images?${params.toString()}`;
}

export async function shareUrl(title: string, url: string): Promise<"shared" | "copied"> {
  try {
    if (typeof navigator.share === "function") {
      await navigator.share({ title, url, text: title });
      return "shared";
    }
  } catch (caught) {
    if (caught instanceof DOMException && caught.name === "AbortError") throw caught;
  }
  await navigator.clipboard.writeText(url);
  return "copied";
}
