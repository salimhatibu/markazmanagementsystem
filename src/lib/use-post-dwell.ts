import { useEffect } from "react";
import { trackBlog } from "./blog-track";

export function usePostDwell(postId: number | null) {
  useEffect(() => {
    if (!postId) return;
    trackBlog("view", postId);
    let accumulated = 0;
    let visibleSince = document.visibilityState === "visible" ? Date.now() : null;
    const elapsed = () => accumulated + (visibleSince ? Date.now() - visibleSince : 0);
    const send = () => {
      const dwellMs = elapsed();
      if (dwellMs > 0) trackBlog("dwell", postId, { dwellMs });
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (visibleSince) {
          accumulated += Date.now() - visibleSince;
          visibleSince = null;
        }
        send();
        return;
      }
      if (!visibleSince) visibleSince = Date.now();
    };
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") send();
    }, 60_000);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", send);
    return () => {
      window.clearInterval(interval);
      if (visibleSince) {
        accumulated += Date.now() - visibleSince;
        visibleSince = null;
      }
      send();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", send);
    };
  }, [postId]);
}
