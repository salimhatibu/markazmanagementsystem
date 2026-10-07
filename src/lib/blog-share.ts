import {
  isPublicHost,
  publicOrigin,
  publicPostHref,
  publicSavedHref,
  publicSeriesHref,
  publicShelfHref,
} from "./surface";

/** Same-origin path for the papers shelf (public host uses root; legacy keeps /read). */
export function publicShelfPath() {
  return isPublicHost() ? "/" : "/read";
}

export function publicPostPath(slug: string) {
  return isPublicHost() ? `/${slug}` : `/read/${slug}`;
}

export function publicSeriesPath(slug: string) {
  return isPublicHost() ? `/series/${slug}` : `/read/series/${slug}`;
}

export function publicSavedPath() {
  return isPublicHost() ? "/saved" : "/read/saved";
}

export function publicShelfUrl() {
  return `${publicOrigin()}/`;
}

export function publicPostUrl(slug: string) {
  return `${publicOrigin()}/${slug}`;
}

export { publicShelfHref, publicPostHref, publicSeriesHref, publicSavedHref, publicOrigin };

/** The masthead card served when a post has no cover of its own. */
export const DEFAULT_SHARE_IMAGE = "/og-default.jpg";

/** Prefer a direct cover URL; fall back to the default masthead card. */
export function shareImageUrl(coverUrl: string | null | undefined): string {
  if (!coverUrl) return DEFAULT_SHARE_IMAGE;
  if (coverUrl.startsWith("/") || /^https?:\/\//i.test(coverUrl)) return coverUrl;
  return DEFAULT_SHARE_IMAGE;
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
