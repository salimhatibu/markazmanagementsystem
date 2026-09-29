import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatEatLongDate } from "../../shared/format";
import { IconShare } from "../components/ig-icons";
import { api } from "../lib/api";
import { publicPostPath, publicPostUrl, shareUrl } from "../lib/blog-share";
import { trackBlog, trackImpressions } from "../lib/blog-track";
import type { BlogPost } from "../types";

function postedOn(post: BlogPost) {
  const raw = post.publishedAt ?? post.createdAt;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? "" : formatEatLongDate(date);
}

export function PublicPostsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api<{ posts: BlogPost[] }>("/api/posts")
      .then((body) => {
        setPosts(body.posts);
        trackImpressions(body.posts.map((post) => post.id));
        setReady(true);
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "The papers could not be opened.");
        setReady(true);
      });
  }, []);

  async function share(post: BlogPost) {
    setNotice("");
    try {
      const result = await shareUrl(post.title, publicPostUrl(post.slug));
      setNotice(result === "copied" ? "The link is on the clipboard." : "Ready to pass on.");
    } catch {
      setNotice("The link could not be shared just then.");
    }
  }

  return (
    <>
      <section className="choices-header">
        <div>
          <span className="eyebrow">The public papers</span>
          <h2>What has been posted.</h2>
        </div>
        <p>Open a piece, leave a note, like it, save it, or share the link. There is no desk here—only the writing.</p>
      </section>
      {error ? <p className="status">{error}</p> : null}
      {notice ? <p className="status">{notice}</p> : null}
      {!ready ? <p className="status">Opening the papers…</p> : null}
      {ready && !posts.length ? <p className="status">Nothing public yet.</p> : null}
      <div className="blog-shelf">
        {posts.map((post, index) => (
          <article key={post.id} className="blog-issue">
            <span className="cost">
              <span>0{index + 1}</span>
              <span>{postedOn(post)}</span>
            </span>
            <h2>
              <Link to={publicPostPath(post.slug)} onClick={() => trackBlog("click", post.id)}>
                {post.title}
              </Link>
            </h2>
            {post.excerpt ? <p className="excuse">{post.excerpt}</p> : null}
            <div className="blog-issue-actions">
              <Link className="quest-read" to={publicPostPath(post.slug)} onClick={() => trackBlog("click", post.id)}>
                Read ↗
              </Link>
              <button
                type="button"
                className="blog-ig-btn"
                aria-label={`Share ${post.title}`}
                onClick={() => void share(post)}
              >
                <IconShare />
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
