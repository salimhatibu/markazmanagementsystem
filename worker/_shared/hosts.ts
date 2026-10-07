import { getEnv } from "../env";

export type HostSurface = "public" | "admin" | "legacy";

const DEFAULT_PUBLIC_HOST = "thesalafimindset.com";
const DEFAULT_ADMIN_HOST = "admin.mysalafimindset.com";

function stripWww(host: string): string {
  return host.replace(/^www\./i, "");
}

export function configuredPublicHost(): string {
  try {
    return (getEnv().PUBLIC_HOST?.trim() || DEFAULT_PUBLIC_HOST).toLowerCase();
  } catch {
    return DEFAULT_PUBLIC_HOST;
  }
}

export function configuredAdminHost(): string {
  try {
    return (getEnv().ADMIN_HOST?.trim() || DEFAULT_ADMIN_HOST).toLowerCase();
  } catch {
    return DEFAULT_ADMIN_HOST;
  }
}

export function publicOriginFromEnv(req?: Request): string {
  try {
    const site = getEnv().SITE_URL?.trim();
    if (site) return site.replace(/\/$/, "");
  } catch {
    /* unbound */
  }
  if (req) {
    const host = configuredPublicHost();
    const proto = new URL(req.url).protocol;
    return `${proto}//${host}`;
  }
  return `https://${configuredPublicHost()}`;
}

export function requestHost(req: Request): string {
  const url = new URL(req.url);
  return stripWww(url.hostname.toLowerCase());
}

export function hostSurface(req: Request): HostSurface {
  const host = requestHost(req);
  if (host === stripWww(configuredPublicHost())) return "public";
  if (host === stripWww(configuredAdminHost())) return "admin";
  return "legacy";
}

/** Path after stripping a leading `/read` prefix (public clean URLs). */
export function stripReadPrefix(pathname: string): string | null {
  if (pathname === "/read" || pathname === "/read/") return "/";
  if (pathname.startsWith("/read/")) {
    const rest = pathname.slice("/read".length);
    return rest || "/";
  }
  return null;
}

/**
 * APIs allowed on the public papers host. Desk-only routes are rejected there.
 * Auth for mutating published-reader endpoints stays in each handler.
 */
export function isPublicApiAllowed(pathname: string, method: string, search: string): boolean {
  const m = method.toUpperCase();
  if (pathname === "/sitemap.xml" || pathname === "/rss.xml") return m === "GET";
  if (pathname === "/api/posts" || pathname === "/api/posts/") {
    if (m !== "GET") return false;
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    return params.get("all") !== "1";
  }
  if (/^\/api\/series(?:\/[^/]+)?\/?$/.test(pathname)) return m === "GET";
  if (/^\/api\/blog-media\/blog\/[^/]+\/?$/.test(pathname)) return m === "GET";
  if (pathname === "/api/blog-events" || pathname === "/api/blog-events/") {
    return m === "GET" || m === "POST";
  }
  if (/^\/api\/blog-comments\/\d+\/?$/.test(pathname)) return m === "GET" || m === "POST";
  if (/^\/api\/blog-likes\/\d+\/?$/.test(pathname)) return m === "GET" || m === "POST";
  if (/^\/api\/blog-saves\/\d+\/?$/.test(pathname)) return m === "GET" || m === "POST";
  if (pathname === "/api/reader-saves" || pathname === "/api/reader-saves/") {
    return m === "GET" || m === "POST" || m === "DELETE";
  }
  // Subscribe is public POST; leave is public GET. Listing subscribers is desk-only.
  if (pathname === "/api/newsletter/leave" || pathname === "/api/newsletter/leave/") {
    return m === "GET";
  }
  if (pathname === "/api/newsletter" || pathname === "/api/newsletter/") {
    return m === "POST";
  }
  return false;
}
