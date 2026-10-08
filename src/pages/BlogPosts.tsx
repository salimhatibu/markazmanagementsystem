import { useEffect, useState } from "react";
import { KineticText } from "../components/KineticText";
import { Link } from "react-router-dom";
import { formatEatLongDate } from "../../shared/format";
import { api } from "../lib/api";
import { trackBlog, trackImpressions } from "../lib/blog-track";
import type { BlogPost } from "../types";

function postedOn(post: BlogPost) {
  const raw = post.publishedAt ?? post.createdAt;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? "" : formatEatLongDate(date);
}

export function BlogPostsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [drafts, setDrafts] = useState<BlogPost[]>([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api<{ posts: BlogPost[] }>("/api/posts?all=1")
      .then((body) => {
        const published = body.posts.filter((post) => post.published);
        setPosts(published);
        setDrafts(body.posts.filter((post) => !post.published));
        trackImpressions(published.map((post) => post.id));
        setReady(true);
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "The posts could not be opened.");
        setReady(true);
      });
  }, []);

  return (
    <>
      <section className="choices-header">
        <div>
          <span className="eyebrow">The written record</span>
          <h2>
            <KineticText text="Every post on the shelf." />
          </h2>
        </div>
        <p>Open a public note. Drafts stay in the drawer until you post them.</p>
      </section>
      {error ? <p className="status">{error}</p> : null}
      {!ready ? <p className="status">Opening the shelf…</p> : null}
      {ready && drafts.length ? (
        <section aria-label="Drafts">
          <div className="section-title">
            <h2>
              <KineticText text="Not yet posted" />
            </h2>
            <small>DRAWER</small>
          </div>
          <ul className="log">
            {drafts.map((post) => (
              <li key={post.id}>
                <time>{postedOn(post)}</time>
                <Link to={`/blog/write/${post.id}`}>{post.title || "Untitled"}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {ready && !posts.length && !drafts.length ? (
        <p className="status">No posts yet. Write the first one.</p>
      ) : null}
      <div className="blog-shelf">
        {posts.map((post, index) => (
          <article key={post.id} className="blog-issue">
            <span className="cost">
              <span>0{index + 1}</span>
              <span>{postedOn(post)}</span>
            </span>
            <h2>
              <Link to={`/blog/${post.slug}`} onClick={() => trackBlog("click", post.id)}>
                {post.title}
              </Link>
            </h2>
            {post.excerpt ? <p className="excuse">{post.excerpt}</p> : null}
            <Link className="quest-read" to={`/blog/${post.slug}`} onClick={() => trackBlog("click", post.id)}>
              Read ↗
            </Link>
          </article>
        ))}
      </div>
    </>
  );
}
