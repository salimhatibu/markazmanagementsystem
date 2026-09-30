import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { publicPostPath, publicShelfPath } from "../lib/blog-share";
import { blogSessionId, trackBlog } from "../lib/blog-track";
import { usePageMeta } from "../lib/page-meta";
import { paperBrief } from "../lib/paper-almanac";
import type { BlogPost } from "../types";

export function PublicSavedPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sessionId = blogSessionId();
    api<{ posts: BlogPost[] }>(`/api/reader-saves?sessionId=${encodeURIComponent(sessionId)}`)
      .then((body) => {
        setPosts(body.posts);
        setReady(true);
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "Saved papers could not be opened.");
        setReady(true);
      });
  }, []);

  usePageMeta({
    title: "Saved papers · The سلفية mindset",
    description: "Papers you marked to read again on this device.",
  });

  return (
    <>
      <header className="paper-series-head">
        <p className="paper-section-kicker">Kept</p>
        <h2 id="saved-title" className="paper-headline">
          Saved papers
        </h2>
        <p className="paper-byline">These stay with this browser. Another device has its own list.</p>
      </header>
      {error ? <p className="status">{error}</p> : null}
      {!ready ? <p className="status">Opening saved papers…</p> : null}
      {ready && !posts.length ? (
        <p className="status">
          Nothing saved yet. Open a piece and mark it.{" "}
          <Link to={publicShelfPath()}>Back to the papers</Link>
        </p>
      ) : null}
      {posts.length ? (
        <section className="paper-briefs" aria-labelledby="saved-title">
          {posts.map((post) => (
            <article key={post.id} className="paper-brief">
              {post.seriesTitle ? <p className="paper-section-kicker">{post.seriesTitle}</p> : null}
              <h3>
                <Link to={publicPostPath(post.slug)} onClick={() => trackBlog("click", post.id)}>
                  {post.title}
                </Link>
              </h3>
              {post.excerpt ? <p>{paperBrief(post.excerpt)}</p> : null}
              <Link className="paper-rail-link" to={publicPostPath(post.slug)} onClick={() => trackBlog("click", post.id)}>
                Read
              </Link>
            </article>
          ))}
        </section>
      ) : null}
    </>
  );
}
