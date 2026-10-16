import { useEffect, useState } from "react";
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
  const [confirming, setConfirming] = useState<number | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const [copiedCode, setCopiedCode] = useState<number | null>(null);

  async function remove(post: BlogPost) {
    setRemoving(post.id);
    setError("");
    try {
      await api(`/api/posts/${post.id}`, { method: "DELETE" });
      setPosts((rows) => rows.filter((row) => row.id !== post.id));
      setDrafts((rows) => rows.filter((row) => row.id !== post.id));
      setConfirming(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That post could not be removed.");
    } finally {
      setRemoving(null);
    }
  }

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
            Every post on the shelf.
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
              Not yet posted
            </h2>
            <small>DRAWER</small>
          </div>
          <ul className="log">
            {drafts.map((post) => (
              <li key={post.id} className="blog-draft-row">
                <time>{postedOn(post)}</time>
                <Link to={`/blog/write/${post.id}`}>{post.title || "Untitled"}</Link>
                {confirming === post.id ? (
                  <span className="blog-del-confirm">
                    <button type="button" className="blog-del is-yes" disabled={removing === post.id} onClick={() => void remove(post)}>
                      {removing === post.id ? "Removing…" : "Delete for good"}
                    </button>
                    <button type="button" className="blog-del is-no" onClick={() => setConfirming(null)}>
                      Keep
                    </button>
                  </span>
                ) : (
                  <button type="button" className="blog-del" onClick={() => setConfirming(post.id)}>
                    Delete
                  </button>
                )}
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
              {post.visibility === "private" ? <span className="blog-private-tag">Private</span> : null}
            </h2>
            {post.visibility === "private" && post.accessCode ? (
              <p className="blog-issue-code">
                <span className="blog-issue-code-label">Code</span>
                <code>{post.accessCode}</code>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(post.accessCode ?? "")
                      .then(() => setCopiedCode(post.id))
                      .catch(() => setCopiedCode(null));
                  }}
                >
                  {copiedCode === post.id ? "Copied" : "Copy"}
                </button>
              </p>
            ) : null}
            {post.excerpt ? <p className="excuse">{post.excerpt}</p> : null}
            <div className="blog-issue-actions">
              <Link className="quest-read" to={`/blog/${post.slug}`} onClick={() => trackBlog("click", post.id)}>
                Read ↗
              </Link>
              <Link className="quest-read" to={`/blog/write/${post.id}`}>
                Edit
              </Link>
              {confirming === post.id ? (
                <span className="blog-del-confirm">
                  <button type="button" className="blog-del is-yes" disabled={removing === post.id} onClick={() => void remove(post)}>
                    {removing === post.id ? "Removing…" : "Delete for good"}
                  </button>
                  <button type="button" className="blog-del is-no" onClick={() => setConfirming(null)}>
                    Keep
                  </button>
                </span>
              ) : (
                <button type="button" className="blog-del" onClick={() => setConfirming(post.id)}>
                  Delete
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
