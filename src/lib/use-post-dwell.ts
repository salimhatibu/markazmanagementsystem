import { useEffect } from "react";
import { trackBlog } from "./blog-track";

export function usePostDwell(postId: number | null) {
  useEffect(() => {
    if (!postId) return;
    trackBlog("view", postId);
    const started = Date.now();
    const beat = () => {
      if (document.visibilityState !== "visible") return;
      trackBlog("dwell", postId, { dwellMs: Date.now() - started });
    };
    const interval = window.setInterval(beat, 15_000);
    const onLeave = () => trackBlog("dwell", postId, { dwellMs: Date.now() - started });
    document.addEventListener("visibilitychange", onLeave);
    window.addEventListener("pagehide", onLeave);
    return () => {
      window.clearInterval(interval);
      onLeave();
      document.removeEventListener("visibilitychange", onLeave);
      window.removeEventListener("pagehide", onLeave);
    };
  }, [postId]);
}
