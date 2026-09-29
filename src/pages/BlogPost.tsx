import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { formatEatLongDate } from "../../shared/format";
import { api } from "../lib/api";
import { classifyBlogImages } from "../lib/blog-images";
import { publicPostUrl, shareUrl } from "../lib/blog-share";
import { usePostDwell } from "../lib/use-post-dwell";
import type { BlogPost } from "../types";

export function BlogPostPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) return;
    api<{ post: BlogPost }>(`/api/posts?slug=${encodeURIComponent(slug)}`)
      .then((body) => setPost(body.post))
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "That post could not be opened.");
      });
  }, [slug]);

  usePostDwell(post?.id ?? null);

  useLayoutEffect(() => {
    classifyBlogImages(bodyRef.current);
  }, [post?.bodyHtml]);

  async function copyPublic() {
    if (!post) return;
    setNotice("");
    try {
      const result = await shareUrl(post.title, publicPostUrl(post.slug));
      setNotice(result === "copied" ? "The public link is on the clipboard." : "Ready to pass on.");
    } catch {
      setNotice("The public link could not be copied just then.");
    }
  }

  async function remove() {
    if (!post) return;
    if (!window.confirm("Remove this post from the blog?")) return;
    await api(`/api/posts/${post.id}`, { method: "DELETE" });
    navigate("/blog/posts");
  }

  if (error) {
    return (
      <>
        <p className="status">{error}</p>
        <Link className="random" to="/blog/posts">
          Back to the shelf
        </Link>
      </>
    );
  }

  if (!post) return <p className="status">Opening the post…</p>;

  const when = post.publishedAt ?? post.createdAt;
  const date = new Date(when);

  return (
    <article className="blog-read">
      <span className="eyebrow">{Number.isNaN(date.getTime()) ? "" : formatEatLongDate(date)}</span>
      <h1>
        {post.title}
      </h1>
      <div className="actions">
        <Link className="random" to="/blog/posts">
          All posts
        </Link>
        <Link className="random" to={`/blog/write/${post.id}`}>
          Edit
        </Link>
        <button type="button" className="random" onClick={() => void copyPublic()}>
          Copy public link
        </button>
        <button type="button" className="reset" onClick={() => void remove()}>
          Remove
        </button>
      </div>
      {notice ? <p className="status">{notice}</p> : null}
      {post.coverUrl ? <img src={post.coverUrl} alt="" className="blog-read-cover" /> : null}
      <div ref={bodyRef} className="blog-body" dangerouslySetInnerHTML={{ __html: post.bodyHtml }} />
    </article>
  );
}
