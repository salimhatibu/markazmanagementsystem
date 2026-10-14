import { isPublicSurface } from "./surface";

const SESSION_KEY = "markaz_blog_session";

export function blogSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id || id.length < 8) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anonymous-session";
  }
}

export function trackBlog(
  kind: "impression" | "click" | "view" | "dwell",
  postId: number,
  extra: { dwellMs?: number } = {},
) {
  // Readership figures should only ever count readers. The desk previews the
  // very same pages, so keeping the guard here covers every call site at once.
  if (!isPublicSurface()) return;
  const payload = JSON.stringify({
    kind,
    postId,
    sessionId: blogSessionId(),
    dwellMs: extra.dwellMs,
  });
  if (kind === "dwell" && typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon("/api/blog-events", new Blob([payload], { type: "application/json" }));
    return;
  }
  void fetch("/api/blog-events", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}

export function trackImpressions(ids: number[]) {
  for (const id of ids) trackBlog("impression", id);
}
